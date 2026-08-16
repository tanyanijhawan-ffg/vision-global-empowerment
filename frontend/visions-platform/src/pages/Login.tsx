import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROLE_LABELS, USER_MAP, setCurrentUser } from '../lib/auth';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('kavitha@visionsglobal.org');
  const [password, setPassword] = useState('Admin@123');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const user = USER_MAP[email.trim().toLowerCase()];

    if (!user || password !== 'Admin@123') {
      alert('Invalid login. Try kavitha@visionsglobal.org / Admin@123');
      return;
    }

    setCurrentUser(user);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-400 via-slate-900 to-slate-900"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Visions Global Empowerment</h1>
          <p className="text-indigo-400 text-lg font-medium">Learning & Empowerment Platform</p>
        </div>

        <div className="relative z-10 max-w-md">
          <blockquote className="text-xl text-slate-300 leading-relaxed font-light mb-6">
            "Empowering marginalized youth through education, leadership, and personal development across South India."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="w-12 h-1 bg-indigo-500 rounded-full"></div>
            <p className="text-slate-400 text-sm">System Administration</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="mb-10 text-center lg:text-left lg:hidden">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Visions LEP</h1>
            <p className="text-slate-500">Learning & Empowerment Platform</p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Please enter your details to sign in.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Forgot password?
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Demo users: <br />
              <span className="font-medium">kavitha@visionsglobal.org</span> - Super Admin <br />
              <span className="font-medium">rajan@visionsglobal.org</span> - Regional Admin <br />
              <span className="font-medium">meera@visionsglobal.org</span> - Facilitator
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 outline-none mt-2"
            >
              Sign In
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}