'use client';

import { useEffect, useRef, useState } from 'react';
import { nearestAirport, type NearestAirport } from '@/lib/airports';

export interface CityDetails {
  lat: number;
  lng: number;
  airport: NearestAirport;
}

interface Commune {
  nom: string;
  code: string;
  codesPostaux?: string[];
  departement?: { code: string; nom: string };
  centre?: { coordinates: [number, number] }; // [lng, lat]
}

interface CityPickerProps {
  onSelect: (city: string, details?: CityDetails) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  progress: number;
}

const CITIES = [
  { icon: '🗼', label: 'Paris', value: 'Paris' },
  { icon: '🦁', label: 'Lyon', value: 'Lyon' },
  { icon: '⛵', label: 'Marseille', value: 'Marseille' },
  { icon: '🍷', label: 'Bordeaux', value: 'Bordeaux' },
  { icon: '🏰', label: 'Nantes', value: 'Nantes' },
  { icon: '🥨', label: 'Strasbourg', value: 'Strasbourg' },
  { icon: '🌹', label: 'Toulouse', value: 'Toulouse' },
  { icon: '🏖️', label: 'Nice', value: 'Nice' },
];

export default function CityPicker({
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
  progress,
}: CityPickerProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [results, setResults] = useState<Commune[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const requestId = useRef(0);

  // Recherche des communes françaises (API officielle geo.api.gouv.fr)
  useEffect(() => {
    const term = customCity.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const id = ++requestId.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(term)}&fields=nom,codesPostaux,centre,departement&boost=population&limit=8`;
        const res = await fetch(url);
        const data: Commune[] = res.ok ? await res.json() : [];
        if (id !== requestId.current) return;
        setResults(data.filter((c) => c.centre?.coordinates));
        setSearchError(!res.ok);
      } catch {
        if (id !== requestId.current) return;
        setResults([]);
        setSearchError(true);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customCity]);

  const pickCommune = (c: Commune) => {
    const [lng, lat] = c.centre!.coordinates;
    onSelect(c.nom, { lat, lng, airport: nearestAirport(lat, lng) });
  };

  return (
    <div className="flex flex-col min-h-screen px-4 pb-8">
      {/* Progress bar */}
      <div className="w-full h-[3px] bg-gray-100 mt-0">
        <div
          className="h-full bg-primary rounded-r-sm transition-all duration-400 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center pt-4 pb-2">
        {onBack && (
          <button
            onClick={() => {
              if (customMode) {
                setCustomMode(false);
              } else {
                onBack();
              }
            }}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Retour"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">
          {stepNumber}/{totalSteps}
        </span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">📍 Ville de départ ?</h1>
      <p className="text-sm text-gray-500 mb-6">D&apos;où pars-tu ?</p>

      {!customMode ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {CITIES.map((city) => (
              <button
                key={city.value}
                onClick={() => onSelect(city.value)}
                className="flex flex-col items-center justify-center rounded-btn border border-gray-200 bg-white py-3 px-2
                  hover:border-primary-mid hover:bg-primary-light active:scale-[0.97] transition-all"
              >
                <span className="text-2xl mb-1">{city.icon}</span>
                <span className="text-sm font-semibold">{city.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setCustomMode(true)}
            className="mt-4 text-sm text-gray-500 hover:text-primary underline self-center"
          >
            Autre ville
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={customCity}
            onChange={(e) => setCustomCity(e.target.value)}
            placeholder="Commence à taper le nom de ta commune"
            className="w-full rounded-btn border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            autoFocus
            autoComplete="off"
          />

          {results.length > 0 && (
            <ul className="rounded-btn border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
              {results.map((c) => {
                const [lng, lat] = c.centre!.coordinates;
                const airport = nearestAirport(lat, lng);
                return (
                  <li key={c.code}>
                    <button
                      onClick={() => pickCommune(c)}
                      className="w-full text-left px-4 py-3 hover:bg-primary-light active:bg-primary-light transition-colors"
                    >
                      <span className="block text-sm font-semibold text-gray-900">
                        {c.nom}
                        <span className="font-normal text-gray-400">
                          {' '}
                          · {c.codesPostaux?.[0] || c.departement?.code}
                          {c.departement?.nom ? ` · ${c.departement.nom}` : ''}
                        </span>
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        ✈️ Aéroport le plus proche : {airport.name} ({airport.km} km)
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-xs text-gray-400 text-center min-h-[1rem]">
            {customCity.trim().length < 2
              ? 'Tape au moins 2 lettres, puis choisis ta commune dans la liste'
              : searching
                ? 'Recherche…'
                : searchError
                  ? 'Recherche indisponible, réessaie dans un instant'
                  : results.length === 0
                    ? 'Aucune commune trouvée — vérifie l\'orthographe'
                    : 'Touche ta commune pour la valider'}
          </p>
        </div>
      )}
    </div>
  );
}
