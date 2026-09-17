'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, User, BellRing, Settings2, HelpCircle, Sparkles, CheckCircle2, X, MapPin, Scale, ChevronRight, Phone } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { TraineeBottomNav } from '@/components/TraineeBottomNav';
import { launchTelebirr } from '@/hooks/useTelebirr';
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
import { toastManager } from '@/components/ui/toast';

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
    toastManager.add({ type: 'success', title: message });
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
    <div className="flex min-h-[100dvh] w-full flex-col bg-background font-sans text-foreground pb-24">
      <header className="px-4 sm:px-6 pt-12 pb-6 bg-card border-b border-border mb-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight">{isAmharic ? 'መገለጫ' : 'Profile'}</h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">{isAmharic ? 'የመተግበሪያ ቅንብሮች ያቀናብሩ' : 'Manage your app settings'}</p>
      </header>
      <main className="px-4 sm:px-6 flex-1 flex flex-col items-center min-w-0">

        {/* PREMIUM UPGRADE CARD */}
        <Card className="w-full max-w-sm mb-8 min-w-0 max-w-full overflow-hidden">
          <CardPanel className="min-w-0 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4 min-w-0">
              <div className="bg-primary/10 p-2 rounded-xl text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-widest text-primary uppercase">{isAmharic ? 'ፕሪሚየም ዕቅድ' : 'PREMIUM PLAN'}</span>
                <h2 className="text-xl font-black tracking-tight mt-0.5 truncate">{isAmharic ? 'ማይ ቺከን አዲስ ፕሪሚየም' : 'My Chicken Addis Premium'}</h2>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-medium mb-5 leading-relaxed">
              {isAmharic
                ? 'ተጨማሪ የባለሙያ ምክሮችን እና ልዩ ስልጠናዎችን ለማግኘት አሁኑኑ ያሻሽሉ!'
                : 'Upgrade today to unlock direct advice, customized tools, and standard premium courses!'}
            </p>

            <ul className="flex flex-col gap-2.5 mb-6">
              <li className="flex items-center gap-2.5 text-xs text-muted-foreground font-bold">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>{isAmharic ? 'የባለሙያ የቪዲዮ ምክክር' : 'Direct advisory consultations'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-muted-foreground font-bold">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>{isAmharic ? 'ፕሪሚየም የአስተዳደር መመሪያዎች' : 'Premium brooding tutorials'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-muted-foreground font-bold">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>{isAmharic ? '24/7 ቀጥተኛ የድጋፍ መስመር' : '24/7 Priority support hotline'}</span>
              </li>
            </ul>

            <div className="flex items-end justify-between gap-2 border-t border-border pt-5">
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground font-bold block tracking-wider uppercase">{isAmharic ? 'ዋጋ' : 'INVESTMENT'}</span>
                <span className="text-2xl font-black tracking-tight whitespace-nowrap">1,000 ETB</span>
                <span className="text-xs text-muted-foreground font-bold"> / {isAmharic ? 'በወር' : 'mo'}</span>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={launchTelebirr}
                className="shrink-0"
              >
                <span>{isAmharic ? 'በቴሌብር ይክፈሉ' : 'Pay with Telebirr'}</span>
              </Button>
            </div>
          </CardPanel>
        </Card>

        <div className="w-full max-w-sm mb-8 flex flex-col gap-3 min-w-0">
          {navItems.map((item, idx) => (
            <Button
              key={idx}
              type="button"
              variant="outline"
              onClick={item.onClick}
              className="h-auto w-full justify-start gap-4 p-4 text-left"
            >
              <span className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-foreground text-[15px] truncate">{item.label}</span>
                <span className="block text-xs text-muted-foreground font-medium truncate">{item.description}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="destructive"
          size="lg"
          onClick={handleLogout}
          className="w-full max-w-sm"
        >
          <LogOut className="w-5 h-5" />
          {isAmharic ? 'ውጣ' : 'Log Out'}
        </Button>
      </main>

      {/* 1. PERSONAL INFO DIALOG */}
      <Dialog open={activeModal === 'info'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogPopup data-testid="profile-edit-dialog" className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <form onSubmit={handleSaveInfo}>
            <DialogHeader>
              <DialogTitle>{isAmharic ? 'የግል መረጃን ማስተካከል' : 'Personal Info'}</DialogTitle>
              <DialogDescription>{isAmharic ? 'ስምዎን እና የእርሻ ዝርዝሮችዎን ያዘምኑ።' : 'Update your name and farm details.'}</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-3">
              <Field>
                <FieldLabel htmlFor="profile-name">{isAmharic ? 'ሙሉ ስም' : 'Full Name'}</FieldLabel>
                <Input
                  id="profile-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="profile-focus">{isAmharic ? 'የትኩረት አቅጣጫ' : 'Focus Area'}</FieldLabel>
                <Input
                  id="profile-focus"
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  placeholder="e.g. Broilers, Layers, General"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="profile-location">{isAmharic ? 'አካባቢ' : 'Location'}</FieldLabel>
                <span className="relative block">
                  <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-9"
                    placeholder="City / Region"
                  />
                </span>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="profile-farm">{isAmharic ? 'የእርሻ መጠን' : 'Farm Size'}</FieldLabel>
                  <span className="relative block">
                    <Scale className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="profile-farm"
                      type="text"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      className="pl-9"
                      placeholder="e.g. 1.5 Acres"
                    />
                  </span>
                </Field>

                <Field>
                  <FieldLabel htmlFor="profile-flock">{isAmharic ? 'የዶሮዎች ብዛት' : 'Flock Count'}</FieldLabel>
                  <Input
                    id="profile-flock"
                    type="number"
                    min="0"
                    value={flockCount}
                    onChange={(e) => setFlockCount(Number(e.target.value))}
                  />
                </Field>
              </div>
            </DialogPanel>
            <DialogFooter>
              <Button type="submit" loading={updating} className="w-full" data-testid="profile-edit-save">
                {updating ? 'Saving...' : (isAmharic ? 'መረጃውን አስቀምጥ' : 'Save Changes')}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      {/* 2. NOTIFICATIONS DIALOG */}
      <Dialog open={activeModal === 'notifications'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogPopup className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <form onSubmit={handleSaveNotifications}>
            <DialogHeader>
              <DialogTitle>{isAmharic ? 'የማሳወቂያ ቅንብሮች' : 'Alert Preferences'}</DialogTitle>
              <DialogDescription>{isAmharic ? 'ማሳወቂያዎችን እንዴት እንደሚቀበሉ ይምረጡ።' : 'Choose how you receive alerts.'}</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-2">
              <Field orientation="horizontal" className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <FieldLabel htmlFor="profile-push">{isAmharic ? 'ፈጣን ማሳወቂያዎች' : 'Push Notifications'}</FieldLabel>
                  <span className="block text-xs text-muted-foreground font-medium">{isAmharic ? 'ለአሰልጣኝ መልእክቶች' : 'Immediate response alerts'}</span>
                </span>
                <Switch
                  id="profile-push"
                  checked={prefPush}
                  onCheckedChange={setPrefPush}
                  aria-label="Push Notifications"
                />
              </Field>

              <Field orientation="horizontal" className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <FieldLabel htmlFor="profile-sms">{isAmharic ? 'የኤስኤምኤስ መልእክቶች' : 'SMS Inquiry Updates'}</FieldLabel>
                  <span className="block text-xs text-muted-foreground font-medium">{isAmharic ? 'በስልክዎ አጭር ፅሁፍ' : 'Inquiry status texts'}</span>
                </span>
                <Switch
                  id="profile-sms"
                  checked={prefSMS}
                  onCheckedChange={setPrefSMS}
                  aria-label="SMS Inquiry Updates"
                />
              </Field>

              <Field orientation="horizontal" className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <FieldLabel htmlFor="profile-weekly">{isAmharic ? 'ሳምንታዊ ሪፖርቶች' : 'Weekly Performance Reports'}</FieldLabel>
                  <span className="block text-xs text-muted-foreground font-medium">{isAmharic ? 'የእርሻ አስተዳደር ምክሮች' : 'Brooding efficiency metrics'}</span>
                </span>
                <Switch
                  id="profile-weekly"
                  checked={prefWeekly}
                  onCheckedChange={setPrefWeekly}
                  aria-label="Weekly Performance Reports"
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <Button type="submit" className="w-full">
                {isAmharic ? 'አስቀምጥ' : 'Save Preferences'}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      {/* 3. HELP & SUPPORT DIALOG */}
      <Dialog open={activeModal === 'help'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogPopup className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAmharic ? 'እርዳታ እና ድጋፍ' : 'Help & Support'}</DialogTitle>
            <DialogDescription>{isAmharic ? 'ተደጋግመው የሚጠየቁ ጥያቄዎች።' : 'Frequently asked questions.'}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-3">
            <Card className="min-w-0">
              <CardPanel className="p-4">
                <h4 className="font-bold text-foreground text-sm mb-1">How do I submit video inquiries?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Go to Home, write a description, tap the &quot;Video&quot; button to select a clip under 60 seconds, and tap &quot;Send to Supervisor&quot;. We will compress and upload it to our secure R2 bucket.
                </p>
              </CardPanel>
            </Card>

            <Card className="min-w-0">
              <CardPanel className="p-4">
                <h4 className="font-bold text-foreground text-sm mb-1">How do I contact my supervisor directly?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Tap the Chats tab in the bottom navigation bar to open the direct message feed with your assigned supervisor.
                </p>
              </CardPanel>
            </Card>

            <Card className="min-w-0">
              <CardPanel className="p-4">
                <h4 className="font-bold text-foreground text-sm mb-1">What does Premium plan offer?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Premium provides priority advisory support, video consultations, and premium brooding spreadsheets. Upgrades are processed securely through Telebirr.
                </p>
              </CardPanel>
            </Card>
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              render={<a href="tel:+251911223344" />}
            >
              <Phone className="w-4 h-4" />
              <span>{isAmharic ? 'ስልክ በመደወል ድጋፍ ያግኙ' : 'Call Support Line'}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveModal(null)}
              className="w-full"
              aria-label="Close help"
            >
              <X className="w-4 h-4" />
              <span>{isAmharic ? 'ዝጋ' : 'Close'}</span>
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      {profile && (
        <p className="text-xs text-muted-foreground mt-8 mb-2 px-4 font-medium text-center break-words">
          {isAmharic ? 'በዚህ ገብተዋል፡' : 'Logged in as'} {profile.email || profile.phoneNumber}
        </p>
      )}

      <TraineeBottomNav isAmharic={isAmharic} />
    </div>
  );
}
