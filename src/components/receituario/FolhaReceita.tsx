'use client';

import { useState } from 'react';
import { sanitizeRecipeHtml } from '@/lib/receita-html';
import { tipoPrescricao } from '@/lib/prescricao';
import { cpfParcial } from '@/components/ui/PacienteSelect';

export type HospitalImpressao = { nome?: string | null; cnpj?: string | null; endereco?: string | null; telefone?: string | null; logo?: string | null };
export type PacienteImpressao = { nome: string; nascimento?: string | null; cpf?: string | null; sexo?: string | null; endereco?: string | null };
export type ReceitaImpressao = {
  id: string;
  createdAt: string;
  profissional: string | null;
  registroProfissional: string | null;
  especialidadeProfissional: string | null;
  /** FARMACOLOGICA, CUIDADO, OXIGENOTERAPIA... Receitas antigas não têm e valem como farmacológicas. */
  tipo?: string | null;
  medicamentos: { viaUso?: string; conteudo?: string }[];
};

function idade(nascimento?: string | null) {
  if (!nascimento) return null;
  const n = new Date(nascimento);
  if (Number.isNaN(n.getTime())) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getUTCFullYear();
  if (hoje.getMonth() < n.getUTCMonth() || (hoje.getMonth() === n.getUTCMonth() && hoje.getDate() < n.getUTCDate())) anos--;
  if (anos >= 2) return `${anos} anos`;
  const meses = Math.max(0, (hoje.getFullYear() - n.getUTCFullYear()) * 12 + hoje.getMonth() - n.getUTCMonth());
  return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

const dataBr = (iso?: string | null) => {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : null;
};

const SEXO: Record<string, string> = { M: 'Masculino', F: 'Feminino', MASCULINO: 'Masculino', FEMININO: 'Feminino' };

/**
 * Folha da receita para impressão (A4). Fica oculta na tela e é a única coisa que sai no papel.
 * Monta tudo a partir da receita SALVA, então reimprimir dá sempre o mesmo documento.
 */
export default function FolhaReceita({ hospital, paciente, receita }: { hospital: HospitalImpressao | null; paciente: PacienteImpressao | null; receita: ReceitaImpressao }) {
  const [logoFalhou, setLogoFalhou] = useState(false);
  const emitida = new Date(receita.createdAt);
  const idadeTxt = idade(paciente?.nascimento);
  const sexo = paciente?.sexo ? (SEXO[paciente.sexo.toUpperCase()] ?? paciente.sexo) : null;
  const nasc = dataBr(paciente?.nascimento);

  return (
    <section className="rec-folha" aria-hidden="true">
      <header className="rec-folha-cabecalho">
        {hospital?.logo && !logoFalhou && (
          // eslint-disable-next-line @next/next/no-img-element -- logotipo vem de URL cadastrada pelo hospital; some se não carregar
          <img className="rec-folha-logo" src={hospital.logo} alt="" onError={() => setLogoFalhou(true)} />
        )}
        <div className="rec-folha-hospital">
          <strong>{hospital?.nome}</strong>
          {hospital?.cnpj && <span>CNPJ {hospital.cnpj}</span>}
          {(hospital?.endereco || hospital?.telefone) && <span>{[hospital?.endereco, hospital?.telefone && `Tel. ${hospital.telefone}`].filter(Boolean).join(' · ')}</span>}
        </div>
      </header>

      <h1 className="rec-folha-titulo">{tipoPrescricao(receita.tipo).titulo}</h1>

      <dl className="rec-folha-paciente">
        <div className="rec-folha-largo"><dt>Paciente</dt><dd>{paciente?.nome ?? 'Não informado'}</dd></div>
        <div><dt>Idade</dt><dd>{idadeTxt ?? 'não informada'}</dd></div>
        <div><dt>Sexo</dt><dd>{sexo ?? 'não informado'}</dd></div>
        <div><dt>Nascimento</dt><dd>{nasc ?? 'não informado'}</dd></div>
        <div><dt>CPF</dt><dd>{cpfParcial(paciente?.cpf).replace('CPF ', '')}</dd></div>
        {paciente?.endereco && <div className="rec-folha-largo"><dt>Endereço</dt><dd>{paciente.endereco}</dd></div>}
      </dl>

      <ol className="rec-folha-itens">
        {receita.medicamentos.map((m, i) => (
          <li key={i} className="rec-folha-item">
            <div className="rec-folha-via">{tipoPrescricao(receita.tipo).id === 'FARMACOLOGICA' ? `Uso ${m.viaUso}` : ''}</div>
            <div className="rec-folha-conteudo" dangerouslySetInnerHTML={{ __html: sanitizeRecipeHtml(typeof m.conteudo === 'string' ? m.conteudo : '') }} />
          </li>
        ))}
      </ol>

      <footer className="rec-folha-rodape">
        <p className="rec-folha-data">Emitida em {emitida.toLocaleDateString('pt-BR')} às {emitida.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <div className="rec-folha-assinatura">
          <div className="rec-folha-linha" />
          <strong>{receita.profissional}</strong>
          {receita.registroProfissional && <span>{receita.registroProfissional}</span>}
          {receita.especialidadeProfissional && <span>{receita.especialidadeProfissional}</span>}
        </div>
        <p className="rec-folha-codigo">Registro {receita.id} · Documento emitido pelo sistema Saskia</p>
      </footer>
    </section>
  );
}
