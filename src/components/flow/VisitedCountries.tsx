'use client';

import { useState, useMemo, useEffect, useRef } from 'react';

interface VisitedCountriesProps {
  initialSelected?: string[];
  onComplete: (codes: string[]) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  progress: number;
}

// Top destinations (shown first as a grid)
const TOP_COUNTRIES = [
  { icon: '🇬🇷', label: 'Grèce', code: 'GR' },
  { icon: '🇪🇸', label: 'Espagne', code: 'ES' },
  { icon: '🇮🇹', label: 'Italie', code: 'IT' },
  { icon: '🇵🇹', label: 'Portugal', code: 'PT' },
  { icon: '🇲🇦', label: 'Maroc', code: 'MA' },
  { icon: '🇹🇭', label: 'Thaïlande', code: 'TH' },
  { icon: '🇺🇸', label: 'USA', code: 'US' },
  { icon: '🇯🇵', label: 'Japon', code: 'JP' },
  { icon: '🇹🇷', label: 'Turquie', code: 'TR' },
  { icon: '🇲🇽', label: 'Mexique', code: 'MX' },
  { icon: '🇮🇩', label: 'Indonésie', code: 'ID' },
  { icon: '🇭🇷', label: 'Croatie', code: 'HR' },
];

// Full list sorted alphabetically
const ALL_COUNTRIES = [
  { code: 'AF', label: 'Afghanistan' }, { code: 'ZA', label: 'Afrique du Sud' },
  { code: 'AL', label: 'Albanie' }, { code: 'DZ', label: 'Algérie' },
  { code: 'DE', label: 'Allemagne' }, { code: 'AD', label: 'Andorre' },
  { code: 'AO', label: 'Angola' }, { code: 'SA', label: 'Arabie saoudite' },
  { code: 'AR', label: 'Argentine' }, { code: 'AM', label: 'Arménie' },
  { code: 'AU', label: 'Australie' }, { code: 'AT', label: 'Autriche' },
  { code: 'AZ', label: 'Azerbaïdjan' },
  { code: 'BH', label: 'Bahreïn' }, { code: 'BD', label: 'Bangladesh' },
  { code: 'BE', label: 'Belgique' }, { code: 'BZ', label: 'Belize' },
  { code: 'BJ', label: 'Bénin' }, { code: 'BT', label: 'Bhoutan' },
  { code: 'BY', label: 'Biélorussie' }, { code: 'BO', label: 'Bolivie' },
  { code: 'BA', label: 'Bosnie-Herzégovine' }, { code: 'BW', label: 'Botswana' },
  { code: 'BR', label: 'Brésil' }, { code: 'BN', label: 'Brunei' },
  { code: 'BG', label: 'Bulgarie' }, { code: 'BF', label: 'Burkina Faso' },
  { code: 'BI', label: 'Burundi' },
  { code: 'KH', label: 'Cambodge' }, { code: 'CM', label: 'Cameroun' },
  { code: 'CA', label: 'Canada' }, { code: 'CV', label: 'Cap-Vert' },
  { code: 'CL', label: 'Chili' }, { code: 'CN', label: 'Chine' },
  { code: 'CY', label: 'Chypre' }, { code: 'CO', label: 'Colombie' },
  { code: 'KR', label: 'Corée du Sud' }, { code: 'CR', label: 'Costa Rica' },
  { code: 'CI', label: 'Côte d\'Ivoire' }, { code: 'HR', label: 'Croatie' },
  { code: 'CU', label: 'Cuba' },
  { code: 'DK', label: 'Danemark' }, { code: 'DJ', label: 'Djibouti' },
  { code: 'DO', label: 'Rép. dominicaine' },
  { code: 'EG', label: 'Égypte' }, { code: 'AE', label: 'Émirats arabes unis' },
  { code: 'EC', label: 'Équateur' }, { code: 'ES', label: 'Espagne' },
  { code: 'EE', label: 'Estonie' }, { code: 'US', label: 'États-Unis' },
  { code: 'ET', label: 'Éthiopie' },
  { code: 'FJ', label: 'Fidji' }, { code: 'FI', label: 'Finlande' },
  { code: 'FR', label: 'France' },
  { code: 'GA', label: 'Gabon' }, { code: 'GE', label: 'Géorgie' },
  { code: 'GH', label: 'Ghana' }, { code: 'GR', label: 'Grèce' },
  { code: 'GT', label: 'Guatemala' }, { code: 'GN', label: 'Guinée' },
  { code: 'HT', label: 'Haïti' }, { code: 'HN', label: 'Honduras' },
  { code: 'HU', label: 'Hongrie' },
  { code: 'IN', label: 'Inde' }, { code: 'ID', label: 'Indonésie' },
  { code: 'IQ', label: 'Irak' }, { code: 'IR', label: 'Iran' },
  { code: 'IE', label: 'Irlande' }, { code: 'IS', label: 'Islande' },
  { code: 'IL', label: 'Israël' }, { code: 'IT', label: 'Italie' },
  { code: 'JM', label: 'Jamaïque' }, { code: 'JP', label: 'Japon' },
  { code: 'JO', label: 'Jordanie' },
  { code: 'KZ', label: 'Kazakhstan' }, { code: 'KE', label: 'Kenya' },
  { code: 'KG', label: 'Kirghizistan' }, { code: 'KW', label: 'Koweït' },
  { code: 'LA', label: 'Laos' }, { code: 'LV', label: 'Lettonie' },
  { code: 'LB', label: 'Liban' }, { code: 'LT', label: 'Lituanie' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'MK', label: 'Macédoine du Nord' }, { code: 'MG', label: 'Madagascar' },
  { code: 'MY', label: 'Malaisie' }, { code: 'MW', label: 'Malawi' },
  { code: 'MV', label: 'Maldives' }, { code: 'ML', label: 'Mali' },
  { code: 'MT', label: 'Malte' }, { code: 'MA', label: 'Maroc' },
  { code: 'MU', label: 'Maurice' }, { code: 'MR', label: 'Mauritanie' },
  { code: 'MX', label: 'Mexique' }, { code: 'MD', label: 'Moldavie' },
  { code: 'MC', label: 'Monaco' }, { code: 'MN', label: 'Mongolie' },
  { code: 'ME', label: 'Monténégro' }, { code: 'MZ', label: 'Mozambique' },
  { code: 'MM', label: 'Myanmar' },
  { code: 'NA', label: 'Namibie' }, { code: 'NP', label: 'Népal' },
  { code: 'NI', label: 'Nicaragua' }, { code: 'NE', label: 'Niger' },
  { code: 'NG', label: 'Nigeria' }, { code: 'NO', label: 'Norvège' },
  { code: 'NZ', label: 'Nouvelle-Zélande' },
  { code: 'OM', label: 'Oman' }, { code: 'UG', label: 'Ouganda' },
  { code: 'UZ', label: 'Ouzbékistan' },
  { code: 'PK', label: 'Pakistan' }, { code: 'PA', label: 'Panama' },
  { code: 'PY', label: 'Paraguay' }, { code: 'NL', label: 'Pays-Bas' },
  { code: 'PE', label: 'Pérou' }, { code: 'PH', label: 'Philippines' },
  { code: 'PL', label: 'Pologne' }, { code: 'PT', label: 'Portugal' },
  { code: 'QA', label: 'Qatar' },
  { code: 'RO', label: 'Roumanie' }, { code: 'GB', label: 'Royaume-Uni' },
  { code: 'RU', label: 'Russie' }, { code: 'RW', label: 'Rwanda' },
  { code: 'SN', label: 'Sénégal' }, { code: 'RS', label: 'Serbie' },
  { code: 'SG', label: 'Singapour' }, { code: 'SK', label: 'Slovaquie' },
  { code: 'SI', label: 'Slovénie' }, { code: 'SO', label: 'Somalie' },
  { code: 'SD', label: 'Soudan' }, { code: 'LK', label: 'Sri Lanka' },
  { code: 'SE', label: 'Suède' }, { code: 'CH', label: 'Suisse' },
  { code: 'SR', label: 'Suriname' },
  { code: 'TW', label: 'Taïwan' }, { code: 'TZ', label: 'Tanzanie' },
  { code: 'TD', label: 'Tchad' }, { code: 'CZ', label: 'Tchéquie' },
  { code: 'TH', label: 'Thaïlande' }, { code: 'TG', label: 'Togo' },
  { code: 'TN', label: 'Tunisie' }, { code: 'TR', label: 'Turquie' },
  { code: 'UA', label: 'Ukraine' }, { code: 'UY', label: 'Uruguay' },
  { code: 'VE', label: 'Venezuela' }, { code: 'VN', label: 'Vietnam' },
  { code: 'YE', label: 'Yémen' }, { code: 'ZM', label: 'Zambie' },
  { code: 'ZW', label: 'Zimbabwe' },
].sort((a, b) => a.label.localeCompare(b.label, 'fr'));

// Continents with their country codes
const CONTINENTS: { id: string; icon: string; label: string; codes: string[] }[] = [
  {
    id: 'europe', icon: '🇪🇺', label: 'Europe',
    codes: ['AL', 'AD', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GE', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'KZ', 'LV', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 'GB', 'AM'],
  },
  {
    id: 'asia', icon: '🌏', label: 'Asie',
    codes: ['AF', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KG', 'KW', 'LA', 'LB', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'TW', 'TH', 'AE', 'UZ', 'VN', 'YE'],
  },
  {
    id: 'africa', icon: '🌍', label: 'Afrique',
    codes: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'TD', 'CI', 'DJ', 'EG', 'ET', 'GA', 'GH', 'GN', 'KE', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'SN', 'SO', 'ZA', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'],
  },
  {
    id: 'north-america', icon: '🌎', label: 'Amérique du Nord',
    codes: ['BZ', 'CA', 'CR', 'CU', 'DO', 'GT', 'HT', 'HN', 'JM', 'MX', 'NI', 'PA', 'US'],
  },
  {
    id: 'south-america', icon: '🌎', label: 'Amérique du Sud',
    codes: ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'PY', 'PE', 'SR', 'UY', 'VE'],
  },
  {
    id: 'oceania', icon: '🏝️', label: 'Océanie',
    codes: ['AU', 'FJ', 'NZ'],
  },
];

export default function VisitedCountries({
  initialSelected = [],
  onComplete,
  onBack,
  stepNumber,
  totalSteps,
  progress,
}: VisitedCountriesProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  // Sync with initialSelected after zustand hydration from localStorage
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current && initialSelected && initialSelected.length > 0) {
      setSelected(new Set(initialSelected));
    }
    hydrated.current = true;
  }, [initialSelected]);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleContinent = (continent: typeof CONTINENTS[0]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      // Check if ALL countries of this continent are already selected
      const allSelected = continent.codes.every((c) => next.has(c));
      if (allSelected) {
        // Deselect all
        continent.codes.forEach((c) => next.delete(c));
      } else {
        // Select all
        continent.codes.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  // Check continent state: 'all' | 'some' | 'none'
  const continentState = useMemo(() => {
    const states: Record<string, 'all' | 'some' | 'none'> = {};
    for (const cont of CONTINENTS) {
      const count = cont.codes.filter((c) => selected.has(c)).length;
      if (count === 0) states[cont.id] = 'none';
      else if (count === cont.codes.length) states[cont.id] = 'all';
      else states[cont.id] = 'some';
    }
    return states;
  }, [selected]);

  const filteredCountries = search
    ? ALL_COUNTRIES.filter((c) =>
        c.label.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_COUNTRIES;

  // Also filter continents by search
  const showContinents = !search;

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
              if (showAll) {
                setShowAll(false);
                setSearch('');
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

      <h1 className="text-2xl font-bold text-gray-900 mb-1">🌍 Destinations déjà visitées ?</h1>
      <p className="text-sm text-gray-500 mb-4">
        {showAll
          ? 'Sélectionne par continent ou par pays'
          : 'On évitera de te les reproposer'}
      </p>

      {!showAll ? (
        <>
          {/* Top countries grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {TOP_COUNTRIES.map((c) => {
              const isSelected = selected.has(c.code);
              return (
                <button
                  key={c.code}
                  onClick={() => toggle(c.code)}
                  className={`relative flex flex-col items-center justify-center rounded-btn py-2.5 px-1 transition-all text-center
                    ${isSelected
                      ? 'border-2 border-primary bg-primary-light text-primary-dark'
                      : 'border border-gray-200 bg-white hover:border-primary-mid hover:bg-primary-light active:scale-[0.97]'
                    }`}
                >
                  <span className="text-xl">{c.icon}</span>
                  <span className="text-xs font-semibold mt-0.5">{c.label}</span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* "Autre pays" button */}
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-3 rounded-btn border border-dashed border-gray-300 text-sm text-gray-600 hover:border-primary hover:text-primary transition-all mb-4"
          >
            🌐 Autre pays...
          </button>

          {/* Skip — only show when no countries are selected (avoids clearing rejected countries) */}
          {selected.size === 0 && (
            <button
              onClick={() => onComplete([])}
              className="text-sm text-gray-500 hover:text-primary underline self-center mb-4"
            >
              Passer — première fois que je voyage
            </button>
          )}

          {/* Confirm */}
          {selected.size > 0 && (
            <button
              onClick={() => onComplete(Array.from(selected))}
              className="w-full py-3.5 rounded-btn font-semibold text-base bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all"
            >
              Continuer ({selected.size} pays)
            </button>
          )}
        </>
      ) : (
        <>
          {/* Search bar */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un pays..."
            className="w-full rounded-btn border border-gray-200 px-4 py-3 text-sm mb-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            autoFocus
          />

          {/* Full list with continents */}
          <div className="flex-1 overflow-y-auto max-h-[50vh] space-y-1 mb-4">
            {/* Continents */}
            {showContinents && CONTINENTS.map((cont) => {
              const state = continentState[cont.id];
              return (
                <button
                  key={cont.id}
                  onClick={() => toggleContinent(cont)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-3 text-left transition-all
                    ${state === 'all'
                      ? 'bg-primary text-white'
                      : state === 'some'
                        ? 'bg-primary-light text-primary-dark border border-primary-mid'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cont.icon}</span>
                    <span className="text-sm font-bold">{cont.label}</span>
                    <span className={`text-[10px] ${state === 'all' ? 'text-white/70' : 'text-gray-400'}`}>
                      ({cont.codes.length} pays)
                    </span>
                  </div>
                  {state === 'all' && (
                    <span className="w-5 h-5 rounded-full bg-white text-primary flex items-center justify-center text-xs shrink-0 font-bold">
                      ✓
                    </span>
                  )}
                  {state === 'some' && (
                    <span className="w-5 h-5 rounded-full bg-primary-mid text-white flex items-center justify-center text-[10px] shrink-0">
                      —
                    </span>
                  )}
                </button>
              );
            })}

            {/* Separator */}
            {showContinents && (
              <div className="border-t border-gray-200 my-2" />
            )}

            {/* Countries */}
            {filteredCountries.map((c) => {
              const isSelected = selected.has(c.code);
              return (
                <button
                  key={c.code}
                  onClick={() => toggle(c.code)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all
                    ${isSelected
                      ? 'bg-primary-light text-primary-dark border border-primary'
                      : 'hover:bg-gray-50 border border-transparent'
                    }`}
                >
                  <span className="text-sm">{c.label}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun résultat</p>
            )}
          </div>

          {/* Confirm from full list */}
          <button
            onClick={() => onComplete(Array.from(selected))}
            className={`w-full py-3.5 rounded-btn font-semibold text-base transition-all
              ${selected.size > 0
                ? 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400'
              }`}
          >
            {selected.size > 0
              ? `Continuer (${selected.size} pays)`
              : 'Continuer sans sélection'}
          </button>
        </>
      )}
    </div>
  );
}
