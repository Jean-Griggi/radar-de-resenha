import { RequireAuth } from '@/components/RequireAuth';
import { ReviewDetailScreen } from '@/features/reviews';

export default function ReviewPage() {
  return (
    <RequireAuth>
      <ReviewDetailScreen />
    </RequireAuth>
  );
}
