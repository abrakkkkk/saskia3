'use client';

import { useState } from 'react';

export default function CurvasCrescimentoPage() {
  const [idade, setIdade] = useState('2'); // Anos
  const [peso, setPeso] = useState('12.5'); // Kg
  const [altura, setAltura] = useState('85'); // cm

  const imc = (parseFloat(peso) / Math.pow(parseFloat(altura) / 100, 2)).toFixed(1);

  // Dados mockados para a curva baseados na idade 2 anos
  const mediaPeso = 12.2;
  const mediaAltura = 86.4;
  
  const difPeso = parseFloat(peso) - mediaPeso;
  const difAltura = parseFloat(altura) - mediaAltura;

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-baby"></i> Curvas de Crescimento Pediátrico</h2>
          <p>Acompanhamento de Percentil (Peso, Altura e IMC) da OMS</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Formulário de Input */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Dados da Criança</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Paciente</label>
              <input type="text" className="input-field" defaultValue="Enzo Gabriel (Registro #4421)" disabled style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Idade (Anos)</label>
                <input type="number" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={idade} onChange={(e) => setIdade(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Peso Atual (Kg)</label>
                <input type="number" step="0.1" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={peso} onChange={(e) => setPeso(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Estatura Atual (cm)</label>
              <input type="number" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={altura} onChange={(e) => setAltura(e.target.value)} />
            </div>

            <button className="btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }}>
              <i className="las la-calculator"></i> Atualizar Curva
            </button>
          </div>

          <div style={{ marginTop: '30px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>IMC CALCULADO</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6' }}>{imc}</div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '5px', fontWeight: 600 }}>Padrão Eutrófico (Normal)</div>
          </div>
        </div>

        {/* Gráficos de Percentil em CSS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Gráfico de Peso */}
          <div className="card">
            <h3 style={{ marginBottom: '20px', fontSize: '16px', color: '#1e293b' }}>Peso x Idade (z-score)</h3>
            
            <div style={{ position: 'relative', height: '120px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', width: '100%', left: 0, height: '1px', background: '#cbd5e1', top: '50%' }}></div>
              <div style={{ position: 'absolute', width: '100%', left: 0, height: '1px', background: '#e2e8f0', top: '25%', borderTop: '1px dashed #cbd5e1' }}></div>
              <div style={{ position: 'absolute', width: '100%', left: 0, height: '1px', background: '#e2e8f0', top: '75%', borderTop: '1px dashed #cbd5e1' }}></div>
              
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Linha da Média */}
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: '12px', height: '12px', background: '#94a3b8', borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}></div>
                <div style={{ position: 'absolute', left: '50%', top: '35%', fontSize: '11px', color: '#94a3b8', transform: 'translateX(-50%)' }}>Média ({mediaPeso}kg)</div>
                
                {/* Ponto do Paciente */}
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: `calc(50% - ${difPeso * 10}px)`, 
                  width: '16px', 
                  height: '16px', 
                  background: '#3b82f6', 
                  border: '3px solid white',
                  borderRadius: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  zIndex: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></div>
                <div style={{ 
                  position: 'absolute', 
                  left: '55%', 
                  top: `calc(50% - ${difPeso * 10}px - 20px)`, 
                  fontSize: '13px', 
                  fontWeight: 700,
                  color: '#3b82f6', 
                }}>Enzo ({peso}kg)</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
              O peso atual está {difPeso > 0 ? 'acima' : 'abaixo'} da média para a idade em {Math.abs(difPeso).toFixed(1)}kg.
            </div>
          </div>

          {/* Gráfico de Altura */}
          <div className="card">
            <h3 style={{ marginBottom: '20px', fontSize: '16px', color: '#1e293b' }}>Estatura x Idade (z-score)</h3>
            
            <div style={{ position: 'relative', height: '120px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', width: '100%', left: 0, height: '1px', background: '#cbd5e1', top: '50%' }}></div>
              <div style={{ position: 'absolute', width: '100%', left: 0, height: '1px', background: '#e2e8f0', top: '25%', borderTop: '1px dashed #cbd5e1' }}></div>
              <div style={{ position: 'absolute', width: '100%', left: 0, height: '1px', background: '#e2e8f0', top: '75%', borderTop: '1px dashed #cbd5e1' }}></div>
              
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Linha da Média */}
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: '12px', height: '12px', background: '#94a3b8', borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}></div>
                <div style={{ position: 'absolute', left: '50%', top: '35%', fontSize: '11px', color: '#94a3b8', transform: 'translateX(-50%)' }}>Média ({mediaAltura}cm)</div>
                
                {/* Ponto do Paciente */}
                <div style={{ 
                  position: 'absolute', 
                  left: '50%', 
                  top: `calc(50% - ${difAltura * 3}px)`, 
                  width: '16px', 
                  height: '16px', 
                  background: '#10b981', 
                  border: '3px solid white',
                  borderRadius: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  zIndex: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></div>
                <div style={{ 
                  position: 'absolute', 
                  left: '55%', 
                  top: `calc(50% - ${difAltura * 3}px - 20px)`, 
                  fontSize: '13px', 
                  fontWeight: 700,
                  color: '#10b981', 
                }}>Enzo ({altura}cm)</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
              A estatura atual está {difAltura > 0 ? 'acima' : 'abaixo'} da média para a idade em {Math.abs(difAltura).toFixed(1)}cm.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
