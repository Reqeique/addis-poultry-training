'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, User, Lock, BellRing, Settings2, ChevronRight } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { TrainerBottomNav } from '@/components/TrainerBottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from '@/components/ui/dialog';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile, setProfile } = useAuthStore();
  const { isAmharic, setIsAmharic } = useAppStore();

  const [activeModal, setActiveModal] = useState<'profile' | 'notifications' | 'privacy' | 'preferences' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [updating, setUpdating] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
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
        .update({ display_name: displayName.trim(), focus_area: focusArea.trim() })
        .eq('id', profile.uid);
      if (error) throw error;
      setProfile({ ...profile, displayName: displayName.trim(), focusArea: focusArea.trim() });
      showToast('Profile updated successfully!');
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating profile');
    } finally {
      setUpdating(false);
    }
  };

  const navItems = [
    { icon: User, label: 'Account Profile', description: 'Update your personal info', modal: 'profile' as const },
    { icon: BellRing, label: 'Notifications', description: 'Configure alert preferences', modal: 'notifications' as const },
    { icon: Lock, label: 'Privacy & Security', description: 'Password and security settings', modal: 'privacy' as const },
    { icon: Settings2, label: 'App Preferences', description: 'Language and themes', modal: 'preferences' as const },
  ];

  return (
    <div className="flex min-h-svh w-full flex-col bg-background font-sans text-foreground pb-24">
      {toastMessage && (
        <div className="fixed left-1/2 top-6 z-[110] -translate-x-1/2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      <header className="sticky top-0 z-10 border-b border-border bg-card px-6 pb-6 pt-10">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">Manage your app configurations</p>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-6">
        <div className="mb-6 flex w-full flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActiveModal(item.modal)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[0_1px_0_0_var(--border)] transition-colors hover:bg-accent/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <item.icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-bold">{item.label}</span>
                <span className="block text-xs font-medium text-muted-foreground">{item.description}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <Button variant="destructive-outline" size="lg" className="w-full" onClick={handleLogout}>
          <LogOut className="size-5" />
          Log Out
        </Button>

        {profile && (
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Logged in as {profile.email || profile.phoneNumber}
          </p>
        )}
      </main>

      <Dialog open={activeModal === 'profile'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogPopup>
          <form onSubmit={handleSaveProfile}>
            <DialogHeader>
              <DialogTitle>Account Profile</DialogTitle>
              <DialogDescription>Update your display name and expert focus area.</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-3">
              <Field>
                <FieldLabel htmlFor="settings-name">Full Name</FieldLabel>
                <Input id="settings-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-focus">Expert Focus Area</FieldLabel>
                <Input
                  id="settings-focus"
                  required
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  placeholder="e.g. Brooding Management"
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <Button type="submit" loading={updating} className="w-full">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      <Dialog open={activeModal === 'notifications'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>Choose how you hear about urgent trainee issues.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            {[
              { label: 'SMS Inquiry Alerts', hint: 'Text when trainee submits urgent issue', value: smsAlerts, set: setSmsAlerts },
              { label: 'Email Reports', hint: 'Daily trainee performance updates', value: emailAlerts, set: setEmailAlerts },
              { label: 'Weekly Roster Digests', hint: 'Roster stats and inactive alarms', value: weeklyDigest, set: setWeeklyDigest },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{row.label}</p>
                  <p className="text-xs font-medium text-muted-foreground">{row.hint}</p>
                </div>
                <Switch checked={row.value} onCheckedChange={row.set} label={row.label} />
              </div>
            ))}
          </DialogPanel>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                showToast('Preferences updated successfully!');
                setActiveModal(null);
              }}
            >
              Save Alert Preferences
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <Dialog open={activeModal === 'privacy'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Privacy & Security</DialogTitle>
            <DialogDescription>How trainee access and media are protected.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-3">
            <Card>
              <CardPanel className="p-4">
                <p className="text-sm font-bold">Roster Locking</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
                  Only trainees pre-authenticated by you can register. Unknown phone numbers are blocked from signup.
                </p>
              </CardPanel>
            </Card>
            <Card>
              <CardPanel className="p-4">
                <p className="text-sm font-bold">Secure Media Uploads</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
                  Media items are stored in a Cloudflare R2 bucket with short-lived secure URLs to prevent public exposure.
                </p>
              </CardPanel>
            </Card>
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      <Dialog open={activeModal === 'preferences'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>App Preferences</DialogTitle>
            <DialogDescription>Pick the language for your workspace.</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={!isAmharic ? 'default' : 'outline'}
                onClick={() => {
                  setIsAmharic(false);
                  showToast('Language changed to English');
                }}
              >
                English
              </Button>
              <Button
                variant={isAmharic ? 'default' : 'outline'}
                onClick={() => {
                  setIsAmharic(true);
                  showToast('ቋንቋው ወደ አማርኛ ተቀይሯል');
                }}
              >
                አማርኛ
              </Button>
            </div>
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      <TrainerBottomNav />
    </div>
  );
}
