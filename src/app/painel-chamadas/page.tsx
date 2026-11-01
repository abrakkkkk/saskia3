'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Volume2, VolumeX, Bell, Clock, DoorOpen, ActivitySquare, Users, AlertCircle, CheckCircle2, UserCheck, Timer } from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
  status: string;
  classificacao: string | null;
  createdAt: string;
}

interface Chamada {
  id: string;
  pacienteId: string | null;
  pacienteNome: string;
  status: string;
  consultorio: string;
  createdAt: string;
}

interface PacienteFila extends Paciente {
  foiChamado: boolean;
  dadosChamada?: Chamada;
  tempoEsperaMin: number;
}

export default function PainelChamadasTV() {
  const { data: session, status: sessionStatus } = useSession();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [erroCarga, setErroCarga] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  
  // Áudio Controls
  const [audioPermitido, setAudioPermitido] = useState(false);
  const [vozAtivada, setVozAtivada] = useState(true);
  
  const audioCtxRef = useRef<any>(null);
  const ultimaChamadaIdRef = useRef<string>('');
  const chamadasInicializadasRef = useRef(false);
  const fetchSequenceRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const permitirAudio = () => {
      if (!audioPermitido) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if(AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
          if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        }
        const msg = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(msg);
        setAudioPermitido(true);
      }
    };
    document.addEventListener('click', permitirAudio, { once: false });
    return () => document.removeEventListener('click', permitirAudio);
  }, [audioPermitido]);

  const tocarBeep = () => {
    if (audioPermitido && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const beep = (freq: number, delay: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur);
      };
      // Toque clássico estilo painel (Ding-Dong)
      beep(880, 0, 0.5); beep(700, 0.4, 0.6);
    }
  };

  const falarMensagem = (nome: string, consultorio: string) => {
    if (!vozAtivada || !audioPermitido) return;
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(`Atenção, paciente: ${nome}. Dirija-se para: ${consultorio}`);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }, 800);
  };

  const fetchDados = useCallback(async () => {
    const sequence = ++fetchSequenceRef.current;
    try {
      const [resPacientes, resChamadas] = await Promise.all([
        fetch('/api/pacientes?visao=painel-chamadas'),
        fetch('/api/chamadas')
      ]);

      if (!resPacientes.ok || !resChamadas.ok) throw new Error('Não foi possível carregar as chamadas. Verifique a sessão e tente novamente.');
      const [listaPacientes, listaChamadas] = await Promise.all([resPacientes.json(), resChamadas.json()]);
      if (!Array.isArray(listaPacientes) || !Array.isArray(listaChamadas)) throw new Error('O servidor retornou dados inválidos para o painel.');
      if (sequence !== fetchSequenceRef.current) return;
      if (!chamadasInicializadasRef.current) {
        chamadasInicializadasRef.current = true;
        ultimaChamadaIdRef.current = listaChamadas[0]?.id ?? '';
      }
      setPacientes(listaPacientes);
      setChamadas(listaChamadas);
      setErroCarga('');
    } catch (error) {
      if (sequence !== fetchSequenceRef.current) return;
      setPacientes([]);
      setChamadas([]);
      setErroCarga(error instanceof Error ? error.message : 'Erro ao carregar dados do painel.');
    } finally {
      if (sequence === fetchSequenceRef.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated' || !session?.user) {
      fetchSequenceRef.current++;
      setPacientes([]);
      setChamadas([]);
      chamadasInicializadasRef.current = false;
      ultimaChamadaIdRef.current = '';
      setCarregando(false);
      return;
    }
    setPacientes([]);
    setChamadas([]);
    setErroCarga('');
    chamadasInicializadasRef.current = false;
    ultimaChamadaIdRef.current = '';
    setCarregando(true);
    void fetchDados();
    const interval = setInterval(() => void fetchDados(), 3000);
    const handleStorage = () => void fetchDados();
    window.addEventListener('storage', handleStorage);
    return () => {
      fetchSequenceRef.current++;
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [sessionStatus, session?.user, fetchDados]);

  useEffect(() => {
    if (chamadas.length > 0) {
      // API brings ordered by createdAt desc, so the first is the newest
      const ultima = chamadas[0];
      const chamadaId = ultima.id;
      if (chamadaId !== ultimaChamadaIdRef.current) {
        ultimaChamadaIdRef.current = chamadaId;
        tocarBeep();
        falarMensagem(ultima.pacienteNome, ultima.consultorio);
      }
    }
  }, [chamadas, audioPermitido, vozAtivada]);

  // LÓGICA DE FILA
  const pacientesAtivos = pacientes.filter(p => !["Finalizado", "Alta Médica", "Evasão", "Transferido", "Óbito"].includes(p.status));
  const filaComChamadas: PacienteFila[] = pacientesAtivos.map(p => {
    const chamada = chamadas.find(c => c.pacienteId === p.id || (!c.pacienteId && c.pacienteNome === p.nome));
    const dataRef = p.createdAt || new Date().toISOString();
    const tempoEsperaMin = Math.floor((new Date().getTime() - new Date(dataRef).getTime()) / 60000);
    return { ...p, foiChamado: !!chamada, dadosChamada: chamada, tempoEsperaMin };
  });

  // ESTATÍSTICAS
  const qtdAguardando = filaComChamadas.filter(p => p.status === "Aguardando Triagem" || p.status === "Recepção").length;
  const qtdAtendimento = filaComChamadas.filter(p => p.status.includes("Atendimento") || p.status === "Em Triagem").length;
  const qtdEmergencia = filaComChamadas.filter(p => ["Vermelho", "Laranja"].includes(p.classificacao || "")).length;

  const temposMedios: Record<string, number | null> = { "Vermelho": null, "Laranja": null, "Amarelo": null, "Verde": null, "Azul": null };
  const temposCalc: Record<string, number[]> = { "Vermelho": [], "Laranja": [], "Amarelo": [], "Verde": [], "Azul": [] };
  
  filaComChamadas.forEach(p => {
    if (p.classificacao && temposCalc[p.classificacao]) {
      temposCalc[p.classificacao].push(p.tempoEsperaMin);
    }
  });

  Object.keys(temposCalc).forEach(cor => {
    if (temposCalc[cor].length > 0) {
      const soma = temposCalc[cor].reduce((a,b) => a+b, 0);
      temposMedios[cor] = Math.floor(soma / temposCalc[cor].length);
    }
  });

  const chamadaAtual = chamadas.length > 0 ? chamadas[0] : null;
  const ultimasChamadasHistorico = chamadaAtual ? chamadas.slice(1, 6) : [];

  if (sessionStatus === 'loading') {
    return <main className="min-h-screen bg-slate-900 text-slate-100 grid place-items-center p-6 text-center" role="status">Verificando sessão…</main>;
  }
  if (sessionStatus !== 'authenticated' || !session?.user) {
    return <main className="min-h-screen bg-slate-900 text-slate-100 grid place-items-center p-6 sm:p-8 text-center"><p role="alert" className="max-w-xl rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 leading-relaxed">Entre no sistema para visualizar o painel de chamadas.</p></main>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col overflow-x-hidden overflow-y-auto lg:h-screen lg:overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER: ESTILO SGA (Simples, direto e institucional) */}
      <header className="min-h-20 h-auto lg:h-24 bg-slate-950 border-b-4 border-blue-600 px-4 sm:px-6 lg:px-10 py-4 lg:py-0 flex flex-wrap items-center justify-between gap-x-5 gap-y-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <ActivitySquare aria-hidden="true" className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 text-blue-500" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Saskia <span className="text-blue-500 font-light">Painel</span></h1>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 lg:gap-8 w-full sm:w-auto">
          {!audioPermitido && (
            <div className="bg-red-500/20 text-red-300 px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 border border-red-500/50 text-xs sm:text-sm font-medium">
              <VolumeX aria-hidden="true" className="w-5 h-5 shrink-0" /> Áudio inativo
            </div>
          )}
          <div className="text-right">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">
              {mounted ? horaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </div>
            <div className="text-blue-300 text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-[0.12em] lg:tracking-widest mt-1">
              {mounted ? horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : '---'}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT: SPLIT SCREEN CLASSIC */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row bg-slate-800 relative">
        {erroCarga && <div role="alert" className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-2xl rounded-xl border border-red-700 bg-red-950 px-4 sm:px-5 py-3 text-sm sm:text-base leading-relaxed text-red-100 shadow-xl">{erroCarga}</div>}
        {carregando && <div role="status" className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-fit max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-600 bg-slate-800 px-4 sm:px-5 py-3 text-sm sm:text-base text-slate-100 shadow-lg">Carregando chamadas…</div>}
        
        {/* ESQUERDA: CHAMADA ATUAL (MUITO DESTAQUE) */}
        <div className="flex-none lg:flex-[3] min-h-[52vh] lg:min-h-0 bg-slate-900 p-5 sm:p-8 xl:p-12 flex flex-col text-center border-b lg:border-b-0 lg:border-r border-slate-700 shadow-[0_12px_24px_rgba(0,0,0,0.18)] lg:shadow-[20px_0_30px_rgba(0,0,0,0.3)] relative z-10">
          {chamadaAtual ? (
            <div className="w-full h-full min-h-[44vh] flex flex-col items-center justify-center gap-10 xl:gap-24 motion-reduce:animate-none animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center justify-center w-full">
                <Bell aria-hidden="true" className="w-12 h-12 sm:w-16 sm:h-16 xl:w-20 xl:h-20 text-blue-500 mb-5 sm:mb-6" />
                <p className="text-lg sm:text-xl xl:text-2xl font-bold text-slate-300 uppercase tracking-[0.18em] xl:tracking-[0.3em] mb-3 sm:mb-4">Paciente</p>
                <h2 className="text-3xl sm:text-4xl xl:text-6xl leading-tight font-black text-white tracking-tight drop-shadow-lg break-words w-full px-2 sm:px-8">
                  {chamadaAtual.pacienteNome}
                </h2>
              </div>
              
              <div className="bg-blue-600 rounded-2xl sm:rounded-[2rem] w-full max-w-2xl p-5 sm:p-6 shadow-2xl border-b-4 sm:border-b-8 border-blue-800 flex flex-col items-center shrink-0 text-center">
                <p className="text-sm sm:text-base lg:text-lg font-bold text-blue-100 uppercase tracking-[0.18em] sm:tracking-[0.3em] mb-2">Dirija-se Para</p>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                  <DoorOpen aria-hidden="true" className="w-9 h-9 sm:w-12 sm:h-12 text-white shrink-0" />
                  <span className="text-2xl sm:text-3xl xl:text-4xl leading-tight font-black text-white uppercase drop-shadow-md break-words max-w-full">
                    {chamadaAtual.consultorio}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 flex flex-col items-center justify-center min-h-[44vh]">
              <ActivitySquare aria-hidden="true" className="w-24 h-24 sm:w-32 sm:h-32 xl:w-40 xl:h-40 mb-5 sm:mb-8 text-slate-300 opacity-20" />
              <p className="text-2xl sm:text-3xl xl:text-4xl font-bold uppercase tracking-[0.12em] sm:tracking-widest">Aguardando Chamadas</p>
            </div>
          )}
        </div>

        {/* DIREITA: HISTÓRICO DE CHAMADAS */}
        <div className="flex-none lg:flex-[2] min-h-[38vh] lg:min-h-0 flex flex-col p-5 sm:p-6 xl:p-8">
          <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-slate-200 mb-5 sm:mb-6 xl:mb-8 uppercase tracking-[0.12em] sm:tracking-widest border-b-2 border-slate-700 pb-3 sm:pb-4">
            Últimas Chamadas
          </h3>

          <div className="flex-1 flex flex-col gap-3 sm:gap-4 xl:gap-6 justify-start overflow-y-auto overscroll-contain">
            {ultimasChamadasHistorico.length === 0 ? (
              <div className="text-slate-400 text-center py-12 sm:py-16 xl:py-20 text-base sm:text-lg xl:text-xl font-bold">Nenhum histórico recente.</div>
            ) : (
              ultimasChamadasHistorico.map((c, i) => (
                <div key={i} className="bg-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 border-l-4 sm:border-l-[6px] border-slate-600 shadow-md">
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-base sm:text-lg xl:text-xl font-bold text-white truncate leading-tight">{c.pacienteNome}</h4>
                    <span className="text-sm text-slate-400 font-semibold mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3 text-blue-400" />
                      Chamado às {new Date(c.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                  <div className="shrink-0 flex flex-col items-end pl-3 sm:pl-4 border-l border-slate-700 max-w-[45%]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Local</span>
                    <span className="text-base sm:text-lg xl:text-xl font-black text-blue-300 uppercase tracking-tight text-right break-words line-clamp-2">
                      {c.consultorio}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* FOOTER: ESTATÍSTICAS E TEMPO MÉDIO */}
      <footer className="h-auto min-h-32 bg-slate-950 px-4 sm:px-6 xl:px-12 py-5 lg:py-0 pb-20 lg:pb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-5 lg:gap-0 shrink-0 border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 w-full">
        
        {/* Contadores */}
        <div className="w-full lg:flex-1 grid grid-cols-3 items-center justify-around lg:border-r border-slate-800 lg:pr-8 xl:pr-12 h-auto lg:h-full py-0 lg:py-6 gap-2">
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest mb-1 text-center">Aguardando</span>
            <span className="text-3xl sm:text-4xl font-black text-white leading-none">{qtdAguardando}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest mb-1 text-center">Atendimento</span>
            <span className="text-3xl sm:text-4xl font-black text-white leading-none">{qtdAtendimento}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest mb-1 text-center">Emergência</span>
            <span className="text-3xl sm:text-4xl font-black text-red-400 leading-none">{qtdEmergencia}</span>
          </div>
        </div>

        {/* Tempos Médios */}
        <div className="w-full lg:flex-[1.5] lg:pl-8 xl:pl-12 h-auto lg:h-full py-0 lg:py-6 flex flex-col justify-center">
          <span className="text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest mb-3 flex items-center justify-center gap-2 text-center">
            <Timer aria-hidden="true" className="w-4 h-4 text-slate-300 shrink-0" /> Tempo Médio de Espera (Minutos)
          </span>
          <div className="flex flex-wrap items-center justify-center sm:justify-around gap-x-4 gap-y-3 w-full">
            <div className="flex items-center gap-2">
              <div aria-hidden="true" className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.6)]"></div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-300">Vermelho</span>
              <span className="text-lg sm:text-2xl font-bold text-slate-100">{temposMedios["Vermelho"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div aria-hidden="true" className="w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]"></div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-300">Laranja</span>
              <span className="text-lg sm:text-2xl font-bold text-slate-100">{temposMedios["Laranja"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div aria-hidden="true" className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-300">Amarelo</span>
              <span className="text-lg sm:text-2xl font-bold text-slate-100">{temposMedios["Amarelo"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div aria-hidden="true" className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-300">Verde</span>
              <span className="text-lg sm:text-2xl font-bold text-slate-100">{temposMedios["Verde"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div aria-hidden="true" className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-300">Azul</span>
              <span className="text-lg sm:text-2xl font-bold text-slate-100">{temposMedios["Azul"] ?? '--'}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Audio toggle */}
      <button 
        onClick={() => setVozAtivada(!vozAtivada)} 
        aria-label={vozAtivada ? "Desativar anúncios por voz" : "Ativar anúncios por voz"}
        aria-pressed={vozAtivada}
        className="fixed bottom-4 right-4 lg:bottom-36 lg:right-6 w-12 h-12 bg-slate-800 text-slate-300 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 transition-all z-50 border border-slate-600 shadow-lg"
        title={vozAtivada ? "Desativar Voz" : "Ativar Voz"}
      >
        {vozAtivada ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
      </button>

    </div>
  );
}
