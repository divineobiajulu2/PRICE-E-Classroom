import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Linkedin, Upload, Eye, EyeOff, CheckCircle, AlertCircle, Home, Clock } from 'lucide-react';
import { authService } from '../../services/api';

type SignupFormData = {
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  phone: string;
  matricNo: string;
  setNo: string;
  admissionYear: string;
  stream: string;
  country: string;
  state: string;
  email: string;
  password: string;
  confirmPassword: string;
  guardianName: string;
  guardianEmail: string;
  consent: boolean;
  profilePhoto: File | null;
  profilePhotoPreviewUrl: string;
};

const InternSignup: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    phone: '',
    matricNo: '',
    setNo: '',
    admissionYear: '',
    stream: '',
    country: '',
    state: '',
    email: '',
    password: '',
    confirmPassword: '',
    guardianName: '',
    guardianEmail: '',
    consent: false,
    profilePhoto: null,
    profilePhotoPreviewUrl: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, boolean>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name } = target;
    const val: string | boolean = target.type === 'checkbox' ? target.checked : target.value;
    setFormData(prev => ({
      ...prev,
      [name as keyof SignupFormData]: val as any,
      ...(name === 'country' ? { state: '' } : {}),
      ...(name === 'matricNo' ? { setNo: deriveSetFromMatric(String(val)) } : {}),
    }));
    if (errors[name as keyof SignupFormData]) {
      setErrors(prev => ({ ...prev, [name as keyof SignupFormData]: false }));
    }
    if (globalError) setGlobalError('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setFormData(prev => ({ ...prev, profilePhoto: null, profilePhotoPreviewUrl: '' }));
      return;
    }

    if (file.size > 1048576) {
      setFormData(prev => ({ ...prev, profilePhoto: null, profilePhotoPreviewUrl: '' }));
      e.target.value = '';
      setGlobalError('Image must be 1MB or less.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, profilePhoto: file, profilePhotoPreviewUrl: previewUrl }));
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

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const deriveSetFromMatric = (matric: string) => {
    const digits = String(matric || '').match(/\d+/);
    return digits ? digits[0] : '';
  };

  const isValidMatricFormat = (value: string) => /^[A-Za-z]{2}\/\d{2}\/\d{3}$/.test(String(value || '').trim());

  const getStreamLabel = (stream: string) => {
    if (stream === 'mechatronics') return 'Mechatronics';
    if (stream === 'ict') return 'I.C.T';
    if (stream === 'pls') return 'Physical & Life Sciences';
    return stream || 'N/A';
  };

  const getSetLabel = (setNo: string) => {
    return setNo ? `Set ${setNo}` : 'Auto-detect from matric number';
  };

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
      if (!formData.matricNo) newErrors.matricNo = true;
      if (!formData.admissionYear) newErrors.admissionYear = true;
      if (!formData.stream) newErrors.stream = true;
    } else if (currentStep === 3) {
      if (!formData.country) newErrors.country = true;
      if (!formData.state) newErrors.state = true;
    } else if (currentStep === 4) {
      if (!formData.email) newErrors.email = true;
      if (!formData.password) newErrors.password = true;
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = true;
      if (!formData.guardianName) newErrors.guardianName = true;
      if (!formData.guardianEmail) newErrors.guardianEmail = true;
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

  const handleToReview = () => {
    if (validateStep(4)) {
      setGlobalError('');
      window.scrollTo(0, 0);
      setStep(5);
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
          role: 'Intern',
          setNumber: formData.setNo,
          stream: formData.stream,
          matricNo: formData.matricNo,
          admissionYear: formData.admissionYear ? String(formData.admissionYear) : undefined,
          gender: formData.gender,
          dob: formData.dob,
          country: formData.country,
          state: formData.state,
          profilePhoto: formData.profilePhoto || undefined,
        });
        setIsSubmitted(true);
        window.scrollTo(0, 0);
      } catch (err: any) {
        setGlobalError(err.message || 'Signup failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getInputClass = (fieldName: keyof SignupFormData) => `
    w-full border rounded p-3 focus:outline-none focus:ring-1 transition-all bg-white
    ${errors[fieldName] ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[#e2e8f0] focus:border-[#0d59f2] focus:ring-[#0d59f2]/20'}
  `;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <SignupHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl shadow-sm flex flex-col items-center justify-center p-12 text-center rounded-lg min-h-[500px]">
            <div className="w-24 h-24 bg-blue-50 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm animate-bounce">
              <Clock size={56} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold text-navy mb-4">Registration Submitted</h2>
            <div className="bg-slate-50 border border-slate-100 p-8 rounded-xl max-w-2xl w-full mb-8">
              <p className="text-slate-700 text-lg mb-4">
                Your account has been created successfully and is currently <span className="font-bold text-primary">Pending Approval</span>.
              </p>
              <p className="text-slate-500 text-sm">
                An administrator will review your details. You will receive an email notification once your account is active.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/" className="bg-[#003e73] text-white px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors font-bold flex items-center justify-center gap-2">
                <Home size={20} /> Return to Home
              </Link>
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
          <div className="flex-1 p-8 md:p-16 flex flex-col relative">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
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
                      <div className="space-y-3">
                        <div className="relative border border-dashed border-slate-300 rounded-lg p-4 bg-white hover:border-primary transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center py-8">
                            <Upload className="text-[#0d59f2] mb-2" size={24} />
                            <span className="text-sm text-slate-500">Choose an image under 1MB</span>
                          </div>
                        </div>
                        {formData.profilePhotoPreviewUrl && (
                          <div className="flex items-center gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
                            <img src={formData.profilePhotoPreviewUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                            <div>
                              <p className="font-semibold text-slate-700">Selected image</p>
                              <p className="text-sm text-slate-500">{formData.profilePhoto?.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-4xl font-bold text-navy mb-10 text-left">Academic<br />Details</h1>
                  <div className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Matric Number <span className="text-red-500">*</span></label>
                      <input type="text" name="matricNo" value={formData.matricNo} onChange={handleChange} placeholder="e.g. PC/24/001" className={getInputClass('matricNo')} />
                      {formData.matricNo && (
                        isValidMatricFormat(formData.matricNo) ? (
                          <p className="text-xs text-green-600 mt-1">✓ Valid format</p>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">Format must be XX/00/000 (e.g. PC/24/001)</p>
                        )
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Set Number</label>
                      <input
                        type="text"
                        name="setNo"
                        readOnly
                        value={formData.setNo ? `Set ${formData.setNo}` : ''}
                        placeholder="Autodetected from matric number"
                        className={`${getInputClass('setNo')} bg-slate-100 text-slate-500 cursor-not-allowed`}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {formData.setNo ? `Derives from matric number: Set ${formData.setNo}` : 'Enter your matric number to derive your set automatically.'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Year of admission <span className="text-red-500">*</span></label>
                      <input type="number" name="admissionYear" min={2000} max={2100} value={formData.admissionYear} onChange={handleChange} className={getInputClass('admissionYear')} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Study Stream <span className="text-red-500">*</span></label>
                      <select name="stream" value={formData.stream} onChange={handleChange} className={getInputClass('stream')}>
                        <option value="" disabled>select your stream</option>
                        <option value="mechatronics">Mechatronics</option>
                        <option value="ict">I.C.T</option>
                        <option value="pls">Physical & Life Sciences</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

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
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Parent/Guardian name <span className="text-red-500">*</span></label>
                      <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} className={getInputClass('guardianName')} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Parent/Guardian Email <span className="text-red-500">*</span></label>
                      <input type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleChange} className={getInputClass('guardianEmail')} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} className={`w-4 h-4 rounded border-slate-300 text-[#0d59f2] focus:ring-[#0d59f2] ${errors.consent ? 'ring-2 ring-red-500' : ''}`} />
                      <span className={`text-xs ${errors.consent ? 'text-red-500 font-bold' : 'text-slate-500'}`}>Terms of Service & Privacy Policy Consent <span className="text-red-500">*</span></span>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h1 className="text-4xl font-bold text-navy mb-6 text-left">Review Details</h1>
                  <div className="space-y-4 max-w-lg text-sm">
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Name</p>
                      <p className="font-semibold">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Matric Number</p>
                      <p className="font-semibold">{formData.matricNo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Set</p>
                      <p className="font-semibold">{getSetLabel(formData.setNo)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Admission Year</p>
                      <p className="font-semibold">{formData.admissionYear || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Stream</p>
                      <p className="font-semibold">{getStreamLabel(formData.stream)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Email</p>
                      <p className="font-semibold">{formData.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-auto pt-10 flex flex-col md:flex-row items-center justify-between max-w-lg relative">
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

                <div className="flex gap-3 w-full md:w-auto justify-end items-center">
                  {step > 1 && (
                    <button type="button" onClick={handleBack} className="px-6 py-3 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50">Back</button>
                  )}

                  {step < 4 && (
                    <button 
                      type="button" 
                      onClick={handleNext} 
                      className="bg-[#003e73] text-white px-6 py-3 rounded-full hover:bg-blue-800 transition-colors font-bold"
                    >
                      Next
                    </button>
                  )}

                  {step === 4 && (
                    <button type="button" onClick={handleToReview} className="bg-[#0066b3] text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors font-bold">Review</button>
                  )}

                  {step === 5 && (
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#003e73] text-white px-6 py-3 rounded-full hover:bg-blue-800 transition-colors font-bold shadow-lg flex items-center justify-center"
                    >
                      {isSubmitting ? 'Processing...' : 'Submit'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
          <div className="hidden md:block w-1/4 bg-[#003e73]"></div>
        </div>
      </main>

      <SignupFooter />
    </div>
  );
};

const SignupHeader = () => (
  <header className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
    <Link to="/" className="flex items-center gap-2 group">
      <img src="/logo.png" alt="PRICE Logo" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
      <span className="text-xl font-bold text-navy">PRICE <span className="text-[#0d59f2]">E-Classroom</span></span>
    </Link>
    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
      <Link to="/" className="hover:text-[#0d59f2]">Home</Link>
      <Link to="/intern/dashboard" className="hover:text-[#0d59f2]">Dashboard</Link>
      <Link to="/join" className="hover:text-[#0d59f2]">Sign up</Link>
      <Link to="/login" className="bg-[#0d59f2] text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors">
        Login
      </Link>
    </nav>
  </header>
);

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

export default InternSignup;