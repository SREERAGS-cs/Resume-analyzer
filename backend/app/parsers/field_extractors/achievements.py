import re

BULLET_PATTERN = re.compile(r"^[-•*–]\s*(.+)")
YEAR_PATTERN = re.compile(r"\b(19\d{2}|20\d{2})\b")


def extract_achievements(achievements_raw: str | None) -> list[dict]:
    if not achievements_raw:
        return []

    lines = [line.strip() for line in achievements_raw.split("\n") if line.strip()]
    if not lines:
        return []

    entries = []
    i = 0
    while i < len(lines):
        line = lines[i]
        bullet_match = BULLET_PATTERN.match(line)
        text = bullet_match.group(1).strip() if bullet_match else line

        year_match = YEAR_PATTERN.search(text)
        date = year_match.group() if year_match else None

        title = text
        desc = None

        if i + 1 < len(lines):
            next_line = lines[i + 1]
            next_bullet = BULLET_PATTERN.match(next_line)
            if not next_bullet and len(next_line) <= 40 and not YEAR_PATTERN.search(next_line):
                desc = next_line.strip()
                i += 2
            else:
                i += 1
        else:
            i += 1

        entries.append({
            "title": title,
            "description": desc,
            "date": date,
        })

    return entries
