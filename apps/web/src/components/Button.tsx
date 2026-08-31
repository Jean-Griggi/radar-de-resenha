'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  skeleton?: boolean;
};

const variants = {
  primary: 'button--primary',
  secondary: 'button--secondary',
  outline: 'button--outline',
  danger: 'button--danger',
  ghost: 'button--ghost',
};

export function Button({
  children,
  variant = 'primary',
  loading = false,
  skeleton = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  if (skeleton) {
    return <span className={`button skeleton ${className}`} aria-hidden />;
  }

  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      type={type}
      className={`button ${variants[variant]} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="button__spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}
