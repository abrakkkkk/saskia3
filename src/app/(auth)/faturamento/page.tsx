'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, SearchInput, Tabs } from '@/components/ui';
import { NOME_GUIA, NOME_STATUS_CONTA, STATUS_CONTA, type TipoGuia } from '@/lib/faturamento/dominios';
import { pode } from '@/lib/permissions';
import { AbaConvenios, AbaLotes, AbaUnidade } from './Abas';
import ContaDetalhe from './ContaDetalhe';
import NovaConta from './NovaConta';
import { api, brl, competenciaTexto, dataTexto, erroTexto, TOM_STATUS, type ContaResumo, type Convenio } from './comum';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './faturamento.css';

type Aba = 'contas' | 'lotes' | 'convenios' | 'unidade';

export default function FaturamentoPage() {
  const { data: session } = useSession();
  const cargo = session?.user?.cargo;
  const podeGerir = pode(cargo, 'faturamento:gerir');
  const podeConfigurar = pode(cargo, 'faturamento:configurar');

  const [aba, setAba] = useState<Aba>('contas');
  const [contas, setContas] = useState<ContaResumo[] | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('');
  const [fonte, setFonte] = useState('');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState(false);

  const carregarContas = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (status) p.set('status', status);
      if (fonte) p.set('fonte', fonte);
      if (busca.trim().length >= 2) p.set('q', busca.trim());
      setContas(await api<ContaResumo[]>(`/api/faturamento/contas?${p}`));
      setErro('');
    } catch (e) {
      setErro(erroTexto(e));
    }
  }, [status, fonte, busca]);
  const carregarConvenios = useCallback(async () => {
    try { setConvenios(await api<Convenio[]>('/api/faturamento/convenios')); } catch { setConvenios([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void carregarContas(), 250);
    return () => clearTimeout(t);
  }, [carregarContas]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial dos convênios
    void carregarConvenios();
  }, [carregarConvenios]);

  const abertas = contas?.filter(c => c.status === 'ABERTA').length ?? 0;
  const fechadas = contas?.filter(c => c.status === 'FECHADA').length ?? 0;

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-file-invoice-dollar"
        title="Faturamento"
        subtitle="Contas de convênio (TISS) e produção do SUS (BPA e AIH)."
        actions={podeGerir ? (
          <button type="button" className="btn btn-primary" onClick={() => setNova(true)}>
            <i className="las la-plus" aria-hidden="true"></i> Nova conta
          </button>
        ) : undefined}
      />

      <Tabs<Aba>
        label="Seções do faturamento"
        active={aba}
        onChange={setAba}
        tabs={[
          { id: 'contas', label: 'Contas', icon: 'las la-receipt' },
          { id: 'lotes', label: 'Lotes e arquivos', icon: 'las la-file-export' },
          { id: 'convenios', label: 'Convênios', icon: 'las la-handshake' },
          { id: 'unidade', label: 'Unidade', icon: 'las la-hospital-alt' },
        ]}
      />

      {aba === 'contas' && (
        <>
          <div className="mod-filtros">
            <SearchInput value={busca} onChange={setBusca} placeholder="Buscar paciente" />
            <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {STATUS_CONTA.map(s => <option key={s} value={s}>{NOME_STATUS_CONTA[s]}</option>)}
            </select>
            <select aria-label="Fonte pagadora" value={fonte} onChange={e => setFonte(e.target.value)}>
              <option value="">Convênio e SUS</option>
              <option value="CONVENIO">Convênio</option>
              <option value="SUS">SUS</option>
            </select>
          </div>
          {contas && contas.length > 0 && (abertas > 0 || fechadas > 0) && (
            <p className="fat-contagem">{abertas} {abertas === 1 ? 'conta aberta' : 'contas abertas'} · {fechadas} {fechadas === 1 ? 'pronta' : 'prontas'} para lote</p>
          )}
          {erro ? <ErrorState message={erro} onRetry={() => void carregarContas()} /> : !contas ? <LoadingState message="Carregando contas..." /> : contas.length === 0 ? (
            <EmptyState icon="las la-receipt" message={status || fonte || busca ? 'Nenhuma conta com esses filtros.' : 'Nenhuma conta aberta ainda.'}
              action={podeGerir && !status && !fonte && !busca ? <button type="button" className="btn btn-primary" onClick={() => setNova(true)}>Abrir a primeira conta</button> : undefined} />
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr><th>Nº</th><th>Paciente</th><th>Guia</th><th>Pagador</th><th>Competência</th><th className="fat-num">Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {contas.map(c => (
                    <tr key={c.id}>
                      <td className="fat-codigo">{c.numero}</td>
                      <td>
                        <button type="button" className="fat-link" onClick={() => setAberta(c.id)}>{c.paciente.nome}</button>
                        <span className="mod-secundario">{dataTexto(c.dataAtendimento)} · {c._count.itens} {c._count.itens === 1 ? 'item' : 'itens'}</span>
                      </td>
                      <td>{NOME_GUIA[c.tipoGuia as TipoGuia]}</td>
                      <td>{c.fonte === 'SUS' ? 'SUS' : c.operadora?.nome ?? 'Convênio'}</td>
                      <td>{competenciaTexto(c.competencia)}</td>
                      <td className="fat-num">
                        {brl(c.valorTotal)}
                        {Number(c.valorGlosado) > 0 && <span className="mod-secundario">Glosa {brl(c.valorGlosado)}</span>}
                      </td>
                      <td><Badge tone={TOM_STATUS[c.status]}>{NOME_STATUS_CONTA[c.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {aba === 'lotes' && <AbaLotes convenios={convenios} podeGerir={podeGerir} onMudou={() => void carregarContas()} />}
      {aba === 'convenios' && <AbaConvenios convenios={convenios} podeConfigurar={podeConfigurar} onMudou={() => void carregarConvenios()} />}
      {aba === 'unidade' && <AbaUnidade podeConfigurar={podeConfigurar} />}

      {nova && <NovaConta convenios={convenios} onFechar={() => setNova(false)} onCriada={id => { setNova(false); setAberta(id); void carregarContas(); }} />}
      {aberta && <ContaDetalhe contaId={aberta} podeGerir={podeGerir} onFechar={() => setAberta(null)} onMudou={() => void carregarContas()} />}
    </div>
  );
}
