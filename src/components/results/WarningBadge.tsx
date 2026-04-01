'use client';

import type { Warning } from '@/lib/types';
import { getWarningStyle, getWarningIcon } from '@/lib/warnings';

export default function WarningBadge({ warning }: { warning: Warning }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${getWarningStyle(warning.level)}`}>
      <span className="shrink-0">{getWarningIcon(warning.level)}</span>
      <span>{warning.text}</span>
    </div>
  );
}
