import React, { useState } from 'react';
import { X, Mail, Lock, Briefcase } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { adminService } from '../services/api';
import { UserRole, normalizeUserRole } from '../types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'INTERN',
    matricNumber: '',
    phCode: '',
    setNumber: '',
    stream: ''
  });

  const deriveSetFromMatric = (matric: string) => {
    const match = String(matric || '').match(/\d+/);
    return match ? match[0] : '';
  };

  const isValidMatricFormat = (value: string) => /^[A-Za-z]{2}\/\d{2}\/\d{3}$/.test(String(value || '').trim());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'matricNumber' ? { setNumber: deriveSetFromMatric(value) } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        showToast('Please fill in all required fields', 'error');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        showToast('Passwords do not match', 'error');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        setIsLoading(false);
        return;
      }

      const normalizedRole = normalizeUserRole(formData.role);
      if (normalizedRole === UserRole.INTERN) {
        if (!formData.matricNumber) {
          showToast('Matric number is required for interns.', 'error');
          setIsLoading(false);
          return;
        }
        if (!formData.setNumber) {
          showToast('Set number is required for interns.', 'error');
          setIsLoading(false);
          return;
        }
        if (!formData.stream) {
          showToast('Study stream is required for interns.', 'error');
          setIsLoading(false);
          return;
        }
      }

      if (normalizedRole === UserRole.INSTRUCTOR && !formData.phCode) {
        showToast('PH Code is required for instructors.', 'error');
        setIsLoading(false);
        return;
      }

      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(normalizedRole === UserRole.INTERN && {
          matricNumber: formData.matricNumber,
          setNumber: formData.setNumber || 'Set 12-A',
          stream: formData.stream || 'General'
        }),
        ...(normalizedRole === UserRole.INSTRUCTOR && {
          phCode: formData.phCode,
        })
      };

      await adminService.createUser(userData);

      showToast(`User ${formData.email} created successfully!`, 'success', 3000);

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'INTERN',
        matricNumber: '',
        phCode: '',
        setNumber: '',
        stream: ''
      });

      onUserAdded();
      onClose();
    } catch (error: any) {
      console.error('Create user error:', error);
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-navy dark:text-white">Add New User</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
            <div className="relative">
              <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select name="role" value={formData.role} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer">
                <option value="INTERN">Student/Intern</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          </div>

          {normalizeUserRole(formData.role) === UserRole.INTERN && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Matric Number</label>
                <input type="text" name="matricNumber" value={formData.matricNumber} onChange={handleChange} placeholder="e.g., PC/24/001" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                {formData.matricNumber && (
                  isValidMatricFormat(formData.matricNumber) ? (
                    <p className="text-xs text-green-600 mt-1">Valid format</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">Format must be XX/00/000 (e.g. PC/24/001)</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Set Number</label>
                <input type="text" name="setNumber" value={formData.setNumber ? `Set ${formData.setNumber}` : ''} readOnly placeholder="Autodetected from matric number" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Stream</label>
                <select name="stream" value={formData.stream} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer">
                  <option value="">Select Stream</option>
                  <option value="mechatronics">Mechatronics</option>
                  <option value="ict">I.C.T</option>
                  <option value="pls">Physical & Life Sciences</option>
                </select>
              </div>
            </>
          )}

          {normalizeUserRole(formData.role) === UserRole.INSTRUCTOR && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">PH Code</label>
              <input type="text" name="phCode" value={formData.phCode} onChange={handleChange} placeholder="e.g., ABC01" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="********" className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm Password *</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="********" className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
