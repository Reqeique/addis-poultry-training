'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, UserProfile } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Search, Bell, Zap, MessageSquare, Clock, ChevronRight, Plus, Settings, LogOut, Home, Users, BarChart2, TrendingUp, X, Mail, Phone, MapPin, Calendar, Home as FarmIcon } from 'lucide-react';
import Image from 'next/image';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import Link from 'next/link';
import { format } from 'date-fns';

const MOCK_TRAINEES: UserProfile[] = [
  { uid: 't1', email: 'david.mwangi@example.com', phoneNumber: '+254 701 234 567', location: 'Nairobi Region', farmSize: '2 Acres', flockCount: 1500, createdAt: new Date('2023-10-15'), displayName: 'David Mwangi', role: 'trainee', focusArea: 'Breeder', photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrKkDmaDcMTNxR572A-aFLLk__o0XOovMJ1VJs8MIHhW95wXrQ-GGKnG36IBMZjvZ8pMLQ3YVgTkkqWlKhutFloCO_K_bRIlpamgPilNJ8pcxto2lJuqJXZuHowLXPULwuVqF2HPbGcVOn8OV90tAfCYCyvRjmGpz2W4ZomGhfKm1IidUHlC5MIO8Pa3ZpU0pEWCOF-TM1zSE7zrhQ1iPkdy1Oa-8GpDfPoZxsA7jRJaHvPpRaYjGbVldG_-JSBlRDPQlUC7xVw7c' },
  { uid: 't2', email: 'sarah.j@example.com', phoneNumber: '+254 722 987 654', location: 'Kiambu County', farmSize: '1.5 Acres', flockCount: 800, createdAt: new Date('2024-01-20'), displayName: 'Sarah Johnson', role: 'trainee', focusArea: 'Broilers', photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjKEK-D5hM57k7T3tVefYS55bb77bY7ADNwThjXbcfeaE6eixbQmdj7HGisV2zz2ojF6gYQ2ek35zT8zL3uwTji0dqcDcuX8L8o_G93F4raXQwAlTTl2K9idjBxZ1cGro6pDebnkHBa5ANMLoigDjze3K6FW1p1yyCrWKYozGb1knNt97Vc6mZNBZsE_7PRY_w5e2mZLjQ99pNT8Fz9IfQUFKlgM9Mp2OOM3IhHpaTZSw2BenMDr2UrGTYMQybU11wubll4kTszKE' },
  { uid: 't3', email: 'anita.peters@example.com', phoneNumber: '+254 733 456 789', location: 'Nakuru Town', farmSize: '3 Acres', flockCount: 2500, createdAt: new Date('2024-02-10'), displayName: 'Anita Peters', role: 'trainee', focusArea: 'Layers', photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_hPuCc3495XzKOPJdx2Hs9K2CVYkJtCPkgL7XA0SYaz2bItJXAjyM0cYh-y1vWKB02mCFnfatdCtYmmgkBzptELwW74Q34-iDg1JJxC06iNZ-dso0mCWCOrScKdJwnXMVvIJu6lUO8qRTDqQ1YRXj1TBkomTyGRxfq44h4YVjiPcbDb41XK0CCHHolyczsBMaUVHm_gpPl4UmlbZPxw8pBWBYzQjaugTsM_cHuLf2PVP8yXu9NAqU5pureYYRdmtYchIRqM_R0hs' },
  { uid: 't4', email: 'robert.kiprop@example.com', phoneNumber: '+254 711 222 333', location: 'Eldoret', farmSize: '5 Acres', flockCount: 5000, createdAt: new Date('2024-04-05'), displayName: 'Robert Kiprop', role: 'trainee', focusArea: 'Hatchery', photoURL: '' },
];

export default function TrainerDashboard() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();
  const [trainees, setTrainees] = useState<UserProfile[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'trainer') {
      router.push('/trainee');
      return;
    }

    if (profile.uid.startsWith('mock-')) {
      setTimeout(() => {
        setTrainees(MOCK_TRAINEES);
        setLoading(false);
      }, 0);
      return;
    }

    const fetchTrainees = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee')
        .eq('assigned_trainer_id', profile.uid);
      
      if (data) {
        const mapped = data.map(d => ({
          uid: d.id,
          displayName: d.display_name,
          email: d.email || '',
          photoURL: d.photo_url || '',
          role: d.role as 'trainer' | 'trainee',
          focusArea: d.focus_area || '',
          phoneNumber: d.phone_number,
          location: d.location || '',
          farmSize: d.farm_size || '',
          flockCount: d.flock_count || 0,
          is_active: d.is_active,
          createdAt: d.created_at,
        }));
        setTrainees(mapped as any);
        setLoading(false);
      }
    };

    fetchTrainees();

    // Subscribe to changes in profiles
    const channel = supabase.channel('trainer_dashboard')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles', 
        filter: `assigned_trainer_id=eq.${profile.uid}` 
      }, () => {
        fetchTrainees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleTraineeStatus = async (trainee: UserProfile) => {
    if (profile?.uid.startsWith('mock-')) {
      const updated = trainees.map(t => 
        t.uid === trainee.uid ? { ...t, is_active: !(t as any).is_active } : t
      );
      setTrainees(updated);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !(trainee as any).is_active })
      .eq('id', trainee.uid);
    
    if (error) {
      console.error('Error updating trainee status:', error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light font-sans text-slate-900 pb-24">
      {/* Top App Bar */}
      <header className="flex items-center px-6 pt-12 pb-4 justify-between bg-background-light sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="relative size-12 rounded-full overflow-hidden bg-primary/20 border border-slate-200">
            {profile?.photoURL ? (
              <Image src={profile.photoURL} alt="Trainer" fill className="object-cover rounded-full" unoptimized referrerPolicy="no-referrer" />
            ) : (
              <div className="flex w-full h-full items-center justify-center text-primary-dark font-bold">
                {profile?.displayName?.trim() ? profile.displayName.substring(0,2).toUpperCase() : 'TR'}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trainer Dashboard</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hi, {profile?.displayName?.split(' ')[0] || 'Trainer'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex size-11 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-primary transition-colors hover:border-primary">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="flex size-11 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6">
        {/* Stats Section in a Row */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 mb-6">
          <div className="min-w-[140px] flex flex-col gap-2 rounded-3xl p-5 bg-white shadow-sm border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-[#E5F5E5] flex items-center justify-center text-primary-dark">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Total</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{trainees.length}</p>
          </div>
          
          <div className="min-w-[140px] flex flex-col gap-2 rounded-3xl p-5 bg-white shadow-sm border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-[#FFF0E5] flex items-center justify-center text-[#FF8A35]">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Active</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{trainees.filter(t => (t as any).is_active !== false).length}</p>
          </div>

          <div className="min-w-[140px] flex flex-col gap-2 rounded-3xl p-5 bg-white shadow-sm border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-[#E5F0FF] flex items-center justify-center text-[#3B82F6]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Chats</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">12</p>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Your Trainees</h2>
        </div>

        {/* Trainees List */}
        <div className="flex flex-col gap-4">
          {trainees.map((trainee) => {
            const isActive = (trainee as any).is_active !== false;
            
            return (
              <div 
                key={trainee.uid} 
                className="flex flex-col p-4 bg-white rounded-3xl shadow-sm border border-slate-100 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div onClick={() => setSelectedTrainee(trainee)} className="relative size-14 shrink-0 block cursor-pointer">
                    <div className="relative size-full rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                      {trainee.photoURL ? (
                        <Image 
                          src={trainee.photoURL} 
                          alt={trainee.displayName} 
                          fill 
                          className="object-cover rounded-full" 
                          referrerPolicy="no-referrer"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                          {trainee.displayName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className={`absolute bottom-0 right-0 size-3.5 border-2 border-white rounded-full z-10 ${isActive ? 'bg-primary' : 'bg-red-400'}`}></span>
                  </div>
                  
                  <div onClick={() => setSelectedTrainee(trainee)} className="flex-1 min-w-0 pt-0.5 block cursor-pointer">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h3 className="font-bold text-slate-900 truncate text-lg leading-tight">{trainee.displayName}</h3>
                      <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                        {trainee.focusArea || 'General'}
                      </span>
                    </div>
                    <Link href={`/chat?peerId=${trainee.uid}`} onClick={(e) => e.stopPropagation()} className="inline-flex mt-1 text-sm text-slate-500 hover:text-primary truncate items-center gap-1.5 focus:text-primary transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" /> Tap to message
                    </Link>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Subscription</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isActive ? 'text-primary-dark bg-[#E5F5E5]' : 'text-red-700 bg-red-100'}`}>
                      {isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button 
                    onClick={() => toggleTraineeStatus(trainee)}
                    className={`relative w-12 h-6 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer outline-none focus:outline-none ${isActive ? 'bg-primary' : 'bg-slate-200'}`}
                  >
                    <div className={`size-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>
            );
          })}
          
          {trainees.length === 0 && (
            <div className="py-12 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-700 mb-1">No Trainees Yet</h3>
              <p className="text-sm text-slate-500 max-w-[200px]">You don&apos;t have any trainees assigned to you at the moment.</p>
            </div>
          )}
        </div>
      </main>

      {/* Trainee Modal */}
      {selectedTrainee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTrainee(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="h-32 bg-primary/20 relative">
              <button 
                onClick={() => setSelectedTrainee(null)}
                className="absolute top-4 right-4 z-10 size-8 flex items-center justify-center bg-white/50 hover:bg-white text-slate-700 rounded-full transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 pb-6 pt-0 flex flex-col items-center relative -mt-16">
              <div className="relative size-32 rounded-full overflow-hidden bg-white border-4 border-white shadow-sm mb-4">
                {selectedTrainee.photoURL ? (
                  <Image 
                    src={selectedTrainee.photoURL} 
                    alt={selectedTrainee.displayName} 
                    fill 
                    className="object-cover rounded-full" 
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-4xl">
                    {selectedTrainee.displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-1 text-center leading-tight">{selectedTrainee.displayName}</h2>
              <span className="text-sm font-semibold px-3 py-1 rounded-full bg-primary/20 text-primary-dark uppercase tracking-wider mb-6">
                {selectedTrainee.focusArea || 'General'}
              </span>

              <div className="w-full grid grid-cols-2 gap-3 mb-6">
                {(selectedTrainee.farmSize || selectedTrainee.flockCount) && (
                  <div className="flex flex-col items-center justify-center p-3 bg-[#FFF3E5] rounded-2xl border border-[#FFE4C4]">
                    <div className="flex items-center gap-1.5 text-[#FF8A35] font-bold mb-1">
                      <FarmIcon className="w-4 h-4" />
                      <span className="text-sm">Farm Setup</span>
                    </div>
                    <span className="text-slate-700 font-medium text-xs text-center leading-tight">
                      {selectedTrainee.farmSize && `${selectedTrainee.farmSize}`}
                      {selectedTrainee.farmSize && selectedTrainee.flockCount && ' • '}
                      {selectedTrainee.flockCount && `${selectedTrainee.flockCount.toLocaleString()} birds`}
                    </span>
                  </div>
                )}
                <div className="flex flex-col items-center justify-center p-3 bg-[#E5F5E5] rounded-2xl border border-[#CCEBCC]">
                  <div className="flex items-center gap-1.5 text-primary-dark font-bold mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Joined On</span>
                  </div>
                  <span className="text-slate-700 font-medium text-xs">
                    {selectedTrainee.createdAt ? format(new Date((selectedTrainee.createdAt as any).toDate ? (selectedTrainee.createdAt as any).toDate() : selectedTrainee.createdAt), 'MMM d, yyyy') : 'Recently'}
                  </span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Content</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{selectedTrainee.email || 'No email provided'}</p>
                  </div>
                </div>
                
                {selectedTrainee.phoneNumber && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-medium text-slate-700 truncate">{selectedTrainee.phoneNumber}</p>
                    </div>
                  </div>
                )}
                
                {selectedTrainee.location && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
                      <p className="text-sm font-medium text-slate-700 truncate">{selectedTrainee.location}</p>
                    </div>
                  </div>
                )}
              </div>

              <Link 
                href={`/chat?peerId=${selectedTrainee.uid}`}
                onClick={() => setSelectedTrainee(null)}
                className="w-full h-14 bg-primary hover:bg-[#7ED465] text-primary-dark font-bold rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base shadow-[0_8px_20px_-4px_rgba(141,235,113,0.4)]"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Message Trainee</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <TrainerBottomNav />
    </div>
  );
}
