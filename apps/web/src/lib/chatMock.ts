export type ChatPerson = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  online: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  fromMe: boolean;
  text: string;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  person: ChatPerson;
  unread: number;
  messages: ChatMessage[];
};

type SeedPerson = {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
};

const FALLBACK_PEOPLE: SeedPerson[] = [
  { id: 'mock-juh', name: 'Júlia Martins', username: 'juhmartins' },
  { id: 'mock-leo', name: 'Léo Andrade', username: 'leoandrade' },
  { id: 'mock-nana', name: 'Nana Costa', username: 'nanacosta' },
  { id: 'mock-rafa', name: 'Rafa Oliveira', username: 'rafaoli' },
];

const THREADS: { incoming: string; outgoing?: string; empty?: boolean }[] = [
  { incoming: 'Bora nesse rolê sexta? Tá todo mundo confirmando.', outgoing: 'Fechado. Te chamo no ponto.' },
  { incoming: 'Vi sua foto do último encontro. Que resenha.' },
  { incoming: 'Cadê vocês? Já tô na porta.' },
  { empty: true, incoming: '' },
];

const REPLIES = ['Fechado!', 'Que horas a gente se encontra?', 'Bora 🔥', 'Tô indo, me espera.', 'Manda o local.'];

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function conversationsFromPeople(people: SeedPerson[]): ChatConversation[] {
  const source = people.length > 0 ? people : FALLBACK_PEOPLE;
  return source.slice(0, 8).map((person, index) => {
    const thread = THREADS[index % THREADS.length] ?? { incoming: '', empty: true };
    const conversationId = `c-${person.id}`;
    const messages: ChatMessage[] = [];
    if (!thread.empty && thread.incoming) {
      messages.push({
        id: `${conversationId}-in`,
        conversationId,
        fromMe: false,
        text: thread.incoming,
        createdAt: minutesAgo(40 - index * 7),
      });
      if (thread.outgoing) {
        messages.push({
          id: `${conversationId}-out`,
          conversationId,
          fromMe: true,
          text: thread.outgoing,
          createdAt: minutesAgo(28 - index * 5),
        });
      }
    }
    const lastFromOther = messages.at(-1)?.fromMe === false;
    return {
      id: conversationId,
      person: {
        id: person.id,
        name: person.name,
        username: person.username,
        avatar: person.avatar ?? null,
        online: index % 3 !== 2,
      },
      unread: lastFromOther && index < 2 ? 1 + (index % 2) : 0,
      messages,
    };
  });
}

export function fallbackConversations() {
  return conversationsFromPeople(FALLBACK_PEOPLE);
}

export function totalUnread(conversations: ChatConversation[]) {
  return conversations.reduce((sum, item) => sum + item.unread, 0);
}

export function lastActivity(conversation: ChatConversation) {
  return conversation.messages.at(-1)?.createdAt ?? '';
}

export function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
}

export function previewText(conversation: ChatConversation) {
  const last = conversation.messages.at(-1);
  if (!last) return 'Nenhuma mensagem ainda';
  return last.fromMe ? `Você: ${last.text}` : last.text;
}

export function formatChatTime(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return time;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} ${time}`;
}

export function mockReply(lastText?: string) {
  if (lastText && /hora|quando|ponto/i.test(lastText)) return '21h no ponto de sempre.';
  if (lastText && /bora|vamos|fechado/i.test(lastText)) return 'Bora! Te encontro lá.';
  return REPLIES[Math.floor(Math.random() * REPLIES.length)] ?? 'Fechado!';
}

export function appendMessage(conversation: ChatConversation, text: string, fromMe: boolean): ChatConversation {
  const message: ChatMessage = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId: conversation.id,
    fromMe,
    text,
    createdAt: new Date().toISOString(),
  };
  return {
    ...conversation,
    unread: fromMe ? 0 : conversation.unread + 1,
    messages: [...conversation.messages, message],
  };
}
