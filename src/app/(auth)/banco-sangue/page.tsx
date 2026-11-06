'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatCard, StatGrid, type Tone } from '@/components/ui';
import { pode } from '@/lib/permissions';
import { enviarJson, mensagemErro, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';

type EstoqueSangue = { id: string; tipo: string; quantidade: number; status: string };
type Movimentacao = { id: string; acao: string; usuarioNome: string; createdAt: string; detalhes: { tipo?: string; quantidade?: number; saldo?: number; saldoAnterior?: number; motivo?: string | null } | null };
type Operacao = 'ENTRADA' | 'SAIDA' | 'CORRECAO';

const TIPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TOM_STATUS: Record<string, Tone> = { 'CRÍTICO': 'danger', ALERTA: 'warning', NORMAL: 'success' };
const ROTULO_ACAO: Record<string, string> = { SANGUE_ENTRADA: 'Entrada', SANGUE_SAIDA: 'Saída', SANGUE_CORRECAO: 'Correção' };

const rotuloStatus = (status: string) => status.charAt(0) + status.slice(1).toLocaleLowerCase('pt-BR');

export default function BancoSanguePage() {
  const { data: session } = useSession();
  const podeGerir = pode(session?.user?.cargo, 'sangue:gerir');

  const [estoques, setEstoques] = useState<EstoqueSangue[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroCarga, setErroCarga] = useState('');
  const [erroFormulario, setErroFormulario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [operacao, setOperacao] = useState<Operacao>('ENTRADA');

  const carregar = useCallback(async () => {
    try {
      const response = await fetch('/api/banco-sangue', { cache: 'no-store' });
      if (!response.ok) throw new Error(await mensagemErro(response, 'Não foi possível carregar o estoque do hospital.'));
      const data = await response.json();
      if (!Array.isArray(data?.estoque)) throw new Error('Resposta inválida ao carregar o estoque.');
      setEstoques(data.estoque);
      setMovimentacoes(Array.isArray(data.movimentacoes) ? data.movimentacoes : []);
      setErroCarga('');
    } catch (error) {
      setErroCarga(textoDoErro(error, 'Falha ao carregar estoque.'));
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, []);

  // Carga inicial: o setState só ocorre depois do await da requisição.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregar(); }, [carregar]);

  const registrar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (salvando) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const tipo = String(form.get('tipo') ?? '');
    const quantidade = Number(form.get('quantidade'));
    const motivo = String(form.get('motivo') ?? '').trim();
    setErroFormulario('');
    setMensagem('');
    if (operacao === 'CORRECAO' && !motivo) {
      setErroFormulario('Informe o motivo da correção.');
      return;
    }
    setSalvando(true);
    try {
      if (operacao === 'CORRECAO') {
        const registro = estoques.find(item => item.tipo === tipo);
        if (!registro) throw new Error(`Ainda não há estoque de ${tipo}: registre uma entrada.`);
        await enviarJson(`/api/banco-sangue/${registro.id}`, 'PUT', { quantidade, motivo }, 'Não foi possível corrigir o saldo.');
      } else {
        await enviarJson('/api/banco-sangue', 'POST', { tipo, operacao, quantidade, motivo }, 'Não foi possível registrar a movimentação.');
      }
      formElement.reset();
      setMensagem(operacao === 'ENTRADA' ? 'Entrada registrada.' : operacao === 'SAIDA' ? 'Saída registrada.' : 'Saldo corrigido.');
      await carregar();
    } catch (error) {
      setErroFormulario(textoDoErro(error, 'Falha ao registrar a movimentação.'));
    } finally {
      setSalvando(false);
    }
  };

  const criticos = estoques.filter(item => item.status === 'CRÍTICO').length;
  const emAlerta = estoques.filter(item => item.status === 'ALERTA').length;

  return (
    <div className="conteudo mod-pagina">
      <PageHeader icon="las la-tint" title="Banco de sangue" subtitle="Estoque e movimentação de hemocomponentes" />

      {!loading && !erroCarga && estoques.length > 0 && (
        <StatGrid>
          <StatCard icon="las la-tint" value={estoques.length} label="Tipos registrados" />
          <StatCard icon="las la-exclamation-circle" value={emAlerta} label="Em alerta" tone="warning" alerta hint="Tipos sanguíneos com estoque na faixa de alerta" />
          <StatCard icon="las la-exclamation-triangle" value={criticos} label="Críticos" tone="danger" alerta hint="Tipos sanguíneos com estoque crítico" />
        </StatGrid>
      )}

      <Panel
        title="Estoque registrado"
        actions={<button className="btn btn-secondary btn-sm" type="button" onClick={() => { setAtualizando(true); void carregar(); }} disabled={atualizando} aria-label="Atualizar estoque"><i className={`las la-sync${atualizando ? ' la-spin' : ''}`} aria-hidden="true"></i> {atualizando ? 'Atualizando...' : 'Atualizar'}</button>}
      >
        <p className="mod-nota">O sistema registra só tipo sanguíneo, quantidade e faixa de estoque.</p>
        {loading ? <LoadingState message="Carregando estoque..." /> : erroCarga ? <ErrorState message={erroCarga} onRetry={() => void carregar()} /> : estoques.length === 0 ? <EmptyState icon="las la-tint" message="Nenhum estoque cadastrado para este hospital." /> : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <caption className="sr-only">Estoque agregado de hemocomponentes por tipo sanguíneo</caption>
              <thead><tr><th scope="col">Tipo</th><th scope="col">Quantidade</th><th scope="col">Situação</th></tr></thead>
              <tbody>{estoques.map(item => <tr key={item.id}><td><strong>{item.tipo}</strong></td><td>{item.quantidade}</td><td><Badge tone={TOM_STATUS[item.status] ?? 'neutral'}>{rotuloStatus(item.status)}</Badge></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Panel>

      {podeGerir && (
        <Panel title="Registrar movimentação">
          {erroFormulario && <p className="mod-aviso mod-aviso-erro" role="alert">{erroFormulario}</p>}
          {mensagem && <p className="mod-aviso mod-aviso-sucesso" role="status">{mensagem}</p>}
          <form onSubmit={registrar}>
            <div className="mod-form-grid">
              <div className="form-group">
                <label htmlFor="bs-operacao">Operação</label>
                <select id="bs-operacao" value={operacao} onChange={e => setOperacao(e.target.value as Operacao)}><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option><option value="CORRECAO">Correção de inventário</option></select>
              </div>
              <div className="form-group">
                <label htmlFor="bs-tipo">Tipo sanguíneo *</label>
                <select id="bs-tipo" name="tipo" required><option value="">Selecione</option>{TIPOS.map(tipo => <option key={tipo}>{tipo}</option>)}</select>
              </div>
              <div className="form-group">
                <label htmlFor="bs-quantidade">{operacao === 'CORRECAO' ? 'Saldo correto *' : 'Quantidade *'}</label>
                <input id="bs-quantidade" name="quantidade" type="number" min={operacao === 'CORRECAO' ? 0 : 1} step="1" inputMode="numeric" required />
              </div>
              <div className="form-group">
                <label htmlFor="bs-motivo">Motivo{operacao === 'CORRECAO' ? ' *' : ''}</label>
                <input id="bs-motivo" name="motivo" type="text" maxLength={500} />
              </div>
            </div>
            <div className="mod-acoes">
              <button className="btn btn-primary" type="submit" disabled={salvando}><i className="las la-plus" aria-hidden="true"></i> {salvando ? 'Salvando...' : 'Registrar'}</button>
            </div>
          </form>
        </Panel>
      )}

      {!loading && movimentacoes.length > 0 && (
        <Panel title="Últimas movimentações">
          <div className="tabela-wrapper">
            <table className="tabela">
              <caption className="sr-only">Últimas movimentações do estoque de sangue</caption>
              <thead><tr><th scope="col">Data</th><th scope="col">Operação</th><th scope="col">Tipo</th><th scope="col">Quantidade</th><th scope="col">Saldo</th><th scope="col">Autor</th><th scope="col">Motivo</th></tr></thead>
              <tbody>{movimentacoes.map(mov => (
                <tr key={mov.id}>
                  <td>{new Date(mov.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{ROTULO_ACAO[mov.acao] ?? mov.acao}</td>
                  <td><strong>{mov.detalhes?.tipo ?? '-'}</strong></td>
                  <td>{mov.detalhes?.quantidade ?? '-'}</td>
                  <td>{mov.detalhes?.saldo ?? '-'}</td>
                  <td>{mov.usuarioNome}</td>
                  <td>{mov.detalhes?.motivo || '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>
      )}

      <aside className="mod-aviso mod-aviso-atencao" role="note">
        <strong>Fluxos transfusionais indisponíveis</strong>
        Rastreabilidade por bolsa, compatibilidade clínica, prescrição e administração não são registradas no sistema atual. Esses fluxos ficam desativados até a implementação e a validação institucional.
      </aside>
    </div>
  );
}
