import pdfplumber


def extract_text_from_pdf(file_path: str) -> str:
    try:
        with pdfplumber.open(file_path) as pdf:
            if len(pdf.pages) == 0:
                raise ValueError("This PDF has no pages.")

            page_texts = []
            for page in pdf.pages:
                try:
                    text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
                except Exception:
                    text = ""
                page_texts.append(text)

            return "\n\n".join(page_texts)
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Unable to read PDF file: {e}")
def extract_pdf_hyperlinks(file_path: str) -> list[str]:
    """
    Reads clickable link annotations (e.g. an icon or short handle that's
    actually a hyperlink to linkedin.com/... behind the visible text).
    Returns a flat list of URIs found across all pages. Best-effort —
    returns an empty list rather than raising, since this is a supplementary
    signal, not something that should ever block the main text extraction.
    """
    try:
        uris = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                for link in getattr(page, "hyperlinks", []):
                    uri = link.get("uri")
                    if uri:
                        uris.append(uri)
        return uris
    except Exception:
        return []