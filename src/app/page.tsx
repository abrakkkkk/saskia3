'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Hospital, KeyRound, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { AuthShell, AvisoAcesso, BotaoAcesso, CampoAcesso, LinkAcesso } from '@/components/auth/AuthShell'

// Conveniência do aparelho: o código da unidade não é segredo, só evita redigitar a cada plantão.
const CHAVE_CODIGO = 'saskia:codigo-unidade'

export default function LoginPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [otp, setOtp] = useState('')
  const [pedeOtp, setPedeOtp] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_CODIGO)
      if (salvo) void Promise.resolve().then(() => setCodigo(salvo))
    } catch { /* armazenamento indisponível: segue sem lembrar */ }
  }, [])

  useEffect(() => {
    if (pedeOtp) otpRef.current?.focus()
  }, [pedeOtp])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')

    const codigoLimpo = codigo.replace(/[\s-]/g, '').toUpperCase()
    if (!codigoLimpo || !email || !senha) {
      setErro('Preencha todos os campos.')
      return
    }
    if (pedeOtp && !otp.trim()) {
      setErro('Digite o código do celular.')
      return
    }

    setLoading(true)
    try {
      const resultado = await signIn('credentials', {
        codigo: codigoLimpo,
        email,
        senha,
        otp: pedeOtp ? otp.trim() : '',
        redirect: false,
      })

      if (resultado?.code === 'mfa') {
        setPedeOtp(true)
        setLoading(false)
        return
      }
      if (resultado?.code === 'mfa_invalido') {
        setOtp('')
        setErro('Código incorreto ou já usado. Digite o que aparece agora no app.')
        setLoading(false)
        otpRef.current?.focus()
        return
      }
      if (resultado?.error || !resultado?.ok) {
        // Mensagem única: não revela se a unidade ou a conta existem, estão inativas ou bloqueadas.
        setErro('Código da unidade, e-mail ou senha incorretos. Depois de várias tentativas, aguarde 15 minutos.')
        setLoading(false)
        return
      }
      try { localStorage.setItem(CHAVE_CODIGO, codigoLimpo) } catch { /* sem armazenamento */ }
      router.push('/dashboard')
    } catch {
      setErro('Sem conexão. Tente de novo.')
      setLoading(false)
    }
  }

  function voltar() {
    setPedeOtp(false)
    setOtp('')
    setErro('')
  }

  return (
    <AuthShell
      titulo={pedeOtp ? 'Verificação em duas etapas' : 'Acessar o sistema'}
      descricao={pedeOtp ? 'Abra o app autenticador no celular e digite o código de 6 dígitos.' : undefined}
      rodape={pedeOtp ? undefined : (
        <>
          <LinkAcesso href="/esqueci-senha">Esqueci minha senha</LinkAcesso>
          <span aria-hidden="true" style={{ margin: '0 10px' }}>·</span>
          <LinkAcesso href="/politicas-privacidade">Política de Privacidade</LinkAcesso>
        </>
      )}
    >
      <form onSubmit={handleLogin} aria-busy={loading} noValidate>
        {!pedeOtp ? (
          <>
            <CampoAcesso
              id="login-codigo"
              rotulo="Código da unidade"
              icone={Hospital}
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex.: K7M3QX"
              required
              maxLength={14}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="organization"
              dica="Peça ao administrador do seu hospital."
              style={{ minHeight: '48px', padding: '12px 16px', borderRadius: '8px', fontSize: '16px', color: '#0f172a', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
            />
            <CampoAcesso
              id="login-email"
              rotulo="E-mail"
              icone={Mail}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@hospital.com"
              required
              autoComplete="username"
              inputMode="email"
            />
            <CampoAcesso
              id="login-senha"
              rotulo="Senha"
              icone={Lock}
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </>
        ) : (
          <CampoAcesso
            ref={otpRef}
            id="login-otp"
            rotulo="Código do celular"
            icone={KeyRound}
            value={otp}
            onChange={e => setOtp(e.target.value)}
            placeholder="000000"
            required
            maxLength={16}
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            dica="Sem o celular? Use um código de reserva."
            style={{ minHeight: '48px', padding: '12px 16px', borderRadius: '8px', fontSize: '20px', color: '#0f172a', letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}
          />
        )}

        {erro && <AvisoAcesso>{erro}</AvisoAcesso>}

        <BotaoAcesso carregando={loading} textoCarregando="Entrando..." icone={pedeOtp ? ShieldCheck : LogIn}>
          Entrar
        </BotaoAcesso>

        {pedeOtp && (
          <button
            type="button"
            onClick={voltar}
            className="w-full text-sm text-slate-300 underline underline-offset-2 hover:text-white"
            style={{ marginTop: '16px', minHeight: '44px' }}
          >
            Voltar
          </button>
        )}
      </form>
    </AuthShell>
  )
}
