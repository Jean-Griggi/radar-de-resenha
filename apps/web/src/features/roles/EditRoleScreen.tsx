'use client';

import { ROLE_CATEGORIES, type RoleDetail } from '@resenhometro/shared';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Ficha, FichaRow } from '@/components/FichaRow';
import { Field, Input, Select, Textarea } from '@/components/Field';
import type { MapPoint } from '@/features/users/mapPoint';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { postFile } from '@/lib/upload';
import { BannerField } from './BannerField';
import { PlaceField } from './PlaceField';

export function EditRoleScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerRemoved, setBannerRemoved] = useState(false);
  const [ready, setReady] = useState(false);
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

  useEffect(() => {
    api.get<RoleDetail>(`/roles/${params.id}`).then(({ data }) => {
      setCurrentBanner(data.banner ?? null);
      setPoint(
        data.latitude != null && data.longitude != null
          ? { latitude: data.latitude, longitude: data.longitude }
          : null,
      );
      setForm({
        title: data.title,
        description: data.description ?? '',
        date: data.date ?? '',
        time: data.time ?? '',
        location: data.location ?? '',
        category: data.category,
        estimatedCost: data.estimatedCost?.toString() ?? '',
        tags: (data.tags ?? []).join(', '),
      });
      setReady(true);
    });
  }, [params.id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.put(`/roles/${params.id}`, {
        ...form,
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
        tags: form.tags.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean),
      });
      if (banner) {
        await postFile(`/roles/${params.id}/banner`, 'cover', banner);
      } else if (bannerRemoved && currentBanner) {
        await api.delete(`/roles/${params.id}/banner`);
      }
      toast.push('Rolê atualizado');
      router.push(`/roles/${params.id}`);
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  const nameMissing = form.title.trim().length === 0;

  return (
    <form onSubmit={onSubmit} className="role-form">
      <div className="role-form__cover">
        <BannerField
          currentUrl={currentBanner}
          file={banner}
          removed={bannerRemoved}
          onFile={(file) => {
            setBanner(file);
            setBannerRemoved(false);
          }}
          onRemove={() => {
            setBanner(null);
            setBannerRemoved(true);
          }}
        />
      </div>
      <div className="role-form__body">
        <Field label="Nome">
          <Input className="input--display" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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
            <Input type="number" aria-label="Custo estimado" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
          </FichaRow>
          <FichaRow label="Tags" mark={form.tags.trim() ? 'done' : 'empty'}>
            <Input aria-label="Tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </FichaRow>
        </Ficha>
        <Field label="Descrição">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="role-form__publish">
          <Button type="submit" disabled={!ready || nameMissing}>
            Salvar
          </Button>
          {ready && nameMissing ? <p className="role-form__hint">Falta o nome</p> : null}
        </div>
      </div>
    </form>
  );
}
