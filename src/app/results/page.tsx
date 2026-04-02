'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';
import { generateDestinations, generateOneDestination } from '@/lib/claude';
import DestinationCard from '@/components/results/DestinationCard';

export default function ResultsPage() {
  const router = useRouter();
  const {
    profile,
    setField,
    destinations,
    setDestinations,
    setSelectedDestination,
    isGenerating,
    setIsGenerating,
  } = useTravelStore();

  const [error, setError] = useState<string | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const hasStarted = useRef(false);

  const generate = (overrideProfile?: typeof profile) => {
    const p = overrideProfile || profile;
    setIsGenerating(true);
    setError(null);

    generateDestinations(p)
      .then((dests) => {
        // Client-side filter: ensure no visited/rejected country slips through
        const filtered = dests.filter(
          (d) => !p.visited.includes(d.countryCode)
        );
        setDestinations(filtered);
      })
      .catch((err) => {
        console.error('Failed to generate destinations:', err);
        setError(String(err));
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  useEffect(() => {
    if (destinations.length > 0 || isGenerating || hasStarted.current) return;
    if (!profile.month) {
      router.push('/');
      return;
    }

    hasStarted.current = true;
    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    hasStarted.current = false;
    generate();
  };

  const handleReject = (countryCode: string) => {
    // Add rejected country to visited list
    const newVisited = [...profile.visited];
    if (!newVisited.includes(countryCode)) {
      newVisited.push(countryCode);
    }
    setField('visited', newVisited);

    // Find index of rejected destination
    const rejectedIndex = destinations.findIndex(
      (d) => d.countryCode === countryCode
    );
    if (rejectedIndex === -1) return;

    setReplacingIndex(rejectedIndex);
    setError(null);

    // Exclude visited + all currently displayed countries
    const allDisplayedCodes = destinations.map((d) => d.countryCode);
    const updatedProfile = { ...profile, visited: newVisited };

    generateOneDestination(updatedProfile, allDisplayedCodes)
      .then((newDest) => {
        const updated = [...destinations];
        updated[rejectedIndex] = newDest;
        setDestinations(updated);
      })
      .catch((err) => {
        console.error('Failed to generate replacement:', err);
        // Fallback: remove the rejected card
        setDestinations(destinations.filter((_, i) => i !== rejectedIndex));
      })
      .finally(() => {
        setReplacingIndex(null);
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
        {profile.visited.length > 0 && !isGenerating && (
          <p className="text-xs text-gray-400 mt-1">
            Pays exclus : {profile.visited.length}
          </p>
        )}
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
            replacingIndex === i ? (
              <div key={`replacing-${i}`} className="w-full bg-white border border-gray-200 rounded-btn p-8 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-primary-light border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Recherche d&apos;une autre destination...</p>
              </div>
            ) : (
              <DestinationCard
                key={dest.id}
                destination={dest}
                rank={(i + 1) as 1 | 2 | 3}
                onSelect={() => handleSelect(dest)}
                onReject={replacingIndex !== null ? undefined : handleReject}
                departureCity={profile.departureCity}
                nights={profile.nights || undefined}
                hasCarTransport={profile.transport.includes('car')}
              />
            )
          ))}
        </div>
      )}

      {/* Back button */}
      {!isGenerating && (
        <button
          onClick={() => {
            setDestinations([]);
            hasStarted.current = false;
            router.push('/flow');
          }}
          className="mt-6 text-sm text-gray-500 hover:text-primary underline self-center"
        >
          ↺ Affiner mes critères
        </button>
      )}
    </div>
  );
}
