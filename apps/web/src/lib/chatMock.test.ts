import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendMessage,
  conversationsFromPeople,
  fallbackConversations,
  previewText,
  totalUnread,
} from './chatMock.js';

describe('chatMock', () => {
  it('seeds conversations with unread on incoming threads', () => {
    const conversations = fallbackConversations();
    assert.ok(conversations.length >= 3);
    assert.ok(totalUnread(conversations) > 0);
    assert.ok(previewText(conversations[0]).length > 0);
  });

  it('maps people into mock threads without a backend', () => {
    const conversations = conversationsFromPeople([
      { id: '1', name: 'Ana', username: 'ana', avatar: null },
    ]);
    assert.equal(conversations[0].person.username, 'ana');
    assert.equal(conversations[0].id, 'c-1');
  });

  it('appends sent messages and clears unread', () => {
    const [first] = fallbackConversations();
    const next = appendMessage(first, 'Bora!', true);
    assert.equal(next.unread, 0);
    assert.equal(next.messages.at(-1)?.fromMe, true);
    assert.equal(next.messages.at(-1)?.text, 'Bora!');
  });
});
