import { initials } from '../../lib/format';

export type MapPoint = { latitude: number; longitude: number };

export const PLACE_NAME_MAX = 40;

/**
 * Mapa raster do OpenStreetMap: leve, traz nome de cidades e ruas e não precisa de chave.
 * (O CARTO passou a exigir chave de API; o vetorial com prédios 3D travava.)
 */
export const MAP_STYLE = {
  version: 8 as const,
  sources: {
    base: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'base', type: 'raster' as const, source: 'base' }],
};

const DEFAULT_CENTER: [number, number] = [-51.9258, -14.235];
const POINT_ZOOM = 14;
const OVERVIEW_ZOOM = 4;

/** Duração da câmera do mapa, lida de `--k-dur-scene`. Com movimento reduzido, o mapa não anima. */
function mapMotionMs() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--k-dur-scene').trim();
  const ms = Number.parseFloat(raw);
  return Number.isFinite(ms) ? ms : 520;
}

export type MapAttribution = { compact: false };

export type MapFallbackView = { center: [number, number]; zoom: number };

export function locationMapView(
  point: MapPoint | null,
  fallback?: MapFallbackView,
): {
  style: typeof MAP_STYLE;
  center: [number, number];
  zoom: number;
  attributionControl: MapAttribution;
} {
  return {
    style: MAP_STYLE,
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
  name: string;
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
    name?: string | null;
    avatar?: string | null;
    placeName?: string | null;
  }>,
): PeoplePin[] {
  const pins: PeoplePin[] = [];
  for (const person of people) {
    const point = visiblePoint(person);
    if (!point || !person.id) continue;
    const username = person.username?.trim() || '';
    pins.push({
      id: person.id,
      username,
      name: person.name?.trim() || username,
      latitude: point.latitude,
      longitude: point.longitude,
      avatar: markerAvatar(person.avatar),
      placeName: visiblePlaceName(person),
    });
  }
  return pins;
}

export function peopleMapView(pins: { latitude: number; longitude: number }[]): {
  style: typeof MAP_STYLE;
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
    style: MAP_STYLE,
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

/**
 * MapLibre não lê `var()`. O `new URL` para o worker dentro de `node_modules` quebra o build do Next.
 * Os dois arquivos (o worker importa `./maplibre-gl-shared.mjs`) ficam em `public/maplibre/`.
 */
function configureMapWorker(maplibre: MapLibreModule) {
  maplibre.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
}

function mapToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Relê as cores quando a pessoa troca o tema (o atributo `data-theme` muda). */
function watchTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

const KINA_MARK =
  '<svg viewBox="0 0 120 120" width="22" height="22" aria-hidden="true"><rect x="10" y="10" width="16" height="100" fill="currentColor"/><rect x="10" y="94" width="100" height="16" fill="currentColor"/><circle cx="47.2" cy="72.8" r="11" fill="currentColor"/></svg>';

/** Rolê: quadrado sódio com o símbolo. Passado: só o símbolo, na cor do fio forte. */
function rolePin(past: boolean): HTMLElement {
  const el = document.createElement('div');
  el.dataset.rolePin = past ? 'past' : 'next';
  el.innerHTML = KINA_MARK;
  el.style.cssText = [
    'width:44px',
    'height:44px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    past ? 'background:transparent' : `background:${mapToken('--k-brand')}`,
    `color:${past ? mapToken('--k-line-strong') : mapToken('--k-bg')}`,
  ].join(';');
  return el;
}

/** Mesmo desenho do Avatar sem foto: círculo, fundo rebaixado, iniciais. */
function initialsFace(name: string | null | undefined): HTMLElement {
  const face = document.createElement('div');
  face.dataset.locationPin = 'visible';
  face.textContent = initials(name);
  face.style.cssText = [
    'width:44px',
    'height:44px',
    'box-sizing:border-box',
    'border-radius:50%',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    `background:${mapToken('--k-bg-sunken')}`,
    `color:${mapToken('--k-text')}`,
    `border:2px solid ${mapToken('--k-bg')}`,
    `font:600 16px/1 ${mapToken('--k-font-ui')}`,
  ].join(';');
  return face;
}

function avatarPin(url: string, name: string | null | undefined): HTMLElement {
  const wrap = document.createElement('div');
  wrap.dataset.locationPin = 'visible';
  wrap.style.cssText = [
    'width:44px',
    'height:44px',
    'box-sizing:border-box',
    'border-radius:50%',
    'overflow:hidden',
    `border:2px solid ${mapToken('--k-bg')}`,
    `background:${mapToken('--k-bg-sunken')}`,
  ].join(';');
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.style.cssText = 'width:44px;height:44px;object-fit:cover;display:block';
  img.onerror = () => {
    wrap.replaceWith(initialsFace(name));
  };
  wrap.append(img);
  return wrap;
}

function pinElement(
  imageUrl: string | null,
  label: string | null,
  name: string | null | undefined,
): HTMLElement {
  const root = document.createElement('div');
  root.dataset.locationPin = 'visible';
  root.style.cssText = 'width:44px;height:44px;overflow:visible';
  root.append(imageUrl ? avatarPin(imageUrl, name) : initialsFace(name));
  if (label) {
    const place = document.createElement('span');
    place.dataset.placeName = label;
    place.textContent = label;
    const bg = mapToken('--k-surface-raised');
    const fg = mapToken('--k-text');
    place.style.cssText = [
      'position:absolute',
      'left:50px',
      'top:50%',
      'transform:translateY(-50%)',
      'padding:2px 8px',
      `background:${bg}`,
      `color:${fg}`,
      `font:600 14px/1.2 ${mapToken('--k-font-ui')}`,
      'white-space:nowrap',
    ].join(';');
    root.append(place);
  }
  return root;
}

function placeMarker(
  maplibre: MapLibreModule,
  map: InstanceType<MapLibreModule['Map']>,
  point: MapPoint,
  avatar: string | null,
  placeName: string | null,
  name: string | null,
  kind: 'person' | 'role' | 'role-past' = 'person',
) {
  const pin = pinContent(avatar, placeName);
  const element = kind === 'person' ? pinElement(pin.imageUrl, pin.label, name) : rolePin(kind === 'role-past');
  const marker = new maplibre.Marker({
    element,
    anchor: 'center',
  });
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
    /** `role` = quadrado sódio. Pessoa continua foto redonda. */
    pin?: 'person' | 'role';
    past?: boolean;
    /** Onde o mapa abre enquanto não há ponto (padrão: visão do Brasil). */
    fallbackView?: MapFallbackView;
  },
): Promise<MapControls> {
  const maplibre = await import('maplibre-gl');
  configureMapWorker(maplibre);
  const view = locationMapView(options.point, options.fallbackView);
  const map = new maplibre.Map({
    container: host,
    style: view.style,
    center: view.center,
    zoom: view.zoom,
    maxPitch: 0,
    fadeDuration: 0,
    attributionControl: view.attributionControl,
    cooperativeGestures: !options.interactive,
  });
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
  const pinKind = options.pin === 'role' ? (options.past ? 'role-past' : 'role') : 'person';
  let shown: { point: MapPoint; avatar: string | null; placeName: string | null } | null = null;
  let marker: ReturnType<typeof placeMarker> | null = null;

  function putMarker(point: MapPoint, avatar: string | null, placeName: string | null) {
    marker?.remove();
    marker = placeMarker(maplibre, map, point, avatar, placeName, null, pinKind);
    shown = { point, avatar, placeName };
  }

  if (options.point) putMarker(options.point, options.avatar, options.placeName);

  function show(point: MapPoint | null, avatar: string | null, placeName: string | null) {
    marker?.remove();
    marker = null;
    shown = null;
    const next = locationMapView(point, options.fallbackView);
    map.setCenter(next.center);
    map.setZoom(next.zoom);
    if (!point) return;
    putMarker(point, avatar, placeName);
  }

  const stopTheme = watchTheme(() => {
    if (!shown) return;
    putMarker(shown.point, shown.avatar, shown.placeName);
  });

  const onClick = (event: { lngLat: { lat: number; lng: number } }) => {
    const picked = pointFromClick(event.lngLat.lat, event.lngLat.lng);
    if (!picked) return;
    options.onPick(picked);
  };
  if (options.interactive) map.on('click', onClick);

  return {
    sync: show,
    destroy() {
      stopTheme();
      if (options.interactive) map.off('click', onClick);
      marker?.remove();
      map.remove();
    },
  };
}

export type RoutePin = MapPoint & { kind: 'from' | 'to'; label: string };

export type PeopleMapControls = {
  sync: (people: PeoplePin[]) => void;
  flyTo: (point: MapPoint, zoom: number) => void;
  /** Desenha (ou apaga, com `null`) a linha da rota. `fit` enquadra a rota inteira. */
  setRoute: (coordinates: [number, number][] | null, fit: boolean) => void;
  /** Marcadores A (origem) e B (destino) da rota. Com os dois, enquadra os dois; com um, voa até ele. */
  setRoutePins: (pins: RoutePin[]) => void;
  /** Bolinha azul de "você está aqui". `follow` leva a câmera junto. */
  setMe: (point: MapPoint | null, follow: boolean) => void;
  destroy: () => void;
};

/** Vários pinos no mesmo mapa. Sem GPS e sem acompanhar movimento. */
export async function mountPeopleMap(
  host: HTMLElement,
  people: PeoplePin[],
): Promise<PeopleMapControls> {
  const maplibre = await import('maplibre-gl');
  configureMapWorker(maplibre);
  const view = peopleMapView(people);
  const map = new maplibre.Map({
    container: host,
    style: view.style,
    center: view.center,
    zoom: view.zoom,
    maxPitch: 0,
    fadeDuration: 0,
    attributionControl: view.attributionControl,
  });
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

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

  function show(next: PeoplePin[], move = true) {
    latest = next;
    for (const marker of markers) marker.remove();
    markers = [];
    for (const person of next) {
      const marker = placeMarker(
        maplibre,
        map,
        person,
        person.avatar,
        person.placeName,
        person.name,
      );
      marker.getElement().dataset.mapPerson = person.id;
      markers.push(marker);
    }
    if (move && map.loaded()) moveTo(next);
  }

  let loaded = false;
  let route: [number, number][] | null = null;
  let meMarker: ReturnType<typeof placeMarker> | null = null;
  let routeMarkers: Array<InstanceType<MapLibreModule['Marker']>> = [];

  function drawRoute() {
    const data = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: route ?? [] },
    };
    const source = map.getSource('route') as import('maplibre-gl').GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }
    map.addSource('route', { type: 'geojson', data });
    const line = { 'line-cap': 'round' as const, 'line-join': 'round' as const };
    map.addLayer({
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: line,
      paint: { 'line-color': mapToken('--k-bg'), 'line-width': 9 },
    });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: line,
      paint: { 'line-color': mapToken('--k-accent'), 'line-width': 5 },
    });
  }

  function applyRoutePaint() {
    if (!map.getLayer('route-line')) return;
    map.setPaintProperty('route-line', 'line-color', mapToken('--k-accent'));
    map.setPaintProperty('route-casing', 'line-color', mapToken('--k-bg'));
  }

  // A linha só precisa do estilo pronto; esperar o 'load' (que depende de todos os tiles) deixava a rota sem
  // aparecer quando um tile demorava ou falhava.
  let styleReady = false;
  map.on('style.load', () => {
    styleReady = true;
    if (route) drawRoute();
  });

  map.on('load', () => {
    loaded = true;
    moveTo(latest);
    if (route) drawRoute();
  });

  let lastPins: RoutePin[] = [];
  let lastMe: MapPoint | null = null;

  function renderPins(pins: RoutePin[], move: boolean) {
    lastPins = pins;
    for (const marker of routeMarkers) marker.remove();
    routeMarkers = pins.map((pin) => {
      const el = document.createElement('div');
      el.dataset.routePin = pin.kind;
      el.title = pin.label;
      el.textContent = pin.kind === 'from' ? 'A' : 'B';
      el.style.cssText = [
        'width:44px',
        'height:44px',
        'border-radius:50%',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        `font:700 14px/1 ${mapToken('--k-font-ui')}`,
        `color:${mapToken('--k-bg')}`,
        `border:3px solid ${mapToken('--k-bg')}`,
        `background:${pin.kind === 'from' ? mapToken('--k-success') : mapToken('--k-danger')}`,
      ].join(';');
      return new maplibre.Marker({ element: el, anchor: 'center' })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
    });
    if (!move) return;
    if (pins.length === 1) {
      map.flyTo({ center: [pins[0]!.longitude, pins[0]!.latitude], zoom: 14, essential: true, duration: mapMotionMs() });
    } else if (pins.length === 2) {
      const bounds = new maplibre.LngLatBounds(
        [pins[0]!.longitude, pins[0]!.latitude],
        [pins[0]!.longitude, pins[0]!.latitude],
      );
      bounds.extend([pins[1]!.longitude, pins[1]!.latitude]);
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, animate: mapMotionMs() > 0 });
    }
  }

  function renderMe(point: MapPoint | null, follow: boolean) {
    lastMe = point;
    meMarker?.remove();
    meMarker = null;
    if (!point) return;
    const dot = document.createElement('div');
    const accent = mapToken('--k-accent');
    dot.style.cssText = ['width:44px', 'height:44px', 'display:flex', 'align-items:center', 'justify-content:center'].join(';');
    const core = document.createElement('span');
    core.style.cssText = [
      'width:18px',
      'height:18px',
      'border-radius:50%',
      `background:${accent}`,
      `border:3px solid ${mapToken('--k-bg')}`,
      `outline:6px solid color-mix(in srgb, ${accent} 25%, transparent)`,
    ].join(';');
    dot.append(core);
    meMarker = new maplibre.Marker({ element: dot, anchor: 'center' })
      .setLngLat([point.longitude, point.latitude])
      .addTo(map);
    if (follow) map.easeTo({ center: [point.longitude, point.latitude], duration: mapMotionMs() });
  }

  const stopTheme = watchTheme(() => {
    applyRoutePaint();
    show(latest, false);
    renderPins(lastPins, false);
    renderMe(lastMe, false);
  });

  return {
    sync: show,
    flyTo(point, zoom) {
      map.flyTo({ center: [point.longitude, point.latitude], zoom, essential: true, duration: mapMotionMs() });
    },
    setRoute(coordinates, fit) {
      route = coordinates;
      if (styleReady || loaded) drawRoute();
      if (!coordinates || coordinates.length === 0 || !fit) return;
      const bounds = new maplibre.LngLatBounds(coordinates[0], coordinates[0]);
      for (const coord of coordinates) bounds.extend(coord);
      map.fitBounds(bounds, { padding: 64, animate: mapMotionMs() > 0 });
    },
    setRoutePins(pins) {
      renderPins(pins, true);
    },
    setMe(point, follow) {
      renderMe(point, follow);
    },
    destroy() {
      stopTheme();
      for (const marker of routeMarkers) marker.remove();
      meMarker?.remove();
      for (const marker of markers) marker.remove();
      markers = [];
      map.remove();
    },
  };
}
