import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import ChatbotButton from '@/components/chatbot/ChatbotButton';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="app-container">
        <Sidebar />
        <main className="app-content">
          {children}
        </main>
      </div>
      <Footer />
      <ChatbotButton />
    </div>
  );
}
