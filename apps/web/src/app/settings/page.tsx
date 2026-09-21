import { RequireAuth } from '@/components/RequireAuth';
import { SettingsScreen } from '@/features/settings';

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsScreen />
    </RequireAuth>
  );
}
