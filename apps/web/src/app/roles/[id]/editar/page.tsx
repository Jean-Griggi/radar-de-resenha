'use client';

import { ROLE_CATEGORIES, type RoleDetail } from '@resenhometro/shared';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';

export default function EditRolePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
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
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
        tags: form.tags.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean),
      });
      toast.push('Rolê atualizado');
      router.push(`/roles/${params.id}`);
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  return (
    <RequireAuth>
      <h1 className="mb-6 text-3xl font-semibold">Editar rolê</h1>
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-6">
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
        <Field label="Local">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
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
    </RequireAuth>
  );
}
