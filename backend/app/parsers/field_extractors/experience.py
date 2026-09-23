import re

DATE_RANGE_PATTERN = re.compile(
    r"([A-Za-z]{3,9}\.?\s+\d{4}|\d{4})\s*[-–—to]+\s*([A-Za-z]{3,9}\.?\s+\d{4}|\d{4}|present)",
    re.IGNORECASE,
)
BULLET_PATTERN = re.compile(r"^[-•*–]\s*(.+)")


def extract_experience(experience_raw: str | None) -> list[dict]:
    """
    Best-effort extraction. Confidently extracts dates and bullet points;
    company/title are guessed from line position, not guaranteed correct.
    Fields that can't be determined stay null rather than being guessed at.
    """
    if not experience_raw:
        return []

    chunks = [c.strip() for c in re.split(r"\n\s*\n", experience_raw) if c.strip()]
    if not chunks:
        chunks = [experience_raw.strip()]

    entries = []
    for chunk in chunks:
        lines = [l.strip() for l in chunk.split("\n") if l.strip()]
        entry = {
            "company": None, "job_title": None, "location": None,
            "start_date": None, "end_date": None, "description": None,
            "responsibilities": [], "achievements": [],
        }

        date_match = DATE_RANGE_PATTERN.search(chunk)
        if date_match:
            entry["start_date"] = date_match.group(1)
            entry["end_date"] = date_match.group(2)

        header_lines = []
        bullets = []
        for line in lines:
            bullet_match = BULLET_PATTERN.match(line)
            if bullet_match:
                bullets.append(bullet_match.group(1).strip())
            elif not (date_match and date_match.group() in line):
                header_lines.append(line)

        entry["responsibilities"] = bullets

        # Common resume pattern: "Job Title, Company" or "Job Title\nCompany" as the first 1-2 non-bullet lines
        if header_lines:
            first_line = header_lines[0]
            if "," in first_line:
                parts = [p.strip() for p in first_line.split(",", 1)]
                entry["job_title"], entry["company"] = parts[0], parts[1] if len(parts) > 1 else None
            else:
                entry["job_title"] = first_line
                if len(header_lines) > 1:
                    entry["company"] = header_lines[1]

        entries.append(entry)

    return entries