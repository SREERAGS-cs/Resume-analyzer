from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.database import Base, engine
from app.models import user, resume, activity, parsed_resume, resume_draft, analysis  # noqa: F401
from app.routers import auth, resumes, dashboard, parsing, resume_drafts,resume_analysis

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(dashboard.router)
app.include_router(parsing.router)
app.include_router(resume_drafts.router)
app.include_router(resume_analysis.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}