'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Hospital, ImagePlus, Save } from 'lucide-react';
import './configuracao.css';

export default function AdminConfiguracaoPage() {
  const { data: session, status } = useSession();
  const hospitalId = session?.user?.hospitalId ?? '';
  const canManageHospital = status === 'authenticated' && session.user.cargo === 'ADMIN' && Boolean(hospitalId);
  const [loadingHospital, setLoadingHospital] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Form states
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (!canManageHospital) return;

    const controller = new AbortController();
    fetch(`/api/hospitais/${encodeURIComponent(hospitalId)}`, { signal: controller.signal })
      .then(async response => {
        const current = await response.json();
        if (!response.ok) throw new Error(current.error || 'Não foi possível carregar os dados do hospital.');
        setNome(current.nome || '');
        setCnpj(current.cnpj || '');
        setEndereco(current.endereco || '');
        setTelefone(current.telefone || '');
        setLogoUrl(current.logo || '');
      })
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') setFeedback(error.message || 'Erro ao carregar os dados do hospital.');
      })
      .finally(() => setLoadingHospital(false));

    return () => controller.abort();
  }, [canManageHospital, hospitalId]);

  const handleSalvar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (session?.user?.cargo !== 'ADMIN' || !hospitalId) {
      setFeedback('Apenas o administrador do hospital pode alterar estas configurações.');
      return;
    }
    if (!nome.trim()) {
      setFeedback('O nome da instituição é obrigatório.');
      return;
    }

    setSaving(true);
    setFeedback('');
    try {
      const response = await fetch(`/api/hospitais/${encodeURIComponent(hospitalId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cnpj, endereco, telefone, logoUrl })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar configurações.');
      setFeedback('Configurações salvas com sucesso.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="conteudo">
      <div className="config-container">
        <div className="banner-config">
          <div>
            <h1><Building2 aria-hidden="true" /> Configurações da Instituição</h1>
            <p>Gerencie os dados da sua instituição, endereço e identidade visual</p>
          </div>
          <div>
            <Link href="/admin" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>
              <ArrowLeft aria-hidden="true" /> Voltar
            </Link>
          </div>
        </div>

        {status !== 'loading' && !canManageHospital && (
          <p role="alert" className="config-feedback">Apenas o administrador do hospital pode alterar estas configurações.</p>
        )}
        {feedback && <p role="status" aria-live="polite" className="config-feedback">{feedback}</p>}

        {status === 'loading' || (canManageHospital && loadingHospital) ? <p role="status">Carregando dados da instituição…</p> : canManageHospital && <form className="form-panel" onSubmit={handleSalvar}>
          <h3><Hospital aria-hidden="true" /> Dados Cadastrais</h3>
          
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
              <label>CNPJ *</label>
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
                    <ImagePlus aria-hidden="true" />
                    <p>Nenhum logotipo configurado</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-success"
            style={{ width: '100%', marginTop: '30px', justifyContent: 'center', padding: '16px', fontSize: '16px' }}
          >
            <Save aria-hidden="true" /> {saving ? 'Salvando…' : 'Salvar Configurações'}
          </button>
        </form>}
      </div>
    </div>
  );
}
