'use client';

import { useState, type FormEvent } from 'react';
import { Badge, EmptyState, type Tone } from '@/components/ui';
import { DIAS_ALERTA_VALIDADE, estaVencido, formatarValidade, venceEmBreve } from '@/lib/estoque';
import { enviarJson, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';

export type ItemEstoque = {
  id: string;
  categoria: string;
  subcategoria?: string | null;
  nome: string;
  codigo?: string | null;
  quantidade: number;
  unidade?: string | null;
  minimo: number;
  lote?: string | null;
  validade?: string | null;
  fornecedor?: string | null;
};

export type Movimentacao = {
  id: string;
  tipo: string;
  quantidade: number;
  setor?: string | null;
  fornecedor?: string | null;
  responsavel: string;
  observacao?: string | null;
  createdAt: string;
  item?: { id: string; nome: string; lote?: string | null; validade?: string | null; unidade?: string | null } | null;
  paciente?: { id: string; nome: string } | null;
};

export type RespostaMovimentacoes = { itens: Movimentacao[]; total: number; entradasHoje: number; saidasHoje: number };

/** Rótulo para selects: identifica o lote e a validade do que será movimentado. */
export function rotuloItem(item: ItemEstoque) {
  return `${item.nome} | lote ${item.lote || 'não informado'} | val. ${formatarValidade(item.validade)} | saldo ${item.quantidade}`;
}

/** Itens que podem sair, na ordem FEFO da API. */
export function itensDisponiveis(itens: ItemEstoque[]) {
  return itens.filter(item => item.quantidade > 0 && !estaVencido(item.validade));
}

function situacao(item: ItemEstoque): { tom: Tone; texto: string } {
  if (item.quantidade === 0) return { tom: 'neutral', texto: 'Zerado' };
  if (estaVencido(item.validade)) return { tom: 'danger', texto: 'Vencido' };
  if (venceEmBreve(item.validade)) return { tom: 'warning', texto: `Vence em até ${DIAS_ALERTA_VALIDADE} dias` };
  if (item.quantidade <= item.minimo) return { tom: 'warning', texto: 'Estoque baixo' };
  return { tom: 'success', texto: 'OK' };
}

export function rotuloTipoMovimentacao(tipo: string) {
  return tipo === 'ENTRADA' ? 'Entrada' : tipo === 'SAIDA' ? 'Saída' : 'Ajuste';
}

export function quantidadeAssinada(movimentacao: Movimentacao) {
  if (movimentacao.tipo === 'ENTRADA') return `+${movimentacao.quantidade}`;
  if (movimentacao.tipo === 'SAIDA') return `-${movimentacao.quantidade}`;
  return movimentacao.quantidade > 0 ? `+${movimentacao.quantidade}` : String(movimentacao.quantidade);
}

function AjusteForm({ item, onSalvo, onCancelar }: { item: ItemEstoque; onSalvo: () => void; onCancelar: () => void }) {
  const [quantidade, setQuantidade] = useState(String(item.quantidade));
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    const novaQuantidade = Number(quantidade);
    if (quantidade === '' || !Number.isSafeInteger(novaQuantidade) || novaQuantidade < 0 || !motivo.trim()) {
      setErro('Informe a quantidade correta e o motivo do ajuste.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await enviarJson('/api/estoque/movimentacao', 'POST', { tipo: 'AJUSTE', itemId: item.id, novaQuantidade, motivo: motivo.trim() }, 'Não foi possível registrar o ajuste.');
      onSalvo();
    } catch (falha) {
      setErro(textoDoErro(falha, 'Não foi possível registrar o ajuste.'));
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar}>
      <p className="mod-nota">Ajustar {item.nome}, lote {item.lote || 'não informado'}. Saldo atual: {item.quantidade}.</p>
      {erro && <p className="mod-aviso mod-aviso-erro" role="alert">{erro}</p>}
      <div className="mod-form-grid">
        <div className="form-group">
          <label htmlFor={`ajuste-qtd-${item.id}`}>Saldo correto *</label>
          <input id={`ajuste-qtd-${item.id}`} type="number" min="0" step="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor={`ajuste-motivo-${item.id}`}>Motivo *</label>
          <input id={`ajuste-motivo-${item.id}`} type="text" maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: descarte de vencido, inventário" />
        </div>
      </div>
      <div className="mod-acoes">
        <button type="button" className="btn btn-sm" onClick={onCancelar} disabled={salvando}>Cancelar</button>
        <button type="submit" className="btn btn-sm btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Registrar ajuste'}</button>
      </div>
    </form>
  );
}

export default function TabelaEstoque({ itens, podeAjustar, onAjustado, vazio }: {
  itens: ItemEstoque[];
  podeAjustar: boolean;
  onAjustado: () => void;
  vazio: string;
}) {
  const [emAjuste, setEmAjuste] = useState<string | null>(null);

  if (itens.length === 0) return <EmptyState icon="las la-boxes" message={vazio} />;

  const colunas = podeAjustar ? 8 : 7;
  return (
    <div className="tabela-wrapper">
      <table className="tabela">
        <thead>
          <tr>
            <th>Item</th><th>Código</th><th>Lote</th><th>Validade</th><th>Qtd.</th><th>Mín.</th><th>Situação</th>
            {podeAjustar && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {itens.map(item => {
            const { tom, texto } = situacao(item);
            const classe = item.quantidade > 0 && estaVencido(item.validade) ? 'mod-linha-vencida' : item.quantidade > 0 && venceEmBreve(item.validade) ? 'mod-linha-alerta' : undefined;
            return [
              <tr key={item.id} className={classe}>
                <td>
                  <strong>{item.nome}</strong>
                  <span className="mod-secundario">{[item.subcategoria, item.unidade].filter(Boolean).join(' | ')}</span>
                </td>
                <td>{item.codigo || '-'}</td>
                <td>{item.lote || '-'}</td>
                <td>{item.validade ? formatarValidade(item.validade) : '-'}</td>
                <td><strong>{item.quantidade}</strong></td>
                <td>{item.minimo}</td>
                <td><Badge tone={tom}>{texto}</Badge></td>
                {podeAjustar && (
                  <td>
                    <button type="button" className="btn btn-xs btn-info" onClick={() => setEmAjuste(emAjuste === item.id ? null : item.id)} aria-expanded={emAjuste === item.id}>
                      Ajustar
                    </button>
                  </td>
                )}
              </tr>,
              emAjuste === item.id && (
                <tr key={`${item.id}-ajuste`}>
                  <td colSpan={colunas}>
                    <AjusteForm item={item} onCancelar={() => setEmAjuste(null)} onSalvo={() => { setEmAjuste(null); onAjustado(); }} />
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
