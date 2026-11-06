'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PageHeader, Panel, LoadingState } from '@/components/ui';
import { CARGO_LABEL, type Cargo } from '@/lib/permissions';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import '@/components/ui/modal.css';
import './conta.css';



type Perfil = { nome?: string; email?: string; cargo?: string; avatar?: string | null; hospital?: { nome?: string } };

export default function ContaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [dadosBanco, setDadosBanco] = useState<Perfil | null>(null);
  const [fotoSrc, setFotoSrc] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/'); return; }
    if (status === 'authenticated') {
      const controller = new AbortController();
      void Promise.resolve().then(() => { setIsLoadingProfile(true); });
      fetch('/api/me', { signal: controller.signal })
        .then(async response => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error || 'Não foi possível carregar os dados da conta.');
          return data;
        })
        .then(data => {
          setDadosBanco(data);
          setNome(data.nome || '');
          setFotoSrc(data.avatar || null);
          setErro('');
        })
        .catch(error => {
          if (!(error instanceof Error && error.name === 'AbortError')) {
            setErro(error instanceof Error ? error.message : 'Não foi possível carregar os dados da conta.');
          }
        })
        .finally(() => { if (!controller.signal.aborted) setIsLoadingProfile(false); });
      return () => controller.abort();
    }
  }, [status, router]);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setErro('Selecione uma imagem PNG, JPEG, WebP ou GIF.');
      e.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      setErro('A imagem deve ter no máximo 1 MB.');
      e.target.value = '';
      return;
    }
    setErro('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setFotoSrc(ev.target.result);
    };
    reader.onerror = () => setErro('Não foi possível ler a imagem selecionada.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSucesso('');
    setErro('');

    if (novaSenha || confirmarSenha) {
      if (!senhaAtual) { setErro('Informe a senha atual para alterá-la.'); return; }
      if (novaSenha !== confirmarSenha) { setErro('A nova senha e a confirmação não coincidem.'); return; }
      if (novaSenha.length < 12) { setErro('A nova senha deve ter pelo menos 12 caracteres.'); return; }
    }

    setIsSaving(true);
    try {
      const body: Record<string, unknown> = { nome, avatar: fotoSrc };
      if (novaSenha) { body.senhaAtual = senhaAtual; body.novaSenha = novaSenha; }

      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setDadosBanco(data);
        setNome(data.nome);
        if (data.avatar) setFotoSrc(data.avatar);
        setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
        setSucesso('Dados atualizados.');
        setTimeout(() => setSucesso(''), 3000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const d = await res.json();
        setErro(d.error || 'Erro ao salvar. Tente novamente.');
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="mod-pagina">
        <PageHeader icon="las la-user-circle" title="Minha conta" />
        <LoadingState message="Carregando sua conta..." />
      </div>
    );
  }

  const cargo = dadosBanco?.cargo || session?.user?.cargo || '';

  return (
    <div className="mod-pagina conta-page">
      <PageHeader icon="las la-user-circle" title="Minha conta" subtitle="Seus dados, foto e senha." />

      {sucesso && <div className="mod-aviso mod-aviso-sucesso" role="status" aria-live="polite">{sucesso}</div>}
      {erro && <div className="mod-aviso mod-aviso-erro" role="alert">{erro}</div>}

      <Panel>
        <div className="conta-perfil">
          <div className="conta-foto">
            {fotoSrc
              ? <>{/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização de data URL escolhida pelo usuário */}
<img src={fotoSrc} alt="Foto de perfil" /></>
              : <div className="conta-placeholder" aria-hidden="true"><i className="las la-user-md"></i></div>
            }
            <label htmlFor="uploadFoto" className="btn btn-secondary btn-sm">
              <i className="las la-camera" aria-hidden="true"></i> Trocar foto
            </label>
            <input id="uploadFoto" className="conta-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFoto} />
          </div>

          <div className="conta-info">
            <h2>{dadosBanco?.nome || session?.user?.name || 'Usuário'}</h2>
            <p><i className="las la-envelope" aria-hidden="true"></i> {dadosBanco?.email || session?.user?.email || '-'}</p>
            <p><i className="las la-briefcase" aria-hidden="true"></i> {CARGO_LABEL[cargo as Cargo] || cargo || 'Profissional'}</p>
            {dadosBanco?.hospital?.nome && (
              <p><i className="las la-hospital" aria-hidden="true"></i> {dadosBanco.hospital.nome}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ux-campos">
            <div className="form-group">
              <label htmlFor="conta-nome">Nome completo</label>
              <input
                id="conta-nome"
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome completo"
                maxLength={160}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="conta-email">E-mail (não editável)</label>
              <input
                id="conta-email"
                type="email"
                value={dadosBanco?.email || session?.user?.email || ''}
                disabled
              />
            </div>
          </div>

          <h3 className="conta-subtitulo"><i className="las la-lock" aria-hidden="true"></i> Alterar senha</h3>

          <div className="ux-campos">
            <div className="form-group">
              <label htmlFor="conta-nova-senha">Nova senha</label>
              <input
                id="conta-nova-senha"
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo de 12 caracteres" minLength={12} maxLength={72}
              />
            </div>
            <div className="form-group">
              <label htmlFor="conta-confirmar-senha">Confirmar nova senha</label>
              <input
                id="conta-confirmar-senha"
                type="password"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <div className="form-group ux-largo">
              <label htmlFor="conta-senha-atual">Senha atual (obrigatória para alterar a senha)</label>
              <input
                id="conta-senha-atual"
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
          </div>

          <div className="ui-modal-foot">
            <button type="submit" className="btn btn-primary" disabled={isSaving || isLoadingProfile || !dadosBanco}>
              <i className={`las ${isSaving ? 'la-spinner la-spin' : 'la-save'}`} aria-hidden="true"></i>
              {isSaving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
