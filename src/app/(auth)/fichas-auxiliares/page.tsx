'use client';

import { useState, useMemo } from 'react';
import { Badge, EmptyState, PageHeader, Panel, SearchInput, Tabs } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { urlDocumento, type DocumentoItem } from '@/lib/documentos';
import { useDocumentos } from '@/lib/use-documentos';
import './fichas-auxiliares.css';

type Ficha = DocumentoItem;

const CATEGORIAS = [
  { id: 'Todas', label: 'Todas' },
  { id: 'MS', label: 'Ministério da Saúde' },
  { id: 'UFRGS', label: 'UFRGS' },
  { id: 'Farmácia', label: 'Farmácia Popular' },
  { id: 'Atendimento', label: 'Atendimento' },
  { id: 'Outros', label: 'Outros' },
] as const;

type Categoria = (typeof CATEGORIAS)[number]['id'];

const normalizar = (valor: string) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const caminhoDoArquivo = (ficha: Ficha) => urlDocumento(ficha.slug);

export default function FichasAuxiliaresPage() {
  const { documentos: FICHAS_DADOS, carregando, erro } = useDocumentos('FICHAS');
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria>('Todas');
  const [previa, setPrevia] = useState<Ficha | null>(null);

  const fichasFiltradas = useMemo(() => {
    let filtradas = FICHAS_DADOS;

    if (categoriaAtiva !== 'Todas') {
      filtradas = filtradas.filter(f => f.grupo === categoriaAtiva);
    }

    if (busca.trim()) {
      const t = normalizar(busca);
      filtradas = filtradas.filter(f =>
        normalizar(f.titulo).includes(t) ||
        normalizar(f.instituicao ?? '').includes(t) ||
        f.tags.some(tag => normalizar(tag).includes(t))
      );
    }

    return filtradas;
  }, [FICHAS_DADOS, busca, categoriaAtiva]);

  const baixar = (ficha: Ficha) => {
    const a = document.createElement('a');
    a.href = urlDocumento(ficha.slug, true);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fa-pagina">
      <PageHeader
        icon="las la-file-medical"
        title="Fichas auxiliares"
        subtitle="Formulários, protocolos e requisições para consultar e baixar"
      />

      <Tabs
        label="Categorias de fichas"
        active={categoriaAtiva}
        onChange={setCategoriaAtiva}
        tabs={CATEGORIAS.map(cat => ({
          id: cat.id,
          label: `${cat.label} (${cat.id === 'Todas' ? FICHAS_DADOS.length : FICHAS_DADOS.filter(f => f.grupo === cat.id).length})`,
        }))}
      />

      <Panel>
        <SearchInput value={busca} onChange={setBusca} placeholder="Título, instituição ou palavra-chave" label="Buscar fichas" />
        <p className="fa-contagem" aria-live="polite" aria-atomic="true">
          Exibindo <strong>{fichasFiltradas.length}</strong> de {FICHAS_DADOS.length} fichas
        </p>

        {carregando && <p role="status" className="fa-contagem">Carregando fichas…</p>}
        {erro && <p role="alert" className="fa-contagem">{erro}</p>}

        {!carregando && fichasFiltradas.length === 0 ? (
          <EmptyState
            icon="las la-search"
            message="Nenhuma ficha corresponde à busca ou ao filtro."
            action={<button type="button" className="btn btn-secondary" onClick={() => { setBusca(''); setCategoriaAtiva('Todas'); }}>Limpar filtros</button>}
          />
        ) : (
          <ul className="fa-lista">
            {fichasFiltradas.map(ficha => (
              <li key={ficha.slug} className="fa-item">
                <div className="fa-info">
                  <strong className="fa-titulo">{ficha.titulo}</strong>
                  <span className="fa-tags">{ficha.tags.join(' · ')}</span>
                </div>
                {ficha.instituicao && <Badge>{ficha.instituicao}</Badge>}
                <div className="fa-acoes">
                  <button type="button" className="btn btn-primary btn-sm" aria-label={`Visualizar ${ficha.titulo}`} onClick={() => setPrevia(ficha)}>
                    <i className="las la-eye" aria-hidden="true"></i> Visualizar
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" aria-label={`Baixar ${ficha.titulo}`} onClick={() => baixar(ficha)}>
                    <i className="las la-download" aria-hidden="true"></i> Baixar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {previa && (
        <Modal size="xl" title={previa.titulo} closeLabel="Fechar prévia" onClose={() => setPrevia(null)}>
          <p className="fa-origem">Origem: {previa.instituicao ?? 'Saskia Saúde'}</p>
          <iframe className="fa-previa" src={caminhoDoArquivo(previa)} title={previa.titulo} />
          <div className="fa-modal-acoes">
            <a href={caminhoDoArquivo(previa)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <i className="las la-external-link-alt" aria-hidden="true"></i> Abrir em nova aba
            </a>
            <button type="button" className="btn btn-primary" onClick={() => baixar(previa)}>
              <i className="las la-download" aria-hidden="true"></i> Baixar PDF
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
