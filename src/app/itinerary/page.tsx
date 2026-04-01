'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTravelStore } from '@/lib/store';
import { generateItinerary, generateRoute } from '@/lib/claude';

export default function ItineraryPage() {
  const router = useRouter();
  const {
    profile,
    selectedDestination,
    itinerary,
    setItinerary,
    route,
    setRoute,
    isGenerating,
    setIsGenerating,
  } = useTravelStore();

  const isMoving = profile.travelStyle === 'moving';

  useEffect(() => {
    if (itinerary || route || isGenerating) return;
    if (!selectedDestination) {
      router.push('/results');
      return;
    }

    setIsGenerating(true);

    const generate = isMoving
      ? generateRoute(profile, selectedDestination).then(setRoute)
      : generateItinerary(profile, selectedDestination).then(setItinerary);

    generate
      .catch((err) => console.error('Failed to generate:', err))
      .finally(() => setIsGenerating(false));
  }, [profile, selectedDestination, itinerary, route, isGenerating, isMoving, setItinerary, setRoute, setIsGenerating, router]);

  // =============================================
  // Loading
  // =============================================
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 gap-4">
        <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-500 text-center">
          {isMoving
            ? "L'IA conçoit ton circuit multi-étapes..."
            : "L'IA construit ton itinéraire jour par jour..."}
        </p>
      </div>
    );
  }

  // =============================================
  // Route mode (on bouge)
  // =============================================
  if (isMoving && route) {
    return (
      <div className="flex flex-col min-h-screen pb-8">
        <div className="bg-primary px-4 pt-6 pb-6 text-white">
          <button
            onClick={() => router.push(`/destination/${selectedDestination?.id}`)}
            className="text-white/70 hover:text-white mb-3 flex items-center gap-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-bold">🗺️ Ton circuit</h1>
          <p className="text-white/80 text-sm mt-1">
            {route.route.length} étapes · Budget {route.total_budget.min.toLocaleString('fr-FR')}€ – {route.total_budget.max.toLocaleString('fr-FR')}€
          </p>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {route.route.map((stop, i) => (
            <div key={i} className="border border-gray-200 rounded-btn p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {stop.stop}
                </span>
                <span className="text-lg">{stop.flag}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{stop.city}</h3>
                  <p className="text-xs text-gray-500">{stop.country} · {stop.nights} nuits</p>
                </div>
              </div>

              {/* Transport in */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 mb-2">
                {stop.transport_in.type === 'plane' ? '✈️' : stop.transport_in.type === 'train' ? '🚂' : stop.transport_in.type === 'ferry' ? '⛴️' : '🚗'}{' '}
                Depuis {stop.transport_in.from} · {stop.transport_in.duration} · ~{stop.transport_in.estimated_cost}€
              </div>

              {/* Highlights */}
              <ul className="space-y-1">
                {stop.highlights.map((h, j) => (
                  <li key={j} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-primary">•</span> {h}
                  </li>
                ))}
              </ul>

              {/* Transport to next */}
              {stop.transport_to_next && (
                <div className="mt-3 text-xs text-primary-dark bg-primary-light rounded px-3 py-2 font-medium">
                  → Vers {stop.transport_to_next.to} · {stop.transport_to_next.duration} · ~{stop.transport_to_next.estimated_cost}€
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =============================================
  // Itinerary mode (pose la valise)
  // =============================================
  if (itinerary) {
    return (
      <div className="flex flex-col min-h-screen pb-8">
        <div className="bg-primary px-4 pt-6 pb-6 text-white">
          <button
            onClick={() => router.push(`/destination/${selectedDestination?.id}`)}
            className="text-white/70 hover:text-white mb-3 flex items-center gap-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-bold">📋 Ton itinéraire</h1>
          <p className="text-white/80 text-sm mt-1">
            {selectedDestination?.city} · {itinerary.itinerary.length} jours ·{' '}
            {itinerary.total_budget.min.toLocaleString('fr-FR')}€ – {itinerary.total_budget.max.toLocaleString('fr-FR')}€
          </p>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {itinerary.itinerary.map((day) => (
            <div key={day.day} className="border border-gray-200 rounded-btn p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  J{day.day}
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{day.title}</h3>
                  <p className="text-xs text-gray-500">{day.date}</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-primary">~{day.budget_day}€</span>
              </div>

              <div className="space-y-2">
                {/* Morning */}
                <div className="flex gap-2">
                  <span className="text-sm">🌅</span>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{day.morning.activity}</p>
                    <p className="text-xs text-gray-500">{day.morning.duration} · {day.morning.tip}</p>
                  </div>
                </div>
                {/* Afternoon */}
                <div className="flex gap-2">
                  <span className="text-sm">☀️</span>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{day.afternoon.activity}</p>
                    <p className="text-xs text-gray-500">{day.afternoon.duration} · {day.afternoon.tip}</p>
                  </div>
                </div>
                {/* Evening */}
                <div className="flex gap-2">
                  <span className="text-sm">🌙</span>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{day.evening.activity}</p>
                    <p className="text-xs text-gray-500">{day.evening.duration} · {day.evening.tip}</p>
                    {day.evening.restaurant && (
                      <p className="text-xs text-primary font-medium mt-0.5">🍽️ {day.evening.restaurant}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Accommodation */}
              <div className="mt-3 text-xs bg-gray-50 rounded px-3 py-2 text-gray-600">
                🏨 {day.accommodation.name} — {day.accommodation.area}
              </div>
            </div>
          ))}

          {/* Packing tips */}
          {itinerary.packing_tips.length > 0 && (
            <div className="border border-gray-200 rounded-btn p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-2">🧳 Dans ta valise</h3>
              <ul className="space-y-1">
                {itinerary.packing_tips.map((tip, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-primary">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Local transport */}
          <div className="text-xs text-gray-500 text-center py-2">
            🚌 Transport local recommandé : {itinerary.best_transport_local}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <p className="text-gray-500 mb-4">Aucun itinéraire disponible</p>
      <button onClick={() => router.push('/results')} className="text-primary underline text-sm">
        Retour aux résultats
      </button>
    </div>
  );
}
