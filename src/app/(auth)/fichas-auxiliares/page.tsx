'use client';

import { useState } from 'react';

export default function FichasAuxiliaresPage() {
  const [escala, setEscala] = useState<'braden' | 'morse' | 'nenhuma'>('nenhuma');
  
  // Estado para Escala de Braden (Risco de Lesão por Pressão)
  const [bradenPercepcao, setBradenPercepcao] = useState(4);
  const [bradenUmidade, setBradenUmidade] = useState(4);
  const [bradenAtividade, setBradenAtividade] = useState(4);
  const [bradenMobilidade, setBradenMobilidade] = useState(4);
  const [bradenNutricao, setBradenNutricao] = useState(4);
  const [bradenFriccao, setBradenFriccao] = useState(3); // Fricção vai de 1 a 3

  const scoreBraden = bradenPercepcao + bradenUmidade + bradenAtividade + bradenMobilidade + bradenNutricao + bradenFriccao;
  
  const getBradenRisco = (score: number) => {
    if (score <= 9) return { texto: 'Risco Altíssimo', cor: '#ef4444' };
    if (score <= 12) return { texto: 'Risco Alto', cor: '#f97316' };
    if (score <= 14) return { texto: 'Risco Moderado', cor: '#f59e0b' };
    if (score <= 18) return { texto: 'Risco Baixo', cor: '#84cc16' };
    return { texto: 'Sem Risco', cor: '#10b981' };
  };

  const riscoAtual = getBradenRisco(scoreBraden);

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-clipboard-list"></i> Fichas e Protocolos Auxiliares</h2>
          <p>Escalas clínicas internacionais e checklists de enfermagem</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* Menu Lateral de Protocolos */}
        <div className="card" style={{ flex: 1, padding: 0, alignSelf: 'start', overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#1e293b' }}>
            Protocolos Disponíveis
          </div>
          
          <div 
            onClick={() => setEscala('braden')}
            style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: escala === 'braden' ? '#eff6ff' : 'white', borderLeft: escala === 'braden' ? '4px solid #3b82f6' : '4px solid transparent', transition: 'all 0.2s' }}
          >
            <div style={{ fontWeight: 600, color: '#334155' }}>Escala de Braden</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Risco de Lesão por Pressão</div>
          </div>
          
          <div 
            onClick={() => setEscala('morse')}
            style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: escala === 'morse' ? '#eff6ff' : 'white', borderLeft: escala === 'morse' ? '4px solid #3b82f6' : '4px solid transparent', transition: 'all 0.2s' }}
          >
            <div style={{ fontWeight: 600, color: '#334155' }}>Escala de Morse</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Avaliação de Risco de Quedas</div>
          </div>

          <div style={{ padding: '15px 20px', cursor: 'not-allowed', opacity: 0.6, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 600, color: '#334155' }}>Escala de Glasgow <span className="status-badge bg-gray-200 text-gray-500" style={{ fontSize: '10px' }}>Em breve</span></div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Nível de Consciência</div>
          </div>
        </div>

        {/* Workspace Central */}
        <div className="card" style={{ flex: 3 }}>
          {escala === 'nenhuma' && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <i className="las la-file-medical" style={{ fontSize: '64px', marginBottom: '15px', color: '#cbd5e1' }}></i>
              <h3>Selecione um protocolo</h3>
              <p>Escolha uma ficha auxiliar no menu à esquerda para preenchimento.</p>
            </div>
          )}

          {escala === 'morse' && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <i className="las la-tools" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
              <p>Escala Morse em desenvolvimento.</p>
            </div>
          )}

          {escala === 'braden' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <h3 style={{ fontSize: '20px', color: '#1e293b' }}>Escala de Braden</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>Selecione as condições atuais do paciente para gerar o Score.</p>
                </div>
                <div style={{ textAlign: 'right', background: '#f8fafc', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>SCORE TOTAL</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: riscoAtual.cor, lineHeight: '1' }}>{scoreBraden}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: riscoAtual.cor, marginTop: '5px' }}>{riscoAtual.texto}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Percepção */}
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>1. Percepção Sensorial</div>
                  <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={bradenPercepcao} onChange={(e) => setBradenPercepcao(Number(e.target.value))}>
                    <option value="1">1 - Totalmente Limitado</option>
                    <option value="2">2 - Muito Limitado</option>
                    <option value="3">3 - Levemente Limitado</option>
                    <option value="4">4 - Nenhuma Limitação</option>
                  </select>
                </div>

                {/* Umidade */}
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>2. Umidade</div>
                  <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={bradenUmidade} onChange={(e) => setBradenUmidade(Number(e.target.value))}>
                    <option value="1">1 - Completamente Molhado</option>
                    <option value="2">2 - Muito Molhado</option>
                    <option value="3">3 - Ocasionalmente Molhado</option>
                    <option value="4">4 - Raramente Molhado</option>
                  </select>
                </div>

                {/* Atividade */}
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>3. Atividade</div>
                  <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={bradenAtividade} onChange={(e) => setBradenAtividade(Number(e.target.value))}>
                    <option value="1">1 - Acamado</option>
                    <option value="2">2 - Confinado à Cadeira</option>
                    <option value="3">3 - Caminha Ocasionalmente</option>
                    <option value="4">4 - Caminha Frequentemente</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button className="btn btn-primary" style={{ padding: '12px 24px', background: '#3b82f6' }}>
                    <i className="las la-save"></i> Salvar Avaliação no Prontuário
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
