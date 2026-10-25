import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminHospitaisPage() {
  const session = await auth();

  if (session?.user?.cargo === 'ADMIN') {
    redirect('/admin-configuracao');
  }

  redirect('/dashboard');
}