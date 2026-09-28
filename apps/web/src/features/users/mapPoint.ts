export type MapPoint = { latitude: number; longitude: number };

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const DEFAULT_CENTER: [number, number] = [-51.9258, -14.235];
const POINT_ZOOM = 14;
const OVERVIEW_ZOOM = 4;

export type MapAttribution = { compact: false };

export function locationMapView(point: MapPoint | null): {
  style: string;
  center: [number, number];
  zoom: number;
  attributionControl: MapAttribution;
} {
  return {
    style: MAP_STYLE_URL,
    center: point ? [point.longitude, point.latitude] : DEFAULT_CENTER,
    zoom: point ? POINT_ZOOM : OVERVIEW_ZOOM,
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

export function markerAvatar(avatar: string | null | undefined): string | null {
  const url = avatar?.trim();
  return url ? url : null;
}

/** Sem foto o pino continua visível. A imagem é só o avatar que o perfil já mostra. */
export function pinContent(avatar: string | null | undefined): {
  visible: true;
  imageUrl: string | null;
} {
  return { visible: true, imageUrl: markerAvatar(avatar) };
}

export function saveLocationBody(point: MapPoint): { latitude: number; longitude: number } {
  return { latitude: point.latitude, longitude: point.longitude };
}

export function clearLocationBody(): { latitude: null; longitude: null } {
  return { latitude: null, longitude: null };
}

/** Corpo do salvar: só o par. Sem ponto, não manda coordenada. Sem avatar e sem id. */
export function profileLocationFields(
  point: MapPoint | null,
): { latitude: number; longitude: number } | undefined {
  if (!point) return undefined;
  return saveLocationBody(point);
}

export function samePoint(a: MapPoint | null, b: MapPoint | null): boolean {
  if (!a || !b) return a === b;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

export type MapControls = {
  sync: (point: MapPoint | null, avatar: string | null) => void;
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

function placeMarker(
  maplibre: MapLibreModule,
  map: InstanceType<MapLibreModule['Map']>,
  point: MapPoint,
  avatar: string | null,
) {
  const pin = pinContent(avatar);
  const marker = pin.imageUrl
    ? new maplibre.Marker({ element: avatarPin(pin.imageUrl), anchor: 'center' })
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
    onPick: (point: MapPoint) => void;
  },
): Promise<MapControls> {
  const maplibre = await import('maplibre-gl');
  const view = locationMapView(options.point);
  const map = new maplibre.Map({
    container: host,
    style: view.style,
    center: view.center,
    zoom: view.zoom,
    attributionControl: view.attributionControl,
    cooperativeGestures: !options.interactive,
  });
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

  let marker: ReturnType<typeof placeMarker> | null = options.point
    ? placeMarker(maplibre, map, options.point, options.avatar)
    : null;

  function show(point: MapPoint | null, avatar: string | null) {
    marker?.remove();
    marker = null;
    const next = locationMapView(point);
    map.setCenter(next.center);
    map.setZoom(next.zoom);
    if (!point) return;
    marker = placeMarker(maplibre, map, point, avatar);
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
