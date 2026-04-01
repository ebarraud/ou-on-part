'use client';

import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();
  const resetProfile = useTravelStore((s) => s.resetProfile);

  const handleStart = () => {
    resetProfile();
    router.push('/flow');
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

      {/* CTA */}
      <button
        onClick={handleStart}
        className="w-full max-w-xs py-4 rounded-btn font-semibold text-lg bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
      >
        C&apos;est parti ! →
      </button>

      <p className="text-xs text-gray-400 mt-6">
        100% boutons · Aucun texte à taper · 2 min
      </p>
    </div>
  );
}
