'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, ErrorState, LoadingState, Panel } from '@/components/ui';
import SeloModelo from '@/components/ui/SeloModelo';
import { CARGO_LABEL, type Cargo } from '@/lib/permissions';
import type { SituacaoModelo } from '@/lib/modelos-clinicos';
import { CHECKLIST, ETAPAS_CHECKLIST, rotuloResposta, type EtapaChecklist, type Respostas } from '@/lib/checklist-cirurgico';

type EtapaRegistrada = {
  etapa: EtapaChecklist; respostas: Respostas; observacoes: string | null;
  respondidoPorNome: string; respondidoPorCargo: string; respondidoEm: string;
};

export type CirurgiaResumo = { id: string; procedimento: string; status: string; paciente: { nome: string } };

function hora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ChecklistCirurgico({ cirurgia, podeResponder, onFechar }: {
  cirurgia: CirurgiaResumo; podeResponder: boolean; onFechar: () => void;
}) {
  const [etapas, setEtapas] = useState<EtapaRegistrada[]>([]);
  const [modelo, setModelo] = useState<SituacaoModelo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [respostas, setRespostas] = useState<Respostas>({});
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const ancora = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ancora.current?.scrollIntoView({ block: 'start', behavior: reduzir ? 'auto' : 'smooth' });
  }, []);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/cirurgias/${encodeURIComponent(cirurgia.id)}/checklist`);
      const dados = await res.json().catch(() => null);
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível carregar o checklist.');
      setEtapas(Array.isArray(dados?.etapas) ? dados.etapas : []);
      setModelo(dados?.modelo ?? null);
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o checklist.');
    } finally {
      setCarregando(false);
    }
  }, [cirurgia.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  const feitas = new Map(etapas.map(e => [e.etapa, e]));
  const proxima = ETAPAS_CHECKLIST.find(e => !feitas.has(e)) ?? null;
  const encerrado = cirurgia.status === 'CANCELADA';

  const registrar = async (etapa: EtapaChecklist) => {
    setSalvando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/cirurgias/${encodeURIComponent(cirurgia.id)}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa, respostas, observacoes }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível registrar a etapa.');
      setEtapas(l => [...l, dados]);
      setRespostas({});
      setObservacoes('');
      setAviso({ tipo: 'sucesso', texto: `${CHECKLIST[etapa].titulo}: etapa registrada.` });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível registrar a etapa.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div ref={ancora} className="cc-check-ancora">
    <Panel
      title={`Checklist de cirurgia segura · ${cirurgia.paciente.nome}`}
      icon="las la-clipboard-check"
      actions={<button type="button" className="btn btn-xs btn-secondary" onClick={onFechar}>Fechar</button>}
    >
      <div className="cc-check-topo">
        <p className="mod-nota">{cirurgia.procedimento}. Etapas na ordem; item não conforme interrompe a verificação até ser resolvido.</p>
        <SeloModelo situacao={modelo} />
      </div>
      {aviso && <p className={`mod-aviso mod-aviso-${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}

      {carregando ? <LoadingState message="Carregando checklist..." /> : erro ? <ErrorState message={erro} onRetry={() => { setCarregando(true); void carregar(); }} /> : (
        <ol className="cc-check-etapas">
          {ETAPAS_CHECKLIST.map(etapa => {
            const def = CHECKLIST[etapa];
            const registro = feitas.get(etapa);
            const atual = etapa === proxima && !encerrado;
            return (
              <li key={etapa} className={`cc-check-etapa ${registro ? 'cc-check-feita' : atual ? 'cc-check-atual' : ''}`}>
                <div className="cc-check-cabeca">
                  <h3>{def.titulo} <span className="cc-check-momento">{def.momento}</span></h3>
                  {registro ? <Badge tone="success">Concluída</Badge> : atual ? <Badge tone="info">Agora</Badge> : <Badge tone="neutral">{encerrado ? 'Encerrado' : 'Aguardando'}</Badge>}
                </div>

                {registro && (
                  <>
                    <p className="mod-secundario">
                      {registro.respondidoPorNome} · {CARGO_LABEL[registro.respondidoPorCargo as Cargo] ?? registro.respondidoPorCargo} · {hora(registro.respondidoEm)}
                    </p>
                    <dl className="cc-check-respostas">
                      {def.itens.map(item => (
                        <div key={item.id}>
                          <dt>{item.texto}</dt>
                          <dd>{rotuloResposta(etapa, item.id, registro.respostas[item.id])}</dd>
                        </div>
                      ))}
                      {registro.observacoes && <div><dt>Observações</dt><dd className="mod-texto-longo">{registro.observacoes}</dd></div>}
                    </dl>
                  </>
                )}

                {atual && podeResponder && (
                  <form className="cc-check-form" onSubmit={e => { e.preventDefault(); void registrar(etapa); }}>
                    {def.itens.map(item => item.tipo === 'confirmar' ? (
                      <label key={item.id} className="cc-check-item">
                        <input type="checkbox" checked={respostas[item.id] === true} onChange={e => setRespostas(r => ({ ...r, [item.id]: e.target.checked }))} />
                        <span>{item.texto}</span>
                      </label>
                    ) : (
                      <fieldset key={item.id} className="cc-check-item cc-check-opcoes">
                        <legend>{item.texto}</legend>
                        <div>
                          {item.opcoes.map(o => (
                            <label key={o.valor}>
                              <input type="radio" name={`${etapa}-${item.id}`} value={o.valor} checked={respostas[item.id] === o.valor} onChange={() => setRespostas(r => ({ ...r, [item.id]: o.valor }))} />
                              <span>{o.rotulo}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                    <div className="form-group">
                      <label htmlFor={`cc-obs-${etapa}`}>Observações</label>
                      <textarea id={`cc-obs-${etapa}`} rows={2} maxLength={2000} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                    </div>
                    <div className="mod-acoes">
                      <button type="submit" className="btn btn-success" disabled={salvando}>
                        <i className="las la-check" aria-hidden="true"></i> {salvando ? 'Registrando…' : 'Registrar etapa'}
                      </button>
                    </div>
                  </form>
                )}
                {atual && !podeResponder && <p className="mod-nota">Etapa pendente. Seu cargo pode consultar o checklist, mas não responder.</p>}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
    </div>
  );
}
