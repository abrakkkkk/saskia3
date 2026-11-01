'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Search,
  List,
  Landmark,
  University,
  Pill,
  UserCheck,
  MoreHorizontal,
  Eye,
  Download,
  FileText,
  Activity,
  Brain,
  Dog,
  HeartPulse,
  Home,
  FileEdit,
  ClipboardCheck,
  Tablets,
  BookOpen,
  X,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Ficha {
  id: string;
  driveId?: string;
  arquivo: string;
  titulo: string;
  instituicao: string;
  categoria: string;
  tags: string[];
  icone: LucideIcon;
}

const FICHAS_DADOS: Ficha[] = [
  {
    id: '1',
    arquivo: 'dole1.pdf',
    titulo: 'Escore Internacional de Sintomas Prostáticos',
    instituicao: 'UFRGS',
    categoria: 'UFRGS',
    tags: ['Urologia', 'Próstata', 'Avaliação'],
    icone: UserCheck
  },
  {
    id: '2',
    arquivo: 'reqmom.pdf',
    titulo: 'Requisição de Mamografia',
    instituicao: 'Saskia Saúde',
    categoria: 'Atendimento',
    tags: ['Mamografia', 'Saúde da Mulher', 'Requisição'],
    icone: Activity
  },
  {
    id: '3',
    arquivo: 'MSS1.pdf',
    titulo: 'Hanseníase - Tabela de Avaliação Neurológica',
    instituicao: 'Ministério da Saúde',
    categoria: 'MS',
    tags: ['Hanseníase', 'Neurologia', 'Avaliação'],
    icone: Brain
  },
  {
    id: '4',
    arquivo: 'MRPA.pdf',
    titulo: 'Medição Residencial da Pressão Arterial',
    instituicao: 'Saskia Saúde',
    categoria: 'Atendimento',
    tags: ['Pressão Arterial', 'Cardiologia', 'MRPA'],
    icone: HeartPulse
  },
  {
    id: '5',
    arquivo: 'mpmp.pdf',
    titulo: 'Medicamentos e Insumos do Programa Farmácia Popular',
    instituicao: 'Farmácia Popular',
    categoria: 'Farmácia',
    tags: ['Farmácia Popular', 'Medicamentos', 'Insumos'],
    icone: Pill
  },
  {
    id: '6',
    arquivo: 'Hanseniasev5.pdf',
    titulo: 'Hanseníase v5 - Ficha de Avaliação',
    instituicao: 'Ministério da Saúde',
    categoria: 'MS',
    tags: ['Hanseníase', 'Avaliação', 'Protocolo'],
    icone: FileText
  },
  {
    id: '7',
    arquivo: 'FLMEP1.pdf',
    titulo: 'Formulário LME Padrão 1',
    instituicao: 'Ministério da Saúde',
    categoria: 'MS',
    tags: ['LME', 'Medicamentos', 'Formulário'],
    icone: FileText
  },
  {
    id: '8',
    arquivo: 'FPVD1.pdf',
    titulo: 'Ficha para Visitas Domiciliares',
    instituicao: 'Saskia Saúde',
    categoria: 'Atendimento',
    tags: ['Visita Domiciliar', 'APS', 'Saúde da Família'],
    icone: Home
  },
  {
    id: '9',
    arquivo: 'FIDFCv5.pdf',
    titulo: 'Ficha de Investigação Dengue e Febre de Chikungunya v5',
    instituicao: 'Ministério da Saúde',
    categoria: 'MS',
    tags: ['Dengue', 'Chikungunya', 'Vigilância'],
    icone: Activity
  },
  {
    id: '10',
    arquivo: 'FAIs1.pdf',
    titulo: 'Ficha de Atendimento Individual',
    instituicao: 'Saskia Saúde',
    categoria: 'Atendimento',
    tags: ['Atendimento', 'Individual', 'Prontuário'],
    icone: FileEdit
  },
  {
    id: '11',
    arquivo: 'FAICOUs2.pdf',
    titulo: 'Ficha de Atendimento Individual com Orientações de Uso',
    instituicao: 'Saskia Saúde',
    categoria: 'Atendimento',
    tags: ['Atendimento', 'Orientações', 'Individual'],
    icone: ClipboardCheck
  },
  {
    id: '12',
    arquivo: 'MIt1.pdf',
    titulo: 'Farmácia Popular - Medicamentos e Insumos',
    instituicao: 'Farmácia Popular',
    categoria: 'Farmácia',
    tags: ['Farmácia Popular', 'Medicamentos', 'Tabela'],
    icone: Tablets
  },
  {
    id: '13',
    arquivo: 'DIDEC.pdf',
    titulo: 'Diário de Cefaléias',
    instituicao: 'Saskia Saúde',
    categoria: 'Outros',
    tags: ['Cefaléia', 'Diário', 'Neurologia'],
    icone: BookOpen
  },
  {
    id: '14',
    arquivo: 'TFPs3.pdf',
    titulo: 'Como Tratar a Fascite Plantar',
    instituicao: 'Saskia Saúde',
    categoria: 'Outros',
    tags: ['Fascite Plantar', 'Ortopedia', 'Tratamento'],
    icone: Activity
  },
  {
    id: '15',
    arquivo: 'AARHv2.pdf',
    titulo: 'Atendimento Antirrábico Humano v2',
    instituicao: 'Ministério da Saúde',
    categoria: 'MS',
    tags: ['Raiva', 'Antirrábico', 'Protocolo'],
    icone: Dog
  },
  {
    id: '16',
    arquivo: 'APACP.pdf',
    titulo: 'APAC Preenchível',
    instituicao: 'Ministério da Saúde',
    categoria: 'MS',
    tags: ['APAC', 'Autorização', 'SUS'],
    icone: FileText
  }
];

const INSTITUICAO_CONFIG: Record<string, { badgeBg: string; badgeText: string; borderColor: string; dotColor: string }> = {
  'Ministério da Saúde': {
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    borderColor: '#059669',
    dotColor: 'bg-emerald-500'
  },
  'UFRGS': {
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeText: 'text-indigo-700',
    borderColor: '#4f46e5',
    dotColor: 'bg-indigo-500'
  },
  'Saskia Saúde': {
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-700',
    borderColor: '#2563eb',
    dotColor: 'bg-blue-500'
  },
  'Farmácia Popular': {
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-700',
    borderColor: '#d97706',
    dotColor: 'bg-amber-500'
  }
};

const DEFAULT_INST_CONFIG = {
  badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
  badgeText: 'text-slate-700',
  borderColor: '#64748b',
  dotColor: 'bg-slate-400'
};

export default function FichasAuxiliaresPage() {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [modalPreview, setModalPreview] = useState<{ aberto: boolean; ficha: Ficha | null }>({
    aberto: false,
    ficha: null
  });
  const modalDialogRef = useRef<HTMLDivElement | null>(null);
  const modalOpenerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!modalPreview.aberto) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalDialogRef.current?.focus();
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalPreview({ aberto: false, ficha: null });
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => {
      window.removeEventListener('keydown', fecharComEscape);
      document.body.style.overflow = overflowAnterior;
      modalOpenerRef.current?.focus();
    };
  }, [modalPreview.aberto]);

  const categoriasMenu = [
    { nome: 'Todas', label: 'Todas as Fichas', icone: List },
    { nome: 'MS', label: 'Ministério da Saúde', icone: Landmark },
    { nome: 'UFRGS', label: 'UFRGS', icone: University },
    { nome: 'Farmácia', label: 'Farmácia Popular', icone: Pill },
    { nome: 'Atendimento', label: 'Atendimento', icone: UserCheck },
    { nome: 'Outros', label: 'Outros Protocolos', icone: MoreHorizontal }
  ];

  const fichasFiltradas = useMemo(() => {
    let filtradas = FICHAS_DADOS;

    if (categoriaAtiva !== 'Todas') {
      filtradas = filtradas.filter(f => f.categoria === categoriaAtiva);
    }

    if (busca.trim()) {
      const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
      const t = normalizar(busca);
      filtradas = filtradas.filter(f =>
        normalizar(f.titulo).includes(t) ||
        normalizar(f.instituicao).includes(t) ||
        f.tags.some(tag => normalizar(tag).includes(t))
      );
    }

    return filtradas;
  }, [busca, categoriaAtiva]);

  const handleDownload = (ficha: Ficha) => {
    const filePath = `/fichass1/${encodeURIComponent(ficha.arquivo)}`;
    const a = document.createElement('a');
    a.href = filePath;
    a.download = ficha.arquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAbrirPreview = (ficha: Ficha) => {
    setModalPreview({ aberto: true, ficha });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* HEADER HERO */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-400/20">
              <ClipboardList className="w-3.5 h-3.5" />
              Biblioteca Clínica & Protocolos
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Fichas Auxiliares e Formulários
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-normal leading-relaxed">
              Consulte, visualize e faça download de formulários oficiais do Ministério da Saúde, protocolos de atendimento, fichas de acolhimento e requisições clínicas.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 self-start md:self-auto">
            <div className="w-10 h-10 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{FICHAS_DADOS.length}</div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Documentos Ativos</div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            aria-label="Buscar fichas clínicas"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome da ficha, instituição (ex: MS, UFRGS) ou palavra-chave..."
            maxLength={120}
            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {busca && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {categoriasMenu.map(cat => {
              const Icone = cat.icone;
              const ativo = categoriaAtiva === cat.nome;
              const count = cat.nome === 'Todas' ? FICHAS_DADOS.length : FICHAS_DADOS.filter(f => f.categoria === cat.nome).length;

              return (
                <button
                  type="button"
                  key={cat.nome}
                  aria-pressed={ativo}
                  onClick={() => setCategoriaAtiva(cat.nome)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    ativo
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" />
                  {cat.label}
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${ativo ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 font-medium" aria-live="polite" aria-atomic="true">
            Exibindo <span className="font-bold text-slate-800">{fichasFiltradas.length}</span> de {FICHAS_DADOS.length} fichas
          </div>
        </div>
      </div>

      {/* GRID DE CARDS */}
      {fichasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhuma ficha localizada</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
            Nenhum formulário corresponde aos termos pesquisados ou aos filtros aplicados.
          </p>
          <button
            type="button"
            onClick={() => { setBusca(''); setCategoriaAtiva('Todas'); }}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Limpar Filtros de Busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {fichasFiltradas.map(ficha => {
            const Icon = ficha.icone;
            const instConfig = INSTITUICAO_CONFIG[ficha.instituicao] || DEFAULT_INST_CONFIG;

            return (
              <div
                key={ficha.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/90 hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                style={{ borderTop: `4px solid ${instConfig.borderColor}` }}
              >
                {/* Header do Card */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${instConfig.badgeBg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${instConfig.dotColor}`}></span>
                      {ficha.instituicao}
                    </span>

                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-[14px] font-bold text-slate-900 leading-snug mb-3 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {ficha.titulo}
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {ficha.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => { modalOpenerRef.current = event.currentTarget; handleAbrirPreview(ficha); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    Visualizar
                  </button>

                  <button
                    type="button"
                    aria-label={`Baixar ${ficha.titulo}`}
                    onClick={() => handleDownload(ficha)}
                    title="Baixar PDF"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE PREVIEW CLÍNICO */}
      {modalPreview.aberto && modalPreview.ficha && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={modalDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ficha-preview-title"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key !== 'Tab' || !modalDialogRef.current) return;
              const focaveis = Array.from(modalDialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'));
              if (!focaveis.length) { event.preventDefault(); modalDialogRef.current.focus(); return; }
              const primeiro = focaveis[0];
              const ultimo = focaveis[focaveis.length - 1];
              if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
              else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-4 md:px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="ficha-preview-title" className="text-base font-bold text-white line-clamp-1">
                    {modalPreview.ficha.titulo}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Origem: {modalPreview.ficha.instituicao} • Arquivo: {modalPreview.ficha.arquivo}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end flex-wrap gap-2 w-full sm:w-auto">
                <a
                  href={`/fichass1/${encodeURIComponent(modalPreview.ficha.arquivo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Nova Aba
                </a>
                <button
                  onClick={() => handleDownload(modalPreview.ficha!)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF
                </button>
                <button
                  type="button"
                  aria-label="Fechar prévia"
                  onClick={() => setModalPreview({ aberto: false, ficha: null })}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe Viewer */}
            <div className="flex-1 bg-slate-100 min-h-[45vh] sm:min-h-[500px] relative">
              <iframe
                src={`/fichass1/${encodeURIComponent(modalPreview.ficha.arquivo)}`}
                className="w-full h-full min-h-[45vh] sm:min-h-[550px] border-none"
                title={modalPreview.ficha.titulo}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-4 md:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-semibold text-slate-700">Tags:</span>
                {modalPreview.ficha.tags.map(t => (
                  <span key={t} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
              <button
                type="button"
                aria-label="Fechar visualização"
                onClick={() => setModalPreview({ aberto: false, ficha: null })}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
