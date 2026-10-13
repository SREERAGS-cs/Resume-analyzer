"""
Role-Aware ATS Analysis Engine for Resume IQ.

A 100% deterministic, evidence-based ATS scoring and diagnostic engine.
Does NOT accept arbitrary model-generated final scores as authoritative.
Calculates exactly one primary ATS score (0-100) from 6 normalized component scores:
  1. Target-role relevance and skills (30%)
  2. Relevant projects and experience (25%)
  3. Required qualifications and keywords (15%)
  4. Content quality and evidence (10%)
  5. Formatting, alignment and readability (15%)
  6. ATS parsing and machine readability (5%)

Inspects actual PDF/DOCX layouts on disk via document_layout_inspector.
If layout cannot be verified, it is marked as unverified without fabricating issues.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from app.ai.analysis_constants import ACTION_VERBS, MEASURABLE_PATTERN, EMAIL_PATTERN
from app.ai.resume_intelligence.role_profiles import get_role_profile
from app.parsers.document_layout_inspector import inspect_document_layout

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Initial Configurable ATS Component Weights (Total: 100%)
# ---------------------------------------------------------------------------
ATS_COMPONENT_WEIGHTS = {
    "role_skills": 0.30,
    "project_experience": 0.25,
    "qualifications_keywords": 0.15,
    "content_quality": 0.10,
    "formatting": 0.15,
    "ats_parsing": 0.05,
}

# Legacy weight mapping for backward compatibility
ATS_WEIGHTS = {
    "keyword": 0.35,
    "section": 0.20,
    "formatting": 0.20,
    "content": 0.25,
}

# Common technology alias normalization mapping
TECH_ALIASES: dict[str, str] = {
    "react": "React.js",
    "reactjs": "React.js",
    "react.js": "React.js",
    "react js": "React.js",
    "react native": "React Native",
    "reactnative": "React Native",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node js": "Node.js",
    "express": "Express.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    "fastapi": "FastAPI",
    "fast api": "FastAPI",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "next": "Next.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "angular": "Angular",
    "angularjs": "Angular",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "csharp": "C#",
    "python": "Python",
    "java": "Java",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "swiftui": "SwiftUI",
    "dart": "Dart",
    "flutter": "Flutter",
    "android": "Android",
    "android studio": "Android Studio",
    "xcode": "Xcode",
    "fastlane": "Fastlane",
    "realm": "Realm",
    "firebase": "Firebase",
    "c": "C",
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "opencv": "OpenCV",
    "numpy": "NumPy",
    "pandas": "Pandas",
    "scikit-learn": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "mysql": "MySQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mongodb": "MongoDB",
    "sqlite": "SQLite",
    "redis": "Redis",
    "graphql": "GraphQL",
    "rest api": "REST API",
    "restful api": "REST API",
    "blockchain": "Blockchain",
    "linux": "Linux",
    "django": "Django",
    "flask": "Flask",
    "spring": "Spring",
    "spring boot": "Spring Boot",
}


# Generic cross-role terms that should NOT be treated as proof of specialized role domain
GENERIC_CROSS_ROLE_TERMS: set[str] = {
    "git", "github", "gitlab", "jira", "agile", "scrum", "linux", "bash",
    "json", "sql", "testing", "debugging", "programming"
}

# Ecosystem frameworks mapped to primary languages
LANGUAGE_FRAMEWORKS_MAP: dict[str, list[str]] = {
    "python": ["fastapi", "django", "flask", "tornado"],
    "java": ["spring", "spring boot", "hibernate", "quarkus"],
    "javascript": ["node.js", "express.js", "react", "next.js", "vue", "angular"],
    "typescript": ["node.js", "express.js", "react", "next.js", "nest.js", "angular"],
    "c#": [".net", "asp.net", "entity framework"],
    "kotlin": ["android", "jetpack compose"],
    "swift": ["swiftui", "uikit", "ios"],
    "dart": ["flutter"],
}


CONCEPT_SYNONYMS: dict[str, list[str]] = {
    "software design": ["software development", "software engineering", "software architecture", "software design"],
    "programming": ["programming", "developer", "software development", "software engineer", "coding"],
    "testing": ["testing", "unit test", "automated test", "test suite", "qa"],
    "debugging": ["debugging", "troubleshooting", "debug"],
    "object-oriented design": ["object-oriented", "oop", "ood"],
    "mobile application development": ["mobile development", "mobile application", "mobile app", "mobile developer"],
    "device-aware interface design": ["device-aware", "responsive interface", "mobile ui", "device sensors"],
    "offline-first design": ["offline-first", "offline sync", "local storage", "sqlite sync"],
    "app deployment": ["store deployment", "play store", "app store", "deployment", "deploy"],
    "statistical analysis": ["statistical analysis", "statistics", "statistical modeling"],
    "predictive modeling": ["predictive modeling", "machine learning", "predictive model"],
    "model evaluation": ["model evaluation", "model performance", "validation metrics"],
}


# ---------------------------------------------------------------------------
# Helper String and Term Utilities
# ---------------------------------------------------------------------------

def _safe_str(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    return str(val).strip()


def _safe_list(val: Any) -> list:
    return val if isinstance(val, list) else []


def _safe_dict(val: Any) -> dict:
    return val if isinstance(val, dict) else {}


def _normalize_tech(word: str) -> Optional[str]:
    clean = word.strip().strip(",;:.-")
    if not clean or len(clean) < 2:
        return None
    lower = clean.lower()
    if lower in TECH_ALIASES:
        return TECH_ALIASES[lower]
    if clean.isupper() and len(clean) <= 10:
        return clean
    return None


def _term_matches(term: str, text: str) -> bool:
    clean = term.strip().lower()
    if not clean:
        return False
    candidates = CONCEPT_SYNONYMS.get(clean, [clean])
    for cand in candidates:
        escaped = re.escape(cand)
        escaped = re.sub(r"\\\s+", r"\\s+", escaped)
        pattern = rf"(?<![A-Za-z0-9_#+.-]){escaped}(?![A-Za-z0-9_#+.-])"
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _extract_all_text(resume_data: dict) -> str:
    """Concatenate all textual content from structured resume data."""
    parts: list[str] = []
    parts.append(_safe_str(resume_data.get("raw_text")))
    parts.append(_safe_str(resume_data.get("header_block")))
    parts.append(_safe_str(resume_data.get("summary")))

    skills_raw = resume_data.get("skills_raw")
    if skills_raw:
        parts.append(_safe_str(skills_raw))
    for s in _safe_list(resume_data.get("skills")):
        parts.append(_safe_str(s))

    for p in _safe_list(resume_data.get("projects")):
        pdict = _safe_dict(p)
        parts.append(_safe_str(pdict.get("name")))
        parts.append(_safe_str(pdict.get("description")))
        parts.extend([_safe_str(t) for t in _safe_list(pdict.get("technologies"))])

    for exp in _safe_list(resume_data.get("experience")):
        edict = _safe_dict(exp)
        parts.append(_safe_str(edict.get("job_title")))
        parts.append(_safe_str(edict.get("company")))
        parts.append(_safe_str(edict.get("description")))
        parts.extend([_safe_str(r) for r in _safe_list(edict.get("responsibilities"))])

    for edu in _safe_list(resume_data.get("education")):
        eddict = _safe_dict(edu)
        parts.append(_safe_str(eddict.get("degree")))
        parts.append(_safe_str(eddict.get("institution")))

    for cert in _safe_list(resume_data.get("certifications")):
        cdict = _safe_dict(cert)
        parts.append(_safe_str(cdict.get("name")))
        parts.append(_safe_str(cdict.get("issuer")))

    for ach in _safe_list(resume_data.get("achievements")):
        adict = _safe_dict(ach)
        parts.append(_safe_str(adict.get("title")))
        parts.append(_safe_str(adict.get("description")))

    return "\n".join(p for p in parts if p)


# ---------------------------------------------------------------------------
# Rule-Based ATS Analyzer Class
# ---------------------------------------------------------------------------

class RuleBasedATSAnalyzer:
    """
    Deterministic, role-aware ATS analysis engine.
    Calculates primary ATS score strictly from the 6 normalized component scores.
    """

    def analyze(
        self,
        resume_data: Optional[dict] = None,
        parser_metadata: Optional[dict] = None,
        target_role: Optional[str] = None,
        file_path: Optional[str] = None,
    ) -> dict:
        data = _safe_dict(resume_data)
        meta = _safe_dict(parser_metadata)
        full_text = _extract_all_text(data)

        # 1. Target-role relevance and skills (30%)
        role_profile = get_role_profile(target_role) if target_role else None
        role_skills_res = self._analyze_role_skills(data, full_text, role_profile, target_role)

        # 2. Relevant projects and experience (25%)
        project_exp_res = self._analyze_projects_experience(data, full_text, role_profile, target_role)

        # 3. Required qualifications and keywords (15%)
        qual_kw_res = self._analyze_qualifications_keywords(data, full_text, role_profile, target_role)

        # 4. Content quality and evidence (10%)
        content_res = self._analyze_content_quality(data, full_text)

        # 5. Formatting, alignment and readability (15%) & 6. ATS parsing (5%)
        formatting_res, parsing_res = self._analyze_formatting_and_parsing(
            file_path=file_path,
            meta=meta,
            full_text=full_text,
        )

        role_skills_score = role_skills_res["score"]
        project_experience_score = project_exp_res["score"]
        qualifications_keywords_score = qual_kw_res["score"]
        content_quality_score = content_res["score"]
        formatting_score = formatting_res["score"]
        ats_parsing_score = parsing_res["score"]

        # Calculate exact weighted final score
        weighted_score = (
            role_skills_score * ATS_COMPONENT_WEIGHTS["role_skills"]
            + project_experience_score * ATS_COMPONENT_WEIGHTS["project_experience"]
            + qualifications_keywords_score * ATS_COMPONENT_WEIGHTS["qualifications_keywords"]
            + content_quality_score * ATS_COMPONENT_WEIGHTS["content_quality"]
            + formatting_score * ATS_COMPONENT_WEIGHTS["formatting"]
            + ats_parsing_score * ATS_COMPONENT_WEIGHTS["ats_parsing"]
        )
        ats_score = max(0, min(100, int(round(weighted_score))))

        all_issues = (
            role_skills_res["issues"]
            + project_exp_res["issues"]
            + qual_kw_res["issues"]
            + content_res["issues"]
            + formatting_res["issues"]
            + parsing_res["issues"]
        )

        all_recommendations = self._generate_recommendations(all_issues)

        return {
            "ats_score": ats_score,
            "role_skills_score": role_skills_score,
            "project_experience_score": project_experience_score,
            "qualifications_keywords_score": qualifications_keywords_score,
            "content_quality_score": content_quality_score,
            "formatting_score": formatting_score,
            "ats_parsing_score": ats_parsing_score,
            # Legacy score keys for backwards compatibility
            "keyword_score": qualifications_keywords_score,
            "section_score": role_skills_score,
            "content_score": content_quality_score,
            "detected_keywords": qual_kw_res["detected_keywords"],
            "missing_keywords": qual_kw_res["missing_keywords"],
            "matched_requirements": role_skills_res["matched_requirements"],
            "missing_requirements": role_skills_res["missing_requirements"],
            "partially_matched_requirements": role_skills_res["partially_matched_requirements"],
            "issues": all_issues,
            "formatting_findings": formatting_res["issues"] + parsing_res["issues"],
            "content_findings": content_res["issues"],
            "recommendations": all_recommendations,
            "document_inspection": formatting_res.get("details", {}),
        }

    # -----------------------------------------------------------------------
    # Component 1: Target-Role Relevance and Skills (30%)
    # -----------------------------------------------------------------------
    def _analyze_role_skills(
        self,
        data: dict,
        full_text: str,
        role_profile: Optional[dict],
        target_role: Optional[str],
    ) -> dict:
        issues: list[dict] = []
        matched_reqs: list[str] = []
        missing_reqs: list[str] = []
        partially_matched_reqs: list[str] = []

        # If no target role is selected, evaluate basic structure and general skill foundation
        if not target_role or not role_profile:
            skills = _safe_list(data.get("skills")) or _safe_str(data.get("skills_raw"))
            education = _safe_list(data.get("education"))
            info = _safe_dict(data.get("personal_info"))
            score = 0
            if info.get("full_name"):
                score += 10
            else:
                issues.append({
                    "type": "contact",
                    "severity": "high",
                    "message": "Full name was not detected in the contact header.",
                    "section": "Contact Information",
                    "element": "Full Name",
                    "specific_issue": "Missing full candidate name in header.",
                    "effect": "Recruiters cannot identify candidate in ATS search.",
                    "recommendation": "Add your full name clearly at the top.",
                    "inspection_method": "Contact header inspection",
                })
            if info.get("email"):
                score += 10
            else:
                issues.append({
                    "type": "contact",
                    "severity": "high",
                    "message": "Contact email address was not detected.",
                    "section": "Contact Information",
                    "element": "Email",
                    "specific_issue": "Missing contact email.",
                    "effect": "Automated ATS interview notifications cannot be sent.",
                    "recommendation": "Add a valid email address.",
                    "inspection_method": "Contact header inspection",
                })
            if info.get("phone"):
                score += 10
            else:
                issues.append({
                    "type": "contact",
                    "severity": "medium",
                    "message": "Contact phone number was not detected.",
                    "section": "Contact Information",
                    "element": "Phone Number",
                    "specific_issue": "Missing contact phone number.",
                    "effect": "Recruiters cannot quickly place a screening phone call.",
                    "recommendation": "Add a valid contact phone number so recruiters can reach you.",
                    "inspection_method": "Contact header inspection",
                })
            if education:
                score += 20
            if skills:
                score += 50
            return {
                "score": max(0, min(100, score)),
                "matched_requirements": ["General Technical Foundation"] if skills else [],
                "missing_requirements": [] if skills else ["Technical Skills Section"],
                "partially_matched_requirements": [],
                "issues": issues,
            }

        categories = role_profile.get("categories", {})
        core_skills = categories.get("core_skills", [])
        frameworks = list(categories.get("frameworks", []))
        languages = categories.get("languages", [])

        # Expand frameworks with recognized ecosystem frameworks if language is in profile
        expanded_frameworks = list(frameworks)
        for lang in languages:
            lang_key = lang.lower()
            if lang_key in LANGUAGE_FRAMEWORKS_MAP:
                for fw in LANGUAGE_FRAMEWORKS_MAP[lang_key]:
                    if _term_matches(fw, full_text) and fw not in expanded_frameworks:
                        expanded_frameworks.append(fw)

        # Essential items are the role's frameworks and core skills
        essential_items = expanded_frameworks + core_skills
        if not essential_items:
            role_words = [w for w in re.split(r"[\s/]+", target_role) if len(w) > 2]
            essential_items = role_words

        # Check matched essential requirements
        for item in essential_items:
            if _term_matches(item, full_text):
                matched_reqs.append(item)
            else:
                missing_reqs.append(item)

        # Check transferable languages / skills
        for lang in languages:
            if _term_matches(lang, full_text):
                if lang not in matched_reqs:
                    partially_matched_reqs.append(lang)

        # Additional transferable skill checks (e.g. OOP, databases, REST APIs)
        transferable_pool = ["Git", "SQL", "REST API", "Docker", "Database", "OOP", "Testing"]
        for t in transferable_pool:
            if _term_matches(t, full_text) and t not in partially_matched_reqs and t not in matched_reqs:
                partially_matched_reqs.append(t)

        # Scoring:
        # If candidate has ZERO essential skills for this target role:
        # e.g. SDE resume with 0 mobile frameworks (no Kotlin, Swift, Flutter, Android, React Native)
        # The absence of essential role requirements must materially lower the score!
        if len(matched_reqs) == 0:
            # Transferable skills alone cannot award more than 15 points
            transferable_points = min(15, len(partially_matched_reqs) * 3)
            score = transferable_points
            issues.append({
                "type": "role_relevance",
                "severity": "high",
                "message": f"Resume does not demonstrate essential {target_role} skills or frameworks.",
                "section": "Target-Role Relevance",
                "element": "Essential Role Skills",
                "specific_issue": f"None of the required essential skills/frameworks ({', '.join(essential_items[:4])}) were detected.",
                "effect": f"ATS filters and recruiters for {target_role} positions will immediately screen out the resume due to missing primary tech stack.",
                "recommendation": f"Add concrete projects and hands-on experience using {', '.join(essential_items[:3])}.",
                "inspection_method": "Target-role requirement matrix verification",
            })
        else:
            # Essential skills match ratio
            ratio = len(matched_reqs) / max(1, min(4, len(essential_items)))
            essential_points = min(75, int(round(ratio * 75)))
            transferable_points = min(25, len(partially_matched_reqs) * 5)
            score = max(35, min(100, essential_points + transferable_points))

            if len(missing_reqs) > 2:
                issues.append({
                    "type": "role_relevance",
                    "severity": "medium",
                    "message": f"Missing key {target_role} proficiencies: {', '.join(missing_reqs[:3])}.",
                    "section": "Target-Role Relevance",
                    "element": "Missing Proficiencies",
                    "specific_issue": f"Key frameworks ({', '.join(missing_reqs[:3])}) were not verified in the resume.",
                    "effect": "Leaves technical capability unverified against competitive applicants.",
                    "recommendation": f"Demonstrate proficiency in {missing_reqs[0]} through coursework or project examples.",
                    "inspection_method": "Target-role requirement matrix verification",
                })

        return {
            "score": score,
            "matched_requirements": matched_reqs,
            "missing_requirements": missing_reqs,
            "partially_matched_requirements": partially_matched_reqs,
            "issues": issues,
        }

    # -----------------------------------------------------------------------
    # Component 2: Relevant Projects and Experience (25%)
    # -----------------------------------------------------------------------
    def _analyze_projects_experience(
        self,
        data: dict,
        full_text: str,
        role_profile: Optional[dict],
        target_role: Optional[str],
    ) -> dict:
        issues: list[dict] = []
        projects = _safe_list(data.get("projects"))
        experience = _safe_list(data.get("experience"))

        if not projects and not experience:
            issues.append({
                "type": "section",
                "severity": "high",
                "message": "Neither projects nor professional experience entries were detected.",
                "section": "Relevant Projects & Experience",
                "element": "Project / Work History",
                "specific_issue": "Resume has no projects or experience sections.",
                "effect": "Candidate has zero evidence of practical implementation.",
                "recommendation": "Add a Projects or Work Experience section showcasing your hands-on technical work.",
                "inspection_method": "Structured section extraction",
            })
            return {"score": 0, "issues": issues}

        # If no target role specified, student-friendly general project check
        if not target_role or not role_profile:
            has_entries = len(projects) + len(experience)
            score = 65 if has_entries == 1 else 85 if has_entries == 2 else 95
            return {"score": score, "issues": issues}

        categories = role_profile.get("categories", {})
        raw_keywords = (
            categories.get("core_skills", [])
            + categories.get("frameworks", [])
            + categories.get("project_characteristics", [])
            + categories.get("responsibilities", [])
            + categories.get("tools", [])
        )
        # Include specialized role languages (e.g., Kotlin, Swift, Dart)
        role_specific_languages = [
            l for l in categories.get("languages", [])
            if l.lower() in {"kotlin", "swift", "dart", "solidity", "rust", "r"}
        ]
        raw_keywords.extend(role_specific_languages)

        role_keywords = [
            kw for kw in raw_keywords
            if kw.lower() not in GENERIC_CROSS_ROLE_TERMS
        ]
        for lang in categories.get("languages", []):
            lang_key = lang.lower()
            if lang_key in LANGUAGE_FRAMEWORKS_MAP:
                role_keywords.extend(LANGUAGE_FRAMEWORKS_MAP[lang_key])

        if not role_keywords:
            role_keywords = [w for w in re.split(r"[\s/]+", target_role) if len(w) > 2]

        role_relevant_projects = 0
        for p in projects:
            pdict = _safe_dict(p)
            p_text = f"{pdict.get('name', '')} {pdict.get('description', '')} {' '.join(_safe_list(pdict.get('technologies')))}"
            if any(_term_matches(kw, p_text) for kw in role_keywords):
                role_relevant_projects += 1

        role_relevant_exp = 0
        for exp in experience:
            edict = _safe_dict(exp)
            e_text = f"{edict.get('job_title', '')} {edict.get('company', '')} {edict.get('description', '')} {' '.join(_safe_list(edict.get('responsibilities')))}"
            if any(_term_matches(kw, e_text) for kw in role_keywords):
                role_relevant_exp += 1

        total_relevant = role_relevant_projects + role_relevant_exp

        # Evaluate project/experience domain relevance:
        # A resume with projects in completely unrelated domains (e.g. SDE web app for Mobile Developer)
        # must NOT receive high project relevance points!
        if total_relevant == 0:
            # Baseline 15-20 pts for having general projects/experience, but penalized for complete irrelevance
            score = 15
            issues.append({
                "type": "project_relevance",
                "severity": "high",
                "message": f"Projects and experience do not demonstrate {target_role} practical work.",
                "section": "Relevant Projects & Experience",
                "element": "Project Domain Alignment",
                "specific_issue": f"None of the {len(projects)} project(s) or {len(experience)} experience entries demonstrate {target_role} work.",
                "effect": "Recruiters cannot verify your ability to deliver software in this target domain.",
                "recommendation": f"Build and include at least one dedicated {target_role} project featuring relevant architecture.",
                "inspection_method": "Semantic project and experience alignment scan",
            })
        elif total_relevant == 1:
            score = 60
            issues.append({
                "type": "project_relevance",
                "severity": "medium",
                "message": f"Only 1 project/experience entry demonstrates {target_role} alignment.",
                "section": "Relevant Projects & Experience",
                "element": "Domain Depth",
                "specific_issue": f"Only one practical entry aligns with {target_role}.",
                "effect": "Limited evidence of deep domain experience compared to specialized candidates.",
                "recommendation": f"Add a second project emphasizing {target_role} best practices and metrics.",
                "inspection_method": "Semantic project and experience alignment scan",
            })
        elif total_relevant == 2:
            score = 85
        else:
            score = 95

        return {"score": min(100, score), "issues": issues}

    # -----------------------------------------------------------------------
    # Component 3: Required Qualifications and Keywords (15%)
    # -----------------------------------------------------------------------
    def _analyze_qualifications_keywords(
        self,
        data: dict,
        full_text: str,
        role_profile: Optional[dict],
        target_role: Optional[str],
    ) -> dict:
        issues: list[dict] = []
        detected_keywords: set[str] = set()
        lower_full = full_text.lower()

        # Scan text for known tech aliases
        for alias, canonical in TECH_ALIASES.items():
            if _term_matches(alias, lower_full):
                detected_keywords.add(canonical)

        # Also scan explicit skills list
        for skill in _safe_list(data.get("skills")):
            norm = _normalize_tech(_safe_str(skill))
            if norm:
                detected_keywords.add(norm)

        sorted_keywords = sorted(detected_keywords)

        if not target_role or not role_profile:
            # Legacy general keyword scoring
            count = len(sorted_keywords)
            if count == 0:
                score = 15
                issues.append({
                    "type": "keyword",
                    "severity": "high",
                    "message": "No recognized technical keywords were detected.",
                    "section": "Required Qualifications & Keywords",
                    "element": "Technical Keywords",
                    "specific_issue": "Zero technical keywords detected.",
                    "effect": "Fails basic ATS technical filter queries.",
                    "recommendation": "Add specific technical tools and languages.",
                    "inspection_method": "Keyword alias verification",
                })
            elif count <= 2:
                score = 45
            elif count <= 5:
                score = 75
            elif count <= 9:
                score = 88
            else:
                score = 95
            return {
                "score": score,
                "detected_keywords": sorted_keywords,
                "missing_keywords": [],
                "issues": issues,
            }

        categories = role_profile.get("categories", {})
        role_tools = categories.get("tools", [])
        role_concepts = categories.get("concepts", [])
        role_databases = categories.get("databases", [])

        raw_target_kws = role_tools + role_concepts + role_databases
        role_target_keywords = [
            kw for kw in raw_target_kws
            if kw.lower() not in GENERIC_CROSS_ROLE_TERMS
        ]
        matched_role_kws = [kw for kw in role_target_keywords if _term_matches(kw, full_text)]
        missing_role_kws = [kw for kw in role_target_keywords if not _term_matches(kw, full_text)]

        # CRITICAL RULE:
        # Generic keywords (Git, SQL, etc.) can award at most 15 points.
        # The remaining 85 points are strictly driven by role-specific tools, databases, and concepts!
        generic_points = min(15, len(sorted_keywords) * 3)

        if len(matched_role_kws) == 0:
            # Absence of role-specific keywords caps score at generic points
            score = generic_points
            issues.append({
                "type": "keyword",
                "severity": "medium",
                "message": f"Resume lacks role-specific tools or concepts for {target_role}.",
                "section": "Required Qualifications & Keywords",
                "element": "Role Tools & Concepts",
                "specific_issue": f"No specialized tools/concepts ({', '.join(role_target_keywords[:4])}) were detected.",
                "effect": "Generic keywords cannot compensate for missing role-specific tooling in ATS evaluations.",
                "recommendation": f"Incorporate industry-standard tools for {target_role} (e.g. {', '.join(role_target_keywords[:3])}).",
                "inspection_method": "Role qualification dictionary comparison",
            })
        else:
            role_points = min(85, int(round((len(matched_role_kws) / max(1, min(4, len(role_target_keywords)))) * 85)))
            score = max(25, min(100, generic_points + role_points))

        return {
            "score": score,
            "detected_keywords": sorted_keywords,
            "missing_keywords": missing_role_kws[:6],
            "issues": issues,
        }

    # -----------------------------------------------------------------------
    # Component 4: Content Quality and Evidence (10%)
    # -----------------------------------------------------------------------
    def _analyze_content_quality(self, data: dict, full_text: str) -> dict:
        score = 20
        issues: list[dict] = []
        lower_text = full_text.lower()

        # 1. Action Verbs check (30 pts max)
        verbs_found = [verb for verb in ACTION_VERBS if _term_matches(verb, lower_text)]
        if len(verbs_found) >= 3:
            score += 30
        elif len(verbs_found) >= 1:
            score += 15
        else:
            issues.append({
                "type": "content",
                "severity": "low",
                "message": "Project or experience descriptions contain few strong action verbs.",
                "section": "Content Quality & Evidence",
                "element": "Action Verbs",
                "specific_issue": "Descriptions lack strong action verbs like engineered, developed, or optimized.",
                "effect": "Bullet points sound passive rather than achievement-driven.",
                "recommendation": "Begin bullet points with decisive action verbs (e.g., Architected, Implemented, Streamlined).",
                "inspection_method": "Action verb lexicon matching",
            })

        # 2. Measurable Outcomes check (35 pts max)
        has_metrics = bool(MEASURABLE_PATTERN.search(full_text))
        if has_metrics:
            score += 35
        else:
            issues.append({
                "type": "content",
                "severity": "medium",
                "message": "Descriptions lack measurable outcomes or metrics.",
                "section": "Content Quality & Evidence",
                "element": "Quantifiable Metrics",
                "specific_issue": "No measurable metrics (percentages, user counts, latency reductions) detected.",
                "effect": "Recruiters cannot gauge the scale, impact, or business value of your accomplishments.",
                "recommendation": "Add quantifiable results (e.g. 'reduced latency by 40%', 'supported 1,000+ active users').",
                "inspection_method": "Quantifiable metric regex analysis",
            })

        # 3. Summary length check (15 pts max)
        summary = _safe_str(data.get("summary"))
        summary_words = len(summary.split()) if summary else 0
        if 8 <= summary_words <= 120:
            score += 15
        elif summary_words == 0:
            issues.append({
                "type": "section",
                "severity": "low",
                "message": "Professional summary or profile objective is missing.",
                "section": "Content Quality & Evidence",
                "element": "Professional Summary",
                "specific_issue": "No concise summary statement detected at the top of the resume.",
                "effect": "Recruiters miss a quick 2-3 sentence overview of your career trajectory.",
                "recommendation": "Add a brief 2-3 sentence summary outlining your core strengths and career focus.",
                "inspection_method": "Section presence inspection",
            })

        # 4. Text repetition check
        lines = [l.strip() for l in full_text.split("\n") if len(l.strip()) > 30]
        duplicates = [l for l in set(lines) if lines.count(l) >= 3]
        if duplicates:
            score -= 10
            issues.append({
                "type": "content",
                "severity": "medium",
                "message": "Identical sentences or project descriptions are repeated unnecessarily.",
                "section": "Content Quality & Evidence",
                "element": "Repetitive Content",
                "specific_issue": "Duplicated bullet points found across sections.",
                "effect": "Wastes resume real estate and signals careless editing.",
                "recommendation": "Ensure each bullet point conveys unique accomplishments.",
                "inspection_method": "N-gram and exact sentence duplication scan",
            })

        return {"score": max(0, min(100, score)), "issues": issues}

    # -----------------------------------------------------------------------
    # Component 5: Formatting (15%) & Component 6: ATS Parsing (5%)
    # -----------------------------------------------------------------------
    def _analyze_formatting_and_parsing(
        self,
        file_path: Optional[str],
        meta: dict,
        full_text: str,
    ) -> tuple[dict, dict]:
        # Call document layout inspector on actual PDF/DOCX if available
        layout_res = inspect_document_layout(file_path)

        if layout_res.get("verified"):
            formatting_score = layout_res.get("formatting_score", 85)
            ats_parsing_score = layout_res.get("ats_parsing_score", 90)
            raw_findings = layout_res.get("findings", [])

            formatting_issues = []
            parsing_issues = []
            for f in raw_findings:
                issue_item = {
                    "type": "formatting" if f.get("section") != "ATS Parsing & Extractability" else "parsing",
                    "severity": f.get("severity", "medium"),
                    "message": f.get("specific_issue", "Layout formatting observation"),
                    "section": f.get("section", "Document Layout"),
                    "element": f.get("element", "Layout"),
                    "specific_issue": f.get("specific_issue", ""),
                    "effect": f.get("effect", ""),
                    "recommendation": f.get("recommendation", ""),
                    "inspection_method": f.get("inspection_method", "Document-level inspection"),
                }
                if f.get("section") == "ATS Parsing & Extractability":
                    parsing_issues.append(issue_item)
                else:
                    formatting_issues.append(issue_item)

            return (
                {"score": formatting_score, "issues": formatting_issues, "details": layout_res},
                {"score": ats_parsing_score, "issues": parsing_issues},
            )

        # Fallback when file cannot be accessed or verified on disk:
        # Mark as unverified rather than inventing issues!
        score_format = 85
        score_parse = 85
        issues_format: list[dict] = []
        issues_parse: list[dict] = []

        # Check for scanned PDF / OCR metadata flag if provided
        if meta.get("status") == "ocr_required" or len(full_text.strip()) < 30:
            score_format = 40
            score_parse = 30
            issues_parse.append({
                "type": "formatting",
                "severity": "high",
                "message": "Document appears to be scanned or image-based with very low extractable text.",
                "section": "ATS Parsing & Extractability",
                "element": "OCR & Machine Readability",
                "specific_issue": "Document is image-based or lacks a clean text layer.",
                "effect": "Standard ATS parsers fail to extract textual data from scanned PDFs.",
                "recommendation": "Re-export resume as a digital PDF from Word, Docs, or ResumeIQ Builder.",
                "inspection_method": "Parser metadata status check",
            })

        # Check for multi-column metadata if passed in parser_metadata
        blocks = meta.get("blocks", [])
        if blocks and len(blocks) >= 6:
            page_width = meta.get("page_width", 595.0)
            x0_body = []
            for b in blocks:
                x0 = getattr(b, "x0", None) if not isinstance(b, dict) else b.get("x0")
                x1 = getattr(b, "x1", None) if not isinstance(b, dict) else b.get("x1")
                if x0 is not None and x1 is not None and (x1 - x0) < page_width * 0.60:
                    x0_body.append(x0)
            left_cluster = [x for x in x0_body if x < page_width * 0.45]
            right_cluster = [x for x in x0_body if x >= page_width * 0.45]
            if len(left_cluster) >= 3 and len(right_cluster) >= 3:
                score_format -= 5
                issues_format.append({
                    "type": "formatting",
                    "severity": "low",
                    "message": "Multiple text columns were detected. Verify that the extracted reading order flows logically.",
                    "section": "Layout & Structure",
                    "element": "Multi-Column Layout",
                    "specific_issue": "Multi-column layout structure detected.",
                    "effect": "Multi-column structures may cause some older ATS engines to interleave text across columns.",
                    "recommendation": "Consider a clean single-column layout for maximum ATS compatibility.",
                    "inspection_method": "Parser block coordinate cluster analysis",
                })

        # Add explicit unverified layout note if document file path is missing
        if not file_path:
            issues_format.append({
                "type": "formatting",
                "severity": "low",
                "message": "Document file was not accessible for deep layout coordinate inspection; scores estimated from text.",
                "section": "Document Layout",
                "element": "Physical Document Inspection",
                "specific_issue": "Physical file is unverified on disk.",
                "effect": "Visual layout and exact font hierarchy could not be directly inspected.",
                "recommendation": "Upload the original PDF or DOCX file to enable full typography and margin analysis.",
                "inspection_method": "unverified",
            })

        return (
            {"score": max(0, min(100, score_format)), "issues": issues_format, "details": layout_res},
            {"score": max(0, min(100, score_parse)), "issues": issues_parse},
        )

    # -----------------------------------------------------------------------
    # Recommendation Generation
    # -----------------------------------------------------------------------
    def _generate_recommendations(self, issues: list[dict]) -> list[dict]:
        recommendations = []
        seen = set()

        for issue in issues:
            rec = issue.get("recommendation")
            if rec and rec not in seen:
                seen.add(rec)
                category = "role_alignment" if "role" in issue.get("type", "") else issue.get("type", "general")
                recommendations.append({
                    "category": category,
                    "message": rec,
                })

        return recommendations


# Top-level module function for invocation
def analyze_ats(
    resume_data: Optional[dict] = None,
    parser_metadata: Optional[dict] = None,
    target_role: Optional[str] = None,
    file_path: Optional[str] = None,
) -> dict:
    analyzer = RuleBasedATSAnalyzer()
    return analyzer.analyze(
        resume_data=resume_data,
        parser_metadata=parser_metadata,
        target_role=target_role,
        file_path=file_path,
    )
