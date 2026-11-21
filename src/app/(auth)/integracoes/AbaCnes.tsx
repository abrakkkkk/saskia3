'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, EmptyState, ErrorState, LoadingState, Panel, type Tone } from '@/components/ui';
import { CARGO_LABEL, type Cargo } from '@/lib/permissions';
import { api, erroTexto } from './comum';

type Situacao = 'CONFERE' | 'SEM_CNS' | 'CNS_INVALIDO' | 'FORA_DO_CNES' | 'CBO_DIFERENTE';
type Estado = {
  unidade: { nome: string | null; cnes: string | null; municipioIbge: string | null; uf: string | null };
  equipeImportada: { total: number; competencia: string | null };
  profissionais: { id: string; nome: string; cargo: string; situacao: Situacao; cbosCnes: string[] }[];
  estabelecimento: null | { ok: false; erro: string } | {
    ok: true; oficial: { nomeFantasia: string | null; razaoSocial: string | null; cnpj: string | null; municipioIbge: string | null; uf: string | null; atualizadoEm: string | null };
    divergencias: { campo: string; saskia: string | null; cnes: string | null }[];
  };
};

const SITUACAO: Record<Situacao, { nome: string; tom: Tone }> = {
  CONFERE: { nome: 'Confere', tom: 'success' },
  SEM_CNS: { nome: 'Sem CNS', tom: 'warning' },
  CNS_INVALIDO: { nome: 'CNS inválido', tom: 'danger' },
  FORA_DO_CNES: { nome: 'Fora do CNES', tom: 'danger' },
  CBO_DIFERENTE: { nome: 'CBO diferente', tom: 'warning' },
};
const competencia = (c: string | null) => (c ? `${c.slice(4)}/${c.slice(0, 4)}` : '');

export function AbaCnes() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState('');
  const [conferindo, setConferindo] = useState(false);

  const carregar = useCallback(async (conferir = false) => {
    if (conferir) setConferindo(true);
    try { setEstado(await api<Estado>(`/api/integracoes/cnes${conferir ? '?conferir=1' : ''}`)); setErro(''); } catch (e) { setErro(erroTexto(e)); } finally { setConferindo(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial da aba
    void carregar();
  }, [carregar]);

  if (erro) return <ErrorState message={erro} onRetry={() => void carregar()} />;
  if (!estado) return <LoadingState message="Carregando o CNES..." />;
  const e = estado.estabelecimento;
  const problemas = estado.profissionais.filter(p => p.situacao !== 'CONFERE').length;

  return (
    <>
      <Panel
        title="Estabelecimento"
        icon="las la-hospital-alt"
        actions={estado.unidade.cnes ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void carregar(true)} disabled={conferindo}>
            <i className="las la-sync" aria-hidden="true"></i> {conferindo ? 'Consultando...' : 'Conferir no CNES'}
          </button>
        ) : undefined}
      >
        {!estado.unidade.cnes ? (
          <p className="mod-aviso mod-aviso-atencao" role="status">CNES não cadastrado. Informe em <Link href="/faturamento">Faturamento → Unidade</Link>.</p>
        ) : (
          <dl className="int-dados">
            <div><dt>CNES</dt><dd>{estado.unidade.cnes}</dd></div>
            <div><dt>Município (IBGE)</dt><dd>{estado.unidade.municipioIbge ?? '—'}</dd></div>
            <div><dt>UF</dt><dd>{estado.unidade.uf ?? '—'}</dd></div>
          </dl>
        )}
        {e && !e.ok && <p role="alert" className="mod-aviso mod-aviso-erro">{e.erro}</p>}
        {e && e.ok && (
          <>
            <p role="status" className={`mod-aviso ${e.divergencias.length ? 'mod-aviso-atencao' : 'mod-aviso-sucesso'}`}>
              {e.divergencias.length ? `${e.divergencias.length} divergência${e.divergencias.length > 1 ? 's' : ''} com a base nacional.` : 'Cadastro confere com a base nacional do CNES.'}
              {' '}Base oficial: {e.oficial.nomeFantasia ?? e.oficial.razaoSocial}{e.oficial.atualizadoEm ? `, atualizada em ${e.oficial.atualizadoEm.split('-').reverse().join('/')}` : ''}.
            </p>
            {e.divergencias.length > 0 && (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead><tr><th>Campo</th><th>No Saskia</th><th>No CNES</th></tr></thead>
                  <tbody>{e.divergencias.map(d => <tr key={d.campo}><td>{d.campo}</td><td>{d.saskia ?? '—'}</td><td>{d.cnes ?? '—'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>

      <Panel title="Equipe" icon="las la-user-md">
        <p className="mod-nota">
          {estado.equipeImportada.total
            ? `Base do CNES de ${competencia(estado.equipeImportada.competencia)}: ${estado.equipeImportada.total} vínculos importados.`
            : 'Equipe do CNES ainda não importada: a lista confere só o CNS. O responsável técnico importa com scripts/importar-cnes.cjs.'}
          {' '}O CNS e o CBO de cada profissional ficam em <Link href="/admin-usuarios">Usuários</Link>.
        </p>
        {estado.profissionais.length === 0 ? <EmptyState icon="las la-user-md" message="Nenhum profissional assistencial ativo." /> : (
          <>
            {problemas > 0 && <p className="mod-nota"><strong>{problemas}</strong> profissiona{problemas > 1 ? 'is precisam' : 'l precisa'} de ajuste para assinar registros na RNDS.</p>}
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead><tr><th>Profissional</th><th>Cargo</th><th>Situação</th></tr></thead>
                <tbody>
                  {estado.profissionais.map(p => (
                    <tr key={p.id}>
                      <td>{p.nome}</td>
                      <td>{CARGO_LABEL[p.cargo as Cargo] ?? p.cargo}</td>
                      <td>
                        <Badge tone={SITUACAO[p.situacao].tom}>{SITUACAO[p.situacao].nome}</Badge>
                        {p.situacao === 'CBO_DIFERENTE' && <span className="mod-secundario">No CNES: {p.cbosCnes.join(', ')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
