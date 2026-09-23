import re

BULLET_PATTERN = re.compile(r"^[-•*–]\s*(.+)")
YEAR_PATTERN = re.compile(r"\b(19\d{2}|20\d{2})\b")


def extract_achievements(achievements_raw: str | None) -> list[dict]:
    if not achievements_raw:
        return []

    lines = [line.strip() for line in achievements_raw.split("\n") if line.strip()]
    entries = []
    for line in lines:
        bullet_match = BULLET_PATTERN.match(line)
        text = bullet_match.group(1).strip() if bullet_match else line

        year_match = YEAR_PATTERN.search(text)
        date = year_match.group() if year_match else None

        parts = re.split(r"\s*[-–—:]\s*", text, maxsplit=1)
        title = parts[0].strip() if parts else text
        desc = parts[1].strip() if len(parts) > 1 else None

        entries.append({
            "title": title,
            "description": desc,
            "date": date,
        })

    return entries
