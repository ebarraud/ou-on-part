'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';
import { generateValidDestinations } from '@/lib/claude';
import { getDisplayedBudget } from '@/lib/budget';
import {
  buildRelaxSuggestions,
  describeCriteria,
  getBudgetCap,
  getMaxTravelHours,
  type Rejection,
} from '@/lib/constraints';
import type { Destination } from '@/lib/types';
import DestinationCard from '@/components/results/DestinationCard';
import PriceDisclaimer from '@/components/results/PriceDisclaimer';

// Les destinations refusées les plus proches des critères, avec la raison en alerte rouge
function closestMisses(profile: Parameters<typeof getBudgetCap>[0], rejected: Rejection[]): Destination[] {
  const cap = getBudgetCap(profile);
  const maxHours = getMaxTravelHours(profile);
  const score = (r: Rejection) =>
    r.kind === 'budget' ? r.overshoot / (isFinite(cap) ? cap : 1) : r.overshoot / (isFinite(maxHours) ? maxHours : 1);
  const seen = new Set<string>();
  return [...rejected]
    .sort((a, b) => score(a) - score(b))
    .filter((r) => {
      const key = r.destination.countryCode + r.destination.city;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3)
    .map((r) => ({
      ...r.destination,
      warnings: [
        { level: 'red' as const, text: `Hors critères : ${r.reason}` },
        ...(r.destination.warnings || []),
      ],
    }));
}

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
  const [nearMisses, setNearMisses] = useState<Destination[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const hasStarted = useRef(false);

  const generate = (overrideProfile?: typeof profile) => {
    const p = overrideProfile || profile;
    setIsGenerating(true);
    setError(null);
    setNearMisses([]);
    setSuggestions([]);

    generateValidDestinations(p, 3)
      .then(({ destinations: valid, rejected }) => {
        setDestinations(valid);
        if (valid.length < 3) {
          setSuggestions(buildRelaxSuggestions(p, rejected));
        }
        if (valid.length === 0) {
          setNearMisses(closestMisses(p, rejected));
        }
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

    generateValidDestinations(updatedProfile, 1, allDisplayedCodes)
      .then(({ destinations: found }) => {
        if (found.length === 0) {
          // Aucune remplaçante ne respecte les critères : on retire la carte
          setDestinations(destinations.filter((_, i) => i !== rejectedIndex));
          return;
        }
        const updated = [...destinations];
        updated[rejectedIndex] = found[0];
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

  const handleSelect = (dest: Destination) => {
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
              : destinations.length === 0 && nearMisses.length > 0
                ? '🤔 Rien ne colle parfaitement'
                : destinations.length === 1
                  ? '1 destination pour toi'
                  : `${destinations.length} destinations pour toi`}
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
                displayBudget={getDisplayedBudget(profile, dest)}
                rank={(i + 1) as 1 | 2 | 3}
                onSelect={() => handleSelect(dest)}
                onReject={replacingIndex !== null ? undefined : handleReject}
                departureCity={profile.departureCity}
                distanceFrom={profile.departureAirportName}
                nights={profile.nights || undefined}
                hasCarTransport={profile.transport.includes('car')}
              />
            )
          ))}
        </div>
      )}

      {!isGenerating && !error && (destinations.length > 0 || nearMisses.length > 0) && (
        <PriceDisclaimer className="mt-4" />
      )}

      {/* Moins de 3 destinations conformes */}
      {!isGenerating && !error && destinations.length > 0 && destinations.length < 3 && (
        <div className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-btn px-4 py-3">
          Seulement {destinations.length} destination{destinations.length > 1 ? 's respectent' : ' respecte'} tous tes critères.
          {suggestions.length > 0 && <> Pour plus de choix : {suggestions.join(', ou ')}.</>}
        </div>
      )}

      {/* Aucune destination conforme : on le dit, et on montre le plus proche */}
      {!isGenerating && !error && destinations.length === 0 && nearMisses.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-800 bg-amber-50 border border-amber-200 rounded-btn px-4 py-3">
            <p className="font-semibold">{describeCriteria(profile)}, aucune destination ne respecte tous tes critères.</p>
            <p className="mt-1">Voici le plus proche de ce que tu cherches.</p>
            {suggestions.length > 0 && (
              <p className="mt-2 text-xs text-gray-600">
                Pour trouver mieux : {suggestions.join(', ou ')}.
              </p>
            )}
          </div>
          {nearMisses.map((dest, i) => (
            <DestinationCard
              key={`miss-${dest.id}-${i}`}
              destination={dest}
              displayBudget={getDisplayedBudget(profile, dest)}
              rank={(i + 1) as 1 | 2 | 3}
              onSelect={() => handleSelect(dest)}
              departureCity={profile.departureCity}
                distanceFrom={profile.departureAirportName}
              nights={profile.nights || undefined}
              hasCarTransport={profile.transport.includes('car')}
            />
          ))}
        </div>
      )}

      {/* Aucun résultat du tout */}
      {!isGenerating && !error && destinations.length === 0 && nearMisses.length === 0 && hasStarted.current && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-600 text-center">Aucune destination trouvée pour ces critères.</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 rounded-btn font-semibold text-sm bg-primary text-white hover:bg-primary-dark transition-all"
          >
            🔄 Réessayer
          </button>
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
