/** Cuiabá: onde o mapa do rolê abre quando ainda não há ponto escolhido. */
export const CUIABA_VIEW = { center: [-56.0974, -15.601] as [number, number], zoom: 12 };

export type PlaceResult = {
  /** Endereço completo, como o OpenStreetMap descreve. */
  label: string;
  /** Texto curto para o campo "Local" do rolê. */
  name: string;
  latitude: number;
  longitude: number;
};

const LOCATION_MAX = 160;

function shortName(item: { name?: unknown; display_name: string }) {
  const own = typeof item.name === 'string' ? item.name.trim() : '';
  const parts = item.display_name.split(',').map((part) => part.trim()).filter(Boolean);
  const text = own ? [own, ...parts.slice(1, 3)].join(', ') : parts.slice(0, 3).join(', ');
  return text.slice(0, LOCATION_MAX);
}

/** Resposta do Nominatim → lista de lugares. Descarta item sem coordenada válida em vez de quebrar. */
export function parsePlaces(data: unknown): PlaceResult[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw): PlaceResult[] => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as { lat?: unknown; lon?: unknown; display_name?: unknown; name?: unknown };
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (typeof item.display_name !== 'string' || !item.display_name) return [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
    return [
      {
        label: item.display_name,
        name: shortName({ name: item.name, display_name: item.display_name }),
        latitude,
        longitude,
      },
    ];
  });
}

/**
 * Busca de endereço no Nominatim (OpenStreetMap), grátis e sem chave. A política de uso pede no máximo
 * 1 busca por segundo e nada de autocompletar a cada tecla, então só busca quando a pessoa pede.
 * `viewbox` em volta de Cuiabá só prioriza resultados próximos (`bounded=0`: não exclui o resto do Brasil).
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const text = query.trim();
  if (text.length < 3) return [];
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: text,
    limit: '6',
    'accept-language': 'pt-BR',
    countrycodes: 'br',
    viewbox: '-56.35,-15.35,-55.85,-15.85',
    bounded: '0',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('Busca de lugares indisponível');
  return parsePlaces(await response.json());
}
