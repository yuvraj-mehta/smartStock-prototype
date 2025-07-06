import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-r from-blue-950 to-blue-800 text-white pt-10 pb-4 mt-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-10 md:gap-0 justify-between">
        {/* Left: Logo & Description */}
        <div className="md:w-1/3 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-400/20 p-3 rounded-xl">
              {/* Replace with your own SVG or logo */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                <rect width="20" height="20" x="2" y="2" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-bold text-cyan-300">SmartStock</span>
              <div className="text-sm text-cyan-100">AI-Driven Inventory Management</div>
            </div>
          </div>
          <p className="text-zinc-200 text-base mt-2">
            Transform your inventory management with AI-powered insights, predictive analytics, and real-time tracking across all your locations.
          </p>
          <div className="flex gap-3 mt-2">
            <a href="#" className="bg-zinc-800 hover:bg-cyan-400/20 p-2 rounded-lg transition-colors" aria-label="GitHub"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.68 5.41-5.24 5.7.42.36.79 1.09.79 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z" /></svg></a>
            <a href="#" className="bg-zinc-800 hover:bg-cyan-400/20 p-2 rounded-lg transition-colors" aria-label="Twitter"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.56c-.89.39-1.85.65-2.86.77a4.93 4.93 0 0 0 2.16-2.72c-.95.56-2 .97-3.13 1.19A4.92 4.92 0 0 0 16.62 3c-2.72 0-4.93 2.21-4.93 4.93 0 .39.04.77.12 1.13C7.69 8.86 4.07 6.94 1.64 4.15c-.43.74-.67 1.6-.67 2.52 0 1.74.89 3.28 2.25 4.18-.83-.03-1.61-.25-2.29-.63v.06c0 2.43 1.73 4.46 4.03 4.92-.42.12-.87.18-1.33.18-.32 0-.63-.03-.93-.08.63 1.97 2.45 3.4 4.6 3.44A9.87 9.87 0 0 1 0 21.54a13.94 13.94 0 0 0 7.56 2.22c9.05 0 14-7.5 14-14 0-.21 0-.42-.02-.63A9.93 9.93 0 0 0 24 4.56z" /></svg></a>
            <a href="#" className="bg-zinc-800 hover:bg-cyan-400/20 p-2 rounded-lg transition-colors" aria-label="LinkedIn"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.28c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm13.5 11.28h-3v-5.6c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.97v5.7h-3v-10h2.88v1.36h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.59v5.59z" /></svg></a>
            <a href="#" className="bg-zinc-800 hover:bg-cyan-400/20 p-2 rounded-lg transition-colors" aria-label="Email"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 7l10 6 10-6" /></svg></a>
          </div>
        </div>
        {/* Center: Quick Links */}
        <div className="md:w-1/4 flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-cyan-200 mb-2">Quick Links</h3>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">Dashboard</a>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">Inventory</a>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">Analytics</a>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">AI Assistant</a>
        </div>
        {/* Right: Support */}
        <div className="md:w-1/4 flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-cyan-200 mb-2">Support</h3>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">Help Center</a>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">Documentation</a>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">API Reference</a>
          <a href="#" className="text-cyan-100 hover:text-cyan-400">Contact Us</a>
        </div>
      </div>
      <hr className="my-8 border-blue-900/60" />
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-zinc-300 text-sm gap-2">
        <span>© {new Date().getFullYear()} SmartStock. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-cyan-400">Privacy Policy</a>
          <a href="#" className="hover:text-cyan-400">Terms of Service</a>
          <a href="#" className="hover:text-cyan-400">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
