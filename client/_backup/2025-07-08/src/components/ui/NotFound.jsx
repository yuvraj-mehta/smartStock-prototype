import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * NotFound Component
 *
 * Displays a 404 error page when users navigate to non-existent routes.
 * Includes navigation options and logs the error for debugging purposes.
 *
 * @returns {React.ReactElement} The 404 error page
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Log 404 errors for monitoring and debugging
    console.error(
      `404 Error: User attempted to access non-existent route: ${location.pathname}`,
      {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      },
    );
  }, [location.pathname]);

  const handleGoBack = () => {
    // Go back to previous page if available, otherwise go to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-white/20">
          {/* 404 Illustration */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-600">404</span>
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-blue-200 rounded-full opacity-30"></div>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Oops! The page you're looking for doesn't exist.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            The page might have been removed, renamed, or is temporarily unavailable.
          </p>

          {/* Navigation Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Go to home page"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
