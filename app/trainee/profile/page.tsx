'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, User, Lock, BellRing, Settings2, HelpCircle, Sparkles, CheckCircle2, X, MapPin, Scale, ChevronRight, Phone } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { TraineeBottomNav } from '@/components/TraineeBottomNav';
import { launchTelebirr } from '@/hooks/useTelebirr';

export default function TraineeProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { isAmharic, setIsAmharic } = useAppStore();
  const { profile, setProfile } = useAuthStore();

  // Active modal control
  const [activeModal, setActiveModal] = useState<'info' | 'notifications' | 'help' | null>(null);

  // Form states for Personal Info
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [flockCount, setFlockCount] = useState(0);
  const [focusArea, setFocusArea] = useState('');
  const [updating, setUpdating] = useState(false);

  // Notifications states
  const [prefPush, setPrefPush] = useState(true);
  const [prefSMS, setPrefSMS] = useState(false);
  const [prefWeekly, setPrefWeekly] = useState(true);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');

  // Sync state with profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setLocation(profile.location || '');
      setFarmSize(profile.farmSize || '');
      setFlockCount(profile.flockCount || 0);
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

  const toggleLanguage = () => {
    setIsAmharic(!isAmharic);
    showToast(isAmharic ? 'Language changed to English' : 'ቋንቋው ወደ አማርኛ ተቀይሯል');
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          location: location.trim(),
          farm_size: farmSize.trim(),
          flock_count: flockCount,
          focus_area: focusArea.trim(),
        })
        .eq('id', profile.uid);

      if (error) throw error;

      // Update local state store
      setProfile({
        ...profile,
        displayName: displayName.trim(),
        location: location.trim(),
        farmSize: farmSize.trim(),
        flockCount: flockCount,
        focusArea: focusArea.trim(),
      });

      showToast(isAmharic ? 'መረጃዎ በስኬት ተዘምኗል' : 'Personal info updated successfully!');
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(isAmharic ? 'ምርጫዎችዎ ተቀምጠዋል' : 'Notification preferences saved!');
    setActiveModal(null);
  };

  const navItems = [
    { icon: User, label: isAmharic ? 'የግል መረጃ' : 'Personal Info', description: isAmharic ? 'ስም፣ አካባቢ እና እርሻ' : 'Name, location and farm details', onClick: () => setActiveModal('info') },
    { icon: BellRing, label: isAmharic ? 'ማሳወቂያዎች' : 'Notifications', description: isAmharic ? 'የማሳወቂያ ምርጫዎች' : 'Alert preferences', onClick: () => setActiveModal('notifications') },
    { icon: Settings2, label: isAmharic ? 'የቋንቋ ምርጫ' : 'Language', description: isAmharic ? 'አማርኛ' : 'English', onClick: toggleLanguage },
    { icon: HelpCircle, label: isAmharic ? 'እርዳታ' : 'Help & Support', description: isAmharic ? 'ጥያቄዎች እና ድጋፍ' : 'FAQs and priority support', onClick: () => setActiveModal('help') },
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
        <h1 className="text-2xl font-bold tracking-tight">{isAmharic ? 'መገለጫ' : 'Profile'}</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">{isAmharic ? 'የመተግበሪያ ቅንብሮች ያቀናብሩ' : 'Manage your app settings'}</p>
      </header>
      <main className="px-6 flex-1 flex flex-col items-center">
        
        {/* PREMIUM UPGRADE CARD */}
        <div className="w-full max-w-sm p-6 mb-8 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl relative overflow-hidden border border-slate-800/80 hover:shadow-2xl hover:border-primary/50 transition-all duration-300 group">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500"></div>
          <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl"></div>

          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary/20 p-2 rounded-xl text-primary flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-[#8DEC71]" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-widest text-[#8DEC71] uppercase">{isAmharic ? 'ፕሪሚየም ዕቅድ' : 'PREMIUM PLAN'}</span>
              <h2 className="text-xl font-black tracking-tight mt-0.5">{isAmharic ? 'አዲስ ፖልትሪ ፕሪሚየም' : 'Addis Poultry Premium'}</h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 font-medium mb-5 leading-relaxed">
            {isAmharic 
              ? 'ተጨማሪ የባለሙያ ምክሮችን እና ልዩ ስልጠናዎችን ለማግኘት አሁኑኑ ያሻሽሉ!' 
              : 'Upgrade today to unlock direct advice, customized tools, and standard premium courses!'}
          </p>

          <ul className="flex flex-col gap-2.5 mb-6">
            <li className="flex items-center gap-2.5 text-xs text-slate-200 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#8DEC71] shrink-0" />
              <span>{isAmharic ? 'የባለሙያ የቪዲዮ ምክክር' : 'Direct advisory consultations'}</span>
            </li>
            <li className="flex items-center gap-2.5 text-xs text-slate-200 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#8DEC71] shrink-0" />
              <span>{isAmharic ? 'ፕሪሚየም የአስተዳደር መመሪያዎች' : 'Premium brooding tutorials'}</span>
            </li>
            <li className="flex items-center gap-2.5 text-xs text-slate-200 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#8DEC71] shrink-0" />
              <span>{isAmharic ? '24/7 ቀጥተኛ የድጋፍ መስመር' : '24/7 Priority support hotline'}</span>
            </li>
          </ul>

          <div className="flex items-end justify-between border-t border-slate-800 pt-5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase">{isAmharic ? 'ዋጋ' : 'INVESTMENT'}</span>
              <span className="text-2xl font-black tracking-tight text-white">1,000 ETB</span>
              <span className="text-xs text-slate-400 font-bold"> / {isAmharic ? 'በወር' : 'mo'}</span>
            </div>
            
            <button
              onClick={launchTelebirr}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.97] transition-all font-black text-xs text-white shadow-lg shadow-sky-500/25 flex items-center gap-2"
            >
              <span>{isAmharic ? 'በቴሌብር ይክፈሉ' : 'Pay with Telebirr'}</span>
            </button>
          </div>
        </div>

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
          className="flex w-full max-w-sm items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-red-200 text-red-500 font-bold hover:bg-red-50 transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          {isAmharic ? 'ውጣ' : 'Log Out'}
        </button>
      </main>

      {/* MODALS */}
      
      {/* 1. PERSONAL INFO MODAL */}
      {activeModal === 'info' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form 
            onSubmit={handleSaveInfo}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 p-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{isAmharic ? 'የግል መረጃን ማስተካከል' : 'Personal Info'}</h2>
              <button type="button" onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{isAmharic ? 'ሙሉ ስም' : 'Full Name'}</label>
                <input 
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-primary focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{isAmharic ? 'የትኩረት አቅጣጫ' : 'Focus Area'}</label>
                <input 
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-primary focus:outline-none bg-slate-50/50"
                  placeholder="e.g. Broilers, Layers, General"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{isAmharic ? 'አካባቢ' : 'Location'}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-primary focus:outline-none bg-slate-50/50"
                    placeholder="City / Region"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{isAmharic ? 'የእርሻ መጠን' : 'Farm Size'}</label>
                  <div className="relative">
                    <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-primary focus:outline-none bg-slate-50/50"
                      placeholder="e.g. 1.5 Acres"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{isAmharic ? 'የዶሮዎች ብዛት' : 'Flock Count'}</label>
                  <input 
                    type="number"
                    min="0"
                    value={flockCount}
                    onChange={(e) => setFlockCount(Number(e.target.value))}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-primary focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={updating}
              className="mt-8 w-full h-14 bg-primary text-primary-dark font-bold rounded-full transition-transform active:scale-[0.98] flex items-center justify-center disabled:opacity-50"
            >
              {updating ? 'Saving...' : (isAmharic ? 'መረጃውን አስቀምጥ' : 'Save Changes')}
            </button>
          </form>
        </div>
      )}

      {/* 2. NOTIFICATIONS MODAL */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <form 
            onSubmit={handleSaveNotifications}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
          >
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{isAmharic ? 'የማሳወቂያ ቅንብሮች' : 'Alert Preferences'}</h2>
              <button type="button" onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-5 my-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{isAmharic ? 'ፈጣን ማሳወቂያዎች' : 'Push Notifications'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{isAmharic ? 'ለአሰልጣኝ መልእክቶች' : 'Immediate response alerts'}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setPrefPush(!prefPush)}
                  className={`w-12 h-7 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer outline-none ${prefPush ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`size-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${prefPush ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{isAmharic ? 'የኤስኤምኤስ መልእክቶች' : 'SMS Inquiry Updates'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{isAmharic ? 'በስልክዎ አጭር ፅሁፍ' : 'Inquiry status texts'}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setPrefSMS(!prefSMS)}
                  className={`w-12 h-7 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer outline-none ${prefSMS ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`size-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${prefSMS ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{isAmharic ? 'ሳምንታዊ ሪፖርቶች' : 'Weekly Performance Reports'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{isAmharic ? 'የእርሻ አስተዳደር ምክሮች' : 'Brooding efficiency metrics'}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setPrefWeekly(!prefWeekly)}
                  className={`w-12 h-7 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer outline-none ${prefWeekly ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <div className={`size-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${prefWeekly ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="mt-8 w-full h-14 bg-primary text-primary-dark font-bold rounded-full transition-transform active:scale-[0.98]"
            >
              {isAmharic ? 'አስቀምጥ' : 'Save Preferences'}
            </button>
          </form>
        </div>
      )}

      {/* 3. HELP & SUPPORT MODAL */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{isAmharic ? 'እርዳታ እና ድጋፍ' : 'Help & Support'}</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <h4 className="font-bold text-slate-900 text-sm mb-1">How do I submit video inquiries?</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Go to Home, write a description, tap the &quot;Video&quot; button to select a clip under 60 seconds, and tap &quot;Send to Trainer&quot;. We will compress and upload it to our secure R2 bucket.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <h4 className="font-bold text-slate-900 text-sm mb-1">How do I contact my trainer directly?</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Tap the green chat button in the center of the bottom navigation bar to open the direct message feed with your assigned trainer.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <h4 className="font-bold text-slate-900 text-sm mb-1">What does Premium plan offer?</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Premium provides priority advisory support, video consultations, and premium brooding spreadsheets. Upgrades are processed securely through Telebirr.
                </p>
              </div>

              <a 
                href="tel:+251911223344"
                className="mt-4 w-full h-14 border-2 border-primary hover:bg-primary/5 text-primary-dark font-bold rounded-full flex items-center justify-center gap-2 text-sm transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>{isAmharic ? 'ስልክ በመደወል ድጋፍ ያግኙ' : 'Call Support Line'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {profile && (
        <p className="text-xs text-slate-400 mt-8 font-medium text-center">
          {isAmharic ? 'በዚህ ገብተዋል፡' : 'Logged in as'} {profile.email || profile.phoneNumber}
        </p>
      )}

      <TraineeBottomNav isAmharic={isAmharic} />
    </div>
  );
}
