/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#1B2430",
                paper: "#F7F5F1",
                signal: "#E8A33D",
                line: "#DCD7CC",
                danger: "#C4432B",
                success: "#2F9E68",
            },
            fontFamily: {
                display: ["Space Grotesk", "sans-serif"],
                body: ["IBM Plex Sans", "sans-serif"],
            },
        },
    },
    plugins: [],
};