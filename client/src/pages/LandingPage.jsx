
import React from 'react';
import {
  FaReact,
  FaNodeJs,
  FaCss3Alt,
  FaHtml5,
  FaGithub,
  FaNpm,
  FaCloud,
  FaLock,
  FaDatabase,
  FaTools,
  FaRoute,
  FaRegCheckCircle,
  FaKey,
  FaUserSecret,
  FaMagic,
  FaBolt,
  FaEnvelope,
  FaSyncAlt,
  FaVial,
  FaIdBadge,
  FaSuperpowers,
  FaLink,
  FaShieldAlt,
  FaCalendarAlt,
  FaCodeBranch,
  FaCogs,
  FaChartBar,
  FaSearch,
  FaExclamationCircle,
} from 'react-icons/fa';

const techStackGroups = [
  {
    title: 'FrontEnd',
    items: [
      { name: 'React', icon: <FaReact /> },
      { name: 'React DOM', icon: <FaReact /> },
      { name: 'React Router DOM', icon: <FaRoute /> },
      { name: 'Redux Toolkit', icon: <FaTools /> },
      { name: 'React Redux', icon: <FaLink /> },
      { name: 'Tailwind CSS', icon: <FaCss3Alt /> },
      { name: 'Vite', icon: <FaBolt /> },
      { name: 'Axios', icon: <FaCloud /> },
      { name: 'Heroicons', icon: <FaSuperpowers /> },
      { name: 'Lucide React', icon: <FaMagic /> },
      { name: 'React Icons', icon: <FaChartBar /> },
      { name: 'Prop Types', icon: <FaRegCheckCircle /> },
    ],
  },
  {
    title: 'BackEnd',
    items: [
      { name: 'Node.js', icon: <FaNodeJs /> },
      { name: 'Express', icon: <FaCogs /> },
      { name: 'Mongoose', icon: <FaDatabase /> },
      { name: 'OpenAI API', icon: <FaMagic /> },
      { name: 'JWT', icon: <FaKey /> },
      { name: 'bcrypt', icon: <FaLock /> },
      { name: 'Cloudinary', icon: <FaCloud /> },
      { name: 'Nodemailer', icon: <FaEnvelope /> },
      { name: 'Node-cron', icon: <FaCalendarAlt /> },
      { name: 'Express Validator', icon: <FaRegCheckCircle /> },
      { name: 'Axios', icon: <FaCloud /> },
      { name: 'Node Fetch', icon: <FaSearch /> },
      { name: 'UUID', icon: <FaIdBadge /> },
      { name: 'Jest', icon: <FaVial /> },
      { name: 'Supertest', icon: <FaUserSecret /> },
      { name: 'Nodemon', icon: <FaSyncAlt /> },
    ],
  },
];

const features = [
  'AI-driven inventory forecasting and analytics',
  'Real-time stock tracking and notifications',
  'Automated financial reconciliation and reporting',
  'Order and fulfillment management',
  'Role-based access and secure authentication',
  'Integrated dashboard for actionable insights',
  'Automated reordering and supply chain optimization',
  'Audit logs and compliance tracking',
  'AI Chat Bot (Upcoming)',
];

const accent = 'text-orange-500';



const featureIcons = [
  '📊', '⏱️', '💰', '📦', '🔒', '📈', '🔁', '📝', '🤖'
];

const infoIcons = [
  '🛡️', // Role-Based Access
  '📦', // Inventory Tracking
  '🤖', // AI-Powered
];


const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col relative overflow-x-hidden">
    {/* Decorative Background Shapes */}
    <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-2xl -z-10" style={{ top: '-6rem', left: '-6rem' }} />
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-2xl -z-10" style={{ bottom: '-6rem', right: '-6rem' }} />

    {/* Sticky Navigation Bar */}
    <header className="sticky top-0 w-full py-4 bg-white/90 border-b border-blue-100 flex items-center justify-between px-8 shadow z-20 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-extrabold text-blue-700">Code</span>
        <span className="text-3xl font-extrabold text-orange-500">-D-Code</span>
      </div>
      <nav className="hidden md:flex gap-8 text-blue-700 font-medium">
        <a href="#home" className="hover:text-orange-500 transition">Home</a>
        <a href="#problem" className="hover:text-orange-500 transition">Problem</a>
        <a href="#features" className="hover:text-orange-500 transition">Features</a>
        <a href="#role-based-access" className="hover:text-orange-500 transition">Role-Based Access</a>
        <a href="#product-movement" className="hover:text-orange-500 transition">Product Movement</a>
        <a href="#ai-implementation" className="hover:text-orange-500 transition">AI Implementation</a>
        <a href="#techstack" className="hover:text-orange-500 transition">Tech Stack</a>
      </nav>
      <a href="/login">
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition-all duration-200">Login</button>
      </a>
    </header>

    {/* HERO SECTION - Aspirational & Visual */}
    <section id="home" className="relative flex flex-col md:flex-row items-center justify-center py-28 px-4 gap-16 overflow-hidden bg-gradient-to-br from-orange-50 to-blue-100">
      <div className="flex-1 flex flex-col items-center md:items-start z-10">
        <h1 className="text-6xl md:text-7xl font-extrabold text-blue-700 mb-6 leading-tight drop-shadow-lg tracking-tight">
          <span className="text-orange-500">Revolutionize</span> Your Inventory
        </h1>
        <p className="text-2xl md:text-3xl text-blue-600 mb-8 font-medium max-w-2xl">
          Unlock the power of AI for seamless, real-time stock management. Experience effortless control, instant insights, and smarter decisions—built for ambitious retail teams.
        </p>
        <div className="flex gap-6 mb-10">
          <a href="#features">
            <button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-10 py-4 rounded-2xl shadow-xl text-xl transition-all duration-200">Explore Features</button>
          </a>
          <a href="/login">
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-4 rounded-2xl shadow-xl text-xl transition-all duration-200">Get Started</button>
          </a>
        </div>
        <div className="flex gap-8 mt-4">
          <div className="flex flex-col items-center">
            <span className="text-3xl text-orange-500"><FaBolt /></span>
            <span className="text-sm text-blue-700 font-semibold mt-1">Lightning Fast</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl text-blue-700"><FaLock /></span>
            <span className="text-sm text-blue-700 font-semibold mt-1">Enterprise Secure</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl text-purple-600"><FaMagic /></span>
            <span className="text-sm text-blue-700 font-semibold mt-1">AI Powered</span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex justify-center z-10">
        <div className="w-96 h-96 md:w-[28rem] md:h-[28rem] rounded-[2.5rem] bg-gradient-to-br from-blue-100 via-purple-100 to-orange-100 flex items-center justify-center shadow-2xl border-4 border-white animate-float relative">
          <span className="text-[8rem] md:text-[10rem] drop-shadow-lg">📦</span>
          <span className="absolute bottom-8 right-8 text-4xl text-orange-500 animate-bounce">✨</span>
        </div>
      </div>
      <style>{`
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .animate-bounce {
          animation: bounce 1.2s infinite alternate;
        }
        @keyframes bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }
      `}</style>
    </section>

    {/* Problem Statement Section - Analytical & Solution Focused */}
    <section id="problem" className="relative py-24 px-4 bg-gradient-to-br from-orange-50 to-blue-50 border-t border-orange-100 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        <div className="flex flex-col items-center mb-10">
          <span className="inline-block bg-gradient-to-br from-orange-200 to-blue-100 rounded-full p-4 shadow-lg mb-4">
            <FaExclamationCircle className="text-5xl text-blue-700" />
          </span>
          <h2 className="text-4xl font-extrabold text-blue-700 mb-2 text-center tracking-tight">Why Inventory Management is Broken</h2>
          <p className="text-xl text-blue-600 mb-4 text-center max-w-8xl">
            Retailers struggle with fragmented spreadsheets, manual data entry, and outdated inventory systems. These inefficiencies lead to costly errors, missed sales opportunities, overstocking or stockouts, and wasted time—making it difficult to scale and stay competitive in a fast-moving market.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 w-full">
          <div className="rounded-2xl border shadow-lg flex flex-col items-center py-8 px-6 bg-white">
            <span className="text-4xl text-orange-500 mb-3"><FaExclamationCircle /></span>
            <span className="font-bold text-blue-700 text-lg mb-2">Manual Processes</span>
            <span className="text-blue-900 text-base text-center">Fragmented spreadsheets and manual entry lead to costly errors and missed sales.</span>
          </div>
          <div className="rounded-2xl border shadow-lg flex flex-col items-center py-8 px-6 bg-white">
            <span className="text-4xl text-blue-700 mb-3"><FaLock /></span>
            <span className="font-bold text-blue-700 text-lg mb-2">Lack of Real-Time Insights</span>
            <span className="text-blue-900 text-base text-center">Traditional systems can't keep up with fast-moving inventory, leading to stockouts and overstocking.</span>
          </div>
          <div className="rounded-2xl border shadow-lg flex flex-col items-center py-8 px-6 bg-white">
            <span className="text-4xl text-purple-600 mb-3"><FaMagic /></span>
            <span className="font-bold text-blue-700 text-lg mb-2">No Automation or AI</span>
            <span className="text-blue-900 text-base text-center">Most platforms lack automation and forecasting, making growth and efficiency difficult.</span>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-blue-200 shadow-xl flex flex-col items-center py-10 px-8 bg-gradient-to-br from-blue-50 to-orange-50 mb-6">
          <h4 className="text-2xl font-extrabold text-orange-500 mb-4 text-center">How SmartStock Fixes This</h4>
          <ul className="list-disc list-inside text-blue-900 text-lg space-y-2 max-w-xl mx-auto">
            <li><span className="font-semibold text-orange-500">Unified tracking</span> for all products, orders, and warehouses.</li>
            <li><span className="font-semibold text-orange-500">Automated reporting</span> and reconciliation.</li>
            <li><span className="font-semibold text-orange-500">AI-driven forecasting</span> for smarter reordering and supply chain optimization.</li>
            <li><span className="font-semibold text-orange-500">Real-time dashboard</span> for instant insights and alerts.</li>
          </ul>
        </div>
        <a href="/login">
          <button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-10 py-4 rounded-2xl shadow-xl text-xl transition-all duration-200 mt-2">Try SmartStock Free</button>
        </a>
      </div>
    </section>

    {/* Divider */}
    <div className="w-full h-0.5 bg-gradient-to-r from-blue-100 via-purple-100 to-orange-100 my-8 opacity-60" />



    {/* Features Section - Overhauled */}
    <section id="features" className="py-24 px-4 bg-gradient-to-br from-blue-50 to-orange-50">
      <h2 className="text-3xl font-bold text-orange-500 mb-2 text-center tracking-tight">Features</h2>
      <h3 className="text-4xl font-extrabold text-blue-700 mb-12 text-center tracking-tight">Smarter Inventory, Smoother Operations</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto mb-20">
        {features.map((feature, idx) => (
          <div key={feature} className="flex flex-col items-center bg-white rounded-3xl shadow-2xl border border-blue-100 hover:shadow-lg transition-all duration-200 py-10 px-6 group animate-fade-in">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-blue-100 text-4xl font-bold mb-4 border-2 border-orange-200 group-hover:scale-110 transition-transform">{featureIcons[idx]}</div>
            <span className="text-blue-900 text-lg font-semibold text-center mb-2">{feature}</span>
          </div>
        ))}
      </div>
    </section>

    {/* Role-Based Access Section */}
    <section id="role-based-access" className="py-20 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <h2 className="text-3xl font-extrabold text-center mb-2 tracking-tight flex items-center justify-center gap-2">
        <span className="inline-block bg-gradient-to-br from-blue-100 to-orange-100 rounded-full p-2 mr-2 shadow">🛡️</span>
        <span className="bg-gradient-to-r from-orange-500 to-blue-700 bg-clip-text text-transparent">Role-Based Access</span>
      </h2>
      <h3 className="text-4xl font-extrabold text-orange-500 mb-12 text-center tracking-tight drop-shadow">Who Does What in SmartStock?</h3>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Admin Card */}
        <div className="group bg-white rounded-3xl shadow-xl border-2 border-orange-200 p-8 flex flex-col items-center transition-all duration-200 hover:scale-105 hover:shadow-orange-200">
          <span className="text-6xl mb-4 bg-gradient-to-br from-orange-100 to-orange-300 rounded-full p-4 shadow-lg border-4 border-white group-hover:scale-110 transition-transform">👑</span>
          <h4 className="text-2xl font-extrabold text-orange-500 mb-3 text-center tracking-tight group-hover:text-blue-700 transition">Admin</h4>
          <ul className="text-blue-900 text-base text-center leading-relaxed space-y-2 font-medium">
            <li>Full access to all system features and data</li>
            <li>Manage users, staff, roles, and permissions</li>
            <li>Configure warehouses and system settings</li>
          </ul>
        </div>
        {/* Staff Card */}
        <div className="group bg-white rounded-3xl shadow-xl border-2 border-blue-200 p-8 flex flex-col items-center transition-all duration-200 hover:scale-105 hover:shadow-blue-200">
          <span className="text-6xl mb-4 bg-gradient-to-br from-blue-100 to-blue-300 rounded-full p-4 shadow-lg border-4 border-white group-hover:scale-110 transition-transform">🧑‍🔧</span>
          <h4 className="text-2xl font-extrabold text-blue-700 mb-3 text-center tracking-tight group-hover:text-orange-500 transition">Staff</h4>
          <ul className="text-blue-900 text-base text-center leading-relaxed space-y-2 font-medium">
            <li>Manage inventory, orders, and fulfillment</li>
            <li>Approve or reject returns and transfers</li>
          </ul>
        </div>
        {/* Supplier Card */}
        <div className="group bg-white rounded-3xl shadow-xl border-2 border-green-200 p-8 flex flex-col items-center transition-all duration-200 hover:scale-105 hover:shadow-green-200">
          <span className="text-6xl mb-4 bg-gradient-to-br from-green-100 to-green-300 rounded-full p-4 shadow-lg border-4 border-white group-hover:scale-110 transition-transform">🚚</span>
          <h4 className="text-2xl font-extrabold text-green-600 mb-3 text-center tracking-tight group-hover:text-blue-700 transition">Supplier</h4>
          <ul className="text-blue-900 text-base text-center leading-relaxed space-y-2 font-medium">
            <li>Supply products to warehouses</li>
            <li>View and track own orders and shipments</li>
            <li>Receive notifications and updates</li>
          </ul>
        </div>
        {/* Transporter Card */}
        <div className="group bg-white rounded-3xl shadow-xl border-2 border-purple-200 p-8 flex flex-col items-center transition-all duration-200 hover:scale-105 hover:shadow-purple-200">
          <span className="text-6xl mb-4 bg-gradient-to-br from-purple-100 to-purple-300 rounded-full p-4 shadow-lg border-4 border-white group-hover:scale-110 transition-transform">🚛</span>
          <h4 className="text-2xl font-extrabold text-purple-600 mb-3 text-center tracking-tight group-hover:text-blue-700 transition">Transporter</h4>
          <ul className="text-blue-900 text-base text-center leading-relaxed space-y-2 font-medium">
            <li>Manage deliveries and returns</li>
            <li>View assigned shipments and delivery status</li>
            <li>Receive notifications and updates</li>
          </ul>
        </div>
      </div>
      <style>{`
        #role-based-access .group:hover {
          box-shadow: 0 8px 32px 0 rgba(255, 140, 0, 0.15);
        }
      `}</style>
    </section>

    {/* Product Movement Tracking Section */}
    <section id="product-movement" className="py-20 px-4 bg-gradient-to-br from-blue-50 to-orange-50">
      <h2 className="text-3xl font-bold text-blue-700 mb-2 text-center tracking-tight flex items-center justify-center gap-2">
        <span className="inline-block bg-gradient-to-br from-blue-100 to-orange-100 rounded-full p-2 mr-2 shadow">🔄</span>
        Product Movement Tracking
      </h2>
      <h3 className="text-4xl font-extrabold text-orange-500 mb-8 text-center tracking-tight">Full Lifecycle Visibility</h3>
      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-wrap justify-center gap-4 mb-6 text-lg text-blue-700">
          <span className="flex items-center gap-2"><span>🚚</span>Arrival</span>
          <span className="text-xl">→</span>
          <span className="flex items-center gap-2"><span>📦</span>In Stock</span>
          <span className="text-xl">→</span>
          <span className="flex items-center gap-2"><span>🛠️</span>Allocated</span>
          <span className="text-xl">→</span>
          <span className="flex items-center gap-2"><span>🎁</span>Packed</span>
          <span className="text-xl">→</span>
          <span className="flex items-center gap-2"><span>🚚</span>Shipped</span>
          <span className="text-xl">→</span>
          <span className="flex items-center gap-2"><span>✅</span>Delivered</span>
          <span className="text-xl">→</span>
          <span className="flex items-center gap-2"><span>↩️</span>Returned</span>
        </div>
        <p className="text-blue-900 text-lg text-center max-w-2xl mb-2">Track every product from arrival, through delivery, and even returns—ensuring full visibility and control at every step of the inventory lifecycle.</p>
      </div>
    </section>

    {/* AI Implementation Section */}
    <section id="ai-implementation" className="py-20 px-4 bg-gradient-to-br from-purple-50 to-blue-50">
      <h2 className="text-3xl font-bold text-purple-700 mb-2 text-center tracking-tight flex items-center justify-center gap-2">
        <span className="inline-block bg-gradient-to-br from-purple-100 to-blue-100 rounded-full p-2 mr-2 shadow">🤖</span>
        AI-Powered Inventory Intelligence
      </h2>
      <h3 className="text-4xl font-extrabold text-orange-500 mb-8 text-center tracking-tight">How Our Backend AI Works</h3>
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-10 items-center justify-center">
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-purple-200 p-6">
            <h4 className="text-xl font-bold text-blue-700 mb-2 flex items-center gap-2">📈 Demand Forecasting</h4>
            <p className="text-blue-900 text-base">AI analyzes historical sales, seasonal trends, and market conditions to predict future demand for every product—helping you plan ahead and avoid stockouts.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-purple-200 p-6">
            <h4 className="text-xl font-bold text-blue-700 mb-2 flex items-center gap-2">🛒 Stock Optimization</h4>
            <p className="text-blue-900 text-base">Intelligent algorithms recommend optimal stock levels, reorder points, and safety stock—minimizing excess inventory and maximizing cash flow.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-purple-200 p-6">
            <h4 className="text-xl font-bold text-blue-700 mb-2 flex items-center gap-2">💡 Intelligent Insights</h4>
            <p className="text-blue-900 text-base">The backend generates actionable recommendations, highlights critical items, and uncovers cost-saving opportunities—empowering smarter decisions.</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl shadow-xl border-2 border-purple-200 p-10 flex flex-col items-center">
            <span className="text-[5rem] mb-4">🤖</span>
            <span className="text-xl font-bold text-blue-700 mb-2 text-center">Powered by OpenAI GPT-4</span>
            <span className="text-blue-900 text-base text-center">Our backend leverages advanced AI models to deliver real-time, data-driven inventory intelligence for modern retail teams.</span>
          </div>
        </div>
      </div>
    </section>

    {/* Tech Stack Section */}
    {/* Divider */}
    <div className="w-full h-0.5 bg-gradient-to-r from-blue-100 via-purple-100 to-orange-100 my-8 opacity-60" />

    <section id="techstack" className="py-20 px-4">
      <h2 className="text-3xl font-bold text-orange-500 mb-2 text-center tracking-tight flex items-center justify-center gap-2">
        <span className="inline-block bg-gradient-to-br from-orange-100 to-blue-100 rounded-full p-2 mr-2 shadow">🛠️</span>
        Tech Stack
      </h2>
      <h3 className="text-4xl font-extrabold text-blue-700 mb-12 text-center tracking-tight">Technologies Powering SmartStock</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {techStackGroups.map((group, idx) => (
          <div
            key={group.title}
            className={`rounded-2xl shadow-xl border flex flex-col items-center p-6 md:p-8 transition-all duration-200 hover:scale-[1.03] hover:shadow-orange-200 group ${idx === 0
              ? 'bg-gradient-to-br from-orange-50 to-blue-50 border-orange-200'
              : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
              }`}
          >
            <h4 className="text-xl md:text-2xl font-extrabold mb-4 flex items-center gap-2 text-blue-700 group-hover:text-orange-500 transition">
              {idx === 0 ? '💻' : '🗄️'} {group.title}
            </h4>
            <div className="grid grid-cols-2 gap-4 md:gap-6 w-full">
              {group.items.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col items-center bg-white/80 rounded-lg p-3 md:p-4 shadow hover:bg-orange-50 transition-all duration-200 border border-blue-100 min-h-[90px] md:min-h-[110px]"
                >
                  <span className="text-3xl md:text-4xl mb-1 md:mb-2 drop-shadow text-blue-500">{item.icon}</span>
                  <span className="text-xs md:text-base font-semibold text-blue-900 text-center">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        #techstack .group:hover {
          box-shadow: 0 8px 32px 0 rgba(255, 140, 0, 0.15);
        }
      `}</style>
    </section>

    {/* Footer */}
    <footer className="w-full py-6 text-center text-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 mt-auto text-sm border-t border-blue-100">
      &copy; {new Date().getFullYear()} SmartStock. All rights reserved.
    </footer>
    {/* Simple fade-in animation */}
    <style>{`
      .animate-fade-in {
        animation: fadeIn 1.2s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);

export default LandingPage;
