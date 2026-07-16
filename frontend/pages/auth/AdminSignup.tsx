import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';
import { db } from '../../services/database';

const AdminSignup: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    secretCode: '' // Simple verification for demo
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simple validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
       setError("All fields are required");
       setIsSubmitting(false);
       return;
    }

    try {
      await db.auth.signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: 'Administrator',
        // In a real app, 'secretCode' would be verified server-side
      });
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md shadow-xl rounded-2xl p-8 border-t-4 border-primary">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
             <ShieldCheck size={32} />
           </div>
           <h2 className="text-2xl font-bold text-navy">Admin Registration</h2>
           <p className="text-slate-500 text-sm">Create an administrative account to manage the platform.</p>
        </div>

        {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First Name</label>
               <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-primary focus:border-primary outline-none" />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Last Name</label>
               <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-primary focus:border-primary outline-none" />
             </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-primary focus:border-primary outline-none" />
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
              <div className="relative">
                 <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-primary focus:border-primary outline-none" />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                 </button>
              </div>
           </div>
           
           <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Admin Secret Code (Optional)</label>
              <input type="password" name="secretCode" value={formData.secretCode} onChange={handleChange} placeholder="Provided by IT Department" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-primary focus:border-primary outline-none" />
           </div>

           <button 
             type="submit" 
             disabled={isSubmitting}
             className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-4 flex items-center justify-center gap-2"
           >
             {isSubmitting ? "Creating..." : "Create Admin Account"}
           </button>
        </form>

        <div className="mt-6 text-center">
           <Link to="/join" className="text-sm text-slate-500 hover:text-primary">Back to Role Selection</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;