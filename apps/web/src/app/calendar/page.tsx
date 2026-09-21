import { RequireAuth } from '@/components/RequireAuth';
import { CalendarScreen } from '@/features/stats';

export default function CalendarPage() {
  return (
    <RequireAuth>
      <CalendarScreen />
    </RequireAuth>
  );
}
