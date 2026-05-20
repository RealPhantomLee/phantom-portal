import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml


@dataclass(frozen=True)
class DeepSeekConfig:
    api_key: str
    base_url: str = "https://api.deepseek.com"
    model: str = "deepseek-chat"


@dataclass(frozen=True)
class TelegramConfig:
    bot_token: str
    chat_id: str


@dataclass(frozen=True)
class HomeAssistantConfig:
    url: str
    token: str


@dataclass(frozen=True)
class CameraConfig:
    rtsp_url: str
    onvif_host: str
    onvif_port: int
    onvif_user: str
    onvif_password: str


@dataclass(frozen=True)
class BlinkConfig:
    username: str
    password: str


@dataclass(frozen=True)
class TailscaleConfig:
    tailnet: str


@dataclass(frozen=True)
class MqttConfig:
    host: str = "localhost"
    port: int = 1883
    username: str = ""
    password: str = ""


@dataclass(frozen=True)
class WebPushConfig:
    vapid_private_key: str
    vapid_public_key: str
    vapid_email: str


@dataclass(frozen=True)
class Settings:
    deepseek: DeepSeekConfig
    telegram: TelegramConfig
    home_assistant: HomeAssistantConfig
    camera: CameraConfig
    blink: BlinkConfig
    tailscale: TailscaleConfig
    mosquitto: MqttConfig
    web_push: WebPushConfig


def _load_config_file() -> dict:
    config_path = os.getenv(
        "PHANTOM_CONFIG_PATH",
        Path(__file__).parent.parent / "phantom.config.yaml"
    )
    config_path = Path(config_path)

    if not config_path.exists():
        raise FileNotFoundError(
            f"Config file not found at {config_path}. "
            "Copy phantom.config.example.yaml to phantom.config.yaml and fill in your values."
        )

    with open(config_path) as f:
        return yaml.safe_load(f)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    config_dict = _load_config_file()

    return Settings(
        deepseek=DeepSeekConfig(**config_dict["deepseek"]),
        telegram=TelegramConfig(**config_dict["telegram"]),
        home_assistant=HomeAssistantConfig(**config_dict["home_assistant"]),
        camera=CameraConfig(**config_dict["camera"]),
        blink=BlinkConfig(**config_dict["blink"]),
        tailscale=TailscaleConfig(**config_dict["tailscale"]),
        mosquitto=MqttConfig(**config_dict.get("mosquitto", {})),
        web_push=WebPushConfig(**config_dict["web_push"]),
    )
