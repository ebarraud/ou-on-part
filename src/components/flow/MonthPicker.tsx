'use client';

import { useState } from 'react';
import { formatShortRange, nightsBetween, toYmd } from '@/lib/dates';

interface MonthPickerProps {
  onSelect: (month: string, monthIndex: number, year: number, monthHalf: '1' | '2') => void;
  onSelectDates?: (startDate: string, endDate: string) => void;
  initialStart?: string;
  initialEnd?: string;
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

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MAX_NIGHTS = 30;

function DateRangeCalendar({
  initialStart,
  initialEnd,
  onConfirm,
}: {
  initialStart?: string;
  initialEnd?: string;
  onConfirm: (start: string, end: string) => void;
}) {
  const today = new Date();
  const todayYmd = toYmd(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const maxYmd = toYmd(new Date(Date.UTC(today.getFullYear() + 1, today.getMonth(), today.getDate())));

  const [start, setStart] = useState<string | null>(initialStart || null);
  const [end, setEnd] = useState<string | null>(initialEnd || null);
  const [view, setView] = useState(
    initialStart
      ? { y: Number(initialStart.slice(0, 4)), m: Number(initialStart.slice(5, 7)) - 1 }
      : { y: today.getFullYear(), m: today.getMonth() }
  );

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toYmd(new Date(Date.UTC(view.y, view.m, i + 1)))),
  ];

  const canPrev = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m > today.getMonth());
  const canNext = toYmd(new Date(Date.UTC(view.y, view.m + 1, 1))) <= maxYmd;
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(view.y, view.m + delta, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  const pick = (day: string) => {
    if (!start || end || day <= start) {
      setStart(day);
      setEnd(null);
      return;
    }
    if (nightsBetween(start, day) > MAX_NIGHTS) return;
    setEnd(day);
  };

  const nights = start && end ? nightsBetween(start, end) : 0;

  return (
    <div className="rounded-btn border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="px-3 py-1 text-gray-500 disabled:opacity-20"
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-800 capitalize">
          {FULL_MONTH_NAMES[view.m]} {view.y}
        </span>
        <button
          onClick={() => shift(1)}
          disabled={!canNext}
          className="px-3 py-1 text-gray-500 disabled:opacity-20"
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 mb-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const disabled =
            day <= todayYmd || day > maxYmd || (!!start && !end && day > start && nightsBetween(start, day) > MAX_NIGHTS);
          const isEdge = day === start || day === end;
          const inRange = !!start && !!end && day > start && day < end;
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => pick(day)}
              className={`py-2 text-xs rounded-lg transition-all ${
                isEdge
                  ? 'bg-primary text-white font-semibold'
                  : inRange
                    ? 'bg-primary-light text-primary'
                    : 'text-gray-700 hover:bg-gray-100'
              } disabled:text-gray-300 disabled:hover:bg-transparent`}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 text-center mt-3 min-h-[1rem]">
        {!start
          ? 'Touche ta date de départ'
          : !end
            ? 'Touche ta date de retour'
            : `${formatShortRange(start, end)} · ${nights} nuit${nights > 1 ? 's' : ''}`}
      </p>

      <button
        disabled={!start || !end}
        onClick={() => start && end && onConfirm(start, end)}
        className="mt-3 w-full py-3 rounded-btn font-semibold text-sm bg-primary text-white disabled:bg-gray-200 disabled:text-gray-400 transition-all"
      >
        Valider ces dates
      </button>
    </div>
  );
}

export default function MonthPicker({
  onSelect,
  onSelectDates,
  initialStart,
  initialEnd,
  onBack,
  stepNumber,
  totalSteps,
  progress,
}: MonthPickerProps) {
  const [exactMode, setExactMode] = useState(!!(initialStart && initialEnd));
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
      <p className="text-sm text-gray-500 mb-4">
        {exactMode ? 'Choisis tes dates aller et retour' : 'Choisis ta période de départ'}
      </p>

      {onSelectDates && (
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-btn mb-4 text-sm">
          <button
            onClick={() => setExactMode(false)}
            className={`py-2 rounded-lg font-medium transition-all ${!exactMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            🗓️ Je suis flexible
          </button>
          <button
            onClick={() => setExactMode(true)}
            className={`py-2 rounded-lg font-medium transition-all ${exactMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            📌 Dates précises
          </button>
        </div>
      )}

      {exactMode && onSelectDates ? (
        <DateRangeCalendar initialStart={initialStart} initialEnd={initialEnd} onConfirm={onSelectDates} />
      ) : (
      <>
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
      </>
      )}
    </div>
  );
}
