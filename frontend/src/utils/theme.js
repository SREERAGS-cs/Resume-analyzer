let systemMediaListener = null;

/**
 * Apply the selected theme ("light" | "dark" | "system")
 */
export function applyTheme(theme) {
    if (!theme) theme = "system";
    localStorage.setItem("resumeiq_theme", theme);

    // Remove existing system media listener if any
    if (systemMediaListener) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaQuery.removeEventListener("change", systemMediaListener);
        systemMediaListener = null;
    }

    if (theme === "dark") {
        document.documentElement.classList.add("dark");
    } else if (theme === "light") {
        document.documentElement.classList.remove("dark");
    } else {
        // System preference
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        document.documentElement.classList.toggle("dark", mediaQuery.matches);

        systemMediaListener = (e) => {
            if (localStorage.getItem("resumeiq_theme") === "system") {
                document.documentElement.classList.toggle("dark", e.matches);
            }
        };
        mediaQuery.addEventListener("change", systemMediaListener);
    }
}

/**
 * Initialize theme from localStorage on initial boot
 */
export function initTheme() {
    const savedTheme = localStorage.getItem("resumeiq_theme") || "system";
    applyTheme(savedTheme);
    return savedTheme;
}

/**
 * Get currently stored theme
 */
export function getStoredTheme() {
    return localStorage.getItem("resumeiq_theme") || "system";
}
