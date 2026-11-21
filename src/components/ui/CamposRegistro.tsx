'use client';

import { CONSELHOS, CONSELHO_DO_CARGO, UFS } from '@/lib/registro-profissional';

export type RegistroForm = { conselho: string; registroNumero: string; registroUf: string; especialidade: string; rqe: string };

export const REGISTRO_VAZIO: RegistroForm = { conselho: '', registroNumero: '', registroUf: '', especialidade: '', rqe: '' };

export const registroDoUsuario = (u: Partial<Record<keyof RegistroForm, string | null>> | null | undefined): RegistroForm => ({
  conselho: u?.conselho ?? '', registroNumero: u?.registroNumero ?? '', registroUf: u?.registroUf ?? '',
  especialidade: u?.especialidade ?? '', rqe: u?.rqe ?? '',
});

/** Campos do registro no conselho profissional. `prefixo` mantém os ids únicos quando há mais de um formulário na tela. */
export default function CamposRegistro({ valor, onChange, cargo, prefixo, obrigatorio = false }: {
  valor: RegistroForm;
  onChange: (v: RegistroForm) => void;
  cargo?: string;
  prefixo: string;
  /** Marca conselho, número e UF como obrigatórios (ex.: médico). */
  obrigatorio?: boolean;
}) {
  const set = (campo: keyof RegistroForm, v: string) => onChange({ ...valor, [campo]: v });
  const sugerido = cargo ? CONSELHO_DO_CARGO[cargo] : undefined;
  return (
    <>
      <div className="form-group">
        <label htmlFor={`${prefixo}-conselho`}>Conselho profissional</label>
        <select id={`${prefixo}-conselho`} required={obrigatorio} value={valor.conselho} onChange={e => set('conselho', e.target.value)}>
          <option value="">{sugerido ? `Selecione (sugerido: ${sugerido})` : 'Selecione'}</option>
          {CONSELHOS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefixo}-numero`}>Número do registro</label>
        <input id={`${prefixo}-numero`} required={obrigatorio} maxLength={20} inputMode="text" autoComplete="off" value={valor.registroNumero} onChange={e => set('registroNumero', e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefixo}-uf`}>UF do registro</label>
        <select id={`${prefixo}-uf`} required={obrigatorio} value={valor.registroUf} onChange={e => set('registroUf', e.target.value)}>
          <option value="">UF</option>
          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefixo}-especialidade`}>Especialidade (aparece na receita)</label>
        <input id={`${prefixo}-especialidade`} maxLength={120} value={valor.especialidade} onChange={e => set('especialidade', e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefixo}-rqe`}>RQE (opcional)</label>
        <input id={`${prefixo}-rqe`} maxLength={20} autoComplete="off" value={valor.rqe} onChange={e => set('rqe', e.target.value)} />
      </div>
    </>
  );
}

export type SusForm = { cns: string; cpf: string; cbo: string };
export const SUS_VAZIO: SusForm = { cns: '', cpf: '', cbo: '' };
export const susDoUsuario = (u: Partial<Record<keyof SusForm, string | null>> | null | undefined): SusForm => ({
  cns: u?.cns ?? '', cpf: u?.cpf ?? '', cbo: u?.cbo ?? '',
});

/** Identificação SUS do profissional (CNES e RNDS): CNS, CPF e CBO de lotação. */
export function CamposSus({ valor, onChange, prefixo }: { valor: SusForm; onChange: (v: SusForm) => void; prefixo: string }) {
  const set = (campo: keyof SusForm, v: string) => onChange({ ...valor, [campo]: v });
  return (
    <>
      <div className="form-group">
        <label htmlFor={`${prefixo}-cns`}>CNS (Cartão SUS)</label>
        <input id={`${prefixo}-cns`} maxLength={18} inputMode="numeric" autoComplete="off" placeholder="15 dígitos" value={valor.cns} onChange={e => set('cns', e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefixo}-cpf`}>CPF</label>
        <input id={`${prefixo}-cpf`} maxLength={14} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={valor.cpf} onChange={e => set('cpf', e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefixo}-cbo`}>CBO no CNES</label>
        <input id={`${prefixo}-cbo`} maxLength={6} inputMode="numeric" autoComplete="off" placeholder="Ex.: 223505" value={valor.cbo} onChange={e => set('cbo', e.target.value)} />
      </div>
    </>
  );
}
