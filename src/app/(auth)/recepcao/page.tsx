'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs } from '@/components/ui';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { pode } from '@/lib/permissions';
import { proximosStatus } from '@/lib/paciente-status';
import { formatarCPF, formatarDataHora, formatarNascimento } from '@/lib/utils';
import { erroDaApi, Espera, ModalNovoPaciente, StatusBadge, useAgora, useCargo } from '../pacientes/componentes';

interface Paciente {
  id: string;
  nome: string;
  cpf?: string | null;
  status: string;
  classificacao: string | null;
  nascimento: string | null;
  createdAt: string;
  esperaDesde?: string;
}

interface Visitante {
  id: string;
  nome: string;
  documento: string | null;
  destino: string | null;
  pacienteId: string | null;
  paciente?: { nome: string } | null;
  entrada: string;
  saida: string | null;
  status: string;
}

type Aba = 'pacientes' | 'visitantes';

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();

export default function RecepcaoPage() {
  const cargo = useCargo();
  const agora = useAgora();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroPacientes, setErroPacientes] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Paciente[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');

  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [erroVisitantes, setErroVisitantes] = useState('');
  const [modalVisitante, setModalVisitante] = useState(false);
  const [formVisitante, setFormVisitante] = useState({ nome: '', documento: '', destino: '' });
  const [erroFormVisitante, setErroFormVisitante] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<Aba>('pacientes');

  const podeCadastrar = pode(cargo, 'paciente:cadastrar');
  const podeEncaminhar = pode(cargo, 'paciente:encaminhar');

  const carregarPacientes = useCallback(async () => {
    try {
      const res = await fetch('/api/pacientes');
      if (!res.ok) throw new Error(await erroDaApi(res, 'Não foi possível carregar os pacientes.'));
      const dados: unknown = await res.json();
      if (!Array.isArray(dados)) throw new Error('A resposta de pacientes é inválida.');
      setPacientes(dados as Paciente[]);
      setErroPacientes('');
    } catch (error) {
      setErroPacientes(error instanceof Error ? error.message : 'Não foi possível carregar os pacientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarVisitantes = useCallback(async () => {
    try {
      const res = await fetch('/api/visitantes');
      if (!res.ok) throw new Error(await erroDaApi(res, 'Não foi possível carregar os visitantes.'));
      const dados: unknown = await res.json();
      if (!Array.isArray(dados)) throw new Error('A resposta de visitantes é inválida.');
      setVisitantes(dados as Visitante[]);
      setErroVisitantes('');
    } catch (error) {
      setErroVisitantes(error instanceof Error ? error.message : 'Não foi possível carregar os visitantes.');
    }
  }, []);

  useEffect(() => {
    const inicial = setTimeout(() => { void carregarPacientes(); void carregarVisitantes(); }, 0);
    const interval = setInterval(() => { void carregarPacientes(); void carregarVisitantes(); }, 10000);
    return () => { clearTimeout(inicial); clearInterval(interval); };
  }, [carregarPacientes, carregarVisitantes]);

  // Todos os homônimos: servidor (além do limite da lista) somado à lista local (ignora acentos).
  const buscarPaciente = async (e?: FormEvent) => {
    e?.preventDefault();
    const termo = busca.trim();
    if (!termo) {
      setResultados(null);
      setErroBusca('');
      return;
    }
    setBuscando(true);
    setErroBusca('');
    try {
      const res = await fetch(`/api/pacientes?q=${encodeURIComponent(termo)}`);
      if (!res.ok) throw new Error(await erroDaApi(res, 'Não foi possível buscar.'));
      const dados = (await res.json()) as Paciente[];
      const alvo = normalizar(termo);
      const digitos = termo.replace(/\D/g, '');
      const locais = pacientes.filter(p => normalizar(p.nome).includes(alvo) || (digitos && (p.cpf ?? '').replace(/\D/g, '').includes(digitos)));
      setResultados([...new Map([...dados, ...locais].map(p => [p.id, p])).values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    } catch (error) {
      setResultados(null);
      setErroBusca(error instanceof Error ? error.message : 'Não foi possível buscar.');
    } finally {
      setBuscando(false);
    }
  };

  const enviarParaTriagem = async (id: string) => {
    try {
      const res = await fetch(`/api/pacientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Aguardando Triagem' }),
      });
      if (!res.ok) throw new Error(await erroDaApi(res, 'Erro ao enviar paciente para triagem.'));
      void carregarPacientes();
      setResultados(atual => atual?.map(p => p.id === id ? { ...p, status: 'Aguardando Triagem' } : p) ?? null);
      alert('Paciente enviado para triagem!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao enviar para triagem.');
    }
  };

  const criarVisitante = async (e: FormEvent) => {
    e.preventDefault();
    setErroFormVisitante('');
    try {
      const res = await fetch('/api/visitantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: formVisitante.nome, documento: formVisitante.documento || null, destino: formVisitante.destino || null }),
      });
      if (!res.ok) {
        setErroFormVisitante(await erroDaApi(res, 'Erro ao registrar visitante.'));
        return;
      }
      setModalVisitante(false);
      setFormVisitante({ nome: '', documento: '', destino: '' });
      void carregarVisitantes();
    } catch {
      setErroFormVisitante('Falha de conexão: o visitante não foi registrado.');
    }
  };

  const darSaidaVisitante = async (id: string) => {
    if (!await confirm('Confirmar saída deste visitante?')) return;
    try {
      const res = await fetch(`/api/visitantes/${id}`, { method: 'PUT' });
      if (!res.ok) throw new Error(await erroDaApi(res, 'Erro ao registrar saída.'));
      void carregarVisitantes();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao registrar saída.');
    }
  };

  const contar = (status: string) => pacientes.filter(p => p.status === status).length;
  const hoje = new Date(agora).toDateString();
  const visitantesDentro = visitantes.filter(v => v.status === 'DENTRO');
  const sairamHoje = visitantes.filter(v => v.status === 'SAIU' && v.saida && new Date(v.saida).toDateString() === hoje);
  const recentes = pacientes.slice(0, 10);
  const podeIrTriagem = (p: Paciente) => podeEncaminhar && proximosStatus(p.status).includes('Aguardando Triagem');

  const botaoTriagem = (p: Paciente) => podeIrTriagem(p) && (
    <button type="button" className="btn btn-primary btn-xs" onClick={() => enviarParaTriagem(p.id)}>
      <i className="las la-stethoscope" aria-hidden="true"></i> Triagem
    </button>
  );

  return (
    <div className="pac-pagina">
      <PageHeader
        icon="las la-user-nurse"
        title="Recepção"
        subtitle="Cadastro, encaminhamento e controle de visitantes"
        actions={<>
          <button type="button" className="btn btn-secondary" onClick={() => setModalVisitante(true)}><i className="las la-walking" aria-hidden="true"></i> Registrar visitante</button>
          {podeCadastrar && <button type="button" className="btn btn-primary" onClick={() => setModalAberto(true)}><i className="las la-user-plus" aria-hidden="true"></i> Novo paciente</button>}
        </>}
      />

      <StatGrid>
        <StatCard icon="las la-clipboard-list" value={contar('Recepção')} label="Na recepção" />
        <StatCard icon="las la-hourglass-half" tone="warning" alerta value={contar('Aguardando Triagem')} label="Aguardando triagem" />
        <StatCard icon="las la-user-md" tone="warning" alerta value={contar('Aguardando Médico')} label="Aguardando médico" />
        <StatCard icon="las la-bed" value={contar('Internado') + contar('Internado - UTI')} label="Internados" />
        <StatCard icon="las la-walking" value={visitantesDentro.length} label="Visitantes dentro" />
        <StatCard icon="las la-sign-out-alt" value={sairamHoje.length} label="Saíram hoje" />
      </StatGrid>

      <Panel title="Buscar paciente" icon="las la-search">
        <form className="pac-filtros" onSubmit={buscarPaciente}>
          <SearchInput value={busca} onChange={setBusca} placeholder="Nome ou CPF" label="Buscar paciente por nome ou CPF" />
          <button type="submit" className="btn btn-primary" disabled={buscando}><i className="las la-search" aria-hidden="true"></i> {buscando ? 'Buscando...' : 'Buscar'}</button>
        </form>
        {erroBusca && <p className="mod-aviso mod-aviso-erro pac-aviso" role="alert">{erroBusca}</p>}
        {resultados && (
          resultados.length === 0 ? (
            <EmptyState
              icon="las la-user-slash"
              message="Paciente não encontrado."
              action={podeCadastrar ? <button type="button" className="btn btn-primary" onClick={() => setModalAberto(true)}>Cadastrar novo paciente</button> : undefined}
            />
          ) : (
            <>
              <p className="mod-nota pac-aviso" role="status">{resultados.length} resultado(s). Confira dois identificadores antes de encaminhar.</p>
              <ul className="pac-resultados">
                {resultados.map(p => (
                  <li key={p.id} className="pac-resultado">
                    <div>
                      <strong className="pac-nome">{p.nome}</strong>
                      <span className="pac-sub">Nascimento: {formatarNascimento(p.nascimento) || 'não informado'} | CPF: {p.cpf ? formatarCPF(p.cpf) : 'não informado'}</span>
                    </div>
                    <StatusBadge status={p.status} />
                    <div className="pac-acoes">
                      <Link href={`/pacientes/${p.id}`} className="btn btn-secondary btn-xs" aria-label={`Abrir ficha de ${p.nome}`}>Ficha</Link>
                      {botaoTriagem(p)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )
        )}
      </Panel>

      <Tabs<Aba>
        label="Seções da recepção"
        active={abaAtiva}
        onChange={setAbaAtiva}
        tabs={[
          { id: 'pacientes', label: 'Pacientes recentes', icon: 'las la-user-injured' },
          { id: 'visitantes', label: `Visitantes (${visitantesDentro.length} dentro)`, icon: 'las la-walking' },
        ]}
      />

      {abaAtiva === 'pacientes' && (
        <Panel title="Últimos cadastros de pacientes" icon="las la-history">
          {loading ? <LoadingState /> : erroPacientes ? <ErrorState message={erroPacientes} onRetry={() => void carregarPacientes()} /> : recentes.length === 0 ? <EmptyState message="Nenhum paciente cadastrado." /> : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <caption className="sr-only">Últimos cadastros de pacientes</caption>
                <thead><tr><th scope="col">Paciente</th><th scope="col">Nascimento</th><th scope="col">CPF</th><th scope="col">Cadastro</th><th scope="col">Status</th><th scope="col">Espera</th><th scope="col">Ações</th></tr></thead>
                <tbody>
                  {recentes.map(p => (
                    <tr key={p.id}>
                      <td><strong className="pac-nome">{p.nome}</strong></td>
                      <td>{formatarNascimento(p.nascimento) || '-'}</td>
                      <td>{p.cpf ? formatarCPF(p.cpf) : '-'}</td>
                      <td>{formatarDataHora(p.createdAt)}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td><Espera status={p.status} desde={p.esperaDesde} classificacao={p.classificacao} agora={agora} /></td>
                      <td>
                        <div className="pac-acoes">
                          <Link href={`/pacientes/${p.id}`} className="btn btn-secondary btn-xs" aria-label={`Abrir ficha de ${p.nome}`}><i className="las la-eye" aria-hidden="true"></i> Ficha</Link>
                          {botaoTriagem(p)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {abaAtiva === 'visitantes' && (
        <Panel title="Visitantes: controle de acesso" icon="las la-walking">
          {erroVisitantes ? <ErrorState message={erroVisitantes} onRetry={() => void carregarVisitantes()} /> : visitantes.length === 0 ? <EmptyState icon="las la-door-open" message="Nenhum visitante registrado." /> : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <caption className="sr-only">Visitantes registrados</caption>
                <thead><tr><th scope="col">Nome</th><th scope="col">Documento</th><th scope="col">Destino</th><th scope="col">Entrada</th><th scope="col">Saída</th><th scope="col">Status</th><th scope="col">Ação</th></tr></thead>
                <tbody>
                  {visitantes.map(v => (
                    <tr key={v.id}>
                      <td><strong className="pac-nome">{v.nome}</strong></td>
                      <td>{v.documento || '-'}</td>
                      <td>{v.destino || '-'}</td>
                      <td>{formatarDataHora(v.entrada)}</td>
                      <td>{v.saida ? formatarDataHora(v.saida) : '-'}</td>
                      <td><Badge tone={v.status === 'DENTRO' ? 'success' : 'neutral'}>{v.status === 'DENTRO' ? 'Dentro' : 'Saiu'}</Badge></td>
                      <td>{v.status === 'DENTRO' ? <button type="button" className="btn btn-secondary btn-xs" aria-label={`Dar saída a ${v.nome}`} onClick={() => darSaidaVisitante(v.id)}><i className="las la-sign-out-alt" aria-hidden="true"></i> Dar saída</button> : 'Concluído'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {modalAberto && <ModalNovoPaciente onFechar={() => setModalAberto(false)} onCriado={() => { setModalAberto(false); void carregarPacientes(); }} />}

      {modalVisitante && (
        <Modal size="sm" title="Registrar visitante" closeLabel="Fechar cadastro de visitante" onClose={() => setModalVisitante(false)}>
          <form onSubmit={criarVisitante}>
            {erroFormVisitante && <p className="mod-aviso mod-aviso-erro" role="alert">{erroFormVisitante}</p>}
            <div className="form-group"><label htmlFor="recepcao-visitante-nome">Nome completo *</label><input id="recepcao-visitante-nome" required maxLength={160} value={formVisitante.nome} onChange={e => setFormVisitante({ ...formVisitante, nome: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="recepcao-visitante-documento">Documento (RG/CPF)</label><input id="recepcao-visitante-documento" maxLength={40} value={formVisitante.documento} onChange={e => setFormVisitante({ ...formVisitante, documento: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="recepcao-visitante-destino">Destino</label><input id="recepcao-visitante-destino" maxLength={160} placeholder="Ex.: Leito 104, UTI, Diretoria" value={formVisitante.destino} onChange={e => setFormVisitante({ ...formVisitante, destino: e.target.value })} /></div>
            <ModalActions>
              <button type="button" className="btn btn-secondary" onClick={() => setModalVisitante(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary"><i className="las la-door-open" aria-hidden="true"></i> Registrar entrada</button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
