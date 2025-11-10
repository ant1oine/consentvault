"""Billing router - simple Stripe checkout."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_current_user
from app.db import get_db

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/checkout")
def get_checkout_url(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get Stripe checkout URL for subscription.
    Returns a simple checkout link if STRIPE_KEY is configured.
    """
    if not settings.stripe_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured",
        )

    try:
        import stripe

        stripe.api_key = settings.stripe_key

        # Create checkout session
        if not settings.stripe_price_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Stripe price ID not configured. Set STRIPE_PRICE_ID environment variable.",
            )
        
        checkout_session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
            success_url=settings.stripe_success_url or "https://web.yourdomain.com?subscribed=true",
            cancel_url=settings.stripe_cancel_url or "https://web.yourdomain.com/billing",
            client_reference_id=str(current_user.id),
        )

        return {"url": checkout_session.url}
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe library not installed. Install with: pip install stripe",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}",
        )

