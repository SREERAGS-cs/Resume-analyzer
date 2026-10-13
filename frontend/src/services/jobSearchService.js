import api from "./api";

export const searchJobs = async (criteria) => {
    const response = await api.post("/jobs/search", criteria);
    return response.data;
};
