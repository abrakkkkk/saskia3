'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export interface ChamadaData {
  nome: string;
  cpf: string;
  consultorio: string;
  status: string;
}

interface CallContextType {
  chamadaAtiva: ChamadaData | null;
  chamarPaciente: (dados: ChamadaData) => void;
  fecharChamada: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const [chamadaAtiva, setChamadaAtiva] = useState<ChamadaData | null>(null);
  const { data: session } = useSession();

  const chamarPaciente = (dados: ChamadaData) => {
    setChamadaAtiva(dados);
    
    // Save to localStorage for painel-chamadas.html to pick up
    try {
      const hid = (() => {
        try {
          const u = localStorage.getItem('usuarioLogado');
          const usuario = session?.user || (u ? JSON.parse(u) : null);
          return usuario?.hospitalId || 'hospital_001';
        } catch(e) { return 'hospital_001'; }
      })();
      let chamadas = JSON.parse(localStorage.getItem(`${hid}_chamadasPainel`) || "[]");
      chamadas = chamadas.filter((c: any) => {
        if (c.cpf && dados.cpf) return c.cpf !== dados.cpf;
        if (c.nome && dados.nome) return c.nome !== dados.nome;
        return true;
      });
      const novaChamada = { 
        cpf: dados.cpf, 
        nome: dados.nome, 
        status: dados.status, 
        consultorio: dados.consultorio, 
        horarioChamada: new Date().toLocaleTimeString('pt-BR'), 
        dataChamada: new Date().toISOString() 
      };
      chamadas.push(novaChamada);
      localStorage.setItem(`${hid}_chamadasPainel`, JSON.stringify(chamadas));
      
      // Also trigger a storage event locally if possible (sometimes useful)
      window.dispatchEvent(new Event('storage'));
    } catch(e) {
      console.error("Erro ao salvar no localStorage", e);
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
