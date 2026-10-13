import api from "./api";

export const RESUME_VERIFIED_EVENT = "resume:verified";

export const uploadResume = async (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
            if (onProgress && event.total) onProgress(Math.round((event.loaded * 100) / event.total));
        },
    });
    return response.data;
};

export const getResumes = async () => {
    const response = await api.get("/resumes");
    return response.data;
};

export const getResume = async (id) => {
    const response = await api.get(`/resumes/${id}`);
    return response.data;
};

export const downloadResume = async (id, filename) => {
    const response = await api.get(`/resumes/${id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const renameResume = async (id, displayName) => {
    const response = await api.put(`/resumes/${id}`, { display_name: displayName });
    return response.data;
};

export const deleteResume = async (id) => {
    await api.delete(`/resumes/${id}`);
};

export const parseResume = async (id) => {
    const response = await api.post(`/resumes/${id}/parse`);
    return response.data;
};

export const getParsedResume = async (id) => {
    const response = await api.get(`/resumes/${id}/parsed`);
    return response.data;
};

export const updateParsedResume = async (id, updates) => {
    const response = await api.put(`/resumes/${id}/parsed`, updates);
    return response.data;
};

export const verifyParsedResume = async (id) => {
    const response = await api.post(`/resumes/${id}/parsed/verify`);
    window.dispatchEvent(new CustomEvent(RESUME_VERIFIED_EVENT, { detail: { resumeId: Number(id) } }));
    return response.data;
};

// Returns a blob object URL for embedding a PDF preview inline (requires the JWT, so
// it can't just be used as a plain <iframe src>) — caller is responsible for revoking it.
export const getResumePreviewBlobUrl = async (id) => {
    const response = await api.get(`/resumes/${id}/preview`, { responseType: "blob" });
    return window.URL.createObjectURL(response.data);
};