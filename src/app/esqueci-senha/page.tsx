'use client'

import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { AuthShell, AvisoAcesso, BotaoAcesso, CampoAcesso, LinkAcesso } from '@/components/auth/AuthShell'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(event: React.FormEvent) {
    event.preventDefault()
    setErro('')
    if (!email.trim()) { setErro('Digite seu e-mail.'); return }
    setCarregando(true)
    try {
      const r = await fetch('/api/senha/esqueci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const dados = await r.json().catch(() => null)
      if (!r.ok) { setErro(dados?.error ?? 'Não foi possível enviar. Tente de novo.'); return }
      setEnviado(dados?.mensagem ?? 'Se o e-mail estiver cadastrado, você vai receber um link.')
    } catch {
      setErro('Sem conexão. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <AuthShell
      titulo="Esqueci minha senha"
      descricao={enviado ? undefined : 'Enviaremos um link para criar uma nova senha.'}
      rodape={<LinkAcesso href="/">Voltar para o login</LinkAcesso>}
    >
      {enviado ? (
        <>
          <AvisoAcesso tipo="sucesso">{enviado}</AvisoAcesso>
          <p className="text-sm text-slate-300 text-pretty" style={{ lineHeight: 1.5 }}>
            Não chegou? Veja o spam ou peça ao administrador do hospital.
          </p>
        </>
      ) : (
        <form onSubmit={enviar} aria-busy={carregando} noValidate>
          <CampoAcesso
            id="esqueci-email"
            rotulo="E-mail"
            icone={Mail}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="usuario@hospital.com"
            required
            autoComplete="username"
            inputMode="email"
            autoFocus
          />
          {erro && <AvisoAcesso>{erro}</AvisoAcesso>}
          <BotaoAcesso carregando={carregando} textoCarregando="Enviando..." icone={Send}>Enviar link</BotaoAcesso>
        </form>
      )}
    </AuthShell>
  )
}
