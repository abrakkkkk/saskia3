'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, EmptyState, ErrorState, LoadingState, Panel } from '@/components/ui';
import PacienteSelect from '@/components/ui/PacienteSelect';
import { api, dataHoraTexto, erroTexto, NOME_STATUS, TOM_STATUS, type Opcao, type StatusEnvio } from '../integracoes/comum';

type Campo = 'imunobiologico' | 'fabricante' | 'dose' | 'estrategia' | 'via' | 'localAplicacao' | 'grupoAtendimento' | 'condicaoMaternal' | 'registroOrigem' | 'pais';
type Tabelas = Record<Campo, Opcao[]>;
type Dose = {
  id: string; imunobiologico: string; fabricante: string; lote: string; dose: string; via: string; localAplicacao: string;
  aplicadaEm: string; profissionalNome: string; statusRnds: StatusEnvio | null;
};

const agoraLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const FORM_VAZIO = { imunobiologico: '', fabricante: '', lote: '', validade: '', dose: '', estrategia: '1', via: '', localAplicacao: '', grupoAtendimento: '00', condicaoMaternal: '1', registroOrigem: '', pais: '' };

/** Registro de dose aplicada (vai para a RNDS pela fila de Integrações) e histórico do paciente. */
export default function RegistroVacinas({ podeRegistrar }: { podeRegistrar: boolean }) {
  const [pacienteId, setPacienteId] = useState('');
  const [tabelas, setTabelas] = useState<Tabelas | null>(null);
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [form, setForm] = useState({ ...FORM_VAZIO, aplicadaEm: agoraLocal() });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api<Tabelas>('/api/vacinas/tabelas').then(setTabelas).catch(e => setErro(erroTexto(e)));
  }, []);
  const carregarDoses = useCallback(async (id: string) => {
    if (!id) { setDoses(null); return; }
    try { setDoses(await api<Dose[]>(`/api/vacinas?pacienteId=${encodeURIComponent(id)}`)); } catch (e) { setErro(erroTexto(e)); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- troca de paciente
    void carregarDoses(pacienteId);
  }, [pacienteId, carregarDoses]);

  const nome = useMemo(() => {
    const mapas = Object.fromEntries(Object.entries(tabelas ?? {}).map(([k, l]) => [k, new Map(l.map(o => [o.codigo, o.nome]))]));
    return (campo: Campo, codigo: string) => mapas[campo]?.get(codigo) ?? codigo;
  }, [tabelas]);

  const mudar = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const lista = (k: Campo, rotulo: string, obrigatorio = true) => (
    <div className="form-group">
      <label htmlFor={`vac-${k}`}>{rotulo}</label>
      <select id={`vac-${k}`} required={obrigatorio} value={form[k]} onChange={e => mudar(k, e.target.value)}>
        <option value="">{obrigatorio ? 'Selecione' : 'Aplicada nesta unidade'}</option>
        {tabelas?.[k].map(o => <option key={o.codigo} value={o.codigo}>{o.nome}</option>)}
      </select>
    </div>
  );

  const salvar = async () => {
    setSalvando(true); setAviso(null);
    try {
      const corpo = { ...form, pacienteId, aplicadaEm: new Date(form.aplicadaEm).toISOString(), validade: form.validade || undefined, registroOrigem: form.registroOrigem || undefined, pais: form.pais || undefined };
      const r = await api<Dose>('/api/vacinas', 'POST', corpo);
      setAviso({ tipo: 'sucesso', texto: r.statusRnds ? 'Dose registrada e colocada na fila da RNDS.' : 'Dose registrada.' });
      setForm(f => ({ ...FORM_VAZIO, estrategia: f.estrategia, aplicadaEm: agoraLocal() }));
      await carregarDoses(pacienteId);
    } catch (e) { setAviso({ tipo: 'erro', texto: erroTexto(e) }); } finally { setSalvando(false); }
  };

  return (
    <Panel title="Doses aplicadas" icon="las la-syringe">
      {erro && <ErrorState message={erro} />}
      <div className="vac-paciente"><PacienteSelect value={pacienteId} onChange={id => { setPacienteId(id); setAviso(null); }} label="Paciente" /></div>
      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`mod-aviso mod-aviso-${aviso.tipo}`}>{aviso.texto}</p>}

      {pacienteId && podeRegistrar && (
        !tabelas ? <LoadingState message="Carregando tabelas da RNDS..." /> : (
          <form className="vac-form" onSubmit={e => { e.preventDefault(); void salvar(); }}>
            <fieldset disabled={salvando} className="vac-grupo">
              <legend>Registrar dose</legend>
              <div className="mod-form-grid">
                {lista('imunobiologico', 'Imunobiológico')}
                {lista('dose', 'Dose')}
                {lista('fabricante', 'Fabricante')}
                <div className="form-group">
                  <label htmlFor="vac-lote">Lote</label>
                  <input id="vac-lote" required maxLength={30} autoComplete="off" value={form.lote} onChange={e => mudar('lote', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="vac-validade">Validade do lote</label>
                  <input id="vac-validade" type="date" value={form.validade} onChange={e => mudar('validade', e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="vac-data">Aplicada em</label>
                  <input id="vac-data" type="datetime-local" required max={agoraLocal()} value={form.aplicadaEm} onChange={e => mudar('aplicadaEm', e.target.value)} />
                </div>
                {lista('via', 'Via')}
                {lista('localAplicacao', 'Local de aplicação')}
                {lista('estrategia', 'Estratégia')}
                {lista('grupoAtendimento', 'Grupo de atendimento')}
                {lista('condicaoMaternal', 'Condição maternal')}
                {lista('registroOrigem', 'Origem do registro', false)}
                {form.registroOrigem === '02' && lista('pais', 'País da aplicação')}
              </div>
            </fieldset>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              <i className="las la-save" aria-hidden="true"></i> {salvando ? 'Registrando...' : 'Registrar dose'}
            </button>
          </form>
        )
      )}

      {pacienteId && (
        !doses ? <LoadingState message="Carregando doses..." /> : doses.length === 0 ? (
          <EmptyState icon="las la-syringe" message="Nenhuma dose registrada para este paciente." />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead><tr><th>Imunobiológico</th><th>Dose</th><th>Aplicada</th><th>Lote</th><th>RNDS</th></tr></thead>
              <tbody>
                {doses.map(d => (
                  <tr key={d.id}>
                    <td>{nome('imunobiologico', d.imunobiologico)}<span className="mod-secundario">{nome('via', d.via)} · {nome('localAplicacao', d.localAplicacao)}</span></td>
                    <td>{nome('dose', d.dose)}</td>
                    <td className="vac-num">{dataHoraTexto(d.aplicadaEm)}<span className="mod-secundario">{d.profissionalNome}</span></td>
                    <td>{d.lote}<span className="mod-secundario">{nome('fabricante', d.fabricante)}</span></td>
                    <td>{d.statusRnds ? <Badge tone={TOM_STATUS[d.statusRnds]}>{NOME_STATUS[d.statusRnds]}</Badge> : <Badge tone="neutral">Fora da fila</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Panel>
  );
}
