import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Vitrine } from './Vitrine';

export const metadata: Metadata = { title: 'Kina — Vitrine de componentes', robots: { index: false, follow: false } };

/** Vitrine dos componentes da Kina (DECISOES T4): só existe fora de produção. */
export default function KinaVitrinePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Vitrine />;
}
