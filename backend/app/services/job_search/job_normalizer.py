import hashlib
import re
from datetime import datetime
from typing import Any
from urllib.parse import urlparse


SKILL_ALIASES: dict[str, tuple[str, ...]] = {
    "Python": ("python",),
    "Java": ("java",),
    "JavaScript": ("javascript", "js"),
    "TypeScript": ("typescript",),
    "C++": ("c++",),
    "C#": ("c#", "c sharp"),
    "React": ("react", "reactjs"),
    "Angular": ("angular",),
    "Node.js": ("node.js", "nodejs"),
    "FastAPI": ("fastapi", "fast api"),
    "Django": ("django",),
    "Flask": ("flask",),
    "REST APIs": ("rest api", "restful api", "rest apis"),
    "GraphQL": ("graphql",),
    "SQL": ("sql",),
    "PostgreSQL": ("postgresql", "postgres"),
    "MySQL": ("mysql",),
    "MongoDB": ("mongodb",),
    "Redis": ("redis",),
    "Docker": ("docker",),
    "Kubernetes": ("kubernetes", "k8s"),
    "AWS": ("aws", "amazon web services"),
    "Azure": ("azure",),
    "Google Cloud": ("google cloud", "gcp"),
    "Git": ("git",),
    "Linux": ("linux",),
    "Machine Learning": ("machine learning", "ml models"),
    "Deep Learning": ("deep learning",),
    "TensorFlow": ("tensorflow",),
    "PyTorch": ("pytorch",),
    "Natural Language Processing": ("natural language processing", "nlp"),
    "Large Language Models": ("large language model", "llm", "generative ai"),
    "Retrieval-Augmented Generation": ("retrieval augmented generation", "rag"),
    "Pandas": ("pandas",),
    "NumPy": ("numpy",),
    "Excel": ("microsoft excel", "excel"),
    "Power BI": ("power bi",),
    "Tableau": ("tableau",),
}


def _contains_term(text: str, term: str) -> bool:
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(term.lower())}(?![a-z0-9])", text.lower()))


def extract_known_skills(text: str) -> list[str]:
    return [
        skill
        for skill, aliases in SKILL_ALIASES.items()
        if any(_contains_term(text, alias) for alias in aliases)
    ]


def _display_name(value: Any) -> str | None:
    if isinstance(value, dict):
        value = value.get("display_name")
    return value.strip() if isinstance(value, str) and value.strip() else None


def _safe_provider_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    url = value.strip()
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    return url if parsed.scheme == "https" and parsed.netloc else None


def _employment_type(record: dict[str, Any], title: str, description: str = "") -> str | None:
    contract_time = str(record.get("contract_time") or "").lower().replace("_", " ")
    contract_type = str(record.get("contract_type") or "").lower().replace("_", " ")
    combined = f"{title} {description}".lower()
    title_lower = title.lower()

    if re.search(r"\bintern(ship)?\b", title_lower):
        return "Internship"
    if "apprentice" in title_lower:
        return "Apprenticeship"
    if "part time" in contract_time or re.search(r"\bpart[- ]time\b", title_lower):
        return "Part-time"
    if "full time" in contract_time or "permanent" in contract_type or re.search(r"\bfull[- ]time\b", title_lower):
        return "Full-time"
    if "contract" in contract_type or re.search(r"\bcontract\b", title_lower):
        return "Contract"

    # Secondary check in snippet text
    if re.search(r"\bintern(ship)?\b", combined):
        return "Internship"
    if re.search(r"\bpart[- ]time\b", combined):
        return "Part-time"
    if re.search(r"\bfull[- ]time\b", combined):
        return "Full-time"
    return None


def _work_mode(title: str, description: str) -> str | None:
    text = f"{title} {description}".lower()
    if re.search(r"\bhybrid\b", text):
        return "Hybrid"
    if re.search(r"\b(remote|work from home|work-from-home|wfh)\b", text):
        return "Remote"
    if re.search(r"\b(on[- ]site|in[- ]office|in person|on premises)\b", text):
        return "On-site"
    return None


def _parse_posted_at(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return None


def normalize_adzuna_listing(record: dict[str, Any]) -> dict[str, Any] | None:
    title = _display_name(record.get("title"))
    if not title:
        return None
    company = _display_name(record.get("company"))
    location_raw = record.get("location")
    location = _display_name(location_raw)

    location_areas: list[str] = []
    if isinstance(location_raw, dict):
        areas = location_raw.get("area")
        if isinstance(areas, list):
            location_areas = [str(a).strip() for a in areas if str(a).strip()]

    if not location and location_areas:
        location = ", ".join(reversed(location_areas[-3:]))

    description = record.get("description")
    if not isinstance(description, str):
        description = ""
    description = description.strip()

    application_url = _safe_provider_url(record.get("redirect_url"))
    provider_id = record.get("id")
    if provider_id is None:
        fingerprint = "|".join((title.lower(), (company or "").lower(), (location or "").lower(), application_url or ""))
        provider_id = hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:24]

    skills = extract_known_skills(f"{title}\n{description}")
    return {
        "id": f"adzuna:{provider_id}",
        "source": "Adzuna",
        "title": title,
        "company": company,
        "location": location,
        "location_areas": location_areas,
        "work_mode": _work_mode(title, description),
        "employment_type": _employment_type(record, title, description),
        "description": description,
        "skills": skills,
        "requirements": skills,
        "posted_at": _parse_posted_at(record.get("created")),
        "application_url": application_url,
        "source_url": application_url,
    }
