import { RequireAuth } from '@/components/RequireAuth';
import { RolesListScreen } from '@/features/roles';

export default function RolesPage() {
  return (
    <RequireAuth>
      <RolesListScreen />
    </RequireAuth>
  );
}
