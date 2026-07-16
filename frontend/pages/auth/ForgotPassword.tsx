import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { db } from '../../services/database';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: Sent/Verify, 3: New Password
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Submit Email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulate checking if email exists
    setTimeout(() => {
        const users = db.auth.getAllUsers();
        const userExists = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        
        if (userExists) {
            setStep(2);
        } else {
            setError('No account found with this email address.');
        }
        setIsLoading(false);
    }, 1000);
  };

  // Step 2: Simulate Clicking "Reset Link" (In real app, this is in email)
  const handleSimulateLinkClick = () => {
      setStep(3);
  };

  // Step 3: Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          return;
      }
      
      setIsLoading(true);
      try {
          await db.auth.resetPassword(email, newPassword);
          // Success! Redirect to login
          alert('Password successfully reset! You can now login.');
          navigate('/login');
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border-t-4 border-primary">
        
        {/* Header */}
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
             {step === 2 ? <CheckCircle size={32} /> : <Lock size={32} />}
           </div>
           <h2 className="text-2xl font-bold text-navy">
               {step === 1 ? 'Forgot Password?' : step === 2 ? 'Check your email' : 'Reset Password'}
           </h2>
           <p className="text-slate-500 text-sm mt-2">
               {step === 1 && "Enter your email address and we'll send you a link to reset your password."}
               {step === 2 && `We've sent a password reset link to ${email}.`}
               {step === 3 && "Create a new strong password for your account."}
           </p>
        </div>

        {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
        )}

        {/* STEP 1: EMAIL INPUT */}
        {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="name@example.com" 
                            className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                        />
                    </div>
                </div>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="block w-full bg-navy hover:bg-primary text-white font-bold py-3 rounded-lg text-center transition-all shadow-lg shadow-navy/20 disabled:opacity-70"
                >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
            </form>
        )}

        {/* STEP 2: VERIFICATION (SIMULATED) */}
        {step === 2 && (
            <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-2">[DEMO MODE: Simulate clicking email link]</p>
                    <button 
                        onClick={handleSimulateLinkClick}
                        className="text-primary font-bold hover:underline text-sm"
                    >
                        Click here to simulate opening the reset link
                    </button>
                </div>
                
                <div className="text-center text-sm text-slate-500">
                    Didn't receive the email? <button onClick={() => setStep(1)} className="text-primary font-bold hover:underline">Click to resend</button>
                </div>
            </div>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 3 && (
            <form onSubmit={handleResetSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="••••••••" 
                            className="w-full pl-12 pr-12 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
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
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="••••••••" 
                            className="w-full pl-12 pr-12 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                        />
                    </div>
                </div>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="block w-full bg-navy hover:bg-primary text-white font-bold py-3 rounded-lg text-center transition-all shadow-lg shadow-navy/20 disabled:opacity-70"
                >
                    {isLoading ? "Resetting..." : "Reset Password"}
                </button>
            </form>
        )}

        <div className="mt-8 text-center text-sm">
           <Link to="/login" className="flex items-center justify-center gap-2 text-slate-500 hover:text-primary transition-colors">
             <ArrowLeft size={16} /> Back to Login
           </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;