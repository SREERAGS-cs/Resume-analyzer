import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config.database import Base, get_db
from app.models.user import User
from app.routers import auth, users
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
    test_app.include_router(users.router)
    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        full_name="Jane Doe",
        email="jane.doe@example.com",
        password_hash=hash_password("OriginalPassword123"),
        phone="555-0199",
        location="San Francisco, CA",
        linkedin_url="https://linkedin.com/in/janedoe",
        github_url="https://github.com/janedoe",
        portfolio_url="https://janedoe.dev",
        education="B.S. in Computer Science, Stanford University",
        target_role="Senior Full-Stack Engineer",
        bio="Passionate software engineer building resilient web apps.",
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
        full_name="Bob Smith",
        email="bob.smith@example.com",
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


def test_get_profile_unauthenticated(client):
    response = client.get("/api/users/profile")
    assert response.status_code == 401


def test_get_profile_success(client, auth_headers, test_user):
    response = client.get("/api/users/profile", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user.id
    assert data["full_name"] == "Jane Doe"
    assert data["email"] == "jane.doe@example.com"
    assert data["phone"] == "555-0199"
    assert data["location"] == "San Francisco, CA"
    assert data["linkedin_url"] == "https://linkedin.com/in/janedoe"
    assert data["github_url"] == "https://github.com/janedoe"
    assert data["portfolio_url"] == "https://janedoe.dev"
    assert data["education"] == "B.S. in Computer Science, Stanford University"
    assert data["target_role"] == "Senior Full-Stack Engineer"
    assert data["bio"] == "Passionate software engineer building resilient web apps."
    assert "created_at" in data
    # Password hash must NEVER be present
    assert "password_hash" not in data
    assert "password" not in data


def test_get_me_alias(client, auth_headers, test_user):
    response = client.get("/api/users/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email


def test_update_profile_personal_and_professional(client, auth_headers):
    payload = {
        "full_name": "Jane Developer",
        "phone": "+1 415 555 2671",
        "location": "Oakland, CA",
        "linkedin_url": "linkedin.com/in/janedev",
        "github_url": "github.com/janedev",
        "portfolio_url": "janedev.tech",
        "education": "M.S. in Software Engineering, UC Berkeley",
        "target_role": "Staff Software Engineer",
        "bio": "Specializing in distributed systems and cloud platforms.",
    }
    response = client.put("/api/users/profile", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Jane Developer"
    assert data["phone"] == "+1 415 555 2671"
    assert data["location"] == "Oakland, CA"
    # URLs normalized with https://
    assert data["linkedin_url"] == "https://linkedin.com/in/janedev"
    assert data["github_url"] == "https://github.com/janedev"
    assert data["portfolio_url"] == "https://janedev.tech"
    assert data["education"] == "M.S. in Software Engineering, UC Berkeley"
    assert data["target_role"] == "Staff Software Engineer"
    assert data["bio"] == "Specializing in distributed systems and cloud platforms."

    # Verify persistence via fresh GET request
    get_res = client.get("/api/users/profile", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["full_name"] == "Jane Developer"


def test_update_profile_email_success(client, auth_headers):
    response = client.put(
        "/api/users/profile",
        json={"email": "new.jane@example.com"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["email"] == "new.jane@example.com"


def test_update_profile_duplicate_email_conflict(client, auth_headers, second_user):
    # Attempt to change Jane's email to Bob's email
    response = client.put(
        "/api/users/profile",
        json={"email": second_user.email},
        headers=auth_headers,
    )
    assert response.status_code == 409
    assert "already in use" in response.json()["detail"]


def test_update_profile_validation_errors(client, auth_headers):
    # Full name too short
    res1 = client.put("/api/users/profile", json={"full_name": "J"}, headers=auth_headers)
    assert res1.status_code == 422

    # Invalid email
    res2 = client.put("/api/users/profile", json={"email": "not-an-email"}, headers=auth_headers)
    assert res2.status_code == 422


def test_cross_user_isolation(client, test_user, second_user):
    token_bob = create_access_token({"sub": str(second_user.id)})
    headers_bob = {"Authorization": f"Bearer {token_bob}"}

    # Bob fetches his profile; should NOT see Jane's data
    res = client.get("/api/users/profile", headers=headers_bob)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == second_user.id
    assert data["email"] == second_user.email
    assert data["full_name"] == "Bob Smith"

    # Bob updates his profile; Jane's profile should remain intact
    update_res = client.put(
        "/api/users/profile",
        json={"target_role": "Data Scientist"},
        headers=headers_bob,
    )
    assert update_res.status_code == 200
    assert update_res.json()["target_role"] == "Data Scientist"

    # Verify Jane's target role didn't change
    token_jane = create_access_token({"sub": str(test_user.id)})
    jane_res = client.get("/api/users/profile", headers={"Authorization": f"Bearer {token_jane}"})
    assert jane_res.json()["target_role"] == "Senior Full-Stack Engineer"


def test_change_password_success(client, auth_headers, test_user):
    payload = {
        "current_password": "OriginalPassword123",
        "new_password": "NewSecretPassword2026",
        "confirm_password": "NewSecretPassword2026",
    }
    response = client.put("/api/users/change-password", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert "successfully" in response.json()["message"]

    # Verify user can login with new password
    login_res = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "NewSecretPassword2026"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # Old password no longer works
    old_login_res = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "OriginalPassword123"},
    )
    assert old_login_res.status_code == 401


def test_change_password_incorrect_current_password(client, auth_headers):
    payload = {
        "current_password": "WrongPassword123",
        "new_password": "NewSecretPassword2026",
        "confirm_password": "NewSecretPassword2026",
    }
    response = client.put("/api/users/change-password", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "Current password is incorrect" in response.json()["detail"]


def test_change_password_mismatched_confirmation(client, auth_headers):
    payload = {
        "current_password": "OriginalPassword123",
        "new_password": "NewSecretPassword2026",
        "confirm_password": "DifferentPassword2026",
    }
    response = client.put("/api/users/change-password", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "do not match" in response.json()["detail"]


def test_change_password_weak_new_password(client, auth_headers):
    payload = {
        "current_password": "OriginalPassword123",
        "new_password": "weak",
        "confirm_password": "weak",
    }
    response = client.put("/api/users/change-password", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_change_password_same_as_current(client, auth_headers):
    payload = {
        "current_password": "OriginalPassword123",
        "new_password": "OriginalPassword123",
        "confirm_password": "OriginalPassword123",
    }
    response = client.put("/api/users/change-password", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "cannot be the same" in response.json()["detail"]
