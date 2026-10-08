import type { MapPoint } from '@/features/users/mapPoint';

export type SavedPlace = MapPoint & { id: string; name: string };

const KEY = 'radar_saved_places';
const NAME_MAX = 40;

export function loadSavedPlaces(): SavedPlace[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is SavedPlace =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude),
    );
  } catch {
    return [];
  }
}

function persist(places: SavedPlace[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(places));
  } catch {
    /* sem armazenamento (aba anônima): o local vale só nesta sessão */
  }
  return places;
}

/** Salvar com um nome que já existe troca o ponto daquele nome em vez de duplicar. */
export function savePlace(name: string, point: MapPoint): SavedPlace[] {
  const clean = name.trim().slice(0, NAME_MAX);
  if (!clean) return loadSavedPlaces();
  const rest = loadSavedPlaces().filter((place) => place.name.toLowerCase() !== clean.toLowerCase());
  const place: SavedPlace = { id: `${Date.now()}`, name: clean, latitude: point.latitude, longitude: point.longitude };
  return persist([...rest, place]);
}

export function removePlace(id: string): SavedPlace[] {
  return persist(loadSavedPlaces().filter((place) => place.id !== id));
}
