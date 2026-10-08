import type { MapPoint } from '@/features/users/mapPoint';

export type Route = {
  /** Linha da rota, em [longitude, latitude]. */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

/**
 * Rota de carro no OSRM público (grátis, sem chave). É um servidor de demonstração: serve para uso
 * pessoal e leve, sem garantia de disponibilidade. Só calcula rota de carro.
 */
export async function fetchRoute(from: MapPoint, to: MapPoint, signal?: AbortSignal): Promise<Route | null> {
  const path = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`,
    { signal },
  );
  if (!response.ok) throw new Error('Rotas indisponíveis');
  const data = (await response.json()) as {
    code?: string;
    routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>;
  };
  const best = data.routes?.[0];
  if (data.code !== 'Ok' || !best) return null;
  return { coordinates: best.geometry.coordinates, distanceMeters: best.distance, durationSeconds: best.duration };
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** Distância em linha reta (fórmula de haversine), para saber se a pessoa andou o bastante para recalcular. */
export function metersBetween(a: MapPoint, b: MapPoint) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
