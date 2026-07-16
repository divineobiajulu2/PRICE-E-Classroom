import React, { useEffect, useState } from 'react';
import { authService } from '../../services/api';
import { normalizeUserRole, User } from '../../types';
import { useToast } from '../../contexts/ToastContext';

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [formData, setFormData] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      const profile = await authService.me().catch(() => authService.getCurrentUser());
        if (!mounted || !profile) return;
        const profileData = profile as User;
        if ((profileData as any).profile_photo_url) setPreview((profileData as any).profile_photo_url);
        setUser(profileData);
        setFormData({
          firstName: profileData.firstName || (profileData as any).first_name || '',
          lastName: profileData.lastName || (profileData as any).last_name || '',
          email: profileData.email || '',
          phone: (profileData as any).phone || (profileData as any).phone_number || '',
        });
    };

    loadProfile();
    return () => { mounted = false; };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      showToast('No user loaded to update.', 'error');
      return;
    }
    const updated: User = {
      ...user,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
    } as User;
    // Persist locally (backend update endpoint not universally available yet)
    localStorage.setItem('userProfile', JSON.stringify(updated));
    setUser(updated);
    showToast('Profile saved locally', 'success', 2500);
  };

  const matricNumber = user?.matricNo ?? 'N/A';
  const setNumber = user?.setNumber ?? 'N/A';
  const stream = user?.stream ?? 'N/A';
  const phCode = user?.phCode ?? 'N/A';
  const admissionYear = user?.admissionYear ? String(user.admissionYear) : 'N/A';
  const roleLabel = normalizeUserRole(user?.role);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy dark:text-white">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">View and verify your account details for your role: <span className="font-semibold">{roleLabel}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white dark:bg-navy border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mb-4">
            {preview ? (
              <img src={preview} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              (formData.firstName || user?.username || 'U').slice(0, 1).toUpperCase()
            )}
          </div>
          <h2 className="text-xl font-bold text-navy dark:text-white">{[formData.firstName, formData.lastName].filter(Boolean).join(' ') || user?.username || 'User'}</h2>
          <p className="text-sm text-slate-500 mt-1">{roleLabel}</p>

          <div className="mt-4 space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Matric Number</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{matricNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Set</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{setNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Stream</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{stream}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">PH Code</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{phCode}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Admission Year</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{admissionYear}</p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 bg-white dark:bg-navy border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profile Photo</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPreview(URL.createObjectURL(f));
                    setUploading(true);
                    try {
                      const resp = await authService.uploadProfilePhoto(f);
                      if (resp && resp.url) {
                        setPreview(resp.url);
                        // update local user (set `avatar` to match our User type)
                        const updated: User = { ...(user as User), avatar: resp.url };
                        localStorage.setItem('userProfile', JSON.stringify(updated));
                        setUser(updated);
                        showToast('Profile photo uploaded', 'success');
                      }
                    } catch (err) {
                      console.error('Upload failed', err);
                      showToast('Failed to upload photo', 'error');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                {uploading && <span className="text-sm text-slate-500">Uploading...</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" className="bg-primary text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-700">
                Save Profile
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
