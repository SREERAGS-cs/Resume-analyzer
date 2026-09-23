import re

SPLIT_PATTERN = re.compile(r"[,|•\n]|\s{2,}")


def extract_skills(skills_raw: str | None) -> list[str]:
    if not skills_raw:
        return []

    # Drop sub-labels like "Languages:" / "Tools:" that sometimes prefix a skills line,
    # without touching the skill names themselves (so "C#", "C++" etc. stay intact)
    text = re.sub(r"^\s*[\w\s]{2,25}:\s*", "", skills_raw, flags=re.MULTILINE)

    raw_tokens = SPLIT_PATTERN.split(text)
    skills = []
    seen = set()
    for token in raw_tokens:
        cleaned = token.strip(" -–\t")
        if not cleaned or len(cleaned) > 40:  # overly long "tokens" are probably not a single skill
            continue
        key = cleaned.lower()
        if key not in seen:
            seen.add(key)
            skills.append(cleaned)

    return skills