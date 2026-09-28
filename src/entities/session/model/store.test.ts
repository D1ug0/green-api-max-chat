import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoApi, createGreenApi } from '@/shared/api';

const credentials = {
  idInstance: '3100000000',
  apiTokenInstance: 'test-token',
  apiUrl: 'https://3100.api.green-api.com',
};

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('saved connection', () => {
  it('restores a live connection after a module reload and removes it on logout', async () => {
    const { useSession } = await import('./store');
    useSession.getState().connect({
      id: 'first',
      instanceId: credentials.idInstance,
      mode: 'live',
      api: createGreenApi(credentials),
      controller: new AbortController(),
      tracksStatus: true,
      credentials,
    });

    vi.resetModules();
    const { useSession: restored } = await import('./store');
    expect(restored.getState().session?.credentials).toEqual(credentials);
    expect(restored.getState().session?.mode).toBe('live');
    expect(restored.getState().session?.tracksStatus).toBe(true);

    restored.getState().disconnect();
    vi.resetModules();
    const { useSession: loggedOut } = await import('./store');
    expect(loggedOut.getState().session).toBeNull();
  });

  it('does not persist the demo connection', async () => {
    const { useSession } = await import('./store');
    useSession.getState().connect({
      id: 'demo',
      instanceId: 'demo',
      mode: 'demo',
      api: createDemoApi(),
      controller: new AbortController(),
      tracksStatus: true,
    });
    vi.resetModules();
    const { useSession: restored } = await import('./store');
    expect(restored.getState().session).toBeNull();
  });
});
