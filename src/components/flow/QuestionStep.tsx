'use client';

import { useState } from 'react';
import type { QuestionOption } from '@/lib/types';

interface QuestionStepProps {
  question: string;
  subtitle?: string;
  contextBadge?: string;
  options: QuestionOption[];
  multi?: boolean;
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'list';
  skipLabel?: string;
  initialValues?: string[];
  onComplete: (values: string[]) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  progress: number;
}

export default function QuestionStep({
  question,
  subtitle,
  contextBadge,
  options,
  multi = false,
  columns = 2,
  layout = 'grid',
  skipLabel,
  initialValues = [],
  onComplete,
  onBack,
  stepNumber,
  totalSteps,
  progress,
}: QuestionStepProps) {
  const [selected, setSelected] = useState<string[]>(initialValues);

  const handleSelect = (value: string) => {
    if (!multi) {
      onComplete([value]);
      return;
    }
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const gridCols =
    layout === 'list'
      ? 'grid-cols-1'
      : columns === 4
        ? 'grid-cols-4'
        : columns === 3
          ? 'grid-cols-3'
          : 'grid-cols-2';

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

      {/* Context badge */}
      {contextBadge && (
        <span className="inline-block self-start text-xs bg-primary-light text-primary-dark px-3 py-1 rounded-full mb-2">
          {contextBadge}
        </span>
      )}

      {/* Question */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{question}</h1>
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}

      {/* Options */}
      <div className={`grid ${gridCols} gap-3`}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          const isDisabled = opt.disabled;

          return (
            <button
              key={opt.value}
              onClick={() => !isDisabled && handleSelect(opt.value)}
              disabled={isDisabled}
              className={`
                relative flex ${layout === 'list' ? 'flex-row items-center gap-3' : 'flex-col items-center justify-center'}
                rounded-btn px-3 py-3 text-left transition-all duration-150
                ${isDisabled
                  ? 'border border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  : isSelected
                    ? 'border-2 border-primary bg-primary-light text-primary-dark shadow-sm'
                    : 'border border-gray-200 bg-white hover:border-primary-mid hover:bg-primary-light active:scale-[0.97]'
                }
              `}
            >
              <span className={`text-2xl ${layout === 'list' ? '' : 'mb-1'}`}>{opt.icon}</span>
              <div className={layout === 'list' ? 'flex-1' : 'text-center'}>
                <span className="text-sm font-semibold block leading-tight">{opt.label}</span>
                {opt.detail && (
                  <span className="text-xs text-gray-500 block mt-0.5">{opt.detail}</span>
                )}
              </div>
              {isDisabled && opt.disabledReason && (
                <span className="text-[10px] text-gray-400 block mt-1">{opt.disabledReason}</span>
              )}
              {multi && isSelected && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Skip button */}
      {skipLabel && (
        <button
          onClick={() => onComplete([])}
          className="mt-4 text-sm text-gray-500 hover:text-primary underline self-center"
        >
          {skipLabel}
        </button>
      )}

      {/* Multi-select confirm button */}
      {multi && (
        <button
          onClick={() => onComplete(selected)}
          disabled={selected.length === 0 && !skipLabel}
          className={`
            mt-6 w-full py-3.5 rounded-btn font-semibold text-base transition-all
            ${selected.length > 0
              ? 'bg-primary text-white hover:bg-primary-dark active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continuer{selected.length > 0 ? ` (${selected.length})` : ''}
        </button>
      )}
    </div>
  );
}
