'use client';

import { useState } from 'react';
import type { LockedSearch } from '@/lib/api-types';

interface Props {
  search: LockedSearch;
  onPay: () => void;
  paying: boolean;
  error: string | null;
}

const FAKE_NAMES = ['██████████', '████████████', '█████████'];

// Résultats verrouillés : vraies infos non sensibles, noms masqués, paiement pour débloquer
export default function LockedResults({ search, onPay, paying, error }: Props) {
  const [waiver, setWaiver] = useState(false);
  const price = (search.priceCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return (
    <div className="relative">
      <div className="space-y-4 select-none" aria-hidden="true">
        {search.teasers.map((t, i) => (
          <div key={i} className="w-full bg-white border border-gray-200 rounded-btn p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gray-200 blur-[2px]" />
                <div>
                  <h3 className="text-base font-bold text-gray-900 blur-[6px]">{FAKE_NAMES[i % 3]}</h3>
                  <p className="text-xs text-gray-500 blur-[5px]">███████</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-primary">{t.matchScore}</span>
                <span className="text-xs text-primary font-medium">%</span>
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-700 mb-2">
              {t.budgetMin.toLocaleString('fr-FR')}€ – {t.budgetMax.toLocaleString('fr-FR')}€
              <span className="text-xs text-gray-400 font-normal ml-1">/ pers. · estimation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>✈️ {t.flightDuration}</span>
              <span>☀️ {t.airTemp}°C</span>
              {t.waterTemp ? <span>🌊 {t.waterTemp}°C</span> : null}
              {t.hasFerry ? <span>⛴️ ferry</span> : null}
            </div>
            <div className="mt-3 space-y-1.5 blur-[5px]">
              <div className="h-3 bg-gray-200 rounded w-11/12" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Panneau de paiement */}
      <div className="sticky bottom-4 mt-4 bg-white border-2 border-primary rounded-btn shadow-xl p-4">
        <p className="text-base font-bold text-gray-900">
          {search.noMatch
            ? `🔒 Les ${search.teasers.length} destinations les plus proches de tes critères`
            : `🔒 Tes ${search.teasers.length} destination${search.teasers.length > 1 ? 's sont prêtes' : ' est prête'}`}
        </p>
        <ul className="text-xs text-gray-600 mt-2 space-y-1">
          <li>✓ Les destinations, avec le détail et les liens de réservation</li>
          <li>✓ Remplacer une destination qui ne te plaît pas</li>
          <li>✓ L&apos;itinéraire jour par jour de la destination choisie</li>
          <li className="text-gray-400">Accès pendant {search.hours} h · paiement unique, sans abonnement</li>
        </ul>

        <label className="flex items-start gap-2 mt-3 text-[11px] text-gray-500 leading-snug">
          <input
            type="checkbox"
            checked={waiver}
            onChange={(e) => setWaiver(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span>
            Je demande l&apos;accès immédiat aux résultats et je reconnais perdre mon droit de rétractation une fois
            l&apos;accès fourni.
          </span>
        </label>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <button
          onClick={onPay}
          disabled={!waiver || paying}
          className="mt-3 w-full py-3.5 rounded-btn font-semibold text-base bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400"
        >
          {paying ? 'Redirection vers le paiement…' : `Débloquer pour ${price}`}
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-2">Paiement sécurisé par Stripe · carte, Apple Pay, Google Pay</p>
      </div>
    </div>
  );
}
