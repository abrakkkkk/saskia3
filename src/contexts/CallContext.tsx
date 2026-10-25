'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ChamadaData {
  pacienteId?: string;
  nome: string;
  cpf: string;
  consultorio: string;
  status: string;
}

interface CallContextType {
  chamadaAtiva: ChamadaData | null;
  chamarPaciente: (dados: ChamadaData) => Promise<void>;
  fecharChamada: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const [chamadaAtiva, setChamadaAtiva] = useState<ChamadaData | null>(null);

  const chamarPaciente = async (dados: ChamadaData) => {
    setChamadaAtiva(dados);
    
    try {
      await fetch('/api/chamadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: dados.pacienteId,
          pacienteNome: dados.nome,
          cpf: dados.cpf,
          consultorio: dados.consultorio
        })
      });
      // Optionally trigger local storage event for instant feedback on the same browser if needed
      window.dispatchEvent(new Event('storage'));
    } catch(e) {
      console.error("Erro ao registrar chamada na API", e);
    }
    
    // Tocar sino (SASKIA_T1 logic)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
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
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const fecharChamada = () => {
    setChamadaAtiva(null);
  };

  return (
    <CallContext.Provider value={{ chamadaAtiva, chamarPaciente, fecharChamada }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCallSystem() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallSystem must be used within a CallProvider');
  }
  return context;
}
