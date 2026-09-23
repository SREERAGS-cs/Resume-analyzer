import api from "./api";

const toPayload = (state) => ({
    title: state.resumeTitle,
    template_id: state.selectedTemplate || state.effectiveTemplate,
    font_family_id: state.fontFamilyId,
    font_size_id: state.fontSizeId,
    personal_information: state.personalInformation,
    summary: state.summary,
    skills: state.skills,
    education: state.education,
    experience: state.experience,
    projects: state.projects,
    certifications: state.certifications,
    achievements: state.achievements,
    additional_sections: state.additionalSections,
});

export const createDraft = async (state) => {
    const response = await api.post("/resume-drafts", toPayload(state));
    return response.data;
};

export const updateDraft = async (draftId, state) => {
    const response = await api.put(`/resume-drafts/${draftId}`, toPayload(state));
    return response.data;
};

export const listDrafts = async () => {
    const response = await api.get("/resume-drafts");
    return response.data;
};

export const getDraft = async (draftId) => {
    const response = await api.get(`/resume-drafts/${draftId}`);
    return response.data;
};

export const deleteDraft = async (draftId) => {
    await api.delete(`/resume-drafts/${draftId}`);
};