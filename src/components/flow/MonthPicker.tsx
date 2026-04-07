'use client';

interface MonthPickerProps {
  onSelect: (month: string, monthIndex: number, year: number, monthHalf: '1' | '2') => void;
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

  // Generate 12 months starting from current month
  const months = Array.from({ length: 12 }, (_, i) => {
    const idx = (currentMonth + i) % 12;
    const year = currentYear + (currentMonth + i >= 12 ? 1 : 0);
    return { idx, year };
  });

  const handleSelect = (monthIdx: number, year: number, half: '1' | '2') => {
    const halfLabel = half === '1' ? 'début' : 'fin';
    const monthLabel = `${halfLabel} ${FULL_MONTH_NAMES[monthIdx]} ${year}`;
    onSelect(monthLabel, monthIdx, year, half);
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

      <h1 className="text-2xl font-bold text-gray-900 mb-1">📅 Quand pars-tu ?</h1>
      <p className="text-sm text-gray-500 mb-4">Choisis ta période de départ</p>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3 px-1">
        <span>← 1ère quinzaine</span>
        <span className="ml-auto">2ème quinzaine →</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {months.map((m) => (
          <div
            key={`${m.idx}-${m.year}`}
            className="flex flex-col rounded-btn border border-gray-200 bg-white overflow-hidden"
          >
            {/* Month label */}
            <div className="text-center pt-1.5 pb-0.5">
              <span className="text-xs font-semibold text-gray-700">{MONTH_NAMES[m.idx]}</span>
              <span className="text-[10px] text-gray-400 ml-0.5">{String(m.year).slice(2)}</span>
            </div>
            {/* Two halves side by side */}
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => handleSelect(m.idx, m.year, '1')}
                className="flex-1 py-2.5 text-[11px] font-medium text-gray-600
                  hover:bg-primary-light hover:text-primary active:scale-[0.95] transition-all
                  border-r border-gray-100"
                title={`1-15 ${FULL_MONTH_NAMES[m.idx]}`}
              >
                1-15
              </button>
              <button
                onClick={() => handleSelect(m.idx, m.year, '2')}
                className="flex-1 py-2.5 text-[11px] font-medium text-gray-600
                  hover:bg-primary-light hover:text-primary active:scale-[0.95] transition-all"
                title={`16-31 ${FULL_MONTH_NAMES[m.idx]}`}
              >
                16-31
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
