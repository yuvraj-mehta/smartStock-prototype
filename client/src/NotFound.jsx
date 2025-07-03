import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-100 px-4">
      <div className="text-center animate-fade-in">
        <div className="flex justify-center mb-6">
          {/* SVG Illustration */}
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="60" fill="#FDE68A" />
            <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize="56" fontWeight="bold" fill="#F59E42">404</text>
            <ellipse cx="60" cy="90" rx="28" ry="8" fill="#FCD34D" fillOpacity=".7" />
          </svg>
        </div>
        <h1 className="text-5xl font-extrabold text-orange-500 mb-2 drop-shadow">404</h1>
        <p className="text-2xl text-gray-700 mb-4 font-medium">Oops! This page does not exist.</p>
        <p className="text-base text-gray-500 mb-8">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
        <a href="/" className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold shadow hover:from-yellow-500 hover:to-orange-500 transition-all duration-150">
          ⬅️ Go back Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
