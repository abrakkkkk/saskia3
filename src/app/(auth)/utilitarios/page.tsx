'use client';

import { useState, useMemo, useEffect, useRef, type ComponentType } from 'react';
import {
  Wrench,
  Search,
  ExternalLink,
  Activity,
  List,
  FileText,
  Calculator,
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
  icone: ComponentType<{ className?: string }>;
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
  { id: '10', nome: "LDL Calculadora", categoria: "Calculadoras", descricao: "Cálculo de LDL colesterol", link: "https://insulin.ddns.net/dm/ldl/", icone: Activity },
  { id: '11', nome: "ASCVD Risk Calculator", categoria: "Calculadoras", descricao: "Risco cardiovascular (American Heart Association)", link: "https://professional.heart.org/en/guidelines-and-statements/prevent-calculator", icone: Heart },

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

const normalizarBusca = (valor: string) => valor.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export default function UtilitariosPage() {
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-r from-blue-900 to-blue-700 p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg text-white">
        <div className="bg-white/20 p-3 sm:p-4 rounded-2xl shrink-0" aria-hidden="true">
          <Wrench className="w-10 h-10 text-blue-50" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Utilitários Clínicos</h1>
          <p className="text-blue-100 mt-1 font-medium">Calculadoras, diretrizes e referências úteis</p>
        </div>
      </div>

      <div className="relative">
        <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          aria-label="Buscar ferramentas clínicas"
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ferramentas ou diretrizes..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
        />
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3" aria-label="Filtrar por categoria">
        {categorias.map(cat => {
          const ativo = categoriaAtiva === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              aria-pressed={ativo}
              className={`min-h-10 flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full font-medium transition-all duration-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                ativo
                  ? 'bg-blue-700 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-sm'
              }`}
            >
              {cat === 'Todos' ? <List className="w-4 h-4" /> : <Wrench className="w-4 h-4 opacity-70" />}
              {cat}
            </button>
          )
        })}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {ferramentasFiltradas.length} {ferramentasFiltradas.length === 1 ? 'ferramenta encontrada' : 'ferramentas encontradas'}
      </p>

      {ferramentasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-16 text-center shadow-sm border border-slate-100">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-4">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhuma ferramenta encontrada</h3>
          <p className="text-slate-500">Tente outro termo de busca ou selecione outra categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {ferramentasFiltradas.map(ferramenta => {
            const Icon = ferramenta.icone;
            return (
              <article key={ferramenta.id} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 flex flex-col group relative overflow-hidden min-w-0">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-700 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200" aria-hidden="true">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 w-max max-w-full">
                  {ferramenta.categoria}
                </span>

                <h2 className="text-base font-bold text-slate-800 leading-snug mb-2 min-h-[2.75rem]">
                  {ferramenta.nome}
                </h2>

                <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-3">
                  {ferramenta.descricao}
                </p>

                <button
                  onClick={(event) => handleOpenLink(ferramenta.link, event.currentTarget)}
                  className="w-full min-h-11 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-bold py-3 px-3 rounded-xl hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors text-sm mt-auto"
                >
                  <ExternalLink className="w-4 h-4" />
                  Acessar Ferramenta
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Confirmação de Link Externo */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-labelledby="utilitarios-dialog-title" onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            const focaveis = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])');
            if (!focaveis.length) return;
            const primeiro = focaveis[0];
            const ultimo = focaveis[focaveis.length - 1];
            if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
            else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
          }} className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-blue-900 p-6 flex justify-between items-center">
              <h3 id="utilitarios-dialog-title" className="text-white font-bold text-lg flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Aviso de Redirecionamento
              </h3>
              <button
                ref={fecharModalRef}
                onClick={fecharModal}
                aria-label="Fechar aviso de redirecionamento"
                className="w-10 h-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-700 mb-4 font-medium">Você será redirecionado para um site externo:</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 break-all text-sm text-blue-600 font-medium mb-6">
                {linkSelecionado}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={fecharModal}
                  className="flex-1 min-h-11 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAbrirLink}
                  className="flex-1 min-h-11 py-3 px-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                >
                  Continuar <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
