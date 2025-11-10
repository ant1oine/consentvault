"""Widget router - serves widget.js."""
from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter(tags=["Widget"])


@router.get("/widget.js")
def get_widget_js():
    """Serve the consent widget JavaScript."""
    js = """
(function() {
    'use strict';
    
    // Find all script tags with data-org attribute
    const scripts = document.querySelectorAll('script[data-org]');
    
    scripts.forEach(function(script) {
        const orgId = script.getAttribute('data-org');
        const purpose = script.getAttribute('data-purpose') || 'consent';
        const text = script.getAttribute('data-text') || 'I agree to the terms and conditions.';
        const subjectMode = script.getAttribute('data-subject') || 'auto';
        
        // Generate subject_id
        let subjectId;
        if (subjectMode === 'auto') {
            subjectId = 'sub_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        } else {
            // Try to get email from form or prompt
            const emailInput = document.querySelector('input[type="email"]');
            subjectId = emailInput ? emailInput.value : prompt('Please enter your email:');
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background:white;padding:30px;border-radius:8px;max-width:500px;width:90%;';
        
        content.innerHTML = `
            <h2 style="margin-top:0;">${purpose}</h2>
            <p>${text}</p>
            <div style="margin-top:20px;">
                <button id="consent-agree" style="padding:10px 20px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:10px;">Agree</button>
                <button id="consent-decline" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">Decline</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Get API base URL from script src or default
        const scriptSrc = script.src;
        const apiBase = scriptSrc.replace('/widget.js', '');
        
        // Handle agree button
        document.getElementById('consent-agree').addEventListener('click', function() {
            const data = {
                purpose: purpose,
                text: text,
                subject_id: subjectId,
                ip: null,  // Will be captured by server
                user_agent: navigator.userAgent,
            };
            
            fetch(apiBase + '/consents?org_id=' + orgId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })
            .then(function(response) {
                if (response.ok) {
                    document.body.removeChild(modal);
                    // Trigger custom event
                    const event = new CustomEvent('consentvault:agreed', {
                        detail: { purpose: purpose, subject_id: subjectId }
                    });
                    document.dispatchEvent(event);
                } else {
                    alert('Failed to record consent. Please try again.');
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                alert('Failed to record consent. Please try again.');
            });
        });
        
        // Handle decline button
        document.getElementById('consent-decline').addEventListener('click', function() {
            document.body.removeChild(modal);
            const event = new CustomEvent('consentvault:declined', {
                detail: { purpose: purpose }
            });
            document.dispatchEvent(event);
        });
    });
})();
"""
    return Response(content=js, media_type="application/javascript")


