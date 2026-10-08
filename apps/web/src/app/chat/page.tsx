import { RequireAuth } from '@/components/RequireAuth';
import { ChatListScreen } from '@/features/chat';

export default function ChatPage() {
  return (
    <RequireAuth>
      <ChatListScreen />
    </RequireAuth>
  );
}
