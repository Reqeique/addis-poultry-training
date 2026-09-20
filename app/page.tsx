'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Lock, Phone, Eye, EyeOff } from 'lucide-react';

import { buildPhoneLoginEmail, normalizePhoneNumber } from '@/lib/auth/phone-email';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardPanel, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loading: authLoading } = useAuthStore();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const formattedPhone = normalizePhoneNumber(phoneNumber);
      const email = buildPhoneLoginEmail(formattedPhone);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Could not sign in with phone and password.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-background font-sans text-foreground">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
        <div className="mx-auto mb-6 mt-8">
          <Logo className="size-20" />
        </div>

        <div className="mb-6 text-center">
          <p className="mb-1 text-sm font-semibold text-muted-foreground">Grow Together</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Welcome to <span className="text-primary">My Chicken Addis</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your phone number to reach your supervisor.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use the phone number your supervisor registered for you.</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <Field>
                <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                <span className="relative block">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-9"
                    placeholder="Phone number (e.g. +251...)"
                    aria-label="Phone number (e.g. +251...)"
                    type="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </span>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <span className="relative block">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    className="pl-9 pr-11"
                    placeholder="Password"
                    aria-label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </span>
              </Field>
              <Button type="submit" size="lg" loading={loading} disabled={!phoneNumber || !password} className="mt-1 w-full">
                Sign In
              </Button>
            </form>
          </CardPanel>
        </Card>

        <p className="mt-6 px-4 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to <span className="font-bold text-foreground">Terms of Use</span> and{' '}
          <span className="font-bold text-foreground">Privacy Policy</span>
        </p>
      </main>
    </div>
  );
}
