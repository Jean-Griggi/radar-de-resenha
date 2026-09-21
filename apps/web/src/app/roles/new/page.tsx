import { RequireAuth } from '@/components/RequireAuth';
import { NewRoleScreen } from '@/features/roles';

export default function NewRolePage() {
  return (
    <RequireAuth>
      <NewRoleScreen />
    </RequireAuth>
  );
}
