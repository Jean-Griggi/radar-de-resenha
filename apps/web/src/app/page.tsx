import { RequireAuth } from '@/components/RequireAuth';
import { FeedScreen } from '@/features/social';

export default function HomePage() {
  return (
    <RequireAuth>
      <FeedScreen />
    </RequireAuth>
  );
}
