'use client';

import { ROLE_CATEGORIES, type RoleDetail } from '@resenhometro/shared';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
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

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Editar rolê</h1>
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-4 sm:p-6">
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
        <Field label="Nome">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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
        <Field label="Categoria">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {ROLE_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </Field>
        <Field label="Custo estimado">
          <Input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
        </Field>
        <Field label="Tags">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </Field>
        <Button type="submit">Salvar</Button>
      </form>
    </>
  );
}
