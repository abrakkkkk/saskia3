'use client';

import { useState, useMemo } from 'react';
import { Badge, EmptyState, PageHeader, Panel, SearchInput, Tabs } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import './fichas-auxiliares.css';

interface Ficha {
  id: string;
  arquivo: string;
  titulo: string;
  instituicao: string;
  categoria: string;
  tags: string[];
}

const FICHAS_DADOS: Ficha[] = [
  { id: '1', arquivo: 'dole1.pdf', titulo: 'Escore Internacional de Sintomas Prostáticos', instituicao: 'UFRGS', categoria: 'UFRGS', tags: ['Urologia', 'Próstata', 'Avaliação'] },
  { id: '2', arquivo: 'reqmom.pdf', titulo: 'Requisição de Mamografia', instituicao: 'Saskia Saúde', categoria: 'Atendimento', tags: ['Mamografia', 'Saúde da Mulher', 'Requisição'] },
  { id: '3', arquivo: 'MSS1.pdf', titulo: 'Hanseníase - Tabela de Avaliação Neurológica', instituicao: 'Ministério da Saúde', categoria: 'MS', tags: ['Hanseníase', 'Neurologia', 'Avaliação'] },
  { id: '4', arquivo: 'MRPA.pdf', titulo: 'Medição Residencial da Pressão Arterial', instituicao: 'Saskia Saúde', categoria: 'Atendimento', tags: ['Pressão Arterial', 'Cardiologia', 'MRPA'] },
  { id: '5', arquivo: 'mpmp.pdf', titulo: 'Medicamentos e Insumos do Programa Farmácia Popular', instituicao: 'Farmácia Popular', categoria: 'Farmácia', tags: ['Farmácia Popular', 'Medicamentos', 'Insumos'] },
  { id: '6', arquivo: 'Hanseniasev5.pdf', titulo: 'Hanseníase v5 - Ficha de Avaliação', instituicao: 'Ministério da Saúde', categoria: 'MS', tags: ['Hanseníase', 'Avaliação', 'Protocolo'] },
  { id: '7', arquivo: 'FLMEP1.pdf', titulo: 'Formulário LME Padrão 1', instituicao: 'Ministério da Saúde', categoria: 'MS', tags: ['LME', 'Medicamentos', 'Formulário'] },
  { id: '8', arquivo: 'FPVD1.pdf', titulo: 'Ficha para Visitas Domiciliares', instituicao: 'Saskia Saúde', categoria: 'Atendimento', tags: ['Visita Domiciliar', 'APS', 'Saúde da Família'] },
  { id: '9', arquivo: 'FIDFCv5.pdf', titulo: 'Ficha de Investigação Dengue e Febre de Chikungunya v5', instituicao: 'Ministério da Saúde', categoria: 'MS', tags: ['Dengue', 'Chikungunya', 'Vigilância'] },
  { id: '10', arquivo: 'FAIs1.pdf', titulo: 'Ficha de Atendimento Individual', instituicao: 'Saskia Saúde', categoria: 'Atendimento', tags: ['Atendimento', 'Individual', 'Prontuário'] },
  { id: '11', arquivo: 'FAICOUs2.pdf', titulo: 'Ficha de Atendimento Individual com Orientações de Uso', instituicao: 'Saskia Saúde', categoria: 'Atendimento', tags: ['Atendimento', 'Orientações', 'Individual'] },
  { id: '12', arquivo: 'MIt1.pdf', titulo: 'Farmácia Popular - Medicamentos e Insumos', instituicao: 'Farmácia Popular', categoria: 'Farmácia', tags: ['Farmácia Popular', 'Medicamentos', 'Tabela'] },
  { id: '13', arquivo: 'DIDEC.pdf', titulo: 'Diário de Cefaléias', instituicao: 'Saskia Saúde', categoria: 'Outros', tags: ['Cefaléia', 'Diário', 'Neurologia'] },
  { id: '14', arquivo: 'TFPs3.pdf', titulo: 'Como Tratar a Fascite Plantar', instituicao: 'Saskia Saúde', categoria: 'Outros', tags: ['Fascite Plantar', 'Ortopedia', 'Tratamento'] },
  { id: '15', arquivo: 'AARHv2.pdf', titulo: 'Atendimento Antirrábico Humano v2', instituicao: 'Ministério da Saúde', categoria: 'MS', tags: ['Raiva', 'Antirrábico', 'Protocolo'] },
  { id: '16', arquivo: 'APACP.pdf', titulo: 'APAC Preenchível', instituicao: 'Ministério da Saúde', categoria: 'MS', tags: ['APAC', 'Autorização', 'SUS'] },
];

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
const caminhoDoArquivo = (ficha: Ficha) => `/fichass1/${encodeURIComponent(ficha.arquivo)}`;

export default function FichasAuxiliaresPage() {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria>('Todas');
  const [previa, setPrevia] = useState<Ficha | null>(null);

  const fichasFiltradas = useMemo(() => {
    let filtradas = FICHAS_DADOS;

    if (categoriaAtiva !== 'Todas') {
      filtradas = filtradas.filter(f => f.categoria === categoriaAtiva);
    }

    if (busca.trim()) {
      const t = normalizar(busca);
      filtradas = filtradas.filter(f =>
        normalizar(f.titulo).includes(t) ||
        normalizar(f.instituicao).includes(t) ||
        f.tags.some(tag => normalizar(tag).includes(t))
      );
    }

    return filtradas;
  }, [busca, categoriaAtiva]);

  const baixar = (ficha: Ficha) => {
    const a = document.createElement('a');
    a.href = caminhoDoArquivo(ficha);
    a.download = ficha.arquivo;
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
          label: `${cat.label} (${cat.id === 'Todas' ? FICHAS_DADOS.length : FICHAS_DADOS.filter(f => f.categoria === cat.id).length})`,
        }))}
      />

      <Panel>
        <SearchInput value={busca} onChange={setBusca} placeholder="Título, instituição ou palavra-chave" label="Buscar fichas" />
        <p className="fa-contagem" aria-live="polite" aria-atomic="true">
          Exibindo <strong>{fichasFiltradas.length}</strong> de {FICHAS_DADOS.length} fichas
        </p>

        {fichasFiltradas.length === 0 ? (
          <EmptyState
            icon="las la-search"
            message="Nenhuma ficha corresponde à busca ou ao filtro."
            action={<button type="button" className="btn btn-secondary" onClick={() => { setBusca(''); setCategoriaAtiva('Todas'); }}>Limpar filtros</button>}
          />
        ) : (
          <ul className="fa-lista">
            {fichasFiltradas.map(ficha => (
              <li key={ficha.id} className="fa-item">
                <div className="fa-info">
                  <strong className="fa-titulo">{ficha.titulo}</strong>
                  <span className="fa-tags">{ficha.tags.join(' · ')}</span>
                </div>
                <Badge>{ficha.instituicao}</Badge>
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
          <p className="fa-origem">Origem: {previa.instituicao} · Arquivo: {previa.arquivo}</p>
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
