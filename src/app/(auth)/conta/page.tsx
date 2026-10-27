'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import './conta.css';

const CARGOS_MAP: Record<string, string> = {
  DIRETOR_GERAL: 'Diretor Geral (CEO)',
  DIRETOR_ADMIN: 'Diretor Administrativo',
  DIRETOR_TECNICO: 'Diretor Técnico/Clínico',
  DIRETOR_ENFERMAGEM: 'Diretor de Enfermagem',
  CHEFE_DEPARTAMENTO: 'Chefe de Departamento',
  COORDENADOR_UNIDADE: 'Coordenador de Unidade',
  ENFERMEIRO_SUPERVISOR: 'Enfermeiro Supervisor',
  MEDICO_ESPECIALISTA: 'Médico Especialista',
  MEDICO_PLANTONISTA: 'Médico Plantonista',
  ENFERMEIRO_ASSISTENCIAL: 'Enfermeiro Assistencial',
  TECNICO_ENFERMAGEM: 'Técnico de Enfermagem',
  RECEPCIONISTA: 'Recepcionista',
};

export default function ContaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [dadosBanco, setDadosBanco] = useState<any>(null);
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
      setIsLoadingProfile(true);
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
      if (novaSenha !== confirmarSenha) { setErro('Nova senha e confirmação não coincidem!'); return; }
      if (novaSenha.length < 4) { setErro('A nova senha deve ter pelo menos 4 caracteres!'); return; }
    }

    setIsSaving(true);
    try {
      const body: any = { nome, avatar: fotoSrc };
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
        setSucesso('Dados atualizados com sucesso!');
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: 16, color: '#64748b' }}>
        <i className="las la-spinner la-spin" style={{ fontSize: 40, color: '#1e3a8a' }}></i>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Carregando sua conta...</span>
      </div>
    );
  }

  const cargo = dadosBanco?.cargo || (session?.user as any)?.cargo || '';

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h2><i className="las la-user-circle"></i> Minha Conta</h2>
      </div>

      {sucesso && (
        <div className="alert-sucesso">
          <i className="las la-check-circle"></i> {sucesso}
        </div>
      )}
      {erro && (
        <div className="alert-erro">
          <i className="las la-exclamation-triangle"></i> {erro}
        </div>
      )}

      <div className="card-conta">
        {/* PERFIL HEADER */}
        <div className="perfil-header">
          <div className="foto-perfil">
            {fotoSrc
              ? <img src={fotoSrc} alt="Foto de perfil" />
              : <div className="placeholder-foto"><i className="las la-user-md"></i></div>
            }
            <label htmlFor="uploadFoto" className="btn-salvar-conta" style={{ background: '#64748b', padding: '8px 14px', fontSize: 13, marginTop: 12, cursor: 'pointer' }}>
              <i className="las la-camera"></i> Trocar Foto
            </label>
            <input id="uploadFoto" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFoto} />
          </div>

          <div className="info-perfil">
            <h2>
              <i className="las la-user-circle"></i>
              {dadosBanco?.nome || session?.user?.name || 'Usuário'}
            </h2>
            <p><i className="las la-envelope"></i> {dadosBanco?.email || session?.user?.email || '-'}</p>
            <p><i className="las la-briefcase"></i> {CARGOS_MAP[cargo] || cargo || 'Profissional'}</p>
            {dadosBanco?.hospital?.nome && (
              <p><i className="las la-hospital"></i> {dadosBanco.hospital.nome}</p>
            )}
          </div>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit}>
          <div className="form-grupo">
            <label htmlFor="conta-nome"><i className="las la-user"></i> Nome completo</label>
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

          <div className="form-grupo">
            <label htmlFor="conta-email" style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
              <i className="las la-envelope"></i> E-mail
              <span style={{ marginLeft: 8, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, color: '#64748b' }}>Não editável</span>
            </label>
            <input
              id="conta-email"
              type="email"
              value={dadosBanco?.email || session?.user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed', background: '#f8fafc' }}
            />
          </div>

          <hr style={{ margin: '24px 0', borderColor: '#e2e8f0' }} />

          <h3 style={{ color: '#0a1f44', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
            <i className="las la-lock"></i> Alterar Senha
          </h3>

          <div className="form-linha">
            <div className="form-grupo">
              <label htmlFor="conta-nova-senha">Nova Senha</label>
              <input
                id="conta-nova-senha"
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="form-grupo">
              <label htmlFor="conta-confirmar-senha">Confirmar Nova Senha</label>
              <input
                id="conta-confirmar-senha"
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>

          <div className="form-grupo">
            <label htmlFor="conta-senha-atual">
              Senha Atual{' '}
              <span style={{ color: '#dc2626', fontWeight: 400, fontSize: 12 }}>
                (obrigatória para alterar a senha)
              </span>
            </label>
            <input
              id="conta-senha-atual"
              type="password"
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
              placeholder="Digite sua senha atual"
            />
          </div>

          <button type="submit" className="btn-salvar-conta" disabled={isSaving || isLoadingProfile}>
            <i className={`las ${isSaving ? 'la-spinner la-spin' : 'la-save'}`}></i>
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}
