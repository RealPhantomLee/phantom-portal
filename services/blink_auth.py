#!/usr/bin/env python3
"""
One-time Blink 2FA authentication helper.
Run this once to generate blink_credentials.json, then start phantom-motion.
"""

import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.config import get_settings

CREDS_PATH = Path("/home/jolly/Projects/phantom/data/blink_credentials.json")


async def main():
    import aiohttp
    from blinkpy.blinkpy import Blink
    from blinkpy.auth import Auth
    from blinkpy.helpers.util import json_load

    settings = get_settings()

    print(f"Logging in as {settings.blink.username} ...")

    session = aiohttp.ClientSession()
    blink = Blink(session=session)

    auth = Auth({"username": settings.blink.username, "password": settings.blink.password})
    blink.auth = auth

    try:
        await blink.start()
    except Exception:
        pass

    if not blink.auth.is_errored:
        # May have prompted for 2FA during start — check
        pass
    else:
        code = input("Enter the 2FA code sent to your email/phone: ").strip()
        await blink.auth.send_auth_key(blink, code)
        await blink.setup_post_verify()

    CREDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CREDS_PATH, "w") as f:
        json.dump(blink.auth.login_attributes, f, indent=2)

    cameras = list(blink.cameras.keys())
    print(f"\nSuccess! Cameras found: {cameras}")
    print(f"Credentials saved to: {CREDS_PATH}")
    print("\nNow enable phantom-motion:")
    print("  sudo systemctl enable --now phantom-motion")

    await session.close()


if __name__ == "__main__":
    asyncio.run(main())
