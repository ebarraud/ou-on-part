'use client';

import { useTravelStore } from '@/lib/store';

export default function CreditCounter() {
  const { totalCost, totalInputTokens, totalOutputTokens } = useTravelStore();

  if (totalCost === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-btn shadow-lg px-3 py-2 text-xs z-50">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">💰</span>
        <div>
          <span className="font-bold text-gray-800">${totalCost.toFixed(4)}</span>
          <span className="text-gray-400 ml-1">dépensé</span>
        </div>
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        {totalInputTokens.toLocaleString()} in · {totalOutputTokens.toLocaleString()} out
      </div>
    </div>
  );
}
