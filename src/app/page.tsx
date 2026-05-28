'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

interface Hospital {
  id: string;
  nome: string;
}

export default function LoginPage() {
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
      setErro ('⚠️ Preencha todos os campos!')
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
      setErro ('❌ ' + resultado.error)
      setLoading (false)
    } else {
      window.location.href = '/dashboard'
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
            width={80}
            height={80}
            priority
            onError={
              (event) => { (event.target as HTMLImageElement).style.display = 'none'; }
            }
          />
          <h1>Saskia Saúde</h1>
          <p>Sistema Integrado de Gestão Hospitalar</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>🏥 Selecione o Hospital</label>
            <select
              value={hospitalId}
              onChange={(event) => setHospitalId (event.target.value)}
              required
            >
              <option value="">Selecione o hospital...</option>
              {hospitais.map ((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>👤 Usuário (E-mail)</label>
            <input
              type="text"
              value={email}
              onChange={(event) => setEmail (event.target.value)}
              placeholder="Digite seu e-mail de acesso"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>🔒 Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha (event.target.value)}
              placeholder="Digite sua senha"
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

        {erro && <div className="erro-msg">{erro}</div>}

        <div className="info-msg">
          <i className="las la-info-circle"></i>{' '}
          <strong>Primeiro acesso:</strong> Configure o banco de dados e crie o primeiro hospital e usuário via Prisma.
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          <Link href="/admin/hospitais" style={{ color: '#1e3a8a', fontWeight: 600 }}>
            🏥 Gerenciar Hospitais (Admin)
          </Link>
        </div>
      </div>
    </div>
  )
}