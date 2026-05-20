"""
Home Assistant API router.
Provides REST endpoints for controlling Home Assistant devices.
"""

import logging
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException

from backend.services.ha_service import get_ha_client

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ha", tags=["homeassistant"])


@router.get("/devices")
async def list_devices() -> List[Dict[str, Any]]:
    """List all Home Assistant devices with their current state.

    Returns:
        List of device objects with entity_id, name, type, state, and attributes.

    Raises:
        HTTPException: 503 if Home Assistant is unreachable
    """
    try:
        ha = get_ha_client()
        devices = await ha.get_devices()
        log.info(f"Listed {len(devices)} devices")
        return devices
    except ConnectionError as e:
        log.error(f"Failed to list devices: {e}")
        raise HTTPException(status_code=503, detail="Home Assistant unavailable")
    except Exception as e:
        log.exception(f"Unexpected error listing devices: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/light/{entity_id}")
async def control_light(
    entity_id: str,
    body: Dict[str, Any],
) -> Dict[str, Any]:
    """Control a light device.

    Args:
        entity_id: Light entity ID (e.g., "light.living_room")
        body: {
            "state": bool (true=on, false=off),
            "brightness": 0-255 (optional),
            "color": {"r": 0-255, "g": 0-255, "b": 0-255} (optional)
        }

    Returns:
        {status: "ok", device: {...current_state...}}

    Raises:
        HTTPException: 404 if entity not found, 503 if HA unreachable
    """
    try:
        state = body.get("state")
        if state is None:
            raise HTTPException(status_code=400, detail="Missing 'state' in request body")

        brightness = body.get("brightness")
        color = body.get("color")

        ha = get_ha_client()
        await ha.set_light(entity_id, state, brightness, color)

        # Fetch current state to return
        try:
            states = await ha.get("/states")
            device_state = next((s for s in states if s.get("entity_id") == entity_id), None)
            device = {
                "entity_id": entity_id,
                "state": device_state.get("state") if device_state else "unknown",
                "attributes": device_state.get("attributes", {}) if device_state else {},
            }
        except Exception:
            # If we can't fetch state, just return basic info
            device = {"entity_id": entity_id, "state": "on" if state else "off"}

        log.info(f"Controlled light {entity_id}: state={state}, brightness={brightness}")
        return {"status": "ok", "device": device}

    except ValueError as e:
        log.warning(f"Light control error for {entity_id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ConnectionError as e:
        log.error(f"Home Assistant unreachable: {e}")
        raise HTTPException(status_code=503, detail="Home Assistant unavailable")
    except Exception as e:
        log.exception(f"Unexpected error controlling light {entity_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/scene/{scene_id}")
async def activate_scene(scene_id: str) -> Dict[str, str]:
    """Activate a Home Assistant scene.

    Args:
        scene_id: Scene entity ID (e.g., "scene.movie_mode")

    Returns:
        {status: "activated"}

    Raises:
        HTTPException: 404 if scene not found, 503 if HA unreachable
    """
    try:
        ha = get_ha_client()
        await ha.run_scene(scene_id)
        log.info(f"Activated scene {scene_id}")
        return {"status": "activated"}

    except ValueError as e:
        log.warning(f"Scene activation error for {scene_id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ConnectionError as e:
        log.error(f"Home Assistant unreachable: {e}")
        raise HTTPException(status_code=503, detail="Home Assistant unavailable")
    except Exception as e:
        log.exception(f"Unexpected error activating scene {scene_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/switch/{entity_id}")
async def control_switch(
    entity_id: str,
    body: Dict[str, Any],
) -> Dict[str, Any]:
    """Control a switch device.

    Args:
        entity_id: Switch entity ID (e.g., "switch.smart_plug_1")
        body: {
            "state": bool (true=on, false=off)
        }

    Returns:
        {status: "ok", device: {...current_state...}}

    Raises:
        HTTPException: 404 if entity not found, 503 if HA unreachable
    """
    try:
        state = body.get("state")
        if state is None:
            raise HTTPException(status_code=400, detail="Missing 'state' in request body")

        ha = get_ha_client()
        await ha.set_switch(entity_id, state)

        # Fetch current state to return
        try:
            states = await ha.get("/states")
            device_state = next((s for s in states if s.get("entity_id") == entity_id), None)
            device = {
                "entity_id": entity_id,
                "state": device_state.get("state") if device_state else "unknown",
                "attributes": device_state.get("attributes", {}) if device_state else {},
            }
        except Exception:
            # If we can't fetch state, just return basic info
            device = {"entity_id": entity_id, "state": "on" if state else "off"}

        log.info(f"Controlled switch {entity_id}: state={state}")
        return {"status": "ok", "device": device}

    except ValueError as e:
        log.warning(f"Switch control error for {entity_id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ConnectionError as e:
        log.error(f"Home Assistant unreachable: {e}")
        raise HTTPException(status_code=503, detail="Home Assistant unavailable")
    except Exception as e:
        log.exception(f"Unexpected error controlling switch {entity_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
