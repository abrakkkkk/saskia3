'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Hospital, Mail, Lock, LogIn, AlertTriangle } from 'lucide-react'
import { inter } from '@/app/fonts'

interface HospitalData {
  id: string;
  nome: string;
}

export default function LoginPage() {
  const router = useRouter()
  const [hospitais, setHospitais] = useState<HospitalData[]>([])
  const [carregandoHospitais, setCarregandoHospitais] = useState(true)
  const [erroHospitais, setErroHospitais] = useState('')
  const [hospitalId, setHospitalId] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/hospitais', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Não foi possível carregar as unidades hospitalares.')
        const data: unknown = await response.json()
        if (!Array.isArray(data) || data.some(item => !item || typeof item.id !== 'string' || typeof item.nome !== 'string')) {
          throw new Error('A lista de unidades recebida é inválida.')
        }
        return data as HospitalData[]
      })
      .then(data => {
        setHospitais(data)
        setErroHospitais(data.length ? '' : 'Nenhuma unidade hospitalar está disponível para acesso.')
      })
      .catch(error => {
        if (error instanceof Error && error.name === 'AbortError') return
        setErroHospitais(error instanceof Error ? error.message : 'Não foi possível carregar as unidades hospitalares.')
        setHospitais([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoHospitais(false)
      })
    return () => controller.abort()
  }, [])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')

    if (!hospitalId || !email || !senha) {
      setErro('Preencha todos os campos para continuar.')
      return
    }

    if (!hospitais.some(hospital => hospital.id === hospitalId)) {
      setErro('Selecione uma unidade hospitalar válida.')
      return
    }

    setLoading(true)
    try {
      const resultado = await signIn('credentials', {
        email,
        senha,
        hospitalId,
        redirect: false
      })

      if (resultado?.error || !resultado?.ok) {
        setErro('Não foi possível autenticar. Confira a unidade, o e-mail e a senha.')
        setLoading(false)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setErro('Não foi possível conectar ao serviço de autenticação. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen w-full flex flex-col lg:flex-row-reverse selection:bg-blue-500/30 ${inter.className}`}>
      
      {/* Lado Direito (Agora) - Formulário de Login */}
      <div className="w-full lg:w-[45%] bg-[#0a1f44] flex flex-col items-center justify-center p-6 lg:p-12 relative z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Container / Delimitador Visual (Mantido o mesmo design) */}
        <div 
          className="w-full max-w-sm relative z-10" 
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            padding: '36px 32px', 
            borderRadius: '8px', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          
          {/* Logo Area (Removida temporariamente para visualização) */}

          {/* Form Area */}
          <form onSubmit={handleLogin} aria-busy={loading || carregandoHospitais}>
            
            <div className="flex flex-col" style={{ marginBottom: '20px' }}>
              <label htmlFor="hospitalId" className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-white ml-1" style={{ marginBottom: '10px' }}>
                <Hospital className="w-3.5 h-3.5 text-blue-400" /> Unidade Hospitalar
              </label>
              <div className="relative">
                <select
                  id="hospitalId"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  required
                  disabled={carregandoHospitais || hospitais.length === 0}
                  className="w-full bg-white border-2 border-transparent focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-lg appearance-none"
                  style={{ minHeight: '48px', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', color: '#0f172a' }}
                >
                  <option value="" style={{ color: '#64748b' }}>{carregandoHospitais ? 'Carregando unidades...' : 'Selecione a unidade operacional...'}</option>
                  {hospitais.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <div className="w-2.5 h-2.5 border-b-2 border-r-2 transform rotate-45 translate-y-[-2px]" style={{ borderColor: '#94a3b8' }}></div>
                </div>
              </div>
            </div>

            {erroHospitais && <p role="alert" className="text-sm text-red-200" style={{ marginBottom: '20px' }}>{erroHospitais}</p>}

            <div className="flex flex-col" style={{ marginBottom: '20px' }}>
              <label htmlFor="login-email" className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-white ml-1" style={{ marginBottom: '10px' }}>
                <Mail className="w-3.5 h-3.5 text-blue-400" /> E-mail Institucional
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@hospital.com"
                required
                autoComplete="username"
                className="w-full bg-white border-2 border-transparent focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-lg placeholder:text-slate-400"
                style={{ minHeight: '48px', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', color: '#0f172a' }}
              />
            </div>

            <div className="flex flex-col" style={{ marginBottom: '24px' }}>
              <label htmlFor="login-senha" className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-white ml-1" style={{ marginBottom: '10px' }}>
                <Lock className="w-3.5 h-3.5 text-blue-400" /> Senha de Acesso
              </label>
              <input
                id="login-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-white border-2 border-transparent focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-lg placeholder:text-slate-400 tracking-widest"
                style={{ minHeight: '48px', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', color: '#0f172a' }}
              />
            </div>

            {erro && (
              <div role="alert" className="flex items-center gap-3 text-red-200 bg-red-500/20 border border-red-500/50 p-3.5 rounded-md text-sm font-medium" style={{ marginBottom: '20px' }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{erro}</p>
              </div>
            )}

            <div>
              <button 
                type="submit" 
                disabled={loading || carregandoHospitais || hospitais.length === 0}
                className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '50px', padding: '12px 16px', borderRadius: '8px', fontSize: '16px', border: '1px solid rgba(255, 255, 255, 0.15)' }}
              >
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Autenticando...</>
                ) : (
                  <><LogIn className="w-5 h-5" /> Acessar Sistema</>
                )}
              </button>
            </div>
          </form>

        </div>

      </div>

      {/* Lado Direito - Painel Decorativo (Abstract Branding) */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-[#020817] overflow-hidden items-center justify-center">
        
        {/* Grade de fundo (Grid) */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.03]" 
          style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        ></div>
        
        {/* Brilhos (Gradients) decorativos */}
        <div className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[150px] opacity-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-blue-400 rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>

        {/* Logo d'água no centro */}
        <div className="relative z-10 flex flex-col items-center opacity-60 select-none pointer-events-none">
          <Image
            src="/images/logo.png"
            alt="Saskia Saúde Marca D'água"
            width={500}
            height={200}
            className="brightness-0 invert object-contain"
            priority
          />
        </div>
        
      </div>

    </div>
  )
}
