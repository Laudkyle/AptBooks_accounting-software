import { Navigate } from "react-router-dom";
import { useAuth } from "./components/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  // Show loading while AuthContext is still checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Check if user is authenticated based on AuthContext state
  // The API interceptor will handle token refresh automatically
  const isAuthenticated = !!user && !!localStorage.getItem("accessToken");
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;