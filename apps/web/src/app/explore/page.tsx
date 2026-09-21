import { Suspense } from 'react';
import { Skeleton } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { ExploreScreen } from '@/features/search';

export default function ExplorePage() {
  return (
    <RequireAuth>
      <Suspense fallback={<Skeleton className="h-40" />}>
        <ExploreScreen />
      </Suspense>
    </RequireAuth>
  );
}
