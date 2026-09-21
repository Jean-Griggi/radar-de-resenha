import { RequireAuth } from '@/components/RequireAuth';
import { NotificationsScreen } from '@/features/notifications';

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsScreen />
    </RequireAuth>
  );
}
