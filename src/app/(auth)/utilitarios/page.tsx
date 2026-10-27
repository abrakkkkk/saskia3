'use client';

import { useState, useMemo, useEffect, type ComponentType } from 'react';
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
      const t = busca.toLowerCase();
      filtradas = filtradas.filter(f => 
        f.nome.toLowerCase().includes(t) || 
        f.descricao.toLowerCase().includes(t)
      );
    }
    
    return filtradas;
  }, [busca, categoriaAtiva]);

  const [modalOpen, setModalOpen] = useState(false);
  const [linkSelecionado, setLinkSelecionado] = useState('');

  const handleOpenLink = (link: string) => {
    setLinkSelecionado(link);
    setModalOpen(true);
  };

  const confirmarAbrirLink = () => {
    window.open(linkSelecionado, '_blank', 'noopener,noreferrer');
    setModalOpen(false);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [modalOpen]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-900 to-blue-700 p-8 rounded-3xl shadow-lg text-white">
        <div className="bg-white/20 p-4 rounded-2xl">
          <Wrench className="w-10 h-10 text-blue-50" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utilitários Clínicos</h1>
          <p className="text-blue-100 mt-1 font-medium">Calculadoras, diretrizes e referências úteis</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          aria-label="Buscar ferramentas clínicas"
          type="text" 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ferramentas ou diretrizes..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {categorias.map(cat => {
          const ativo = categoriaAtiva === cat;
          return (
            <button 
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              aria-pressed={ativo}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 text-sm ${
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

      {ferramentasFiltradas.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-4">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhuma ferramenta encontrada</h3>
          <p className="text-slate-500">Tente outro termo de busca ou selecione outra categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ferramentasFiltradas.map(ferramenta => {
            const Icon = ferramenta.icone;
            return (
              <div key={ferramenta.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-700 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-110 transition-transform duration-300 group-hover:bg-blue-600 group-hover:text-white">
                  <Icon className="w-7 h-7" />
                </div>
                
                <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 w-max">
                  {ferramenta.categoria}
                </span>
                
                <h4 className="text-[16px] font-bold text-slate-800 leading-snug mb-2">
                  {ferramenta.nome}
                </h4>
                
                <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-3">
                  {ferramenta.descricao}
                </p>
                
                <button 
                  onClick={() => handleOpenLink(ferramenta.link)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-600 hover:text-white transition-colors text-sm mt-auto"
                >
                  <ExternalLink className="w-4 h-4" />
                  Acessar Ferramenta
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Confirmação de Link Externo */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-labelledby="utilitarios-dialog-title" className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-blue-900 p-6 flex justify-between items-center">
              <h3 id="utilitarios-dialog-title" className="text-white font-bold text-lg flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Aviso de Redirecionamento
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                aria-label="Fechar aviso de redirecionamento"
                className="text-white/70 hover:text-white transition-colors"
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
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmarAbrirLink}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
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
