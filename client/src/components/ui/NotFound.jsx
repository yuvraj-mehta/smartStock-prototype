import { useLocation } from "react-router-dom";
import { useEffect } from "react";
// If you have Navbar and Footer components in your client, import them here. Otherwise, you can create simple placeholders.
// import Navbar from "../components/Navbar";
// import Footer from "../components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* <Navbar /> */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-10 max-w-md w-full text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            {/* SVG Illustration */}
            <svg width="100" height="100" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="60" fill="#DBEAFE" />
              <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize="48" fontWeight="bold" fill="#2563EB">404</text>
              <ellipse cx="60" cy="90" rx="28" ry="8" fill="#93C5FD" fillOpacity=".7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-blue-700 mb-2">404</h1>
          <p className="text-xl text-gray-700 mb-4 font-medium">Oops! This page does not exist.</p>
          <p className="text-base text-gray-500 mb-8">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
          <a href="/" className="inline-block px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition-all duration-150">
            ⬅️ Go back Home
          </a>
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default NotFound;
