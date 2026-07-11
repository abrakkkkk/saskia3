'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Building2, Mail, Lock, LogIn, Loader2, AlertTriangle, Activity } from 'lucide-react'

interface Hospital {
  id: string;
  nome: string;
}

export default function LoginPage() {
  const router = useRouter()
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [hospitalId, setHospitalId] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/hospitais')
      .then(response => response.json())
      .then(data => setHospitais(data))
      .catch(() => setHospitais([]))
  }, [])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')

    if (!hospitalId || !email || !senha) {
      setErro('Preencha todos os campos para continuar.')
      return
    }

    setLoading(true)
    const resultado = await signIn('credentials', {
      email,
      senha,
      hospitalId,
      redirect: false
    })

    if (resultado?.error) {
      setErro(resultado.error)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Particles Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/20 relative z-10 animate-fade-in-up">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">Saskia Saúde</h1>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Sistema de Gestão Hospitalar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
              <Building2 className="w-4 h-4 text-blue-700" /> Unidade Hospitalar
            </label>
            <div className="relative">
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                required
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">Selecione a unidade...</option>
                {hospitais.map((h) => (
                  <option key={h.id} value={h.id}>{h.nome}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
              <Mail className="w-4 h-4 text-blue-700" /> E-mail de Acesso
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@hospital.com"
              required
              autoComplete="username"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
              <Lock className="w-4 h-4 text-blue-700" /> Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-800 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-blue-900 hover:to-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Entrando...</>
            ) : (
              <><LogIn className="w-5 h-5" /> Entrar no Sistema</>
            )}
          </button>
        </form>

        {erro && (
          <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5" />
            {erro}
          </div>
        )}
        
      </div>
      
      <div className="mt-8 text-white/50 text-xs font-medium tracking-wide">
        &copy; {new Date().getFullYear()} Saskia Saúde. Todos os direitos reservados.
      </div>
    </div>
  )
}