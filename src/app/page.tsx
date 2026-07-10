'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface Hospital {
  id: string;
  nome: string;
}

export default function LoginPage() {
  const router = useRouter()
  const [hospitais, setHospitais] = useState <Hospital[]> ([])
  const [hospitalId, setHospitalId] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState (false)

  useEffect (() => {
    fetch ('/api/hospitais')
      .then (response => response.json())
      .then (data => setHospitais (data))
      .catch (() => setHospitais([]))
  }, [])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')

    if (!hospitalId || !email || !senha) {
      setErro ('Preencha todos os campos para continuar.')
      return
    }

    setLoading(true)
    const resultado = await signIn ('credentials', {
      email,
      senha,
      hospitalId,
      redirect: false
    })

    if (resultado?.error) {
      setErro (resultado.error)
      setLoading (false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="login-page">
      <div className="particles">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>

      <div className="login-container">
        <div className="login-logo">
          <Image
            src="/images/logo.png"
            alt="Saskia Saúde"
            width={350}
            height={120}
            style={{ width: 'auto', height: '120px', objectFit: 'contain' }}
            priority
            onError={
              (event) => { (event.target as HTMLImageElement).style.display = 'none'; }
            }
          />
          <p style={{ 
            color: '#1e3a8a', 
            fontSize: '11px', 
            marginTop: '0', 
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.5px'
          }}>
            Sistema Integrado de Gestão Hospitalar
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'none' }}>
              <i className="las la-hospital" style={{ fontSize: '16px', color: '#1e3a8a' }}></i>
              Unidade Hospitalar
            </label>
            <select
              value={hospitalId}
              onChange={(event) => setHospitalId (event.target.value)}
              required
            >
              <option value="">Selecione a unidade...</option>
              {hospitais.map ((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'none' }}>
              <i className="las la-envelope" style={{ fontSize: '16px', color: '#1e3a8a' }}></i>
              E-mail de Acesso
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail (event.target.value)}
              placeholder="exemplo@hospital.com"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'none' }}>
              <i className="las la-lock" style={{ fontSize: '16px', color: '#1e3a8a' }}></i>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha (event.target.value)}
              placeholder="Sua senha segura"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <><i className="las la-spinner la-spin"></i> Entrando...</>
            ) : (
              <><i className="las la-sign-in-alt"></i> Entrar no Sistema</>
            )}
          </button>
        </form>

        {erro && (
          <div className="erro-msg" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <i className="las la-exclamation-triangle" style={{ fontSize: '18px' }}></i>
            {erro}
          </div>
        )}

        <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
            <i className="las la-info-circle"></i> Primeiro acesso? Configure via Prisma.
          </div>
          
          <Link href="/admin/hospitais" style={{ color: '#1e3a8a', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
            <i className="las la-tools" style={{ fontSize: '16px' }}></i> Gerenciar Hospitais (Admin)
          </Link>
        </div>
      </div>
    </div>
  )
}