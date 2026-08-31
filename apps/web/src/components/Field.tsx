import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-label text-muted">{label}</span>
      {children}
    </label>
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
