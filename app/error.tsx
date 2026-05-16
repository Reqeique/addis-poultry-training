'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 p-4">
      <h2 className="text-4xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        An unexpected error occurred.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
