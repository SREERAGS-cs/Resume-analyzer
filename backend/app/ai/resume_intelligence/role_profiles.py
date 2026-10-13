import json
from functools import lru_cache
from pathlib import Path


_ROLE_PROFILE_PATH = Path(__file__).resolve().parents[4] / "shared" / "role_profiles.json"


@lru_cache(maxsize=1)
def _load_role_profiles() -> tuple[dict, ...]:
    with _ROLE_PROFILE_PATH.open(encoding="utf-8") as profile_file:
        profiles = json.load(profile_file)
    return tuple(profiles)


def get_role_profile(target_role: str) -> dict:
    normalized_role = target_role.strip().casefold()
    for profile in _load_role_profiles():
        if normalized_role in (profile["name"].casefold(), profile["id"].casefold()):
            return {**profile, "is_custom": False}

    return {
        "id": "custom",
        "name": target_role.strip(),
        "description": "User-provided custom target role; no predefined skill profile is available.",
        "is_custom": True,
        "categories": {
            "core_skills": [],
            "languages": [],
            "frameworks": [],
            "databases": [],
            "tools": [],
            "concepts": [],
            "project_characteristics": [],
            "responsibilities": [],
        },
    }
