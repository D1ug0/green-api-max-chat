import { ChatPage } from '@/pages/chat';
import { ConnectPage } from '@/pages/connect';
import { useSession } from '@/entities/session';

export function App() {
  const session = useSession((state) => state.session);
  return session ? <ChatPage key={session.id} session={session} /> : <ConnectPage />;
}
