'use client';

import type { Destination } from '@/lib/types';
import { getCarCostLine } from '@/lib/transport';
import WarningBadge from './WarningBadge';
import BudgetRange from './BudgetRange';
import { formatShortRange } from '@/lib/dates';
import FerryLine from './FerryLine';

interface DestinationCardProps {
  destination: Destination;
  displayBudget?: { min: number; max: number };
  rank: 1 | 2 | 3;
  onSelect: () => void;
  onReject?: (countryCode: string) => void;
  departureCity?: string;
  distanceFrom?: string;
  nights?: string;
  hasCarTransport?: boolean;
}

export default function DestinationCard({
  destination,
  displayBudget,
  rank,
  onSelect,
  onReject,
  departureCity,
  distanceFrom,
  nights,
  hasCarTransport,
}: DestinationCardProps) {
  const d = destination;

  // Car cost line (only if user selected car as transport)
  const carLine = hasCarTransport && departureCity && nights
    ? getCarCostLine(departureCity, d.city, d.countryCode || '', nights, distanceFrom)
    : null;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-btn p-4 hover:border-primary-mid hover:shadow-sm transition-all">
      {/* Clickable area */}
      <button onClick={onSelect} className="w-full text-left active:scale-[0.99] transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{d.flag}</span>
            <div>
              <h3 className="text-base font-bold text-gray-900">{d.city}</h3>
              <p className="text-xs text-gray-500">{d.country}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-primary">{d.matchScore}</span>
            <span className="text-xs text-primary font-medium">%</span>
          </div>
        </div>

        {/* Budget */}
        <div className="mb-2">
          <BudgetRange
            min={displayBudget?.min ?? d.budget.min}
            max={displayBudget?.max ?? d.budget.max}
            currency={d.budget.currency}
          />
        </div>

        {/* Quick info */}
        {d.flightPrice && (
          <div className="text-xs text-emerald-700 mb-1">
            ✈️ Vol A/R dès {d.flightPrice.price.toLocaleString('fr-FR')}€/pers. · vu récemment sur Aviasales{d.flightPrice.approx ? ' (dates proches)' : ''}
            {!d.flightPrice.withinLimit && d.flightPrice.durationTo ? (
              <span className="text-amber-700">
                {' '}— ce vol fait {Math.floor(d.flightPrice.durationTo / 60)}h{String(d.flightPrice.durationTo % 60).padStart(2, '0')}
                {d.flightPrice.transfers ? ` avec ${d.flightPrice.transfers} escale${d.flightPrice.transfers > 1 ? 's' : ''}` : ''}
              </span>
            ) : null}
          </div>
        )}
        {d.ferry && <FerryLine ferry={d.ferry} className="mb-1" />}
        {d.flightAlternative && (
          <div className="text-xs text-sky-700 mb-1">
            💡 {d.flightAlternative.price.toLocaleString('fr-FR')}€/pers. en partant du{' '}
            {formatShortRange(d.flightAlternative.departureAt!.slice(0, 10), d.flightAlternative.returnAt!.slice(0, 10))}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span>✈️ {d.flightDuration}{d.flightType && d.flightType !== 'direct' && /escale/.test(d.flightType) ? ` · ${d.flightType}` : ''}</span>
          <span>☀️ {d.airTemp}°C</span>
          {d.waterTemp && <span>🌊 {d.waterTemp}°C</span>}
        </div>

        {/* Car cost line */}
        {carLine && (
          <div className={`text-xs rounded-lg px-3 py-2 mb-3 ${
            carLine.available
              ? 'bg-blue-50 text-blue-800'
              : 'bg-gray-50 text-gray-500'
          }`}>
            <div className="font-medium">{carLine.text}</div>
            {carLine.detail && (
              <div className="text-[10px] mt-0.5 opacity-75">{carLine.detail}</div>
            )}
          </div>
        )}

        {/* Warnings */}
        {d.warnings.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {d.warnings.map((w, i) => (
              <WarningBadge key={i} warning={w} />
            ))}
          </div>
        )}

        {/* Pills */}
        <div className="flex flex-wrap gap-1.5">
          {d.pills.map((pill, i) => (
            <span
              key={i}
              className="text-[11px] bg-primary-light text-primary-dark px-2.5 py-1 rounded-full font-medium"
            >
              {pill}
            </span>
          ))}
        </div>
      </button>

      {/* Reject button — outside clickable card area */}
      {onReject && d.countryCode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject(d.countryCode);
          }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-500 text-xs hover:bg-red-50 transition-colors"
        >
          <span>✕</span>
          <span>Pas {d.country} — proposer autre chose</span>
        </button>
      )}
    </div>
  );
}
