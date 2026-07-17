import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Linkedin, Upload, Eye, EyeOff, CheckCircle, AlertCircle, Home } from 'lucide-react';
import { authService } from '../../services/api';

const InstructorSignup: React.FC = () => {
  const [step, setStep] = useState(1);

  useEffect(() => {
  window.history.pushState({ step }, '');
}, [step]);

useEffect(() => {
  const handlePopState = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    phone: '',
    phCode: '',
    qualification: '',
    bio: '',
    country: '',
    state: '',
    email: '',
    password: '',
    confirmPassword: '',
    consent: false
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const val = type === 'checkbox' ? e.target.checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: val,
      ...(name === 'country' ? { state: '' } : {}),
    }));
    // Clear error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
    if (globalError) setGlobalError('');
  };

  const countryOptions = [
    { value: 'NG', label: 'Nigeria' },
    { value: 'GH', label: 'Ghana' },
    { value: 'KE', label: 'Kenya' },
    { value: 'ZA', label: 'South Africa' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'US', label: 'United States' },
  ];

  const statesByCountry: Record<string, string[]> = {
    NG: [
      'Abia',
      'Adamawa',
      'Akwa Ibom',
      'Anambra',
      'Bauchi',
      'Bayelsa',
      'Benue',
      'Borno',
      'Cross River',
      'Delta',
      'Ebonyi',
      'Edo',
      'Ekiti',
      'Enugu',
      'Gombe',
      'Imo',
      'Jigawa',
      'Kaduna',
      'Kano',
      'Katsina',
      'Kebbi',
      'Kogi',
      'Kwara',
      'Lagos',
      'Nasarawa',
      'Niger',
      'Ogun',
      'Ondo',
      'Osun',
      'Oyo',
      'Plateau',
      'Rivers',
      'Sokoto',
      'Taraba',
      'Yobe',
      'Zamfara',
      'Federal Capital Territory (FCT)',
      'Not Applicable',
    ],
  };

  const selectedStateOptions = statesByCountry[formData.country] || [];
  const stateLabel = formData.country === 'NG' ? 'State of origin' : 'State / Region';

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.firstName) newErrors.firstName = true;
      if (!formData.lastName) newErrors.lastName = true;
      if (!formData.gender) newErrors.gender = true;
      if (!formData.dob) newErrors.dob = true;
      if (!formData.phone) newErrors.phone = true;
    } else if (currentStep === 2) {
      if (!formData.phCode) newErrors.phCode = true;
      if (!formData.qualification) newErrors.qualification = true;
      if (!formData.bio) newErrors.bio = true;
    } else if (currentStep === 3) {
      if (!formData.country) newErrors.country = true;
      if (!formData.state) newErrors.state = true;
    } else if (currentStep === 4) {
      if (!formData.email) newErrors.email = true;
      if (!formData.password) newErrors.password = true;
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = true;
      if (!formData.consent) newErrors.consent = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setGlobalError('Please fill in all required fields before proceeding.');
      isValid = false;
    }
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setGlobalError('');
      window.scrollTo(0, 0);
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(4)) {
      setIsSubmitting(true);
      try {
        await authService.signup({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: 'Instructor',
          phCode: formData.phCode,
          qualification: formData.qualification,
          bio: formData.bio,
          country: formData.country,
          state: formData.state,
          phone: formData.phone,
          gender: formData.gender,
          dob: formData.dob
        });
        
        setIsSubmitted(true);
        window.scrollTo(0, 0);
      } catch (err: any) {
        setGlobalError(err.message || 'Registration failed.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Helper for input classes - forcing bg-white
  const getInputClass = (fieldName: string) => `
    w-full border rounded p-3 focus:outline-none focus:ring-1 transition-all bg-white
    ${errors[fieldName] ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[#e2e8f0] focus:border-[#0d59f2] focus:ring-[#0d59f2]/20'}
  `;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <SignupHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl shadow-sm flex flex-col items-center justify-center p-12 text-center rounded-lg min-h-[500px]">
             <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm animate-bounce">
              <CheckCircle size={56} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold text-navy mb-4">Account Successfully Created</h2>
             <div className="bg-slate-50 border border-slate-100 p-8 rounded-xl max-w-2xl w-full mb-8">
               <p className="text-slate-700 text-lg mb-4">
                 Your details have been submitted. Please wait for <span className="font-bold text-navy">admin approval</span>.
               </p>
               <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-lg flex gap-3 text-left items-start">
                  <span className="material-symbols-outlined mt-0.5">mail</span>
                  <span className="text-sm">You will receive an email notification once your account has been verified and activated by the administration team.</span>
               </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link to="/" className="bg-[#003e73] text-white px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors font-bold flex items-center justify-center gap-2">
                 <Home size={20} /> Back to Home
              </Link>
              <button className="text-[#0d59f2] text-sm font-semibold hover:underline">Having issues? Contact Support</button>
            </div>
          </div>
        </main>
        <SignupFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <SignupHeader />

      <main className="flex-1 flex items-center justify-center p-4 md:py-12">
        <div className="bg-white w-full max-w-6xl shadow-xl flex overflow-hidden rounded-lg min-h-[700px]">
          {/* Left Panel - Form */}
          <div className="flex-1 p-8 md:p-16 flex flex-col relative">
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              {/* Step 1: Personal Information */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-4xl font-bold text-navy mb-10 text-left">Personal<br />Information</h1>
                  
                  <div className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">First name <span className="text-red-500">*</span></label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={getInputClass('firstName')} />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Last name <span className="text-red-500">*</span></label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={getInputClass('lastName')} />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Gender <span className="text-red-500">*</span></label>
                      <div className={`flex gap-6 mt-2 ${errors.gender ? 'text-red-500' : ''}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="gender" value="Male" onChange={handleChange} checked={formData.gender === 'Male'} className="w-4 h-4 text-[#0d59f2] focus:ring-[#0d59f2]" />
                          <span className="text-slate-600 text-sm">Male</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="gender" value="Female" onChange={handleChange} checked={formData.gender === 'Female'} className="w-4 h-4 text-[#0d59f2] focus:ring-[#0d59f2]" />
                          <span className="text-slate-600 text-sm">Female</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={getInputClass('dob')} />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={getInputClass('phone')} />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Picture</label>
                      <div className="relative cursor-pointer hover:bg-slate-50 transition-colors border border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-white">
                        <Upload className="text-[#0d59f2] mb-2" size={24} />
                        <span className="text-sm text-slate-500">Click to upload passport</span>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Academic Details */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-4xl font-bold text-navy mb-10 text-left">Academic<br />Details</h1>
                  
                  <div className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">PH Code <span className="text-red-500">*</span></label>
                      <input type="text" name="phCode" value={formData.phCode} onChange={handleChange} className={getInputClass('phCode')} />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Highest Qualification <span className="text-red-500">*</span></label>
                       <select name="qualification" value={formData.qualification} onChange={handleChange} className={getInputClass('qualification')}>
                        <option value="" disabled>Select your highest qualification</option>
                        <option>Bachelors Degree</option>
                        <option>Masters Degree</option>
                        <option>Doctorate (PhD)</option>
                        <option>Professional Certification</option>
                        <option>HND</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Brief Bio <span className="text-red-500">*</span></label>
                      <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Brief description of expertise" className={`${getInputClass('bio')} min-h-[120px] resize-none`}></textarea>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Location Details */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-4xl font-bold text-navy mb-10 text-left">Location<br />Details</h1>
                  
                  <div className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Country <span className="text-red-500">*</span></label>
                      <select name="country" value={formData.country} onChange={handleChange} className={getInputClass('country')}>
                        <option value="" disabled>select your country</option>
                        {countryOptions.map(country => (
                          <option key={country.value} value={country.value}>{country.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{stateLabel} <span className="text-red-500">*</span></label>
                      {selectedStateOptions.length > 0 ? (
                        <select name="state" value={formData.state} onChange={handleChange} className={getInputClass('state')}>
                          <option value="" disabled>select your state of origin</option>
                          {selectedStateOptions.map(stateName => (
                            <option key={stateName} value={stateName}>{stateName}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="Enter your state or region"
                          className={getInputClass('state')}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Account Security */}
              {step === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-4xl font-bold text-navy mb-10 text-left">Account<br />Security</h1>
                  
                  <div className="space-y-5 max-w-lg">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter a functional email" className={getInputClass('email')} />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Login password <span className="text-red-500">*</span></label>
                      <div className="relative">
                         <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Create a strong password" className={getInputClass('password')} />
                         <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                           {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm password <span className="text-red-500">*</span></label>
                       <div className="relative">
                         <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Put same password" className={getInputClass('confirmPassword')} />
                         {formData.confirmPassword && formData.password !== formData.confirmPassword && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-red-500 text-xs">No match</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                       <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} className={`w-4 h-4 rounded border-slate-300 text-[#0d59f2] focus:ring-[#0d59f2] ${errors.consent ? 'ring-2 ring-red-500' : ''}`} />
                       <span className={`text-xs ${errors.consent ? 'text-red-500 font-bold' : 'text-slate-500'}`}>Terms of Service & Privacy Policy Consent <span className="text-red-500">*</span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-auto pt-10 flex flex-col md:flex-row items-center justify-between max-w-lg relative">

                {/* Global Error Message */}
                {globalError && (
                  <div className="absolute -top-12 left-0 w-full bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle size={16} />
                    {globalError}
                  </div>
                )}

                <div className="flex gap-2 mb-6 md:mb-0">
                  {[1, 2, 3, 4].map(i => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full border border-[#0d59f2] transition-colors ${i === step ? 'bg-[#0d59f2]' : 'bg-transparent'}`}
                    ></div>
                  ))}
                </div>

                {step < 4 ? (
                  <button 
                    type="button" 
                    onClick={handleNext} 
                    className="bg-[#003e73] text-white px-10 py-3 rounded-full hover:bg-blue-800 transition-colors font-bold w-full md:w-auto"
                  >
                    Next
                  </button>
                ) : (
                   <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#003e73] text-white px-10 py-3 rounded-full hover:bg-blue-800 transition-colors font-bold w-full md:w-auto shadow-lg flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Processing...' : 'Submit'}
                  </button>
                )}
              </div>

            </form>
          </div>

          {/* Right Panel - Decorative */}
          <div className="hidden md:block w-1/4 bg-[#003e73]"></div>
        </div>
      </main>

      <SignupFooter />
    </div>
  );
};

// Reusable Header Component for Signup Pages
const SignupHeader = () => (
  <header className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
    <Link to="/" className="flex items-center gap-2 group">
      <img src="/logo.png" alt="PRICE Logo" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
      <span className="text-xl font-bold text-navy">PRICE <span className="text-[#0d59f2]">E-Classroom</span></span>
    </Link>
    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
      <Link to="/" className="hover:text-[#0d59f2]">Home</Link>
      <Link to="/join" className="hover:text-[#0d59f2]">Sign up</Link>
      <Link to="/login" className="bg-[#0d59f2] text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors">
        Login
      </Link>
    </nav>
  </header>
);

// Reusable Footer Component for Signup Pages
const SignupFooter = () => (
  <footer className="bg-[#0d59f2] text-white py-4 px-8 mt-auto w-full">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs">
      <div className="flex gap-4 mb-2 md:mb-0">
         <Linkedin size={16} />
         <Facebook size={16} />
      </div>
      <p>© 2024 Peace House Revival Labors. All Rights Reserved.</p>
    </div>
  </footer>
);

export default InstructorSignup;
