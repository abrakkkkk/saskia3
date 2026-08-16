'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import './configuracao.css';

interface Hospital {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  logoUrl?: string;
  ativo?: boolean;
}

export default function AdminConfiguracaoPage() {
  const [hospitalId, setHospitalId] = useState('hosp_matriz');
  const [hospital, setHospital] = useState<Hospital | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    try {
      const u = JSON.stringify(getSessionUser());
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hosp_matriz';
      setHospitalId(hid);

      fetch(`/api/hospitais/${hid}`)
        .then(r => r.json())
        .then(current => {
          if (current && !current.error) {
            setHospital({ ...current, logoUrl: current.logo });
            setNome(current.nome || '');
            setCnpj(current.cnpj || '');
            setEndereco(current.endereco || '');
            setTelefone(current.telefone || '');
            setLogoUrl(current.logo || '');
          }
        })
        .catch(console.error);
    } catch(e) {}
  }, []);

  const handleSalvar = async () => {
    if(!nome.trim()) {
      alert("O nome da instituição é obrigatório!");
      return;
    }

    try {
      const response = await fetch(`/api/hospitais/${hospitalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cnpj, endereco, telefone, logoUrl })
      });

      if (response.ok) {
        alert("✅ Configurações salvas com sucesso!");
      } else {
        alert("Erro ao salvar configurações.");
      }
    } catch(e) {
      alert("Erro ao salvar configurações.");
    }
  };

  return (
    <div className="conteudo">
      <div className="config-container">
        <div className="banner-config">
          <div>
            <h1><i className="las la-building"></i> Configurações da Instituição</h1>
            <p>Gerencie os dados da sua instituição, endereço e identidade visual</p>
          </div>
          <div>
            <Link href="/admin" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>
              <i className="las la-arrow-left"></i> Voltar
            </Link>
          </div>
        </div>

        <div className="form-panel">
          <h3><i className="las la-hospital-alt"></i> Dados Cadastrais</h3>
          
          <div className="form-grid">
            <div className="form-grupo full">
              <label>Nome da Instituição *</label>
              <input 
                type="text" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                placeholder="Ex: Saskia Saúde"
              />
            </div>
            
            <div className="form-grupo">
              <label>CNPJ</label>
              <input 
                type="text" 
                value={cnpj} 
                onChange={(e) => setCnpj(e.target.value)} 
                placeholder="00.000.000/0001-00"
              />
            </div>

            <div className="form-grupo">
              <label>Telefone Principal</label>
              <input 
                type="text" 
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)} 
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="form-grupo full">
              <label>Endereço Completo</label>
              <input 
                type="text" 
                value={endereco} 
                onChange={(e) => setEndereco(e.target.value)} 
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>

            <div className="form-grupo full" style={{ marginTop: '10px' }}>
              <label>Logotipo (URL da Imagem)</label>
              <input 
                type="text" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
                placeholder="https://exemplo.com/logo.png"
              />
              <div className="logo-preview-box">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" onError={(e) => { e.currentTarget.style.display='none'; }} />
                ) : (
                  <>
                    <i className="las la-image"></i>
                    <p>Nenhum logotipo configurado</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <button 
            className="btn btn-success" 
            onClick={handleSalvar} 
            style={{ width: '100%', marginTop: '30px', justifyContent: 'center', padding: '16px', fontSize: '16px' }}
          >
            <i className="las la-save"></i> Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
