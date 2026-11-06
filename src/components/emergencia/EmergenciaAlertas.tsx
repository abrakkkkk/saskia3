'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { pode } from '@/lib/permissions';
import './emergencia.css';

type Alerta = { id: string; tipo: string; local: string | null; profissional: string; createdAt: string };

const TITULO: Record<string, string> = { PANICO: 'Botão do pânico', PCR: 'Alerta de PCR' };
const ICONE: Record<string, string> = { PANICO: 'las la-exclamation-triangle', PCR: 'las la-heartbeat' };

function sirene() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tom = (freq: number, inicio: number) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      ganho.gain.setValueAtTime(0.18, ctx.currentTime + inicio);
      ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + 0.35);
      osc.connect(ganho);
      ganho.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.35);
    };
    [0, 0.45, 0.9, 1.35, 1.8, 2.25].forEach((t, i) => tom(i % 2 ? 1000 : 700, t));
  } catch {
    // O som é reforço: o alerta já está visível e gravado.
  }
}

/** Faixa de alerta no topo de todas as telas logadas. Aparece para qualquer cargo, inclusive Administrador. */
export default function EmergenciaAlertas({ cargo }: { cargo: string }) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [erro, setErro] = useState('');
  const vistos = useRef<Set<string> | null>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const podeEncerrar = pode(cargo, 'emergencia:encerrar');

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/emergencias', { cache: 'no-store' });
      if (!r.ok) return;
      const lista: Alerta[] = await r.json();
      setAlertas(lista);
      if (vistos.current === null) { vistos.current = new Set(lista.map(a => a.id)); return; }
      const conhecidos = vistos.current;
      const novos = lista.filter(a => !conhecidos.has(a.id));
      novos.forEach(a => conhecidos.add(a.id));
      if (novos.length > 0) sirene();
    } catch {
      // Sem rede neste ciclo: tenta de novo no próximo.
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(carregar);
    const intervalo = window.setInterval(() => { if (document.visibilityState === 'visible') void carregar(); }, 5000);
    const aoAtualizar = () => void carregar();
    window.addEventListener('emergencia:atualizar', aoAtualizar);
    return () => { window.clearInterval(intervalo); window.removeEventListener('emergencia:atualizar', aoAtualizar); };
  }, [carregar]);

  // Empurra a página para baixo na altura da faixa, para ela não cobrir o cabeçalho.
  useEffect(() => {
    const altura = alertas.length > 0 && faixa.current ? faixa.current.offsetHeight : 0;
    document.body.style.paddingTop = altura ? `${altura}px` : '';
    return () => { document.body.style.paddingTop = ''; };
  }, [alertas]);

  async function encerrar(a: Alerta) {
    if (!await confirm(`Encerrar o alerta de ${TITULO[a.tipo] ?? 'emergência'} em ${a.local ?? 'local não informado'}? Ele sai do painel de TV e de todas as telas.`)) return;
    const r = await fetch(`/api/emergencias/${a.id}`, { method: 'PATCH' });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setErro(d?.error ?? 'Não foi possível encerrar o alerta.');
      return;
    }
    setErro('');
    void carregar();
  }

  if (alertas.length === 0) return null;

  return (
    <div ref={faixa} className="emergencia-faixa" role="alert" aria-live="assertive">
      {alertas.map(a => (
        <div key={a.id} className={`emergencia-item emergencia-${a.tipo.toLowerCase()}`}>
          <i className={ICONE[a.tipo] ?? 'las la-bell'} aria-hidden="true"></i>
          <strong className="emergencia-titulo">{TITULO[a.tipo] ?? 'Emergência'}</strong>
          <span className="emergencia-local">{a.local ?? 'Local não informado'}</span>
          <span className="emergencia-meta">
            Acionado por {a.profissional} às {new Date(a.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {podeEncerrar && <button type="button" className="btn btn-sm btn-secondary" onClick={() => void encerrar(a)}>Encerrar alerta</button>}
        </div>
      ))}
      {erro && <p role="alert" className="emergencia-meta" style={{ background: '#450a0a', color: '#fff', padding: '8px 16px', margin: 0 }}>{erro}</p>}
    </div>
  );
}
