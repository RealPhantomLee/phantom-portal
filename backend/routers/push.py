"""
Push notification endpoints for web push notifications.

Handles subscription management, VAPID key distribution, and test notifications.
"""

import json
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from backend.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/push", tags=["push"])

# In-memory subscription storage (in production, use a database)
# Map of user_id -> list of subscription objects
subscriptions = {}


class PushSubscription(BaseModel):
    """Web push subscription object from browser."""

    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: dict = Field(..., description="Encryption keys {auth, p256dh}")
    expirationTime: Optional[int] = None


class PushSubscribeRequest(BaseModel):
    """Request to subscribe to push notifications."""

    endpoint: str
    keys: dict
    expirationTime: Optional[int] = None


class PushUnsubscribeRequest(BaseModel):
    """Request to unsubscribe from push notifications."""

    endpoint: str


class VapidPublicKeyResponse(BaseModel):
    """Response containing VAPID public key."""

    publicKey: str


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
async def get_vapid_public_key(settings=Depends(get_settings)):
    """
    Get VAPID public key for browser push encryption.

    The client uses this to encrypt subscription data before sending to push service.
    The backend uses the corresponding private key to sign push messages.
    """
    try:
        vapid_public_key = settings.web_push.vapid_public_key
        if not vapid_public_key:
            raise HTTPException(
                status_code=500,
                detail="VAPID public key not configured",
            )

        return VapidPublicKeyResponse(publicKey=vapid_public_key)
    except AttributeError:
        logger.error("Push notifications not configured")
        raise HTTPException(
            status_code=500,
            detail="Push notifications not available",
        )


@router.post("/subscribe")
async def subscribe(request: PushSubscribeRequest, settings=Depends(get_settings)):
    """
    Register a browser's push subscription.

    The client calls this after getting a subscription from the Push Manager.
    The subscription is stored server-side for later use when sending notifications.

    In production, you would:
    1. Associate the subscription with the current user
    2. Store in a database
    3. Check for duplicate subscriptions
    4. Handle subscription expiration
    """
    try:
        endpoint = request.endpoint

        # Validate endpoint URL
        if not endpoint.startswith("https://"):
            raise HTTPException(
                status_code=400,
                detail="Endpoint must be HTTPS",
            )

        # In this example, use a dummy user_id
        # In production, get from authentication token
        user_id = "current_user"

        # Store subscription
        if user_id not in subscriptions:
            subscriptions[user_id] = []

        # Check if already subscribed
        for sub in subscriptions[user_id]:
            if sub["endpoint"] == endpoint:
                logger.info(f"Subscription already exists for endpoint {endpoint}")
                return {"status": "ok", "message": "Already subscribed"}

        # Add new subscription
        subscriptions[user_id].append(
            {
                "endpoint": endpoint,
                "keys": request.keys,
                "expirationTime": request.expirationTime,
                "subscribedAt": datetime.utcnow().isoformat(),
            }
        )

        logger.info(f"Push subscription registered for user {user_id}")
        return {"status": "ok", "message": "Subscribed successfully"}

    except Exception as e:
        logger.error(f"Failed to subscribe: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to subscribe to push notifications",
        )


@router.post("/unsubscribe")
async def unsubscribe(request: PushUnsubscribeRequest):
    """
    Unregister a browser's push subscription.

    Called when user clicks "Disable Notifications" or unsubscribes via browser.
    """
    try:
        endpoint = request.endpoint
        user_id = "current_user"

        if user_id in subscriptions:
            # Remove matching subscription
            original_count = len(subscriptions[user_id])
            subscriptions[user_id] = [
                sub
                for sub in subscriptions[user_id]
                if sub["endpoint"] != endpoint
            ]

            if len(subscriptions[user_id]) < original_count:
                logger.info(f"Unsubscribed endpoint {endpoint}")
                return {"status": "ok", "message": "Unsubscribed successfully"}

        return {"status": "ok", "message": "Endpoint not found or already unsubscribed"}

    except Exception as e:
        logger.error(f"Failed to unsubscribe: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to unsubscribe",
        )


@router.post("/test")
async def send_test_notification(settings=Depends(get_settings)):
    """
    Send a test push notification to the current user.

    Useful for testing the notification system during development.
    """
    try:
        user_id = "current_user"
        user_subscriptions = subscriptions.get(user_id, [])

        if not user_subscriptions:
            raise HTTPException(
                status_code=400,
                detail="No active subscriptions for this user",
            )

        # Prepare test notification payload
        payload = {
            "title": "Test Notification",
            "options": {
                "body": "This is a test notification from Phantom Portal",
                "icon": "/icon-192.png",
                "badge": "/icon-192.png",
                "tag": "test-notification",
                "requireInteraction": True,
                "data": {
                    "url": "/",
                    "type": "test",
                    "timestamp": datetime.utcnow().isoformat(),
                },
            },
        }

        # In production, use python-web-push to send actual push messages
        # For now, just log that we would send them
        logger.info(
            f"Would send test notification to {len(user_subscriptions)} subscriptions"
        )

        # Example of how to use python-web-push:
        # from web_push import webpush, WebPushException
        #
        # for subscription in user_subscriptions:
        #     try:
        #         webpush(
        #             subscription_info=subscription,
        #             data=json.dumps(payload),
        #             vapid_private_key=settings.push.vapid_private_key,
        #             vapid_claims={
        #                 "sub": "mailto:admin@example.com",
        #                 "aud": subscription['endpoint'],
        #             }
        #         )
        #     except WebPushException as e:
        #         if e.response.status_code == 410:
        #             # Subscription expired, remove it
        #             subscriptions[user_id].remove(subscription)
        #         logger.error(f"Failed to send push: {e}")

        return {
            "status": "ok",
            "message": f"Test notification sent to {len(user_subscriptions)} subscription(s)",
        }

    except Exception as e:
        logger.error(f"Failed to send test notification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send test notification",
        )


@router.get("/subscriptions/count")
async def get_subscription_count():
    """
    Get the number of active subscriptions (admin endpoint).

    For monitoring and debugging.
    """
    total_subs = sum(len(subs) for subs in subscriptions.values())
    return {"total_subscriptions": total_subs, "users": len(subscriptions)}


# Example helper function for sending notifications from other parts of the app
async def send_motion_notification(motion_event: dict, settings):
    """
    Send push notification for motion detection.

    Called from the WebSocket broadcaster when a motion event occurs.

    Args:
        motion_event: Dict with keys: camera, timestamp, confidence,
                      thumbnail_url, narration
        settings: App settings with VAPID keys
    """
    try:
        user_id = "current_user"
        user_subscriptions = subscriptions.get(user_id, [])

        if not user_subscriptions:
            logger.debug(f"No subscriptions for user {user_id}")
            return

        payload = {
            "title": f"Motion Detected - {motion_event.get('camera', 'Unknown')}",
            "options": {
                "body": motion_event.get(
                    "narration", f"Confidence: {motion_event.get('confidence', 0):.0%}"
                ),
                "icon": "/icon-192.png",
                "badge": "/icon-192.png",
                "tag": f"motion-{motion_event.get('camera', 'unknown')}",
                "requireInteraction": True,
                "data": {
                    "url": "/security",
                    "cameraId": motion_event.get("camera"),
                    "timestamp": motion_event.get("timestamp"),
                    "thumbnail": motion_event.get("thumbnail_url"),
                    "narration": motion_event.get("narration"),
                    "confidence": motion_event.get("confidence"),
                },
            },
        }

        logger.info(
            f"Sending motion notification to {len(user_subscriptions)} subscriptions"
        )

        # In production, actually send the notifications:
        # from web_push import webpush, WebPushException
        #
        # for subscription in user_subscriptions:
        #     try:
        #         webpush(
        #             subscription_info=subscription,
        #             data=json.dumps(payload),
        #             vapid_private_key=settings.web_push.vapid_private_key,
        #             vapid_claims={
        #                 "sub": f"mailto:{settings.web_push.vapid_email}",
        #                 "aud": subscription['endpoint'],
        #             }
        #         )
        #     except WebPushException as e:
        #         if e.response.status_code == 410:
        #             subscriptions[user_id].remove(subscription)
        #         logger.error(f"Failed to send motion notification: {e}")

    except Exception as e:
        logger.error(f"Error sending motion notification: {e}")
