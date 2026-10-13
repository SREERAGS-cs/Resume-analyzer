import api from "./api";

/**
 * Trigger ATS analysis for a specific resume.
 * Creates a new ATS analysis record on the backend.
 */
export const analyzeATS = async (resumeId, targetRole = null) => {
    const payload = { resume_id: resumeId };
    if (targetRole) payload.target_role = targetRole;
    const response = await api.post("/ats/analyze", payload);
    return response.data;
};

export const analyzeResumeIntelligence = async (resumeId, targetRole) => {
    const response = await api.post("/ats/intelligence", {
        resume_id: resumeId,
        target_role: targetRole,
    });
    return response.data;
};

export const getLatestResumeIntelligence = async (resumeId, targetRole = null) => {
    const params = targetRole ? { target_role: targetRole } : {};
    const response = await api.get(`/ats/intelligence/${resumeId}`, { params });
    return response.data;
};

/**
 * Fetch the latest ATS analysis result for a specific resume.
 */
export const getLatestATSAnalysis = async (resumeId, targetRole = null) => {
    const params = targetRole ? { target_role: targetRole } : {};
    const response = await api.get(`/ats/${resumeId}`, { params });
    return response.data;
};

/**
 * Fetch full historical ATS analysis records for a specific resume.
 */
export const getATSHistory = async (resumeId, targetRole = null) => {
    const params = targetRole ? { target_role: targetRole } : {};
    const response = await api.get(`/ats/${resumeId}/history`, { params });
    return response.data;
};

/**
 * Fetch a specific ATS analysis record by its analysis ID.
 */
export const getATSAnalysisById = async (analysisId) => {
    const response = await api.get(`/ats/result/${analysisId}`);
    return response.data;
};
