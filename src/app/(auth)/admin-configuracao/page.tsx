'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import { PageHeader, Panel, LoadingState } from '@/components/ui';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import '@/components/ui/modal.css';
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
    void Promise.resolve().then(() => { setLoadingHospital(true); });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
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
        body: JSON.stringify({ nome, cnpj, endereco, telefone })
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

  const [enviandoLogo, setEnviandoLogo] = useState(false);

  const enviarLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setEnviandoLogo(true);
    setFeedback('');
    try {
      const form = new FormData();
      form.append('arquivo', arquivo);
      const response = await fetch('/api/hospital/logo', { method: 'POST', body: form });
      const dados = await response.json().catch(() => null);
      if (!response.ok) throw new Error(dados?.error || 'Não foi possível enviar o logotipo.');
      setLogoUrl(dados.logo);
      setLogoPreviewErro(false);
      setFeedbackErro(false);
      setFeedback('Logotipo atualizado. Ele já sai nas receitas.');
    } catch (error) {
      setFeedbackErro(true);
      setFeedback(error instanceof Error ? error.message : 'Erro ao enviar o logotipo.');
    } finally {
      setEnviandoLogo(false);
    }
  };

  const removerLogo = async () => {
    if (!await confirm('Remover o logotipo do hospital?')) return;
    setEnviandoLogo(true);
    try {
      const response = await fetch('/api/hospital/logo', { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível remover o logotipo.');
      setLogoUrl('');
      setFeedbackErro(false);
      setFeedback('Logotipo removido.');
    } catch (error) {
      setFeedbackErro(true);
      setFeedback(error instanceof Error ? error.message : 'Erro ao remover o logotipo.');
    } finally {
      setEnviandoLogo(false);
    }
  };
  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-building"
        title="Configurações da instituição"
        subtitle="Dados cadastrais, endereço e logotipo."
        actions={<Link href="/admin" className="btn btn-secondary"><ArrowLeft aria-hidden="true" size={18} /> Voltar</Link>}
      />

      <div className="cfg-inst">
        {status !== 'loading' && !canManageHospital && (
          <p role="alert" className="mod-aviso mod-aviso-erro">Apenas o administrador do hospital pode alterar estas configurações.</p>
        )}
        {feedback && <p role={feedbackErro ? 'alert' : 'status'} aria-live={feedbackErro ? 'assertive' : 'polite'} className={`mod-aviso ${feedbackErro ? 'mod-aviso-erro' : 'mod-aviso-sucesso'}`}>{feedback}</p>}

        {status === 'loading' || (canManageHospital && loadingHospital) ? <LoadingState message="Carregando dados da instituição..." /> : canManageHospital && erroCarregamento ? null : canManageHospital && (
          <form onSubmit={handleSalvar}>
            <Panel title="Dados cadastrais" icon="las la-hospital">
              <div className="ux-campos">
                <div className="form-group ux-largo">
                  <label htmlFor="instituicao-nome">Nome da instituição *</label>
                  <input
                    id="instituicao-nome"
                    name="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Saskia Saúde"
                    maxLength={160}
                    required
                  />
                </div>

                <div className="form-group">
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

                <div className="form-group">
                  <label htmlFor="instituicao-telefone">Telefone principal</label>
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

                <div className="form-group ux-largo">
                  <label htmlFor="instituicao-endereco">Endereço completo</label>
                  <input
                    id="instituicao-endereco"
                    name="endereco"
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro, cidade - UF"
                    maxLength={300}
                  />
                </div>

                <div className="form-group ux-largo">
                  <label htmlFor="instituicao-logo">Logotipo (PNG, JPG ou WEBP, até 1 MB)</label>
                  <div className="cfg-logo-previa">
                    {logoUrl.startsWith('/api/hospital/logo') && !logoPreviewErro ? (
                      <>{/* eslint-disable-next-line @next/next/no-img-element -- arquivo do próprio hospital, entregue pela rota autenticada */}
<img src={logoUrl} alt="Prévia do logotipo" onError={() => setLogoPreviewErro(true)} /></>
                    ) : (
                      <>
                        <ImagePlus aria-hidden="true" />
                        <p>{logoUrl && !logoUrl.startsWith('/api/hospital/logo') ? 'O logotipo atual é um link externo e não aparece na receita. Envie o arquivo.' : 'Nenhum logotipo configurado'}</p>
                      </>
                    )}
                  </div>
                  <div className="ux-acoes">
                    <label htmlFor="instituicao-logo" className="btn btn-secondary btn-sm">
                      <ImagePlus aria-hidden="true" size={16} /> {enviandoLogo ? 'Enviando…' : logoUrl ? 'Trocar logotipo' : 'Enviar logotipo'}
                    </label>
                    <input id="instituicao-logo" className="conta-file-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={enviandoLogo} onChange={event => void enviarLogo(event)} />
                    {logoUrl && <button type="button" className="btn btn-secondary btn-sm" disabled={enviandoLogo} onClick={() => void removerLogo()}>Remover</button>}
                  </div>
                </div>
              </div>

              <div className="ui-modal-foot">
                <button type="submit" disabled={saving} className="btn btn-primary">
                  <Save aria-hidden="true" size={18} /> {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </Panel>
          </form>
        )}
      </div>
    </div>
  );
}
