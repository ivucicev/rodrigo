export function formatDateTime(recordDate: string, recordTime: string): string {
  return `${recordDate} @ ${recordTime}`;
}

export function hoursSince(iso: string, now: Date = new Date()): number {
  return (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return hoursSince(iso, now) / 24;
}

export function isChoreActive(completedAt: string | null, recurrenceHours: number | null, now: Date = new Date()): boolean {
  if (!completedAt) return false;
  if (recurrenceHours == null) return true;
  return hoursSince(completedAt, now) < recurrenceHours;
}

export function formatDueIn(completedAt: string, recurrenceHours: number, now: Date = new Date()): string {
  const elapsedHours = hoursSince(completedAt, now);
  const remainingHours = recurrenceHours - elapsedHours;
  if (remainingHours <= 0) return 'Due now';
  if (remainingHours < 24) {
    return `Due in ${Math.ceil(remainingHours)}h`;
  }
  const days = Math.ceil(remainingHours / 24);
  return `Due in ${days}d`;
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const hrs = hoursSince(iso, now);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
