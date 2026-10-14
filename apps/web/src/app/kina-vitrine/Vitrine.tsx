'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { AvatarStack } from '@/components/AvatarStack';
import { Button } from '@/components/Button';
import { Corners } from '@/components/Corners';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Tag } from '@/components/Tag';
import { BrandWordmark } from '@/components/BrandWordmark';
import { useTheme } from '@/components/Theme';

/* Estados forçados para a vitrine: só tokens, para mostrar hover/foco/pressionado sem interação. */
const hoverPrimary: CSSProperties = { background: 'var(--k-brand-hover)' };
const pressPrimary: CSSProperties = { background: 'var(--k-brand-press)', transform: 'scale(0.98)' };
const focusRing: CSSProperties = { outline: '2px solid var(--k-focus)', outlineOffset: 2 };
const hoverSecondary: CSSProperties = { background: 'var(--k-bg-sunken)' };

function Section({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--k-text)] py-8">
      <h2 className="k-display text-[length:var(--k-fs-25)]">{title}</h2>
      <p className="k-meta mb-6 mt-1">{meta}</p>
      {children}
    </section>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {children}
      <span className="k-meta">{label}</span>
    </div>
  );
}

const ROW = 'flex flex-wrap items-start gap-6';

function ButtonSection() {
  const [loading, setLoading] = useState(false);
  return (
    <Section title="Button" meta="primary · secondary · outline · ghost · danger · estados">
      <div className={ROW}>
        <Cell label="primary">
          <Button>Bora</Button>
        </Cell>
        <Cell label="hover">
          <Button style={hoverPrimary}>Bora</Button>
        </Cell>
        <Cell label="pressionado">
          <Button style={pressPrimary}>Bora</Button>
        </Cell>
        <Cell label="foco">
          <Button style={focusRing}>Bora</Button>
        </Cell>
        <Cell label="carregando">
          <Button loading>Bora</Button>
        </Cell>
        <Cell label="desabilitado">
          <div className="flex flex-col items-start gap-1">
            <Button disabled aria-describedby="vit-help-publicar">
              Publicar
            </Button>
            <span id="vit-help-publicar" className="k-help">
              Falta escolher quando
            </span>
          </div>
        </Cell>
      </div>
      <div className={`${ROW} mt-8`}>
        <Cell label="secondary">
          <Button variant="secondary">Talvez</Button>
        </Cell>
        <Cell label="secondary · hover">
          <Button variant="secondary" style={hoverSecondary}>
            Talvez
          </Button>
        </Cell>
        <Cell label="secondary · foco">
          <Button variant="secondary" style={focusRing}>
            Talvez
          </Button>
        </Cell>
        <Cell label="secondary · carregando">
          <Button variant="secondary" loading>
            Talvez
          </Button>
        </Cell>
        <Cell label="secondary · desabilitado">
          <Button variant="secondary" disabled>
            Talvez
          </Button>
        </Cell>
        <Cell label="outline (= secondary)">
          <Button variant="outline">Confirmado</Button>
        </Cell>
      </div>
      <div className={`${ROW} mt-8`}>
        <Cell label="ghost (= text)">
          <Button variant="ghost">Receber link de acesso</Button>
        </Cell>
        <Cell label="ghost · desabilitado">
          <Button variant="ghost" disabled>
            Receber link de acesso
          </Button>
        </Cell>
        <Cell label="danger">
          <Button variant="danger">Excluir</Button>
        </Cell>
        <Cell label="danger · desabilitado">
          <Button variant="danger" disabled>
            Excluir
          </Button>
        </Cell>
        <Cell label="danger cheio (confirmação)">
          <Button className="button--danger-solid">Excluir rolê</Button>
        </Cell>
        <Cell label="com ícone">
          <Button>
            <Plus size={18} aria-hidden />
            Marcar um rolê
          </Button>
        </Cell>
        <Cell label="clique para ver loading">
          <Button
            variant="secondary"
            loading={loading}
            onClick={() => {
              setLoading(true);
              window.setTimeout(() => setLoading(false), 1600);
            }}
          >
            Salvar
          </Button>
        </Cell>
      </div>
    </Section>
  );
}

function FieldSection() {
  return (
    <Section title="Field / Input" meta="rótulo sempre visível · foco · erro · sucesso · desabilitado · título de rolê">
      <div className={ROW}>
        <div className="w-72">
          <Field label="Nome do rolê">
            <Input placeholder="Ex.: Pôr do sol na laje" />
          </Field>
        </div>
        <div className="w-72">
          <Field label="E-mail" error="Falta o domínio do e-mail">
            <Input defaultValue="lia@" />
          </Field>
        </div>
        <div className="w-72">
          <Field label="Senha">
            <Input type="password" defaultValue="12345678" className="is-valid" />
          </Field>
          <p className="k-msg k-msg--ok mt-1.5">Senha forte</p>
        </div>
        <div className="w-72">
          <Field label="Cidade">
            <Input defaultValue="São Paulo" disabled />
          </Field>
        </div>
        <div className="w-72">
          <Field label="Categoria">
            <Select defaultValue="">
              <option value="" disabled>
                Escolha
              </option>
              <option value="bar">Bar</option>
              <option value="praia">Praia</option>
            </Select>
          </Field>
        </div>
        <div className="w-72">
          <Field label="Descrição">
            <Textarea placeholder="Conte o plano" />
          </Field>
        </div>
        <div className="w-96">
          <Field label="Nome do rolê (título)">
            <Input defaultValue="Pôr do sol na laje" className="input--display" />
          </Field>
          <p className="k-meta mt-1">18/60</p>
        </div>
        <div className="w-72">
          <Field label="Carregando">
            <Input skeleton />
          </Field>
        </div>
      </div>
    </Section>
  );
}

function AvatarSection() {
  return (
    <Section title="Avatar e AvatarStack" meta="pessoas são pontos · iniciais em Fraunces · story visto / não visto">
      <div className="flex flex-wrap items-center gap-8">
        <Cell label="xl">
          <Avatar name="Lia Moraes" size="xl" />
        </Cell>
        <Cell label="lg">
          <Avatar name="Caio Neves" size="lg" />
        </Cell>
        <Cell label="story não visto">
          <div className="p-1">
            <Avatar name="Bia Rocha" size="lg" glow />
          </div>
        </Cell>
        <Cell label="story visto">
          <div className="p-1">
            <Avatar name="Duda Lins" size="lg" seen />
          </div>
        </Cell>
        <Cell label="md">
          <Avatar name="Téo" size="md" />
        </Cell>
        <Cell label="sm · online">
          <Avatar name="Ana Paula" size="sm" online />
        </Cell>
        <Cell label="xs">
          <Avatar name="Ju" size="xs" />
        </Cell>
        <Cell label="foto quebrada">
          <Avatar name="Foto Quebrada" src="/nao-existe.jpg" size="md" />
        </Cell>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-10">
        <Cell label="AvatarStack · xs (+4)">
          <AvatarStack
            size="xs"
            max={3}
            total={7}
            label="7 pessoas confirmadas"
            people={[{ name: 'Lia M' }, { name: 'Caio N' }, { name: 'Bia R' }, { name: 'Duda L' }]}
          />
        </Cell>
        <Cell label="AvatarStack · sm (+7)">
          <AvatarStack
            max={5}
            total={12}
            label="12 pessoas confirmadas"
            people={[{ name: 'Lia M' }, { name: 'Caio N' }, { name: 'Bia R' }, { name: 'Duda L' }, { name: 'Téo P' }, { name: 'Ana S' }]}
          />
        </Cell>
        <Cell label="AvatarStack · md, sem excedente">
          <AvatarStack size="md" people={[{ name: 'Lia M' }, { name: 'Caio N' }, { name: 'Bia R' }]} />
        </Cell>
      </div>
    </Section>
  );
}

function CornersSection() {
  return (
    <Section title="Corners" meta="memória tem moldura · passe o mouse nos interativos">
      <div className="flex flex-wrap gap-12 p-2">
        <Corners as="a" href="#vitrine" interactive className="block h-[150px] w-[200px] bg-[var(--k-bg-sunken)]" aria-label="Memória clicável" />
        <Corners size={16} interactive className="h-[150px] w-[240px] bg-[var(--k-bg-sunken)]" />
        <Corners size={22} className="h-[150px] w-[200px] bg-[var(--k-bg-sunken)]" />
        <div className="h-[150px] w-[200px] bg-[var(--k-bg-sunken)]" />
      </div>
      <p className="k-help mt-3">A última não tem moldura: é um rolê futuro (presente). Cantos: 12 px, 16 px e 22 px.</p>
    </Section>
  );
}

function TagSection() {
  return (
    <Section title="Tag" meta="ponto de 8 px + texto mono · sem pílula">
      <div className={ROW}>
        <Tag tone="brand">Vai rolar</Tag>
        <Tag tone="text">Já rolou</Tag>
        <Tag tone="success">Confirmado</Tag>
        <Tag tone="warning">Pendente</Tag>
        <Tag tone="danger">Cancelado</Tag>
      </div>
    </Section>
  );
}

export function Vitrine() {
  const { toggle } = useTheme();
  return (
    <main id="vitrine" className="mx-auto max-w-[1200px] px-4 pb-24 pt-10 sm:px-8">
      <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
        <BrandWordmark />
        <div className="flex items-center gap-4">
          <span className="k-meta">Vitrine · Fase 2</span>
          <Button variant="secondary" onClick={() => toggle()}>
            Alternar tema
          </Button>
        </div>
      </header>
      <ButtonSection />
      <FieldSection />
      <AvatarSection />
      <CornersSection />
      <TagSection />
    </main>
  );
}
