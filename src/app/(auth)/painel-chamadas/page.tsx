'use client';

import { useState, useEffect } from 'react';

interface Chamada {
  id: string;
  pacienteNome: string;
  cpf: string | null;
  consultorio: string;
  status: string;
  createdAt: string;
}

export default function PainelChamadasPage() {
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [ultimaChamada, setUltimaChamada] = useState<Chamada | null>(null);

  const fetchChamadas = () => {
    fetch('/api/chamadas')
      .then(res => res.json())
      .then((data: Chamada[]) => {
        setChamadas(data);
        if (data.length > 0) {
          // Verifica se a última chamada mudou para piscar a tela ou emitir som (simulado)
          const novaUltima = data[0];
          if (!ultimaChamada || ultimaChamada.id !== novaUltima.id) {
            setUltimaChamada(novaUltima);
            // Aqui normalmente chamaria um new Audio('/ding.mp3').play()
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchChamadas();
    // Polling a cada 5 segundos
    const interval = setInterval(fetchChamadas, 5000);
    return () => clearInterval(interval);
  }, [ultimaChamada]);

  // Design ultra-clean de TV
  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: '20px', background: '#0f172a', padding: '20px', borderRadius: '16px', color: 'white' }}>
      
      {/* Esquerda: Última Chamada (Destaque Principal) */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '16px', border: '2px solid #334155', padding: '40px', textAlign: 'center' }}>
        {ultimaChamada ? (
          <div className="chamada-destaque" style={{ animation: 'pulse 2s infinite' }}>
            <div style={{ fontSize: '24px', color: '#94a3b8', textTransform: 'uppercase', tracking: 'widest', marginBottom: '10px' }}>Por favor, dirija-se à</div>
            <div style={{ fontSize: '80px', fontWeight: 900, color: '#38bdf8', lineHeight: '1', marginBottom: '40px' }}>
              {ultimaChamada.consultorio}
            </div>
            
            <div style={{ fontSize: '24px', color: '#94a3b8', textTransform: 'uppercase', tracking: 'widest', marginBottom: '10px' }}>Paciente</div>
            <div style={{ fontSize: '64px', fontWeight: 800, color: 'white', lineHeight: '1.1' }}>
              {ultimaChamada.pacienteNome}
            </div>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: '32px' }}>Aguardando próxima chamada...</div>
        )}
      </div>

      {/* Direita: Histórico */}
      <div style={{ flex: 1, background: '#1e293b', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '24px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '20px', textAlign: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
          Últimas Chamadas
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
          {chamadas.slice(1, 6).map((chamada, idx) => (
            <div key={chamada.id} style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '5px' }}>{chamada.pacienteNome}</div>
              <div style={{ fontSize: '18px', color: '#38bdf8' }}>{chamada.consultorio}</div>
            </div>
          ))}
          
          {chamadas.length <= 1 && (
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>Nenhuma chamada anterior</div>
          )}
        </div>
      </div>
    </div>
  );
}
