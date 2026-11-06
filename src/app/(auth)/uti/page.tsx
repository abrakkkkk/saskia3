'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import PacienteSelect from '@/components/ui/PacienteSelect';
import { pode } from '@/lib/permissions';
import '@/components/ui/modulo.css';
import './uti.css';

interface UtiLeito {
  id: string;
  numero: number;
  tipo?: string; // ADULTO, PEDIATRICO, NEONATAL
  status: string; // LIVRE, OCUPADO, RESERVADO, MANUTENCAO, LIMPEZA
  pacienteId: string | null;
  pacienteNome: string | null;
  pacienteCpf: string | null;
  createdAt: string;
  updatedAt: string;
}

type Aba = 'mapa' | 'admissao' | 'pacientes';

const ABAS = [
  { id: 'mapa', label: 'Mapa de leitos', icon: 'las la-th-large' },
  { id: 'admissao', label: 'Admissão', icon: 'las la-user-plus' },
  { id: 'pacientes', label: 'Pacientes', icon: 'las la-users' },
] as const;

const DESTINOS = [
  { valor: 'Internado', rotulo: 'Permanece internado (enfermaria)' },
  { valor: 'Alta Médica', rotulo: 'Alta médica' },
  { valor: 'Transferido', rotulo: 'Transferência' },
  { valor: 'Evasão', rotulo: 'Evasão' },
];

const STATUS_ROTULO: Record<string, string> = { LIVRE: 'Livre', OCUPADO: 'Ocupado', RESERVADO: 'Reservado', MANUTENCAO: 'Manutenção', LIMPEZA: 'Limpeza' };
const STATUS_TOM: Record<string, Tone> = { LIVRE: 'neutral', OCUPADO: 'info', RESERVADO: 'info', MANUTENCAO: 'warning', LIMPEZA: 'warning' };
const TIPO_ROTULO: Record<string, string> = { ADULTO: 'Adulto', PEDIATRICO: 'Pediátrico', NEONATAL: 'Neonatal' };

export default function UtiPage() {
  const { data: session } = useSession();
  const podeGerir = pode(session?.user?.cargo, 'uti:gerir');
  const [abaEscolhida, setAbaEscolhida] = useState<Aba>('mapa');
  const [leitosUTI, setLeitosUTI] = useState<UtiLeito[]>([]);
  const [liberando, setLiberando] = useState<{ id: string; nome: string | null } | null>(null);
  const [destino, setDestino] = useState('Internado');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  // Admission form state
  const [formAdmissao, setFormAdmissao] = useState({ pacienteId: '', leitoId: '' });

  const [buscaPaciente, setBuscaPaciente] = useState('');

  const aba: Aba = !podeGerir && abaEscolhida === 'admissao' ? 'mapa' : abaEscolhida;

  const carregarDados = async () => {
    try {
      const resLeitos = await fetch('/api/uti');
      const dadosLeitos = await resLeitos.json().catch(() => null);
      if (!resLeitos.ok) throw new Error(dadosLeitos?.error || 'Não foi possível carregar os leitos.');
      if (!Array.isArray(dadosLeitos)) throw new Error('A resposta da UTI está inválida.');
      setLeitosUTI(dadosLeitos);
      setErroCarga('');
    } catch(e) {
      setErroCarga(e instanceof Error ? e.message : 'Não foi possível carregar os dados da UTI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDados();
  }, []);

  const tentarNovamente = () => {
    setLoading(true);
    void carregarDados();
  };

  const admitirPaciente = async () => {
    const { pacienteId, leitoId } = formAdmissao;

    if (!pacienteId || !leitoId) {
      alert('Selecione um paciente cadastrado e um leito livre.');
      return;
    }

    try {
      const res = await fetch(`/api/uti/${leitoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'OCUPADO',
          pacienteId,
        })
      });

      const resposta = await res.json().catch(() => null);
      if(!res.ok) throw new Error(resposta?.error || "Erro ao admitir paciente no leito");

      setFormAdmissao({ pacienteId: '', leitoId: '' });

      setAbaEscolhida('mapa');
      alert('Paciente vinculado ao leito. Registre os dados clínicos da admissão no prontuário.');
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao admitir paciente no leito');
    }
  };

  const confirmarLiberacao = async () => {
    if (!liberando) return;
    const { id, nome } = liberando;
    const rotulo = DESTINOS.find(d => d.valor === destino)?.rotulo ?? destino;
    if (!await confirm(`Liberar o leito UTI de ${nome || 'este paciente'}? Destino: ${rotulo}.`)) return;
    try {
      const res = await fetch(`/api/uti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVRE', destino }),
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || 'Erro ao liberar o leito');
      setLiberando(null);
      setDestino('Internado');
      alert(`Leito liberado. Destino registrado: ${rotulo}.`);
      void carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao liberar o leito');
    }
  };

  const liberarLeito = (leitoId: string, nome: string | null) => {
    setDestino('Internado');
    setLiberando({ id: leitoId, nome });
  };

  // Indicators
  const ocupados = leitosUTI.filter(l => l.status === 'OCUPADO').length;
  const disponiveis = leitosUTI.filter(l => l.status === 'LIVRE').length;
  const totalLeitos = leitosUTI.length;
  const taxaOcupacao = totalLeitos > 0 ? Math.round((ocupados / totalLeitos) * 100) : 0;

  const leitosFiltrados = leitosUTI.filter(l =>
    l.status === 'OCUPADO' && l.pacienteNome &&
    (l.pacienteNome.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
    String(l.numero).includes(buscaPaciente))
  );

  return (
    <div className="conteudo">
      <div className="uti-container">
        <PageHeader
          icon="las la-procedures"
          title="UTI"
          subtitle="Mapa de leitos, admissão e liberação"
          actions={podeGerir && !loading ? (
            <button type="button" className="btn btn-success" onClick={() => setAbaEscolhida('admissao')}>
              <i className="las la-plus-circle" aria-hidden="true"></i> Vincular paciente
            </button>
          ) : undefined}
        />

        {loading ? <LoadingState message="Carregando leitos da UTI..." /> : erroCarga && leitosUTI.length === 0 ? (
          <ErrorState message={erroCarga} onRetry={tentarNovamente} />
        ) : (
          <>
            {erroCarga && <p className="mod-aviso mod-aviso-erro" role="alert">{erroCarga}</p>}

            <StatGrid>
              <StatCard icon="las la-bed" tone="info" value={totalLeitos} label="Leitos" />
              <StatCard icon="las la-procedures" tone="violet" value={ocupados} label="Ocupados" />
              <StatCard icon="las la-door-open" tone="success" value={disponiveis} label="Livres" />
              <StatCard icon="las la-chart-line" tone="cyan" value={`${taxaOcupacao}%`} label="Ocupação" />
            </StatGrid>

            {liberando && podeGerir && (
              <Panel title={`Liberar leito de ${liberando.nome || 'paciente'}`} icon="las la-door-open">
                <div className="mod-form-grid">
                  <div className="form-group">
                    <label htmlFor="uti-destino">Destino do paciente *</label>
                    <select id="uti-destino" value={destino} onChange={e => setDestino(e.target.value)}>
                      {DESTINOS.map(d => <option key={d.valor} value={d.valor}>{d.rotulo}</option>)}
                    </select>
                  </div>
                </div>
                <p className="mod-nota">Óbito é registrado na tela de Óbitos, que também libera o leito.</p>
                <div className="mod-acoes">
                  <button type="button" className="btn btn-secondary" onClick={() => setLiberando(null)}>Cancelar</button>
                  <button type="button" className="btn btn-warning" onClick={() => void confirmarLiberacao()}>Liberar leito</button>
                </div>
              </Panel>
            )}

            <Tabs tabs={podeGerir ? ABAS : ABAS.filter(a => a.id !== 'admissao')} active={aba} onChange={setAbaEscolhida} label="Seções da UTI" />

            {aba === 'mapa' && (leitosUTI.length === 0 ? (
              <EmptyState icon="las la-bed" message="Nenhum leito de UTI cadastrado." />
            ) : (
              <ul className="uti-mapa" aria-label="Leitos da UTI">
                {leitosUTI.map(l => {
                  const ocupado = l.status === 'OCUPADO';
                  return (
                    <li key={l.id} className={`uti-leito ${ocupado ? 'uti-leito-ocupado' : ''}`}>
                      <div className="uti-leito-topo">
                        <span className="uti-leito-num">UTI {l.numero}</span>
                        <Badge tone={STATUS_TOM[l.status] ?? 'neutral'}>{STATUS_ROTULO[l.status] ?? l.status}</Badge>
                      </div>
                      {ocupado ? (
                        <>
                          <p className="uti-leito-paciente">{l.pacienteNome || 'Paciente sem nome'}</p>
                          {l.tipo && TIPO_ROTULO[l.tipo] && <p className="uti-leito-meta">{TIPO_ROTULO[l.tipo]}</p>}
                          {podeGerir && (
                            <div className="uti-leito-acoes">
                              <button type="button" className="btn btn-sm btn-secondary" onClick={() => liberarLeito(l.id, l.pacienteNome)}>
                                <i className="las la-door-open" aria-hidden="true"></i> Liberar leito
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="uti-leito-meta">{l.tipo && TIPO_ROTULO[l.tipo] ? TIPO_ROTULO[l.tipo] : 'Sem paciente'}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ))}

            {aba === 'admissao' && podeGerir && (
              <Panel title="Vincular paciente cadastrado a um leito livre" icon="las la-user-plus">
                <p className="mod-nota">Esta ação altera o status e associa o paciente ao leito. Registre os dados clínicos da admissão no prontuário.</p>
                <div className="mod-form-grid">
                  <PacienteSelect required value={formAdmissao.pacienteId} onChange={id => setFormAdmissao({ ...formAdmissao, pacienteId: id })} />
                  <div className="form-group">
                    <label htmlFor="uti-leito">Leito *</label>
                    <select id="uti-leito" value={formAdmissao.leitoId} onChange={e => setFormAdmissao({...formAdmissao, leitoId: e.target.value})}>
                      <option value="">Selecione o leito...</option>
                      {leitosUTI.filter(l => l.status === 'LIVRE').map(l => <option key={l.id} value={l.id}>Leito UTI {l.numero}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mod-acoes">
                  <button type="button" className="btn btn-success" onClick={admitirPaciente}>
                    <i className="las la-save" aria-hidden="true"></i> Admitir na UTI
                  </button>
                </div>
              </Panel>
            )}

            {aba === 'pacientes' && (
              <>
                <SearchInput value={buscaPaciente} onChange={setBuscaPaciente} placeholder="Buscar por nome ou leito..." label="Buscar paciente internado por nome ou leito" />
                {leitosFiltrados.length === 0 ? (
                  <EmptyState icon="las la-users" message="Nenhum paciente internado encontrado." />
                ) : (
                  <div className="tabela-wrapper">
                    <table className="tabela">
                      <thead>
                        <tr>
                          <th scope="col">Leito</th>
                          <th scope="col">Paciente</th>
                          {podeGerir && <th scope="col">Ação</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {leitosFiltrados.map(l => (
                          <tr key={l.id}>
                            <td><strong>UTI {l.numero}</strong></td>
                            <td>{l.pacienteNome}</td>
                            {podeGerir && (
                              <td>
                                <button type="button" className="btn btn-xs btn-secondary" aria-label={`Liberar leito ${l.numero}`} onClick={() => liberarLeito(l.id, l.pacienteNome)}>
                                  <i className="las la-door-open" aria-hidden="true"></i> Liberar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
