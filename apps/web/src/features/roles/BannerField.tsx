'use client';

import { useEffect, useId, useState } from 'react';
import { CircleAlert, ImagePlus } from 'lucide-react';
import { Button } from '@/components/Button';
import { MediaImage } from '@/components/MediaImage';
import { IMAGE_ACCEPT } from '@/lib/upload';

const MAX_MB = 8;

/**
 * Banner do rolê: UM só controle. A área grande (3:2) é o <label> do <input type="file"> real (visualmente
 * oculto, nunca `display: none`), com cantoneiras e foco por `:focus-within`. Mostra a prévia e deixa remover.
 * O envio acontece na tela que usa este campo, depois de o rolê existir (`POST /roles/:id/banner`).
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
  const inputId = useId();
  const errorId = useId();
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
    <div className="role-banner">
      <span className="k-meta">Banner (opcional)</span>
      <label htmlFor={inputId} className="role-banner__area k-corners">
        <input
          id={inputId}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {shown ? (
          <MediaImage src={shown} alt="Prévia do banner" className="role-banner__image" />
        ) : (
          <span className="role-banner__empty">
            <ImagePlus size={28} strokeWidth={1.5} aria-hidden />
            Escolher uma imagem para o banner
          </span>
        )}
      </label>
      {shown ? (
        <div className="role-banner__meta">
          <span className="k-meta">{file ? file.name : 'Banner atual'}</span>
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
        </div>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="k-msg k-msg--error">
          <CircleAlert size={16} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
