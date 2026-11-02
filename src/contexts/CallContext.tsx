'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface ChamadaData {
  pacienteId: string;
  nome: string;
  consultorio: string;
  status: string;
}

export type ResultadoChamada = { ok: true } | { ok: false; erro: string };

interface CallContextType {
  chamadaAtiva: ChamadaData | null;
  chamarPaciente: (dados: ChamadaData) => Promise<ResultadoChamada>;
  fecharChamada: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

function tocarSino() {
  try {
    const Contexto = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    const ctx = new Contexto();
    const beep = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };
    beep(880, 0, 0.2);
    beep(1100, 0.25, 0.2);
    beep(880, 0.5, 0.2);
    beep(1100, 0.75, 0.2);
  } catch {
    // Som é reforço: a chamada já foi registrada.
  }
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [chamadaAtiva, setChamadaAtiva] = useState<ChamadaData | null>(null);

  // Sino e confirmação só depois que o servidor aceitou a chamada.
  const chamarPaciente = useCallback(async (dados: ChamadaData): Promise<ResultadoChamada> => {
    try {
      const res = await fetch('/api/chamadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacienteId: dados.pacienteId, consultorio: dados.consultorio }),
      });
      if (!res.ok) {
        const corpo: unknown = await res.json().catch(() => null);
        const erro = corpo && typeof corpo === 'object' && 'error' in corpo && typeof corpo.error === 'string'
          ? corpo.error
          : 'Não foi possível registrar a chamada.';
        return { ok: false, erro };
      }
    } catch {
      return { ok: false, erro: 'Falha de conexão: a chamada não foi registrada.' };
    }
    setChamadaAtiva(dados);
    window.dispatchEvent(new Event('storage'));
    tocarSino();
    return { ok: true };
  }, []);

  const fecharChamada = useCallback(() => setChamadaAtiva(null), []);

  const valor = useMemo(() => ({ chamadaAtiva, chamarPaciente, fecharChamada }), [chamadaAtiva, chamarPaciente, fecharChamada]);

  return <CallContext.Provider value={valor}>{children}</CallContext.Provider>;
}

export function useCallSystem() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallSystem must be used within a CallProvider');
  }
  return context;
}
