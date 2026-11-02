'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { STATUS_PACIENTE } from '@/lib/paciente-status';
import { pode } from '@/lib/permissions';
import { formatarCPF, formatarNascimento, nascimentoParaInput, STATUS_TOM } from '@/lib/utils';
import { erroDaApi, useCargo } from '../pacientes/componentes';
import styles from './pacientes-busca.module.css';

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
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export default function BuscarPacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  
  // Filtros
  const [filtros, setFiltros] = useState({
    nome: '',
    cpf: '',
    mae: '',
    nascimento: '',
    telefone: '',
    sexo: '',
    endereco: '',
    status: ''
  });

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
  }, [consultaServidor]);

  const limparFiltros = () => {
    setFiltros({
      nome: '', cpf: '', mae: '', nascimento: '', telefone: '', sexo: '', endereco: '', status: ''
    });
  };

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

  const statusDisponiveis = [...STATUS_PACIENTE];

  return (
    <div className={styles.page}>
      
      {/* Banner */}
      <div className={styles.banner}>
        <div>
          <h1><i className="las la-search" aria-hidden="true"></i> Busca Avançada de Pacientes</h1>
          <p>Pesquise pacientes ativos por nome, documentos, contato e status</p>
        </div>
        <div className={styles.bannerActions}>
          {podeExportar && (
            <button type="button" onClick={exportarCSV} className={styles.exportButton} disabled={carregando || exportando || pacientesFiltrados.length === 0}>
              <i className="las la-download" aria-hidden="true"></i> {exportando ? 'Exportando...' : `Exportar resultados (${pacientesFiltrados.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Painel de Filtros */}
      <section className={styles.filterPanel} aria-labelledby="filtros-pacientes-heading">
        <h2 className={styles.filtersTitle} id="filtros-pacientes-heading">
          <i className="las la-filter" aria-hidden="true"></i> Filtros de Pesquisa
        </h2>
        
        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label htmlFor="busca-paciente-nome"><i className="las la-user" aria-hidden="true"></i> Nome</label>
            <input id="busca-paciente-nome" type="text" className={styles.control} value={filtros.nome} onChange={e => setFiltros({...filtros, nome: e.target.value})} placeholder="Nome completo ou parte" />
          </div>
          {buscaCompleta && (
            <div className={styles.field}>
              <label htmlFor="busca-paciente-cpf"><i className="las la-id-card" aria-hidden="true"></i> CPF</label>
              <input id="busca-paciente-cpf" type="text" inputMode="numeric" className={styles.control} value={filtros.cpf} onChange={e => setFiltros({...filtros, cpf: e.target.value})} placeholder="000.000.000-00" />
            </div>
          )}
          {buscaCompleta && (
            <div className={styles.field}>
              <label htmlFor="busca-paciente-mae"><i className="las la-female" aria-hidden="true"></i> Nome da Mãe</label>
              <input id="busca-paciente-mae" type="text" className={styles.control} value={filtros.mae} onChange={e => setFiltros({...filtros, mae: e.target.value})} placeholder="Nome da mãe" />
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="busca-paciente-nascimento"><i className="las la-calendar" aria-hidden="true"></i> Nascimento</label>
            <input id="busca-paciente-nascimento" type="date" className={styles.control} value={filtros.nascimento} onChange={e => setFiltros({...filtros, nascimento: e.target.value})} />
          </div>
          {buscaCompleta && (
            <div className={styles.field}>
              <label htmlFor="busca-paciente-telefone"><i className="las la-phone" aria-hidden="true"></i> Telefone</label>
              <input id="busca-paciente-telefone" type="tel" inputMode="tel" className={styles.control} value={filtros.telefone} onChange={e => setFiltros({...filtros, telefone: e.target.value})} placeholder="(00) 00000-0000" />
            </div>
          )}
          {buscaCompleta && (
            <div className={styles.field}>
              <label htmlFor="busca-paciente-sexo"><i className="las la-venus-mars" aria-hidden="true"></i> Sexo</label>
              <select id="busca-paciente-sexo" className={styles.control} value={filtros.sexo} onChange={e => setFiltros({...filtros, sexo: e.target.value})}>
                <option value="">Todos</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          )}
          {buscaCompleta && (
            <div className={styles.field}>
              <label htmlFor="busca-paciente-endereco"><i className="las la-map-marker" aria-hidden="true"></i> Cidade/Endereço</label>
              <input id="busca-paciente-endereco" type="text" className={styles.control} value={filtros.endereco} onChange={e => setFiltros({...filtros, endereco: e.target.value})} placeholder="Cidade ou rua" />
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="busca-paciente-status"><i className="las la-flag" aria-hidden="true"></i> Status</label>
            <select id="busca-paciente-status" className={styles.control} value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})}>
              <option value="">Todos os Status</option>
              {statusDisponiveis.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.quickFilters}>
          <span>Buscas rápidas:</span>
          <button type="button" onClick={() => setFiltros({...filtros, status: 'Internado'})}>Internados</button>
          <button type="button" onClick={() => setFiltros({...filtros, status: 'Alta Médica'})}>Altas</button>
          <button type="button" onClick={() => setFiltros({...filtros, status: 'Óbito'})}>Óbitos</button>
          <button type="button" onClick={() => setFiltros({...filtros, status: 'Evasão'})}>Evasões</button>
          <button type="button" className={styles.clearFilters} onClick={limparFiltros}>Limpar Filtros</button>
        </div>
      </section>

      {/* Resultados */}
      <div className={styles.resultSummary} aria-live="polite">
        <div><i className="las la-users" aria-hidden="true"></i> <strong>{pacientesFiltrados.length}</strong> paciente(s) encontrado(s)</div>
        {total > pacientes.length && <div>Resultado parcial: {pacientes.length} de {total} analisados. Combine CPF, status, sexo ou nascimento para ampliar.</div>}
      </div>

      {erroCarga && <p className={styles.loadError} role="alert">{erroCarga}</p>}

      <div className={styles.resultsCard}>
        {carregando ? (
          <div className={styles.loading} role="status"><i className="las la-spinner la-spin" aria-hidden="true"></i><span>Carregando pacientes...</span></div>
        ) : erroCarga ? (
          <div className={styles.emptyState}><i className="las la-exclamation-circle" aria-hidden="true"></i><p>Os resultados estão indisponíveis até que os dados possam ser carregados.</p></div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="las la-search" aria-hidden="true"></i>
            <p>Nenhum paciente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className={styles.tableViewport}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ordenacao.campo === 'nome' ? ordenacao.direcao === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" className={styles.sortButton} onClick={() => handleOrdenacao('nome')}>Paciente <i className="las la-sort" aria-hidden="true"></i></button></th>
                  <th scope="col" aria-sort={ordenacao.campo === 'cpf' ? ordenacao.direcao === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" className={styles.sortButton} onClick={() => handleOrdenacao('cpf')}>CPF <i className="las la-sort" aria-hidden="true"></i></button></th>
                  <th scope="col">Sexo</th>
                  <th scope="col">Nascimento</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map(p => (
                  <tr key={p.id}>
                    <td className={styles.patientNameCell}>
                      <div className={styles.avatar} aria-hidden="true">
                        {p.nome.charAt(0)}
                      </div>
                      {p.nome}
                    </td>
                    <td>{p.cpf ? formatarCPF(p.cpf) : 'N/I'}</td>
                    <td>{p.sexo || 'N/I'}</td>
                    <td>{formatarNascimento(p.nascimento) || 'N/I'}</td>
                    <td><Badge tone={STATUS_TOM[p.status] ?? 'neutral'}>{p.status}</Badge></td>
                    <td>
                      <Link href={`/pacientes/${p.id}`} className={styles.recordLink}>
                        <i className="las la-folder-open" aria-hidden="true"></i> Ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
