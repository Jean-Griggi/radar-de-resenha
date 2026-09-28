import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  applyBuildingVolume,
  BUILDING_MIN_ZOOM,
  buildingVolumePlan,
  clearLocationBody,
  locationMapView,
  MAP_MAX_PITCH,
  MAP_STYLE_URL,
  peopleMapView,
  pinContent,
  pinsFromPeople,
  pointFromClick,
  profileLocationFields,
  saveLocationBody,
  visiblePlaceName,
  visiblePoint,
} from './mapPoint.ts';

const mapSource = readFileSync(new URL('./mapPoint.ts', import.meta.url), 'utf8');
const screenSource = readFileSync(new URL('./LocationMap.tsx', import.meta.url), 'utf8');
const peopleSource = readFileSync(new URL('./PeopleMapScreen.tsx', import.meta.url), 'utf8');

describe('mapPoint', () => {
  it('abre o MapLibre sem chave e mantém a assinatura visível', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'nao-usar';
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'nao-usar';
    const view = locationMapView({ latitude: -23.5, longitude: -46.6 });
    assert.equal(view.style, MAP_STYLE_URL);
    assert.equal(view.style, 'https://tiles.openfreemap.org/styles/liberty');
    assert.notEqual(view.attributionControl, false);
    assert.equal(view.attributionControl.compact, false);
    assert.deepEqual(view.center, [-46.6, -23.5]);
    assert.equal(view.zoom, 14);
    const serialized = JSON.stringify(view);
    assert.equal(serialized.includes('nao-usar'), false);
    assert.equal(serialized.includes('googleapis'), false);
    assert.equal(
      /GOOGLE_MAPS|maps\.googleapis|loadGoogleMaps/.test(mapSource + screenSource),
      false,
    );
    assert.equal(/attributionControl:\s*false/.test(mapSource + screenSource), false);
  });

  it('salvar manda só o par, sem avatar, sem id e sem chave', () => {
    const point = pointFromClick(-23.5, -46.625);
    assert.ok(point);
    const body = profileLocationFields(point);
    assert.deepEqual(body, saveLocationBody(point));
    assert.deepEqual(Object.keys(body ?? {}).sort(), ['latitude', 'longitude']);
    assert.equal(body && 'avatar' in body, false);
    assert.equal(body && 'id' in body, false);
    assert.equal(profileLocationFields(null), undefined);
  });

  it('rejeita latitude 91, longitude 181 e meia coordenada', () => {
    assert.equal(pointFromClick(91, 10), null);
    assert.equal(pointFromClick(10, 181), null);
    assert.equal(visiblePoint({ latitude: 12 }), null);
    assert.equal(visiblePoint({ longitude: 10 }), null);
    assert.equal(visiblePoint({}), null);
    assert.deepEqual(visiblePoint({ latitude: -23.5, longitude: -46.6 }), {
      latitude: -23.5,
      longitude: -46.6,
    });
  });

  it('perfil sem o par não mostra ponto', () => {
    assert.equal(visiblePoint(null), null);
    assert.equal(visiblePoint({ latitude: undefined, longitude: undefined }), null);
    assert.equal(locationMapView(null).zoom, 4);
  });

  it('limpar manda os dois nulos, apaga o nome e nada de imagem', () => {
    const body = clearLocationBody();
    assert.deepEqual(body, { latitude: null, longitude: null, placeName: null });
    assert.equal('avatar' in body, false);
    assert.equal('id' in body, false);
  });

  it('salvar o ponto com casa manda o par e o nome, sem avatar e sem id', () => {
    const point = pointFromClick(-23.5, -46.625);
    assert.ok(point);
    const body = profileLocationFields(point, ' casa ');
    assert.deepEqual(body, { latitude: -23.5, longitude: -46.625, placeName: 'casa' });
    assert.equal(body && 'avatar' in body, false);
    assert.equal(body && 'id' in body, false);
    assert.equal(profileLocationFields(null, 'casa'), undefined);
    assert.deepEqual(profileLocationFields(point, '   '), {
      latitude: -23.5,
      longitude: -46.625,
      placeName: null,
    });
  });

  it('não mostra o nome sem o ponto', () => {
    assert.equal(visiblePlaceName({ placeName: 'casa' }), null);
    assert.equal(visiblePlaceName({ latitude: 12, placeName: 'casa' }), null);
    assert.equal(visiblePlaceName({ latitude: -23.5, longitude: -46.6 }), null);
    assert.equal(
      visiblePlaceName({ latitude: -23.5, longitude: -46.6, placeName: ' casa ' }),
      'casa',
    );
  });

  it('o mapa de várias pessoas usa a foto e o nome do lugar, sem rastro', () => {
    const pins = pinsFromPeople([
      {
        id: 'a',
        username: 'ana',
        latitude: -23.5,
        longitude: -46.6,
        avatar: ' https://cdn.example/ana.png ',
        placeName: ' casa ',
        cover: 'https://cdn.example/capa.png',
      },
      { id: 'b', username: 'bia', placeName: 'trabalho', avatar: 'https://cdn.example/bia.png' },
      { id: 'c', username: 'caio', latitude: -22.9, longitude: -43.2, avatar: '  ', placeName: 'rua' },
      { latitude: 10, longitude: 20, avatar: 'https://cdn.example/sem-id.png', placeName: 'x' },
    ]);
    assert.deepEqual(pins, [
      {
        id: 'a',
        username: 'ana',
        latitude: -23.5,
        longitude: -46.6,
        avatar: 'https://cdn.example/ana.png',
        placeName: 'casa',
      },
      {
        id: 'c',
        username: 'caio',
        latitude: -22.9,
        longitude: -43.2,
        avatar: null,
        placeName: 'rua',
      },
    ]);
    assert.equal(JSON.stringify(pins).includes('capa.png'), false);
    assert.equal(JSON.stringify(pins).includes('bia.png'), false);
    const view = peopleMapView(pins);
    assert.equal(view.style, MAP_STYLE_URL);
    assert.equal(view.attributionControl.compact, false);
    assert.deepEqual(view.bounds, [
      [-46.6, -23.5],
      [-43.2, -22.9],
    ]);
    assert.equal(JSON.stringify(view).includes('googleapis'), false);
    const sources = mapSource + screenSource + peopleSource;
    assert.equal(/GeolocateControl|watchPosition|navigator\.geolocation/.test(sources), false);
    assert.equal(/GOOGLE_MAPS|maps\.googleapis/.test(sources), false);
    assert.equal(/attributionControl:\s*false/.test(sources), false);
  });

  it('inclina a câmera e extruda o prédio a partir do zoom 15, sem chave', () => {
    const plan = buildingVolumePlan();
    assert.equal(plan.minZoom, BUILDING_MIN_ZOOM);
    assert.equal(plan.minZoom, 15);
    assert.equal(plan.maxPitch, MAP_MAX_PITCH);
    assert.equal(plan.maxPitch > 0, true);
    assert.equal(plan.flatLayer, 'building');
    assert.equal(plan.volumeLayer, 'building-3d');
    assert.deepEqual(plan.height, ['coalesce', ['to-number', ['get', 'render_height']], 0]);
    assert.equal(JSON.stringify(plan).includes('render_height'), true);
    assert.equal(JSON.stringify(plan).includes('googleapis'), false);
    const sources = mapSource + screenSource + peopleSource;
    assert.equal(/terrain|hillshade|setFog|globe/.test(sources), false);
    assert.equal(/GOOGLE_MAPS|maps\.googleapis/.test(sources), false);
    assert.equal(/attributionControl:\s*false/.test(sources), false);

    const zoom: unknown[] = [];
    const paint: unknown[] = [];
    const raised = applyBuildingVolume({
      setMaxPitch(pitch) {
        assert.equal(pitch, 60);
      },
      getLayer(id) {
        if (id === 'building') return { type: 'fill', minzoom: 13 };
        if (id === 'building-3d') return { type: 'fill-extrusion', minzoom: 14 };
        return undefined;
      },
      setLayerZoomRange(id, min, max) {
        zoom.push([id, min, max]);
      },
      setPaintProperty(id, name, value) {
        paint.push([id, name, value]);
      },
    });
    assert.equal(raised, true);
    assert.deepEqual(zoom, [
      ['building', 13, 24],
      ['building-3d', 15, 24],
    ]);
    assert.deepEqual(paint[0], ['building-3d', 'fill-extrusion-height', plan.height]);

    let hidFlat = false;
    const skipped = applyBuildingVolume({
      setMaxPitch() {},
      getLayer() {
        return undefined;
      },
      setLayerZoomRange() {
        hidFlat = true;
      },
      setPaintProperty() {
        hidFlat = true;
      },
    });
    assert.equal(skipped, false);
    assert.equal(hidFlat, false);
    assert.deepEqual(pinContent('https://cdn.example/a.png', 'casa'), {
      visible: true,
      imageUrl: 'https://cdn.example/a.png',
      label: 'casa',
    });
  });

  it('o pino usa o avatar e continua visível sem foto', () => {
    assert.deepEqual(pinContent(' https://cdn.example/a.png ', 'casa'), {
      visible: true,
      imageUrl: 'https://cdn.example/a.png',
      label: 'casa',
    });
    assert.deepEqual(pinContent('  ', '  '), { visible: true, imageUrl: null, label: null });
    assert.deepEqual(pinContent(null), { visible: true, imageUrl: null, label: null });
  });
});
