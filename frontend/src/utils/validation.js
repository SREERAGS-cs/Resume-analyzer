export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

export const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("One number");
    return errors;
};

// Rough strength score 0-4, used by the signup strength meter
export const getPasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) && password.length >= 12) score++;
    return score; // 0 = very weak, 4 = strong
};

export const validateLoginForm = ({ email, password }) => {
    const errors = {};
    if (!email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

    if (!password) errors.password = "Password is required.";

    return errors;
};

export const validateSignupForm = ({ fullName, email, password, confirmPassword, termsAccepted }) => {
    const errors = {};

    if (!fullName.trim()) errors.fullName = "Full name is required.";
    else if (fullName.trim().length < 2) errors.fullName = "Name is too short.";

    if (!email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

    if (!password) {
        errors.password = "Password is required.";
    } else {
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            errors.password = `Password must include: ${passwordErrors.join(", ")}.`;
        }
    }

    if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";

    if (!termsAccepted) errors.terms = "You must accept the terms and conditions.";

    return errors;
};