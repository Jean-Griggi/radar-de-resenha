import { RequireAuth } from '@/components/RequireAuth';
import { EditRoleScreen } from '@/features/roles';

export default function EditRolePage() {
  return (
    <RequireAuth>
      <EditRoleScreen />
    </RequireAuth>
  );
}
