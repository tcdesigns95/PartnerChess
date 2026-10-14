export const CLOCK_PRESETS = [
  { id: '5m', label: '5 min', ms: 5 * 60 * 1000 },
  { id: '10m', label: '10 min', ms: 10 * 60 * 1000 },
  { id: '30m', label: '30 min', ms: 30 * 60 * 1000 },
  { id: '1d', label: '1 day', ms: 24 * 60 * 60 * 1000 },
  { id: 'off', label: 'No timer', ms: 0 },
] as const;

export type ClockPresetId = (typeof CLOCK_PRESETS)[number]['id'];

/** Count-up display. Whole seconds already completed, so a new turn stays at 0:00 for the first second. */
export function formatElapsed(ms: number): string {
  return formatParts(Math.max(0, Math.floor(ms / 1000)));
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return formatParts(total);
}

function formatParts(total: number): string {
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const rest = hours % 24;
    return rest ? `${days}d ${rest}h` : `${days}d`;
  }
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
