import api from "./api";

export const analyzeResume = async (resumeId) => {
    const response = await api.post("/resume-analysis/analyze", { resume_id: resumeId });
    return response.data;
};

export const getLatestAnalysis = async (resumeId) => {
    const response = await api.get(`/resume-analysis/${resumeId}`);
    return response.data;
};

export const getAnalysisHistory = async (resumeId) => {
    const response = await api.get(`/resume-analysis/${resumeId}/history`);
    return response.data;
};