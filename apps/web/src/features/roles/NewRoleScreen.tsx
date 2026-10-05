'use client';

import { ROLE_CATEGORIES } from '@resenhometro/shared';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import type { MapPoint } from '@/features/users/mapPoint';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { postFile } from '@/lib/upload';
import { BannerField } from './BannerField';
import { PlaceField } from './PlaceField';

export function NewRoleScreen() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'Outro',
    estimatedCost: '',
    tags: '',
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<{ id: string }>('/roles', {
        ...form,
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, ''))
          .filter(Boolean),
      });
      if (banner) {
        // O rolê já existe: se o banner falhar, avisa e segue (dá para trocar depois em Editar).
        try {
          await postFile(`/roles/${data.id}/banner`, 'cover', banner);
        } catch (err) {
          toast.push(`Rolê criado, mas o banner não subiu: ${apiErrorMessage(err)}`, 'error');
          router.push(`/roles/${data.id}`);
          return;
        }
      }
      toast.push('Rolê criado');
      router.push(`/roles/${data.id}`);
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Novo rolê</h1>
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-4 sm:p-6">
        <BannerField file={banner} onFile={setBanner} onRemove={() => setBanner(null)} />
        <Field label="Nome">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={3} required />
        </Field>
        <Field label="Descrição">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
        </div>
        <PlaceField
          location={form.location}
          point={point}
          onChange={(next) => {
            setForm({ ...form, location: next.location });
            setPoint(next.point);
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {ROLE_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </Select>
          </Field>
          <Field label="Custo estimado">
            <Input type="number" min="0" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
          </Field>
        </div>
        <Field label="Tags">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="sexta, festa, bar" />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Criar rolê'}
        </Button>
      </form>
    </>
  );
}
