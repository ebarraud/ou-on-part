import type { WarningLevel, Warning } from './types';

export const warningStyles: Record<WarningLevel, string> = {
  red: 'bg-red-50 text-red-800 border-red-200',
  orange: 'bg-amber-50 text-amber-800 border-amber-200',
  green: 'bg-green-50 text-green-800 border-green-200',
};

export const warningIcons: Record<WarningLevel, string> = {
  red: '🔴',
  orange: '⚠️',
  green: '✓',
};

export function getWarningStyle(level: WarningLevel): string {
  return warningStyles[level];
}

export function getWarningIcon(level: WarningLevel): string {
  return warningIcons[level];
}
