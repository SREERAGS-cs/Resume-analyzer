EXTRACTION_SCHEMA_HINT = """
{
  "personal_info": {"full_name": null, "email": null, "phone": null, "location": null, "linkedin": null, "github": null, "portfolio": null},
  "summary": null,
  "skills": [],
  "education": [{"institution": null, "degree": null, "field_of_study": null, "start_date": null, "end_date": null, "score": null, "score_type": null}],
  "experience": [{"company": null, "job_title": null, "employment_type": null, "location": null, "start_date": null, "end_date": null, "description": null, "responsibilities": [], "achievements": []}],
  "projects": [{"name": null, "description": null, "technologies": [], "start_date": null, "end_date": null, "role": null, "link": null}],
  "certifications": [{"name": null, "issuer": null, "date": null, "credential_id": null, "credential_url": null}],
  "achievements": [{"title": null, "description": null, "date": null}],
  "organizations": [{"name": null, "role": null, "start_date": null, "end_date": null, "description": null}],
  "responsibilities": [],
  "publications": [],
  "volunteering": [],
  "languages": [],
  "interests": [],
  "other_sections": {},
  "unrecognized_sections": {}
}
""".strip()

RULES = """
CRITICAL RULES — follow exactly:
1. This is EXTRACTION ONLY. Do not rewrite, improve, summarize, or generate any content.
2. ONLY extract information that is literally present in the resume text below.
3. NEVER guess, infer, or fabricate. If a value is missing, use null (for strings) or [] (for arrays). Never leave a field out of the JSON.
4. Do NOT infer location from a college name. Do NOT infer experience from projects. Do NOT infer skills not explicitly listed. Do NOT infer dates that aren't stated.
5. Extract the COMPLETE summary text, not a shortened or final-sentence version.
6. Each skill must be an individual, separate string — never merge multiple skills or category labels into one string (e.g. "Python, MySQL" is wrong; split into "Python" and "MySQL").
7. Every distinct project is its own object. Never merge two projects together, and never attach one project's technologies/description to another.
8. Every distinct certification/workshop is its own object. Never merge two certifications into one.
9. Distinguish employment/internship from clubs/organizations/leadership roles. A club or society role (e.g. "Nature Club — Head of ...") belongs in "organizations", NOT in "experience".
10. Keep each education entry's institution, degree, dates, and score together as one object — never mix fields between different education entries.
11. For personal_info.linkedin and personal_info.github, require clear evidence tying the value to that platform. If a LinkedIn or GitHub URL is present, preserve the complete URL exactly as written. If only visible profile text is present beside or clearly paired with that platform's label or icon, extract that exact text as the value (including a person's displayed name for LinkedIn); do not construct or infer a URL or username. Do not fill these fields from unrelated mentions of LinkedIn or GitHub elsewhere in the resume. If no clearly associated profile value is present, use null.
12. Any resume heading/content you cannot confidently classify into the fields above should go into "unrecognized_sections" as {"heading text": "content"}, or into "other_sections" if it's a recognizable-but-uncommon category.
13. Return ONLY valid JSON matching the schema below. No markdown code fences, no commentary, no explanation — JSON only.
"""


def _format_hyperlink_evidence(hyperlinks: list[str] | None) -> str:
    if not hyperlinks:
        return ""
    targets = "\n".join(f"- {url}" for url in hyperlinks)
    return f"""

PDF hyperlink targets extracted from this resume. Use these targets only to populate personal_info.linkedin and personal_info.github; do not use them to change any other field:
{targets}
""".strip()


def build_extraction_prompt(raw_text: str, hyperlinks: list[str] | None = None) -> str:
    hyperlink_evidence = _format_hyperlink_evidence(hyperlinks)
    return f"""You are a precise resume data extraction engine. {RULES}

JSON schema to follow exactly (same keys, same nesting):
{EXTRACTION_SCHEMA_HINT}

{hyperlink_evidence}

Resume text to extract from:
---
{raw_text}
---

Return only the JSON object, nothing else."""


def build_correction_prompt(
    raw_text: str,
    previous_error: str,
    hyperlinks: list[str] | None = None,
) -> str:
    hyperlink_evidence = _format_hyperlink_evidence(hyperlinks)
    return f"""Your previous response could not be parsed/validated as JSON matching the required schema.
Error: {previous_error}

{RULES}

JSON schema to follow exactly:
{EXTRACTION_SCHEMA_HINT}

{hyperlink_evidence}

Resume text to extract from:
---
{raw_text}
---

Return ONLY a single valid JSON object matching the schema exactly. No markdown, no code fences, no extra text."""