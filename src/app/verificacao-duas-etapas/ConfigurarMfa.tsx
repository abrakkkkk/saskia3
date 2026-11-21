'use client'

import { useCallback, useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Copy, KeyRound, Lock, RefreshCw, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { AuthShell, AvisoAcesso, BotaoAcesso, CampoAcesso, LinkAcesso } from '@/components/auth/AuthShell'

type Situacao = { ativo: boolean; obrigatorio: boolean; codigosRestantes: number }
type Etapa = 'carregando' | 'inicio' | 'escanear' | 'codigos' | 'ativo' | 'falha'

async function chamar(corpo: Record<string, string>) {
  const r = await fetch('/api/conta/mfa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
  const dados = await r.json().catch(() => null)
  if (!r.ok) throw new Error(dados?.error ?? 'Não foi possível concluir. Tente de novo.')
  return dados
}

const botaoSecundario = 'w-full flex items-center justify-center gap-2 text-sm font-semibold text-white border border-white/25 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 transition-colors disabled:opacity-50'
const estiloSecundario = { minHeight: '44px', padding: '10px 16px', borderRadius: '8px', marginTop: '12px' }

export default function ConfigurarMfa({ obrigatorio }: { obrigatorio: boolean }) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [qr, setQr] = useState('')
  const [segredo, setSegredo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [codigos, setCodigos] = useState<string[]>([])
  const [anotou, setAnotou] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [desativando, setDesativando] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/conta/mfa', { cache: 'no-store' })
      if (r.status === 401) { router.replace('/'); return }
      if (!r.ok) throw new Error()
      const dados: Situacao = await r.json()
      setSituacao(dados)
      setEtapa(dados.ativo ? 'ativo' : 'inicio')
    } catch {
      setEtapa('falha')
    }
  }, [router])

  useEffect(() => { void Promise.resolve().then(carregar) }, [carregar])

  async function executar(acao: () => Promise<void>) {
    setErro('')
    setCarregando(true)
    try { await acao() } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível concluir.') } finally { setCarregando(false) }
  }

  const iniciar = () => executar(async () => {
    const dados = await chamar({ acao: 'iniciar' })
    setQr(dados.qr)
    setSegredo(dados.segredo)
    setCodigo('')
    setEtapa('escanear')
  })

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(codigo.replace(/\s/g, ''))) { setErro('Digite os 6 dígitos do app.'); return }
    void executar(async () => {
      const dados = await chamar({ acao: 'confirmar', codigo })
      setCodigos(dados.codigos)
      setAnotou(false)
      setCopiado(false)
      setEtapa('codigos')
    })
  }

  const renovar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim()) { setErro('Digite o código do app.'); return }
    void executar(async () => {
      const dados = await chamar({ acao: desativando ? 'desativar' : 'novos-codigos', codigo, senha })
      setCodigo('')
      setSenha('')
      if (desativando) { setDesativando(false); await carregar(); return }
      setCodigos(dados.codigos)
      setAnotou(false)
      setCopiado(false)
      setEtapa('codigos')
    })
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigos.join('\n'))
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  const sair = <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="underline underline-offset-2 hover:text-white">Sair</button>
  const rodape = obrigatorio && etapa !== 'codigos' ? sair : <><LinkAcesso href="/dashboard">Voltar ao sistema</LinkAcesso><span aria-hidden="true" style={{ margin: '0 10px' }}>·</span>{sair}</>

  if (etapa === 'carregando') {
    return <AuthShell titulo="Verificação em duas etapas"><p role="status" className="text-sm text-slate-300 text-center">Carregando...</p></AuthShell>
  }

  if (etapa === 'falha') {
    return (
      <AuthShell titulo="Verificação em duas etapas" rodape={sair}>
        <AvisoAcesso>Não foi possível carregar.</AvisoAcesso>
        <button type="button" className={botaoSecundario} style={estiloSecundario} onClick={() => { setEtapa('carregando'); void carregar() }}>
          <RefreshCw aria-hidden="true" className="w-4 h-4" /> Tentar de novo
        </button>
      </AuthShell>
    )
  }

  if (etapa === 'inicio') {
    return (
      <AuthShell
        titulo="Verificação em duas etapas"
        descricao={obrigatorio
          ? 'Administradores entram com a senha e um código do celular. Configure agora; leva 2 minutos.'
          : 'O login vai pedir a senha e um código do celular.'}
        rodape={rodape}
      >
        <ol className="text-sm text-slate-200 flex flex-col gap-3" style={{ margin: '0 0 24px', paddingLeft: '20px', listStyle: 'decimal', lineHeight: 1.5 }}>
          <li>No celular, instale o app Google Authenticator ou Microsoft Authenticator.</li>
          <li>Use o app para ler o QR Code.</li>
          <li>Digite o código e guarde os códigos de reserva.</li>
        </ol>
        {erro && <AvisoAcesso>{erro}</AvisoAcesso>}
        <form onSubmit={e => { e.preventDefault(); void iniciar() }}>
          <BotaoAcesso carregando={carregando} textoCarregando="Gerando..." icone={Smartphone}>Começar</BotaoAcesso>
        </form>
      </AuthShell>
    )
  }

  if (etapa === 'escanear') {
    return (
      <AuthShell titulo="Leia o QR Code" descricao="No app, toque em adicionar conta (+) e aponte a câmera para o código." rodape={rodape}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora (data URL) */}
        <img
          src={qr}
          alt="QR Code para cadastrar o Saskia no app autenticador"
          width={200}
          height={200}
          className="bg-white block"
          // margin inline: o reset global de margem vence o mx-auto do Tailwind.
          style={{ padding: '10px', borderRadius: '8px', margin: '0 auto 16px' }}
        />
        <details className="text-sm text-slate-300 text-center" style={{ marginBottom: '20px' }}>
          <summary className="cursor-pointer underline underline-offset-2 hover:text-white" style={{ minHeight: '32px' }}>Sem câmera? Digite a chave</summary>
          <p className="text-white break-all select-all" style={{ marginTop: '8px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em' }}>
            {segredo.match(/.{1,4}/g)?.join(' ')}
          </p>
        </details>
        <form onSubmit={confirmar} aria-busy={carregando} noValidate>
          <CampoAcesso
            id="mfa-codigo"
            rotulo="Código do app"
            icone={KeyRound}
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            required
            autoFocus
            style={{ minHeight: '48px', padding: '12px 16px', borderRadius: '8px', fontSize: '20px', color: '#0f172a', letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}
          />
          {erro && <AvisoAcesso>{erro}</AvisoAcesso>}
          <BotaoAcesso carregando={carregando} textoCarregando="Conferindo..." icone={ShieldCheck}>Ativar</BotaoAcesso>
        </form>
      </AuthShell>
    )
  }

  if (etapa === 'codigos') {
    return (
      <AuthShell
        titulo="Códigos de reserva"
        descricao="Use um destes se perder o celular. Cada um vale uma vez. Anote agora: eles não aparecem de novo."
        rodape={anotou ? rodape : sair}
      >
        <ul className="grid grid-cols-2 gap-2 text-white" style={{ margin: '0 0 16px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
          {codigos.map(c => (
            <li key={c} className="text-center select-all" style={{ padding: '8px 4px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', fontSize: '15px' }}>{c}</li>
          ))}
        </ul>
        <button type="button" className={botaoSecundario} style={{ ...estiloSecundario, marginTop: 0, marginBottom: '20px' }} onClick={() => void copiar()}>
          <Copy aria-hidden="true" className="w-4 h-4" /> {copiado ? 'Copiados' : 'Copiar códigos'}
        </button>
        <label className="flex items-start gap-3 text-sm text-slate-200 cursor-pointer" style={{ marginBottom: '20px', lineHeight: 1.5 }}>
          <input type="checkbox" checked={anotou} onChange={e => setAnotou(e.target.checked)} className="accent-blue-500" style={{ width: '20px', height: '20px', marginTop: '1px', flexShrink: 0 }} />
          Guardei os códigos
        </label>
        <form onSubmit={e => { e.preventDefault(); router.push('/dashboard'); router.refresh() }}>
          <BotaoAcesso disabled={!anotou} icone={ArrowRight}>Continuar</BotaoAcesso>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      titulo="Verificação ativa"
      descricao={`Códigos de reserva restantes: ${situacao?.codigosRestantes ?? 0}.`}
      rodape={rodape}
    >
      <form onSubmit={renovar} aria-busy={carregando} noValidate>
        {desativando && (
          <CampoAcesso id="mfa-senha" rotulo="Senha" icone={Lock} type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="current-password" required />
        )}
        <CampoAcesso
          id="mfa-atual"
          rotulo="Código do app"
          icone={KeyRound}
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          placeholder="000000"
          autoComplete="one-time-code"
          maxLength={16}
          required
          dica={desativando ? undefined : 'Para gerar novos códigos de reserva, digite o código do app. Os antigos deixam de valer.'}
        />
        {erro && <AvisoAcesso>{erro}</AvisoAcesso>}
        {desativando ? (
          <BotaoAcesso carregando={carregando} textoCarregando="Desativando..." icone={ShieldOff}>Desativar</BotaoAcesso>
        ) : (
          <BotaoAcesso carregando={carregando} textoCarregando="Gerando..." icone={RefreshCw}>Novos códigos de reserva</BotaoAcesso>
        )}
      </form>
      {!situacao?.obrigatorio && (
        <button type="button" className={botaoSecundario} style={estiloSecundario} onClick={() => { setDesativando(d => !d); setErro('') }}>
          {desativando ? 'Cancelar' : <><ShieldOff aria-hidden="true" className="w-4 h-4" /> Desativar</>}
        </button>
      )}
    </AuthShell>
  )
}
