import type { SpotifyRef } from './spotifyEmbed';

type EmbedController = {
  play: () => void;
  destroy: () => void;
  addListener: (event: 'ready', callback: () => void) => void;
};

type IFrameAPI = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: string; height: number },
    callback: (controller: EmbedController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

let apiPromise: Promise<IFrameAPI> | null = null;

function loadApi(): Promise<IFrameAPI> {
  apiPromise ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('Spotify indisponível'));
    };
    document.body.append(script);
  });
  return apiPromise;
}

/**
 * Cria o player do Spotify dentro de `host` e já dá play (a pessoa acabou de tocar para abrir o story,
 * então o navegador libera o áudio). Devolve a função que desmonta o player.
 */
export async function mountAutoplayEmbed(host: HTMLElement, ref: SpotifyRef, height: number): Promise<() => void> {
  const api = await loadApi();
  const target = document.createElement('div');
  host.replaceChildren(target);
  let controller: EmbedController | null = null;
  api.createController(target, { uri: `spotify:${ref.kind}:${ref.id}`, width: '100%', height }, (created) => {
    controller = created;
    created.addListener('ready', () => created.play());
  });
  return () => {
    controller?.destroy();
    host.replaceChildren();
  };
}
