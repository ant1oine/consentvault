"use client";

import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function WidgetPage() {
  const [purpose, setPurpose] = useState("marketing");
  const [text, setText] = useState("I agree to receive marketing communications.");
  const [subjectMode, setSubjectMode] = useState<"auto" | "email">("auto");
  const [orgId, setOrgId] = useState("");
  const [copied, setCopied] = useState(false);

  const embedSnippet = `<script src="${API_BASE_URL}/widget.js"
        data-org="${orgId}"
        data-purpose="${purpose}"
        data-text="${text.replace(/"/g, '&quot;')}"
        data-subject="${subjectMode}"></script>`;

  function copyToClipboard() {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function testModal() {
    // Create a test modal similar to what the widget would show
    const modal = document.createElement("div");
    modal.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;";
    
    const content = document.createElement("div");
    content.style.cssText =
      "background:white;padding:30px;border-radius:8px;max-width:500px;width:90%;";
    
    content.innerHTML = `
      <h2 style="margin-top:0;">${purpose}</h2>
      <p>${text}</p>
      <div style="margin-top:20px;">
        <button id="test-agree" style="padding:10px 20px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:10px;">Agree</button>
        <button id="test-close" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    document.getElementById("test-agree")?.addEventListener("click", () => {
      document.body.removeChild(modal);
      alert("Consent would be recorded (test mode)");
    });
    
    document.getElementById("test-close")?.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Widget Generator</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Organization ID</label>
          <input
            type="text"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="Enter your organization ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Purpose</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., marketing, analytics"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Consent Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter the consent text to display"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Subject Mode</label>
          <select
            value={subjectMode}
            onChange={(e) => setSubjectMode(e.target.value as "auto" | "email")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="auto">Auto-generate ID</option>
            <option value="email">Use email from form</option>
          </select>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Embed Snippet</label>
            <div className="flex gap-2">
              <button
                onClick={testModal}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test Modal
              </button>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
            {embedSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}

