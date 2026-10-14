'use client';

import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { CircleAlert } from 'lucide-react';

/**
 * Rótulo sempre visível acima do campo. Com `error`, o campo ganha `aria-invalid` e `aria-describedby`
 * apontando para a mensagem (ícone + texto, nunca só cor). Sem `error`, o filho é renderizado como antes.
 */
export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  const messageId = useId();
  const control =
    error && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          'aria-invalid': true,
          'aria-describedby': messageId,
        })
      : children;

  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5">
        <span className="k-label block">{label}</span>
        {control}
      </label>
      {error ? (
        <p id={messageId} className="k-msg k-msg--error">
          <CircleAlert size={16} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { skeleton?: boolean };
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { skeleton?: boolean };
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { skeleton?: boolean };

export function Input({ skeleton = false, className = '', ...props }: InputProps) {
  if (skeleton) {
    return <span className={`input skeleton ${className}`} aria-hidden />;
  }
  return <input {...props} className={`input ${className}`} />;
}

export function Textarea({ skeleton = false, className = '', ...props }: TextareaProps) {
  if (skeleton) {
    return <span className={`input skeleton min-h-28 ${className}`} aria-hidden />;
  }
  return <textarea {...props} className={`input min-h-28 ${className}`} />;
}

export function Select({ skeleton = false, className = '', ...props }: SelectProps) {
  if (skeleton) {
    return <span className={`input skeleton ${className}`} aria-hidden />;
  }
  return <select {...props} className={`input ${className}`} />;
}
