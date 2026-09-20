'use client';

import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';

/**
 * App-open splash: the logo sits big in the middle of the screen on every
 * cold start, then flies up and fades while the app settles underneath.
 * Plays once per mount (client navigations don't replay it). Skipped
 * entirely for reduced-motion users. Never blocks input.
 */
export function AppIntro() {
  const [stage, setStage] = useState<'center' | 'fly' | 'done'>(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'done'
      : 'center',
  );

  useEffect(() => {
    if (stage !== 'center') return undefined;
    let finish: ReturnType<typeof setTimeout> | undefined;
    const dwell = setTimeout(() => {
      setStage('fly');
      finish = setTimeout(() => setStage('done'), 800);
    }, 900);
    return () => {
      clearTimeout(dwell);
      if (finish) clearTimeout(finish);
    };
    // Single-shot splash: must not re-arm on stage changes, or the
    // center->fly transition would clear the finish timer (stuck overlay).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === 'done') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background pointer-events-none transition-opacity duration-500 ${stage === 'fly' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div
        className={`transition-all duration-700 ease-in-out ${stage === 'fly' ? '-translate-y-[30vh] scale-[0.55] opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}
      >
        <Logo className="size-28" />
      </div>
      <p className={`text-sm font-semibold text-muted-foreground transition-opacity duration-500 ${stage === 'fly' ? 'opacity-0' : 'opacity-100'}`}>
        Grow Together
      </p>
    </div>
  );
}
