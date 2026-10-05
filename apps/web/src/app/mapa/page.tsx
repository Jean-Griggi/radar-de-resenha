import { RequireAuth } from '@/components/RequireAuth';
import { PeopleMapScreen } from '@/features/users';

export default function MapaPage() {
  return (
    <RequireAuth>
      <PeopleMapScreen />
    </RequireAuth>
  );
}
