'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { MapPoint } from '@/features/users/mapPoint';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { postFile } from '@/lib/upload';
import { RoleFormView } from './RoleFormView';

export function NewRoleScreen() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
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
    setSubmitError('');
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
      setSubmitError(apiErrorMessage(err));
      toast.push(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  const nameMissing = form.title.trim().length < 3;

  return (
    <RoleFormView
      heading="Marcar um rolê"
      form={form}
      setForm={setForm}
      point={point}
      setPoint={setPoint}
      banner={{ file: banner, onFile: setBanner, onRemove: () => setBanner(null) }}
      onSubmit={onSubmit}
      submitLabel={loading ? 'Salvando...' : 'Publicar'}
      submitDisabled={loading || nameMissing}
      reason={nameMissing ? 'O nome precisa de pelo menos 3 caracteres' : null}
      error={submitError}
      titleMinLength={3}
    />
  );
}
