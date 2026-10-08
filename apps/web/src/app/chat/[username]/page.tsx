import { RequireAuth } from '@/components/RequireAuth';
import { ConversationScreen } from '@/features/chat';

export default function ConversationPage() {
  return (
    <RequireAuth>
      <ConversationScreen />
    </RequireAuth>
  );
}
