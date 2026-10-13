from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
from app.models import ParsedResume, Resume, User
from app.routers import jobs, resumes
from app.services.job_search.job_provider import JobProviderError
from app.services.job_search.job_normalizer import normalize_adzuna_listing
from app.services.job_search.providers.adzuna_provider import AdzunaProvider
from app.utils.security import create_access_token

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


api_app = FastAPI()
api_app.include_router(resumes.router)
api_app.include_router(jobs.router)
api_app.dependency_overrides[get_db] = override_get_db
client = TestClient(api_app)


@pytest.fixture(autouse=True)
def reset_tables():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def make_user_with_resume(status="verified", skills=None):
    db = TestingSessionLocal()
    user = User(full_name="Opportunity User", email=f"{uuid4().hex}@example.com", password_hash="hashed")
    db.add(user)
    db.commit()
    db.refresh(user)

    resume = Resume(
        user_id=user.id,
        original_filename="resume.pdf",
        display_name="Verified Resume",
        file_path="/tmp/resume.pdf",
        file_type="pdf",
        file_size=10,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    parsed = ParsedResume(
        resume_id=resume.id,
        user_id=user.id,
        status=status,
        personal_info={"full_name": "Opportunity User"},
        summary="Software developer working with Python and React.",
        skills=skills if skills is not None else ["Python", "React", "SQL"],
        skills_raw="Python, React, SQL",
        education=[],
        experience=[],
        projects=[],
        certifications=[],
        achievements=[],
        other_sections={},
    )
    db.add(parsed)
    db.commit()
    user_id = user.id
    resume_id = resume.id
    db.close()
    return {
        "resume_id": resume_id,
        "headers": {"Authorization": f"Bearer {create_access_token({'sub': str(user_id)})}"},
        "user_id": user_id,
    }


def listing(
    *,
    job_id="job-1",
    title="Software Developer Intern",
    company="ABC Technologies",
    location="Coimbatore, Tamil Nadu, India",
    description="Internship working with Python, React, SQL and Docker in a hybrid environment.",
    url="https://www.adzuna.in/details/job-1",
    created="2026-10-01T10:00:00Z",
    contract_type="internship",
    contract_time=None,
):
    return {
        "id": job_id,
        "title": title,
        "company": {"display_name": company} if company is not None else {},
        "location": {"display_name": location} if location is not None else {},
        "description": description,
        "redirect_url": url,
        "created": created,
        "contract_type": contract_type,
        "contract_time": contract_time,
    }


def request_payload(resume_id, **updates):
    payload = {
        "resume_id": resume_id,
        "role": "Software Developer",
        "opportunity_type": "Internship",
        "location_mode": "specific_city",
        "locations": ["Coimbatore"],
        "work_modes": ["Hybrid"],
        "experience_level": "Student / Fresher",
    }
    payload.update(updates)
    return payload


def patch_provider(monkeypatch, listings):
    calls = []

    def search(_self, role, location, opportunity_type, *args, **kwargs):
        calls.append((role, location, opportunity_type))
        return listings

    monkeypatch.setattr(AdzunaProvider, "search", search)
    return calls


def test_search_requires_authentication():
    response = client.post("/api/jobs/search", json={})
    assert response.status_code in {401, 403}


@pytest.mark.parametrize(
    "updates",
    [
        {"role": "  "},
        {"opportunity_type": "Seasonal"},
        {"location_mode": "nearby"},
        {"location_mode": "specific_city", "locations": []},
        {"location_mode": "multiple_cities", "locations": []},
    ],
)
def test_search_rejects_invalid_search_criteria(updates):
    data = make_user_with_resume()
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"], **updates),
        headers=data["headers"],
    )
    assert response.status_code == 422


def test_specific_city_uses_verified_resume_and_evidence_based_skills(monkeypatch):
    data = make_user_with_resume()
    calls = patch_provider(monkeypatch, [listing()])
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"]),
        headers=data["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert calls == [("Software Developer", "Coimbatore", "Internship")]
    assert body["personalized"] is True
    assert body["jobs"][0]["matched_skills"] == ["Python", "React", "SQL"]
    assert body["jobs"][0]["missing_skills"] == ["Docker"]
    assert body["jobs"][0]["location_compatibility"] == "Compatible"
    assert body["jobs"][0]["work_mode"] == "Hybrid"


def test_resume_list_exposes_verified_status_for_recommendation_selection():
    data = make_user_with_resume()
    response = client.get("/api/resumes", headers=data["headers"])
    assert response.status_code == 200
    assert response.json()[0]["parsing_status"] == "verified"


def test_near_me_search_uses_user_entered_city(monkeypatch):
    data = make_user_with_resume()
    calls = patch_provider(monkeypatch, [listing()])
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            location_mode="near_me",
            locations=["Chennai"],
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert calls == [("Software Developer", "Chennai", "Internship")]


def test_multiple_cities_queries_each_city_and_deduplicates(monkeypatch):
    data = make_user_with_resume()
    calls = patch_provider(monkeypatch, [listing()])
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            location_mode="multiple_cities",
            locations=["Coimbatore", "Chennai"],
        ),
        headers=data["headers"],
    )

    assert response.status_code == 200
    assert [call[1] for call in calls] == ["Coimbatore", "Chennai"]
    assert response.json()["total"] == 1


@pytest.mark.parametrize(
    ("location_mode", "locations"),
    [("anywhere_india", []), ("remote_only", [])],
)
def test_anywhere_and_remote_modes_do_not_require_cities(monkeypatch, location_mode, locations):
    data = make_user_with_resume()
    calls = patch_provider(
        monkeypatch,
        [listing(description="Remote internship using Python.", location=None)],
    )
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            location_mode=location_mode,
            locations=locations,
            work_modes=["Remote"] if location_mode == "remote_only" else [],
        ),
        headers=data["headers"],
    )

    assert response.status_code == 200
    assert calls[0][1] is None
    if location_mode == "remote_only":
        assert calls[0][0] == "Software Developer remote"
        assert len(response.json()["jobs"]) == 1
        assert response.json()["jobs"][0]["work_mode"] == "Remote"


@pytest.mark.parametrize(
    ("opportunity_type", "record", "expected_count"),
    [
        ("Internship", listing(), 1),
        ("Full-time", listing(title="Software Developer", contract_type="permanent", contract_time="full_time"), 1),
        ("Full-time", listing(), 0),
    ],
)
def test_opportunity_type_filtering(monkeypatch, opportunity_type, record, expected_count):
    data = make_user_with_resume()
    patch_provider(monkeypatch, [record])
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            opportunity_type=opportunity_type,
            location_mode="anywhere_india",
            locations=[],
            work_modes=[],
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert response.json()["total"] == expected_count


def test_work_mode_filtering_excludes_unknown_and_unselected(monkeypatch):
    data = make_user_with_resume()
    patch_provider(
        monkeypatch,
        [
            listing(job_id="remote", description="Remote internship using Python."),
            listing(job_id="unknown", description="Internship using Python."),
        ],
    )
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            location_mode="anywhere_india",
            locations=[],
            work_modes=["Remote"],
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert [job["id"] for job in response.json()["jobs"]] == ["adzuna:remote"]


def test_provider_failure_is_reported_as_gateway_error(monkeypatch):
    data = make_user_with_resume()

    def fail_search(self, role, location, opportunity_type):
        raise JobProviderError("Adzuna could not return current listings.")

    monkeypatch.setattr(AdzunaProvider, "search", fail_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"]),
        headers=data["headers"],
    )
    assert response.status_code == 502


def test_unconfigured_provider_is_reported_as_service_unavailable(monkeypatch):
    from app.config.settings import settings

    data = make_user_with_resume()
    monkeypatch.setattr(settings, "ADZUNA_APP_ID", "")
    monkeypatch.setattr(settings, "ADZUNA_APP_KEY", "")
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"]),
        headers=data["headers"],
    )
    assert response.status_code == 503


def test_malformed_provider_response_is_reported(monkeypatch):
    from app.config.settings import settings
    from app.services.job_search.providers import adzuna_provider

    monkeypatch.setattr(settings, "ADZUNA_APP_ID", "test-id")
    monkeypatch.setattr(settings, "ADZUNA_APP_KEY", "test-key")

    class Response:
        def __enter__(_self):
            return _self

        def __exit__(_self, *_args):
            return None

        def read(_self):
            return b'{"unexpected": "object"}'

    def fake_urlopen(_request, **_kwargs):
        return Response()

    monkeypatch.setattr(adzuna_provider, "urlopen", fake_urlopen)
    with pytest.raises(JobProviderError, match="invalid listings response"):
        AdzunaProvider().search("Developer", None, "Internship")


def test_missing_provider_fields_remain_null_and_invalid_urls_are_not_used():
    job = normalize_adzuna_listing(
        {
            "id": "sparse-job",
            "title": "Software Developer Intern",
            "description": "Python internship.",
            "redirect_url": "javascript:alert(1)",
            "created": "not-a-date",
        }
    )
    assert job is not None
    assert job["company"] is None
    assert job["location"] is None
    assert job["work_mode"] is None
    assert job["posted_at"] is None
    assert job["application_url"] is None
    assert job["skills"] == ["Python"]


def test_no_verified_resume_is_rejected_and_provider_is_not_called(monkeypatch):
    data = make_user_with_resume(status="needs_review")
    calls = patch_provider(monkeypatch, [listing()])
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"]),
        headers=data["headers"],
    )
    assert response.status_code == 400
    assert "Verify a resume" in response.json()["detail"]
    assert calls == []


def test_no_results_returns_empty_list(monkeypatch):
    data = make_user_with_resume()
    patch_provider(monkeypatch, [])
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"]),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["jobs"] == []


def test_resume_must_belong_to_authenticated_user(monkeypatch):
    owner = make_user_with_resume()
    other = make_user_with_resume()
    calls = patch_provider(monkeypatch, [listing()])
    response = client.post(
        "/api/jobs/search",
        json=request_payload(owner["resume_id"]),
        headers=other["headers"],
    )
    assert response.status_code == 403
    assert calls == []


def test_adzuna_date_is_normalized_to_iso():
    job = normalize_adzuna_listing(listing(created="2026-10-01T10:00:00Z"))
    assert job is not None
    assert job["posted_at"] == datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc).isoformat()


def test_company_specific_search_filters_genuine_employer(monkeypatch):
    data = make_user_with_resume()
    calls = []

    def fake_search(_self, role, location, opportunity_type, company=None, country="in", page=1):
        calls.append({"role": role, "company": company, "country": country, "page": page})
        return [
            listing(job_id="zoho-1", title="Software Developer", company="Zoho Corporation", description="Python and React developer at Zoho."),
            listing(job_id="other-1", title="Software Developer", company="Third Party Recruiters", description="Looking for candidates for client."),
        ]

    monkeypatch.setattr(AdzunaProvider, "search", fake_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            company="Zoho",
            location_mode="anywhere_india",
            locations=[],
            work_modes=[],
            opportunity_type="Full-time",
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert len(calls) == 1
    assert calls[0]["company"] == "Zoho"
    assert body["total"] == 1
    assert body["jobs"][0]["id"] == "adzuna:zoho-1"
    assert body["jobs"][0]["company"] == "Zoho Corporation"
    assert "Zoho" in body["jobs"][0]["fit_reason"]


def test_company_search_no_genuine_vacancy_never_fabricates(monkeypatch):
    data = make_user_with_resume()

    def fake_search(_self, role, location, opportunity_type, company=None, country="in", page=1):
        return [
            listing(job_id="other-1", title="Software Developer", company="Random Agency", description="General vacancy."),
        ]

    monkeypatch.setattr(AdzunaProvider, "search", fake_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            company="Freshworks",
            location_mode="anywhere_india",
            locations=[],
            work_modes=[],
            opportunity_type="Full-time",
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["jobs"] == []


def test_state_city_search_and_cascading(monkeypatch):
    data = make_user_with_resume()
    calls = []

    def fake_search(_self, role, location, opportunity_type, company=None, country="in", page=1):
        calls.append(location)
        return [
            listing(job_id="tn-1", title="Software Developer Intern", location="Coimbatore, Tamil Nadu", description="Python internship in Coimbatore."),
        ]

    monkeypatch.setattr(AdzunaProvider, "search", fake_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            location_mode="state_city",
            state="Tamil Nadu",
            locations=["Coimbatore"],
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert calls == ["Coimbatore, Tamil Nadu"]
    assert response.json()["total"] == 1


def test_state_only_search(monkeypatch):
    data = make_user_with_resume()
    calls = []

    def fake_search(_self, role, location, opportunity_type, company=None, country="in", page=1):
        calls.append(location)
        return [
            listing(job_id="state-1", title="Software Developer Intern", location="Chennai, Tamil Nadu", description="Python role in Tamil Nadu."),
        ]

    monkeypatch.setattr(AdzunaProvider, "search", fake_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            location_mode="state_city",
            state="Tamil Nadu",
            locations=[],
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert calls == ["Tamil Nadu"]
    assert response.json()["total"] == 1


def test_international_search_queries_country(monkeypatch):
    data = make_user_with_resume()
    calls = []

    def fake_search(_self, role, location, opportunity_type, company=None, country="in", page=1):
        calls.append({"location": location, "country": country})
        return [
            listing(job_id="intl-1", title="Software Developer Intern", location="London, UK", description="Python internship in London."),
        ]

    monkeypatch.setattr(AdzunaProvider, "search", fake_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(
            data["resume_id"],
            location_mode="international",
            country="gb",
            locations=["London"],
        ),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert calls[0]["country"] == "gb"
    assert calls[0]["location"] == "London"
    assert response.json()["total"] == 1


def test_rate_limited_provider_returns_429(monkeypatch):
    from app.services.job_search.job_provider import JobProviderRateLimited

    data = make_user_with_resume()

    def fail_search(_self, *args, **kwargs):
        raise JobProviderRateLimited("Adzuna request limit reached.")

    monkeypatch.setattr(AdzunaProvider, "search", fail_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"]),
        headers=data["headers"],
    )
    assert response.status_code == 429
    assert "limit reached" in response.json()["detail"]


def test_pagination_page_passed_to_provider(monkeypatch):
    data = make_user_with_resume()
    calls = []

    def fake_search(_self, role, location, opportunity_type, company=None, country="in", page=1):
        calls.append(page)
        return []

    monkeypatch.setattr(AdzunaProvider, "search", fake_search)
    response = client.post(
        "/api/jobs/search",
        json=request_payload(data["resume_id"], page=2),
        headers=data["headers"],
    )
    assert response.status_code == 200
    assert calls == [2]
    assert response.json()["page"] == 2
