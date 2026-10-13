import inspect
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.parsed_resume import ParsedResume
from app.models.user import User
from app.schemas.job_search import JobOpportunity, JobSearchRequest, JobSearchResponse, LocationMode
from app.services import resume_service
from app.services.job_search.job_normalizer import SKILL_ALIASES, extract_known_skills, normalize_adzuna_listing
from app.services.job_search.job_provider import (
    JobProviderError,
    JobProviderNetworkError,
    JobProviderNotConfigured,
    JobProviderRateLimited,
)
from app.services.job_search.providers.adzuna_provider import AdzunaProvider

MAX_RESULTS = 25

CITY_ALIASES: dict[str, set[str]] = {
    "bengaluru": {"bengaluru", "bangalore"},
    "bangalore": {"bengaluru", "bangalore"},
    "mumbai": {"mumbai", "bombay", "navi mumbai", "thane"},
    "chennai": {"chennai", "madras"},
    "kolkata": {"kolkata", "calcutta"},
    "gurugram": {"gurugram", "gurgaon"},
    "gurgaon": {"gurugram", "gurgaon"},
    "kochi": {"kochi", "cochin", "ernakulam"},
    "thiruvananthapuram": {"thiruvananthapuram", "trivandrum"},
    "hyderabad": {"hyderabad", "secunderabad"},
    "mysuru": {"mysuru", "mysore"},
    "puducherry": {"puducherry", "pondicherry"},
    "delhi": {"delhi", "new delhi", "noida", "gurgaon", "gurugram", "faridabad", "ghaziabad"},
    "noida": {"noida", "greater noida", "delhi"},
}


def _flatten_text(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, dict):
        return [part for item in value.values() for part in _flatten_text(item)]
    if isinstance(value, (list, tuple, set)):
        return [part for item in value for part in _flatten_text(item)]
    return []


def _resume_skills(parsed: ParsedResume) -> list[str]:
    parts: list[str] = []
    for key in (
        "summary",
        "personal_info",
        "skills",
        "skills_raw",
        "education",
        "education_raw",
        "experience",
        "experience_raw",
        "projects",
        "projects_raw",
        "certifications",
        "certifications_raw",
        "achievements",
        "achievements_raw",
        "other_sections",
    ):
        parts.extend(_flatten_text(getattr(parsed, key, None)))
    skills = extract_known_skills("\n".join(parts))
    declared_skills = _flatten_text(parsed.skills)
    for declared_skill in declared_skills:
        for canonical, aliases in SKILL_ALIASES.items():
            if any(alias.lower() == declared_skill.strip().lower() for alias in aliases) and canonical not in skills:
                skills.append(canonical)
    return skills


def _normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _normalize_company(name: str | None) -> str:
    if not name:
        return ""
    cleaned = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    # Strip corporate entity suffixes
    cleaned = re.sub(
        r"\b(pvt|ltd|limited|corp|corporation|inc|incorporated|technologies|technology|solutions|services|llp|holdings|group|india)\b",
        "",
        cleaned,
    ).strip()
    return re.sub(r"\s+", " ", cleaned).strip()


def _matches_company(job: dict[str, Any], requested_company: str | None) -> bool:
    if not requested_company or not requested_company.strip():
        return True
    job_company = job.get("company")
    if not job_company:
        return False
    norm_req = _normalize_company(requested_company)
    norm_job = _normalize_company(job_company)
    if not norm_req or not norm_job:
        # Fall back to raw lowercase substring
        req_raw = requested_company.lower().strip()
        job_raw = job_company.lower().strip()
        return req_raw in job_raw or job_raw in req_raw
    return norm_req in norm_job or norm_job in norm_req or norm_req == norm_job


def _has_experience_mismatch(job_text: str, experience_level: str) -> bool:
    if experience_level == "Any":
        return False
    caps = {"Student / Fresher": 0, "0–1 years": 1, "1–2 years": 2, "2–3 years": 3}
    cap = caps.get(experience_level)
    if cap is None:
        return False
    required_years = [
        int(match.group(1))
        for match in re.finditer(
            r"\b(\d{1,2})(?:\s*[-–]\s*\d{1,2}|\s*\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+experience\b",
            job_text,
            re.IGNORECASE,
        )
    ]
    return bool(required_years and min(required_years) > cap)


def _matches_opportunity_type(job: dict[str, Any], requested: str) -> bool:
    if job.get("employment_type") == requested:
        return True
    title = (job.get("title") or "").lower()
    desc = (job.get("description") or "").lower()
    combined = f"{title} {desc}"

    if requested == "Internship":
        return bool(re.search(r"\bintern(ship)?\b", title) or re.search(r"\bintern(ship)?\b", desc))
    if requested == "Apprenticeship":
        return bool(re.search(r"\bapprentice(ship)?\b", title) or re.search(r"\bapprentice(ship)?\b", desc))
    if requested == "Part-time":
        return bool(re.search(r"\bpart[- ]time\b", title) or re.search(r"\bpart[- ]time\b", desc))
    if requested == "Contract":
        return bool(re.search(r"\bcontract\b", title) or re.search(r"\bcontract\b", desc))
    if requested == "Full-time":
        if re.search(r"\bfull[- ]time\b", combined):
            return True
        # If employment_type is None and it is not an internship/apprenticeship/part-time/contract,
        # standard tech listings without an explicit badge represent regular/full-time openings
        is_other = bool(
            re.search(r"\bintern(ship)?\b", title)
            or re.search(r"\bapprentice(ship)?\b", title)
            or re.search(r"\bpart[- ]time\b", title)
            or re.search(r"\bcontract\b", title)
        )
        return not is_other
    return False


def _matches_work_mode(job: dict[str, Any], requested_work_modes: list[str]) -> bool:
    if not requested_work_modes:
        return True
    job_mode = job.get("work_mode")
    # If user strictly selected Remote only:
    if requested_work_modes == ["Remote"]:
        return job_mode == "Remote"
    # If all work modes selected, accept any
    if set(requested_work_modes) >= {"On-site", "Hybrid", "Remote"}:
        return True
    # If job has explicit mode, check membership
    if job_mode is not None:
        return job_mode in requested_work_modes
    # If job mode is unstated in snippet:
    # If user did not request Remote (i.e. wants On-site / Hybrid), physical locations are compatible
    return "Remote" not in requested_work_modes or len(requested_work_modes) > 1


def _matches_location(job: dict[str, Any], request: JobSearchRequest) -> bool:
    if request.location_mode == LocationMode.ANYWHERE_INDIA:
        return True

    if request.location_mode == LocationMode.REMOTE_ONLY:
        return job.get("work_mode") == "Remote" or "remote" in (job.get("description") or "").lower()

    job_location = job.get("location") or ""
    location_areas = job.get("location_areas") or []
    all_location_texts = [_normalized(job_location)] + [_normalized(a) for a in location_areas]
    combined_location = " ".join(all_location_texts)

    if request.location_mode == LocationMode.STATE_CITY:
        state_match = True
        if request.state:
            norm_state = _normalized(request.state)
            state_match = any(norm_state in loc for loc in all_location_texts)
        if request.locations:
            city_match = _check_city_match(request.locations, all_location_texts, combined_location)
            return city_match or (state_match and not request.locations)
        return state_match

    if request.location_mode in {LocationMode.SPECIFIC_CITY, LocationMode.NEAR_ME, LocationMode.MULTIPLE_CITIES}:
        if not request.locations:
            return True
        return _check_city_match(request.locations, all_location_texts, combined_location)

    if request.location_mode == LocationMode.INTERNATIONAL:
        if not request.locations:
            return True
        return _check_city_match(request.locations, all_location_texts, combined_location)

    return True


def _check_city_match(requested_cities: list[str], location_texts: list[str], combined: str) -> bool:
    for city in requested_cities:
        norm_city = _normalized(city)
        if not norm_city:
            continue
        aliases = CITY_ALIASES.get(norm_city, {norm_city})
        for alias in aliases:
            if any(alias in loc for loc in location_texts) or alias in combined:
                return True
    return False


def _deduplication_key(job: dict[str, Any]) -> tuple[str, ...]:
    url = job.get("application_url")
    if url:
        return ("url", _normalized(url))
    return (
        "listing",
        _normalized(job.get("company") or ""),
        _normalized(job["title"]),
        _normalized(job.get("location") or ""),
    )


def _posted_timestamp(value: str | None) -> float:
    if not value:
        return 0
    try:
        posted = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if posted.tzinfo is None:
            posted = posted.replace(tzinfo=timezone.utc)
        return posted.timestamp()
    except ValueError:
        return 0


def _location_query(request: JobSearchRequest) -> list[str | None]:
    if request.location_mode in {LocationMode.NEAR_ME, LocationMode.SPECIFIC_CITY}:
        return request.locations if request.locations else [None]
    if request.location_mode == LocationMode.MULTIPLE_CITIES:
        return request.locations if request.locations else [None]
    if request.location_mode == LocationMode.STATE_CITY:
        if request.locations and request.state:
            return [f"{request.locations[0]}, {request.state}"]
        if request.locations:
            return request.locations
        if request.state:
            return [request.state]
        return [None]
    if request.location_mode == LocationMode.INTERNATIONAL:
        return request.locations if request.locations else [None]
    return [None]


def _generate_fit_reason(
    job: dict[str, Any],
    request: JobSearchRequest,
    matched_skills: list[str],
    missing_skills: list[str],
) -> str:
    reasons = []
    if matched_skills:
        top_skills = ", ".join(matched_skills[:3])
        reasons.append(f"Matches verified resume skill{'s' if len(matched_skills) != 1 else ''} ({top_skills})")
    if request.company and _matches_company(job, request.company):
        reasons.append(f"verified role at '{request.company}'")
    if job.get("work_mode"):
        reasons.append(f"{job['work_mode'].lower()} work mode")
    if not reasons:
        if missing_skills:
            reasons.append(f"Target role alignment with opportunities in {', '.join(missing_skills[:2])}")
        else:
            reasons.append(f"Target role '{request.role}' alignment")
    text = "; ".join(reasons)
    return text[0].upper() + text[1:] + "."


def _listing_for_response(
    job: dict[str, Any],
    request: JobSearchRequest,
    resume_skills: list[str],
) -> JobOpportunity:
    matched_skills = [skill for skill in job["skills"] if skill in resume_skills]
    missing_skills = [skill for skill in job["skills"] if skill not in matched_skills]
    if not job["skills"]:
        label = "Partial Match"
    elif len(matched_skills) / len(job["skills"]) >= 0.6 and matched_skills:
        label = "Strong Match"
    elif matched_skills:
        label = "Partial Match"
    else:
        label = "Significant Gaps"

    job_text = f"{job['title']} {job['description']}"
    location_known = bool(job.get("location"))
    location_compatibility = "Unclear"
    if request.location_mode in {LocationMode.ANYWHERE_INDIA, LocationMode.REMOTE_ONLY} and (
        request.location_mode == LocationMode.ANYWHERE_INDIA or job.get("work_mode") == "Remote"
    ):
        location_compatibility = "Compatible"
    elif request.locations and location_known:
        if _matches_location(job, request):
            location_compatibility = "Compatible"
    elif request.location_mode == LocationMode.STATE_CITY and _matches_location(job, request):
        location_compatibility = "Compatible"

    work_mode = job.get("work_mode")
    work_compatibility = (
        "Compatible"
        if work_mode in request.work_modes
        or (request.location_mode == LocationMode.REMOTE_ONLY and work_mode == "Remote")
        or (not request.work_modes and work_mode is not None)
        else "Unclear"
    )

    if request.experience_level == "Any":
        experience_compatibility = "Compatible"
    elif not re.search(r"\b\d{1,2}(?:\s*[-–]\s*\d{1,2}|\s*\+)?\s*(?:years?|yrs?)\b", job_text, re.IGNORECASE):
        experience_compatibility = "Unclear"
    elif _has_experience_mismatch(job_text, request.experience_level):
        experience_compatibility = "Potential mismatch"
    else:
        experience_compatibility = "Compatible"

    fit_reason = _generate_fit_reason(job, request, matched_skills, missing_skills)

    job_clean = {k: v for k, v in job.items() if k != "location_areas"}

    return JobOpportunity(
        **job_clean,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        relevance_label=label,
        experience_compatibility=experience_compatibility,
        location_compatibility=location_compatibility,
        work_mode_compatibility=work_compatibility,
        fit_reason=fit_reason,
    )


def search_jobs(db: Session, current_user: User, request: JobSearchRequest) -> JobSearchResponse:
    resume = resume_service.get_owned_resume_or_404(db, request.resume_id, current_user.id)
    parsed = resume.parsed_data
    if not parsed or parsed.status != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verify a resume to get personalized job recommendations.",
        )

    resume_skills = _resume_skills(parsed)
    provider = AdzunaProvider()
    normalized_jobs: list[dict[str, Any]] = []

    country_code = request.country if request.location_mode == LocationMode.INTERNATIONAL else "in"

    try:
        location_queries = _location_query(request)
        sig = inspect.signature(provider.search)
        supports_kwargs = "company" in sig.parameters or any(
            p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()
        )

        for loc in location_queries:
            provider_role = (
                f"{request.role} remote"
                if request.location_mode == LocationMode.REMOTE_ONLY
                else request.role
            )
            if supports_kwargs:
                provider_listings = provider.search(
                    provider_role,
                    loc,
                    request.opportunity_type.value,
                    company=request.company,
                    country=country_code,
                    page=request.page,
                )
            else:
                provider_listings = provider.search(
                    provider_role,
                    loc,
                    request.opportunity_type.value,
                )

            for listing in provider_listings:
                job = normalize_adzuna_listing(listing)
                if not job:
                    continue

                # Filter: Company (when requested)
                if request.company and not _matches_company(job, request.company):
                    continue

                # Filter: Opportunity type
                if not _matches_opportunity_type(job, request.opportunity_type.value):
                    continue

                # Filter: Remote only mode
                if request.location_mode == LocationMode.REMOTE_ONLY and job.get("work_mode") != "Remote":
                    continue

                # Filter: Work modes
                if request.work_modes and not _matches_work_mode(job, request.work_modes):
                    continue

                # Filter: Location
                if not _matches_location(job, request):
                    continue

                # Filter: Experience level
                if _has_experience_mismatch(
                    f"{job['title']} {job['description']}",
                    request.experience_level.value,
                ):
                    continue

                normalized_jobs.append(job)
    except JobProviderRateLimited as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        ) from exc
    except JobProviderNotConfigured as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except JobProviderNetworkError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except JobProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    unique_jobs: dict[tuple[str, ...], dict[str, Any]] = {}
    for job in normalized_jobs:
        key = _deduplication_key(job)
        unique_jobs.setdefault(key, job)

    scored_jobs = []
    for job in unique_jobs.values():
        match_count = sum(skill in resume_skills for skill in job["skills"])
        scored_jobs.append((job, match_count))

    scored_jobs.sort(
        key=lambda item: (
            item[1],
            item[0].get("location") is not None,
            _posted_timestamp(item[0].get("posted_at")),
        ),
        reverse=True,
    )

    opportunities = [
        _listing_for_response(job, request, resume_skills)
        for job, _ in scored_jobs[:MAX_RESULTS]
    ]

    return JobSearchResponse(
        resume_id=resume.id,
        personalized=True,
        total=len(opportunities),
        jobs=opportunities,
        page=request.page,
        provider="Adzuna",
    )
