import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";


function Header({ isExpanded, setIsExpanded }) {
  const [isMobile, setIsMobile] = useState(false);
  const { logout } = useAuth();
  const navigator = useNavigate()
  // Check authentication
  const isAuthenticated = !!localStorage.getItem("accessToken");

  // Update isMobile state based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setIsExpanded(false);
      } else {
        setIsMobile(false);
        setIsExpanded(true);
      }
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Logout Handler
  const handleLogout = async () => {
    await logout();
    navigator('/login')
  };

  return (
    <div className="p-4 border-b border-gray-600 bg-gray-800 h-20 flex justify-between items-center">
      {/* Sidebar Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 hover:bg-gray-700 text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h8m-8 6h16"
            />
          </svg>
        </button>
      )}

      {/* Logout Icon (Only show if authenticated) */}
      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="p-4 hover:bg-red-700 text-white flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1"
            />
          </svg>
          <span className="ml-2 hidden md:inline">Logout</span>
        </button>
      )}
    </div>
  );
}

export default Header;
