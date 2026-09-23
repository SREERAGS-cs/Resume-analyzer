from datetime import datetime
from pydantic import BaseModel


class ResumeOut(BaseModel):
    id: int
    original_filename: str
    display_name: str
    file_type: str
    file_size: int
    version: int
    parsing_status: str = "not_started"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeRename(BaseModel):
    display_name: str