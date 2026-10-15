'use client';

import type { RoleDetail } from '@resenhometro/shared';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import type { MapPoint } from '@/features/users/mapPoint';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { postFile } from '@/lib/upload';
import { RoleFormView } from './RoleFormView';

export function EditRoleScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerRemoved, setBannerRemoved] = useState(false);
  const [ready, setReady] = useState(false);
  const [submitError, setSubmitError] = useState('');
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
    setSubmitError('');
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
      setSubmitError(apiErrorMessage(err));
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  const nameMissing = form.title.trim().length === 0;

  return (
    <RoleFormView
      heading="Editar rolê"
      form={form}
      setForm={setForm}
      point={point}
      setPoint={setPoint}
      banner={{
        currentUrl: currentBanner,
        file: banner,
        removed: bannerRemoved,
        onFile: (file) => {
          setBanner(file);
          setBannerRemoved(false);
        },
        onRemove: () => {
          setBanner(null);
          setBannerRemoved(true);
        },
      }}
      onSubmit={onSubmit}
      submitLabel="Salvar"
      submitDisabled={!ready || nameMissing}
      reason={ready && nameMissing ? 'Falta o nome' : null}
      error={submitError}
    />
  );
}
