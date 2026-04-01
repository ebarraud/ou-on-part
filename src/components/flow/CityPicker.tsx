'use client';

import { useState } from 'react';

interface CityPickerProps {
  onSelect: (city: string) => void;
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
        <div className="space-y-4">
          <input
            type="text"
            value={customCity}
            onChange={(e) => setCustomCity(e.target.value)}
            placeholder="Tape le nom de ta ville"
            className="w-full rounded-btn border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            onClick={() => customCity.trim() && onSelect(customCity.trim())}
            disabled={!customCity.trim()}
            className={`w-full py-3.5 rounded-btn font-semibold text-base transition-all
              ${customCity.trim()
                ? 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            Valider
          </button>
        </div>
      )}
    </div>
  );
}
