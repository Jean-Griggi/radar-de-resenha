import { RequireAuth } from '@/components/RequireAuth';
import { ProfileScreen } from '@/features/users';

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileScreen />
    </RequireAuth>
  );
}
