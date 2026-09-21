import { RequireAuth } from '@/components/RequireAuth';
import { YearReviewScreen } from '@/features/stats';

export default function YearReviewPage() {
  return (
    <RequireAuth>
      <YearReviewScreen />
    </RequireAuth>
  );
}
