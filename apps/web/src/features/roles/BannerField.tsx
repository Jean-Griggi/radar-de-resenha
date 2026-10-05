'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { MediaImage } from '@/components/MediaImage';
import { IMAGE_ACCEPT } from '@/lib/upload';

const MAX_MB = 8;

/**
 * Banner do rolê: escolhe uma imagem, mostra a prévia e deixa remover. O envio acontece na tela
 * que usa este campo, depois de o rolê existir (o arquivo vai para `POST /roles/:id/banner`).
 */
export function BannerField({
  currentUrl = null,
  file,
  removed = false,
  onFile,
  onRemove,
}: {
  /** Banner que o rolê já tem (edição). */
  currentUrl?: string | null;
  file: File | null;
  removed?: boolean;
  onFile: (file: File | null) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = previewUrl ?? (removed ? null : currentUrl);

  function pick(next: File | undefined) {
    if (!next) return;
    if (next.size > MAX_MB * 1024 * 1024) {
      setError(`A imagem passa de ${MAX_MB} MB. Escolha uma menor.`);
      return;
    }
    setError('');
    onFile(next);
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Banner (opcional)</span>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {shown ? (
          <MediaImage src={shown} alt="Prévia do banner" className="h-40 w-full object-cover sm:h-52" />
        ) : (
          <button
            type="button"
            className="flex h-40 w-full flex-col items-center justify-center gap-1 text-sm text-muted hover:bg-[var(--overlay)] sm:h-52"
            onClick={() => inputRef.current?.click()}
          >
            <span aria-hidden className="text-2xl">
              🖼️
            </span>
            Escolher uma imagem para o banner
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          {shown ? 'Trocar imagem' : 'Escolher imagem'}
        </Button>
        {shown ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setError('');
              onRemove();
            }}
          >
            Remover
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
