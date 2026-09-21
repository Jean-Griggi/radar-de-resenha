import { RequireAuth } from '@/components/RequireAuth';
import { StatsScreen } from '@/features/stats';

export default function StatsPage() {
  return (
    <RequireAuth>
      <StatsScreen />
    </RequireAuth>
  );
}
