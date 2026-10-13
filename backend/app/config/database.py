from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config.settings import settings

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_ats_target_role_column() -> None:
    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("ats_analyses")}
        additions = {
            "target_role": "VARCHAR(120) NULL",
            "role_match_score": "INTEGER NULL",
            "intelligence_report": "JSON NULL",
            "role_skills_score": "INTEGER NULL",
            "project_experience_score": "INTEGER NULL",
            "qualifications_keywords_score": "INTEGER NULL",
            "content_quality_score": "INTEGER NULL",
            "ats_parsing_score": "INTEGER NULL",
        }
        for column_name, column_type in additions.items():
            if column_name not in columns:
                connection.execute(
                    text(f"ALTER TABLE ats_analyses ADD COLUMN {column_name} {column_type}")
                )


def ensure_user_profile_columns() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "users" not in inspector.get_table_names():
            return
        columns = {column["name"] for column in inspector.get_columns("users")}
        additions = {
            "phone": "VARCHAR(50) NULL",
            "location": "VARCHAR(150) NULL",
            "linkedin_url": "VARCHAR(255) NULL",
            "github_url": "VARCHAR(255) NULL",
            "portfolio_url": "VARCHAR(255) NULL",
            "education": "VARCHAR(255) NULL",
            "target_role": "VARCHAR(150) NULL",
            "bio": "TEXT NULL",
        }
        for column_name, column_type in additions.items():
            if column_name not in columns:
                connection.execute(
                    text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
                )


def ensure_user_settings_table() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "user_settings" not in inspector.get_table_names():
            if "user_settings" in Base.metadata.tables:
                Base.metadata.tables["user_settings"].create(bind=connection, checkfirst=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
