import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700">
          404
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-slate-950">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No SmartStock route matches
          {' '}
          <span className="font-medium text-slate-800">{location.pathname}</span>
          .
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go back
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </button>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
