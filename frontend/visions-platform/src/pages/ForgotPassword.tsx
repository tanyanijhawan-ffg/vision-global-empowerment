import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8"
      >
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
          <ShieldCheck size={24} />
        </div>

        <h1 className="text-2xl font-bold mb-2">Forgot your password?</h1>

        <p className="text-slate-500 text-sm mb-6">
          No worries! You can get help recovering access to your account.
        </p>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 mb-6">
          <h2 className="text-sm font-semibold text-indigo-900 mb-2">
            Please contact your Super Admin
          </h2>
          <p className="text-sm text-indigo-800 leading-relaxed">
            For security reasons, password recovery through email is currently
            unavailable. Please contact your Super Admin to request a password
            reset.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}