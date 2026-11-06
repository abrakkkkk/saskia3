'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { pode } from '@/lib/permissions';
import { STATUS_ESPERA } from '@/lib/utils';
import { Volume2, VolumeX, Bell, Clock, DoorOpen, ActivitySquare, Timer } from 'lucide-react';
import './painel-chamadas.css';

interface Paciente {
  id: string;
  status: string;
  classificacao: string | null;
  esperaDesde: string;
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

/** Minutos em texto legível de longe: "12 min", "1h 20min". Sem dado, traço. */
function formatarEspera(minutos: number | null | undefined) {
  if (minutos === null || minutos === undefined) return '--';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export default function PainelChamadasTV() {
  const { data: session, status: sessionStatus } = useSession();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [erroCarga, setErroCarga] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [horaAtual, setHoraAtual] = useState<Date | null>(null);
  const mounted = horaAtual !== null;
  const podeLerChamadas = pode(session?.user?.cargo, 'chamada:ler');
  const [emergencias, setEmergencias] = useState<{ id: string; tipo: string; local: string | null }[]>([]);
  const emergenciasVistasRef = useRef<Set<string> | null>(null);
  
  // Áudio Controls
  const [audioPermitido, setAudioPermitido] = useState(false);
  const [vozAtivada, setVozAtivada] = useState(true);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ultimaChamadaIdRef = useRef<string>('');
  const chamadasInicializadasRef = useRef(false);
  const fetchSequenceRef = useRef(0);

  useEffect(() => {
    const tick = () => setHoraAtual(new Date());
    const primeiro = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => { clearTimeout(primeiro); clearInterval(timer); };
  }, []);

  useEffect(() => {
    const permitirAudio = () => {
      if (!audioPermitido) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  // Alertas de pânico e PCR: faixa grande e voz assim que aparecem.
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let ativo = true;
    const buscar = async () => {
      try {
        const r = await fetch('/api/emergencias', { cache: 'no-store' });
        if (!r.ok || !ativo) return;
        const lista: { id: string; tipo: string; local: string | null }[] = await r.json();
        setEmergencias(lista);
        if (emergenciasVistasRef.current === null) { emergenciasVistasRef.current = new Set(lista.map(a => a.id)); return; }
        const conhecidos = emergenciasVistasRef.current;
        const novos = lista.filter(a => !conhecidos.has(a.id));
        novos.forEach(a => conhecidos.add(a.id));
        if (novos.length > 0 && audioPermitido && vozAtivada) {
          const a = novos[0];
          const texto = a.tipo === 'PCR'
            ? `Atenção. Parada cardiorrespiratória. ${a.local ?? ''}`
            : `Atenção. Emergência. Botão do pânico acionado. ${a.local ?? ''}`;
          const fala = new SpeechSynthesisUtterance(texto);
          fala.lang = 'pt-BR';
          fala.rate = 0.9;
          window.speechSynthesis.speak(fala);
        }
      } catch {
        // Sem rede neste ciclo: tenta de novo no próximo.
      }
    };
    void buscar();
    const t = setInterval(() => void buscar(), 3000);
    return () => { ativo = false; clearInterval(t); };
  }, [sessionStatus, audioPermitido, vozAtivada]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated' || !session?.user || !pode(session.user.cargo, 'chamada:ler')) {
      fetchSequenceRef.current++;
      chamadasInicializadasRef.current = false;
      ultimaChamadaIdRef.current = '';
      return;
    }
    chamadasInicializadasRef.current = false;
    ultimaChamadaIdRef.current = '';
    const sequencia = fetchSequenceRef;
    const primeiro = setTimeout(() => void fetchDados(), 0);
    const interval = setInterval(() => void fetchDados(), 3000);
    const handleStorage = () => void fetchDados();
    window.addEventListener('storage', handleStorage);
    return () => {
      sequencia.current++;
      clearTimeout(primeiro);
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
    // tocarBeep e falarMensagem só leem audioPermitido e vozAtivada, já listados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamadas, audioPermitido, vozAtivada]);

  // LÓGICA DE FILA
  const pacientesAtivos = pacientes.filter(p => !["Finalizado", "Alta Médica", "Evasão", "Transferido", "Óbito"].includes(p.status));
  const filaComChamadas: PacienteFila[] = pacientesAtivos.map(p => {
    const chamada = chamadas.find(c => c.pacienteId === p.id);
    const dataRef = p.esperaDesde || new Date().toISOString();
    const tempoEsperaMin = Math.floor((new Date().getTime() - new Date(dataRef).getTime()) / 60000);
    return { ...p, foiChamado: !!chamada, dadosChamada: chamada, tempoEsperaMin };
  });

  // ESTATÍSTICAS
  const qtdAguardando = filaComChamadas.filter(p => p.status === "Aguardando Triagem" || p.status === "Recepção").length;
  const qtdAtendimento = filaComChamadas.filter(p => p.status.includes("Atendimento") || p.status === "Em Triagem").length;
  const qtdEmergencia = filaComChamadas.filter(p => ["Vermelho", "Laranja"].includes(p.classificacao || "")).length;

  const temposMedios: Record<string, number | null> = { "Vermelho": null, "Laranja": null, "Amarelo": null, "Verde": null, "Azul": null };
  const temposCalc: Record<string, number[]> = { "Vermelho": [], "Laranja": [], "Amarelo": [], "Verde": [], "Azul": [] };
  
  // Só quem ainda espera atendimento entra na média (internado ou em consulta não conta como espera).
  filaComChamadas.forEach(p => {
    if (p.classificacao && temposCalc[p.classificacao] && STATUS_ESPERA.includes(p.status)) {
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
  if (!podeLerChamadas) {
    return <main className="min-h-screen bg-slate-900 text-slate-100 grid place-items-center p-6 sm:p-8 text-center"><p role="alert" className="max-w-xl rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 leading-relaxed">Seu cargo não tem acesso ao painel de chamadas.</p></main>;
  }

  const faixas = [
    { cor: 'Vermelho', ponto: 'bg-red-600' },
    { cor: 'Laranja', ponto: 'bg-orange-500' },
    { cor: 'Amarelo', ponto: 'bg-yellow-400' },
    { cor: 'Verde', ponto: 'bg-green-500' },
    { cor: 'Azul', ponto: 'bg-blue-500' },
  ];

  return (
    <div className="painel-tv min-h-screen bg-slate-900 text-slate-100 flex flex-col overflow-x-hidden overflow-y-auto lg:h-screen lg:overflow-hidden">

      {emergencias.length > 0 && (
        <div role="alert" aria-live="assertive" className="shrink-0">
          {emergencias.map(e => (
            <div key={e.id} className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 xl:px-12 py-4 xl:py-6 ${e.tipo === 'PCR' ? 'bg-amber-500 text-slate-950' : 'bg-red-700 text-white'}`}>
              <span className="text-3xl xl:text-5xl font-extrabold tracking-tight">{e.tipo === 'PCR' ? 'Alerta de PCR' : 'Botão do pânico'}</span>
              <span className="text-2xl xl:text-4xl font-bold">{e.local ?? 'Local não informado'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cabeçalho */}
      <header className="min-h-20 h-auto lg:h-24 bg-slate-950 border-b border-slate-700 px-4 sm:px-6 lg:px-10 py-4 lg:py-0 flex flex-wrap items-center justify-between gap-x-5 gap-y-4 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <ActivitySquare aria-hidden="true" className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 text-blue-400" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">Saskia <span className="text-blue-300 font-normal">Painel</span></h1>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 lg:gap-8 w-full sm:w-auto">
          {!audioPermitido && (
            <div className="bg-red-950 text-red-100 px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 border border-red-700 text-sm sm:text-base xl:text-xl font-medium">
              <VolumeX aria-hidden="true" className="w-5 h-5 shrink-0" /> Áudio inativo. Toque na tela para ativar.
            </div>
          )}
          <div className="text-right">
            <div className="painel-hora text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-none">
              {mounted ? horaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </div>
            <div className="painel-data text-blue-200 text-sm sm:text-base lg:text-lg xl:text-2xl font-medium mt-1">
              {mounted ? horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : '---'}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo: chamada atual à esquerda, histórico à direita */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row bg-slate-800 relative">
        {erroCarga && <div role="alert" className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-2xl rounded-xl border border-red-700 bg-red-950 px-4 sm:px-5 py-3 text-base sm:text-lg leading-relaxed text-red-100 shadow-xl">{erroCarga}</div>}
        {carregando && <div role="status" className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-fit max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-600 bg-slate-800 px-4 sm:px-5 py-3 text-base sm:text-lg text-slate-100 shadow-lg">Carregando chamadas…</div>}

        {/* Chamada atual */}
        <div className="flex-none lg:flex-[3] min-h-[52vh] lg:min-h-0 bg-slate-900 p-5 sm:p-8 xl:p-12 flex flex-col text-center border-b lg:border-b-0 lg:border-r border-slate-700 relative z-10">
          {chamadaAtual ? (
            <div className="w-full h-full min-h-[44vh] flex flex-col items-center justify-center gap-10 xl:gap-20">
              <div className="flex flex-col items-center justify-center w-full">
                <Bell aria-hidden="true" className="w-12 h-12 sm:w-16 sm:h-16 xl:w-20 xl:h-20 text-blue-400 mb-5 sm:mb-6" />
                <p className="text-xl sm:text-2xl xl:text-3xl font-semibold text-slate-200 mb-3 sm:mb-4">Paciente</p>
                <h2 className="text-4xl sm:text-5xl xl:text-7xl leading-tight font-extrabold text-white tracking-tight break-words w-full px-2 sm:px-8">
                  {chamadaAtual.pacienteNome}
                </h2>
              </div>

              <div className="bg-blue-700 rounded-2xl w-full max-w-2xl p-5 sm:p-6 flex flex-col items-center shrink-0 text-center">
                <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-white mb-2">Dirija-se para</p>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                  <DoorOpen aria-hidden="true" className="w-9 h-9 sm:w-12 sm:h-12 text-white shrink-0" />
                  <span className="text-3xl sm:text-4xl xl:text-5xl leading-tight font-extrabold text-white break-words max-w-full">
                    {chamadaAtual.consultorio}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-300 flex flex-col items-center justify-center min-h-[44vh]">
              <ActivitySquare aria-hidden="true" className="w-24 h-24 sm:w-32 sm:h-32 xl:w-40 xl:h-40 mb-5 sm:mb-8 text-slate-500" />
              <p className="text-3xl sm:text-4xl xl:text-5xl font-semibold">Aguardando chamadas</p>
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="flex-none lg:flex-[2] min-h-[38vh] lg:min-h-0 flex flex-col p-5 sm:p-6 xl:p-8">
          <h2 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-slate-100 mb-5 sm:mb-6 xl:mb-8 border-b border-slate-600 pb-3 sm:pb-4">
            Últimas chamadas
          </h2>

          <div className="flex-1 flex flex-col gap-3 sm:gap-4 xl:gap-5 justify-start overflow-y-auto overscroll-contain pb-16">
            {ultimasChamadasHistorico.length === 0 ? (
              <div className="text-slate-300 text-center py-12 sm:py-16 xl:py-20 text-lg sm:text-xl xl:text-2xl font-semibold">Nenhum histórico recente.</div>
            ) : (
              ultimasChamadasHistorico.map((c, i) => (
                <div key={i} className="bg-slate-900 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 border border-slate-700">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold text-white truncate leading-tight">{c.pacienteNome}</h3>
                    <span className="text-base xl:text-xl text-slate-300 font-medium mt-1 flex items-center gap-2">
                      <Clock aria-hidden="true" className="w-4 h-4 text-blue-300" />
                      Chamado às {new Date(c.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                  <div className="shrink-0 flex flex-col items-end pl-3 sm:pl-4 border-l border-slate-700 max-w-[45%]">
                    <span className="text-sm xl:text-xl font-semibold text-slate-300 mb-1">Local</span>
                    <span className="text-lg sm:text-xl xl:text-2xl font-bold text-blue-200 text-right break-words line-clamp-2">
                      {c.consultorio}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Rodapé: contadores e tempo médio por classificação */}
      <footer className="h-auto min-h-32 bg-slate-950 px-4 sm:px-6 xl:px-12 py-5 lg:py-0 pb-20 lg:pb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-5 lg:gap-0 shrink-0 border-t border-slate-700 z-20 w-full">

        <div className="w-full lg:flex-1 grid grid-cols-3 items-center justify-around lg:border-r border-slate-700 lg:pr-8 xl:pr-12 h-auto lg:h-full py-0 lg:py-6 gap-2">
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-300 text-sm sm:text-base xl:text-2xl font-semibold mb-1 text-center">Aguardando</span>
            <span className="painel-hora text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-none">{qtdAguardando}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-300 text-sm sm:text-base xl:text-2xl font-semibold mb-1 text-center">Atendimento</span>
            <span className="painel-hora text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-none">{qtdAtendimento}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-slate-300 text-sm sm:text-base xl:text-2xl font-semibold mb-1 text-center">Emergência</span>
            <span className="painel-hora text-4xl sm:text-5xl xl:text-6xl font-bold text-red-300 leading-none">{qtdEmergencia}</span>
          </div>
        </div>

        <div className="w-full lg:flex-[1.5] lg:pl-8 xl:pl-12 h-auto lg:h-full py-0 lg:py-6 flex flex-col justify-center">
          <span className="text-slate-200 text-sm sm:text-base xl:text-2xl font-semibold mb-3 flex items-center justify-center gap-2 text-center">
            <Timer aria-hidden="true" className="w-5 h-5 text-slate-300 shrink-0" /> Tempo médio de espera
          </span>
          <div className="flex flex-wrap items-center justify-center sm:justify-around gap-x-5 gap-y-3 w-full">
            {faixas.map(f => (
              <div key={f.cor} className="flex items-center gap-2">
                <div aria-hidden="true" className={`w-4 h-4 rounded-full ${f.ponto}`}></div>
                <span className="text-sm sm:text-base xl:text-2xl font-semibold text-slate-200">{f.cor}</span>
                <span className="painel-hora text-xl sm:text-3xl xl:text-4xl font-bold text-slate-100">{formatarEspera(temposMedios[f.cor])}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>

      {/* Voz dos anúncios */}
      <button
        type="button"
        onClick={() => setVozAtivada(!vozAtivada)}
        aria-label={vozAtivada ? "Desativar anúncios por voz" : "Ativar anúncios por voz"}
        aria-pressed={vozAtivada}
        className="fixed bottom-4 right-4 lg:bottom-56 lg:right-6 w-12 h-12 bg-slate-800 text-slate-200 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 transition-colors z-50 border border-slate-600"
        title={vozAtivada ? "Desativar voz" : "Ativar voz"}
      >
        {vozAtivada ? <Volume2 aria-hidden="true" className="w-5 h-5" /> : <VolumeX aria-hidden="true" className="w-5 h-5 text-red-300" />}
      </button>

    </div>
  );
}
