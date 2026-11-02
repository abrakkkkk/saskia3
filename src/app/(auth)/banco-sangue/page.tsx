'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, type Tone } from '@/components/ui';
import { pode } from '@/lib/permissions';
import { enviarJson, mensagemErro, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';
import './banco-sangue.css';

type EstoqueSangue = { id: string; tipo: string; quantidade: number; status: string };
type Movimentacao = { id: string; acao: string; usuarioNome: string; createdAt: string; detalhes: { tipo?: string; quantidade?: number; saldo?: number; saldoAnterior?: number; motivo?: string | null } | null };
type Operacao = 'ENTRADA' | 'SAIDA' | 'CORRECAO';

const TIPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TOM_STATUS: Record<string, Tone> = { 'CRÍTICO': 'danger', ALERTA: 'warning', NORMAL: 'success' };
const ROTULO_ACAO: Record<string, string> = { SANGUE_ENTRADA: 'Entrada', SANGUE_SAIDA: 'Saída', SANGUE_CORRECAO: 'Correção' };

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

  return (
    <div className="conteudo">
      <div className="bs-page">
        <PageHeader icon="las la-tint" title="Banco de Sangue" subtitle="Consulta e movimentação do estoque agregado de hemocomponentes deste hospital." />

        <Panel
          title="Estoque registrado"
          actions={<button className="bs-button bs-button-secondary" type="button" onClick={() => { setAtualizando(true); void carregar(); }} disabled={atualizando} aria-label="Atualizar estoque"><RefreshCw size={16} aria-hidden="true" /> {atualizando ? 'Atualizando…' : 'Atualizar'}</button>}
        >
          <p className="mod-nota">A base atual guarda apenas tipo sanguíneo, quantidade e faixa de estoque.</p>
          {loading ? <LoadingState message="Carregando estoque..." /> : erroCarga ? <ErrorState message={erroCarga} onRetry={() => void carregar()} /> : estoques.length === 0 ? <EmptyState icon="las la-tint" message="Nenhum estoque cadastrado para este hospital." /> : (
            <div className="bs-table-wrap"><table className="bs-table">
              <caption className="sr-only">Estoque agregado de hemocomponentes por tipo sanguíneo</caption>
              <thead><tr>{['Tipo sanguíneo', 'Quantidade registrada', 'Situação'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{estoques.map(item => <tr key={item.id}><td>{item.tipo}</td><td>{item.quantidade}</td><td><Badge tone={TOM_STATUS[item.status] ?? 'neutral'}>{item.status}</Badge></td></tr>)}</tbody>
            </table></div>
          )}
        </Panel>

        {podeGerir && (
          <Panel title="Registrar movimentação">
            <form className="bs-form" onSubmit={registrar}>
              <label>Operação<select value={operacao} onChange={e => setOperacao(e.target.value as Operacao)}><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option><option value="CORRECAO">Correção de inventário</option></select></label>
              <label>Tipo sanguíneo<select name="tipo" required><option value="">Selecione</option>{TIPOS.map(tipo => <option key={tipo}>{tipo}</option>)}</select></label>
              <label>{operacao === 'CORRECAO' ? 'Saldo correto' : 'Quantidade'}<input name="quantidade" type="number" min={operacao === 'CORRECAO' ? 0 : 1} step="1" inputMode="numeric" required /></label>
              <label>Motivo{operacao === 'CORRECAO' ? ' *' : ''}<input name="motivo" type="text" maxLength={500} /></label>
              <button className="bs-button bs-button-primary" type="submit" disabled={salvando}><Plus size={16} aria-hidden="true" />{salvando ? 'Salvando…' : 'Registrar'}</button>
            </form>
            {erroFormulario && <p className="mod-aviso mod-aviso-erro bs-retorno" role="alert">{erroFormulario}</p>}
            {mensagem && <p className="mod-aviso mod-aviso-sucesso bs-retorno" role="status">{mensagem}</p>}
          </Panel>
        )}

        {!loading && movimentacoes.length > 0 && (
          <Panel title="Últimas movimentações">
            <div className="bs-table-wrap"><table className="bs-table">
              <caption className="sr-only">Últimas movimentações do estoque de sangue</caption>
              <thead><tr>{['Data', 'Operação', 'Tipo', 'Quantidade', 'Saldo', 'Autor', 'Motivo'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{movimentacoes.map(mov => (
                <tr key={mov.id}>
                  <td>{new Date(mov.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{ROTULO_ACAO[mov.acao] ?? mov.acao}</td>
                  <td>{mov.detalhes?.tipo ?? '-'}</td>
                  <td>{mov.detalhes?.quantidade ?? '-'}</td>
                  <td>{mov.detalhes?.saldo ?? '-'}</td>
                  <td>{mov.usuarioNome}</td>
                  <td>{mov.detalhes?.motivo || '-'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </Panel>
        )}

        <aside className="mod-aviso mod-aviso-atencao bs-note" role="note">
          <ShieldAlert size={20} aria-hidden="true" /><p><strong>Fluxos transfusionais indisponíveis.</strong> Rastreabilidade por bolsa, compatibilidade clínica, prescrição e administração não são persistidas no sistema atual. Esses fluxos permanecem desativados até implementação e validação institucional.</p>
        </aside>
      </div>
    </div>
  );
}
