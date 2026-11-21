'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, EmptyState, ErrorState, LoadingState, Panel } from '@/components/ui';
import SeloModelo from '@/components/ui/SeloModelo';
import { CARGO_LABEL, type Cargo } from '@/lib/permissions';
import type { SituacaoModelo } from '@/lib/modelos-clinicos';
import {
  BRADEN, DISPOSITIVOS, ESCALAS_DOR, GLASGOW, RASS, VENTILACAO,
  diasDeDispositivo, gravidadeGlasgow, riscoBraden, type Dispositivo, type EscalaDor, type ItemBraden,
} from '@/lib/evolucao-uti';

type InternacaoUti = {
  id: string; entradaEm: string; pacienteNome: string; leito: number | null;
  ultima: { registradoEm: string; autorNome: string; dispositivos: Dispositivo[] | null } | null;
};

type Evolucao = {
  id: string; registradoEm: string; autorNome: string; autorCargo: string;
  pas: number | null; pad: number | null; fc: number | null; fr: number | null; temperatura: number | null; spo2: number | null; glicemia: number | null;
  dispositivos: Dispositivo[] | null; ventilacao: string | null; fio2: number | null; peep: number | null; ventilacaoObs: string | null;
  entradasMl: number | null; saidasMl: number | null; rass: number | null; glasgowTotal: number | null;
  bradenTotal: number | null; dor: number | null; dorEscala: string | null; evolucao: string;
};

const VITAIS = [
  { campo: 'pas', rotulo: 'PA sistólica (mmHg)' },
  { campo: 'pad', rotulo: 'PA diastólica (mmHg)' },
  { campo: 'fc', rotulo: 'FC (bpm)' },
  { campo: 'fr', rotulo: 'FR (irpm)' },
  { campo: 'temperatura', rotulo: 'Temperatura (°C)' },
  { campo: 'spo2', rotulo: 'SpO₂ (%)' },
  { campo: 'glicemia', rotulo: 'Glicemia (mg/dL)' },
] as const;

const FORM_VAZIO = {
  pas: '', pad: '', fc: '', fr: '', temperatura: '', spo2: '', glicemia: '',
  ventilacao: '', fio2: '', peep: '', ventilacaoObs: '', entradasMl: '', saidasMl: '',
  rass: '', glasgowOcular: '', glasgowVerbal: '', glasgowMotora: '', dor: '', dorEscala: 'EVN', evolucao: '',
};
type Form = typeof FORM_VAZIO;
const BRADEN_VAZIO = { percepcao: '', umidade: '', atividade: '', mobilidade: '', nutricao: '', friccao: '' } as Record<ItemBraden, string>;

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function evoluidoHoje(iso: string | undefined) {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}
const rotuloDe = <T extends { valor: string | number; rotulo: string }>(lista: readonly T[], valor: unknown) =>
  lista.find(x => x.valor === valor)?.rotulo ?? String(valor);

export default function EvolucaoUti({ podeEvoluir }: { podeEvoluir: boolean }) {
  const [internacoes, setInternacoes] = useState<InternacaoUti[]>([]);
  const [modelo, setModelo] = useState<SituacaoModelo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionada, setSelecionada] = useState<InternacaoUti | null>(null);
  const [historico, setHistorico] = useState<Evolucao[]>([]);
  const [carregandoHist, setCarregandoHist] = useState(false);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [braden, setBraden] = useState(BRADEN_VAZIO);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const ancora = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selecionada) return;
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ancora.current?.scrollIntoView({ block: 'start', behavior: reduzir ? 'auto' : 'smooth' });
  }, [selecionada]);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/uti/evolucoes');
      const dados = await res.json().catch(() => null);
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível carregar os pacientes da UTI.');
      setInternacoes(Array.isArray(dados?.internacoes) ? dados.internacoes : []);
      setModelo(dados?.modelo ?? null);
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os pacientes da UTI.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  const abrir = async (i: InternacaoUti) => {
    setSelecionada(i);
    setAviso(null);
    setForm(FORM_VAZIO);
    setBraden(BRADEN_VAZIO);
    // Dispositivos costumam continuar de um dia para o outro: parte da última evolução.
    setDispositivos(i.ultima?.dispositivos ?? []);
    setCarregandoHist(true);
    try {
      const res = await fetch(`/api/uti/evolucoes?internacaoId=${encodeURIComponent(i.id)}`);
      const dados = await res.json().catch(() => null);
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível carregar o histórico.');
      setHistorico(Array.isArray(dados?.evolucoes) ? dados.evolucoes : []);
    } catch (e) {
      setHistorico([]);
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível carregar o histórico.' });
    } finally {
      setCarregandoHist(false);
    }
  };

  const salvar = async () => {
    if (!selecionada) return;
    setSalvando(true);
    setAviso(null);
    try {
      const bradenPreenchido = Object.values(braden).some(v => v !== '');
      const res = await fetch('/api/uti/evolucoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internacaoId: selecionada.id,
          ...form,
          dor: form.dor === '' ? null : form.dor,
          bradenItens: bradenPreenchido ? braden : null,
          dispositivos,
        }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok) throw new Error(dados?.error || 'Não foi possível registrar a evolução.');
      setHistorico(h => [dados, ...h]);
      setForm(FORM_VAZIO);
      setBraden(BRADEN_VAZIO);
      setAviso({ tipo: 'sucesso', texto: 'Evolução registrada.' });
      void carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível registrar a evolução.' });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <LoadingState message="Carregando pacientes da UTI..." />;
  if (erro) return <ErrorState message={erro} onRetry={() => { setCarregando(true); void carregar(); }} />;

  const campo = (nome: keyof Form) => ({
    value: form[nome],
    onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, [nome]: e.target.value })),
  });
  const glasgowTotal = form.glasgowOcular && form.glasgowVerbal && form.glasgowMotora
    ? Number(form.glasgowOcular) + Number(form.glasgowVerbal) + Number(form.glasgowMotora) : null;
  const bradenCompleto = Object.values(braden).every(v => v !== '');
  const bradenTotal = bradenCompleto ? Object.values(braden).reduce((s, v) => s + Number(v), 0) : null;
  const balanco = form.entradasMl !== '' && form.saidasMl !== '' ? Number(form.entradasMl) - Number(form.saidasMl) : null;
  const escalaDor = ESCALAS_DOR[form.dorEscala as EscalaDor];

  return (
    <div className="uti-evolucao">
      <div className="uti-evolucao-topo">
        <p className="mod-nota">Registro diário por paciente internado na UTI (RDC Anvisa 7/2010).</p>
        <SeloModelo situacao={modelo} />
      </div>

      {internacoes.length === 0 ? (
        <EmptyState icon="las la-notes-medical" message="Nenhum paciente internado em leito de UTI." />
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Leito</th>
                <th scope="col">Paciente</th>
                <th scope="col">Última evolução</th>
                <th scope="col"><span className="sr-only">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              {internacoes.map(i => {
                const hoje = evoluidoHoje(i.ultima?.registradoEm);
                return (
                  <tr key={i.id} aria-current={selecionada?.id === i.id ? 'true' : undefined}>
                    <td><strong>UTI {i.leito ?? '—'}</strong></td>
                    <td>{i.pacienteNome}</td>
                    <td>
                      {i.ultima ? <span className="mod-secundario">{dataHora(i.ultima.registradoEm)} · {i.ultima.autorNome}</span> : null}
                      {hoje ? <Badge tone="success">Evoluído hoje</Badge> : <Badge tone="warning">Sem evolução hoje</Badge>}
                    </td>
                    <td>
                      <button type="button" className="btn btn-xs btn-secondary" onClick={() => void abrir(i)} aria-label={`Abrir evolução de ${i.pacienteNome}`}>
                        <i className="las la-notes-medical" aria-hidden="true"></i> {podeEvoluir ? 'Evoluir' : 'Ver histórico'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selecionada && (
        <div ref={ancora} className="uti-evo-ancora">
        <Panel
          title={`${selecionada.pacienteNome} · UTI ${selecionada.leito ?? '—'}`}
          icon="las la-notes-medical"
          actions={<button type="button" className="btn btn-xs btn-secondary" onClick={() => setSelecionada(null)}>Fechar</button>}
        >
          {aviso && <p className={`mod-aviso mod-aviso-${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}

          {podeEvoluir && (
            <form className="uti-evo-form" onSubmit={e => { e.preventDefault(); void salvar(); }}>
              <fieldset>
                <legend>Sinais vitais</legend>
                <div className="mod-form-grid">
                  {VITAIS.map(v => (
                    <div className="form-group" key={v.campo}>
                      <label htmlFor={`evo-${v.campo}`}>{v.rotulo}</label>
                      <input id={`evo-${v.campo}`} inputMode="decimal" {...campo(v.campo)} />
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Ventilação</legend>
                <div className="mod-form-grid">
                  <div className="form-group">
                    <label htmlFor="evo-ventilacao">Suporte</label>
                    <select id="evo-ventilacao" {...campo('ventilacao')}>
                      <option value="">Não informado</option>
                      {VENTILACAO.map(v => <option key={v.valor} value={v.valor}>{v.rotulo}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="evo-fio2">FiO₂ (%)</label>
                    <input id="evo-fio2" inputMode="numeric" {...campo('fio2')} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="evo-peep">PEEP (cmH₂O)</label>
                    <input id="evo-peep" inputMode="numeric" {...campo('peep')} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="evo-vent-obs">Parâmetros e observações</label>
                    <input id="evo-vent-obs" maxLength={300} placeholder="Modo, volume corrente, pressão..." {...campo('ventilacaoObs')} />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Balanço hídrico (24 h)</legend>
                <div className="mod-form-grid">
                  <div className="form-group">
                    <label htmlFor="evo-entradas">Entradas (ml)</label>
                    <input id="evo-entradas" inputMode="numeric" {...campo('entradasMl')} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="evo-saidas">Saídas (ml)</label>
                    <input id="evo-saidas" inputMode="numeric" {...campo('saidasMl')} />
                  </div>
                  <p className="uti-evo-calculo" aria-live="polite">
                    Balanço: <strong>{balanco === null || Number.isNaN(balanco) ? '—' : `${balanco > 0 ? '+' : ''}${balanco} ml`}</strong>
                  </p>
                </div>
              </fieldset>

              <fieldset>
                <legend>Sedação e consciência</legend>
                <div className="mod-form-grid">
                  <div className="form-group">
                    <label htmlFor="evo-rass">RASS</label>
                    <select id="evo-rass" {...campo('rass')}>
                      <option value="">Não avaliado</option>
                      {RASS.map(r => <option key={r.valor} value={r.valor}>{r.rotulo}</option>)}
                    </select>
                  </div>
                  {(['ocular', 'verbal', 'motora'] as const).map(k => {
                    const nome = `glasgow${k[0].toUpperCase()}${k.slice(1)}` as keyof Form;
                    return (
                      <div className="form-group" key={k}>
                        <label htmlFor={`evo-g-${k}`}>Glasgow: {GLASGOW[k].rotulo.toLowerCase()}</label>
                        <select id={`evo-g-${k}`} {...campo(nome)}>
                          <option value="">—</option>
                          {Array.from({ length: GLASGOW[k].max }, (_, n) => n + 1).map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  <p className="uti-evo-calculo" aria-live="polite">
                    Glasgow: <strong>{glasgowTotal ?? '—'}</strong>{glasgowTotal !== null && ` (${gravidadeGlasgow(glasgowTotal)})`}
                  </p>
                </div>
              </fieldset>

              <fieldset>
                <legend>Risco de lesão por pressão (Braden)</legend>
                <div className="mod-form-grid">
                  {(Object.keys(BRADEN) as ItemBraden[]).map(k => (
                    <div className="form-group" key={k}>
                      <label htmlFor={`evo-b-${k}`}>{BRADEN[k].rotulo}</label>
                      <select id={`evo-b-${k}`} value={braden[k]} onChange={e => setBraden(b => ({ ...b, [k]: e.target.value }))}>
                        <option value="">—</option>
                        {Array.from({ length: BRADEN[k].max }, (_, n) => n + 1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  ))}
                  <p className="uti-evo-calculo" aria-live="polite">
                    Braden: <strong>{bradenTotal ?? '—'}</strong>{bradenTotal !== null && ` (${riscoBraden(bradenTotal)})`}
                  </p>
                </div>
              </fieldset>

              <fieldset>
                <legend>Dor</legend>
                <div className="mod-form-grid">
                  <div className="form-group">
                    <label htmlFor="evo-dor-escala">Escala</label>
                    <select id="evo-dor-escala" {...campo('dorEscala')}>
                      {(Object.keys(ESCALAS_DOR) as EscalaDor[]).map(k => <option key={k} value={k}>{ESCALAS_DOR[k].rotulo}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="evo-dor">Pontuação ({escalaDor.min} a {escalaDor.max})</label>
                    <input id="evo-dor" inputMode="numeric" {...campo('dor')} />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Dispositivos invasivos</legend>
                {dispositivos.length === 0 && <p className="mod-nota">Nenhum dispositivo informado.</p>}
                {dispositivos.map((d, idx) => (
                  <div className="mod-form-grid uti-evo-dispositivo" key={idx}>
                    <div className="form-group">
                      <label htmlFor={`evo-d-tipo-${idx}`}>Dispositivo</label>
                      <select id={`evo-d-tipo-${idx}`} value={d.tipo} onChange={e => setDispositivos(l => l.map((x, i) => i === idx ? { ...x, tipo: e.target.value } : x))}>
                        {DISPOSITIVOS.map(x => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor={`evo-d-local-${idx}`}>Local</label>
                      <input id={`evo-d-local-${idx}`} maxLength={60} placeholder="Ex.: jugular direita" value={d.local ?? ''} onChange={e => setDispositivos(l => l.map((x, i) => i === idx ? { ...x, local: e.target.value } : x))} />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`evo-d-data-${idx}`}>Inserido em</label>
                      <input id={`evo-d-data-${idx}`} type="date" max={hojeISO()} value={d.inseridoEm} onChange={e => setDispositivos(l => l.map((x, i) => i === idx ? { ...x, inseridoEm: e.target.value } : x))} />
                    </div>
                    <div className="uti-evo-remover">
                      <button type="button" className="btn btn-xs btn-secondary" onClick={() => setDispositivos(l => l.filter((_, i) => i !== idx))} aria-label={`Remover ${rotuloDe(DISPOSITIVOS, d.tipo)}`}>
                        <i className="las la-times" aria-hidden="true"></i> Remover
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDispositivos(l => [...l, { tipo: 'CVC', local: '', inseridoEm: hojeISO() }])}>
                  <i className="las la-plus" aria-hidden="true"></i> Adicionar dispositivo
                </button>
              </fieldset>

              <div className="form-group">
                <label htmlFor="evo-texto">Evolução *</label>
                <textarea id="evo-texto" rows={6} required minLength={10} maxLength={8000} placeholder="Estado clínico, intercorrências, cuidados prestados e plano." {...campo('evolucao')} />
              </div>

              <div className="mod-acoes">
                <button type="submit" className="btn btn-success" disabled={salvando}>
                  <i className="las la-save" aria-hidden="true"></i> {salvando ? 'Registrando…' : 'Registrar evolução'}
                </button>
              </div>
            </form>
          )}

          <h3 className="uti-evo-hist-titulo">Histórico</h3>
          {carregandoHist ? <LoadingState message="Carregando histórico..." /> : historico.length === 0 ? (
            <EmptyState icon="las la-history" message="Nenhuma evolução registrada nesta internação." />
          ) : (
            <ul className="mod-lista" aria-label="Evoluções registradas">
              {historico.map(e => {
                const vitais = [
                  e.pas !== null && e.pad !== null ? `PA ${e.pas}/${e.pad}` : null,
                  e.fc !== null ? `FC ${e.fc}` : null, e.fr !== null ? `FR ${e.fr}` : null,
                  e.temperatura !== null ? `T ${e.temperatura.toLocaleString('pt-BR')} °C` : null,
                  e.spo2 !== null ? `SpO₂ ${e.spo2}%` : null, e.glicemia !== null ? `Glic ${e.glicemia}` : null,
                ].filter(Boolean).join(' · ');
                const bal = e.entradasMl !== null && e.saidasMl !== null ? e.entradasMl - e.saidasMl : null;
                return (
                  <li key={e.id} className="mod-cartao">
                    <div className="mod-cartao-topo">
                      <strong>{dataHora(e.registradoEm)}</strong>
                      <span className="mod-secundario">{e.autorNome} · {CARGO_LABEL[e.autorCargo as Cargo] ?? e.autorCargo}</span>
                    </div>
                    <dl>
                      {vitais && <><dt>Sinais vitais</dt><dd>{vitais}</dd></>}
                      {e.ventilacao && <><dt>Ventilação</dt><dd>{rotuloDe(VENTILACAO, e.ventilacao)}{e.fio2 !== null ? ` · FiO₂ ${e.fio2}%` : ''}{e.peep !== null ? ` · PEEP ${e.peep}` : ''}{e.ventilacaoObs ? ` · ${e.ventilacaoObs}` : ''}</dd></>}
                      {bal !== null && <><dt>Balanço 24 h</dt><dd>{bal > 0 ? '+' : ''}{bal} ml</dd></>}
                      {e.rass !== null && <><dt>RASS</dt><dd>{rotuloDe(RASS, e.rass)}</dd></>}
                      {e.glasgowTotal !== null && <><dt>Glasgow</dt><dd>{e.glasgowTotal} ({gravidadeGlasgow(e.glasgowTotal)})</dd></>}
                      {e.bradenTotal !== null && <><dt>Braden</dt><dd>{e.bradenTotal} ({riscoBraden(e.bradenTotal)})</dd></>}
                      {e.dor !== null && <><dt>Dor</dt><dd>{e.dor} ({e.dorEscala})</dd></>}
                      {e.dispositivos && e.dispositivos.length > 0 && (
                        <><dt>Dispositivos</dt><dd>{e.dispositivos.map(d => `${rotuloDe(DISPOSITIVOS, d.tipo)}${d.local ? ` (${d.local})` : ''}, D${diasDeDispositivo(d.inseridoEm)}`).join(' · ')}</dd></>
                      )}
                    </dl>
                    <p className="mod-texto-longo uti-evo-texto">{e.evolucao}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        </div>
      )}
    </div>
  );
}
