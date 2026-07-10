'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { calcularIdade, MANCHESTER_CORES, STATUS_CORES } from '@/lib/utils'
import { Triagem, Evolucao, Prescricao } from '@prisma/client'

interface Paciente {
  id: string; nome: string; cpf: string; nascimento: string; sexo: string
  telefone: string; email: string; endereco: string; convenio: string
  status: string; classificacao: string; leitoTipo: string; leitoNumero: number
  queixaPrincipal: string; alergias: string; tipoSanguineo: string
  mae: string; pai: string; profissao: string; estadoCivil: string
  triagens: Triagem[]; evolucoes: Evolucao[]; prescricoes: Prescricao[]
}

export default function FichaPacientePage() {
  const params = useParams()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState (true)
  const [tab, setTab] = useState ('dados')

  useEffect (() => {
    fetch (`/api/pacientes/${params.id}`)
      .then (response => response.json())
      .then (data => { setPaciente(data); setLoading(false); })
      .catch (() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="module-placeholder"><i className="las la-spinner la-spin" style={{ fontSize: 40 }}></i><h2>Carregando...</h2></div>
  if (!paciente) return <div className="module-placeholder"><i className="las la-exclamation-triangle"></i><h2>Paciente não encontrado</h2></div>

  const idade = calcularIdade (paciente.nascimento)
  const statusCor = STATUS_CORES [paciente.status] || { bg: '#f1f5f9', text: '#475569' }
  const manch = paciente.classificacao ? MANCHESTER_CORES [paciente.classificacao] : null

  const tabs = [
    { id: 'dados', label: 'Dados Pessoais', icon: 'las la-user' },
    { id: 'triagem', label: 'Triagem', icon: 'las la-stethoscope' },
    { id: 'evolucao', label: 'Evolução', icon: 'las la-notes-medical' },
    { id: 'prescricao', label: 'Prescrições', icon: 'las la-pills' }
  ]

  return (
    <div>
      <div className="page-header">
        <h2><i className="las la-file-medical-alt"></i> Ficha do Paciente</h2>
        <Link href="/pacientes" className="btn btn-primary btn-sm"><i className="las la-arrow-left"></i> Voltar</Link>
      </div>

      <div className="perfil-profissional" style={{ marginBottom: 20 }}>
        <div className="perfil-info">
          <div className="perfil-avatar"><i className="las la-user"></i></div>
          <div className="perfil-dados">
            <h3>{paciente.nome}</h3>
            <p>CPF: {paciente.cpf || 'N/I'} | Idade: {idade} anos | Sexo: {paciente.sexo || 'N/I'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {manch && (
            <span className="manchester-badge" style={{ background: manch.bg, color: manch.text, border: `1px solid ${manch.border}` }}>
              {manch.emoji} {paciente.classificacao}
            </span>
          )}

          <span className="status-badge" style={{ background: statusCor.bg, color: statusCor.text, fontSize: 13 }}>
            {paciente.status}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : ''}`}
            style={tab !== t.id ? { background: 'white', color: '#334155', border: '2px solid #e2e8f0' } : {}}
            onClick={() => setTab(t.id)}>
            <i className={t.icon}></i> {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 30 }}>
        {tab === 'dados' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {[
              ['Nome', paciente.nome], ['CPF', paciente.cpf], ['Nascimento', paciente.nascimento ? new Date (paciente.nascimento).toLocaleDateString ('pt-BR') : '-'],
              ['Sexo', paciente.sexo], ['Telefone', paciente.telefone], ['Email', paciente.email],
              ['Endereço', paciente.endereco], ['Convênio', paciente.convenio], ['Tipo Sanguíneo', paciente.tipoSanguineo],
              ['Alergias', paciente.alergias], ['Mãe', paciente.mae], ['Pai', paciente.pai],
              ['Profissão', paciente.profissao], ['Estado Civil', paciente.estadoCivil], ['Queixa Principal', paciente.queixaPrincipal]
            ].map (([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, color: '#0a1f44', fontWeight: 500 }}>{value || '-'}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'triagem' && (
          <div>
            {paciente.triagens?.length > 0 ? paciente.triagens.map((t: Triagem, i: number) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <strong style={{ color: '#0a1f44' }}>Triagem #{i + 1}</strong>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, fontSize: 13 }}>
                  <div><strong>Classificação:</strong> {t.classificacao}</div>
                  <div><strong>PA:</strong> {t.pressao || '-'}</div>
                  <div><strong>Temp:</strong> {t.temperatura || '-'}</div>
                  <div><strong>FC:</strong> {t.frequenciaC || '-'}</div>
                  <div><strong>FR:</strong> {t.frequenciaR || '-'}</div>
                  <div><strong>SpO2:</strong> {t.saturacao || '-'}</div>
                  <div><strong>Glicemia:</strong> {t.glicemia || '-'}</div>
                  <div><strong>Dor:</strong> {t.dor ?? '-'}/10</div>
                </div>
                {t.queixa && <p style={{ marginTop: 10, color: '#475569' }}><strong>Queixa:</strong> {t.queixa}</p>}
              </div>
            )) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Nenhuma triagem registrada</p>}
          </div>
        )}

        {tab === 'evolucao' && (
          <div>
            {paciente.evolucoes?.length > 0 ? paciente.evolucoes.map((e: Evolucao, i: number) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: '#0a1f44' }}>{e.tipo === 'medica' ? '🩺 Evolução Médica' : '💉 Evolução de Enfermagem'}</strong>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(e.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p style={{ color: '#475569', fontSize: 14 }}>{e.descricao}</p>
                {e.profissional && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Por: {e.profissional}</p>}
              </div>
            )) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Nenhuma evolução registrada</p>}
          </div>
        )}

        {tab === 'prescricao' && (
          <div>
            {paciente.prescricoes?.length > 0 ? paciente.prescricoes.map((p: Prescricao, i: number) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 15, display: 'flex', gap: 15, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="las la-pills" style={{ fontSize: 20, color: '#1e3a8a' }}></i>
                </div>
                <div>
                  <strong style={{ color: '#0a1f44' }}>{p.medicamento}</strong>
                  <p style={{ fontSize: 13, color: '#64748b' }}>
                    {p.dose && `Dose: ${p.dose}`} {p.via && `| Via: ${p.via}`} {p.frequencia && `| ${p.frequencia}`}
                  </p>
                </div>
              </div>
            )) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Nenhuma prescrição registrada</p>}
          </div>
        )}
      </div>
    </div>
  );
}
