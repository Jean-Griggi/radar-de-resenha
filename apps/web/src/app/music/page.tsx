import { RequireAuth } from '@/components/RequireAuth';
import { MusicScreen } from '@/features/music';

export default function MusicPage() {
  return (
    <RequireAuth>
      <MusicScreen />
    </RequireAuth>
  );
}
