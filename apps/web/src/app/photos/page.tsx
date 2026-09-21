import { RequireAuth } from '@/components/RequireAuth';
import { PhotosScreen } from '@/features/media';

export default function PhotosPage() {
  return (
    <RequireAuth>
      <PhotosScreen />
    </RequireAuth>
  );
}
