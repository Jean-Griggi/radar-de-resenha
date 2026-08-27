import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  clearShellCache,
  peekSuggestions,
  peekUpcomingRoles,
  setCachedSuggestions,
  setCachedUpcomingRoles,
  withInflight,
} from './shellCache.js';

afterEach(() => {
  clearShellCache();
});

describe('shellCache', () => {
  it('returns rail data within the TTL', () => {
    setCachedSuggestions([{ id: '1', name: 'Ana', username: 'ana', avatar: null }]);
    setCachedUpcomingRoles([{ id: 'r1', title: 'Rolê', date: '2026-08-27', time: '22:00' }]);

    assert.equal(peekSuggestions()?.[0]?.username, 'ana');
    assert.equal(peekUpcomingRoles()?.[0]?.title, 'Rolê');
  });

  it('clears rail and inflight state', () => {
    setCachedSuggestions([{ id: '1', name: 'Ana', username: 'ana', avatar: null }]);
    clearShellCache();
    assert.equal(peekSuggestions(), null);
  });

  it('dedupes concurrent fetches', async () => {
    let calls = 0;
    const task = () =>
      withInflight('test', async () => {
        calls += 1;
        await Promise.resolve();
        return 'ok';
      });

    const [a, b] = await Promise.all([task(), task()]);
    assert.equal(a, 'ok');
    assert.equal(b, 'ok');
    assert.equal(calls, 1);
  });
});
