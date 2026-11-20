'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Badge, EmptyState, ErrorState, LoadingState, Panel } from '@/components/ui'
import BuscaCid from '@/components/ui/BuscaCid'
import { pode } from '@/lib/permissions'
import { formatarDataHora } from '@/lib/utils'
import { erroDaApi } from '../componentes'

// Seção Internação da ficha (item 9): internar, trocar leito, registrar saída e histórico.

type Movimentacao = { id: string; setor: string; leito: string | null; inicioEm: string; fimEm: string | null; motivo: string | null; usuarioNome: string | null }
type Internacao = {
  id: string; entradaEm: string; setor: string; leito: string | null; utiLeitoId: string | null
  motivo: string | null; cid: string | null; medicoResponsavelNome: string | null; registradoPorNome: string | null
  saidaEm: string | null; tipoSaida: 'ALTA_MEDICA' | 'TRANSFERENCIA' | 'EVASAO' | 'OBITO' | null
  destinoTransferencia: string | null; motivoSaida: string | null; encerradoPorNome: string | null; origem: string
  movimentacoes: Movimentacao[]
}
type Opcoes = { medicos: { id: string; nome: string; especialidade: string | null }[]; leitosUti: { id: string; numero: number; tipo: string }[] }
type Formulario = 'internar' | 'leito' | 'saida' | null

const ROTULO_SAIDA = { ALTA_MEDICA: 'Alta médica', TRANSFERENCIA: 'Transferência', EVASAO: 'Evasão', OBITO: 'Óbito' } as const
const TOM_SAIDA = { ALTA_MEDICA: 'success', TRANSFERENCIA: 'neutral', EVASAO: 'danger', OBITO: 'neutral' } as const
const SETORES = ['Enfermaria', 'Observação do pronto-socorro', 'Apartamento', 'Pediatria', 'Maternidade', 'Isolamento']
const SETOR_UTI = 'UTI'

const DESTINO_VAZIO = { setor: 'Enfermaria', leito: '', utiLeitoId: '' }
const ENTRADA_VAZIA = { ...DESTINO_VAZIO, motivo: '', cid: '', medicoResponsavelId: '' }
const SAIDA_VAZIA = { tipoSaida: '', destinoTransferencia: '', motivoSaida: '' }

const leitoTexto = (setor: string, leito: string | null) => `${setor}${leito ? `, leito ${leito}` : ', leito a definir'}`

function permanencia(desde: string, ate: string | null) {
  const dias = Math.floor(((ate ? new Date(ate).getTime() : Date.now()) - new Date(desde).getTime()) / 86_400_000)
  return dias < 1 ? 'menos de 1 dia' : dias === 1 ? '1 dia' : `${dias} dias`
}

export default function SecaoInternacao({ pacienteId, cargo, terminal, onAlterado }: {
  pacienteId: string
  cargo: string | undefined
  terminal: boolean
  onAlterado: () => void
}) {
  const [internacoes, setInternacoes] = useState<Internacao[] | null>(null)
  const [erro, setErro] = useState('')
  const [recarga, setRecarga] = useState(0)
  const [aberto, setAberto] = useState<Formulario>(null)
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null)
  const [entrada, setEntrada] = useState(ENTRADA_VAZIA)
  const [destino, setDestino] = useState({ ...DESTINO_VAZIO, motivo: '' })
  const [saida, setSaida] = useState(SAIDA_VAZIA)
  const [enviando, setEnviando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const podeGerir = pode(cargo, 'internacao:gerir') && !terminal
  const podeUti = pode(cargo, 'uti:gerir')
  const podeDesfecho = pode(cargo, 'prontuario:desfecho')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/internacoes?pacienteId=${encodeURIComponent(pacienteId)}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error(await erroDaApi(res, 'Não foi possível carregar as internações.'))
        setInternacoes(await res.json() as Internacao[])
        setErro('')
      })
      .catch(e => { if (!controller.signal.aborted) setErro(e instanceof Error ? e.message : 'Não foi possível carregar as internações.') })
    return () => controller.abort()
  }, [pacienteId, recarga])

  const abrir = useCallback((qual: Formulario) => {
    setErroForm('')
    setAberto(atual => (atual === qual ? null : qual))
    if ((qual === 'internar' || qual === 'leito') && !opcoes) {
      fetch('/api/internacoes/opcoes').then(r => (r.ok ? r.json() : null)).then(d => { if (d) setOpcoes(d as Opcoes) }).catch(() => undefined)
    }
  }, [opcoes])

  if (erro) return <Panel title="Internação" icon="las la-procedures"><ErrorState message={erro} onRetry={() => setRecarga(n => n + 1)} /></Panel>
  if (!internacoes) return <Panel title="Internação" icon="las la-procedures"><LoadingState message="Carregando internações..." /></Panel>

  const atual = internacoes.find(i => !i.saidaEm) ?? null
  const anteriores = internacoes.filter(i => i.saidaEm)
  const naUti = !!atual?.utiLeitoId
  const tiposSaida = (['ALTA_MEDICA', 'TRANSFERENCIA', 'EVASAO'] as const).filter(t => t === 'EVASAO' || podeDesfecho)
  const podeMoverAtual = podeGerir && (!naUti || podeUti)

  const enviar = async (url: string, metodo: 'POST' | 'PATCH', corpo: Record<string, unknown>, erroPadrao: string) => {
    if (enviando) return
    setEnviando(true)
    setErroForm('')
    try {
      const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      if (!res.ok) { setErroForm(await erroDaApi(res, erroPadrao)); return }
      setAberto(null)
      setEntrada(ENTRADA_VAZIA)
      setDestino({ ...DESTINO_VAZIO, motivo: '' })
      setSaida(SAIDA_VAZIA)
      setOpcoes(null)
      setRecarga(n => n + 1)
      onAlterado()
    } catch {
      setErroForm(`${erroPadrao} Falha de conexão.`)
    } finally {
      setEnviando(false)
    }
  }

  const corpoDestino = (d: typeof DESTINO_VAZIO) => d.setor === SETOR_UTI
    ? { utiLeitoId: d.utiLeitoId }
    : { setor: d.setor, leito: d.leito.trim() || null }

  const internar = (e: FormEvent) => {
    e.preventDefault()
    void enviar('/api/internacoes', 'POST', {
      pacienteId, ...corpoDestino(entrada), motivo: entrada.motivo, cid: entrada.cid || null, medicoResponsavelId: entrada.medicoResponsavelId || null,
    }, 'Erro ao internar o paciente.')
  }
  const trocar = (e: FormEvent) => {
    e.preventDefault()
    if (!atual) return
    void enviar(`/api/internacoes/${atual.id}`, 'PATCH', { acao: 'trocar-leito', ...corpoDestino(destino), motivo: destino.motivo || null }, 'Erro ao trocar o leito.')
  }
  const encerrar = (e: FormEvent) => {
    e.preventDefault()
    if (!atual) return
    void enviar(`/api/internacoes/${atual.id}`, 'PATCH', {
      acao: 'encerrar', tipoSaida: saida.tipoSaida, destinoTransferencia: saida.destinoTransferencia || null, motivoSaida: saida.motivoSaida || null,
    }, 'Erro ao registrar a saída.')
  }

  // Setor e leito: setor livre ou leito de UTI cadastrado (só para quem gere UTI).
  const camposDestino = (prefixo: string, valor: typeof DESTINO_VAZIO, mudar: (v: typeof DESTINO_VAZIO) => void) => (
    <>
      <div className="form-group">
        <label htmlFor={`${prefixo}-setor`}>Setor *</label>
        <select id={`${prefixo}-setor`} required value={valor.setor} onChange={e => mudar({ ...valor, setor: e.target.value, utiLeitoId: '' })}>
          {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
          {podeUti && <option value={SETOR_UTI}>UTI</option>}
        </select>
      </div>
      {valor.setor === SETOR_UTI ? (
        <div className="form-group">
          <label htmlFor={`${prefixo}-uti`}>Leito de UTI *</label>
          <select id={`${prefixo}-uti`} required value={valor.utiLeitoId} onChange={e => mudar({ ...valor, utiLeitoId: e.target.value })}>
            <option value="">{opcoes ? (opcoes.leitosUti.length ? 'Selecione um leito livre' : 'Nenhum leito de UTI livre') : 'Carregando leitos...'}</option>
            {opcoes?.leitosUti.map(l => <option key={l.id} value={l.id}>Leito {l.numero} ({l.tipo.toLowerCase()})</option>)}
          </select>
        </div>
      ) : (
        <div className="form-group">
          <label htmlFor={`${prefixo}-leito`}>Leito</label>
          <input id={`${prefixo}-leito`} maxLength={40} placeholder="Ex.: 204-B" value={valor.leito} onChange={e => mudar({ ...valor, leito: e.target.value })} />
        </div>
      )}
    </>
  )

  const acoes = podeGerir && (
    <div className="mod-acoes">
      {!atual && <button type="button" className="btn btn-primary" aria-expanded={aberto === 'internar'} onClick={() => abrir('internar')}><i className="las la-procedures" aria-hidden="true"></i> Internar</button>}
      {atual && podeMoverAtual && <button type="button" className="btn btn-secondary" aria-expanded={aberto === 'leito'} onClick={() => abrir('leito')}><i className="las la-exchange-alt" aria-hidden="true"></i> Trocar leito</button>}
      {atual && podeMoverAtual && <button type="button" className="btn btn-secondary" aria-expanded={aberto === 'saida'} onClick={() => abrir('saida')}><i className="las la-sign-out-alt" aria-hidden="true"></i> Registrar saída</button>}
    </div>
  )

  const avisoErro = erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>

  return (
    <Panel title="Internação" icon="las la-procedures" actions={acoes || undefined}>
      {atual ? (
        <div className="pac-dados pac-margem">
          <div><div className="pac-campo-rotulo">Leito atual</div><div className="pac-campo-valor"><strong>{leitoTexto(atual.setor, atual.leito)}</strong></div></div>
          <div><div className="pac-campo-rotulo">Entrada</div><div className="pac-campo-valor">{formatarDataHora(atual.entradaEm)} ({permanencia(atual.entradaEm, null)})</div></div>
          <div><div className="pac-campo-rotulo">Médico responsável</div><div className="pac-campo-valor">{atual.medicoResponsavelNome || 'Não informado'}</div></div>
          <div><div className="pac-campo-rotulo">Motivo da internação</div><div className="pac-campo-valor">{atual.cid ? `${atual.cid} · ` : ''}{atual.motivo || 'Não informado'}</div></div>
        </div>
      ) : (
        <p className="pac-campo-valor pac-margem">{terminal ? 'Prontuário encerrado.' : 'Paciente sem internação aberta.'}</p>
      )}

      {aberto === 'internar' && !atual && (
        <form onSubmit={internar} aria-label="Internar paciente">
          <h3 className="pac-subtitulo">Internar paciente</h3>
          <div className="mod-form-grid">
            {camposDestino('int', entrada, d => setEntrada({ ...entrada, ...d }))}
            <div className="form-group">
              <label htmlFor="int-medico">Médico responsável</label>
              <select id="int-medico" value={entrada.medicoResponsavelId} onChange={e => setEntrada({ ...entrada, medicoResponsavelId: e.target.value })}>
                <option value="">Não definido</option>
                {opcoes?.medicos.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` (${m.especialidade})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="int-cid">CID-10</label>
              <input id="int-cid" maxLength={12} placeholder="Busque abaixo ou digite" value={entrada.cid} onChange={e => setEntrada({ ...entrada, cid: e.target.value.toUpperCase() })} />
            </div>
            <div className="mod-largo"><BuscaCid onEscolher={cid => setEntrada(v => ({ ...v, cid: cid.codigo, motivo: v.motivo.trim() ? v.motivo : cid.descricao }))} /></div>
            <div className="form-group mod-largo">
              <label htmlFor="int-motivo">Motivo da internação *</label>
              <textarea id="int-motivo" rows={3} required maxLength={2000} value={entrada.motivo} onChange={e => setEntrada({ ...entrada, motivo: e.target.value })} />
            </div>
          </div>
          {avisoErro}
          <div className="mod-acoes">
            <button type="button" className="btn btn-secondary" onClick={() => setAberto(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={enviando}><i className="las la-check" aria-hidden="true"></i> {enviando ? 'Internando...' : 'Confirmar internação'}</button>
          </div>
        </form>
      )}

      {aberto === 'leito' && atual && (
        <form onSubmit={trocar} aria-label="Trocar leito">
          <h3 className="pac-subtitulo">Trocar leito</h3>
          <div className="mod-form-grid">
            {camposDestino('troca', destino, d => setDestino({ ...destino, ...d }))}
            <div className="form-group mod-largo">
              <label htmlFor="troca-motivo">Motivo da troca</label>
              <input id="troca-motivo" maxLength={2000} value={destino.motivo} onChange={e => setDestino({ ...destino, motivo: e.target.value })} />
            </div>
          </div>
          {avisoErro}
          <div className="mod-acoes">
            <button type="button" className="btn btn-secondary" onClick={() => setAberto(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={enviando}><i className="las la-check" aria-hidden="true"></i> {enviando ? 'Salvando...' : 'Confirmar troca'}</button>
          </div>
        </form>
      )}

      {aberto === 'saida' && atual && (
        <form onSubmit={encerrar} aria-label="Registrar saída da internação">
          <h3 className="pac-subtitulo">Registrar saída</h3>
          <div className="mod-form-grid">
            <div className="form-group">
              <label htmlFor="saida-tipo">Tipo de saída *</label>
              <select id="saida-tipo" required value={saida.tipoSaida} onChange={e => setSaida({ ...saida, tipoSaida: e.target.value })}>
                <option value="">Selecione</option>
                {tiposSaida.map(t => <option key={t} value={t}>{ROTULO_SAIDA[t]}</option>)}
              </select>
            </div>
            {saida.tipoSaida === 'TRANSFERENCIA' && (
              <div className="form-group">
                <label htmlFor="saida-destino">Destino da transferência *</label>
                <input id="saida-destino" required maxLength={200} placeholder="Hospital ou serviço de destino" value={saida.destinoTransferencia} onChange={e => setSaida({ ...saida, destinoTransferencia: e.target.value })} />
              </div>
            )}
            <div className="form-group mod-largo">
              <label htmlFor="saida-motivo">Motivo / resumo da saída</label>
              <textarea id="saida-motivo" rows={2} maxLength={2000} value={saida.motivoSaida} onChange={e => setSaida({ ...saida, motivoSaida: e.target.value })} />
            </div>
          </div>
          {!podeDesfecho && <p className="mod-aviso pac-margem">Alta e transferência são registradas pelo médico. Óbito, no módulo de Óbitos.</p>}
          {avisoErro}
          <div className="mod-acoes">
            <button type="button" className="btn btn-secondary" onClick={() => setAberto(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={enviando}><i className="las la-check" aria-hidden="true"></i> {enviando ? 'Salvando...' : 'Confirmar saída'}</button>
          </div>
        </form>
      )}

      <h3 className="pac-subtitulo">Histórico</h3>
      {internacoes.length === 0 ? <EmptyState icon="las la-procedures" message="Nenhuma internação registrada." /> : (
        <div className="tabela-wrapper pac-historico-wrapper">
          <table className="tabela pac-historico">
            <thead><tr><th>Entrada</th><th>Saída</th><th>Leitos</th><th>Motivo</th><th>Desfecho</th></tr></thead>
            <tbody>
              {[...(atual ? [atual] : []), ...anteriores].map(i => (
                <tr key={i.id}>
                  <td data-rotulo="Entrada">{formatarDataHora(i.entradaEm)}</td>
                  <td data-rotulo="Saída">{i.saidaEm ? `${formatarDataHora(i.saidaEm)} (${permanencia(i.entradaEm, i.saidaEm)})` : 'Em curso'}</td>
                  <td data-rotulo="Leitos">
                    {i.movimentacoes.length ? i.movimentacoes.map(m => (
                      <div key={m.id}>{leitoTexto(m.setor, m.leito)}{m.motivo && m.motivo !== 'Entrada' ? ` · ${m.motivo}` : ''}</div>
                    )) : leitoTexto(i.setor, i.leito)}
                  </td>
                  <td data-rotulo="Motivo">{i.cid ? `${i.cid} · ` : ''}{i.motivo || '-'}</td>
                  <td data-rotulo="Desfecho">
                    {i.tipoSaida ? <Badge tone={TOM_SAIDA[i.tipoSaida]}>{ROTULO_SAIDA[i.tipoSaida]}</Badge> : <Badge tone="info">Internado</Badge>}
                    {i.destinoTransferencia && <div>{i.destinoTransferencia}</div>}
                    {i.motivoSaida && <div className="pac-campo-rotulo">{i.motivoSaida}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
