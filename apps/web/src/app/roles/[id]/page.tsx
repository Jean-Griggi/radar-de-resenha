import { RequireAuth } from '@/components/RequireAuth';
import { RoleDetailScreen } from '@/features/roles';

export default function RoleDetailPage() {
  return (
    <RequireAuth>
      <RoleDetailScreen />
    </RequireAuth>
  );
}
