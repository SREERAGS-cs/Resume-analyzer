import api from "./api";

export const analyzeJobMatching = async (resumeId, jobTitle = null, jobDescription) => {
    const payload = { resume_id: resumeId, job_description: jobDescription };
    if (jobTitle && jobTitle.trim()) payload.job_title = jobTitle.trim();
    const response = await api.post("/job-matching/analyze", payload);
    return response.data;
};

export const getLatestJobMatching = async (resumeId) => {
    const response = await api.get(`/job-matching/${resumeId}`);
    return response.data;
};

export const getJobMatchingHistory = async (resumeId) => {
    const response = await api.get(`/job-matching/${resumeId}/history`);
    return response.data;
};

export const getJobMatchingById = async (analysisId) => {
    const response = await api.get(`/job-matching/result/${analysisId}`);
    return response.data;
};
