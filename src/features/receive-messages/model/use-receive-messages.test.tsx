import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/entities/session';
import type { GreenApi } from '@/shared/api';
import { useReceiveMessages } from './use-receive-messages';

afterEach(cleanup);

describe('restored connection', () => {
  it('does not start receiving messages when the instance authorization has expired', async () => {
    const getState = vi.fn().mockResolvedValue('notAuthorized');
    const receiveNotification = vi.fn();
    const session: Session = {
      id: 'restored-session',
      instanceId: '3100000000',
      mode: 'live',
      api: { getState, receiveNotification } as unknown as GreenApi,
      controller: new AbortController(),
      tracksStatus: false,
      restored: true,
    };

    const { result } = renderHook(() => useReceiveMessages(session));
    await waitFor(() => expect(result.current.status.state).toBe('error'));
    expect(result.current.status.detail).toContain('не авторизован');
    expect(receiveNotification).not.toHaveBeenCalled();
  });
});
