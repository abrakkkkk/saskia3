'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from '@/components/ui';
import { STATUS_PACIENTE } from '@/lib/paciente-status';
import { pode } from '@/lib/permissions';
import { formatarCPF, formatarNascimento, nascimentoParaInput, STATUS_TOM } from '@/lib/utils';
import { erroDaApi, useCargo } from '../pacientes/componentes';
import './pacientes-busca.css';

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  status: string;
  classificacao: string | null;
  nascimento?: string | null;
  telefone?: string | null;
  sexo?: string | null;
  endereco?: string | null;
  mae?: string | null;
}

function normalizarBusca(valor: string) {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

const FILTROS_VAZIOS = { nome: '', cpf: '', mae: '', nascimento: '', telefone: '', sexo: '', endereco: '', status: '' };

const BUSCAS_RAPIDAS = [
  { rotulo: 'Internados', status: 'Internado' },
  { rotulo: 'Altas', status: 'Alta Médica' },
  { rotulo: 'Óbitos', status: 'Óbito' },
  { rotulo: 'Evasões', status: 'Evasão' },
] as const;

export default function BuscarPacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [ordenacao, setOrdenacao] = useState<{ campo: keyof Paciente, direcao: 'asc'|'desc' }>({ campo: 'nome', direcao: 'asc' });

  const cargo = useCargo();
  const buscaCompleta = pode(cargo, 'paciente:cadastrar') || pode(cargo, 'prontuario:ler');
  const podeExportar = pode(cargo, 'paciente:cadastrar');
  const [total, setTotal] = useState(0);
  const [exportando, setExportando] = useState(false);

  // Filtros exatos vão ao servidor (limite de lista). Nome, mãe e endereço ficam no cliente porque
  // ignoram acentos; o aviso de resultado parcial orienta quando o limite for atingido.
  const consultaServidor = useMemo(() => {
    const params = new URLSearchParams();
    const cpf = filtros.cpf.replace(/\D/g, '');
    if (cpf) params.set('cpf', cpf);
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.nascimento) params.set('nascimento', filtros.nascimento);
    if (filtros.sexo) params.set('sexo', filtros.sexo);
    return params.toString();
  }, [filtros.cpf, filtros.status, filtros.nascimento, filtros.sexo]);

  useEffect(() => {
    const controller = new AbortController();
    const carregar = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 250));
        if (controller.signal.aborted) return;
        const response = await fetch(`/api/pacientes/busca${consultaServidor ? `?${consultaServidor}` : ''}`, { signal: controller.signal });
        if (!response.ok) throw new Error(await erroDaApi(response, 'Não foi possível carregar os pacientes.'));
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('A resposta de pacientes está inválida.');
        setPacientes(data.filter((item): item is Paciente => Boolean(item)
          && typeof item.id === 'string' && typeof item.nome === 'string'
          && typeof item.status === 'string'));
        setTotal(Number(response.headers.get('X-Total-Count')) || data.length);
        setErroCarga('');
      } catch (error) {
        if (controller.signal.aborted) return;
        setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar os pacientes.');
        setPacientes([]);
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    };
    void carregar();
    return () => controller.abort();
  }, [consultaServidor, tentativa]);

  const limparFiltros = () => setFiltros(FILTROS_VAZIOS);

  const pacientesFiltrados = pacientes.filter(p => {
    const nomeFiltro = normalizarBusca(filtros.nome);
    const maeFiltro = normalizarBusca(filtros.mae);
    const enderecoFiltro = normalizarBusca(filtros.endereco);
    const cpfFiltro = filtros.cpf.replace(/\D/g, '');
    const telefoneFiltro = filtros.telefone.replace(/\D/g, '');
    if (nomeFiltro && !normalizarBusca(p.nome).includes(nomeFiltro)) return false;
    if (filtros.cpf.trim() && (!cpfFiltro || !(p.cpf || '').replace(/\D/g, '').includes(cpfFiltro))) return false;
    if (maeFiltro && !normalizarBusca(p.mae || '').includes(maeFiltro)) return false;
    if (filtros.telefone.trim() && (!telefoneFiltro || !(p.telefone || '').replace(/\D/g, '').includes(telefoneFiltro))) return false;
    if (filtros.sexo && p.sexo !== filtros.sexo) return false;
    if (enderecoFiltro && !normalizarBusca(p.endereco || '').includes(enderecoFiltro)) return false;
    if (filtros.status && p.status !== filtros.status) return false;
    if (filtros.nascimento && filtros.nascimento !== nascimentoParaInput(p.nascimento)) return false;
    return true;
  }).sort((a, b) => {
    const valA = String(a[ordenacao.campo] ?? '');
    const valB = String(b[ordenacao.campo] ?? '');
    const resultado = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base', numeric: true });
    return ordenacao.direcao === 'asc' ? resultado : -resultado;
  });

  const handleOrdenacao = (campo: keyof Paciente) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sentido = (campo: keyof Paciente) => ordenacao.campo === campo ? (ordenacao.direcao === 'asc' ? 'ascending' : 'descending') : 'none';

  // Geração e auditoria no servidor. Filtros de texto vão junto para o arquivo refletir a tela.
  const exportarCSV = async () => {
    setExportando(true);
    try {
      const params = new URLSearchParams(consultaServidor);
      if (filtros.nome.trim()) params.set('nome', filtros.nome.trim());
      if (filtros.mae.trim()) params.set('mae', filtros.mae.trim());
      if (filtros.endereco.trim()) params.set('endereco', filtros.endereco.trim());
      if (filtros.telefone.trim()) params.set('telefone', filtros.telefone.trim());
      const response = await fetch(`/api/pacientes/exportar?${params}`);
      if (!response.ok) {
        alert(await erroDaApi(response, 'Não foi possível exportar.'));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'busca_pacientes.csv';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert('Falha de conexão ao exportar.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="pb-pagina">
      <PageHeader
        icon="las la-search"
        title="Busca de pacientes"
        subtitle="Nome, documentos, contato e status"
        actions={podeExportar && (
          <button type="button" onClick={exportarCSV} className="btn btn-secondary" disabled={carregando || exportando || pacientesFiltrados.length === 0}>
            <i className="las la-download" aria-hidden="true"></i> {exportando ? 'Exportando...' : `Exportar (${pacientesFiltrados.length})`}
          </button>
        )}
      />

      <Panel title="Filtros" icon="las la-filter">
        <div className="mod-form-grid">
          <div className="form-group">
            <label htmlFor="busca-paciente-nome">Nome</label>
            <input id="busca-paciente-nome" type="text" value={filtros.nome} onChange={e => setFiltros({ ...filtros, nome: e.target.value })} placeholder="Nome ou parte dele" />
          </div>
          {buscaCompleta && (
            <div className="form-group">
              <label htmlFor="busca-paciente-cpf">CPF</label>
              <input id="busca-paciente-cpf" type="text" inputMode="numeric" value={filtros.cpf} onChange={e => setFiltros({ ...filtros, cpf: e.target.value })} placeholder="000.000.000-00" />
            </div>
          )}
          {buscaCompleta && (
            <div className="form-group">
              <label htmlFor="busca-paciente-mae">Nome da mãe</label>
              <input id="busca-paciente-mae" type="text" value={filtros.mae} onChange={e => setFiltros({ ...filtros, mae: e.target.value })} placeholder="Nome da mãe" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="busca-paciente-nascimento">Nascimento</label>
            <input id="busca-paciente-nascimento" type="date" value={filtros.nascimento} onChange={e => setFiltros({ ...filtros, nascimento: e.target.value })} />
          </div>
          {buscaCompleta && (
            <div className="form-group">
              <label htmlFor="busca-paciente-telefone">Telefone</label>
              <input id="busca-paciente-telefone" type="tel" inputMode="tel" value={filtros.telefone} onChange={e => setFiltros({ ...filtros, telefone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
          )}
          {buscaCompleta && (
            <div className="form-group">
              <label htmlFor="busca-paciente-sexo">Sexo</label>
              <select id="busca-paciente-sexo" value={filtros.sexo} onChange={e => setFiltros({ ...filtros, sexo: e.target.value })}>
                <option value="">Todos</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          )}
          {buscaCompleta && (
            <div className="form-group">
              <label htmlFor="busca-paciente-endereco">Cidade ou endereço</label>
              <input id="busca-paciente-endereco" type="text" value={filtros.endereco} onChange={e => setFiltros({ ...filtros, endereco: e.target.value })} placeholder="Cidade ou rua" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="busca-paciente-status">Status</label>
            <select id="busca-paciente-status" value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })}>
              <option value="">Todos</option>
              {STATUS_PACIENTE.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className="pb-rapidas" role="group" aria-label="Buscas rápidas">
          {BUSCAS_RAPIDAS.map(r => (
            <button key={r.status} type="button" className="btn btn-secondary btn-sm" aria-pressed={filtros.status === r.status} onClick={() => setFiltros({ ...filtros, status: r.status })}>{r.rotulo}</button>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={limparFiltros}>Limpar filtros</button>
        </div>
      </Panel>

      <Panel
        title="Resultados"
        icon="las la-users"
        actions={!carregando && !erroCarga && <span className="pb-contagem" aria-live="polite"><strong>{pacientesFiltrados.length}</strong> paciente(s) encontrado(s)</span>}
      >
        {total > pacientes.length && (
          <p className="mod-aviso mod-aviso-atencao" role="status">Resultado parcial: {pacientes.length} de {total} analisados. Combine CPF, status, sexo ou nascimento para ampliar.</p>
        )}
        {carregando ? (
          <LoadingState message="Carregando pacientes..." />
        ) : erroCarga ? (
          <ErrorState message={erroCarga} onRetry={() => { setCarregando(true); setTentativa(n => n + 1); }} />
        ) : pacientesFiltrados.length === 0 ? (
          <EmptyState icon="las la-search" message="Nenhum paciente encontrado com os filtros atuais." />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <caption className="sr-only">Pacientes encontrados</caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={sentido('nome')}><button type="button" className="pb-ordenar" onClick={() => handleOrdenacao('nome')}>Paciente <i className="las la-sort" aria-hidden="true"></i></button></th>
                  <th scope="col" aria-sort={sentido('cpf')}><button type="button" className="pb-ordenar" onClick={() => handleOrdenacao('cpf')}>CPF <i className="las la-sort" aria-hidden="true"></i></button></th>
                  <th scope="col">Sexo</th>
                  <th scope="col">Nascimento</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map(p => (
                  <tr key={p.id}>
                    <td className="pb-nome">{p.nome}</td>
                    <td>{p.cpf ? formatarCPF(p.cpf) : 'N/I'}</td>
                    <td>{p.sexo || 'N/I'}</td>
                    <td>{formatarNascimento(p.nascimento) || 'N/I'}</td>
                    <td><Badge tone={STATUS_TOM[p.status] ?? 'neutral'}>{p.status}</Badge></td>
                    <td>
                      <Link href={`/pacientes/${p.id}`} className="btn btn-primary btn-xs" aria-label={`Abrir ficha de ${p.nome}`}>
                        <i className="las la-folder-open" aria-hidden="true"></i> Ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
