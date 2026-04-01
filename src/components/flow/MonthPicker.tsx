'use client';

interface MonthPickerProps {
  onSelect: (month: string, monthIndex: number, year: number) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  progress: number;
}

const MONTH_NAMES = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
];

const FULL_MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export default function MonthPicker({
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
  progress,
}: MonthPickerProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Generate 12 months starting from next month
  const months = Array.from({ length: 12 }, (_, i) => {
    const idx = (currentMonth + 1 + i) % 12;
    const year = currentYear + (currentMonth + 1 + i >= 12 ? 1 : 0);
    return { idx, year, label: `${MONTH_NAMES[idx]} / ${year}` };
  });

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
            onClick={onBack}
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

      <h1 className="text-2xl font-bold text-gray-900 mb-1">📅 Quel mois ?</h1>
      <p className="text-sm text-gray-500 mb-6">Choisis ton mois de départ</p>

      <div className="grid grid-cols-4 gap-3">
        {months.map((m) => (
          <button
            key={`${m.idx}-${m.year}`}
            onClick={() => onSelect(`${FULL_MONTH_NAMES[m.idx]} ${m.year}`, m.idx, m.year)}
            className="flex flex-col items-center justify-center rounded-btn border border-gray-200 bg-white py-3 px-1
              hover:border-primary-mid hover:bg-primary-light active:scale-[0.97] transition-all"
          >
            <span className="text-sm font-semibold">{MONTH_NAMES[m.idx]}</span>
            <span className="text-[11px] text-gray-400">{m.year}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
