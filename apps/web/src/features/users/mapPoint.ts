export type MapPoint = { latitude: number; longitude: number };

export const PLACE_NAME_MAX = 40;

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Volume a partir deste zoom. Abaixo disso o prédio continua chapado. */
export const BUILDING_MIN_ZOOM = 15;
export const MAP_MAX_PITCH = 60;
const BUILDING_LAYER = 'building';
const BUILDING_VOLUME_LAYER = 'building-3d';

/** Altura que o OpenFreeMap já traz. Sem número, o volume é zero e o prédio fica chapado. */
export function buildingHeightExpression(): unknown[] {
  return ['coalesce', ['to-number', ['get', 'render_height']], 0];
}

export function buildingVolumePlan(): {
  maxPitch: number;
  flatLayer: string;
  volumeLayer: string;
  minZoom: number;
  height: unknown[];
  base: unknown[];
} {
  return {
    maxPitch: MAP_MAX_PITCH,
    flatLayer: BUILDING_LAYER,
    volumeLayer: BUILDING_VOLUME_LAYER,
    minZoom: BUILDING_MIN_ZOOM,
    height: buildingHeightExpression(),
    base: ['coalesce', ['to-number', ['get', 'render_min_height']], 0],
  };
}

type VolumeMap = {
  setMaxPitch: (pitch: number) => void;
  getLayer: (id: string) => { type?: string; minzoom?: number } | undefined;
  setLayerZoomRange: (id: string, min: number, max: number) => void;
  setPaintProperty: (id: string, name: string, value: unknown) => void;
};

/**
 * Inclina a câmera e sobe o prédio onde o OpenFreeMap tem altura.
 * Se o volume não existir, o mapa plano permanece.
 */
export function applyBuildingVolume(map: VolumeMap): boolean {
  const plan = buildingVolumePlan();
  try {
    map.setMaxPitch(plan.maxPitch);
  } catch {
    return false;
  }
  try {
    const volume = map.getLayer(plan.volumeLayer);
    if (!volume || volume.type !== 'fill-extrusion') return false;
    const flat = map.getLayer(plan.flatLayer);
    if (flat?.type === 'fill') {
      map.setLayerZoomRange(plan.flatLayer, flat.minzoom ?? 13, 24);
    }
    map.setLayerZoomRange(plan.volumeLayer, plan.minZoom, 24);
    map.setPaintProperty(plan.volumeLayer, 'fill-extrusion-height', plan.height);
    map.setPaintProperty(plan.volumeLayer, 'fill-extrusion-base', plan.base);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_CENTER: [number, number] = [-51.9258, -14.235];
const POINT_ZOOM = 14;
const OVERVIEW_ZOOM = 4;

export type MapAttribution = { compact: false };

export type MapFallbackView = { center: [number, number]; zoom: number };

export function locationMapView(
  point: MapPoint | null,
  fallback?: MapFallbackView,
): {
  style: string;
  center: [number, number];
  zoom: number;
  attributionControl: MapAttribution;
} {
  return {
    style: MAP_STYLE_URL,
    center: point ? [point.longitude, point.latitude] : (fallback?.center ?? DEFAULT_CENTER),
    zoom: point ? POINT_ZOOM : (fallback?.zoom ?? OVERVIEW_ZOOM),
    attributionControl: { compact: false },
  };
}

export function pointFromClick(lat: number, lng: number): MapPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export function visiblePoint(
  profile: { latitude?: number; longitude?: number } | null | undefined,
): MapPoint | null {
  if (!profile) return null;
  return pointFromClick(profile.latitude ?? Number.NaN, profile.longitude ?? Number.NaN);
}

export function placeLabel(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > PLACE_NAME_MAX) return null;
  return text;
}

/** Sem o par, o nome não aparece. */
export function visiblePlaceName(
  profile: { latitude?: number; longitude?: number; placeName?: string | null } | null | undefined,
): string | null {
  if (!visiblePoint(profile)) return null;
  return placeLabel(profile?.placeName);
}

export function markerAvatar(avatar: string | null | undefined): string | null {
  const url = avatar?.trim();
  return url ? url : null;
}

/** Sem foto o pino continua visível. A imagem é só o avatar que o perfil já mostra. O nome fica junto da foto. */
export function pinContent(
  avatar: string | null | undefined,
  placeName?: string | null,
): {
  visible: true;
  imageUrl: string | null;
  label: string | null;
} {
  return { visible: true, imageUrl: markerAvatar(avatar), label: placeLabel(placeName) };
}

export function saveLocationBody(point: MapPoint): { latitude: number; longitude: number } {
  return { latitude: point.latitude, longitude: point.longitude };
}

export function clearLocationBody(): { latitude: null; longitude: null; placeName: null } {
  return { latitude: null, longitude: null, placeName: null };
}

/** Corpo do salvar: só o par. Sem ponto, não manda coordenada. Sem avatar e sem id. */
export function profileLocationFields(
  point: MapPoint | null,
  placeName?: string | null,
): { latitude: number; longitude: number; placeName?: string | null } | undefined {
  if (!point) return undefined;
  const body = saveLocationBody(point);
  if (placeName === undefined) return body;
  return { ...body, placeName: placeLabel(placeName) };
}

export type PeoplePin = {
  id: string;
  username: string;
  latitude: number;
  longitude: number;
  avatar: string | null;
  placeName: string | null;
};

/** Só entra quem já tem o par. A foto é o avatar informado. Sem o par, o nome sai. */
export function pinsFromPeople(
  people: Array<{
    id?: string;
    username?: string;
    latitude?: number;
    longitude?: number;
    avatar?: string | null;
    placeName?: string | null;
  }>,
): PeoplePin[] {
  const pins: PeoplePin[] = [];
  for (const person of people) {
    const point = visiblePoint(person);
    if (!point || !person.id) continue;
    pins.push({
      id: person.id,
      username: person.username?.trim() || '',
      latitude: point.latitude,
      longitude: point.longitude,
      avatar: markerAvatar(person.avatar),
      placeName: visiblePlaceName(person),
    });
  }
  return pins;
}

export function peopleMapView(pins: { latitude: number; longitude: number }[]): {
  style: string;
  center: [number, number];
  zoom: number;
  attributionControl: MapAttribution;
  bounds: [[number, number], [number, number]] | null;
} {
  if (pins.length === 0) return { ...locationMapView(null), bounds: null };
  if (pins.length === 1) return { ...locationMapView(pins[0]!), bounds: null };
  let west = pins[0]!.longitude;
  let east = pins[0]!.longitude;
  let south = pins[0]!.latitude;
  let north = pins[0]!.latitude;
  for (const pin of pins) {
    west = Math.min(west, pin.longitude);
    east = Math.max(east, pin.longitude);
    south = Math.min(south, pin.latitude);
    north = Math.max(north, pin.latitude);
  }
  return {
    style: MAP_STYLE_URL,
    center: [(west + east) / 2, (south + north) / 2],
    zoom: OVERVIEW_ZOOM,
    attributionControl: { compact: false },
    bounds: [
      [west, south],
      [east, north],
    ],
  };
}

export function samePoint(a: MapPoint | null, b: MapPoint | null): boolean {
  if (!a || !b) return a === b;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

export type MapControls = {
  sync: (point: MapPoint | null, avatar: string | null, placeName: string | null) => void;
  destroy: () => void;
};

type MapLibreModule = typeof import('maplibre-gl');

function avatarPin(url: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.dataset.locationPin = 'visible';
  wrap.style.cssText =
    'width:40px;height:40px;border-radius:50%;overflow:hidden;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);background:#1c1917';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.style.cssText = 'width:40px;height:40px;object-fit:cover;display:block';
  img.onerror = () => {
    img.remove();
  };
  wrap.append(img);
  return wrap;
}

function pinElement(imageUrl: string | null, label: string | null): HTMLElement {
  const root = document.createElement('div');
  root.dataset.locationPin = 'visible';
  root.style.cssText = 'width:0;height:0;overflow:visible';
  const photo = document.createElement('div');
  photo.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%)';
  if (imageUrl) {
    photo.append(avatarPin(imageUrl));
  } else {
    const dot = document.createElement('div');
    dot.style.cssText =
      'width:18px;height:18px;border-radius:50%;background:#1c1917;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)';
    photo.append(dot);
  }
  root.append(photo);
  if (label) {
    const name = document.createElement('span');
    name.dataset.placeName = label;
    name.textContent = label;
    name.style.cssText =
      'position:absolute;left:26px;top:0;transform:translateY(-50%);padding:2px 8px;border-radius:999px;background:#fff;color:#1c1917;font:600 12px/1.2 system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.35);white-space:nowrap';
    root.append(name);
  }
  return root;
}

function placeMarker(
  maplibre: MapLibreModule,
  map: InstanceType<MapLibreModule['Map']>,
  point: MapPoint,
  avatar: string | null,
  placeName: string | null,
) {
  const pin = pinContent(avatar, placeName);
  const marker =
    pin.imageUrl || pin.label
      ? new maplibre.Marker({ element: pinElement(pin.imageUrl, pin.label), anchor: 'center' })
      : new maplibre.Marker({ color: '#1c1917', anchor: 'bottom' });
  marker.getElement().dataset.locationPin = 'visible';
  return marker.setLngLat([point.longitude, point.latitude]).addTo(map);
}

export async function mountLocationMap(
  host: HTMLElement,
  options: {
    interactive: boolean;
    point: MapPoint | null;
    avatar: string | null;
    placeName: string | null;
    onPick: (point: MapPoint) => void;
    /** Onde o mapa abre enquanto não há ponto (padrão: visão do Brasil). */
    fallbackView?: MapFallbackView;
  },
): Promise<MapControls> {
  const maplibre = await import('maplibre-gl');
  const view = locationMapView(options.point, options.fallbackView);
  const map = new maplibre.Map({
    container: host,
    style: view.style,
    center: view.center,
    zoom: view.zoom,
    maxPitch: MAP_MAX_PITCH,
    attributionControl: view.attributionControl,
    cooperativeGestures: !options.interactive,
  });
  map.addControl(
    new maplibre.NavigationControl({ showCompass: true, visualizePitch: true }),
    'top-right',
  );
  map.on('load', () => {
    applyBuildingVolume(map as never);
  });

  let marker: ReturnType<typeof placeMarker> | null = options.point
    ? placeMarker(maplibre, map, options.point, options.avatar, options.placeName)
    : null;

  function show(point: MapPoint | null, avatar: string | null, placeName: string | null) {
    marker?.remove();
    marker = null;
    const next = locationMapView(point, options.fallbackView);
    map.setCenter(next.center);
    map.setZoom(next.zoom);
    if (!point) return;
    marker = placeMarker(maplibre, map, point, avatar, placeName);
  }

  const onClick = (event: { lngLat: { lat: number; lng: number } }) => {
    const picked = pointFromClick(event.lngLat.lat, event.lngLat.lng);
    if (!picked) return;
    options.onPick(picked);
  };
  if (options.interactive) map.on('click', onClick);

  return {
    sync: show,
    destroy() {
      if (options.interactive) map.off('click', onClick);
      marker?.remove();
      map.remove();
    },
  };
}

export type PeopleMapControls = {
  sync: (people: PeoplePin[]) => void;
  destroy: () => void;
};

/** Vários pinos no mesmo mapa. Sem GPS e sem acompanhar movimento. */
export async function mountPeopleMap(
  host: HTMLElement,
  people: PeoplePin[],
): Promise<PeopleMapControls> {
  const maplibre = await import('maplibre-gl');
  const view = peopleMapView(people);
  const map = new maplibre.Map({
    container: host,
    style: view.style,
    center: view.center,
    zoom: view.zoom,
    maxPitch: MAP_MAX_PITCH,
    attributionControl: view.attributionControl,
  });
  map.addControl(
    new maplibre.NavigationControl({ showCompass: true, visualizePitch: true }),
    'top-right',
  );

  let markers: Array<ReturnType<typeof placeMarker>> = [];
  let latest = people;

  function moveTo(next: PeoplePin[]) {
    const frame = peopleMapView(next);
    if (frame.bounds) {
      map.fitBounds(frame.bounds, { padding: 48, maxZoom: POINT_ZOOM, animate: false });
      return;
    }
    map.setCenter(frame.center);
    map.setZoom(frame.zoom);
  }

  function show(next: PeoplePin[]) {
    latest = next;
    for (const marker of markers) marker.remove();
    markers = [];
    for (const person of next) {
      const marker = placeMarker(maplibre, map, person, person.avatar, person.placeName);
      marker.getElement().dataset.mapPerson = person.id;
      markers.push(marker);
    }
    if (map.loaded()) moveTo(next);
  }

  map.on('load', () => {
    applyBuildingVolume(map as never);
    moveTo(latest);
  });
  show(people);

  return {
    sync: show,
    destroy() {
      for (const marker of markers) marker.remove();
      markers = [];
      map.remove();
    },
  };
}
