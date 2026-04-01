'use client';

export default function BudgetRange({ min, max, currency }: { min: number; max: number; currency: string }) {
  return (
    <span className="text-sm font-semibold text-gray-700">
      {min.toLocaleString('fr-FR')}€ – {max.toLocaleString('fr-FR')}€
      <span className="text-xs text-gray-400 font-normal ml-1">/ pers.</span>
    </span>
  );
}
