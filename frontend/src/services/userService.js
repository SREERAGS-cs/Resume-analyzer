import api from "./api";

/**
 * Fetch authenticated user's complete profile
 */
export const getUserProfile = async () => {
    const response = await api.get("/users/profile");
    return response.data;
};

/**
 * Update permitted profile fields for the authenticated user
 */
export const updateUserProfile = async (profileData) => {
    const response = await api.put("/users/profile", profileData);
    return response.data;
};

/**
 * Change current password securely
 */
export const changeUserPassword = async ({ current_password, new_password, confirm_password }) => {
    const response = await api.put("/users/change-password", {
        current_password,
        new_password,
        confirm_password,
    });
    return response.data;
};
