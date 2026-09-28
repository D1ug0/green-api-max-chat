import { create } from 'zustand';
import { createGreenApi } from '@/shared/api';
import type { Credentials, GreenApi } from '@/shared/api';

const STORAGE_KEY = 'green-api-max-chat:connection:v1';

export interface Session {
  id: string;
  instanceId: string;
  mode: 'live' | 'demo';
  api: GreenApi;
  controller: AbortController;
  tracksStatus: boolean;
  credentials?: Credentials;
  restored?: boolean;
}

function restoreSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return null;
    const data = saved as Record<string, unknown>;
    if (
      typeof data.idInstance !== 'string' ||
      typeof data.apiTokenInstance !== 'string' ||
      typeof data.apiUrl !== 'string'
    )
      return null;
    const credentials: Credentials = {
      idInstance: data.idInstance,
      apiTokenInstance: data.apiTokenInstance,
      apiUrl: data.apiUrl,
    };
    const api = createGreenApi(credentials);
    return {
      id: crypto.randomUUID(),
      instanceId: credentials.idInstance,
      mode: 'live',
      api,
      controller: new AbortController(),
      tracksStatus: data.tracksStatus === true,
      credentials,
      restored: true,
    };
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session?.mode === 'live' && session.credentials) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...session.credentials, tracksStatus: session.tracksStatus }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private browsing or when blocked by the browser.
  }
}
interface SessionState {
  session: Session | null;
  connect: (session: Session) => void;
  disconnect: () => void;
}
export const useSession = create<SessionState>((set) => ({
  session: restoreSession(),
  connect: (session) => {
    saveSession(session);
    set({ session });
  },
  disconnect: () =>
    set((state) => {
      state.session?.controller.abort();
      saveSession(null);
      return { session: null };
    }),
}));
