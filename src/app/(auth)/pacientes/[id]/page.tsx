'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, RiscoBadge, Tabs } from '@/components/ui'
import { isTerminal, proximosStatus, STATUS_DESFECHO } from '@/lib/paciente-status'
import { pode } from '@/lib/permissions'
import BuscaCid from '@/components/ui/BuscaCid'
import { alergiaReal, calcularIdade, calcularMews, cpfValido, formatarCPF, formatarDataHora, formatarNascimento, nascimentoParaInput } from '@/lib/utils'
import { erroDaApi, StatusBadge, TIPOS_SANGUINEOS, useCargo } from '../componentes'

type Registro = { id: string; createdAt: string; profissional?: string | null }
type Triagem = Registro & { classificacao: string; pressao: string | null; temperatura: number | null; frequenciaC: number | null; frequenciaR: number | null; saturacao: number | null; glicemia: number | null; queixa: string | null; observacoes: string | null }
type Evolucao = Registro & { tipo: string; descricao: string }
type Prescricao = Registro & { medicamento: string; dose: string | null; via: string | null; frequencia: string | null }
type Exame = Registro & { nome: string; status: string; resultado: string | null }
type Sinal = Registro & { pressao: string | null; fc: string | null; fr: string | null; temp: string | null; satO2: string | null; glicemia: string | null }
type Escore = Registro & { glasgow: Record<string, number> | null; dor: number | null; braden: Record<string, number> | null }
type Nutricao = Registro & { peso: string | null; altura: string | null; dieta: string | null; restricoes: string | null }
type Medica = Registro & { responsavel: string | null; crm: string | null; especialidade: string | null; diagnostico: string | null; conduta: string | null }
type Enfermagem = Registro & { responsavel: string | null; coren: string | null; evolucao: string | null; prescricao: string | null }
type Evento = { id: string; createdAt: string; tipo: string; descricao: string; user: string | null }

const CAMPOS_CADASTRO = ['nome', 'cpf', 'rg', 'nascimento', 'sexo', 'telefone', 'email', 'endereco', 'convenio', 'mae', 'pai', 'profissao', 'estadoCivil', 'tipoSanguineo', 'alergias', 'queixaPrincipal'] as const
type CampoCadastro = (typeof CAMPOS_CADASTRO)[number]

type Paciente = Partial<Record<CampoCadastro, string | null>> & {
  id: string
  nome: string
  status: string
  classificacao: string | null
  acesso: 'cadastro' | 'clinico'
  triagens?: Triagem[]
  evolucoes?: Evolucao[]
  prescricoes?: Prescricao[]
  exames?: Exame[]
  sinaisVitais?: Sinal[]
  escoresClinicos?: Escore[]
  avaliacoesNutri?: Nutricao[]
  avaliacoesMedicas?: Medica[]
  anotacoesEnf?: Enfermagem[]
  timelineEvents?: Evento[]
}

type Aba = 'dados' | 'triagem' | 'escores' | 'pep' | 'nutricao' | 'medico' | 'enfermagem' | 'documentos' | 'timeline'
type SubAba = 'soap' | 'sinais' | 'medicamentos' | 'exames'

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'dados', label: 'Dados pessoais', icon: 'las la-user' },
  { id: 'triagem', label: 'Triagem', icon: 'las la-stethoscope' },
  { id: 'escores', label: 'Escores', icon: 'las la-calculator' },
  { id: 'pep', label: 'PEP', icon: 'las la-laptop-medical' },
  { id: 'nutricao', label: 'Nutrição', icon: 'las la-apple-alt' },
  { id: 'medico', label: 'Médico', icon: 'las la-user-md' },
  { id: 'enfermagem', label: 'Enfermagem', icon: 'las la-user-nurse' },
  { id: 'documentos', label: 'Documentos', icon: 'las la-file-alt' },
  { id: 'timeline', label: 'Timeline', icon: 'las la-stream' },
]

const SUB_ABAS: { id: SubAba; label: string }[] = [
  { id: 'soap', label: 'SOAP / Evolução' },
  { id: 'sinais', label: 'Sinais vitais' },
  { id: 'medicamentos', label: 'Medicamentos' },
  { id: 'exames', label: 'Exames' },
]

const TRIAGEM_VAZIA = { classificacao: '', fluxograma: '', pressao: '', frequenciaC: '', frequenciaR: '', temperatura: '', saturacao: '', glicemia: '', avpu: '', queixa: '', observacoes: '' }
const GLASGOW_VAZIO = { ocular: '', verbal: '', motor: '' }
const BRADEN_VAZIO = { sensorial: '', umidade: '', atividade: '', mobilidade: '', nutricao: '', friccao: '' }
const SINAL_VAZIO = { pressao: '', fc: '', fr: '', temp: '', satO2: '', glicemia: '' }
const SOAP_VAZIO = { s: '', o: '', a: '', p: '' }
const MED_VAZIO = { medicamento: '', dose: '', via: '', frequencia: '' }
const NUTRI_VAZIA = { peso: '', altura: '', dieta: '', restricoes: '' }
const MEDICO_VAZIO = { crm: '', especialidade: '', diagnostico: '', conduta: '' }
const ENF_VAZIA = { coren: '', evolucao: '', prescricao: '' }

const OPCOES_GLASGOW: Record<keyof typeof GLASGOW_VAZIO, [number, string][]> = {
  ocular: [[4, 'Espontânea'], [3, 'À voz'], [2, 'À dor'], [1, 'Nenhuma']],
  verbal: [[5, 'Orientada'], [4, 'Confusa'], [3, 'Palavras inapropriadas'], [2, 'Sons'], [1, 'Nenhuma']],
  motor: [[6, 'Obedece comandos'], [5, 'Localiza dor'], [4, 'Flexão normal'], [3, 'Flexão anormal'], [2, 'Extensão anormal'], [1, 'Nenhuma']],
}
const MAXIMOS_BRADEN: Record<keyof typeof BRADEN_VAZIO, number> = { sensorial: 4, umidade: 4, atividade: 4, mobilidade: 4, nutricao: 4, friccao: 3 }

function escalaNumerica(valores: Record<string, string>): { vazia: boolean; completa: boolean; numeros: Record<string, number> } {
  const lista = Object.values(valores)
  return {
    vazia: lista.every(v => v === ''),
    completa: lista.every(v => v !== ''),
    numeros: Object.fromEntries(Object.entries(valores).map(([chave, valor]) => [chave, Number(valor)])),
  }
}

const TOM_MEWS = { baixo: 'success', medio: 'warning', alto: 'danger' } as const

const ROTULO_GLASGOW: Record<keyof typeof GLASGOW_VAZIO, string> = { ocular: 'Abertura ocular', verbal: 'Resposta verbal', motor: 'Resposta motora' }
const ROTULO_BRADEN: Record<keyof typeof BRADEN_VAZIO, string> = { sensorial: 'Percepção sensorial', umidade: 'Umidade', atividade: 'Atividade', mobilidade: 'Mobilidade', nutricao: 'Nutrição', friccao: 'Fricção e cisalhamento' }

const somar = (valores: Record<string, number> | null | undefined) => valores ? Object.values(valores).reduce((a, b) => a + b, 0) : null

function Cartao({ titulo, data, autor, children }: { titulo?: ReactNode; data: string; autor?: string | null; children?: ReactNode }) {
  return (
    <article className="pac-cartao">
      <div className="pac-cartao-topo">
        <strong>{titulo ?? autor ?? 'Registro'}</strong>
        <span>{titulo && autor ? `${autor} - ` : ''}{formatarDataHora(data)}</span>
      </div>
      {children}
    </article>
  )
}

export default function FichaPacientePage() {
  const params = useParams()
  const pacienteId = typeof params.id === 'string' ? params.id : ''
  const cargo = useCargo()

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState('')
  const [recarga, setRecarga] = useState(0)
  const [tab, setTab] = useState<Aba>('dados')
  const [pepSubTab, setPepSubTab] = useState<SubAba>('soap')
  const [salvando, setSalvando] = useState(false)

  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const [triagem, setTriagem] = useState(TRIAGEM_VAZIA)
  const [glasgow, setGlasgow] = useState(GLASGOW_VAZIO)
  const [braden, setBraden] = useState(BRADEN_VAZIO)
  const [dor, setDor] = useState<number | null>(null)
  const [soap, setSoap] = useState(SOAP_VAZIO)
  const [novoMed, setNovoMed] = useState(MED_VAZIO)
  const [novoExame, setNovoExame] = useState({ nome: '', tipo: 'laboratorio' })
  const [novoSinal, setNovoSinal] = useState(SINAL_VAZIO)
  const [nutricao, setNutricao] = useState(NUTRI_VAZIA)
  const [medico, setMedico] = useState(MEDICO_VAZIO)
  const [enfermagem, setEnfermagem] = useState(ENF_VAZIA)
  const [anotacao, setAnotacao] = useState('')

  const recarregar = useCallback(() => setRecarga(n => n + 1), [])

  useEffect(() => {
    if (!pacienteId) return
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch(`/api/pacientes/${encodeURIComponent(pacienteId)}`, { signal: controller.signal })
        if (!res.ok) throw new Error(await erroDaApi(res, 'Não foi possível carregar o prontuário.'))
        const dados = (await res.json()) as Paciente
        if (!dados || typeof dados.id !== 'string') throw new Error('Resposta inválida ao carregar o prontuário.')
        setPaciente(dados)
        setErroCarga('')
      } catch (error) {
        if (controller.signal.aborted) return
        setPaciente(null)
        setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar o prontuário.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [pacienteId, recarga])

  const mews = useMemo(() => calcularMews(triagem), [triagem])

  const postar = async (caminho: string, corpo: unknown, erroPadrao: string) => {
    if (salvando) return false
    setSalvando(true)
    try {
      const res = await fetch(`/api/pacientes/${encodeURIComponent(pacienteId)}/${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (!res.ok) {
        alert(await erroDaApi(res, erroPadrao))
        return false
      }
      recarregar()
      return true
    } catch {
      alert(`${erroPadrao} Falha de conexão.`)
      return false
    } finally {
      setSalvando(false)
    }
  }

  const atualizar = async (corpo: Record<string, unknown>, erroPadrao: string) => {
    setSalvando(true)
    try {
      const res = await fetch(`/api/pacientes/${encodeURIComponent(pacienteId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (!res.ok) {
        alert(await erroDaApi(res, erroPadrao))
        return false
      }
      recarregar()
      return true
    } catch {
      alert(`${erroPadrao} Falha de conexão.`)
      return false
    } finally {
      setSalvando(false)
    }
  }

  const cabecalhoVazio = <PageHeader icon="las la-file-medical-alt" title="Prontuário eletrônico" actions={<Link href="/pacientes" className="btn btn-secondary"><i className="las la-arrow-left" aria-hidden="true"></i> Voltar</Link>} />
  if (!pacienteId) return <div className="pac-pagina">{cabecalhoVazio}<Panel><ErrorState message="Identificador de paciente inválido." /></Panel></div>
  if (loading) return <div className="pac-pagina">{cabecalhoVazio}<Panel><LoadingState message="Carregando prontuário..." /></Panel></div>
  if (!paciente) return <div className="pac-pagina">{cabecalhoVazio}<Panel><ErrorState message={erroCarga || 'Paciente não encontrado.'} onRetry={recarregar} /></Panel></div>

  const clinico = paciente.acesso === 'clinico'
  const terminal = isTerminal(paciente.status)
  const podeEditarCadastro = pode(cargo, 'paciente:cadastrar') && !terminal
  const podeVitais = pode(cargo, 'prontuario:dados-vitais')
  const pode_ = (permissao: Parameters<typeof pode>[1]) => pode(cargo, permissao) && !terminal
  const nascimento = paciente.nascimento
  const idade = calcularIdade(nascimento)
  const adulto = typeof idade === 'number' && idade >= 18

  const opcoesStatus = proximosStatus(paciente.status).filter(s => s !== 'Óbito' && (!STATUS_DESFECHO.includes(s) || pode(cargo, 'prontuario:desfecho')))
  const podeMudarStatus = pode_('paciente:encaminhar') && opcoesStatus.length > 0

  const abrirEdicao = () => {
    const inicial: Record<string, string> = {}
    for (const campo of CAMPOS_CADASTRO) inicial[campo] = paciente[campo] ?? ''
    inicial.nascimento = nascimentoParaInput(nascimento)
    inicial.cpf = formatarCPF(paciente.cpf)
    setForm(inicial)
    setEditando(true)
  }

  const salvarEdicao = async (e: FormEvent) => {
    e.preventDefault()
    if (form.cpf?.trim() && form.cpf.replace(/\D/g, '') !== (paciente.cpf ?? '').replace(/\D/g, '') && !cpfValido(form.cpf)) {
      alert('CPF inválido: confira os dígitos ou deixe em branco.')
      return
    }
    // Só envia o que o cargo pode ver e alterar: recepção não sobrescreve dado clínico.
    const corpo: Record<string, string> = { ...form }
    if (!podeVitais) {
      delete corpo.alergias
      delete corpo.tipoSanguineo
      delete corpo.queixaPrincipal
    }
    if (await atualizar(corpo, 'Erro ao atualizar paciente.')) setEditando(false)
  }

  const registrarTriagem = async () => {
    if (await postar('triagens', triagem, 'Erro ao salvar triagem.')) setTriagem(TRIAGEM_VAZIA)
  }

  const salvarEscores = async () => {
    const g = escalaNumerica(glasgow)
    const b = escalaNumerica(braden)
    if (!g.vazia && !g.completa) return alert('Glasgow incompleto: preencha os três itens ou deixe todos vazios.')
    if (!b.vazia && !b.completa) return alert('Braden incompleto: preencha os seis itens ou deixe todos vazios.')
    if (g.vazia && b.vazia && dor === null) return alert('Avalie ao menos uma escala.')
    const ok = await postar('escores', {
      ...(g.vazia ? {} : { glasgow: g.numeros }),
      ...(b.vazia ? {} : { braden: b.numeros }),
      ...(dor === null ? {} : { dor }),
    }, 'Erro ao salvar escores.')
    if (ok) {
      setGlasgow(GLASGOW_VAZIO)
      setBraden(BRADEN_VAZIO)
      setDor(null)
    }
  }

  const registrarEvolucao = async () => {
    if (!soap.s && !soap.o && !soap.a && !soap.p) return
    const descricao = `S: ${soap.s}\nO: ${soap.o}\nA: ${soap.a}\nP: ${soap.p}`
    if (await postar('evolucoes', { descricao }, 'Erro ao registrar evolução.')) setSoap(SOAP_VAZIO)
  }

  const peso = Number.parseFloat(nutricao.peso)
  const altura = Number.parseFloat(nutricao.altura)
  const imc = peso > 0 && altura > 0 ? peso / (altura * altura) : 0
  const imcClasse = imc < 18.5 ? 'Abaixo do peso' : imc < 25 ? 'Eutrofia' : imc < 30 ? 'Sobrepeso' : 'Obesidade'

  const totalGlasgow = escalaNumerica(glasgow)
  const totalBraden = escalaNumerica(braden)

  const campoCadastro = (campo: string, rotulo: string, extras: { tipo?: string; inteira?: boolean; obrigatorio?: boolean; somenteLeitura?: boolean } = {}) => (
    <div className={`form-group${extras.inteira ? ' mod-largo' : ''}`} key={campo}>
      <label htmlFor={`ficha-${campo}`}>{rotulo}{extras.obrigatorio ? ' *' : ''}</label>
      <input id={`ficha-${campo}`} type={extras.tipo ?? 'text'} required={extras.obrigatorio} disabled={extras.somenteLeitura} value={form[campo] ?? ''} onChange={e => setForm({ ...form, [campo]: e.target.value })} />
    </div>
  )

  return (
    <div className="pac-pagina">
      {alergiaReal(paciente.alergias) && (
        <div className="pac-alerta-alergia" role="alert">
          <i className="las la-exclamation-triangle" aria-hidden="true"></i>
          <span>Paciente alérgico a: <strong>{paciente.alergias}</strong></span>
        </div>
      )}

      <PageHeader
        icon="las la-file-medical-alt"
        title="Prontuário eletrônico"
        subtitle={clinico ? undefined : 'Acesso apenas aos dados cadastrais'}
        actions={<div className="ui-page-actions pac-sem-impressao">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}><i className="las la-print" aria-hidden="true"></i> Imprimir</button>
          <Link href="/pacientes" className="btn btn-secondary"><i className="las la-arrow-left" aria-hidden="true"></i> Voltar</Link>
        </div>}
      />

      <Panel>
        <div className="pac-identidade">
          <div>
            <h2>{paciente.nome}</h2>
            <p>
              CPF: {paciente.cpf ? formatarCPF(paciente.cpf) : 'não informado'} | Nascimento: {formatarNascimento(nascimento) || 'não informado'}
              {nascimento ? ` (${idade} anos)` : ''} | Sexo: {paciente.sexo || 'não informado'}
            </p>
          </div>
          <div className="pac-acoes">
            <RiscoBadge classificacao={paciente.classificacao} />
            {podeMudarStatus ? (
              <div className="form-group pac-status-campo">
                <label className="sr-only" htmlFor="ficha-status">Status do atendimento</label>
                <select id="ficha-status" value={paciente.status} disabled={salvando} onChange={e => void atualizar({ status: e.target.value }, 'Erro ao atualizar o status.')}>
                  <option value={paciente.status}>{paciente.status}</option>
                  {opcoesStatus.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ) : <StatusBadge status={paciente.status} />}
            {terminal && <Badge>Somente leitura</Badge>}
          </div>
        </div>
      </Panel>

      {clinico && <Tabs label="Seções do prontuário" tabs={ABAS} active={tab} onChange={setTab} />}
      {clinico && tab === 'pep' && <Tabs label="Seções do PEP" tabs={SUB_ABAS} active={pepSubTab} onChange={setPepSubTab} />}

      <Panel>
        {tab === 'dados' && (!editando ? (
          <>
            {podeEditarCadastro && (
              <div className="mod-acoes pac-margem">
                <button type="button" className="btn btn-secondary" onClick={abrirEdicao}><i className="las la-pen" aria-hidden="true"></i> Editar cadastro</button>
              </div>
            )}
            <div className="pac-dados">
              {([
                ['Nome', paciente.nome], ['CPF', formatarCPF(paciente.cpf)], ['RG', paciente.rg], ['Nascimento', formatarNascimento(nascimento)],
                ['Sexo', paciente.sexo], ['Telefone', paciente.telefone], ['E-mail', paciente.email],
                ['Endereço', paciente.endereco], ['Convênio', paciente.convenio], ['Tipo sanguíneo', paciente.tipoSanguineo || 'Desconhecido'],
                ['Alergias', paciente.alergias || 'Não avaliado'], ['Mãe', paciente.mae], ['Pai', paciente.pai],
                ['Profissão', paciente.profissao], ['Estado civil', paciente.estadoCivil],
                ...(clinico ? [['Queixa principal', paciente.queixaPrincipal]] : []),
              ] as [string, string | null | undefined][]).map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <div className="pac-campo-rotulo">{rotulo}</div>
                  <div className="pac-campo-valor">{valor || '-'}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={salvarEdicao}>
            <div className="mod-form-grid">
              {campoCadastro('nome', 'Nome completo', { inteira: true, obrigatorio: true })}
              {campoCadastro('cpf', 'CPF')}
              {campoCadastro('rg', 'RG')}
              {campoCadastro('nascimento', 'Nascimento', { tipo: 'date' })}
              <div className="form-group">
                <label htmlFor="ficha-sexo">Sexo</label>
                <select id="ficha-sexo" value={form.sexo ?? ''} onChange={e => setForm({ ...form, sexo: e.target.value })}>
                  <option value="">Não informado</option><option>Masculino</option><option>Feminino</option><option>Outro</option>
                </select>
              </div>
              {campoCadastro('telefone', 'Telefone', { tipo: 'tel' })}
              {campoCadastro('email', 'E-mail', { tipo: 'email' })}
              {campoCadastro('endereco', 'Endereço', { inteira: true })}
              {campoCadastro('mae', 'Mãe')}
              {campoCadastro('pai', 'Pai')}
              {campoCadastro('convenio', 'Convênio')}
              {campoCadastro('profissao', 'Profissão')}
              {campoCadastro('estadoCivil', 'Estado civil')}
              <div className="form-group">
                <label htmlFor="ficha-tipo">Tipo sanguíneo</label>
                <select id="ficha-tipo" disabled={!podeVitais} value={form.tipoSanguineo ?? ''} onChange={e => setForm({ ...form, tipoSanguineo: e.target.value })}>
                  <option value="">Desconhecido</option>
                  {form.tipoSanguineo && !TIPOS_SANGUINEOS.includes(form.tipoSanguineo) && <option>{form.tipoSanguineo}</option>}
                  {TIPOS_SANGUINEOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {campoCadastro('alergias', 'Alergias', { inteira: true, somenteLeitura: !podeVitais })}
              {clinico && campoCadastro('queixaPrincipal', 'Queixa principal', { inteira: true, somenteLeitura: !podeVitais })}
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        ))}

        {clinico && tab === 'triagem' && (
          <>
            {pode_('triagem:registrar') && (
              <div className="pac-margem">
                <div className="mod-form-grid">
                  <div className="form-group">
                    <label htmlFor="tri-classificacao">Classificação de risco *</label>
                    <select id="tri-classificacao" value={triagem.classificacao} onChange={e => setTriagem({ ...triagem, classificacao: e.target.value })}>
                      <option value="">Selecione...</option>
                      <option value="Vermelho">Vermelho (emergência)</option>
                      <option value="Laranja">Laranja (muito urgente)</option>
                      <option value="Amarelo">Amarelo (urgente)</option>
                      <option value="Verde">Verde (pouco urgente)</option>
                      <option value="Azul">Azul (não urgente)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="tri-fluxograma">Fluxograma</label>
                    <select id="tri-fluxograma" value={triagem.fluxograma} onChange={e => setTriagem({ ...triagem, fluxograma: e.target.value })}>
                      <option value="">Selecione...</option>
                      <option value="Dor torácica">Dor torácica / cardiopatia</option>
                      <option value="Dispneia">Dispneia / insuficiência respiratória</option>
                      <option value="Febre">Febre / síndrome infecciosa</option>
                      <option value="Trauma">Trauma / acidente / queda</option>
                      <option value="Dor abdominal">Dor abdominal / abdome agudo</option>
                      <option value="Cefaleia">Cefaleia / alteração neurológica</option>
                      <option value="Outros">Outras queixas clínicas</option>
                    </select>
                  </div>
                  {([['pressao', 'PA (mmHg)', 'text', '120/80'], ['frequenciaC', 'FC (bpm)', 'number', ''], ['frequenciaR', 'FR (irpm)', 'number', ''], ['temperatura', 'Temp (°C)', 'number', ''], ['saturacao', 'SpO2 (%)', 'number', ''], ['glicemia', 'Glicemia (mg/dL)', 'number', '']] as const).map(([campo, rotulo, tipo, dica]) => (
                    <div className="form-group" key={campo}>
                      <label htmlFor={`tri-${campo}`}>{rotulo}</label>
                      <input id={`tri-${campo}`} type={tipo} step={campo === 'temperatura' ? '0.1' : undefined} placeholder={dica} value={triagem[campo]} onChange={e => setTriagem({ ...triagem, [campo]: e.target.value })} />
                    </div>
                  ))}
                  <div className="form-group">
                    <label htmlFor="tri-avpu">Nível de consciência</label>
                    <select id="tri-avpu" value={triagem.avpu} onChange={e => setTriagem({ ...triagem, avpu: e.target.value })}>
                      <option value="">Não avaliado</option>
                      <option value="A">A - Alerta</option>
                      <option value="V">V - Responde à voz</option>
                      <option value="P">P - Responde à dor</option>
                      <option value="U">U - Inconsciente</option>
                    </select>
                  </div>
                </div>

                <div className={`pac-mews${mews.completo ? ` ui-tone-${TOM_MEWS[mews.faixa]}` : ''}`} role="status">
                  <div className="pac-campo-rotulo">Escore MEWS</div>
                  {mews.completo ? (
                    <><strong>{mews.total}</strong>{mews.rotulo}</>
                  ) : (
                    <><strong>Incompleto</strong>Falta: {mews.faltando.join(', ')}</>
                  )}
                  {!adulto && <p className="mod-aviso mod-aviso-atencao">MEWS é validado para adultos: {nascimento ? `paciente com ${idade} anos` : 'idade não informada'}. Interprete com cautela.</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="tri-queixa">Queixa principal</label>
                  <textarea id="tri-queixa" rows={2} value={triagem.queixa} onChange={e => setTriagem({ ...triagem, queixa: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="tri-hda">História da doença atual e antecedentes</label>
                  <textarea id="tri-hda" rows={3} value={triagem.observacoes} onChange={e => setTriagem({ ...triagem, observacoes: e.target.value })} />
                </div>
                <button type="button" className="btn btn-primary pac-largo" onClick={registrarTriagem} disabled={salvando}>{salvando ? 'Registrando...' : 'Registrar triagem'}</button>
              </div>
            )}

            <h2 className="pac-subtitulo">Histórico de triagens</h2>
            {paciente.triagens?.length ? paciente.triagens.map((t, i) => (
              <Cartao key={t.id} titulo={`Triagem #${(paciente.triagens?.length ?? 0) - i}`} autor={t.profissional} data={t.createdAt}>
                <div className="pac-dados">
                  <span><RiscoBadge classificacao={t.classificacao} /></span><span><strong>PA:</strong> {t.pressao || '-'}</span>
                  <span><strong>Temp:</strong> {t.temperatura ?? '-'}</span><span><strong>FC:</strong> {t.frequenciaC ?? '-'}</span>
                  <span><strong>FR:</strong> {t.frequenciaR ?? '-'}</span><span><strong>SpO2:</strong> {t.saturacao ?? '-'}</span>
                  <span><strong>HGT:</strong> {t.glicemia ?? '-'}</span>
                </div>
                {t.queixa && <p className="pac-preformatado"><strong>Queixa:</strong> {t.queixa}</p>}
                {t.observacoes && <p className="pac-preformatado"><strong>HDA:</strong> {t.observacoes}</p>}
              </Cartao>
            )) : <EmptyState message="Nenhuma triagem registrada." />}
          </>
        )}

        {clinico && tab === 'escores' && (
          <>
            {pode_('escores:registrar') && (
              <div className="pac-margem">
                <p className="pac-margem">Cada escala é opcional e independente. Só é gravado o que for avaliado agora.</p>
                <section className="pac-escala">
                  <h2>Escala de Glasgow</h2>
                  <div className="mod-form-grid">
                    {(Object.keys(OPCOES_GLASGOW) as (keyof typeof GLASGOW_VAZIO)[]).map(item => (
                      <div className="form-group" key={item}>
                        <label htmlFor={`gl-${item}`}>{ROTULO_GLASGOW[item]}</label>
                        <select id={`gl-${item}`} value={glasgow[item]} onChange={e => setGlasgow({ ...glasgow, [item]: e.target.value })}>
                          <option value="">Não avaliado</option>
                          {OPCOES_GLASGOW[item].map(([nota, texto]) => <option key={nota} value={nota}>{nota} - {texto}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="pac-total"><span>Total</span><span>{totalGlasgow.completa ? somar(totalGlasgow.numeros) : 'Não avaliado'}</span></div>
                </section>
                <section className="pac-escala">
                  <h2>Escala de Braden</h2>
                  <div className="mod-form-grid">
                    {(Object.keys(MAXIMOS_BRADEN) as (keyof typeof BRADEN_VAZIO)[]).map(item => (
                      <div className="form-group" key={item}>
                        <label htmlFor={`br-${item}`}>{ROTULO_BRADEN[item]}</label>
                        <select id={`br-${item}`} value={braden[item]} onChange={e => setBraden({ ...braden, [item]: e.target.value })}>
                          <option value="">Não avaliado</option>
                          {Array.from({ length: MAXIMOS_BRADEN[item] }, (_, i) => MAXIMOS_BRADEN[item] - i).map(nota => <option key={nota} value={nota}>{nota}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="pac-total"><span>Total</span><span>{totalBraden.completa ? somar(totalBraden.numeros) : 'Não avaliado'}</span></div>
                </section>
                <section className="pac-escala">
                  <h2>Escala de dor (0 a 10)</h2>
                  <div className="pac-dor" role="group" aria-label="Intensidade da dor">
                    {Array.from({ length: 11 }, (_, valor) => (
                      <button key={valor} type="button" aria-pressed={dor === valor} onClick={() => setDor(dor === valor ? null : valor)}>{valor}</button>
                    ))}
                  </div>
                </section>
                <button type="button" className="btn btn-primary pac-largo" onClick={salvarEscores} disabled={salvando}>Salvar escores avaliados</button>
              </div>
            )}
            <h2 className="pac-subtitulo">Histórico de escores</h2>
            {paciente.escoresClinicos?.length ? paciente.escoresClinicos.map(e => (
              <Cartao key={e.id} autor={e.profissional} data={e.createdAt}>
                <div className="pac-dados">
                  {e.glasgow && <span><strong>Glasgow:</strong> {somar(e.glasgow)}</span>}
                  {e.braden && <span><strong>Braden:</strong> {somar(e.braden)}</span>}
                  {e.dor !== null && <span><strong>Dor:</strong> {e.dor}</span>}
                </div>
              </Cartao>
            )) : <EmptyState message="Nenhum escore registrado." />}
          </>
        )}

        {clinico && tab === 'pep' && pepSubTab === 'soap' && (
          <>
            {pode_('evolucao:registrar') && (
              <div className="pac-margem">
                {([['s', 'S - Subjetivo'], ['o', 'O - Objetivo'], ['a', 'A - Avaliação'], ['p', 'P - Plano']] as const).map(([campo, rotulo]) => (
                  <div className="form-group" key={campo}>
                    <label htmlFor={`soap-${campo}`}>{rotulo}</label>
                    <textarea id={`soap-${campo}`} rows={2} value={soap[campo]} onChange={e => setSoap({ ...soap, [campo]: e.target.value })} />
                  </div>
                ))}
                <button type="button" className="btn btn-primary pac-largo" onClick={registrarEvolucao} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar evolução'}</button>
              </div>
            )}
            {paciente.evolucoes?.length ? paciente.evolucoes.map(ev => (
              <Cartao key={ev.id} titulo={ev.tipo} autor={ev.profissional} data={ev.createdAt}><p className="pac-preformatado">{ev.descricao}</p></Cartao>
            )) : <EmptyState message="Nenhuma evolução registrada." />}
          </>
        )}

        {clinico && tab === 'pep' && pepSubTab === 'sinais' && (
          <>
            {pode_('sinais:registrar') && (
              <div className="pac-margem">
                <div className="mod-form-grid">
                  {([['pressao', 'PA', 'text'], ['fc', 'FC', 'number'], ['fr', 'FR', 'number'], ['temp', 'Temp', 'number'], ['satO2', 'SpO2', 'number'], ['glicemia', 'Glicemia', 'number']] as const).map(([campo, rotulo, tipo]) => (
                    <div className="form-group" key={campo}>
                      <label htmlFor={`sv-${campo}`}>{rotulo}</label>
                      <input id={`sv-${campo}`} type={tipo} step={campo === 'temp' ? '0.1' : undefined} value={novoSinal[campo]} onChange={e => setNovoSinal({ ...novoSinal, [campo]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-primary pac-largo" disabled={salvando} onClick={async () => {
                  if (await postar('sinais', novoSinal, 'Erro ao registrar sinal vital.')) setNovoSinal(SINAL_VAZIO)
                }}>Registrar sinais vitais</button>
              </div>
            )}
            {paciente.sinaisVitais?.length ? (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead><tr><th scope="col">Data/hora</th><th scope="col">PA</th><th scope="col">FC</th><th scope="col">FR</th><th scope="col">Temp</th><th scope="col">SpO2</th><th scope="col">HGT</th><th scope="col">Autor</th></tr></thead>
                  <tbody>
                    {paciente.sinaisVitais.map(s => (
                      <tr key={s.id}><td>{formatarDataHora(s.createdAt)}</td><td>{s.pressao || '-'}</td><td>{s.fc || '-'}</td><td>{s.fr || '-'}</td><td>{s.temp || '-'}</td><td>{s.satO2 || '-'}</td><td>{s.glicemia || '-'}</td><td>{s.profissional || '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message="Nenhum sinal vital registrado." />}
          </>
        )}

        {clinico && tab === 'pep' && pepSubTab === 'medicamentos' && (
          <>
            {pode_('prescricao:registrar') && (
              <div className="pac-margem">
                <div className="mod-form-grid">
                  {([['medicamento', 'Medicamento *'], ['dose', 'Dose'], ['via', 'Via'], ['frequencia', 'Frequência']] as const).map(([campo, rotulo]) => (
                    <div className="form-group" key={campo}>
                      <label htmlFor={`med-${campo}`}>{rotulo}</label>
                      <input id={`med-${campo}`} value={novoMed[campo]} onChange={e => setNovoMed({ ...novoMed, [campo]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-primary pac-largo" disabled={salvando || !novoMed.medicamento.trim()} onClick={async () => {
                  if (await postar('prescricoes', novoMed, 'Erro ao registrar prescrição.')) setNovoMed(MED_VAZIO)
                }}>Adicionar à prescrição</button>
              </div>
            )}
            {paciente.prescricoes?.length ? paciente.prescricoes.map(m => (
              <Cartao key={m.id} titulo={<><i className="las la-pills" aria-hidden="true"></i> {m.medicamento}</>} autor={m.profissional} data={m.createdAt}>
                <p className="pac-preformatado">{[m.dose, m.via, m.frequencia].filter(Boolean).join(' - ') || 'Sem posologia informada'}</p>
              </Cartao>
            )) : <EmptyState message="Nenhum medicamento prescrito." />}
          </>
        )}

        {clinico && tab === 'pep' && pepSubTab === 'exames' && (
          <>
            {pode_('exame:solicitar') && (
              <div className="pac-margem">
                <div className="mod-form-grid">
                  <div className="form-group">
                    <label htmlFor="ex-nome">Nome do exame *</label>
                    <input id="ex-nome" maxLength={160} value={novoExame.nome} onChange={e => setNovoExame({ ...novoExame, nome: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ex-tipo">Tipo</label>
                    <select id="ex-tipo" value={novoExame.tipo} onChange={e => setNovoExame({ ...novoExame, tipo: e.target.value })}>
                      <option value="laboratorio">Laboratório</option>
                      <option value="imagem">Imagem</option>
                    </select>
                  </div>
                </div>
                <button type="button" className="btn btn-primary pac-largo" disabled={salvando || !novoExame.nome.trim()} onClick={async () => {
                  if (await postar('exames', novoExame, 'Erro ao solicitar exame.')) setNovoExame({ nome: '', tipo: 'laboratorio' })
                }}>Solicitar exame</button>
              </div>
            )}
            {paciente.exames?.length ? (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead><tr><th scope="col">Data</th><th scope="col">Exame</th><th scope="col">Status</th><th scope="col">Resultado</th></tr></thead>
                  <tbody>
                    {paciente.exames.map(ex => (
                      <tr key={ex.id}><td>{formatarDataHora(ex.createdAt)}</td><td>{ex.nome}</td><td>{ex.status}</td><td>{ex.resultado || '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message="Nenhum exame cadastrado." />}
          </>
        )}

        {clinico && tab === 'nutricao' && (
          <>
            {pode_('nutricao:registrar') && (
              <div className="pac-margem">
                <div className="mod-form-grid">
                  <div className="form-group"><label htmlFor="nu-peso">Peso (kg)</label><input id="nu-peso" type="number" step="0.1" value={nutricao.peso} onChange={e => setNutricao({ ...nutricao, peso: e.target.value })} /></div>
                  <div className="form-group"><label htmlFor="nu-altura">Altura (m)</label><input id="nu-altura" type="number" step="0.01" value={nutricao.altura} onChange={e => setNutricao({ ...nutricao, altura: e.target.value })} /></div>
                </div>
                {imc > 0 && <div className="pac-total pac-margem"><span>IMC: {imcClasse}</span><span>{imc.toFixed(1)}</span></div>}
                <div className="form-group">
                  <label htmlFor="nu-dieta">Prescrição de dieta</label>
                  <select id="nu-dieta" value={nutricao.dieta} onChange={e => setNutricao({ ...nutricao, dieta: e.target.value })}>
                    <option value="">Não informada</option><option>Via Oral</option><option>Branda</option><option>Pastosa</option><option>Líquida</option><option>Enteral</option><option>Jejum Absoluto</option>
                  </select>
                </div>
                <div className="form-group"><label htmlFor="nu-restricoes">Restrições</label><input id="nu-restricoes" value={nutricao.restricoes} onChange={e => setNutricao({ ...nutricao, restricoes: e.target.value })} /></div>
                <button type="button" className="btn btn-primary pac-largo" disabled={salvando} onClick={async () => {
                  if (await postar('nutricao', nutricao, 'Erro ao salvar nutrição.')) setNutricao(NUTRI_VAZIA)
                }}>Registrar avaliação nutricional</button>
              </div>
            )}
            {paciente.avaliacoesNutri?.length ? paciente.avaliacoesNutri.map(n => (
              <Cartao key={n.id} autor={n.profissional} data={n.createdAt}>
                <p className="pac-preformatado">Peso: {n.peso || '-'} | Altura: {n.altura || '-'} | Dieta: {n.dieta || '-'}{n.restricoes ? `\nRestrições: ${n.restricoes}` : ''}</p>
              </Cartao>
            )) : <EmptyState message="Nenhuma avaliação nutricional." />}
          </>
        )}

        {clinico && tab === 'medico' && (
          <>
            {pode_('medico:registrar') && (
              <div className="pac-margem">
                <div className="mod-form-grid">
                  <div className="form-group"><label htmlFor="me-crm">CRM informado</label><input id="me-crm" maxLength={40} value={medico.crm} onChange={e => setMedico({ ...medico, crm: e.target.value })} /></div>
                  <div className="form-group"><label htmlFor="me-esp">Especialidade</label><input id="me-esp" maxLength={120} value={medico.especialidade} onChange={e => setMedico({ ...medico, especialidade: e.target.value })} /></div>
                </div>
                <BuscaCid onEscolher={cid => setMedico(m => ({ ...m, diagnostico: `${m.diagnostico.trim() ? `${m.diagnostico.trim()}\n` : ''}${cid.codigo} - ${cid.descricao}` }))} />
                <div className="form-group"><label htmlFor="me-diag">Hipótese diagnóstica / CID-10</label><textarea id="me-diag" rows={3} value={medico.diagnostico} onChange={e => setMedico({ ...medico, diagnostico: e.target.value })} /></div>
                <div className="form-group"><label htmlFor="me-cond">Conduta médica</label><textarea id="me-cond" rows={4} value={medico.conduta} onChange={e => setMedico({ ...medico, conduta: e.target.value })} /></div>
                <button type="button" className="btn btn-primary pac-largo" disabled={salvando} onClick={async () => {
                  if (await postar('medico', medico, 'Erro ao salvar avaliação médica.')) setMedico(MEDICO_VAZIO)
                }}>Salvar avaliação médica</button>
              </div>
            )}
            {paciente.avaliacoesMedicas?.length ? paciente.avaliacoesMedicas.map(m => (
              <Cartao key={m.id} autor={m.profissional} data={m.createdAt}>
                <p className="pac-preformatado">{m.crm ? `CRM informado: ${m.crm}\n` : ''}{m.especialidade ? `Especialidade: ${m.especialidade}\n` : ''}{m.diagnostico ? `Diagnóstico: ${m.diagnostico}\n` : ''}{m.conduta ? `Conduta: ${m.conduta}` : ''}</p>
              </Cartao>
            )) : <EmptyState message="Nenhuma avaliação médica." />}
          </>
        )}

        {clinico && tab === 'enfermagem' && (
          <>
            {pode_('enfermagem:registrar') && (
              <div className="pac-margem">
                <div className="form-group"><label htmlFor="en-coren">COREN informado</label><input id="en-coren" maxLength={40} value={enfermagem.coren} onChange={e => setEnfermagem({ ...enfermagem, coren: e.target.value })} /></div>
                <div className="form-group"><label htmlFor="en-evo">Evolução de enfermagem</label><textarea id="en-evo" rows={4} value={enfermagem.evolucao} onChange={e => setEnfermagem({ ...enfermagem, evolucao: e.target.value })} /></div>
                <div className="form-group"><label htmlFor="en-pre">Prescrição de enfermagem</label><textarea id="en-pre" rows={4} value={enfermagem.prescricao} onChange={e => setEnfermagem({ ...enfermagem, prescricao: e.target.value })} /></div>
                <button type="button" className="btn btn-primary pac-largo" disabled={salvando} onClick={async () => {
                  if (await postar('enfermagem', enfermagem, 'Erro ao salvar anotação de enfermagem.')) setEnfermagem(ENF_VAZIA)
                }}>Salvar registro</button>
              </div>
            )}
            {paciente.anotacoesEnf?.length ? paciente.anotacoesEnf.map(a => (
              <Cartao key={a.id} autor={a.profissional} data={a.createdAt}>
                <p className="pac-preformatado">{a.coren ? `COREN informado: ${a.coren}\n` : ''}{a.evolucao ? `Evolução: ${a.evolucao}\n` : ''}{a.prescricao ? `Prescrição: ${a.prescricao}` : ''}</p>
              </Cartao>
            )) : <EmptyState message="Nenhuma anotação de enfermagem." />}
          </>
        )}

        {clinico && tab === 'documentos' && (
          <p role="note" className="mod-aviso mod-aviso-atencao"><strong>Anexos desativados.</strong> O sistema ainda não tem armazenamento seguro e auditável de arquivos clínicos.</p>
        )}

        {clinico && tab === 'timeline' && (
          <>
            {pode_('evolucao:registrar') && (
              <div className="pac-margem">
                <div className="form-group">
                  <label htmlFor="tl-anotacao">Nova anotação</label>
                  <textarea id="tl-anotacao" rows={2} value={anotacao} onChange={e => setAnotacao(e.target.value)} />
                </div>
                <button type="button" className="btn btn-primary" disabled={salvando || !anotacao.trim()} onClick={async () => {
                  if (await postar('timeline', { descricao: anotacao }, 'Erro ao publicar anotação.')) setAnotacao('')
                }}>Publicar anotação</button>
              </div>
            )}
            {paciente.timelineEvents?.length ? paciente.timelineEvents.map(t => (
              <Cartao key={t.id} titulo={t.tipo} autor={t.user} data={t.createdAt}><p className="pac-preformatado">{t.descricao}</p></Cartao>
            )) : <EmptyState message="Nenhum evento registrado." />}
          </>
        )}
      </Panel>
    </div>
  )
}
