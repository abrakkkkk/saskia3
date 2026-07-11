'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Volume2, VolumeX, Bell, Clock, DoorOpen, ActivitySquare, Users, AlertCircle, CheckCircle2, UserCheck, Timer } from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  status: string;
  classificacao: string | null;
  dataCadastro: string | null;
}

interface Chamada {
  cpf: string;
  nome: string;
  status: string;
  consultorio: string;
  horarioChamada: string;
  dataChamada: string;
}

interface PacienteFila extends Paciente {
  foiChamado: boolean;
  dadosChamada?: Chamada;
  tempoEsperaMin: number;
}

export default function PainelChamadasTV() {
  const { data: session } = useSession();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [chamadasStorage, setChamadasStorage] = useState<Chamada[]>([]);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  
  // Áudio Controls
  const [audioPermitido, setAudioPermitido] = useState(false);
  const [vozAtivada, setVozAtivada] = useState(true);
  
  const audioCtxRef = useRef<any>(null);
  const ultimaChamadaIdRef = useRef<string>('');
  
  const getHospitalId = () => {
    const u = localStorage.getItem('usuarioLogado');
    const usuario = session?.user || (u ? JSON.parse(u) : null);
    return usuario?.hospitalId || 'hospital_001';
  };

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

  const fetchDados = () => {
    const hid = getHospitalId();
    try {
      const p = JSON.parse(localStorage.getItem(`${hid}_pacientes`) || '[]');
      setPacientes(p);
      
      const chamadasRaw = localStorage.getItem(`${hid}_chamadasPainel`);
      if (chamadasRaw) {
        setChamadasStorage(JSON.parse(chamadasRaw));
      }
    } catch (e) {
      console.error("Erro ao buscar dados", e);
    }
  };

  useEffect(() => {
    fetchDados(); 
    const interval = setInterval(fetchDados, 3000); 
    const handleStorage = () => fetchDados();
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [session]);

  useEffect(() => {
    if (chamadasStorage.length > 0) {
      const ultima = chamadasStorage[chamadasStorage.length - 1];
      const chamadaId = ultima.dataChamada + '_' + ultima.nome;
      
      if (chamadaId !== ultimaChamadaIdRef.current) {
        ultimaChamadaIdRef.current = chamadaId;
        tocarBeep();
        falarMensagem(ultima.nome, ultima.consultorio);
      }
    }
  }, [chamadasStorage, audioPermitido, vozAtivada]);

  // LÓGICA DE FILA
  const pacientesAtivos = pacientes.filter(p => !["Finalizado", "Alta Médica", "Evasão", "Transferido", "Óbito"].includes(p.status));
  const filaComChamadas: PacienteFila[] = pacientesAtivos.map(p => {
    const chamada = chamadasStorage.find(c => (c.cpf && c.cpf === p.cpf) || (!c.cpf && c.nome === p.nome));
    const dataRef = p.dataCadastro || new Date().toISOString();
    const tempoEsperaMin = Math.floor((new Date().getTime() - new Date(dataRef).getTime()) / 60000);
    return { ...p, foiChamado: !!chamada, dadosChamada: chamada, tempoEsperaMin };
  });

  // ESTATÍSTICAS
  const qtdAguardando = filaComChamadas.filter(p => p.status === "Aguardando Triagem" || p.status === "Recepção").length;
  const qtdChamados = filaComChamadas.filter(p => p.foiChamado).length;
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

  const chamadasReversas = [...chamadasStorage].reverse();
  const chamadaAtual = chamadasReversas.length > 0 ? chamadasReversas[0] : null;
  const ultimasChamadasHistorico = chamadaAtual ? chamadasReversas.slice(1, 6) : [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* HEADER: ESTILO SGA (Simples, direto e institucional) */}
      <header className="h-24 bg-slate-950 border-b-4 border-blue-600 px-10 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <ActivitySquare className="w-10 h-10 text-blue-500" />
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Saskia <span className="text-blue-500 font-light">Painel</span></h1>
        </div>
        
        <div className="flex items-center gap-8">
          {!audioPermitido && (
            <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 border border-red-500/50">
              <VolumeX className="w-5 h-5" /> Áudio inativo
            </div>
          )}
          <div className="text-right">
            <div className="text-5xl font-black text-white tracking-tighter leading-none">
              {mounted ? horaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </div>
            <div className="text-blue-400 text-sm font-bold uppercase tracking-widest mt-1">
              {mounted ? horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : '---'}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT: SPLIT SCREEN CLASSIC */}
      <main className="flex-1 flex bg-slate-800">
        
        {/* ESQUERDA: CHAMADA ATUAL (MUITO DESTAQUE) */}
        <div className="flex-[3] bg-slate-900 p-12 flex flex-col text-center border-r border-slate-700 shadow-[20px_0_30px_rgba(0,0,0,0.3)] relative z-10">
          {chamadaAtual ? (
            <div className="w-full h-full flex flex-col items-center justify-between py-10 animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center justify-center flex-1 w-full">
                <Bell className="w-20 h-20 text-blue-500 mb-6" />
                <p className="text-2xl font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Paciente</p>
                <h2 className="text-5xl xl:text-6xl leading-tight font-black text-white tracking-tight drop-shadow-lg break-words w-full px-8">
                  {chamadaAtual.nome}
                </h2>
              </div>
              
              <div className="bg-blue-600 rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl border-b-8 border-blue-800 flex flex-col items-center shrink-0">
                <p className="text-xl font-bold text-blue-200 uppercase tracking-[0.3em] mb-3">Dirija-se Para</p>
                <div className="flex items-center gap-4">
                  <DoorOpen className="w-16 h-16 text-white" />
                  <span className="text-5xl leading-none font-black text-white uppercase drop-shadow-md">
                    {chamadaAtual.consultorio}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-600 flex flex-col items-center">
              <ActivitySquare className="w-40 h-40 mb-8 opacity-20" />
              <p className="text-4xl font-bold uppercase tracking-widest">Aguardando Chamadas</p>
            </div>
          )}
        </div>

        {/* DIREITA: HISTÓRICO DE CHAMADAS */}
        <div className="flex-[2] flex flex-col p-8">
          <h3 className="text-3xl font-black text-slate-300 mb-8 uppercase tracking-widest border-b-2 border-slate-700 pb-4">
            Últimas Chamadas
          </h3>

          <div className="flex-1 flex flex-col gap-6 justify-start overflow-hidden">
            {ultimasChamadasHistorico.length === 0 ? (
              <div className="text-slate-500 text-center py-20 text-xl font-bold">Nenhum histórico recente.</div>
            ) : (
              ultimasChamadasHistorico.map((c, i) => (
                <div key={i} className="bg-slate-800/80 rounded-2xl p-6 flex items-center justify-between border-l-[6px] border-slate-600 shadow-md">
                  <div className="flex-1 min-w-0 pr-6">
                    <h4 className="text-2xl font-bold text-white truncate leading-tight">{c.nome}</h4>
                    <span className="text-base text-slate-400 font-semibold mt-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Chamado às {c.horarioChamada}
                    </span>
                  </div>
                  <div className="shrink-0 flex flex-col items-end pl-8 border-l border-slate-700">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Local</span>
                    <span className="text-3xl font-black text-blue-400 uppercase tracking-tight">
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
      <footer className="h-32 bg-slate-950 px-12 flex items-center shrink-0 border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 w-full">
        
        {/* Contadores */}
        <div className="flex-1 flex items-center justify-around border-r border-slate-800 pr-12 h-full py-6">
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Aguardando</span>
            <span className="text-4xl font-black text-white leading-none">{qtdAguardando}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Atendimento</span>
            <span className="text-4xl font-black text-white leading-none">{qtdAtendimento}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Emergência</span>
            <span className="text-4xl font-black text-red-400 leading-none">{qtdEmergencia}</span>
          </div>
        </div>

        {/* Tempos Médios */}
        <div className="flex-[1.5] pl-12 h-full py-6 flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
            <Timer className="w-4 h-4 text-slate-400" /> Tempo Médio de Espera (Minutos)
          </span>
          <div className="flex items-center justify-around w-full">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.6)]"></div>
              <span className="text-2xl font-bold text-slate-200">{temposMedios["Vermelho"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]"></div>
              <span className="text-2xl font-bold text-slate-200">{temposMedios["Laranja"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>
              <span className="text-2xl font-bold text-slate-200">{temposMedios["Amarelo"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
              <span className="text-2xl font-bold text-slate-200">{temposMedios["Verde"] ?? '--'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
              <span className="text-2xl font-bold text-slate-200">{temposMedios["Azul"] ?? '--'}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Audio toggle */}
      <button 
        onClick={() => setVozAtivada(!vozAtivada)} 
        className="fixed bottom-36 right-6 w-12 h-12 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all z-50 border border-slate-700 shadow-md"
        title={vozAtivada ? "Desativar Voz" : "Ativar Voz"}
      >
        {vozAtivada ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
      </button>

    </div>
  );
}
