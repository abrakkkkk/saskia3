'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge, LoadingState, Panel } from '@/components/ui';
import type { ModeloClinico } from '@/lib/modelos-clinicos';

type Linha = {
  modelo: ModeloClinico; nome: string; fonte: string;
  validado: boolean; validadoEm: string | null; validadoPorNome: string | null; observacao: string | null;
};

/** Item 10: o ADMIN registra que a equipe clínica do hospital validou cada modelo oficial. */
export default function ModelosClinicos() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState<ModeloClinico | null>(null);
  const [observacoes, setObservacoes] = useState<Partial<Record<ModeloClinico, string>>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/modelos-clinicos', { signal: controller.signal })
      .then(async r => {
        const dados = await r.json().catch(() => null);
        if (!r.ok || !Array.isArray(dados)) throw new Error(dados?.error || 'Não foi possível carregar os modelos clínicos.');
        setLinhas(dados);
      })
      .catch(e => { if (!controller.signal.aborted) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os modelos clínicos.'); });
    return () => controller.abort();
  }, []);

  const alterar = async (modelo: ModeloClinico, validado: boolean) => {
    if (!validado && !window.confirm('Voltar a usar o modelo padrão sem validação? As telas voltam a mostrar "Modelo padrão MS/Anvisa".')) return;
    setSalvando(modelo);
    setErro('');
    try {
      const r = await fetch('/api/modelos-clinicos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelo, validado, observacao: observacoes[modelo] ?? '' }),
      });
      const dados = await r.json().catch(() => null);
      if (!r.ok || !Array.isArray(dados)) throw new Error(dados?.error || 'Não foi possível salvar.');
      setLinhas(dados);
      setObservacoes(o => ({ ...o, [modelo]: '' }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Panel title="Modelos clínicos" icon="las la-clipboard-check">
      <p className="mod-nota">
        Checklist cirúrgico e evolução de UTI seguem modelos oficiais do Ministério da Saúde e da Anvisa. Depois que a equipe clínica
        do hospital revisar cada modelo, marque como validado: o selo &quot;Modelo padrão MS/Anvisa&quot; sai das telas.
      </p>
      {erro && <p role="alert" className="mod-aviso mod-aviso-erro">{erro}</p>}
      {!linhas ? (!erro && <LoadingState message="Carregando modelos clínicos..." />) : (
        <ul className="cfg-modelos">
          {linhas.map(l => (
            <li key={l.modelo} className="cfg-modelo">
              <div className="cfg-modelo-topo">
                <strong>{l.nome}</strong>
                {l.validado ? <Badge tone="success">Validado</Badge> : <Badge tone="neutral">Modelo padrão MS/Anvisa</Badge>}
              </div>
              <p className="mod-secundario">{l.fonte}</p>
              {l.validado ? (
                <>
                  <p className="cfg-modelo-registro">
                    Validado por {l.validadoPorNome} em {l.validadoEm ? new Date(l.validadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    {l.observacao ? `. ${l.observacao}` : ''}
                  </p>
                  <div className="ux-acoes">
                    <button type="button" className="btn btn-secondary btn-sm" disabled={salvando === l.modelo} onClick={() => void alterar(l.modelo, false)}>
                      Desfazer validação
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor={`modelo-obs-${l.modelo}`}>Quem validou e como (opcional)</label>
                    <input id={`modelo-obs-${l.modelo}`} maxLength={500} placeholder="Ex.: Comissão de UTI, ata de 10/12" value={observacoes[l.modelo] ?? ''} onChange={e => setObservacoes(o => ({ ...o, [l.modelo]: e.target.value }))} />
                  </div>
                  <div className="ux-acoes">
                    <button type="button" className="btn btn-primary btn-sm" disabled={salvando === l.modelo} onClick={() => void alterar(l.modelo, true)}>
                      <ShieldCheck aria-hidden="true" size={16} /> {salvando === l.modelo ? 'Salvando…' : 'Marcar como validado'}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
