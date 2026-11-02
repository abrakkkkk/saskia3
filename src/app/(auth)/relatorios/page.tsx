'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorState, LoadingState, PageHeader, Panel, StatCard, StatGrid, Tabs } from '@/components/ui';
import type { PontoLeito, PontoStatus } from './graficos-relatorio';
import './relatorios.css';

// Gráficos em chunk separado: o recharts só é baixado depois que a tela abre.
const GraficosRelatorio = dynamic(() => import('./graficos-relatorio'), {
  ssr: false,
  loading: () => <LoadingState message="Carregando gráficos..." />,
});

const STATUS_LABELS: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ESPERA: 'Em espera',
  EM_ATENDIMENTO: 'Em atendimento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  FALTOU: 'Faltou',
};
const FILTER_LABELS: Record<string, string> = {
  hoje: 'Hoje', semana: 'Últimos 7 dias', mes: 'Últimos 30 dias', ano: 'Este ano', todos: 'Todo o período',
};
const ABAS = [
  { id: 'geral', label: 'Gráficos', icon: 'las la-chart-pie' },
  { id: 'leitos', label: 'Ocupação de leitos', icon: 'las la-bed' },
] as const;

type Resumo = { totalPacientes: number; atendimentos: number; internacoes: number; obitos: number; taxaUTI: string; cirurgias: number };
type Contagem = { status: string; total: number };
type ContagemLeito = { tipo: string | null; status: string; total: number };

const RESUMO_VAZIO: Resumo = { totalPacientes: 0, atendimentos: 0, internacoes: 0, obitos: 0, taxaUTI: '—', cirurgias: 0 };

function dataLocalKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function periodoRapido(periodo: string): [string, string] {
  const hoje = new Date();
  const deslocar = (dias: number) => { const d = new Date(hoje); d.setDate(hoje.getDate() - dias); return dataLocalKey(d); };
  if (periodo === 'hoje') return [dataLocalKey(hoje), dataLocalKey(hoje)];
  if (periodo === 'semana') return [deslocar(6), dataLocalKey(hoje)];
  if (periodo === 'mes') return [deslocar(29), dataLocalKey(hoje)];
  if (periodo === 'ano') return [dataLocalKey(new Date(hoje.getFullYear(), 0, 1)), dataLocalKey(hoje)];
  return ['', ''];
}

const inteiroValido = (valor: unknown) => Number.isSafeInteger(valor) && (valor as number) >= 0;

export default function RelatoriosPage() {
  const requisicaoAtual = useRef(0);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<(typeof ABAS)[number]['id']>('geral');
  const [filtroRapido, setFiltroRapido] = useState('mes');
  const [erro, setErro] = useState('');
  const [[inicio, fim], setPeriodo] = useState<[string, string]>(() => periodoRapido('mes'));

  const [resumo, setResumo] = useState<Resumo>(RESUMO_VAZIO);
  const [carregadoUmaVez, setCarregadoUmaVez] = useState(false);
  const [graficoStatus, setGraficoStatus] = useState<PontoStatus[]>([]);
  const [graficoLeitos, setGraficoLeitos] = useState<PontoLeito[]>([]);

  const gerar = useCallback(async () => {
    const id = ++requisicaoAtual.current;
    if (inicio && fim && inicio > fim) { setCarregando(false); return; }
    setErro('');
    setCarregando(true);
    try {
      const resposta = await fetch(`/api/relatorios?${new URLSearchParams({ inicio, fim })}`, { cache: 'no-store' });
      const dados: unknown = await resposta.json().catch(() => null);
      const relatorio = dados as Record<string, unknown> | null;
      if (!resposta.ok) throw new Error(typeof relatorio?.error === 'string' ? relatorio.error : 'Não foi possível carregar os dados do relatório.');
      const agendamentos = relatorio?.agendamentos as Contagem[] | undefined;
      const leitos = relatorio?.leitos as ContagemLeito[] | undefined;
      if (!relatorio || !['pacientesNoPeriodo', 'internadosAgora', 'obitosNoPeriodo', 'cirurgiasNoPeriodo'].every(campo => inteiroValido(relatorio[campo]))
        || !Array.isArray(agendamentos) || !agendamentos.every(item => typeof item?.status === 'string' && inteiroValido(item.total))
        || !Array.isArray(leitos) || !leitos.every(item => typeof item?.status === 'string' && inteiroValido(item.total))) {
        throw new Error('A resposta do relatório está incompleta.');
      }
      if (id !== requisicaoAtual.current) return;

      const concluidos = agendamentos.filter(item => item.status === 'CONCLUIDO').reduce((soma, item) => soma + item.total, 0);
      const totalLeitos = leitos.reduce((soma, item) => soma + item.total, 0);
      const ocupados = leitos.filter(item => item.status === 'OCUPADO').reduce((soma, item) => soma + item.total, 0);
      setResumo({
        totalPacientes: relatorio.pacientesNoPeriodo as number,
        atendimentos: concluidos,
        internacoes: relatorio.internadosAgora as number,
        obitos: relatorio.obitosNoPeriodo as number,
        taxaUTI: totalLeitos ? `${Math.round((ocupados / totalLeitos) * 100)}%` : '—',
        cirurgias: relatorio.cirurgiasNoPeriodo as number,
      });
      setGraficoStatus(Object.keys(STATUS_LABELS).map(chave => ({
        name: STATUS_LABELS[chave],
        value: agendamentos.filter(item => item.status === chave).reduce((soma, item) => soma + item.total, 0),
      })));
      const tipos = Array.from(new Set(leitos.map(item => item.tipo || 'Não informado')));
      setGraficoLeitos(tipos.map(tipo => {
        const doTipo = leitos.filter(item => (item.tipo || 'Não informado') === tipo);
        const ocupadosTipo = doTipo.filter(item => item.status === 'OCUPADO').reduce((soma, item) => soma + item.total, 0);
        const totalTipo = doTipo.reduce((soma, item) => soma + item.total, 0);
        return { tipo, ocupados: ocupadosTipo, livres: totalTipo - ocupadosTipo };
      }));
      setCarregadoUmaVez(true);
    } catch (causa) {
      if (id !== requisicaoAtual.current) return;
      // Em erro os números ficam "—", nunca zero: zero pareceria dado real.
      setErro(causa instanceof Error ? causa.message : 'Erro ao carregar relatórios.');
      setCarregadoUmaVez(false);
      setResumo(RESUMO_VAZIO);
      setGraficoStatus([]);
      setGraficoLeitos([]);
    } finally {
      if (id === requisicaoAtual.current) setCarregando(false);
    }
  }, [inicio, fim]);

  useEffect(() => { void Promise.resolve().then(gerar); }, [gerar]);

  const escolherPeriodo = (periodo: string) => { setFiltroRapido(periodo); setPeriodo(periodoRapido(periodo)); };

  const exportarCsv = () => {
    const linhas: [string, string | number][] = [
      ['Pacientes cadastrados no período', resumo.totalPacientes],
      ['Agendamentos concluídos no período', resumo.atendimentos],
      ['Pacientes internados agora', resumo.internacoes],
      ['Óbitos no período', resumo.obitos],
      ['Ocupação atual da UTI', resumo.taxaUTI],
      ['Cirurgias cadastradas no período', resumo.cirurgias],
    ];
    const celula = (valor: string) => `"${(/^[\u0000- ]*[=+@-]/.test(valor) ? `'${valor}` : valor).replace(/"/g, '""')}"`;
    const csv = 'Indicador;Valor\n' + linhas.map(([nome, valor]) => `${celula(nome)};${celula(String(valor))}`).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    const ancora = document.createElement('a');
    ancora.href = url;
    ancora.download = 'relatorio-gerencial.csv';
    ancora.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const periodoInvalido = Boolean(inicio && fim && inicio > fim);
  const numero = (valor: number | string) => (carregadoUmaVez ? valor : '—');
  const tipos = graficoLeitos;

  return (
    <div className="conteudo">
      <div className="rel-container">
        <PageHeader
          icon="las la-chart-bar"
          title="Relatórios gerenciais"
          subtitle="Indicadores agregados do hospital. Nenhum nome de paciente ou de profissional aparece aqui."
          actions={<>
            <button type="button" className="btn btn-primary" onClick={exportarCsv} disabled={carregando || !carregadoUmaVez}><i className="las la-file-csv" aria-hidden="true"></i> Exportar resumo CSV</button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}><i className="las la-print" aria-hidden="true"></i> Imprimir</button>
          </>}
        />

        <div className="filtros-rapidos" style={{ display: 'flex', gap: 8, marginBottom: 15, flexWrap: 'wrap' }} role="group" aria-label="Período rápido">
          {Object.keys(FILTER_LABELS).map(chave => (
            <button key={chave} type="button" className={`filtro-rel-btn ${filtroRapido === chave ? 'ativo' : ''}`} aria-pressed={filtroRapido === chave} onClick={() => escolherPeriodo(chave)}>
              {FILTER_LABELS[chave]}
            </button>
          ))}
        </div>

        <div className="filtros-periodo" style={{ display: 'flex', gap: 10, marginBottom: 25, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="periodo-campo"><label htmlFor="relatorio-inicio">Data inicial</label><input id="relatorio-inicio" type="date" className="periodo-input" max={fim || undefined} value={inicio} onChange={e => { setFiltroRapido(''); setPeriodo([e.target.value, fim]); }} /></div>
          <div className="periodo-campo"><label htmlFor="relatorio-fim">Data final</label><input id="relatorio-fim" type="date" className="periodo-input" min={inicio || undefined} value={fim} onChange={e => { setFiltroRapido(''); setPeriodo([inicio, e.target.value]); }} /></div>
          <button type="button" className="btn-atualizar" onClick={() => void gerar()} disabled={carregando || periodoInvalido}><i className="las la-sync-alt" aria-hidden="true"></i> {carregando ? 'Atualizando...' : 'Atualizar'}</button>
        </div>
        {periodoInvalido && <p role="alert" style={{ color: 'var(--ui-on-dark)', marginBottom: 16 }}>A data inicial deve ser anterior ou igual à data final.</p>}
        {erro && <ErrorState message={erro} onRetry={() => void gerar()} />}
        {carregando && !erro && <p role="status" style={{ color: 'var(--ui-on-dark-muted)', marginBottom: 16 }}>Atualizando indicadores…</p>}

        <StatGrid>
          <StatCard icon="las la-users" tone="info" value={numero(resumo.totalPacientes)} label="Pacientes cadastrados no período" />
          <StatCard icon="las la-calendar-check" tone="success" value={numero(resumo.atendimentos)} label="Agendamentos concluídos no período" />
          <StatCard icon="las la-procedures" tone="warning" value={numero(resumo.internacoes)} label="Internados agora" />
          <StatCard icon="las la-cross" tone="neutral" value={numero(resumo.obitos)} label="Óbitos no período" />
          <StatCard icon="las la-bed" tone="info" value={numero(resumo.taxaUTI)} label="Ocupação atual da UTI" />
          <StatCard icon="las la-cut" tone="neutral" value={numero(resumo.cirurgias)} label="Cirurgias cadastradas no período" />
        </StatGrid>

        <Tabs label="Seções do relatório" tabs={ABAS} active={aba} onChange={setAba} />

        {aba === 'geral' && carregadoUmaVez && <GraficosRelatorio status={graficoStatus} leitos={graficoLeitos} />}

        {aba === 'leitos' && carregadoUmaVez && (
          <Panel title="Ocupação atual por tipo de leito">
            {tipos.length === 0 ? <p>Nenhum leito de UTI cadastrado.</p> : (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead><tr><th>Tipo de leito</th><th>Ocupados / total</th><th>Taxa de ocupação</th></tr></thead>
                  <tbody>
                    {tipos.map(item => {
                      const total = item.ocupados + item.livres;
                      const taxa = total ? Math.round((item.ocupados / total) * 100) : 0;
                      return (
                        <tr key={item.tipo}>
                          <td><strong>{item.tipo}</strong></td>
                          <td>{item.ocupados} / {total}</td>
                          <td>{taxa}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
