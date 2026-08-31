'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
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
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
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
