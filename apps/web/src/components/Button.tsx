'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

const variants = {
  primary:
    'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400 glow-btn',
  secondary: 'border border-white/10 bg-white/5 text-zinc-100 hover:border-violet-400/40 hover:bg-white/10',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
  ghost: 'text-zinc-300 hover:text-white hover:bg-white/5',
};

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
