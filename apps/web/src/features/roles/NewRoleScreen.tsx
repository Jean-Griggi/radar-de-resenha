'use client';

import { ROLE_CATEGORIES } from '@resenhometro/shared';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { Ficha, FichaRow } from '@/components/FichaRow';
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

  const nameMissing = form.title.trim().length < 3;

  return (
    <form onSubmit={onSubmit} className="role-form">
      <div className="role-form__cover">
        <BannerField file={banner} onFile={setBanner} onRemove={() => setBanner(null)} />
      </div>
      <div className="role-form__body">
        <Field label="Nome">
          <Input className="input--display" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={3} required />
        </Field>
        <Ficha className="role-ficha">
          <FichaRow label="Quando" mark={form.date || form.time ? 'done' : 'empty'}>
            <span className="role-ficha__pair">
              <Input type="date" aria-label="Data" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <Input type="time" aria-label="Hora" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </span>
          </FichaRow>
          <FichaRow label="Onde" mark={form.location ? 'done' : 'empty'}>
            <PlaceField
              location={form.location}
              point={point}
              onChange={(next) => {
                setForm({ ...form, location: next.location });
                setPoint(next.point);
              }}
            />
          </FichaRow>
          <FichaRow label="Categoria" mark={form.category ? 'done' : 'empty'}>
            <Select aria-label="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {ROLE_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </Select>
          </FichaRow>
          <FichaRow label="Custo" mark={form.estimatedCost ? 'done' : 'empty'}>
            <Input
              type="number"
              min="0"
              aria-label="Custo estimado"
              value={form.estimatedCost}
              onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
            />
          </FichaRow>
          <FichaRow label="Tags" mark={form.tags.trim() ? 'done' : 'empty'}>
            <Input aria-label="Tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="sexta, festa, bar" />
          </FichaRow>
        </Ficha>
        <Field label="Descrição">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="role-form__publish">
          <Button type="submit" disabled={loading || nameMissing}>
            {loading ? 'Salvando...' : 'Publicar'}
          </Button>
          {nameMissing ? <p className="role-form__hint">O nome precisa de pelo menos 3 caracteres</p> : null}
        </div>
      </div>
    </form>
  );
}
