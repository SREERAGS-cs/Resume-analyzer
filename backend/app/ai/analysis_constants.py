import re

# Centralized so the wording/coverage of "sounds like an accomplishment"
# detection can be tuned in one place without touching analyzer logic.
ACTION_VERBS = [
    "developed", "built", "created", "designed", "implemented",
    "engineered", "optimized", "automated", "analyzed", "integrated",
    "deployed", "tested", "managed", "led", "improved", "architected",
    "streamlined", "launched", "delivered", "maintained",
]

# Looks for concrete, quantifiable signals rather than any bare number
# (which would false-positive on dates like "2023"). Requires a percentage,
# multiplier, or a specific outcome-oriented keyword.
MEASURABLE_PATTERN = re.compile(
    r"\d+%|\d+x\b|\busers?\b|\brequests?\b|\brecords?\b|\bresponse time\b|"
    r"\baccuracy\b|\bperformance\b|\breduc(?:ed|tion|es)\b|"
    r"\bincreas(?:ed|e|es)\b|\bimprov(?:ed|es|ement)\b|\bscale\b|"
    r"\bthroughput\b|\blatency\b",
    re.IGNORECASE,
)

EMAIL_PATTERN = re.compile(r"^[\w.+-]+@[\w-]+\.[\w.-]+$")

# This is the application's initial scoring strategy, not an industry-standard
# formula. Weights must sum to 1.0 — adjust here only, never inline.
CATEGORY_WEIGHTS = {
    "content": 0.25,
    "structure": 0.20,
    "skills": 0.15,
    "summary": 0.10,
    "education": 0.10,
    "experience": 0.05,
    "projects": 0.10,
    "certifications": 0.05,
}