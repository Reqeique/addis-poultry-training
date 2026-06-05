'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, User, Lock, BellRing, Settings2, X, ChevronRight, Phone, Mail, Sparkles } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile, setProfile } = useAuthStore();
  const { isAmharic, setIsAmharic } = useAppStore();

  // Active modal control
  const [activeModal, setActiveModal] = useState<'profile' | 'notifications' | 'privacy' | 'preferences' | null>(null);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [updating, setUpdating] = useState(false);

  // Toggle states
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setFocusArea(profile.focusArea || '');
    }
  }, [profile]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          focus_area: focusArea.trim(),
        })
        .eq('id', profile.uid);

      if (error) throw error;

      // Update local state store
      setProfile({
        ...profile,
        displayName: displayName.trim(),
        focusArea: focusArea.trim(),
      });

      showToast('Profile updated successfully!');
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Preferences updated successfully!');
    setActiveModal(null);
  };

  const navItems = [
    { icon: User, label: 'Account Profile', description: 'Update your personal info', onClick: () => setActiveModal('profile') },
    { icon: BellRing, label: 'Notifications', description: 'Configure alert preferences', onClick: () => setActiveModal('notifications') },
    { icon: Lock, label: 'Privacy & Security', description: 'Password and security settings', onClick: () => setActiveModal('privacy') },
    { icon: Settings2, label: 'App Preferences', description: 'Language and themes', onClick: () => setActiveModal('preferences') },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background-light font-sans text-slate-900 pb-24">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 bg-slate-900/95 backdrop-blur-md border border-[#8DEC71]/30 text-white rounded-full text-sm font-bold shadow-xl animate-in fade-in slide-in-from-top duration-300">
          {toastMessage}
        </div>
      )}

      <header className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 mb-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage your app configurations</p>
      </header>
      <main className="px-6 flex-1 flex flex-col items-center">
        
        <div className="w-full max-w-sm mb-8 flex flex-col gap-3">
          {navItems.map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/50 transition-colors shadow-sm text-left">
              <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                <item.icon className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-[15px]">{item.label}</h3>
                <p className="text-xs text-slate-500 font-medium">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>

        <button 
          onClick={handleLogout}
          className="flex w-full max-w-sm items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-red-200 text-red-500 font-bold hover:bg-red-50 transition-colors shadow-sm mb-6"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>

        {profile && (
          <p className="text-xs text-slate-400 mt-2 font-medium">Logged in as {profile.email || profile.phoneNumber}</p>
        )}
      </main>

      {/* MODALS */}

      {/* 1. PROFILE MODAL */}
      {activeModal === 'profile' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form 
            onSubmit={handleSaveProfile}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 p-6"
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Account Profile</h2>
              <button type="button" onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Full Name</label>
                <input 
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-primary focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Expert Focus Area</label>
                <input 
                  type="text"
                  required
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-primary focus:outline-none bg-slate-50/50"
                  placeholder="e.g. Brooding Management"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={updating}
              className="mt-8 w-full h-14 bg-primary text-primary-dark font-bold rounded-full transition-transform active:scale-[0.98] flex items-center justify-center disabled:opacity-50"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* 2. NOTIFICATIONS MODAL */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form 
            onSubmit={handleSavePreferences}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
              <button type="button" onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-5 my-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">SMS Inquiry Alerts</h3>
                  <p className="text-xs text-slate-500 font-medium">Text when trainee submits urgent issue</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSmsAlerts(!smsAlerts)}
                  className={`w-12 h-7 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer outline-none ${smsAlerts ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`size-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${smsAlerts ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Email Reports</h3>
                  <p className="text-xs text-slate-500 font-medium">Daily trainee performance updates</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`w-12 h-7 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer outline-none ${emailAlerts ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`size-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${emailAlerts ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Weekly Roster Digests</h3>
                  <p className="text-xs text-slate-500 font-medium">Roster stats and inactive alarms</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setWeeklyDigest(!weeklyDigest)}
                  className={`w-12 h-7 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer outline-none ${weeklyDigest ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`size-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${weeklyDigest ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="mt-8 w-full h-14 bg-primary text-primary-dark font-bold rounded-full transition-transform active:scale-[0.98]"
            >
              Save Alert Preferences
            </button>
          </form>
        </div>
      )}

      {/* 3. PRIVACY & SECURITY MODAL */}
      {activeModal === 'privacy' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Privacy & Security</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Roster Locking</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Only trainees pre-authenticated by you can register. Unknown phone numbers are blocked from signup.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Secure Media Uploads</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Media items are stored in custom Cloudflare R2 bucket with 1-hour secure presigned token expirations to prevent public exposure.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. APP PREFERENCES (LANGUAGE) MODAL */}
      {activeModal === 'preferences' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">App Preferences</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-3">Language Selector</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setIsAmharic(false); showToast('Language changed to English'); }}
                    className={`h-12 rounded-xl font-bold border-2 transition-all ${!isAmharic ? 'border-primary bg-primary/10 text-primary-dark' : 'border-slate-100 text-slate-500'}`}
                  >
                    English
                  </button>
                  <button 
                    onClick={() => { setIsAmharic(true); showToast('ቋንቋው ወደ አማርኛ ተቀይሯል'); }}
                    className={`h-12 rounded-xl font-bold border-2 transition-all ${isAmharic ? 'border-primary bg-primary/10 text-primary-dark' : 'border-slate-100 text-slate-500'}`}
                  >
                    አማርኛ (Amharic)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TrainerBottomNav />
    </div>
  );
}
