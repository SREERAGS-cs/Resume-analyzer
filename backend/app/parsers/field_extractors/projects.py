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


def _build_entry(chunk_lines: list[str]) -> dict:
    entry = {"name": None, "description": None, "technologies": [], "role": None, "link": None}
    if not chunk_lines:
        return entry

    chunk = "\n".join(chunk_lines)

    link_match = LINK_PATTERN.search(chunk)
    if link_match:
        entry["link"] = link_match.group()

    tech_match = TECH_LIST_PATTERN.search(chunk)
    if tech_match:
        entry["technologies"] = [t.strip() for t in re.split(r"[,|]", tech_match.group(3)) if t.strip()]

    # First non-tech, non-bullet line is the title
    description_lines = []
    for line in chunk_lines:
        bullet_match = BULLET_PATTERN.match(line)
        if bullet_match:
            description_lines.append(bullet_match.group(1).strip())
        elif TECH_LIST_PATTERN.search(line) or LINK_PATTERN.search(line):
            continue
        elif entry["name"] is None:
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

    # Identify project title line indices.
    title_indices = []
    for i, line in enumerate(lines):
        if line.startswith(("•", "-", "*", "–")):
            continue
        if TECH_LIST_PATTERN.search(line) or LINK_PATTERN.search(line):
            continue
        if len(line) > 50:
            continue
        has_tech = any(TECH_LIST_PATTERN.search(lines[j]) for j in range(i + 1, min(i + 3, len(lines))))
        has_bullet = any(lines[j].startswith(("•", "-", "*", "–")) for j in range(i + 1, min(i + 4, len(lines))))
        if has_tech:
            title_indices.append(i)
        elif TITLE_LINE_PATTERN.match(line):
            title_indices.append(i)
        elif has_bullet and (line.isupper() or line.istitle() or re.match(r"^[A-Za-z0-9\s:-]{3,40}$", line)):
            title_indices.append(i)

    if not title_indices:
        chunks_by_blank = [c.strip() for c in re.split(r"\n\s*\n", projects_raw) if c.strip()]
        return [_build_entry(c.split("\n")) for c in chunks_by_blank]

    chunks = []
    for idx, start in enumerate(title_indices):
        end = title_indices[idx + 1] if idx + 1 < len(title_indices) else len(lines)
        chunks.append(lines[start:end])

    entries = []
    for chunk_lines in chunks:
        entry = _build_entry(chunk_lines)
        if entry.get("name") and (entry.get("description") or entry.get("technologies")):
            entries.append(entry)

    return entries