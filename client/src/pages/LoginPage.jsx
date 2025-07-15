import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../app/slices/authSlice';

const LoginPage = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [showSignup, setShowSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({ email: 'admin@smartstock.com', password: 'admin123' });
  // Signup form state
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-100 py-12 px-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-2xl p-8 border border-blue-100 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full opacity-30 blur-2xl animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-100 rounded-full opacity-30 blur-2xl animate-pulse" />
        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" /></svg>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">SmartStock</h1>
            <p className="text-gray-500 text-sm mt-1">AI-Driven Inventory Management</p>
          </div>
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold shadow-sm">
              {showSignup ? 'Request Access' : 'Sign In'}
            </div>
          </div>
          {!showSignup ? (
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 px-4 py-2 bg-gray-50"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 px-4 py-2 bg-gray-50"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  disabled={loading}
                />
              </div>
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 rounded-lg shadow-md text-white bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-700 hover:to-purple-600 font-semibold text-lg transition-all duration-200"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Don't have an account? </span>
                <button type="button" className="text-blue-600 hover:underline text-sm font-semibold" onClick={() => setShowSignup(true)}>
                  Request Access
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSignupSubmit}>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 px-4 py-2 bg-gray-50"
                  value={signupData.fullName}
                  onChange={handleSignupChange}
                  disabled={signupSuccess}
                />
              </div>
              <div>
                <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  id="signupEmail"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 px-4 py-2 bg-gray-50"
                  value={signupData.email}
                  onChange={handleSignupChange}
                  disabled={signupSuccess}
                />
              </div>
              <div>
                <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  id="signupPassword"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 px-4 py-2 bg-gray-50"
                  value={signupData.password}
                  onChange={handleSignupChange}
                  disabled={signupSuccess}
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 rounded-lg shadow-md text-white bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 font-semibold text-lg transition-all duration-200"
                disabled={signupSuccess}
              >
                {signupSuccess ? 'Request Sent' : 'Request Access'}
              </button>
              {signupSuccess && (
                <div className="text-green-600 text-center text-sm mt-2">
                  Your request has been sent. The admin of the inventory will get back to you.
                </div>
              )}
              <div className="text-center mt-4">
                <button type="button" className="text-purple-600 hover:underline text-sm font-semibold" onClick={() => setShowSignup(false)}>
                  Back to Login
                </button>
              </div>
            </form>
          )}
          <p className='text-center text-sm text-gray-600'>click on login to login the credentials are prefilled for demo for the walmart Hackathon.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
