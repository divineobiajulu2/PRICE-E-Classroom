import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin, Lock, Save, Camera, Shield, Power, UserPlus } from 'lucide-react';
import { db } from '../../services/database';
import { UserRole, normalizeUserRole } from '../../types';

const Settings: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', bio: '', currentPassword: '', newPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Admin Settings
  const [adminSettings, setAdminSettings] = useState({ allowRegistration: true, maintenanceMode: false });

  useEffect(() => {
    const currentUser = db.auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setFormData({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
        currentPassword: '',
        newPassword: ''
      });
      
      if (normalizeUserRole(currentUser.role) === UserRole.ADMIN) {
          setAdminSettings(db.admin.getSettings());
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && user) {
          try {
              const base64 = await db.utils.fileToBase64(file);
              db.auth.updateUser(user.id, { avatar: base64 });
              setUser({ ...user, avatar: base64 }); // Update local state immediately
          } catch (err) {
              console.error(err);
              alert("Failed to upload image");
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      if (user) {
        db.auth.updateUser(user.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          bio: formData.bio
        });
        
        if (normalizeUserRole(user.role) === UserRole.ADMIN) {
            db.admin.updateSettings(adminSettings);
        }

        setMessage('Settings updated successfully!');
        setIsSaving(false);
        setTimeout(() => setMessage(''), 3000);
      }
    }, 1000);
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-navy mb-8">Account Settings</h1>

      {message && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined">check_circle</span>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleImageUpload} 
               className="hidden" 
               accept="image/*"
            />
            <div 
               className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer"
               onClick={() => fileInputRef.current?.click()}
            >
              <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-slate-50" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-navy">{user.firstName} {user.lastName}</h2>
            <p className="text-slate-500 text-sm mb-4">{user.role}</p>
            <div className="text-left space-y-3 mt-6 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-3 text-slate-600 text-sm">
                 <Mail size={16} /> {user.email}
               </div>
               <div className="flex items-center gap-3 text-slate-600 text-sm">
                 <MapPin size={16} /> {user.state || 'Lagos'}, {user.country || 'Nigeria'}
               </div>
            </div>
          </div>
          
          {normalizeUserRole(user.role) === UserRole.ADMIN && (
              <div className="bg-navy text-white rounded-xl shadow-sm p-6 mt-6">
                 <h3 className="font-bold flex items-center gap-2 mb-4"><Shield size={18} /> Admin Controls</h3>
                 <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                       <span className="text-sm font-medium flex items-center gap-2"><UserPlus size={16} /> Allow Registrations</span>
                       <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                         <input type="checkbox" checked={adminSettings.allowRegistration} onChange={() => setAdminSettings(s => ({...s, allowRegistration: !s.allowRegistration}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{right: adminSettings.allowRegistration ? '0' : 'auto', left: adminSettings.allowRegistration ? 'auto' : '0'}}/>
                         <span className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${adminSettings.allowRegistration ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                       </div>
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                       <span className="text-sm font-medium flex items-center gap-2"><Power size={16} /> Maintenance Mode</span>
                       <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                         <input type="checkbox" checked={adminSettings.maintenanceMode} onChange={() => setAdminSettings(s => ({...s, maintenanceMode: !s.maintenanceMode}))} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{right: adminSettings.maintenanceMode ? '0' : 'auto', left: adminSettings.maintenanceMode ? 'auto' : '0'}}/>
                         <span className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${adminSettings.maintenanceMode ? 'bg-red-500' : 'bg-slate-600'}`}></span>
                       </div>
                    </label>
                 </div>
              </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-navy mb-6">General Information</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-primary focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-primary focus:border-primary outline-none" />
              </div>
            </div>

            <div className="mb-4">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
               <div className="relative">
                 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded text-sm focus:ring-primary focus:border-primary outline-none" />
               </div>
            </div>

            <div className="mb-6">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bio / About</label>
               <textarea name="bio" value={formData.bio} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded text-sm h-24 resize-none focus:ring-primary focus:border-primary outline-none"></textarea>
            </div>

            <h3 className="text-lg font-bold text-navy mb-4 pt-6 border-t border-slate-100">Security</h3>
            
            <div className="mb-4">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded text-sm focus:ring-primary focus:border-primary outline-none" />
               </div>
            </div>

            <div className="mb-6">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded text-sm focus:ring-primary focus:border-primary outline-none" />
               </div>
            </div>

            <div className="flex justify-end">
               <button type="submit" disabled={isSaving} className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                 {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
