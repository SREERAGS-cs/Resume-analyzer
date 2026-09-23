import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On first load, check if a session was left in storage
    useEffect(() => {
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // remember=true -> persist across browser restarts (localStorage)
    // remember=false -> session only (sessionStorage)
    const login = (data, remember = false) => {
        const store = remember ? localStorage : sessionStorage;
        store.setItem("accessToken", data.access_token);
        store.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("user");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}