'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';
import { generateDestinations } from '@/lib/claude';
import DestinationCard from '@/components/results/DestinationCard';

export default function ResultsPage() {
  const router = useRouter();
  const {
    profile,
    destinations,
    setDestinations,
    setSelectedDestination,
    isGenerating,
    setIsGenerating,
  } = useTravelStore();

  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    // Guard: don't run if already done, already generating, or already tried
    if (destinations.length > 0 || isGenerating || hasStarted.current) return;
    if (!profile.month) {
      router.push('/');
      return;
    }

    hasStarted.current = true;
    setIsGenerating(true);
    setError(null);

    generateDestinations(profile)
      .then((dests) => {
        setDestinations(dests);
      })
      .catch((err) => {
        console.error('Failed to generate destinations:', err);
        setError(String(err));
      })
      .finally(() => {
        setIsGenerating(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    hasStarted.current = false;
    setError(null);
    setIsGenerating(true);

    generateDestinations(profile)
      .then((dests) => {
        setDestinations(dests);
      })
      .catch((err) => {
        console.error('Failed to generate destinations:', err);
        setError(String(err));
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  const handleSelect = (dest: typeof destinations[0]) => {
    setSelectedDestination(dest);
    router.push(`/destination/${dest.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen px-4 pb-8">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {isGenerating
            ? '✨ On cherche...'
            : error
              ? '😕 Oups...'
              : '3 destinations pour toi'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Basé sur 15 critères · {profile.month}
        </p>
      </div>

      {/* Loading */}
      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-gray-500 text-center">
            L&apos;IA analyse ton profil et<br />sélectionne les meilleures destinations...
          </p>
        </div>
      )}

      {/* Error */}
      {error && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-red-600 text-center bg-red-50 rounded-btn px-4 py-3">
            {error}
          </p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 rounded-btn font-semibold text-sm bg-primary text-white hover:bg-primary-dark transition-all"
          >
            🔄 Réessayer
          </button>
        </div>
      )}

      {/* Results */}
      {!isGenerating && !error && destinations.length > 0 && (
        <div className="space-y-4">
          {destinations.map((dest, i) => (
            <DestinationCard
              key={dest.id}
              destination={dest}
              rank={(i + 1) as 1 | 2 | 3}
              onSelect={() => handleSelect(dest)}
              departureCity={profile.departureCity}
              nights={profile.nights || undefined}
              hasCarTransport={profile.transport.includes('car')}
            />
          ))}
        </div>
      )}

      {/* Back button */}
      {!isGenerating && (
        <button
          onClick={() => router.push('/flow')}
          className="mt-6 text-sm text-gray-500 hover:text-primary underline self-center"
        >
          ↺ Affiner mes critères
        </button>
      )}
    </div>
  );
}
