'use client';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import PacienteSelect from '@/components/ui/PacienteSelect';
import { GUIAS_SUS, GUIAS_TISS, NOME_GUIA, type TipoGuia } from '@/lib/faturamento/dominios';
import { api, dataTexto, erroTexto, type Convenio } from './comum';

type Internacao = { id: string; entradaEm: string; saidaEm: string | null; setor: string; leito: string | null };
const EXIGE_INTERNACAO = new Set<string>(['AIH', 'RESUMO_INTERNACAO']);

export default function NovaConta({ convenios, onFechar, onCriada }: {
  convenios: Convenio[]; onFechar: () => void; onCriada: (id: string) => void;
}) {
  const ativos = convenios.filter(c => c.status === 'ATIVO');
  const [pacienteId, setPacienteId] = useState('');
  const [fonte, setFonte] = useState<'CONVENIO' | 'SUS'>(ativos.length ? 'CONVENIO' : 'SUS');
  const [tipoGuia, setTipoGuia] = useState<TipoGuia>(ativos.length ? 'CONSULTA' : 'BPA_I');
  const [operadoraId, setOperadoraId] = useState(ativos[0]?.id ?? '');
  const [internacoes, setInternacoes] = useState<Internacao[]>([]);
  const [internacaoId, setInternacaoId] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!pacienteId) return;
    let ativo = true;
    api<Internacao[]>(`/api/internacoes?pacienteId=${encodeURIComponent(pacienteId)}`)
      .then(lista => { if (ativo) { setInternacoes(lista); setInternacaoId(lista[0]?.id ?? ''); } })
      .catch(() => { if (ativo) setInternacoes([]); });
    return () => { ativo = false; };
  }, [pacienteId]);

  const guias = fonte === 'SUS' ? GUIAS_SUS : GUIAS_TISS;
  const precisaInternacao = EXIGE_INTERNACAO.has(tipoGuia);

  const criar = async () => {
    setErro('');
    if (!pacienteId) return setErro('Escolha o paciente.');
    if (precisaInternacao && !internacaoId) return setErro('Este paciente não tem internação para faturar.');
    setSalvando(true);
    try {
      const r = await api<{ id: string }>('/api/faturamento/contas', 'POST', {
        pacienteId, fonte, tipoGuia,
        operadoraId: fonte === 'CONVENIO' ? operadoraId : undefined,
        internacaoId: internacaoId && (precisaInternacao || tipoGuia === 'SP_SADT') ? internacaoId : undefined,
      });
      onCriada(r.id);
    } catch (e) {
      setErro(erroTexto(e));
      setSalvando(false);
    }
  };

  return (
    <Modal title="Nova conta" icon="las la-plus-circle" onClose={onFechar} busy={salvando}>
      {erro && <p role="alert" className="mod-aviso mod-aviso-erro">{erro}</p>}
      <PacienteSelect value={pacienteId} onChange={id => { setPacienteId(id); if (!id) { setInternacoes([]); setInternacaoId(''); } }} required />
      <div className="mod-form-grid">
        <div className="form-group">
          <label htmlFor="nova-fonte">Fonte pagadora</label>
          <select id="nova-fonte" value={fonte} onChange={e => {
            const f = e.target.value as 'CONVENIO' | 'SUS';
            setFonte(f);
            setTipoGuia(f === 'SUS' ? 'BPA_I' : 'CONSULTA');
          }}>
            <option value="CONVENIO" disabled={!ativos.length}>Convênio (TISS)</option>
            <option value="SUS">SUS</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="nova-guia">Tipo</label>
          <select id="nova-guia" value={tipoGuia} onChange={e => setTipoGuia(e.target.value as TipoGuia)}>
            {guias.map(g => <option key={g} value={g}>{NOME_GUIA[g]}</option>)}
          </select>
        </div>
        {fonte === 'CONVENIO' && (
          <div className="form-group">
            <label htmlFor="nova-convenio">Convênio</label>
            <select id="nova-convenio" value={operadoraId} onChange={e => setOperadoraId(e.target.value)}>
              {ativos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}
        {(precisaInternacao || (tipoGuia === 'SP_SADT' && internacoes.length > 0)) && pacienteId && (
          <div className="form-group">
            <label htmlFor="nova-internacao">Internação</label>
            <select id="nova-internacao" value={internacaoId} onChange={e => setInternacaoId(e.target.value)}>
              {!precisaInternacao && <option value="">Atendimento sem internação</option>}
              {internacoes.length === 0 && <option value="">Nenhuma internação</option>}
              {internacoes.map(i => (
                <option key={i.id} value={i.id}>{dataTexto(i.entradaEm)} a {i.saidaEm ? dataTexto(i.saidaEm) : 'em curso'} · {i.setor}{i.leito ? ` ${i.leito}` : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {!ativos.length && <p className="mod-nota">Nenhum convênio ativo. O gestor cadastra convênios na aba Convênios.</p>}
      <div className="ui-modal-foot">
        <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={salvando}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={() => void criar()} disabled={salvando}>
          <i className="las la-check" aria-hidden="true"></i> {salvando ? 'Abrindo…' : 'Abrir conta'}
        </button>
      </div>
    </Modal>
  );
}
