'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { AvatarStack } from '@/components/AvatarStack';
import { REACTION_EMOJI, type ReactionType } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { Card, EmptyState, Skeleton } from '@/components/Card';
import { Corners } from '@/components/Corners';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Ficha, FichaRow } from '@/components/FichaRow';
import { Menu } from '@/components/Menu';
import { Modal, Sheet } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { Tabs } from '@/components/Tabs';
import { Tag } from '@/components/Tag';
import { ToastView, useToast } from '@/components/Toast';
import { TrackList, TrackRow } from '@/components/TrackRow';
import { BrandBadge, BrandLoader, BrandSymbol } from '@/components/BrandMark';
import { BrandWordmark } from '@/components/BrandWordmark';
import { KinaLogo } from '@/components/KinaLogo';
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

function CardSection() {
  return (
    <Section title="Card" meta="espaço + fio · sem sombra · memória ganha cantoneiras">
      <div className="flex flex-wrap gap-10 p-2">
        <Card className="w-72">
          <p className="k-meta">Card · padrão</p>
          <p className="mt-2">Fio de 1 px, sem raio e sem sombra.</p>
        </Card>
        <Card className="card--lift w-72">
          <p className="k-meta">Card · hover (passe o mouse)</p>
          <p className="mt-2">O fio escurece; nada levanta.</p>
        </Card>
        <Card corners className="w-72">
          <p className="k-meta">Card · memória</p>
          <p className="mt-2">Com cantoneiras, para o que já aconteceu.</p>
        </Card>
      </div>
    </Section>
  );
}

const TAB_ITEMS = [
  { value: 'resumo', label: 'Resumo' },
  { value: 'roles', label: 'Rolês' },
  { value: 'resenhas', label: 'Resenhas' },
  { value: 'fotos', label: 'Fotos' },
  { value: 'audios', label: 'Áudios' },
  { value: 'musica', label: 'Música' },
  { value: 'stats', label: 'Estatísticas' },
];

function TabsSection() {
  const [tab, setTab] = useState('resumo');
  return (
    <Section title="Tabs" meta="texto + sublinhado de 2 px · setas navegam · no celular a barra rola (reduza a janela)">
      <div className="max-w-md">
        <Tabs label="Seções do perfil" items={TAB_ITEMS} value={tab} onChange={setTab} />
        <p className="k-help mt-3">Aba ativa: {tab}</p>
      </div>
    </Section>
  );
}

function FichaSection() {
  return (
    <Section title="FichaRow / Ficha" meta="rótulo mono · valor · fio · marcador só na criação">
      <div className="flex flex-wrap gap-12">
        <div className="w-full max-w-md">
          <Ficha>
            <FichaRow label="Quando" mono mark="done" onClick={() => undefined}>
              SÁB 18 OUT · 18H
            </FichaRow>
            <FichaRow label="Onde" mark="done" onClick={() => undefined}>
              Laje da Bia, Vila Madalena
            </FichaRow>
            <FichaRow label="Categoria" mark="empty" empty onClick={() => undefined}>
              Escolher categoria
            </FichaRow>
            <FichaRow label="Custo" mark="empty" empty onClick={() => undefined}>
              Quanto vai custar
            </FichaRow>
          </Ficha>
          <p className="k-help mt-2">Criação de rolê: com marcador e linha clicável.</p>
        </div>
        <div className="w-full max-w-md">
          <Ficha>
            <FichaRow label="Quando" mono>
              SÁB 18 OUT · 18H
            </FichaRow>
            <FichaRow label="Onde">Laje da Bia, Vila Madalena</FichaRow>
            <FichaRow label="Custo" mono>
              R$ 30
            </FichaRow>
          </Ficha>
          <p className="k-help mt-2">Leitura: sem marcador e sem chevron.</p>
        </div>
      </div>
    </Section>
  );
}

function TrackSection() {
  return (
    <Section title="TrackRow" meta="música como encarte · capa quadrada, sem filtro">
      <div className="flex flex-wrap gap-12">
        <div className="w-full max-w-md">
          <TrackList>
            <TrackRow index={1} title="Laranja Elétrica" artist="Os Postes" duration="3:41" current />
            <TrackRow index={2} title="Rua Sem Saída" artist="Duda Lins" duration="4:02" />
            <TrackRow index={3} title="Telhado com um título muito, muito longo que precisa truncar" artist="Banda Calçada" duration="2:58" />
          </TrackList>
          <p className="k-help mt-2">Lista: tocando (1), normal (2), título longo (3). Sem capa, ícone de música.</p>
        </div>
        <div className="w-full max-w-sm">
          <TrackList>
            <TrackRow compact title="Laranja Elétrica" artist="Os Postes" />
          </TrackList>
          <p className="k-help mt-2">Compacta (dentro de Post/Perfil).</p>
        </div>
      </div>
    </Section>
  );
}

function LoadingSection() {
  const [round, setRound] = useState(0);
  return (
    <Section title="Skeleton e Spinner" meta="fios e pontos, sem gradiente · ponto percorrendo o L">
      <div className="flex flex-wrap items-start gap-12">
        <div className="grid w-80 gap-3.5" aria-hidden>
          <div className="flex items-center gap-3">
            <Skeleton variant="dot" className="h-9 w-9" />
            <Skeleton variant="line" className="flex-1" />
          </div>
          <Skeleton variant="line" />
          <Skeleton variant="line" className="w-3/5" />
        </div>
        <div className="w-80">
          <Skeleton className="h-24" />
          <p className="k-help mt-2">Bloco (contorno de 1 px).</p>
        </div>
        <div className="w-64">
          <Button skeleton />
        </div>
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-end gap-6">
            <Spinner key={`a${round}`} />
            <Spinner key={`b${round}`} size="lg" />
          </div>
          <Button variant="secondary" onClick={() => setRound((n) => n + 1)}>
            Reiniciar (aparece após 300 ms)
          </Button>
        </div>
      </div>
    </Section>
  );
}

function EmptySection() {
  return (
    <Section title="EmptyState" meta="uma frase em Fraunces + ação">
      <div className="flex flex-wrap gap-8">
        <div className="w-80">
          <EmptyState title="Ninguém marcou nada ainda." action={<Button variant="ghost">Marcar um rolê</Button>} />
        </div>
        <div className="w-80">
          <EmptyState title="Nenhuma música por aqui." description="Conecte o Spotify para ver as suas." />
        </div>
        <div className="w-80">
          <EmptyState title="Essa rua não existe." action={<Button>Voltar para o início</Button>} />
        </div>
      </div>
    </Section>
  );
}

function ToastSection() {
  const toast = useToast();
  return (
    <Section title="Toast" meta="inverso · ícone + mensagem + ação · role status, 4–6 s">
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex w-96 max-w-full flex-col gap-3">
          <ToastView message="Você vai no Pôr do sol na laje" action="Desfazer" />
          <ToastView tone="info" message="Pedido de amizade enviado" />
          <ToastView tone="error" message="Não foi possível registrar a reação" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.push('Rolê salvo')}>
            Disparar sucesso
          </Button>
          <Button variant="secondary" onClick={() => toast.push('Algo deu errado', 'error')}>
            Disparar erro
          </Button>
          <Button variant="secondary" onClick={() => toast.push('Você saiu do rolê', 'info', { label: 'Desfazer', onClick: () => undefined })}>
            Disparar com ação
          </Button>
        </div>
      </div>
    </Section>
  );
}

function OverlaySection() {
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sheet, setSheet] = useState(false);
  return (
    <Section title="Modal e Sheet" meta="foco preso · Esc fecha · foco volta ao gatilho · saída de 160 ms">
      <div className={ROW}>
        <Button variant="secondary" onClick={() => setModal(true)}>
          Abrir modal
        </Button>
        <Button variant="secondary" onClick={() => setConfirm(true)}>
          Abrir confirmação destrutiva
        </Button>
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Abrir sheet (celular)
        </Button>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Marcar um rolê" description="Dois campos e pronto.">
        <div className="space-y-4">
          <Field label="Nome do rolê">
            <Input data-autofocus placeholder="Ex.: Pôr do sol na laje" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModal(false)}>Publicar</Button>
          </div>
        </div>
      </Modal>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Excluir este rolê?" description="Não dá para desfazer.">
        <div className="flex justify-end gap-3">
          <Button variant="secondary" data-autofocus onClick={() => setConfirm(false)}>
            Manter
          </Button>
          <Button className="button--danger-solid" onClick={() => setConfirm(false)}>
            Excluir rolê
          </Button>
        </div>
      </Modal>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Quando?">
        <Ficha>
          <FichaRow label="Data" mono>
            SÁB 18 OUT
          </FichaRow>
          <FichaRow label="Hora" mono>
            18H
          </FichaRow>
        </Ficha>
        <div className="mt-4">
          <Button className="w-full" onClick={() => setSheet(false)}>
            Pronto
          </Button>
        </div>
      </Sheet>
    </Section>
  );
}

function MenuSection() {
  const [last, setLast] = useState('nenhum');
  return (
    <Section title="Menu" meta="itens de 44 px · fios · setas, Home, End, Esc">
      <div className="flex items-start gap-8">
        <Menu
          label="Menu da conta"
          trigger={<Avatar name="Lia Moraes" size="sm" />}
          items={[
            { label: 'Perfil', onSelect: () => setLast('Perfil') },
            { label: 'Configurações', onSelect: () => setLast('Configurações') },
            { label: 'Calendário', href: '#vitrine', separatorBefore: true },
            { label: 'Sair', tone: 'danger', separatorBefore: true, onSelect: () => setLast('Sair') },
          ]}
        />
        <p className="k-help pt-3">Último item escolhido: {last}</p>
      </div>
    </Section>
  );
}

function ReactionsSection() {
  return (
    <Section title="Reações" meta="sem fundo · emoji + contagem mono · ativa com fio inferior de 2 px">
      <div className="flex flex-wrap gap-8">
        {(
          [
            ['padrão', false, 0],
            ['com contagem', false, 7],
            ['ativa', true, 8],
          ] as const
        ).map(([name, pressed, count]) => (
          <Cell key={name} label={name}>
            <div className="flex flex-wrap gap-1" role="group" aria-label={`Reações (${name})`}>
              {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type, index) => (
                <button
                  key={type}
                  type="button"
                  className="reaction-btn"
                  aria-pressed={pressed && index === 0}
                  aria-label={`Reagir com ${REACTION_EMOJI[type]}`}
                >
                  <span aria-hidden>{REACTION_EMOJI[type]}</span>
                  {count > 0 && index < 2 ? <span className="k-meta">{count}</span> : null}
                </button>
              ))}
            </div>
          </Cell>
        ))}
      </div>
      <p className="k-help mt-3">Mesmas classes do componente Reactions (que fala com a API, por isso aqui só o visual).</p>
    </Section>
  );
}

function BrandSection() {
  return (
    <Section title="BrandMark e BrandWordmark" meta="logo em SVG inline · símbolo · selo · carregamento">
      <div className="flex flex-wrap items-center gap-10">
        <Cell label="BrandWordmark">
          <BrandWordmark />
        </Cell>
        <Cell label="BrandWordmark · link">
          <BrandWordmark href="#vitrine" />
        </Cell>
        <Cell label="BrandWordmark · grande">
          <BrandWordmark large />
        </Cell>
        <Cell label="BrandSymbol">
          <BrandSymbol className="h-12 w-12" title="Kina" />
        </Cell>
        <Cell label="BrandBadge">
          <BrandBadge />
        </Cell>
        <Cell label="KinaLogo compact">
          <KinaLogo variant="compact" className="h-8 w-auto" />
        </Cell>
      </div>
      <div className="mt-6">
        <BrandLoader compact label="Montando retrospectiva" />
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
      <CardSection />
      <TabsSection />
      <FichaSection />
      <TrackSection />
      <LoadingSection />
      <EmptySection />
      <ToastSection />
      <OverlaySection />
      <MenuSection />
      <ReactionsSection />
      <BrandSection />
    </main>
  );
}
