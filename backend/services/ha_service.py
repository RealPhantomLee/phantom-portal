"""
Home Assistant service client.
Provides a singleton interface to interact with Home Assistant REST API.
"""

import logging
from typing import Optional, Dict, Any, List

import aiohttp

from backend.config import get_settings

log = logging.getLogger(__name__)


class HomeAssistantClient:
    """Singleton client for Home Assistant REST API."""

    _instance: Optional["HomeAssistantClient"] = None

    def __new__(cls) -> "HomeAssistantClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        settings = get_settings()
        ha_config = settings.home_assistant
        self.base_url = ha_config.url.rstrip("/")
        self.token = ha_config.token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        self._initialized = True
        log.info(f"HomeAssistantClient initialized with base_url={self.base_url}")

    async def get(self, path: str) -> Dict[str, Any] | List[Any]:
        """Make a GET request to the HA API."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api{path}",
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 404:
                        raise ValueError(f"Entity not found: {path}")
                    if response.status >= 500:
                        raise ConnectionError(f"Home Assistant unavailable (status {response.status})")
                    response.raise_for_status()
                    return await response.json()
        except aiohttp.ClientError as e:
            log.error(f"HA API GET {path} failed: {e}")
            raise ConnectionError(f"Failed to connect to Home Assistant: {e}")

    async def post(self, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a POST request to the HA API."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api{path}",
                    headers=self.headers,
                    json=body or {},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 404:
                        raise ValueError(f"Entity not found: {path}")
                    if response.status >= 500:
                        raise ConnectionError(f"Home Assistant unavailable (status {response.status})")
                    response.raise_for_status()
                    return await response.json()
        except aiohttp.ClientError as e:
            log.error(f"HA API POST {path} failed: {e}")
            raise ConnectionError(f"Failed to connect to Home Assistant: {e}")

    async def call_service(self, domain: str, service: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Call a Home Assistant service."""
        return await self.post(f"/services/{domain}/{service}", data)

    async def get_devices(self) -> List[Dict[str, Any]]:
        """Get list of all devices with their current state and attributes.

        Returns:
            List of dicts with: {entity_id, name, state, attributes, type}
        """
        states = await self.get("/states")
        devices = []

        for state in states:
            entity_id = state.get("entity_id", "")
            attributes = state.get("attributes", {})

            # Determine device type from entity_id domain
            domain = entity_id.split(".")[0] if "." in entity_id else None
            device_type = domain if domain in ["light", "switch", "scene"] else None

            device = {
                "entity_id": entity_id,
                "name": attributes.get("friendly_name", entity_id),
                "state": state.get("state"),
                "attributes": attributes,
                "type": device_type,
            }
            devices.append(device)

        log.info(f"Retrieved {len(devices)} devices from Home Assistant")
        return devices

    async def set_light(
        self,
        entity_id: str,
        state: bool,
        brightness: Optional[int] = None,
        color: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """Set light state, brightness, and/or color.

        Args:
            entity_id: Light entity ID (e.g., "light.living_room")
            state: True for on, False for off
            brightness: 0-255 (optional)
            color: {r, g, b} with values 0-255 (optional)

        Returns:
            Response from Home Assistant
        """
        data = {"entity_id": entity_id}

        if state:
            # Turn on with optional brightness and color
            if brightness is not None:
                brightness = max(0, min(255, brightness))  # Clamp to 0-255
                data["brightness"] = brightness
            if color is not None:
                # Convert {r, g, b} to rgb_color array
                rgb = [color.get("r", 255), color.get("g", 255), color.get("b", 255)]
                rgb = [max(0, min(255, c)) for c in rgb]  # Clamp each component
                data["rgb_color"] = rgb

            result = await self.call_service("light", "turn_on", data)
            log.info(f"Light {entity_id} turned on (brightness={brightness}, color={color})")
        else:
            # Turn off
            result = await self.call_service("light", "turn_off", data)
            log.info(f"Light {entity_id} turned off")

        return result

    async def run_scene(self, scene_id: str) -> Dict[str, Any]:
        """Activate a Home Assistant scene.

        Args:
            scene_id: Scene entity ID (e.g., "scene.movie_mode")

        Returns:
            Response from Home Assistant
        """
        data = {"entity_id": scene_id}
        result = await self.call_service("scene", "turn_on", data)
        log.info(f"Scene activated: {scene_id}")
        return result

    async def set_switch(self, entity_id: str, state: bool) -> Dict[str, Any]:
        """Set switch state.

        Args:
            entity_id: Switch entity ID (e.g., "switch.smart_plug_1")
            state: True for on, False for off

        Returns:
            Response from Home Assistant
        """
        data = {"entity_id": entity_id}
        service = "turn_on" if state else "turn_off"
        result = await self.call_service("switch", service, data)
        log.info(f"Switch {entity_id} turned {('on' if state else 'off')}")
        return result

    async def toggle_switch(self, entity_id: str) -> Dict[str, Any]:
        """Toggle a switch.

        Args:
            entity_id: Switch entity ID (e.g., "switch.smart_plug_1")

        Returns:
            Response from Home Assistant
        """
        data = {"entity_id": entity_id}
        result = await self.call_service("switch", "toggle", data)
        log.info(f"Switch {entity_id} toggled")
        return result


def get_ha_client() -> HomeAssistantClient:
    """Get the singleton Home Assistant client."""
    return HomeAssistantClient()
