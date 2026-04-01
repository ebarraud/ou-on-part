'use client';

import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';
import { calculateBudget } from '@/lib/budget';
import WarningBadge from '@/components/results/WarningBadge';

export default function DestinationPage() {
  const router = useRouter();
  const { profile, selectedDestination: dest } = useTravelStore();

  if (!dest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500 mb-4">Destination non trouvée</p>
        <button
          onClick={() => router.push('/results')}
          className="text-primary underline text-sm"
        >
          Retour aux résultats
        </button>
      </div>
    );
  }

  const adjustedBudget = calculateBudget(profile, dest.budget);

  return (
    <div className="flex flex-col min-h-screen pb-8">
      {/* Header */}
      <div className="bg-primary px-4 pt-6 pb-8 text-white">
        <button
          onClick={() => router.push('/results')}
          className="text-white/70 hover:text-white mb-4 flex items-center gap-1 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Résultats
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{dest.flag}</span>
          <div>
            <h1 className="text-2xl font-bold">{dest.city}</h1>
            <p className="text-white/80">{dest.country}</p>
          </div>
        </div>
        {/* Match score bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Score de matching</span>
            <span className="font-bold">{dest.matchScore}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${dest.matchScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {/* Info grid */}
        <div className="bg-white rounded-btn shadow-sm border border-gray-100 p-4 grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-400">Vol depuis {profile.departureCity}</p>
            <p className="text-sm font-semibold">{dest.flightDuration} · {dest.flightType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Température air</p>
            <p className="text-sm font-semibold">☀️ {dest.airTemp}°C</p>
          </div>
          {dest.waterTemp && (
            <div>
              <p className="text-xs text-gray-400">Température eau</p>
              <p className="text-sm font-semibold">🌊 {dest.waterTemp}°C</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Budget estimé</p>
            <p className="text-sm font-semibold">
              {adjustedBudget.min.toLocaleString('fr-FR')}€ – {adjustedBudget.max.toLocaleString('fr-FR')}€
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Visa requis</p>
            <p className="text-sm font-semibold">{dest.visaRequired ? '⚠️ Oui' : '✅ Non'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Langue</p>
            <p className="text-sm font-semibold">{dest.mainLanguage}</p>
          </div>
        </div>

        {/* Match reasons */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Pourquoi cette destination ?</h2>
          <ul className="space-y-2">
            {dest.matchReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-primary mt-0.5">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Highlights */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">À ne pas rater</h2>
          <ul className="space-y-2">
            {dest.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span>📍</span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Warnings */}
        {dest.warnings.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">À savoir</h2>
            <div className="space-y-2">
              {dest.warnings.map((w, i) => (
                <WarningBadge key={i} warning={w} />
              ))}
            </div>
          </div>
        )}

        {/* Booking links */}
        <div className="mb-6 space-y-2">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Réserver</h2>
          <a
            href={dest.bookingLinks.flights}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-btn border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">✈️</span>
            <span className="text-sm font-medium">Trouver un vol sur Skyscanner</span>
          </a>
          <a
            href={dest.bookingLinks.hotels}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-btn border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">🏨</span>
            <span className="text-sm font-medium">Trouver un hôtel sur Booking</span>
          </a>
          <a
            href={dest.bookingLinks.activities}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-btn border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">🎟️</span>
            <span className="text-sm font-medium">Activités sur GetYourGuide</span>
          </a>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/itinerary')}
          className="w-full py-4 rounded-btn font-semibold text-base bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Créer mon itinéraire →
        </button>
      </div>
    </div>
  );
}
