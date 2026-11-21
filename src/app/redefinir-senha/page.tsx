'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Lock } from 'lucide-react'
import { AuthShell, AvisoAcesso, BotaoAcesso, CampoAcesso, LinkAcesso } from '@/components/auth/AuthShell'

const MIN = 12

function Formulario() {
  const token = useSearchParams().get('token') ?? ''
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(false)
  const [carregando, setCarregando] = useState(false)

  if (!token) {
    return (
      <AuthShell titulo="Link incompleto" rodape={<LinkAcesso href="/esqueci-senha">Pedir um novo link</LinkAcesso>}>
        <AvisoAcesso>Abra o link completo do e-mail ou peça um novo.</AvisoAcesso>
      </AuthShell>
    )
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault()
    setErro('')
    if (senha.length < MIN) { setErro(`A senha precisa ter pelo menos ${MIN} caracteres.`); return }
    if (senha !== confirmacao) { setErro('As duas senhas estão diferentes.'); return }
    setCarregando(true)
    try {
      const r = await fetch('/api/senha/redefinir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      })
      const dados = await r.json().catch(() => null)
      if (!r.ok) { setErro(dados?.error ?? 'Não foi possível alterar a senha.'); return }
      setPronto(true)
    } catch {
      setErro('Sem conexão. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  if (pronto) {
    return (
      <AuthShell titulo="Senha alterada" rodape={<LinkAcesso href="/">Ir para o login</LinkAcesso>}>
        <AvisoAcesso tipo="sucesso">Pronto. Já pode entrar com a nova senha.</AvisoAcesso>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      titulo="Criar nova senha"
      descricao={`Mínimo de ${MIN} caracteres.`}
      rodape={<LinkAcesso href="/">Voltar para o login</LinkAcesso>}
    >
      <form onSubmit={salvar} aria-busy={carregando} noValidate>
        <CampoAcesso
          id="nova-senha"
          rotulo="Nova senha"
          icone={Lock}
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
          minLength={MIN}
          autoComplete="new-password"
          autoFocus
          dica={senha && senha.length < MIN ? `Faltam ${MIN - senha.length} caracteres.` : undefined}
        />
        <CampoAcesso
          id="confirmar-senha"
          rotulo="Repita a senha"
          icone={Lock}
          type="password"
          value={confirmacao}
          onChange={e => setConfirmacao(e.target.value)}
          required
          autoComplete="new-password"
        />
        {erro && <AvisoAcesso>{erro}</AvisoAcesso>}
        <BotaoAcesso carregando={carregando} textoCarregando="Salvando..." icone={Check}>Salvar</BotaoAcesso>
      </form>
    </AuthShell>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<AuthShell titulo="Criar nova senha"><p className="text-sm text-slate-300 text-center">Carregando...</p></AuthShell>}>
      <Formulario />
    </Suspense>
  )
}
