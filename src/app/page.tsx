'use client';

import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';
import { APP_VERSION } from '@/lib/version';

export default function HomePage() {
  const router = useRouter();
  const profile = useTravelStore((s) => s.profile);
  const destinations = useTravelStore((s) => s.destinations);
  const resetProfile = useTravelStore((s) => s.resetProfile);

  // Has user already started a session?
  const hasSession = !!profile.month;
  const hasResults = destinations.length > 0;

  const handleNew = () => {
    resetProfile();
    router.push('/flow');
  };

  const handleResume = () => {
    if (hasResults) {
      router.push('/results');
    } else {
      router.push('/flow');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      {/* Logo / Title */}
      <div className="mb-8">
        <span className="text-6xl mb-4 block">✈️</span>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Où on part ?</h1>
        <p className="text-base text-gray-500 leading-relaxed max-w-xs mx-auto">
          Trouve ta destination idéale en répondant à quelques questions. L&apos;IA fait le reste.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-xs">
        <div className="flex flex-col items-center">
          <span className="text-2xl mb-1">🎯</span>
          <span className="text-xs text-gray-500">15 critères</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl mb-1">🤖</span>
          <span className="text-xs text-gray-500">IA voyagiste</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl mb-1">📋</span>
          <span className="text-xs text-gray-500">Itinéraire</span>
        </div>
      </div>

      {/* CTAs */}
      {hasSession ? (
        <div className="w-full max-w-xs space-y-3">
          {/* Resume */}
          <button
            onClick={handleResume}
            className="w-full py-4 rounded-btn font-semibold text-lg bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            {hasResults ? 'Voir mes résultats →' : 'Reprendre →'}
          </button>

          {/* Session info */}
          <p className="text-xs text-gray-400">
            {profile.month} · {profile.departureCity || '...'} · {profile.visited.length > 0 ? `${profile.visited.length} pays exclus` : ''}
          </p>

          {/* New search */}
          <button
            onClick={handleNew}
            className="w-full py-3 rounded-btn font-semibold text-sm border border-gray-200 text-gray-600 hover:border-primary hover:text-primary active:scale-[0.98] transition-all"
          >
            Nouvelle recherche
          </button>
        </div>
      ) : (
        <button
          onClick={handleNew}
          className="w-full max-w-xs py-4 rounded-btn font-semibold text-lg bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          C&apos;est parti ! →
        </button>
      )}

      <p className="text-xs text-gray-400 mt-6">
        EBA — v{APP_VERSION}
      </p>
    </div>
  );
}
