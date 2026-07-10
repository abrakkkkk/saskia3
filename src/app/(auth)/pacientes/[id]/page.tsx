'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { calcularIdade, MANCHESTER_CORES, STATUS_CORES } from '@/lib/utils'
import { Triagem, Evolucao, Prescricao } from '@prisma/client'

interface Paciente {
  id: string; nome: string; cpf: string; rg: string; nascimento: string; sexo: string
  telefone: string; email: string; endereco: string; convenio: string
  status: string; classificacao: string; leitoTipo: string; leitoNumero: number
  queixaPrincipal: string; alergias: string; tipoSanguineo: string
  mae: string; pai: string; profissao: string; estadoCivil: string
  triagens: Triagem[]; evolucoes: Evolucao[]; prescricoes: Prescricao[]
}

export default function FichaPacientePage() {
  const params = useParams()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dados')

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: '', cpf: '', rg: '', nascimento: '', sexo: '',
    telefone: '', email: '', endereco: '', convenio: '',
    mae: '', pai: '', profissao: '', estadoCivil: '',
    queixaPrincipal: '', alergias: '', tipoSanguineo: ''
  })

  const carregarPaciente = () => {
    fetch(`/api/pacientes/${params.id}`)
      .then(response => response.json())
      .then(data => { setPaciente(data); setLoading(false); })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    carregarPaciente()
  }, [params.id])

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch(`/api/pacientes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nascimento: formData.nascimento ? new Date(formData.nascimento).toISOString() : null
        })
      })
      if (res.ok) {
        setIsEditing(false)
        carregarPaciente()
      } else {
        alert('Erro ao atualizar paciente')
      }
    } catch {
      alert('Erro de conexão ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

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
          <div>
            {!isEditing ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => {
                    setFormData({
                      nome: paciente.nome || '',
                      cpf: paciente.cpf || '',
                      rg: paciente.rg || '',
                      nascimento: paciente.nascimento ? new Date(paciente.nascimento).toISOString().split('T')[0] : '',
                      sexo: paciente.sexo || '',
                      telefone: paciente.telefone || '',
                      email: paciente.email || '',
                      endereco: paciente.endereco || '',
                      convenio: paciente.convenio || '',
                      mae: paciente.mae || '',
                      pai: paciente.pai || '',
                      profissao: paciente.profissao || '',
                      estadoCivil: paciente.estadoCivil || '',
                      queixaPrincipal: paciente.queixaPrincipal || '',
                      alergias: paciente.alergias || '',
                      tipoSanguineo: paciente.tipoSanguineo || ''
                    });
                    setIsEditing(true);
                  }}>
                    <i className="las la-pen"></i> Editar Cadastro
                  </button>
                </div>
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
              </>
            ) : (
              <form onSubmit={salvarEdicao}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Nome Completo *</label>
                    <input required className="input-field" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>CPF</label>
                    <input className="input-field" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>RG</label>
                    <input className="input-field" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Data de Nascimento *</label>
                    <input required type="date" className="input-field" value={formData.nascimento} onChange={e => setFormData({...formData, nascimento: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Sexo</label>
                    <select className="input-field" value={formData.sexo} onChange={e => setFormData({...formData, sexo: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                      <option value="">Selecione...</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Telefone</label>
                    <input className="input-field" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>E-mail</label>
                    <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Endereço Completo</label>
                    <input className="input-field" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Nome da Mãe</label>
                    <input className="input-field" value={formData.mae} onChange={e => setFormData({...formData, mae: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Nome do Pai</label>
                    <input className="input-field" value={formData.pai} onChange={e => setFormData({...formData, pai: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Convênio</label>
                    <input className="input-field" value={formData.convenio} onChange={e => setFormData({...formData, convenio: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Profissão</label>
                    <input className="input-field" value={formData.profissao} onChange={e => setFormData({...formData, profissao: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Estado Civil</label>
                    <input className="input-field" value={formData.estadoCivil} onChange={e => setFormData({...formData, estadoCivil: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Tipo Sanguíneo</label>
                    <select className="input-field" value={formData.tipoSanguineo} onChange={e => setFormData({...formData, tipoSanguineo: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                      <option value="">Desconhecido</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Alergias</label>
                    <input className="input-field" value={formData.alergias} onChange={e => setFormData({...formData, alergias: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 5 }}>Queixa Principal</label>
                    <input className="input-field" value={formData.queixaPrincipal} onChange={e => setFormData({...formData, queixaPrincipal: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            )}
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
