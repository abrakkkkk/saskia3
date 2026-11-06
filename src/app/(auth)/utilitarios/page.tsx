'use client';

import { useState, useMemo, useEffect, useId, useRef, type ComponentType } from 'react';
import { EmptyState, PageHeader, SearchInput, Tabs } from '@/components/ui';
import { DocFerramenta, DocGrid } from '@/components/ui/documentos';
import '../setores.css';
import {
  Search,
  Activity,
  FileText,
  Pill,
  Baby,
  HeartPulse,
  Bone,
  Weight,
  CalendarCheck,
  Heart,
  MapPin,
  BookOpen,
  Stethoscope,
  Globe,
  GraduationCap
} from 'lucide-react';

interface Ferramenta {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  link: string;
  icone: ComponentType<{ size?: number }>;
}

const ferramentas: Ferramenta[] = [
  // Protocolos e Diretrizes
  { id: '1', nome: "PCDT - Medicamentos por CID", categoria: "Protocolos", descricao: "Protocolos Clínicos e Diretrizes Terapêuticas do Ministério da Saúde", link: "https://www.gov.br/conitec/pt-br/protocolos-clinicos-e-diretrizes-terapeuticas/medicamentos-por-cid-e-pcdt", icone: FileText },
  { id: '2', nome: "Protocolos Clínicos e Diretrizes", categoria: "Protocolos", descricao: "Diretrizes terapêuticas e avaliação de tecnologias em saúde", link: "https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/protocolos-clinicos-e-diretrizes-terapeuticas", icone: FileText },

  // Calculadoras Médicas
  { id: '3', nome: "Calculadora Fetal (Barcelona)", categoria: "Calculadoras", descricao: "Cálculos de crescimento fetal, peso estimado e percentis", link: "https://fetalmedicinebarcelona.org/calc/", icone: Baby },
  { id: '4', nome: "PIERS (Pré-eclâmpsia)", categoria: "Calculadoras", descricao: "Avaliação de risco em gestantes com pré-eclâmpsia", link: "https://pre-empt.obgyn.ubc.ca/home-page/past-projects/fullpiers/", icone: HeartPulse },
  { id: '5', nome: "FRAX Brasil", categoria: "Calculadoras", descricao: "Risco de fratura por osteoporose", link: "https://abrasso.org.br/frax-brasil/", icone: Bone },
  { id: '6', nome: "Calculadora IMC - ABESO", categoria: "Calculadoras", descricao: "Cálculo de Índice de Massa Corporal e classificação", link: "https://abeso.org.br/calculadora-imc/", icone: Weight },
  { id: '7', nome: "Pneumologia - Calculadora", categoria: "Calculadoras", descricao: "Calculadoras para área da pneumologia", link: "https://pulmao.dapi.com.br/#calculadora", icone: Activity },
  { id: '8', nome: "Calculadora Gestacional", categoria: "Calculadoras", descricao: "Cálculo de idade gestacional e data provável do parto", link: "https://calculadoragestacional.saude.df.gov.br/", icone: CalendarCheck },
  { id: '9', nome: "CKD-EPI 2021", categoria: "Calculadoras", descricao: "Calculadora de taxa de filtração glomerular (Nefrologia)", link: "https://sbn.org.br/medicos/utilidades/calculadoras-nefrologicas/ckd-epi-2021/", icone: Activity },
  { id: '11', nome: "PREVENT Calculator", categoria: "Calculadoras", descricao: "Risco cardiovascular pela equação PREVENT (American Heart Association)", link: "https://professional.heart.org/en/guidelines-and-statements/prevent-calculator", icone: Heart },

  // Farmacologia e Segurança
  { id: '12', nome: "Drugs.com", categoria: "Farmacologia", descricao: "Informações sobre medicamentos, interações e bulas", link: "https://www.drugs.com/", icone: Pill },
  { id: '13', nome: "E-lactancia.org", categoria: "Farmacologia", descricao: "Segurança de medicamentos durante a amamentação", link: "https://www.e-lactancia.org/", icone: Baby },

  // Outros
  { id: '14', nome: "Endereços SUS - MS", categoria: "Outros", descricao: "Consulta de endereços de unidades de saúde SUS", link: "https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_PFPB_ENDERECOS/index.html", icone: MapPin },

  // Referências Extras
  { id: '15', nome: "UpToDate", categoria: "Referências", descricao: "Base de conhecimento clínico atualizada", link: "https://www.uptodate.com/", icone: BookOpen },
  { id: '16', nome: "Medscape", categoria: "Referências", descricao: "Referência médica, notícias e educação", link: "https://www.medscape.com/", icone: Stethoscope },
  { id: '17', nome: "PubMed", categoria: "Referências", descricao: "Base de dados de artigos científicos", link: "https://pubmed.ncbi.nlm.nih.gov/", icone: Search },
  { id: '18', nome: "WHO", categoria: "Referências", descricao: "Diretrizes e publicações da OMS", link: "https://www.who.int/", icone: Globe },
  { id: '19', nome: "MSD Manuals", categoria: "Referências", descricao: "Manual de diagnóstico e tratamento", link: "https://www.msdmanuals.com/pt/profissional", icone: BookOpen },
  { id: '20', nome: "SciELO", categoria: "Referências", descricao: "Biblioteca científica brasileira", link: "https://scielo.org/", icone: GraduationCap }
];

const normalizarBusca = (valor: string) => valor.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

export default function UtilitariosPage() {
  const tituloDialogoId = useId();
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');

  const categorias = ['Todos', ...Array.from(new Set(ferramentas.map(f => f.categoria)))];

  const ferramentasFiltradas = useMemo(() => {
    let filtradas = ferramentas;

    if (categoriaAtiva !== 'Todos') {
      filtradas = filtradas.filter(f => f.categoria === categoriaAtiva);
    }

    if (busca.trim()) {
      const t = normalizarBusca(busca);
      filtradas = filtradas.filter(f =>
        normalizarBusca(f.nome).includes(t) ||
        normalizarBusca(f.descricao).includes(t)
      );
    }

    return filtradas;
  }, [busca, categoriaAtiva]);

  const [modalOpen, setModalOpen] = useState(false);
  const [linkSelecionado, setLinkSelecionado] = useState('');
  const fecharModalRef = useRef<HTMLButtonElement>(null);
  const botaoOrigemRef = useRef<HTMLButtonElement | null>(null);

  const handleOpenLink = (link: string, trigger: HTMLButtonElement) => {
    botaoOrigemRef.current = trigger;
    setLinkSelecionado(link);
    setModalOpen(true);
  };

  const confirmarAbrirLink = () => {
    window.open(linkSelecionado, '_blank', 'noopener,noreferrer');
    fecharModal();
  };

  const fecharModal = () => {
    setModalOpen(false);
    botaoOrigemRef.current?.focus();
  };

  useEffect(() => {
    if (!modalOpen) return;
    fecharModalRef.current?.focus();
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        fecharModal();
      }
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [modalOpen]);

  return (
    <div className="conteudo">
      <PageHeader icon="las la-tools" title="Utilitários clínicos" subtitle="Calculadoras, diretrizes e referências úteis" />

      <SearchInput value={busca} onChange={setBusca} placeholder="Buscar ferramentas ou diretrizes..." label="Buscar ferramentas clínicas" />

      <Tabs tabs={categorias.map(cat => ({ id: cat, label: cat }))} active={categoriaAtiva} onChange={setCategoriaAtiva} label="Filtrar por categoria" />

      <p className="sr-only" role="status" aria-live="polite">
        {ferramentasFiltradas.length} {ferramentasFiltradas.length === 1 ? 'ferramenta encontrada' : 'ferramentas encontradas'}
      </p>

      {ferramentasFiltradas.length === 0 ? (
        <EmptyState icon="las la-search" message="Nenhuma ferramenta encontrada. Tente outro termo ou outra categoria." />
      ) : (
        <DocGrid>
          {ferramentasFiltradas.map(ferramenta => {
            const Icon = ferramenta.icone;
            return (
              <DocFerramenta
                key={ferramenta.id}
                icone={<Icon size={20} />}
                titulo={ferramenta.nome}
                descricao={ferramenta.descricao}
                categoria={ferramenta.categoria}
                rotuloAcao="Acessar"
                onAcao={botao => handleOpenLink(ferramenta.link, botao)}
              />
            );
          })}
        </DocGrid>
      )}

      {/* Confirmação de link externo */}
      {modalOpen && (
        <div className="sc-modal" onMouseDown={event => { if (event.target === event.currentTarget) fecharModal(); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloDialogoId}
            className="sc-modal-caixa"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const focaveis = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])');
              if (!focaveis.length) return;
              const primeiro = focaveis[0];
              const ultimo = focaveis[focaveis.length - 1];
              if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
              else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
            }}
          >
            <div className="sc-modal-topo">
              <h2 id={tituloDialogoId}>Abrir site externo</h2>
              <button ref={fecharModalRef} type="button" className="sc-modal-fechar" onClick={fecharModal} aria-label="Fechar aviso de redirecionamento">
                <i className="las la-times" aria-hidden="true"></i>
              </button>
            </div>
            <div className="sc-nota">
              Você será redirecionado para um site externo:
              <br />
              <strong className="sc-historico">{linkSelecionado}</strong>
            </div>
            <div className="sc-acoes sc-acoes-fim">
              <button type="button" className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={confirmarAbrirLink}>
                Continuar <i className="las la-external-link-alt" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
