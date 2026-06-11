import { ArrowLeft, Boxes, KeyRound, Lock, Mail, ShieldCheck, Truck, UserPlus, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../app/slices/authSlice';

const platformNotes = [
  {
    icon: Warehouse,
    title: 'Warehouse-scoped access',
    text: 'Internal users operate only inside their assigned warehouse boundary.',
  },
  {
    icon: Boxes,
    title: 'Inventory to finance flow',
    text: 'Orders, returns, transport, and payment reporting stay connected.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based internal access',
    text: 'Admin, staff, and viewer accounts get permissioned workspace access.',
  },
];

const accessNotes = [
  {
    icon: KeyRound,
    title: 'Reviewer/demo credentials',
    text: 'Use credentials provided with the deployment or generated locally by seed scripts. Shared passwords are not published in the browser.',
  },
  {
    icon: Truck,
    title: 'Transporter status access',
    text: 'Transporter accounts are provisioned by admins for assigned delivery status updates; they are not public self-service accounts.',
  },
];

const LoginPage = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [showSignup, setShowSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ fullName: '', email: '', password: '' });

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSignupChange = (e) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    dispatch(login(loginData));
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    setSignupSuccess(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">SmartStock</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inventory operations suite</p>
            </div>
          </div>

          <div className="my-12 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portfolio-ready warehouse control</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Manage stock, returns, transport, and finance from one operational workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              SmartStock keeps product movement traceable from supply intake through package delivery, reverse logistics, and ledger-backed reporting.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {platformNotes.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <Icon className="h-5 w-5 text-slate-600" />
                  <h2 className="mt-3 text-sm font-semibold text-slate-950">{title}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Built for a warehouse operator demo: scoped access, lifecycle controls, and finance visibility.
          </p>
        </section>

        <section className="flex items-center border-t border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 lg:border-l lg:border-t-0">
          <div className="w-full">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {showSignup ? 'Access request' : 'Secure sign in'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {showSignup ? 'Request workspace access' : 'Sign in to SmartStock'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {showSignup
                  ? 'Submit your details for an administrator to provision your account.'
                  : 'Use your assigned SmartStock credentials to open the operations workspace.'}
              </p>
            </div>

            {!showSignup && (
              <div className="mb-6 grid gap-3">
                {accessNotes.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-700 ring-1 ring-slate-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showSignup ? (
              <form className="space-y-5" onSubmit={handleLoginSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email address</label>
                  <div className="mt-1.5 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
                  <div className="mt-1.5 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      disabled={loading}
                    />
                  </div>
                </div>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  onClick={() => setShowSignup(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Request access
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleSignupSubmit}>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    value={signupData.fullName}
                    onChange={handleSignupChange}
                    disabled={signupSuccess}
                  />
                </div>
                <div>
                  <label htmlFor="signupEmail" className="block text-sm font-semibold text-slate-700">Email address</label>
                  <input
                    id="signupEmail"
                    name="email"
                    type="email"
                    required
                    className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    disabled={signupSuccess}
                  />
                </div>
                <div>
                  <label htmlFor="signupPassword" className="block text-sm font-semibold text-slate-700">Password</label>
                  <input
                    id="signupPassword"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    disabled={signupSuccess}
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={signupSuccess}
                >
                  {signupSuccess ? 'Request sent' : 'Submit request'}
                </button>
                {signupSuccess && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    Your request has been sent. An administrator will review it.
                  </div>
                )}
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  onClick={() => setShowSignup(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
