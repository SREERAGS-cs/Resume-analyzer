import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
from app.models.user import User
from app.models.user_settings import UserSettings
from app.routers import auth, settings
from app.utils.security import create_access_token, hash_password


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    test_app = FastAPI()
    test_app.include_router(auth.router)
    test_app.include_router(settings.router)
    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        full_name="Alice Developer",
        email="alice@example.com",
        password_hash=hash_password("AliceSecure123"),
        target_role="Frontend Engineer",
        location="Seattle, WA",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def second_user():
    db = TestingSessionLocal()
    user = User(
        full_name="Bob Engineer",
        email="bob@example.com",
        password_hash=hash_password("BobSecure123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


def test_get_settings_unauthenticated(client):
    response = client.get("/api/settings")
    assert response.status_code == 401


def test_get_settings_creates_default(client, auth_headers, test_user):
    response = client.get("/api/settings", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == test_user.id
    assert data["theme"] == "system"
    assert data["target_role"] == "Frontend Engineer"
    assert data["job_location"] == "Seattle, WA"
    assert data["work_mode"] == "Any"
    assert data["opportunity_type"] == "Full-time"
    assert data["email_job_alerts"] is True
    assert data["email_analysis_alerts"] is True
    assert data["email_security_alerts"] is True
    assert data["in_app_notifications"] is True


def test_update_settings_success(client, auth_headers):
    payload = {
        "theme": "dark",
        "target_role": "Lead Architect",
        "job_location": "Austin, TX",
        "work_mode": "Remote",
        "opportunity_type": "Contract",
        "email_job_alerts": False,
        "email_analysis_alerts": True,
        "email_security_alerts": True,
        "in_app_notifications": False,
    }
    response = client.put("/api/settings", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["theme"] == "dark"
    assert data["target_role"] == "Lead Architect"
    assert data["job_location"] == "Austin, TX"
    assert data["work_mode"] == "Remote"
    assert data["opportunity_type"] == "Contract"
    assert data["email_job_alerts"] is False
    assert data["in_app_notifications"] is False

    # Verify persistence via subsequent GET request
    get_res = client.get("/api/settings", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["theme"] == "dark"
    assert get_res.json()["work_mode"] == "Remote"


def test_update_settings_invalid_theme(client, auth_headers):
    response = client.put("/api/settings", json={"theme": "neon-purple"}, headers=auth_headers)
    assert response.status_code == 422


def test_update_settings_invalid_work_mode(client, auth_headers):
    response = client.put("/api/settings", json={"work_mode": "Everywhere"}, headers=auth_headers)
    assert response.status_code == 422


def test_update_settings_invalid_opportunity_type(client, auth_headers):
    response = client.put("/api/settings", json={"opportunity_type": "Gig"}, headers=auth_headers)
    assert response.status_code == 422


def test_cross_user_isolation(client, test_user, second_user):
    token_bob = create_access_token({"sub": str(second_user.id)})
    headers_bob = {"Authorization": f"Bearer {token_bob}"}

    # Bob updates his theme to light
    res = client.put("/api/settings", json={"theme": "light"}, headers=headers_bob)
    assert res.status_code == 200
    assert res.json()["theme"] == "light"

    # Alice's settings remain default/isolated
    token_alice = create_access_token({"sub": str(test_user.id)})
    alice_res = client.get("/api/settings", headers={"Authorization": f"Bearer {token_alice}"})
    assert alice_res.status_code == 200
    assert alice_res.json()["theme"] == "system"


def test_export_data(client, auth_headers, test_user):
    response = client.get("/api/settings/export-data", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "account_profile" in data
    assert data["account_profile"]["email"] == test_user.email
    assert "preferences" in data
    assert "resumes" in data
    assert "activity_logs" in data
    # Ensure sensitive hashes are not exported
    assert "password_hash" not in str(data)


def test_delete_account_incorrect_password(client, auth_headers):
    response = client.request(
        "DELETE",
        "/api/settings/account",
        json={"password": "WrongPassword", "confirmation": "DELETE"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()


def test_delete_account_invalid_confirmation(client, auth_headers):
    response = client.request(
        "DELETE",
        "/api/settings/account",
        json={"password": "AliceSecure123", "confirmation": "NO"},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_delete_account_success(client, auth_headers, test_user):
    response = client.request(
        "DELETE",
        "/api/settings/account",
        json={"password": "AliceSecure123", "confirmation": "DELETE"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()

    # User can no longer log in
    login_res = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "AliceSecure123"},
    )
    assert login_res.status_code == 401
