"""
Deterministic, rule-based resume analysis engine. No LLM, no ML model,
no external API — every score and message here traces back to an explicit
rule applied to the resume's own data. Never invents information.
"""

from app.ai.analysis_constants import ACTION_VERBS, MEASURABLE_PATTERN, EMAIL_PATTERN, CATEGORY_WEIGHTS


# ---------- normalization helpers ----------

def _safe_str(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_list(value) -> list:
    return value if isinstance(value, list) else []


def _safe_dict(value) -> dict:
    return value if isinstance(value, dict) else {}


def _extract_skills_list(skills) -> list[str]:
    if isinstance(skills, list):
        items = []
        for s in skills:
            if isinstance(s, str) and s.strip():
                items.append(s.strip())
            elif isinstance(s, dict):
                val = s.get("name") or s.get("skill") or s.get("title")
                if isinstance(val, str) and val.strip():
                    items.append(val.strip())
        return items
    if isinstance(skills, dict):
        items = []
        for v in skills.values():
            items.extend(_extract_skills_list(v))
        return items
    if isinstance(skills, str) and skills.strip():
        import re
        return [s.strip() for s in re.split(r"[,|\n•]", skills) if s.strip()]
    return []


def _has_action_verb(text: str) -> bool:
    lower = text.lower()
    return any(verb in lower for verb in ACTION_VERBS)


def _has_measurable_indicator(text: str) -> bool:
    return bool(MEASURABLE_PATTERN.search(text))


def _dedupe(items: list) -> list:
    return list(dict.fromkeys(items))


# ---------- per-category analyzers ----------

def analyze_personal_information(personal_info) -> dict:
    info = _safe_dict(personal_info)
    full_name = _safe_str(info.get("full_name"))
    email = _safe_str(info.get("email"))
    phone = _safe_str(info.get("phone"))
    recommended = {
        "location": _safe_str(info.get("location")),
        "linkedin": _safe_str(info.get("linkedin")),
        "github": _safe_str(info.get("github")),
        "portfolio": _safe_str(info.get("portfolio")),
    }

    score = 0
    strengths, improvements = [], []

    if full_name:
        score += 20
    else:
        improvements.append("Add your full name to the resume header.")

    if email and EMAIL_PATTERN.match(email):
        score += 20
    elif email:
        improvements.append("Double check that your email address is formatted correctly.")
    else:
        improvements.append("Add a contact email address.")

    if phone:
        score += 20
    else:
        improvements.append("Add a contact phone number.")

    present_recommended = [k for k, v in recommended.items() if v]
    score += len(present_recommended) * 10

    if full_name and email and phone:
        strengths.append("Contact information includes all essential details.")
    if len(present_recommended) >= 2:
        strengths.append("Resume includes helpful additional contact links.")
    else:
        if not recommended["linkedin"]:
            improvements.append("Consider adding a LinkedIn profile if you use one professionally.")
        if not recommended["github"]:
            improvements.append("Consider adding a GitHub profile to showcase your technical work.")

    return {"score": min(score, 100), "strengths": strengths, "improvements": _dedupe(improvements)}


def analyze_summary(summary, skills=None) -> dict:
    text = _safe_str(summary)
    word_count = len(text.split()) if text else 0
    skills = _extract_skills_list(skills)
    strengths, improvements = [], []

    if not text:
        score = 30
        improvements.append("Add a concise professional summary highlighting your background and goals.")
    elif word_count < 20:
        score = 55
        improvements.append("Expand the professional summary to better communicate your technical focus and career direction.")
    elif word_count <= 100:
        score = 85
        strengths.append("Professional summary is clear and within a readable length.")
    else:
        score = 70
        improvements.append("Consider tightening the professional summary; it may be longer than necessary.")

    if text and skills:
        lower_summary = text.lower()
        mentioned = [s for s in skills if isinstance(s, str) and s.lower() in lower_summary]
        if mentioned:
            score = min(score + 10, 100)
            strengths.append("Summary references relevant technical skills.")

    return {"score": score, "strengths": strengths, "improvements": _dedupe(improvements)}


def analyze_education(education) -> dict:
    entries = _safe_list(education)
    if not entries:
        return {"score": 40, "strengths": [], "improvements": ["Add at least one education entry."]}

    strengths, improvements = [], []
    complete_count = 0
    for entry in entries:
        entry = _safe_dict(entry)
        has_institution = bool(_safe_str(entry.get("institution")))
        has_degree = bool(_safe_str(entry.get("degree")))
        if has_institution and has_degree:
            complete_count += 1
        else:
            if not has_institution:
                improvements.append("Add the institution name for one of your education entries.")
            if not has_degree:
                improvements.append("Add the degree or qualification for one of your education entries.")

    completeness_ratio = complete_count / len(entries)
    score = int(60 + completeness_ratio * 40)

    if completeness_ratio == 1:
        strengths.append("Education details are complete and well structured.")

    return {"score": min(score, 100), "strengths": strengths, "improvements": _dedupe(improvements)}


def analyze_experience(experience) -> dict:
    entries = _safe_list(experience)
    if not entries:
        return {
            "score": 55,
            "strengths": [],
            "improvements": [
                "No professional experience has been added. Consider including internships, "
                "research, freelance work, volunteer technical work, or other relevant experience if applicable."
            ],
        }

    strengths, improvements = [], []
    quality_points = 0
    max_quality_points = len(entries) * 3

    for entry in entries:
        entry = _safe_dict(entry)
        description = _safe_str(entry.get("description"))
        responsibilities = [r for r in _safe_list(entry.get("responsibilities")) if isinstance(r, str)]
        combined_text = " ".join([description] + responsibilities).strip()

        if _safe_str(entry.get("company")) and _safe_str(entry.get("job_title")):
            quality_points += 1
        if combined_text and _has_action_verb(combined_text):
            quality_points += 1
        if combined_text and _has_measurable_indicator(combined_text):
            quality_points += 1
        elif combined_text:
            improvements.append("Where applicable, add measurable outcomes to your experience descriptions.")

    completeness_ratio = (quality_points / max_quality_points) if max_quality_points else 0
    score = int(50 + completeness_ratio * 50)

    if completeness_ratio >= 0.75:
        strengths.append("Experience descriptions use clear, action-oriented language.")

    return {"score": min(score, 100), "strengths": strengths, "improvements": _dedupe(improvements)}


def analyze_projects(projects) -> dict:
    entries = _safe_list(projects)
    if not entries:
        return {"score": 45, "strengths": [], "improvements": ["Add at least one project to showcase practical experience."]}

    strengths, improvements = [], []
    quality_points = 0
    max_quality_points = len(entries) * 3
    has_any_measurable = False
    has_any_technologies = False

    for entry in entries:
        entry = _safe_dict(entry)
        description = _safe_str(entry.get("description"))
        technologies = _safe_list(entry.get("technologies"))

        if _safe_str(entry.get("name")):
            quality_points += 1
        if technologies:
            quality_points += 1
            has_any_technologies = True
        if description and (_has_action_verb(description) or _has_measurable_indicator(description)):
            quality_points += 1
        if description and _has_measurable_indicator(description):
            has_any_measurable = True

    completeness_ratio = (quality_points / max_quality_points) if max_quality_points else 0
    score = int(50 + completeness_ratio * 50)

    if has_any_technologies:
        strengths.append("Projects demonstrate relevant technical skills.")
    if has_any_measurable:
        strengths.append("Some project descriptions include measurable outcomes.")
    else:
        improvements.append(
            "Consider adding measurable outcomes where applicable "
            "(e.g. performance improvements, users served, accuracy gains)."
        )

    return {"score": min(score, 100), "strengths": strengths, "improvements": _dedupe(improvements)}


def analyze_skills(skills) -> dict:
    items = _extract_skills_list(skills)
    count = len(items)
    strengths, improvements = [], []

    if count == 0:
        score = 20
        improvements.append("Add relevant technical and professional skills to your resume.")
    elif count <= 3:
        score = 55
        improvements.append("Consider listing additional relevant skills to strengthen skill coverage.")
    elif count <= 8:
        score = 80
        strengths.append("Skills section shows reasonable technical coverage.")
    else:
        score = 90
        strengths.append("Strong technical skill coverage.")

    return {"score": score, "strengths": strengths, "improvements": improvements}


def analyze_certifications(certifications) -> dict:
    entries = _safe_list(certifications)
    if not entries:
        return {
            "score": 70,
            "strengths": [],
            "improvements": ["No certifications are listed. If you have relevant certifications, consider adding them."],
        }

    strengths, improvements = [], []
    complete_count = sum(
        1 for e in entries
        if _safe_str(_safe_dict(e).get("name")) and _safe_str(_safe_dict(e).get("issuer"))
    )
    completeness_ratio = complete_count / len(entries)
    score = int(75 + completeness_ratio * 25)

    if completeness_ratio == 1:
        strengths.append("Relevant certifications are clearly presented.")
    else:
        improvements.append("Add the issuing organization for one or more certifications.")

    return {"score": min(score, 100), "strengths": strengths, "improvements": improvements}


def analyze_structure(personal_info, summary, education, experience, projects, skills, certifications) -> dict:
    info = _safe_dict(personal_info)
    has_contact = bool(_safe_str(info.get("full_name"))) and bool(_safe_str(info.get("email")))
    has_summary = bool(_safe_str(summary))
    has_education = bool(_safe_list(education))
    has_skills = bool(_extract_skills_list(skills))
    has_projects = bool(_safe_list(projects))
    has_experience = bool(_safe_list(experience))
    has_certifications = bool(_safe_list(certifications))

    core_sections = [has_contact, has_summary, has_education, has_skills, has_projects]
    core_score = (sum(core_sections) / len(core_sections)) * 85

    bonus = (8 if has_experience else 0) + (7 if has_certifications else 0)
    score = int(min(core_score + bonus, 100))

    strengths, improvements = [], []
    if all(core_sections):
        strengths.append("Resume has a clear and readable structure with all core sections present.")
    else:
        missing = []
        if not has_contact:
            missing.append("contact information")
        if not has_summary:
            missing.append("a professional summary")
        if not has_education:
            missing.append("education")
        if not has_skills:
            missing.append("skills")
        if not has_projects:
            missing.append("projects")
        improvements.append("Consider adding: " + ", ".join(missing) + ".")

    return {"score": score, "strengths": strengths, "improvements": improvements}


# ---------- composite scoring ----------

def calculate_content_score(summary, experience, projects, skills) -> int:
    text_blocks = [_safe_str(summary)]
    for entry in _safe_list(experience):
        entry = _safe_dict(entry)
        text_blocks.append(_safe_str(entry.get("description")))
        text_blocks.extend([r for r in _safe_list(entry.get("responsibilities")) if isinstance(r, str)])
    for entry in _safe_list(projects):
        text_blocks.append(_safe_str(_safe_dict(entry).get("description")))

    combined_text = " ".join(t for t in text_blocks if t)
    if not combined_text:
        return 40

    word_count = len(combined_text.split())
    lower_text = combined_text.lower()
    mentions_skills = any(isinstance(s, str) and s.lower() in lower_text for s in _extract_skills_list(skills))

    score = 45
    if word_count >= 40:
        score += 15
    if _has_action_verb(combined_text):
        score += 20
    if _has_measurable_indicator(combined_text):
        score += 15
    if mentions_skills:
        score += 5

    return min(score, 100)


def calculate_overall_score(scores: dict) -> int:
    weighted_sum = sum(scores.get(key, 0) * weight for key, weight in CATEGORY_WEIGHTS.items())
    return int(round(min(max(weighted_sum, 0), 100)))


# ---------- strengths / improvements / recommendations ----------

_RECOMMENDATION_TITLES = {
    "personal_information": "Complete Contact Information",
    "summary": "Improve Professional Summary",
    "education": "Strengthen Education Details",
    "experience": "Add Relevant Experience",
    "projects": "Strengthen Project Impact",
    "skills": "Expand Skill Coverage",
    "certifications": "Add Certifications",
    "structure": "Improve Resume Structure",
}


def generate_strengths(category_results: dict) -> list:
    strengths = []
    for result in category_results.values():
        strengths.extend(result["strengths"])
    return _dedupe(strengths)


def generate_improvements(category_results: dict) -> list:
    improvements = []
    for result in category_results.values():
        improvements.extend(result["improvements"])
    return _dedupe(improvements)


def generate_recommendations(category_results: dict, max_items: int = 5) -> list:
    candidates = []
    for name, result in category_results.items():
        if not result["improvements"]:
            continue
        score = result["score"]
        priority = "high" if score < 50 else "medium" if score < 75 else "low"
        candidates.append({
            "title": _RECOMMENDATION_TITLES.get(name, name.replace("_", " ").title()),
            "description": result["improvements"][0],
            "priority": priority,
            "_score": score,
        })

    candidates.sort(key=lambda c: c["_score"])
    return [{"title": c["title"], "description": c["description"], "priority": c["priority"]} for c in candidates[:max_items]]


# ---------- orchestrator ----------

def analyze_resume(resume_data: dict) -> dict:
    """
    resume_data is expected to mirror the ParsedResume model's shape:
    {personal_info, summary, skills, education, experience, projects, certifications}
    Never raises on missing/None/malformed sections — everything is
    treated as absent rather than crashing.
    """
    resume_data = _safe_dict(resume_data)
    personal_info = resume_data.get("personal_info")
    summary = resume_data.get("summary")
    skills = resume_data.get("skills")
    education = resume_data.get("education")
    experience = resume_data.get("experience")
    projects = resume_data.get("projects")
    certifications = resume_data.get("certifications")

    category_results = {
        "personal_information": analyze_personal_information(personal_info),
        "summary": analyze_summary(summary, skills),
        "education": analyze_education(education),
        "experience": analyze_experience(experience),
        "projects": analyze_projects(projects),
        "skills": analyze_skills(skills),
        "certifications": analyze_certifications(certifications),
        "structure": analyze_structure(personal_info, summary, education, experience, projects, skills, certifications),
    }

    content_score = calculate_content_score(summary, experience, projects, skills)

    overall_score = calculate_overall_score({
        "content": content_score,
        "structure": category_results["structure"]["score"],
        "skills": category_results["skills"]["score"],
        "summary": category_results["summary"]["score"],
        "education": category_results["education"]["score"],
        "experience": category_results["experience"]["score"],
        "projects": category_results["projects"]["score"],
        "certifications": category_results["certifications"]["score"],
    })

    return {
        "overall_score": overall_score,
        "content_score": content_score,
        "structure_score": category_results["structure"]["score"],
        "skills_score": category_results["skills"]["score"],
        "summary_score": category_results["summary"]["score"],
        "education_score": category_results["education"]["score"],
        "experience_score": category_results["experience"]["score"],
        "projects_score": category_results["projects"]["score"],
        "certifications_score": category_results["certifications"]["score"],
        "strengths": generate_strengths(category_results),
        "improvements": generate_improvements(category_results),
        "recommendations": generate_recommendations(category_results),
    }