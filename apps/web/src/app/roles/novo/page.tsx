import { redirect } from 'next/navigation';

export default function LegacyNewRole() {
  redirect('/roles/new');
}
