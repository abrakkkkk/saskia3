import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import RouteGuard from '@/components/layout/RouteGuard';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CallProvider } from '@/contexts/CallContext';
import CallSystem from '@/components/CallSystem';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/');
  }

  const { cargo, name, email } = session.user;

  return (
    <CallProvider>
      <div className="app-layout">
        <Header nome={name ?? 'Usuário'} email={email ?? ''} cargo={cargo} />
        <div className="app-container">
          <Sidebar cargo={cargo} />
          <main className="app-content">
            <RouteGuard cargo={cargo}>{children}</RouteGuard>
          </main>
        </div>
        <Footer />
        <CallSystem />
      </div>
    </CallProvider>
  );
}
