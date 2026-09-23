import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Redirects already-logged-in users away from /login and /signup
export default function PublicOnlyRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return null;

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}