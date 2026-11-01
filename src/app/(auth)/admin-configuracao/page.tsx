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
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackErro, setFeedbackErro] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreviewErro, setLogoPreviewErro] = useState(false);

  useEffect(() => {
    if (!canManageHospital) return;

    const controller = new AbortController();
    setLoadingHospital(true);
    setErroCarregamento(false);
    fetch(`/api/hospitais/${encodeURIComponent(hospitalId)}`, { signal: controller.signal })
      .then(async response => {
        const current = await response.json();
        if (!response.ok) throw new Error(current.error || 'Não foi possível carregar os dados do hospital.');
        if (!current || typeof current !== 'object') throw new Error('A resposta do hospital é inválida.');
        setNome(current.nome || '');
        setCnpj(current.cnpj || '');
        setEndereco(current.endereco || '');
        setTelefone(current.telefone || '');
        setLogoUrl(current.logo || '');
      })
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setErroCarregamento(true);
          setFeedbackErro(true);
          setFeedback(error.message || 'Erro ao carregar os dados do hospital.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingHospital(false);
      });

    return () => controller.abort();
  }, [canManageHospital, hospitalId]);

  const handleSalvar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (session?.user?.cargo !== 'ADMIN' || !hospitalId) {
      setFeedbackErro(true);
      setFeedback('Apenas o administrador do hospital pode alterar estas configurações.');
      return;
    }
    if (!nome.trim()) {
      setFeedbackErro(true);
      setFeedback('O nome da instituição é obrigatório.');
      return;
    }
    if (!cnpj.trim()) {
      setFeedbackErro(true);
      setFeedback('O CNPJ da instituição é obrigatório.');
      return;
    }

    setSaving(true);
    setFeedback('');
    setFeedbackErro(false);
    try {
      const response = await fetch(`/api/hospitais/${encodeURIComponent(hospitalId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cnpj, endereco, telefone, logoUrl })
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
          ? result.error
          : 'Erro ao salvar configurações.';
        throw new Error(message);
      }
      if (result && typeof result === 'object') {
        if ('nome' in result && typeof result.nome === 'string') setNome(result.nome);
        if ('cnpj' in result && typeof result.cnpj === 'string') setCnpj(result.cnpj);
        if ('endereco' in result) setEndereco(typeof result.endereco === 'string' ? result.endereco : '');
        if ('telefone' in result) setTelefone(typeof result.telefone === 'string' ? result.telefone : '');
        if ('logo' in result) {
          const savedLogo = typeof result.logo === 'string' ? result.logo : '';
          setLogoUrl(savedLogo);
          setLogoPreviewErro(false);
        }
      }
      setFeedbackErro(false);
      setFeedback('Configurações salvas com sucesso.');
    } catch (error) {
      setFeedbackErro(true);
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
          <p role="alert" className="config-feedback erro">Apenas o administrador do hospital pode alterar estas configurações.</p>
        )}
        {feedback && <p role={feedbackErro ? 'alert' : 'status'} aria-live={feedbackErro ? 'assertive' : 'polite'} className={`config-feedback ${feedbackErro ? 'erro' : 'sucesso'}`}>{feedback}</p>}

        {status === 'loading' || (canManageHospital && loadingHospital) ? <p role="status">Carregando dados da instituição…</p> : canManageHospital && erroCarregamento ? null : canManageHospital && <form className="form-panel" onSubmit={handleSalvar}>
          <h3><Hospital aria-hidden="true" /> Dados Cadastrais</h3>
          
          <div className="form-grid">
            <div className="form-grupo full">
              <label htmlFor="instituicao-nome">Nome da Instituição *</label>
              <input 
                id="instituicao-nome"
                name="nome"
                type="text" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                placeholder="Ex: Saskia Saúde"
                maxLength={160}
                required
              />
            </div>
            
            <div className="form-grupo">
              <label htmlFor="instituicao-cnpj">CNPJ *</label>
              <input 
                id="instituicao-cnpj"
                name="cnpj"
                type="text" 
                inputMode="numeric"
                value={cnpj} 
                onChange={(e) => setCnpj(e.target.value)} 
                placeholder="00.000.000/0001-00"
                maxLength={20}
                required
              />
            </div>

            <div className="form-grupo">
              <label htmlFor="instituicao-telefone">Telefone Principal</label>
              <input 
                id="instituicao-telefone"
                name="telefone"
                type="text" 
                inputMode="tel"
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)} 
                placeholder="(00) 0000-0000"
                maxLength={40}
              />
            </div>

            <div className="form-grupo full">
              <label htmlFor="instituicao-endereco">Endereço Completo</label>
              <input 
                id="instituicao-endereco"
                name="endereco"
                type="text" 
                value={endereco} 
                onChange={(e) => setEndereco(e.target.value)} 
                placeholder="Rua, Número, Bairro, Cidade - UF"
                maxLength={300}
              />
            </div>

            <div className="form-grupo full" style={{ marginTop: '10px' }}>
              <label htmlFor="instituicao-logo">Logotipo (URL da Imagem)</label>
              <input 
                id="instituicao-logo"
                name="logoUrl"
                type="text" 
                value={logoUrl} 
                onChange={(e) => { setLogoUrl(e.target.value); setLogoPreviewErro(false); }}
                placeholder="https://exemplo.com/logo.png"
                maxLength={2048}
              />
              <div className="logo-preview-box">
                {logoUrl && !logoPreviewErro ? (
                  <img src={logoUrl} alt="Prévia do logotipo" referrerPolicy="no-referrer" onError={() => setLogoPreviewErro(true)} />
                ) : logoUrl && logoPreviewErro ? (
                  <p role="status" className="logo-preview-error">Não foi possível carregar a prévia desta imagem.</p>
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
