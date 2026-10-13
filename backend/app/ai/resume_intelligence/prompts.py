import json


def build_resume_intelligence_prompt(resume_context: dict, role_profile: dict) -> str:
    resume_json = json.dumps(resume_context, ensure_ascii=True, indent=2)
    role_json = json.dumps(role_profile, ensure_ascii=True, indent=2)
    return f"""You are Resume IQ, an evidence-based resume analyst. Analyze the supplied resume specifically for the selected target role.

TARGET ROLE PROFILE:
{role_json}

RESUME CONTENT:
{resume_json}

ANALYSIS RULES:
1. Use the role profile as context, not an absolute checklist. A capability not listed in the resume is not proof that the candidate lacks it or is unqualified.
2. State gaps as "not demonstrated in the resume" or "partially demonstrated"; never make claims about what the candidate knows.
3. Strengths must be specifically role-relevant and include an exact, verbatim excerpt from the supplied resume content as evidence. Do not paraphrase evidence excerpts.
4. Do not invent skills, tools, experience, project details, certifications, outcomes, or metrics. Never suggest adding fictional metrics; only suggest adding genuine measurable outcomes if the candidate has them.
5. Improvements must say what to change, why it matters for this role, and how to improve it. Ground statements in supplied content; use evidence=null only when the finding is explicitly about missing evidence.
6. De-emphasize only content demonstrably less relevant to the selected role. Use "consider de-emphasizing" language, never direct deletion commands. Include a verbatim evidence excerpt.
7. Do not use generic praise or generic recommendations. Do not recommend keywords solely because they occur in the role profile.
8. For custom roles, no predefined profile exists. Infer role context conservatively from the title and resume; do not invent a fixed technology stack.
9. Return dimension assessments for all six dimensions. Scores must reflect evidence and missing/partial evidence; include a concise rationale and an exact resume excerpt where applicable. The backend, not you, calculates the final role match score.
10. Return only one valid JSON object with exactly these keys and shapes:
{{
  "overall_assessment": "...",
  "strengths": [{{"title":"...","explanation":"...","evidence":"exact resume excerpt","role_relevance":"..."}}],
  "missing": [{{"item":"...","status":"not_demonstrated|partially_demonstrated|clearly_demonstrated","reason":"...","importance":"high|medium|low","evidence":null}}],
  "improvements": [{{"section":"...","issue":"...","why_it_matters":"...","recommendation":"...","priority":"high|medium|low","evidence":null}}],
  "deemphasize": [{{"item":"...","reason":"...","suggestion":"...","evidence":"exact resume excerpt"}}],
  "priority_actions": [{{"priority":"high|medium|low","action":"...","reason":"..."}}],
  "dimension_assessments": [{{"dimension":"role_skill_match|keyword_match|project_relevance|experience_relevance|resume_content_quality|resume_structure","score":0,"rationale":"...","evidence":null}}]
}}
"""


def build_correction_prompt(resume_context: dict, role_profile: dict, error: str) -> str:
    return f"""Your previous response was not valid JSON matching the required schema.
Validation error: {error}

Correct your response. Re-read the original role profile and resume below. Follow every evidence, non-invention, role-relevance, and response-format rule from the prior instruction. Do not add any unsupported claims.

TARGET ROLE PROFILE:
{json.dumps(role_profile, ensure_ascii=True, indent=2)}

RESUME CONTENT:
{json.dumps(resume_context, ensure_ascii=True, indent=2)}

Return only the corrected JSON object, with the same keys: overall_assessment, strengths, missing, improvements, deemphasize, priority_actions, dimension_assessments.
"""
