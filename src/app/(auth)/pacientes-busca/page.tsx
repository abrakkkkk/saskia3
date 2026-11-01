'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

  useEffect(() => {
    const controller = new AbortController();
    const carregar = async () => {
      setCarregando(true);
      setErroCarga('');
      try {
        const response = await fetch('/api/pacientes/busca', { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(typeof body?.error === 'string' ? body.error : 'Não foi possível carregar os pacientes.');
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('A resposta de pacientes está inválida.');
        setPacientes(data.filter((item): item is Paciente => Boolean(item)
          && typeof item.id === 'string' && typeof item.nome === 'string'
          && typeof item.status === 'string'));
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
  }, []);

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
    if (filtros.nascimento) {
      const dataFiltro = filtros.nascimento.split('T')[0];
      const nascimento = p.nascimento ? new Date(p.nascimento) : null;
      const dataPac = nascimento && Number.isFinite(nascimento.getTime()) ? nascimento.toISOString().slice(0, 10) : '';
      if (dataFiltro !== dataPac) return false;
    }
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

  const exportarCSV = () => {
    const csvCell = (value: string) => {
      const neutralizado = /^[\u0000-\u0020]*[=+@-]/.test(value) ? `'${value}` : value;
      return `"${neutralizado.replace(/"/g, '""')}"`;
    };
    const cabecalho = ['Nome', 'CPF', 'Nascimento', 'Sexo', 'Status', 'Classificação'].map(csvCell).join(',') + '\n';
    const linhas = pacientesFiltrados.map(p => 
      [p.nome, p.cpf || '', p.nascimento ? new Date(p.nascimento).toLocaleDateString('pt-BR') : '', p.sexo || '', p.status, p.classificacao || '']
        .map(csvCell).join(',')
    ).join("\n");
    const blob = new Blob(['\uFEFF', cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "busca_pacientes.csv";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const statusDisponiveis = Array.from(new Set(pacientes.map(p => p.status).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const STATUS_CORES: Record<string, string> = {
    'Recepção': 'bg-slate-100 text-slate-700',
    'Aguardando Triagem': 'bg-amber-100 text-amber-700',
    'Aguardando Médico': 'bg-amber-100 text-amber-700',
    'Em Triagem': 'bg-blue-100 text-blue-700',
    'Em Atendimento Médico': 'bg-blue-100 text-blue-700',
    'Internado': 'bg-pink-100 text-pink-700',
    'Alta Médica': 'bg-green-100 text-green-700',
    'Óbito': 'bg-slate-800 text-slate-100',
    'Evasão': 'bg-red-100 text-red-700',
    'Transferido': 'bg-orange-100 text-orange-700',
    'Finalizado': 'bg-green-100 text-green-700',
    'Retorno': 'bg-purple-100 text-purple-700'
  };

  return (
    <div className={styles.page}>
      
      {/* Banner */}
      <div className={styles.banner}>
        <div>
          <h1><i className="las la-search" aria-hidden="true"></i> Busca Avançada de Pacientes</h1>
          <p>Pesquise pacientes ativos por nome, documentos, contato e status</p>
        </div>
        <div className={styles.bannerActions}>
          <button onClick={exportarCSV} className={styles.exportButton} disabled={carregando || pacientesFiltrados.length === 0}>
            <i className="las la-download" aria-hidden="true"></i> Exportar resultados ({pacientesFiltrados.length})
          </button>
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
          <div className={styles.field}>
            <label htmlFor="busca-paciente-cpf"><i className="las la-id-card" aria-hidden="true"></i> CPF</label>
            <input id="busca-paciente-cpf" type="text" inputMode="numeric" className={styles.control} value={filtros.cpf} onChange={e => setFiltros({...filtros, cpf: e.target.value})} placeholder="000.000.000-00" />
          </div>
          <div className={styles.field}>
            <label htmlFor="busca-paciente-mae"><i className="las la-female" aria-hidden="true"></i> Nome da Mãe</label>
            <input id="busca-paciente-mae" type="text" className={styles.control} value={filtros.mae} onChange={e => setFiltros({...filtros, mae: e.target.value})} placeholder="Nome da mãe" />
          </div>
          <div className={styles.field}>
            <label htmlFor="busca-paciente-nascimento"><i className="las la-calendar" aria-hidden="true"></i> Nascimento</label>
            <input id="busca-paciente-nascimento" type="date" className={styles.control} value={filtros.nascimento} onChange={e => setFiltros({...filtros, nascimento: e.target.value})} />
          </div>
          <div className={styles.field}>
            <label htmlFor="busca-paciente-telefone"><i className="las la-phone" aria-hidden="true"></i> Telefone</label>
            <input id="busca-paciente-telefone" type="tel" inputMode="tel" className={styles.control} value={filtros.telefone} onChange={e => setFiltros({...filtros, telefone: e.target.value})} placeholder="(00) 00000-0000" />
          </div>
          <div className={styles.field}>
            <label htmlFor="busca-paciente-sexo"><i className="las la-venus-mars" aria-hidden="true"></i> Sexo</label>
            <select id="busca-paciente-sexo" className={styles.control} value={filtros.sexo} onChange={e => setFiltros({...filtros, sexo: e.target.value})}>
              <option value="">Todos</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="busca-paciente-endereco"><i className="las la-map-marker" aria-hidden="true"></i> Cidade/Endereço</label>
            <input id="busca-paciente-endereco" type="text" className={styles.control} value={filtros.endereco} onChange={e => setFiltros({...filtros, endereco: e.target.value})} placeholder="Cidade ou rua" />
          </div>
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
                    <td style={{ padding: '14px', fontSize: '13px', color: '#334155' }}>{p.cpf || 'N/I'}</td>
                    <td style={{ padding: '14px', fontSize: '13px', color: '#334155' }}>{p.sexo || 'N/I'}</td>
                    <td style={{ padding: '14px', fontSize: '13px', color: '#334155' }}>{p.nascimento ? new Date(p.nascimento).toLocaleDateString('pt-BR') : 'N/I'}</td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }} className={STATUS_CORES[p.status] || 'bg-slate-100 text-slate-700'}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
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
