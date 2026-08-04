export function formatKm(km: number): string {
  return `${km.toLocaleString('en-IN')} km`;
}

export function formatTime(timeStr?: string): string {
  if (!timeStr) return '--:--';
  return timeStr;
}

export function formatDelay(delayMinutes: number): { text: string; color: string; bg: string } {
  if (delayMinutes <= 0) {
    return { text: 'On Time', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
  }
  if (delayMinutes <= 15) {
    return { text: `${delayMinutes}m Late`, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  }
  return { text: `${delayMinutes}m Late`, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function calculateETA(scheduledTime: string, delayMinutes: number): string {
  if (!scheduledTime || scheduledTime === '--:--') return '--:--';
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return scheduledTime;

  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + delayMinutes);

  const formattedHours = String(date.getHours()).padStart(2, '0');
  const formattedMinutes = String(date.getMinutes()).padStart(2, '0');
  return `${formattedHours}:${formattedMinutes}`;
}
