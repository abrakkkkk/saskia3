'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { calcularIdade, MANCHESTER_CORES, STATUS_CORES } from '@/lib/utils'
import { AlertCircle, AlertTriangle, Frown, Meh, Pill, Smile } from 'lucide-react'

export default function FichaPacientePage() {
  const params = useParams()
  const { data: session } = useSession()
  const [paciente, setPaciente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dados')
  const [pepSubTab, setPepSubTab] = useState('soap')

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})

  // Triagem
  const [triagem, setTriagem] = useState({
    classificacao: '', fluxograma: '',
    pressao: '', frequenciaC: '', frequenciaR: '', temperatura: '', saturacao: '', glicemia: '', avpu: 'A',
    queixa: '', observacoes: ''
  })
  const [mews, setMews] = useState(0)
  const [mewsInfo, setMewsInfo] = useState({ label: 'Risco Baixo - Observação', class: 'baixo', bg: '#dcfce7', text: '#16a34a' })

  // Escores
  const [glasgow, setGlasgow] = useState({ ocular: 4, verbal: 5, motor: 6 })
  const [dor, setDor] = useState<number | null>(null)
  const [braden, setBraden] = useState({ sensorial: 4, umidade: 4, atividade: 4, mobilidade: 4, nutricao: 4, friccao: 3 })

  // PEP
  const [novaEvolucao, setNovaEvolucao] = useState({ s: '', o: '', a: '', p: '' })
  const [novoMed, setNovoMed] = useState({ medicamento: '', dose: '', via: '', frequencia: '' })
  const [novoExame, setNovoExame] = useState({ nome: '', resultado: '' })
  const [sinaisVitais, setSinaisVitais] = useState<any[]>([])
  const [novoSinal, setNovoSinal] = useState({ pressao: '', fc: '', fr: '', temp: '', satO2: '', glicemia: '' })

  // Demais avaliações carregadas do prontuário persistido
  const [nutricao, setNutricao] = useState({ peso: '', altura: '', dieta: 'Via Oral', restricoes: '' })
  const [medico, setMedico] = useState({ responsavel: '', crm: '', especialidade: '', diagnostico: '', conduta: '' })
  const [enfermagem, setEnfermagem] = useState({ responsavel: '', coren: '', evolucao: '', prescricao: '' })
  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [novoTimeline, setNovoTimeline] = useState({ tipo: 'Anotação Geral', descricao: '' })

  const carregarPaciente = () => {
    fetch(`/api/pacientes/${params.id}`)
      .then(response => response.json())
      .then(data => {
        setPaciente(data);
        setFormData({
          nome: data.nome || '', cpf: data.cpf || '', rg: data.rg || '',
          nascimento: data.nascimento ? new Date(data.nascimento).toISOString().split('T')[0] : '',
          sexo: data.sexo || '', telefone: data.telefone || '', email: data.email || '',
          endereco: data.endereco || '', convenio: data.convenio || '',
          mae: data.mae || '', pai: data.pai || '', profissao: data.profissao || '',
          estadoCivil: data.estadoCivil || '', queixaPrincipal: data.queixaPrincipal || '',
          alergias: data.alergias || '', tipoSanguineo: data.tipoSanguineo || ''
        });
        
        if (data.sinaisVitais) setSinaisVitais(data.sinaisVitais);
        if (data.timelineEvents) setTimelineEvents(data.timelineEvents);
        if (data.avaliacoesNutri && data.avaliacoesNutri.length > 0) setNutricao(data.avaliacoesNutri[0]);
        if (data.avaliacoesMedicas && data.avaliacoesMedicas.length > 0) setMedico(data.avaliacoesMedicas[0]);
        if (data.anotacoesEnf && data.anotacoesEnf.length > 0) setEnfermagem(data.anotacoesEnf[0]);
        if (data.escoresClinicos && data.escoresClinicos.length > 0) {
          const e = data.escoresClinicos[0];
          if (e.glasgow) setGlasgow(e.glasgow);
          if (e.dor !== null && e.dor !== undefined) setDor(e.dor);
          if (e.braden) setBraden(e.braden);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    carregarPaciente()
  }, [params.id])

  // =================== HANDLERS ===================
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
      } else alert('Erro ao atualizar paciente')
    } catch { alert('Erro de conexão ao salvar') }
    finally { setIsSaving(false) }
  }

  const mudarStatus = async (novoStatus: string) => {
    if (!novoStatus) return;
    try {
      const res = await fetch(`/api/pacientes/${params.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      })
      if (res.ok) carregarPaciente()
    } catch { }
  }

  // MEWS Calculation
  useEffect(() => {
    let score = 0
    const fr = parseInt(triagem.frequenciaR)
    if (!isNaN(fr)) {
      if (fr < 9) score += 2
      else if (fr >= 15 && fr <= 20) score += 1
      else if (fr >= 21 && fr <= 29) score += 2
      else if (fr >= 30) score += 3
    }
    const fc = parseInt(triagem.frequenciaC)
    if (!isNaN(fc)) {
      if (fc < 40) score += 2
      else if (fc >= 41 && fc <= 50) score += 1
      else if (fc >= 101 && fc <= 110) score += 1
      else if (fc >= 111 && fc <= 129) score += 2
      else if (fc >= 130) score += 3
    }
    const pa = parseInt(triagem.pressao.split('/')[0])
    if (!isNaN(pa)) {
      if (pa < 70) score += 3
      else if (pa >= 71 && pa <= 80) score += 2
      else if (pa >= 81 && pa <= 100) score += 1
      else if (pa >= 200) score += 2
    }
    const temp = parseFloat(triagem.temperatura)
    if (!isNaN(temp)) {
      if (temp < 35) score += 2
      else if (temp >= 38.5 && temp <= 38.9) score += 1
      else if (temp >= 39) score += 2
    }
    if (triagem.avpu === 'V') score += 1
    else if (triagem.avpu === 'P') score += 2
    else if (triagem.avpu === 'U') score += 3

    setMews(score)
    if (score <= 2) setMewsInfo({ label: 'Risco Baixo - Observação', class: 'baixo', bg: '#dcfce7', text: '#16a34a' })
    else if (score <= 4) setMewsInfo({ label: 'Risco Médio - Avaliação Médica', class: 'medio', bg: '#fefce8', text: '#d97706' })
    else setMewsInfo({ label: 'Risco Alto - Emergência', class: 'alto', bg: '#fef2f2', text: '#dc2626' })
  }, [triagem])

  const registrarTriagem = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/pacientes/${params.id}/triagens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triagem)
      })
      if (res.ok) {
        setTriagem({ classificacao: '', fluxograma: '', pressao: '', frequenciaC: '', frequenciaR: '', temperatura: '', saturacao: '', glicemia: '', avpu: 'A', queixa: '', observacoes: '' })
        registrarTimeline('Triagem', 'Nova triagem registrada')
        carregarPaciente()
      } else alert('Erro ao salvar triagem')
    } catch { } finally { setIsSaving(false) }
  }

  const salvarEscores = async () => {
    try {
      const res = await fetch(`/api/pacientes/${params.id}/escores`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glasgow, dor, braden })
      })
      if (res.ok) {
        registrarTimeline('Escores', 'Escores clínicos atualizados')
        alert('Escores salvos!')
      }
    } catch { alert('Erro ao salvar escores') }
  }

  const salvarNutricao = async () => {
    try {
      const res = await fetch(`/api/pacientes/${params.id}/nutricao`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutricao)
      })
      if (res.ok) {
        registrarTimeline('Nutrição', 'Avaliação nutricional salva')
        alert('Avaliação nutricional salva!')
      }
    } catch { alert('Erro ao salvar nutricao') }
  }

  const salvarMedico = async () => {
    try {
      const res = await fetch(`/api/pacientes/${params.id}/medico`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medico)
      })
      if (res.ok) {
        registrarTimeline('Médico', 'Avaliação médica atualizada')
        alert('Avaliação médica salva!')
      }
    } catch { alert('Erro ao salvar médico') }
  }

  const salvarEnfermagem = async () => {
    try {
      const res = await fetch(`/api/pacientes/${params.id}/enfermagem`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enfermagem)
      })
      if (res.ok) {
        registrarTimeline('Enfermagem', 'Anotação de enfermagem atualizada')
        alert('Anotação de enfermagem salva!')
      }
    } catch { alert('Erro ao salvar enfermagem') }
  }

  const registrarTimeline = async (tipo: string, desc: string) => {
    try {
      const res = await fetch(`/api/pacientes/${params.id}/timeline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descricao: desc })
      })
      if (res.ok) {
        carregarPaciente()
      }
    } catch { }
  }

  const addTimelinePost = () => {
    if (!novoTimeline.descricao) return
    registrarTimeline(novoTimeline.tipo, novoTimeline.descricao)
    setNovoTimeline({ ...novoTimeline, descricao: '' })
  }

  const registrarSinalVital = async () => {
    try {
      const res = await fetch(`/api/pacientes/${params.id}/sinais`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoSinal)
      })
      if (res.ok) {
        registrarTimeline('Sinais Vitais', `PA: ${novoSinal.pressao || '-'} | FC: ${novoSinal.fc || '-'}`)
        setNovoSinal({ pressao: '', fc: '', fr: '', temp: '', satO2: '', glicemia: '' })
      }
    } catch { alert('Erro ao registrar sinal vital') }
  }

  const registrarEvolucao = async () => {
    if (!novaEvolucao.s && !novaEvolucao.o && !novaEvolucao.a && !novaEvolucao.p) return
    setIsSaving(true)
    const desc = `S: ${novaEvolucao.s}\nO: ${novaEvolucao.o}\nA: ${novaEvolucao.a}\nP: ${novaEvolucao.p}`
    try {
      const res = await fetch(`/api/pacientes/${params.id}/evolucoes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: desc })
      })
      if (res.ok) {
        setNovaEvolucao({ s: '', o: '', a: '', p: '' })
        registrarTimeline('Evolução', 'Evolução SOAP registrada')
        carregarPaciente()
      }
    } catch { } finally { setIsSaving(false) }
  }

  const registrarPrescricao = async () => {
    if (!novoMed.medicamento) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/pacientes/${params.id}/prescricoes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoMed)
      })
      if (res.ok) {
        setNovoMed({ medicamento: '', dose: '', via: '', frequencia: '' })
        registrarTimeline('Prescrição', `Adicionado: ${novoMed.medicamento}`)
        carregarPaciente()
      }
    } catch { } finally { setIsSaving(false) }
  }

  const solicitarExame = async () => {
    if (!novoExame.nome) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/pacientes/${params.id}/exames`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoExame)
      })
      if (res.ok) {
        setNovoExame({ nome: '', resultado: '' })
        registrarTimeline('Exame', `Solicitado: ${novoExame.nome}`)
        carregarPaciente()
      }
    } catch { } finally { setIsSaving(false) }
  }

  if (loading) return <div className="module-placeholder"><i className="las la-spinner la-spin" style={{ fontSize: 40 }}></i><h2>Carregando...</h2></div>
  if (!paciente) return <div className="module-placeholder"><i className="las la-exclamation-triangle"></i><h2>Paciente não encontrado</h2></div>

  const idade = calcularIdade(paciente.nascimento)
  const statusCor = STATUS_CORES[paciente.status] || { bg: '#f1f5f9', text: '#475569' }
  const manch = paciente.classificacao ? MANCHESTER_CORES[paciente.classificacao] : null
  const totalGlasgow = glasgow.ocular + glasgow.verbal + glasgow.motor
  const totalBraden = braden.sensorial + braden.umidade + braden.atividade + braden.mobilidade + braden.nutricao + braden.friccao

  let imc = 0; let imcClass = ''
  if (nutricao.peso && nutricao.altura) {
    imc = parseFloat(nutricao.peso) / (parseFloat(nutricao.altura) * parseFloat(nutricao.altura));
    if (imc < 18.5) imcClass = 'Abaixo do peso';
    else if (imc < 25) imcClass = 'Eutrofia';
    else if (imc < 30) imcClass = 'Sobrepeso';
    else imcClass = 'Obesidade';
  }

  return (
    <div>
      {/* ALERTA ALERGIA */}
      {paciente.alergias && paciente.alergias.trim() !== '' && (
        <div style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, fontSize: '16px', animation: 'pulsarAlergia 2s infinite', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>
          <i className="las la-exclamation-triangle" style={{ fontSize: 28 }}></i>
          <span><AlertTriangle size={16} aria-hidden="true" /> Paciente alérgico a: <strong>{paciente.alergias}</strong></span>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h2><i className="las la-file-medical-alt"></i> Prontuário Eletrônico do Paciente (PEP)</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}><i className="las la-print"></i> Imprimir</button>
          <Link href="/pacientes" className="btn btn-primary btn-sm"><i className="las la-arrow-left"></i> Voltar</Link>
        </div>
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
            <span className="manchester-badge" style={{ background: manch.bg, color: manch.text, border: `1px solid ${manch.border}`, padding: '8px 12px', borderRadius: '8px', fontWeight: 700 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: manch.text, display: 'inline-block' }}></span> {paciente.classificacao}
            </span>
          )}
          <i className={`las ${paciente.status === 'Aguardando Triagem' ? 'la-hourglass-half' : 'la-clipboard-check'}`} aria-hidden="true"></i>
          <select aria-label="Status do atendimento" value={paciente.status} onChange={e => mudarStatus(e.target.value)} style={{ background: statusCor.bg, color: statusCor.text, fontSize: 13, padding: '8px 12px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer', outline: 'none' }}>
            <option value="Recepção">Recepção</option>
            <option value="Aguardando Triagem">Aguardando Triagem</option>
            <option value="Em Triagem">Em Triagem</option>
            <option value="Aguardando Médico">Aguardando Médico</option>
            <option value="Em Atendimento Médico">Em Atendimento</option>
            <option value="Retorno">Retorno</option>
            <option value="Internado">Internado</option>
            <option value="Alta Médica">Alta Médica</option>
            <option value="Transferido">Transferido</option>
            <option value="Evasão">Evasão</option>
          </select>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        {[
          { id: 'dados', label: 'Dados Pessoais', icon: 'las la-user' },
          { id: 'triagem', label: 'Triagem', icon: 'las la-stethoscope' },
          { id: 'escores', label: 'Escores', icon: 'las la-calculator' },
          { id: 'pep', label: 'PEP', icon: 'las la-laptop-medical' },
          { id: 'nutricao', label: 'Nutrição', icon: 'las la-apple-alt' },
          { id: 'medico', label: 'Médico', icon: 'las la-user-md' },
          { id: 'enfermagem', label: 'Enfermagem', icon: 'las la-user-nurse' },
          { id: 'documentos', label: 'Documentos', icon: 'las la-file-alt' },
          { id: 'timeline', label: 'Timeline', icon: 'las la-stream' }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            background: tab === t.id ? '#1e3a8a' : 'transparent', color: tab === t.id ? 'white' : '#64748b', transition: 'all 0.2s'
          }}><i className={t.icon} style={{ fontSize: '16px', marginRight: '6px' }}></i> {t.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 30 }}>
        {/* ===================== DADOS PESSOAIS ===================== */}
        {tab === 'dados' && (
          <div>
            {!isEditing ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                    <i className="las la-pen"></i> Editar Cadastro
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                  {[
                    ['Nome', paciente.nome], ['CPF', paciente.cpf], ['Nascimento', paciente.nascimento ? new Date(paciente.nascimento).toLocaleDateString('pt-BR') : '-'],
                    ['Sexo', paciente.sexo], ['Telefone', paciente.telefone], ['Email', paciente.email],
                    ['Endereço Completo', paciente.endereco], ['Convênio', paciente.convenio], ['Tipo Sanguíneo', paciente.tipoSanguineo],
                    ['Alergias', paciente.alergias], ['Mãe', paciente.mae], ['Pai', paciente.pai],
                    ['Profissão', paciente.profissao], ['Estado Civil', paciente.estadoCivil], ['Queixa Principal', paciente.queixaPrincipal]
                  ].map(([label, value]) => (
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
                  <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Nome Completo *</label><input required className="input-field" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} /></div>
                  <div><label className="form-label">CPF</label><input className="input-field" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} /></div>
                  <div><label className="form-label">RG</label><input className="input-field" value={formData.rg} onChange={e => setFormData({ ...formData, rg: e.target.value })} /></div>
                  <div><label className="form-label">Nascimento *</label><input required type="date" className="input-field" value={formData.nascimento} onChange={e => setFormData({ ...formData, nascimento: e.target.value })} /></div>
                  <div><label className="form-label">Sexo</label><select className="input-field" value={formData.sexo} onChange={e => setFormData({ ...formData, sexo: e.target.value })}><option value="">Selecione...</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option></select></div>
                  <div><label className="form-label">Telefone</label><input className="input-field" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} /></div>
                  <div><label className="form-label">E-mail</label><input type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Endereço Completo</label><input className="input-field" value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} /></div>
                  <div><label className="form-label">Mãe</label><input className="input-field" value={formData.mae} onChange={e => setFormData({ ...formData, mae: e.target.value })} /></div>
                  <div><label className="form-label">Pai</label><input className="input-field" value={formData.pai} onChange={e => setFormData({ ...formData, pai: e.target.value })} /></div>
                  <div><label className="form-label">Convênio</label><input className="input-field" value={formData.convenio} onChange={e => setFormData({ ...formData, convenio: e.target.value })} /></div>
                  <div><label className="form-label">Profissão</label><input className="input-field" value={formData.profissao} onChange={e => setFormData({ ...formData, profissao: e.target.value })} /></div>
                  <div><label className="form-label">Estado Civil</label><input className="input-field" value={formData.estadoCivil} onChange={e => setFormData({ ...formData, estadoCivil: e.target.value })} /></div>
                  <div><label className="form-label">Tipo Sanguíneo</label><select className="input-field" value={formData.tipoSanguineo} onChange={e => setFormData({ ...formData, tipoSanguineo: e.target.value })}><option value="">Desconhecido</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option></select></div>
                  <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Alergias</label><input className="input-field" value={formData.alergias} onChange={e => setFormData({ ...formData, alergias: e.target.value })} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Queixa Principal</label><input className="input-field" value={formData.queixaPrincipal} onChange={e => setFormData({ ...formData, queixaPrincipal: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
                <style>{`.form-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 5px; font-weight: 600; } .input-field { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; } .input-field:focus { border-color: #1e3a8a; }`}</style>
              </form>
            )}
          </div>
        )}

        {/* ===================== TRIAGEM ===================== */}
        {tab === 'triagem' && (
          <div className="space-y-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, color: '#0a1f44', fontSize: '20px', fontWeight: 800 }}>Registro de Triagem e Classificação de Risco</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Aferição de sinais vitais, cálculo do escore MEWS e protocolo de acolhimento</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 15, marginBottom: 20 }}>
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Classificação Manchester / Risco</label>
                <select className="input-field" value={triagem.classificacao} onChange={e => setTriagem({ ...triagem, classificacao: e.target.value })}>
                  <option value="">Selecione o Risco...</option>
                  <option value="Vermelho">Vermelho (Emergência)</option>
                  <option value="Laranja">Laranja (Muito urgente)</option>
                  <option value="Amarelo">Amarelo (Urgente)</option>
                  <option value="Verde">Verde (Pouco urgente)</option>
                  <option value="Azul">Azul (Não urgente)</option>
                </select>
              </div>
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Fluxograma Clínico Principal</label>
                <select className="input-field" value={triagem.fluxograma} onChange={e => setTriagem({ ...triagem, fluxograma: e.target.value })}>
                  <option value="">Selecione o Fluxograma...</option>
                  <option value="Dor torácica">Dor torácica / Cardiopatia</option>
                  <option value="Dispneia">Dispneia / Insuficiência Respiratória</option>
                  <option value="Febre">Febre / Síndrome Infecciosa</option>
                  <option value="Trauma">Trauma / Acidente / Queda</option>
                  <option value="Dor abdominal">Dor abdominal / Abdome Agudo</option>
                  <option value="Cefaleia">Cefaleia / Alteração Neurológica</option>
                  <option value="Outros">Outras Queixas Clínicas</option>
                </select>
              </div>
            </div>

            {/* Sinais Vitais com Unidades Claras */}
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: 20 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a1f44', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="las la-heartbeat" style={{ color: '#dc2626', fontSize: '18px' }}></i> Sinais Vitais & Avaliação Fisiológica
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>PA (mmHg)</label>
                  <input type="text" className="input-field" placeholder="120/80" value={triagem.pressao} onChange={e => setTriagem({ ...triagem, pressao: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>FC (bpm)</label>
                  <input type="number" className="input-field" placeholder="80" value={triagem.frequenciaC} onChange={e => setTriagem({ ...triagem, frequenciaC: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>FR (irpm)</label>
                  <input type="number" className="input-field" placeholder="18" value={triagem.frequenciaR} onChange={e => setTriagem({ ...triagem, frequenciaR: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Temp (°C)</label>
                  <input type="number" step="0.1" className="input-field" placeholder="36.5" value={triagem.temperatura} onChange={e => setTriagem({ ...triagem, temperatura: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>SpO2 (%)</label>
                  <input type="number" className="input-field" placeholder="98" value={triagem.saturacao} onChange={e => setTriagem({ ...triagem, saturacao: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Glicemia (mg/dL)</label>
                  <input type="number" className="input-field" placeholder="90" value={triagem.glicemia} onChange={e => setTriagem({ ...triagem, glicemia: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Nível Consciência</label>
                  <select className="input-field" value={triagem.avpu} onChange={e => setTriagem({ ...triagem, avpu: e.target.value })}>
                    <option value="A">A - Alerta</option>
                    <option value="V">V - Responde à Voz</option>
                    <option value="P">P - Responde à Dor</option>
                    <option value="U">U - Inconsciente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MEWS e Anamnese */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr', gap: 18, marginBottom: 20 }}>
              <div style={{ background: mewsInfo.bg, padding: 20, borderRadius: 12, textAlign: 'center', transition: 'all 0.3s', border: `2px solid ${mewsInfo.text}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ color: mewsInfo.text, margin: 0, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Escore MEWS Fisiológico</h4>
                <div style={{ fontSize: 38, fontWeight: 900, color: mewsInfo.text, margin: '8px 0' }}>{mews}</div>
                <div style={{ fontSize: 13, color: mewsInfo.text, fontWeight: 700 }}>{mewsInfo.label}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>Queixa Principal</label>
                  <textarea className="input-field" rows={2} placeholder="Ex: Dor precordial opressiva irradiando para MSE com início há 2 horas..." value={triagem.queixa} onChange={e => setTriagem({ ...triagem, queixa: e.target.value })} style={{ resize: 'vertical' }}></textarea>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>História da Doença Atual (HDA) e Antecedentes</label>
                  <textarea className="input-field" rows={3} placeholder="Descreva os fatores desencadeantes, sintomas associados, alergias e medicações em uso..." value={triagem.observacoes} onChange={e => setTriagem({ ...triagem, observacoes: e.target.value })} style={{ resize: 'vertical' }}></textarea>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700 }} onClick={registrarTriagem} disabled={isSaving}>
              {isSaving ? 'Registrando Triagem...' : 'Salvar e Registrar Triagem'}
            </button>

            <h3 style={{ marginTop: 40, marginBottom: 20, color: '#0a1f44' }}>Histórico de Triagens</h3>
            {paciente.triagens?.length > 0 ? paciente.triagens.map((t: any, i: number) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><strong style={{ color: '#0a1f44' }}>Triagem #{paciente.triagens.length - i}</strong><span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(t.createdAt).toLocaleString('pt-BR')}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, fontSize: 13 }}>
                  <div><strong>Class:</strong> {t.classificacao || '-'}</div><div><strong>PA:</strong> {t.pressao || '-'}</div><div><strong>Temp:</strong> {t.temperatura || '-'}</div><div><strong>FC:</strong> {t.frequenciaC || '-'}</div><div><strong>FR:</strong> {t.frequenciaR || '-'}</div><div><strong>SpO2:</strong> {t.saturacao || '-'}</div><div><strong>HGT:</strong> {t.glicemia || '-'}</div>
                </div>
                {t.queixa && <p style={{ marginTop: 10, color: '#475569', fontSize: 13 }}><strong>Queixa:</strong> {t.queixa}</p>}
                {t.observacoes && <p style={{ marginTop: 5, color: '#475569', fontSize: 13 }}><strong>HDA:</strong> {t.observacoes}</p>}
              </div>
            )) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Nenhuma triagem registrada no histórico</p>}
          </div>
        )}

        {/* ===================== ESCORES ===================== */}
        {tab === 'escores' && (
          <div>
            <h3 style={{ marginBottom: 20, color: '#0a1f44' }}>Escores Clínicos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {/* Glasgow */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ color: '#1e3a8a', marginBottom: '15px' }}>Escala de Glasgow</h4>
                <div style={{ marginBottom: 10 }}><label className="form-label">Ocular</label><select value={glasgow.ocular} onChange={e => setGlasgow({ ...glasgow, ocular: parseInt(e.target.value) })} className="input-field"><option value={4}>4 - Espontânea</option><option value={3}>3 - À voz</option><option value={2}>2 - À dor</option><option value={1}>1 - Nenhuma</option></select></div>
                <div style={{ marginBottom: 10 }}><label className="form-label">Verbal</label><select value={glasgow.verbal} onChange={e => setGlasgow({ ...glasgow, verbal: parseInt(e.target.value) })} className="input-field"><option value={5}>5 - Orientada</option><option value={4}>4 - Confusa</option><option value={3}>3 - Palavras Inapropriadas</option><option value={2}>2 - Sons</option><option value={1}>1 - Nenhuma</option></select></div>
                <div style={{ marginBottom: 10 }}><label className="form-label">Motora</label><select value={glasgow.motor} onChange={e => setGlasgow({ ...glasgow, motor: parseInt(e.target.value) })} className="input-field"><option value={6}>6 - Obedece comandos</option><option value={5}>5 - Localiza dor</option><option value={4}>4 - Flexão normal</option><option value={3}>3 - Flexão anormal</option><option value={2}>2 - Extensão anormal</option><option value={1}>1 - Nenhuma</option></select></div>
                <div style={{ marginTop: 15, background: '#eff6ff', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 700, color: '#1e3a8a' }}>Total:</span><span style={{ fontSize: '24px', fontWeight: 800, color: '#1e3a8a' }}>{totalGlasgow}</span></div>
              </div>

              {/* Braden */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ color: '#059669', marginBottom: '15px' }}>Escala de Braden</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label className="form-label" style={{ fontSize: 11 }}>Sensorial</label><select value={braden.sensorial} onChange={e => setBraden({ ...braden, sensorial: parseInt(e.target.value) })} className="input-field"><option value={4}>4</option><option value={3}>3</option><option value={2}>2</option><option value={1}>1</option></select></div>
                  <div><label className="form-label" style={{ fontSize: 11 }}>Umidade</label><select value={braden.umidade} onChange={e => setBraden({ ...braden, umidade: parseInt(e.target.value) })} className="input-field"><option value={4}>4</option><option value={3}>3</option><option value={2}>2</option><option value={1}>1</option></select></div>
                  <div><label className="form-label" style={{ fontSize: 11 }}>Atividade</label><select value={braden.atividade} onChange={e => setBraden({ ...braden, atividade: parseInt(e.target.value) })} className="input-field"><option value={4}>4</option><option value={3}>3</option><option value={2}>2</option><option value={1}>1</option></select></div>
                  <div><label className="form-label" style={{ fontSize: 11 }}>Mobilidade</label><select value={braden.mobilidade} onChange={e => setBraden({ ...braden, mobilidade: parseInt(e.target.value) })} className="input-field"><option value={4}>4</option><option value={3}>3</option><option value={2}>2</option><option value={1}>1</option></select></div>
                  <div><label className="form-label" style={{ fontSize: 11 }}>Nutrição</label><select value={braden.nutricao} onChange={e => setBraden({ ...braden, nutricao: parseInt(e.target.value) })} className="input-field"><option value={4}>4</option><option value={3}>3</option><option value={2}>2</option><option value={1}>1</option></select></div>
                  <div><label className="form-label" style={{ fontSize: 11 }}>Fricção</label><select value={braden.friccao} onChange={e => setBraden({ ...braden, friccao: parseInt(e.target.value) })} className="input-field"><option value={3}>3</option><option value={2}>2</option><option value={1}>1</option></select></div>
                </div>
                <div style={{ marginTop: 15, background: '#ecfdf5', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 700, color: '#059669' }}>Total:</span><span style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>{totalBraden}</span></div>
              </div>

              {/* Dor */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', gridColumn: '1 / -1' }}>
                <h4 style={{ color: '#d97706', marginBottom: '15px' }}>Escala Visual Analógica (Dor)</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', flexWrap: 'wrap', gap: 10 }}>
                  {[{ val: 0, Icon: Smile, label: 'Sem dor' }, { val: 2, Icon: Smile, label: 'Leve' }, { val: 5, Icon: Meh, label: 'Moderada' }, { val: 8, Icon: Frown, label: 'Intensa' }, { val: 10, Icon: AlertCircle, label: 'Máxima' }].map(({ val, Icon, label }) => (
                    <button key={val} type="button" aria-pressed={dor === val} onClick={() => setDor(val)} style={{ flex: 1, minWidth: 60, textAlign: 'center', cursor: 'pointer', padding: '10px', borderRadius: '8px', background: dor === val ? '#fefce8' : 'transparent', border: dor === val ? '2px solid #eab308' : '2px solid transparent', transition: 'all 0.2s' }}>
                      <Icon size={28} aria-hidden="true" style={{ color: dor === val ? '#ca8a04' : '#64748b' }} /><div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '5px' }}>{label}</div><div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{val}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20 }}><button className="btn btn-primary" style={{ width: '100%' }} onClick={salvarEscores}>Salvar Escores Clínicos</button></div>
          </div>
        )}

        {/* ===================== PEP ===================== */}
        {tab === 'pep' && (
          <div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 15, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              {[{ id: 'soap', label: 'SOAP / Evolução' }, { id: 'sinais', label: 'Sinais Vitais' }, { id: 'medicamentos', label: 'Medicamentos' }, { id: 'exames', label: 'Exames' }].map(sub => (
                <button key={sub.id} onClick={() => setPepSubTab(sub.id)} style={{ padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: pepSubTab === sub.id ? '#1e3a8a' : '#64748b', borderBottom: pepSubTab === sub.id ? '2px solid #1e3a8a' : '2px solid transparent', transition: 'all 0.2s' }}>{sub.label}</button>
              ))}
            </div>

            {pepSubTab === 'soap' && (
              <div>
                <textarea className="input-field" rows={2} placeholder="S - Subjetivo (O que o paciente relata)" value={novaEvolucao.s} onChange={e => setNovaEvolucao({ ...novaEvolucao, s: e.target.value })} style={{ marginBottom: 10 }}></textarea>
                <textarea className="input-field" rows={2} placeholder="O - Objetivo (O que o médico observa/exame físico)" value={novaEvolucao.o} onChange={e => setNovaEvolucao({ ...novaEvolucao, o: e.target.value })} style={{ marginBottom: 10 }}></textarea>
                <textarea className="input-field" rows={2} placeholder="A - Avaliação (Impressão diagnóstica)" value={novaEvolucao.a} onChange={e => setNovaEvolucao({ ...novaEvolucao, a: e.target.value })} style={{ marginBottom: 10 }}></textarea>
                <textarea className="input-field" rows={2} placeholder="P - Plano (Conduta, exames, medicação)" value={novaEvolucao.p} onChange={e => setNovaEvolucao({ ...novaEvolucao, p: e.target.value })} style={{ marginBottom: 10 }}></textarea>
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={registrarEvolucao} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Evolução SOAP'}</button>

                {paciente.evolucoes?.length > 0 ? paciente.evolucoes.map((ev: any, i: number) => (
                  <div key={i} style={{ background: '#f8fafc', padding: 15, marginBottom: 10, borderTop: '3px solid #1e3a8a', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>{ev.profissional} - {new Date(ev.createdAt).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap' }}>{ev.descricao}</div>
                  </div>
                )) : <div style={{ color: '#94a3b8', textAlign: 'center' }}>Nenhuma evolução</div>}
              </div>
            )}

            {pepSubTab === 'sinais' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 15 }}>
                  <input type="text" className="input-field" placeholder="PA" value={novoSinal.pressao} onChange={e => setNovoSinal({ ...novoSinal, pressao: e.target.value })} />
                  <input type="number" className="input-field" placeholder="FC" value={novoSinal.fc} onChange={e => setNovoSinal({ ...novoSinal, fc: e.target.value })} />
                  <input type="number" className="input-field" placeholder="FR" value={novoSinal.fr} onChange={e => setNovoSinal({ ...novoSinal, fr: e.target.value })} />
                  <input type="number" step="0.1" className="input-field" placeholder="Temp" value={novoSinal.temp} onChange={e => setNovoSinal({ ...novoSinal, temp: e.target.value })} />
                  <input type="number" className="input-field" placeholder="SpO2" value={novoSinal.satO2} onChange={e => setNovoSinal({ ...novoSinal, satO2: e.target.value })} />
                  <input type="number" className="input-field" placeholder="Glicemia" value={novoSinal.glicemia} onChange={e => setNovoSinal({ ...novoSinal, glicemia: e.target.value })} />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={registrarSinalVital}>Registrar Sinais Vitais</button>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead><tr style={{ background: '#1e3a8a', color: 'white' }}><th style={{ padding: 10 }}>Data/Hora</th><th style={{ padding: 10 }}>PA</th><th style={{ padding: 10 }}>FC</th><th style={{ padding: 10 }}>FR</th><th style={{ padding: 10 }}>Temp</th><th style={{ padding: 10 }}>SpO2</th><th style={{ padding: 10 }}>HGT</th></tr></thead>
                    <tbody>
                      {sinaisVitais.length > 0 ? sinaisVitais.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: 10 }}>{new Date(s.createdAt || s.data).toLocaleString('pt-BR')}</td><td style={{ padding: 10 }}>{s.pressao || '-'}</td><td style={{ padding: 10 }}>{s.fc || '-'}</td><td style={{ padding: 10 }}>{s.fr || '-'}</td><td style={{ padding: 10 }}>{s.temp || '-'}</td><td style={{ padding: 10 }}>{s.satO2 || '-'}</td><td style={{ padding: 10 }}>{s.glicemia || '-'}</td></tr>
                      )) : <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Nenhum registro</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pepSubTab === 'medicamentos' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 15 }}>
                  <input type="text" className="input-field" placeholder="Medicamento" value={novoMed.medicamento} onChange={e => setNovoMed({ ...novoMed, medicamento: e.target.value })} />
                  <input type="text" className="input-field" placeholder="Dose" value={novoMed.dose} onChange={e => setNovoMed({ ...novoMed, dose: e.target.value })} />
                  <input type="text" className="input-field" placeholder="Via" value={novoMed.via} onChange={e => setNovoMed({ ...novoMed, via: e.target.value })} />
                  <input type="text" className="input-field" placeholder="Frequência" value={novoMed.frequencia} onChange={e => setNovoMed({ ...novoMed, frequencia: e.target.value })} />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={registrarPrescricao} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Adicionar à Prescrição'}</button>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {paciente.prescricoes?.length > 0 ? paciente.prescricoes.map((m: any, i: number) => (
                    <li key={i} style={{ background: '#f8fafc', padding: '12px', marginBottom: '8px', borderRadius: '8px', borderTop: '3px solid #1e3a8a', display: 'flex', justifyContent: 'space-between' }}>
                      <span><Pill size={14} aria-hidden="true" /> <strong>{m.medicamento}</strong> {m.dose} - {m.via} {m.frequencia}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(m.createdAt).toLocaleDateString('pt-BR')}</span>
                    </li>
                  )) : <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Nenhum medicamento prescrito</div>}
                </ul>
              </div>
            )}

            {pepSubTab === 'exames' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 15 }}>
                  <input type="text" className="input-field" placeholder="Nome do Exame" value={novoExame.nome} onChange={e => setNovoExame({ ...novoExame, nome: e.target.value })} />
                  <input type="text" className="input-field" placeholder="Resultado (Opcional)" value={novoExame.resultado} onChange={e => setNovoExame({ ...novoExame, resultado: e.target.value })} />
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={solicitarExame} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Solicitar Exame'}</button>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead><tr style={{ background: '#1e3a8a', color: 'white' }}><th style={{ padding: 10 }}>Data</th><th style={{ padding: 10 }}>Exame</th><th style={{ padding: 10 }}>Status</th><th style={{ padding: 10 }}>Resultado</th></tr></thead>
                  <tbody>
                    {paciente.exames?.length > 0 ? paciente.exames.map((ex: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: 10 }}>{new Date(ex.createdAt).toLocaleDateString('pt-BR')}</td><td style={{ padding: 10 }}>{ex.nome}</td><td style={{ padding: 10 }}>{ex.status}</td><td style={{ padding: 10 }}>{ex.resultado || '-'}</td></tr>
                    )) : <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Nenhum exame cadastrado</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== NUTRIÇÃO ===================== */}
        {tab === 'nutricao' && (
          <div>
            <h3 style={{ marginBottom: 20, color: '#0a1f44' }}>Avaliação Nutricional</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div><label className="form-label">Peso (kg)</label><input type="number" step="0.1" className="input-field" value={nutricao.peso} onChange={e => setNutricao({ ...nutricao, peso: e.target.value })} /></div>
              <div><label className="form-label">Altura (m)</label><input type="number" step="0.01" className="input-field" value={nutricao.altura} onChange={e => setNutricao({ ...nutricao, altura: e.target.value })} /></div>
            </div>
            {imc > 0 && (
              <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div><div style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase' }}>Índice de Massa Corporal (IMC)</div><div style={{ fontSize: 16, color: '#0f172a', fontWeight: 600, marginTop: 5 }}>Classificação: {imcClass}</div></div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#1e3a8a' }}>{imc.toFixed(1)}</div>
              </div>
            )}
            <div style={{ marginBottom: 20 }}><label className="form-label">Prescrição de Dieta</label><select className="input-field" value={nutricao.dieta} onChange={e => setNutricao({ ...nutricao, dieta: e.target.value })}><option>Via Oral</option><option>Branda</option><option>Pastosa</option><option>Líquida</option><option>Enteral</option><option>Jejum Absoluto</option></select></div>
            <div style={{ marginBottom: 20 }}><label className="form-label">Restrições</label><input type="text" className="input-field" value={nutricao.restricoes} onChange={e => setNutricao({ ...nutricao, restricoes: e.target.value })} /></div>
            <div><button className="btn btn-primary" style={{ width: '100%' }} onClick={salvarNutricao}>Registrar Avaliação Nutricional</button></div>
          </div>
        )}

        {/* ===================== MEDICO ===================== */}
        {tab === 'medico' && (
          <div>
            <h3 style={{ marginBottom: 20, color: '#0a1f44' }}>Avaliação Médica</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
              <input className="input-field" placeholder="Médico Responsável" value={medico.responsavel} onChange={e => setMedico({ ...medico, responsavel: e.target.value })} />
              <input className="input-field" placeholder="CRM" value={medico.crm} onChange={e => setMedico({ ...medico, crm: e.target.value })} />
            </div>
            <input className="input-field" placeholder="Especialidade" value={medico.especialidade} onChange={e => setMedico({ ...medico, especialidade: e.target.value })} style={{ marginBottom: 15 }} />
            <textarea className="input-field" rows={3} placeholder="Hipótese Diagnóstica / CID-10" value={medico.diagnostico} onChange={e => setMedico({ ...medico, diagnostico: e.target.value })} style={{ marginBottom: 15 }}></textarea>
            <textarea className="input-field" rows={4} placeholder="Conduta Médica" value={medico.conduta} onChange={e => setMedico({ ...medico, conduta: e.target.value })} style={{ marginBottom: 15 }}></textarea>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={salvarMedico}>Salvar Avaliação Médica</button>
          </div>
        )}

        {/* ===================== ENFERMAGEM ===================== */}
        {tab === 'enfermagem' && (
          <div>
            <h3 style={{ marginBottom: 20, color: '#0a1f44' }}>Anotações de Enfermagem</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
              <input className="input-field" placeholder="Enfermeiro Responsável" value={enfermagem.responsavel} onChange={e => setEnfermagem({ ...enfermagem, responsavel: e.target.value })} />
              <input className="input-field" placeholder="COREN" value={enfermagem.coren} onChange={e => setEnfermagem({ ...enfermagem, coren: e.target.value })} />
            </div>
            <textarea className="input-field" rows={4} placeholder="Evolução de Enfermagem (Anotações)" value={enfermagem.evolucao} onChange={e => setEnfermagem({ ...enfermagem, evolucao: e.target.value })} style={{ marginBottom: 15 }}></textarea>
            <textarea className="input-field" rows={4} placeholder="Prescrição de Enfermagem (Cuidados)" value={enfermagem.prescricao} onChange={e => setEnfermagem({ ...enfermagem, prescricao: e.target.value })} style={{ marginBottom: 15 }}></textarea>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={salvarEnfermagem}>Salvar Registro</button>
          </div>
        )}

        {/* ===================== DOCUMENTOS ===================== */}
        {tab === 'documentos' && (
          <div>
            <h3 style={{ marginBottom: 20, color: '#0a1f44' }}>Documentos do prontuário</h3>
            <div role="note" style={{ padding: 20, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 8 }}>
              <p style={{ margin: 0 }}><strong>Anexos desativados.</strong> O sistema ainda não tem armazenamento seguro e auditável de arquivos clínicos. Não selecione nem envie documentos por esta tela.</p>
            </div>
          </div>
        )}

        {/* ===================== TIMELINE ===================== */}
        {tab === 'timeline' && (
          <div>
            <h3 style={{ marginBottom: 20, color: '#0a1f44' }}>Linha do Tempo Clínica</h3>
            <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
              <select className="input-field" style={{ width: 'auto' }} value={novoTimeline.tipo} onChange={e => setNovoTimeline({ ...novoTimeline, tipo: e.target.value })}>
                <option>Anotação Geral</option><option>Procedimento</option><option>Intercorrência</option>
              </select>
              <input className="input-field" placeholder="Descreva o evento..." style={{ flex: 1 }} value={novoTimeline.descricao} onChange={e => setNovoTimeline({ ...novoTimeline, descricao: e.target.value })} />
              <button className="btn btn-primary" onClick={addTimelinePost}>Publicar</button>
            </div>

            <div style={{ position: 'relative', paddingLeft: 30, borderLeft: '2px solid #e2e8f0', marginLeft: 20, marginTop: 30 }}>
              {timelineEvents.length > 0 ? timelineEvents.map(t => (
                <div key={t.id} style={{ position: 'relative', marginBottom: 25 }}>
                  <div style={{ position: 'absolute', left: -39, top: 0, width: 16, height: 16, borderRadius: '50%', background: '#1e3a8a', border: '4px solid white' }}></div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 5 }}>{t.user} - {new Date(t.createdAt || t.data).toLocaleString('pt-BR')}</div>
                  <div style={{ background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <strong>{t.tipo}</strong>
                    <p style={{ margin: '5px 0 0 0', fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap' }}>{t.descricao}</p>
                  </div>
                </div>
              )) : (
                <div style={{ position: 'relative', marginBottom: 25 }}>
                  <div style={{ position: 'absolute', left: -39, top: 0, width: 16, height: 16, borderRadius: '50%', background: '#1e3a8a', border: '4px solid white' }}></div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 5 }}>Sistema</div>
                  <div style={{ background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <strong>Abertura de Prontuário Eletrônico</strong>
                    <p style={{ margin: '5px 0 0 0', fontSize: 13, color: '#475569' }}>Paciente registrado e aguardando fluxo.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
