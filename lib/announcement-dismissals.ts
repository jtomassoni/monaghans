const STORAGE_KEY = 'monaghans.dismissed-announcements.v1';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function readDismissedAnnouncementIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function persistDismissedAnnouncementId(id: string) {
  if (!isBrowser()) return;
  const ids = new Set(readDismissedAnnouncementIds());
  ids.add(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}
