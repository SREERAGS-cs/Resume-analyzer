import re

# Canonical sections from Step 1's schema design
SECTION_PATTERNS = {
    "summary": [
        r"professional\s+summary", r"career\s+objective", r"^summary$",
        r"^objective$", r"^profile$", r"professional\s+profile", r"^about(\s+me)?$",
    ],
    "skills": [
        r"\bskills\b",  # catches "Skills", "Technical Skills", "Programming Skills", "Soft Skills", etc.
        r"core\s+competenc(y|ies)", r"skills?\s*(&|and)?\s*tools",
        r"technical\s+proficienc(y|ies)", r"^technologies$",
    ],
    "education": [
        r"^education$", r"academic\s+background", r"educational\s+qualifications?", r"^academics$",
    ],
    "experience": [
        r"^experience$", r"work\s+experience", r"professional\s+experience",
        r"employment\s+history", r"work\s+history", r"career\s+history",
    ],
    "projects": [
        r"^projects$", r"academic\s+projects", r"personal\s+projects", r"key\s+projects",
    ],
    "certifications": [
        r"^certifications?$", r"^certificates?$",
        r"licenses?\s*(&|and)?\s*certifications?", r"courses?\s*(&|and)?\s*certifications?",
    ],
    "achievements": [
        r"^achievements?$", r"^awards?$", r"^honors?$",
        r"^accomplishments?$", r"awards?\s*(&|and)?\s*honors?",
    ],
}
# "Other relevant sections" from Step 1 (Section 4) — kept separate from the core seven
OTHER_SECTION_PATTERNS = {
    "publications": [r"^publications?$"],
    "languages": [r"^languages?$"],
    "volunteer_experience": [r"volunteer(ing)?(\s+experience)?"],
    "interests": [r"^interests?$", r"^hobbies$"],
    "coursework": [r"(relevant\s+)?coursework"],
}

MAX_HEADER_WORDS = 5
MAX_HEADER_LENGTH = 45


def _match_canonical(line: str):
    normalized = line.strip().lower().rstrip(":")
    for canonical, patterns in SECTION_PATTERNS.items():
        for pattern in patterns:
            if re.fullmatch(pattern, normalized) or re.search(pattern, normalized):
                return ("known", canonical)
    for other_key, patterns in OTHER_SECTION_PATTERNS.items():
        for pattern in patterns:
            if re.fullmatch(pattern, normalized) or re.search(pattern, normalized):
                return ("other", other_key)
    return None


def _looks_like_header_shape(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > MAX_HEADER_LENGTH:
        return False
    if len(stripped.split()) > MAX_HEADER_WORDS:
        return False
    if stripped.endswith("."):
        return False
    return True


def _looks_like_probable_header(line: str) -> bool:
    """
    For lines that don't match a known keyword but might still be an
    (unrecognized) section header. Restricted to ALL-CAPS lines only —
    title-case alone is too common inside normal content (degree names,
    job titles, column labels) and was causing real section content to
    be mistaken for new section boundaries.
    """
    stripped = line.strip()
    if not _looks_like_header_shape(stripped):
        return False
    if stripped.startswith(("-", "•", "*", "–")):
        return False
    if "@" in stripped:
        return False
    if re.search(r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", stripped):
        return False
    if re.search(r"\d", stripped):
        return False  # a genuine header rarely contains digits (dates, percentages, CGPA, etc.)

    words = [w for w in stripped.split() if w[:1].isalpha()]
    if not words:
        return False
    return stripped.isupper()
def detect_sections(cleaned_text: str) -> dict:
    """
    Splits cleaned resume text into labeled blocks, in document order.
    Sections not present in the resume are simply absent — nothing is fabricated.
    """
    lines = cleaned_text.split("\n")

    # Pass 1: find every KNOWN/OTHER canonical match first (these are reliable —
    # matched against real section-name keywords, not just line shape)
    canonical_matches = []
    for i, line in enumerate(lines):
        if not _looks_like_header_shape(line):
            continue
        match = _match_canonical(line)
        if match:
            kind, key = match
            canonical_matches.append((i, kind, key))

    first_canonical_index = canonical_matches[0][0] if canonical_matches else None

    # Pass 2: only now look for "unrecognized" probable headers — and only among
    # lines AFTER the first known section starts. A resume's opening lines
    # (name, contact info) are never a genuine section header, even when they
    # happen to be short and title-cased — excluding them here is what fixes
    # the header block being wrongly swallowed by a false-positive match.
    matches = list(canonical_matches)
    for i, line in enumerate(lines):
        if first_canonical_index is not None and i <= first_canonical_index:
            continue
        if any(m[0] == i for m in matches):
            continue
        if not _looks_like_header_shape(line):
            continue
        if _looks_like_probable_header(line):
            matches.append((i, "unrecognized", line.strip()))

    matches.sort(key=lambda m: m[0])

    if not matches:
        return {
            "header_block": cleaned_text.strip(),
            "sections": {},
            "other_sections": {},
            "unrecognized_sections": {},
        }

    header_block = "\n".join(lines[: matches[0][0]]).strip()

    sections, other_sections, unrecognized_sections = {}, {}, {}

    for idx, (line_index, kind, key) in enumerate(matches):
        start = line_index + 1
        end = matches[idx + 1][0] if idx + 1 < len(matches) else len(lines)
        block = "\n".join(lines[start:end]).strip()

        if not block:
            continue

        target = sections if kind == "known" else other_sections if kind == "other" else unrecognized_sections
        if key in target:
            target[key] += "\n" + block
        else:
            target[key] = block

    return {
        "header_block": header_block,
        "sections": sections,
        "other_sections": other_sections,
        "unrecognized_sections": unrecognized_sections,
    }