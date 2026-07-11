'use client';
import { getSessionUser } from '@/lib/session';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './relatorios.css';

interface RelatorioData {
  totalPacientes: number;
  atendimentos: number;
  internacoes: number;
  altas: number;
  obitos: number;
  taxaUTI: string;
  tmp: string;
  dispensacoes: number;
  itensAlmox: number;
  cirurgias: number;
  exames: number;
  transfusoes: number;
  iras: number;
  taxaIRAS: string;
  hm: string;
  cssd: number;
  ouvidoria: number;
}

export default function RelatoriosPage() {
  const { data: session } = useSession();
  
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  
  const [data, setData] = useState<RelatorioData>({
    totalPacientes: 0, atendimentos: 0, internacoes: 0, altas: 0, obitos: 0,
    taxaUTI: '0%', tmp: '-', dispensacoes: 0, itensAlmox: 0, cirurgias: 0,
    exames: 0, transfusoes: 0, iras: 0, taxaIRAS: '0%', hm: '0%', cssd: 0, ouvidoria: 0
  });

  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    setInicio(primeiroDia.toISOString().split('T')[0]);
    setFim(hoje.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (inicio && fim) {
      gerarRelatorios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim]);

  const gerarRelatorios = async () => {
    try {
      const u = JSON.stringify(getSessionUser());
      const usuario = session?.user || (u ? JSON.parse(u) : null);
      const hid = usuario?.hospitalId || 'hospital_001';

      let url = `/api/relatorios/geral?hospitalId=${hid}`;
      if (inicio && fim) {
        url += `&inicio=${inicio}&fim=${fim}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      } else {
        console.error("Erro ao buscar relatórios");
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="conteudo">
      <div className="rel-container">
        
        <div className="banner-rel">
          <h1><i className="las la-chart-bar"></i> Relatórios Gerenciais Avançados</h1>
          <p>Indicadores hospitalares, taxas e estatísticas em tempo real</p>
        </div>

        <div className="form-row">
          <div className="form-grupo">
            <label>Data Início</label>
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
          </div>
          <div className="form-grupo">
            <label>Data Fim</label>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)} />
          </div>
          
          <button className="btn-atualizar" onClick={gerarRelatorios}>
            <i className="las la-sync-alt"></i> Atualizar Dados
          </button>
          <button className="btn-imprimir" onClick={handlePrint}>
            <i className="las la-print"></i> Imprimir Relatório
          </button>
        </div>

        <div className="rel-grid">
          
          <div className="rel-card">
            <h3><i className="las la-users"></i> Indicadores de Pacientes</h3>
            <div className="rel-item">
              <span className="rel-label">Total de Pacientes (Cadastros)</span>
              <span className="rel-valor">{data.totalPacientes}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Atendimentos no Período</span>
              <span className="rel-valor">{data.atendimentos}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Internações Ativas</span>
              <span className="rel-valor" style={{ color: '#ea580c' }}>{data.internacoes}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Altas Médicas</span>
              <span className="rel-valor" style={{ color: '#16a34a' }}>{data.altas}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Óbitos</span>
              <span className="rel-valor" style={{ color: '#dc2626' }}>{data.obitos}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Taxa de Ocupação (UTI)</span>
              <span className="rel-valor">{data.taxaUTI}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Média de Permanência (dias)</span>
              <span className="rel-valor">{data.tmp}</span>
            </div>
          </div>

          <div className="rel-card">
            <h3><i className="las la-capsules"></i> Farmácia & Apoio Clínico</h3>
            <div className="rel-item">
              <span className="rel-label">Medicamentos Dispensados</span>
              <span className="rel-valor">{data.dispensacoes}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Tipos de Itens (Almoxarifado)</span>
              <span className="rel-valor">{data.itensAlmox}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Cirurgias Realizadas</span>
              <span className="rel-valor">{data.cirurgias}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Exames Solicitados</span>
              <span className="rel-valor">{data.exames}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Transfusões de Sangue</span>
              <span className="rel-valor" style={{ color: '#dc2626' }}>{data.transfusoes}</span>
            </div>
          </div>

          <div className="rel-card">
            <h3><i className="las la-shield-virus"></i> CCIH & Qualidade</h3>
            <div className="rel-item">
              <span className="rel-label">IRAS Notificadas</span>
              <span className="rel-valor" style={{ color: '#dc2626' }}>{data.iras}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Taxa de Infecção Hospitalar</span>
              <span className="rel-valor">{data.taxaIRAS}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Adesão à Higiene de Mãos</span>
              <span className="rel-valor" style={{ color: '#16a34a' }}>{data.hm}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Lotes Esterilizados (CSSD)</span>
              <span className="rel-valor">{data.cssd}</span>
            </div>
            <div className="rel-item">
              <span className="rel-label">Manifestações na Ouvidoria</span>
              <span className="rel-valor" style={{ color: '#f59e0b' }}>{data.ouvidoria}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
