import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Email, staff code, or matric number
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (!identifier || !password) {
      setError('Please enter your credentials');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting login with identifier:', identifier);
      
      const data = await authService.login(identifier, password);
      console.log('Full response data:', data);

      const user = data.user;
      if (!user) {
        throw new Error('Login succeeded but no user data was returned.');
      }

      // `authService.login` logs the raw backend role; also show the normalized role here
      console.log('[Login handler] normalized user.role:', user?.role);
      localStorage.setItem('userProfile', JSON.stringify(user));
      
      showToast(`Welcome back, ${user.firstName}!`, 'success', 2000);
      
      // Navigate based on role (case-insensitive) — wait until localStorage is fully set
      const role = normalizeUserRole(user.role);
      console.log('[Login handler] navigating for role:', role);
      if (role === UserRole.ADMIN) {
        navigate('/admin/dashboard');
      } else if (role === UserRole.INSTRUCTOR) {
        navigate('/instructor/dashboard');
      } else {
        navigate('/intern/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const isPending = err.status === 403;
      const errorMsg = isPending
        ? 'Account is pending approval. Please wait for administrator approval.'
        : err.message || 'Invalid credentials.';
      setError(errorMsg);
      showToast(errorMsg, 'error', 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex overflow-hidden min-h-[600px]">
        {/* Left Side: Brand */}
        <div className="hidden lg:flex w-1/2 bg-navy relative items-center justify-center p-12 text-center">
          <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073&auto=format&fit=crop')] bg-cover bg-center"></div>
          <div className="relative z-10 text-white flex flex-col items-center">
            <div className="w-28 h-28 bg-white/10 rounded-2xl flex items-center justify-center mb-8 shadow-2xl p-4 backdrop-blur-sm border border-white/20 hover:scale-105 transition-transform duration-300">
              <img src="/logo.png" alt="PRICE Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-4xl font-bold mb-4">PRICE E-Classroom</h2>
            <p className="text-slate-300 text-lg font-light leading-relaxed">Empowering academic excellence through modern digital learning environments.</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-navy mb-2">Welcome Back</h2>
            <p className="text-slate-500">Please enter your credentials to access your classroom.</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 flex items-center gap-2 rounded-r">
              <AlertCircle size={20} className="shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email or Institutional ID
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type={'text'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={'Enter your Email, Staff Code, or Matric Number'}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full pl-12 pr-12 py-3 rounded-lg border border-slate-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="remember" className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary bg-white" />
              <label htmlFor="remember" className="text-sm text-slate-600">Remember me on this device</label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="block w-full bg-navy hover:bg-primary text-white font-bold py-4 rounded-lg text-center transition-all shadow-lg shadow-navy/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-slate-500 mb-2">
              Don't have an account? <Link to="/join" className="font-bold text-primary hover:underline">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
