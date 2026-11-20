'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHydrated, useTravelStore } from '@/lib/store';
import { replaceDestination, searchDestinations, startCheckout, unlockResults } from '@/lib/api';
import { getDisplayedBudget } from '@/lib/budget';
import { describeCriteria } from '@/lib/constraints';
import type { Destination } from '@/lib/types';
import DestinationCard from '@/components/results/DestinationCard';
import PriceDisclaimer from '@/components/results/PriceDisclaimer';
import LockedResults from '@/components/results/LockedResults';

export default function ResultsPage() {
  const router = useRouter();
  const {
    profile,
    setField,
    destinations,
    setDestinations,
    nearMisses,
    suggestions,
    setOutcome,
    lockedSearch,
    setLockedSearch,
    unlock,
    setUnlock,
    clearResults,
    setSelectedDestination,
    isGenerating,
    setIsGenerating,
  } = useTravelStore();

  const [error, setError] = useState<string | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const hasStarted = useRef(false);
  const hydrated = useHydrated();

  const unlockToken = unlock && unlock.expiresAt > Date.now() ? unlock.token : undefined;

  const generate = () => {
    setIsGenerating(true);
    setError(null);
    clearResults();

    searchDestinations(profile)
      .then((res) => {
        if (res.locked) {
          setLockedSearch(res.search);
        } else {
          setDestinations(res.destinations);
          setOutcome({ nearMisses: res.nearMisses, suggestions: res.suggestions });
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to generate destinations:', err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setIsGenerating(false));
  };

  // Retour de Stripe : on vérifie le paiement et on déverrouille
  const tryUnlock = async (sessionId: string) => {
    const locked = useTravelStore.getState().lockedSearch;
    window.history.replaceState(null, '', '/results');
    if (!locked) return;
    setUnlocking(true);
    try {
      const res = await unlockResults(sessionId, locked.sealed);
      setDestinations(res.destinations);
      setOutcome({ nearMisses: res.nearMisses, suggestions: res.suggestions });
      setUnlock({ token: res.token, searchId: res.searchId, expiresAt: res.expiresAt });
      setLockedSearch(null);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : String(err));
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    if (!hydrated || hasStarted.current) return;
    hasStarted.current = true;

    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (sessionId) {
      tryUnlock(sessionId);
      return;
    }
    if (destinations.length > 0 || nearMisses.length > 0 || lockedSearch || isGenerating) return;
    if (!profile.month) {
      router.push('/');
      return;
    }
    generate();
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => generate();

  const handlePay = async () => {
    if (!lockedSearch) return;
    setPaying(true);
    setPayError(null);
    try {
      const { url } = await startCheckout(lockedSearch.sealed);
      window.location.href = url;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : String(err));
      setPaying(false);
    }
  };

  const handleReject = (countryCode: string) => {
    const newVisited = [...profile.visited];
    if (!newVisited.includes(countryCode)) newVisited.push(countryCode);
    setField('visited', newVisited);

    const rejectedIndex = destinations.findIndex((d) => d.countryCode === countryCode);
    if (rejectedIndex === -1) return;

    setReplacingIndex(rejectedIndex);
    setError(null);

    const allDisplayedCodes = destinations.map((d) => d.countryCode);
    const updatedProfile = { ...profile, visited: newVisited };

    replaceDestination(updatedProfile, allDisplayedCodes, unlockToken)
      .then((res) => {
        const found = res.locked ? [] : res.destinations;
        if (found.length === 0) {
          setDestinations(destinations.filter((_, i) => i !== rejectedIndex));
          return;
        }
        const updated = [...destinations];
        updated[rejectedIndex] = found[0];
        setDestinations(updated);
      })
      .catch((err) => {
        console.error('Failed to generate replacement:', err);
        setDestinations(destinations.filter((_, i) => i !== rejectedIndex));
      })
      .finally(() => setReplacingIndex(null));
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
            : unlocking
              ? '🔓 Vérification du paiement...'
              : lockedSearch
                ? lockedSearch.noMatch
                  ? '🤔 Rien ne colle parfaitement'
                  : `${lockedSearch.teasers.length} destination${lockedSearch.teasers.length > 1 ? 's' : ''} pour toi`
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

      {/* Résultats verrouillés (paywall) */}
      {!isGenerating && !unlocking && !error && lockedSearch && (
        <>
          {lockedSearch.noMatch && (
            <div className="text-sm text-gray-800 bg-amber-50 border border-amber-200 rounded-btn px-4 py-3 mb-4">
              <p className="font-semibold">{describeCriteria(profile)}, aucune destination ne respecte tous tes critères.</p>
              {lockedSearch.suggestions.length > 0 && (
                <p className="mt-2 text-xs text-gray-600">Pour trouver mieux : {lockedSearch.suggestions.join(', ou ')}.</p>
              )}
            </div>
          )}
          <LockedResults search={lockedSearch} onPay={handlePay} paying={paying} error={payError} />
        </>
      )}

      {unlocking && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!lockedSearch && payError && !unlocking && (
        <p className="text-sm text-red-600 bg-red-50 rounded-btn px-4 py-3 mb-4">{payError}</p>
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
      {!isGenerating && !unlocking && !error && !lockedSearch && destinations.length === 0 && nearMisses.length === 0 && hasStarted.current && (
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
            clearResults();
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
