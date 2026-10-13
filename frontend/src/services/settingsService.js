import api from "./api";

/**
 * Fetch authenticated user's settings and preferences
 */
export const getUserSettings = async () => {
    const response = await api.get("/settings");
    return response.data;
};

/**
 * Update authenticated user's settings and preferences
 */
export const updateUserSettings = async (settingsData) => {
    const response = await api.put("/settings", settingsData);
    return response.data;
};

/**
 * Export user data in structured JSON
 */
export const exportUserData = async () => {
    const response = await api.get("/settings/export-data");
    return response.data;
};

/**
 * Request permanent account deletion
 */
export const deleteUserAccount = async ({ password, confirmation }) => {
    const response = await api.delete("/settings/account", {
        data: { password, confirmation },
    });
    return response.data;
};
