from docx import Document
from docx.opc.exceptions import PackageNotFoundError


def extract_text_from_docx(file_path: str) -> str:
    """
    Extracts text from a DOCX: paragraphs in order, plus table content
    (common in resumes for skills grids or education tables), joined by " | " per row.
    """
    try:
        document = Document(file_path)
    except PackageNotFoundError:
        raise ValueError("This DOCX file appears to be corrupted or is not a valid Word document.")
    except Exception as e:
        raise ValueError(f"Unable to read DOCX file: {e}")

    lines = []

    for para in document.paragraphs:
        text = para.text.strip()
        if text:
            lines.append(text)

    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                lines.append(" | ".join(cells))

    return "\n".join(lines)