'use client';

import type { FerryInfo } from '@/lib/types';

function hours(h: number): string {
  const H = Math.floor(h);
  const M = Math.round((h - H) * 60);
  return M ? `${H}h${String(M).padStart(2, '0')}` : `${H}h`;
}

// Ligne « traversée » : prix vu sur Ferryhopper si dispo, sinon estimation de l'IA
export default function FerryLine({ ferry, className = '' }: { ferry: FerryInfo; className?: string }) {
  const r = ferry.real;
  return (
    <div className={`text-xs ${r ? 'text-teal-700' : 'text-gray-500'} ${className}`}>
      ⛴️ {ferry.fromPort} → {ferry.toPort}
      {r ? (
        <>
          {r.durationHours ? ` · ${hours(r.durationHours)}` : ''}
          {` · dès ${r.price.toLocaleString('fr-FR')}€/pers. ${r.roundTrip ? 'A/R' : 'aller'}`}
          {' · vu sur Ferryhopper'}
          {r.operator ? ` (${r.operator})` : ''}
          {r.returnEstimated ? ', retour estimé' : ''}
        </>
      ) : (
        <>
          {ferry.duration ? ` · ~${ferry.duration}` : ''}
          {ferry.pricePerPerson ? ` · ~${ferry.pricePerPerson.toLocaleString('fr-FR')}€/pers. A/R` : ''}
          {' · estimation'}
        </>
      )}
      {ferry.vehiclePrice ? (
        <span className="text-gray-400"> · voiture ~{ferry.vehiclePrice.toLocaleString('fr-FR')}€ A/R (estimation)</span>
      ) : null}
    </div>
  );
}
