import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import ConfigurarMfa from './ConfigurarMfa'

export const metadata = { title: 'Verificação em duas etapas · Saskia' }

export default async function VerificacaoDuasEtapasPage() {
  const session = await auth()
  if (!session) redirect('/')
  return <ConfigurarMfa obrigatorio={Boolean(session.user.mfaPendente)} />
}
