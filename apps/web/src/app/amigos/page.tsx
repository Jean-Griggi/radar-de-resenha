import { RequireAuth } from '@/components/RequireAuth';
import { FriendsScreen } from '@/features/social';

export default function FriendsPage() {
  return (
    <RequireAuth>
      <FriendsScreen />
    </RequireAuth>
  );
}
