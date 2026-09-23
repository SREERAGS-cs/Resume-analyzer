import re

BULLET_PATTERN = re.compile(r"^[-•*–]\s*(.+)")
LINK_PATTERN = re.compile(r"https?://\S+")
TECH_LIST_PATTERN = re.compile(r"(Tech(nologies)?|Stack|Tools)\s*[:\-]\s*(.+)", re.IGNORECASE)
# A project title line commonly looks like "Project Name | Tech1, Tech2, Tech3"
TITLE_LINE_PATTERN = re.compile(r"^.{3,80}\|.{3,80}$")


def _build_entry(chunk_lines: list[str]) -> dict:
    chunk = "\n".join(chunk_lines)
    entry = {"name": None, "description": None, "technologies": [], "role": None, "link": None}

    link_match = LINK_PATTERN.search(chunk)
    if link_match:
        entry["link"] = link_match.group()

    tech_match = TECH_LIST_PATTERN.search(chunk)
    if tech_match:
        entry["technologies"] = [t.strip() for t in re.split(r"[,|]", tech_match.group(3)) if t.strip()]
    elif TITLE_LINE_PATTERN.match(chunk_lines[0]) if chunk_lines else False:
        # Pull the tech list straight out of the "Name | Tech1, Tech2" title line
        _, _, tech_part = chunk_lines[0].partition("|")
        entry["technologies"] = [t.strip() for t in tech_part.split(",") if t.strip()]

    description_lines = []
    for line in chunk_lines:
        bullet_match = BULLET_PATTERN.match(line)
        if bullet_match:
            description_lines.append(bullet_match.group(1).strip())
        elif not TECH_LIST_PATTERN.search(line) and not LINK_PATTERN.search(line):
            if entry["name"] is None:
                # Strip the "| Tech, Tech" portion off the title line if present
                entry["name"] = line.split("|")[0].strip()
            else:
                description_lines.append(line)

    if description_lines:
        entry["description"] = " ".join(description_lines)

    return entry


def extract_projects(projects_raw: str | None) -> list[dict]:
    if not projects_raw:
        return []

    lines = [l.strip() for l in projects_raw.split("\n") if l.strip()]
    if not lines:
        return []

    # Preferred: split wherever a "Name | Tech stack" title line appears —
    # far more reliable than bullet position, which some PDFs render oddly.
    title_indices = [i for i, l in enumerate(lines) if TITLE_LINE_PATTERN.match(l)]

    if len(title_indices) >= 1:
        chunks = []
        for idx, start in enumerate(title_indices):
            end = title_indices[idx + 1] if idx + 1 < len(title_indices) else len(lines)
            chunks.append(lines[start:end])
        # Anything before the first title line doesn't belong to a project — drop it
        return [_build_entry(chunk) for chunk in chunks]

    # Fallback: blank-line separated chunks (works when there IS reliable spacing)
    chunks_by_blank = [c.strip() for c in re.split(r"\n\s*\n", projects_raw) if c.strip()]
    if len(chunks_by_blank) > 1:
        return [_build_entry(c.split("\n")) for c in chunks_by_blank]

    # Last resort: old bullet-position-based chunking
    chunks, current, seen_bullet = [], [], False
    for line in lines:
        is_bullet = bool(BULLET_PATTERN.match(line))
        if not is_bullet and seen_bullet:
            chunks.append(current)
            current, seen_bullet = [], False
        current.append(line)
        if is_bullet:
            seen_bullet = True
    if current:
        chunks.append(current)

    return [_build_entry(chunk) for chunk in chunks]