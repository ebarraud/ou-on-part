'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (destinations.length > 0 || isGenerating) return;
    if (!profile.month) {
      router.push('/');
      return;
    }

    setIsGenerating(true);
    generateDestinations(profile)
      .then((dests) => {
        setDestinations(dests);
      })
      .catch((err) => {
        console.error('Failed to generate destinations:', err);
      })
      .finally(() => {
        setIsGenerating(false);
      });
  }, [profile, destinations.length, isGenerating, setDestinations, setIsGenerating, router]);

  const handleSelect = (dest: typeof destinations[0]) => {
    setSelectedDestination(dest);
    router.push(`/destination/${dest.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen px-4 pb-8">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {isGenerating ? '✨ On cherche...' : '3 destinations pour toi'}
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

      {/* Results */}
      {!isGenerating && destinations.length > 0 && (
        <div className="space-y-4">
          {destinations.map((dest, i) => (
            <DestinationCard
              key={dest.id}
              destination={dest}
              rank={(i + 1) as 1 | 2 | 3}
              onSelect={() => handleSelect(dest)}
            />
          ))}
        </div>
      )}

      {/* Retry button */}
      {!isGenerating && (
        <button
          onClick={() => {
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
