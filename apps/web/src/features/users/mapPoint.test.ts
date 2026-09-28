import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  clearLocationBody,
  locationMapView,
  MAP_STYLE_URL,
  pinContent,
  pointFromClick,
  profileLocationFields,
  saveLocationBody,
  visiblePlaceName,
  visiblePoint,
} from './mapPoint.ts';

const mapSource = readFileSync(new URL('./mapPoint.ts', import.meta.url), 'utf8');
const screenSource = readFileSync(new URL('./LocationMap.tsx', import.meta.url), 'utf8');

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
