import Image from 'next/image'
import Link from 'next/link'
import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react'
import { inter } from '@/app/fonts'

/**
 * Moldura das telas de acesso (login, senha, verificação em duas etapas):
 * painel azul-marinho com o cartão do formulário e, no desktop, o painel da marca.
 */
export function AuthShell({ titulo, descricao, children, rodape }: {
  titulo: string
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <div className={`min-h-screen w-full flex flex-col lg:flex-row-reverse selection:bg-blue-500/30 ${inter.className}`}>
      <div className="min-h-screen w-full lg:w-[45%] bg-[#0a1f44] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div
          className="w-full max-w-sm relative z-10"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: 'clamp(24px, 5vw, 36px) clamp(20px, 4vw, 32px)',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="flex flex-col items-center text-center" style={{ marginBottom: '28px' }}>
            <Image
              src="/images/logo.png"
              alt="Saskia Saúde"
              width={180}
              height={72}
              className="h-14 w-auto object-contain brightness-0 invert"
              style={{ marginBottom: '20px' }}
              priority
            />
            <h1 className="text-xl font-semibold tracking-tight text-white text-balance" style={{ margin: 0 }}>{titulo}</h1>
            {descricao && <p className="text-sm text-slate-300 text-pretty" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>{descricao}</p>}
          </div>

          {children}

          <p className="text-center text-sm text-slate-300" style={{ margin: '24px 0 0' }}>
            {rodape ?? <Link href="/politicas-privacidade" className="underline underline-offset-2 hover:text-white">Política de Privacidade</Link>}
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[55%] relative bg-[#020817] overflow-hidden items-center justify-center">
        <div aria-hidden="true" className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[150px] opacity-10"></div>
        <div aria-hidden="true" className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-blue-400 rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>
        <div className="relative z-10 flex flex-col items-center opacity-60 select-none pointer-events-none">
          <Image src="/images/logo.png" alt="" aria-hidden="true" width={500} height={200} className="brightness-0 invert object-contain" priority />
        </div>
      </div>
    </div>
  )
}

const ESTILO_CAMPO = { minHeight: '48px', padding: '12px 16px', borderRadius: '8px', fontSize: '16px', color: '#0f172a' }

export function CampoAcesso({ id, rotulo, icone: Icone, dica, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>
  id: string
  rotulo: string
  icone: LucideIcon
  dica?: string
}) {
  return (
    <div className="flex flex-col" style={{ marginBottom: '20px' }}>
      <label htmlFor={id} className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-white ml-1" style={{ marginBottom: '10px' }}>
        <Icone aria-hidden="true" className="w-3.5 h-3.5 text-blue-300" /> {rotulo}
      </label>
      <input
        id={id}
        aria-describedby={dica ? `${id}-dica` : undefined}
        className="w-full bg-white border-2 border-transparent caret-blue-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-lg placeholder:text-slate-500 disabled:opacity-60"
        style={ESTILO_CAMPO}
        {...props}
      />
      {dica && <p id={`${id}-dica`} className="text-xs text-slate-300 ml-1" style={{ margin: '8px 0 0' }}>{dica}</p>}
    </div>
  )
}

export function AvisoAcesso({ tipo = 'erro', children }: { tipo?: 'erro' | 'sucesso'; children: ReactNode }) {
  const erro = tipo === 'erro'
  const Icone = erro ? AlertTriangle : CheckCircle2
  return (
    <div
      role={erro ? 'alert' : 'status'}
      className={`flex items-start gap-3 p-3.5 rounded-md text-sm font-medium border ${erro ? 'text-red-100 bg-red-500/20 border-red-400/60' : 'text-emerald-100 bg-emerald-500/15 border-emerald-400/50'}`}
      style={{ marginBottom: '20px' }}
    >
      <Icone aria-hidden="true" className="w-4 h-4 shrink-0" style={{ marginTop: '2px' }} />
      <p className="text-pretty">{children}</p>
    </div>
  )
}

export function BotaoAcesso({ carregando, textoCarregando, icone: Icone, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  carregando?: boolean
  textoCarregando?: string
  icone?: LucideIcon
}) {
  return (
    <button
      type="submit"
      className="w-full bg-[#1e3a8a] hover:bg-[#2563eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ minHeight: '50px', padding: '12px 16px', borderRadius: '8px', fontSize: '16px', border: '1px solid rgba(255, 255, 255, 0.15)' }}
      {...props}
      disabled={carregando || props.disabled}
    >
      {carregando ? (
        <><span aria-hidden="true" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none"></span> {textoCarregando ?? 'Aguarde...'}</>
      ) : (
        <>{Icone && <Icone aria-hidden="true" className="w-5 h-5" />} {children}</>
      )}
    </button>
  )
}

export function LinkAcesso({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="underline underline-offset-2 hover:text-white">{children}</Link>
}
