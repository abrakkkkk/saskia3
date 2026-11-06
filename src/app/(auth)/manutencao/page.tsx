'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, StatGrid, StatCard, Tabs, Panel, Badge, EmptyState, LoadingState } from '@/components/ui'
import { useSession } from 'next-auth/react';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import '@/components/ui/modal.css';
import './manutencao.css';

const ABAS = [{ id: 'nova', label: 'Nova OS', icon: 'las la-plus-circle' }, { id: 'lista', label: 'Lista de OS', icon: 'las la-list' }] as const;

interface Ordem { id: string; equipamento: string; setor: string; tipo: string; prioridade: string; status: string; data: string }

export default function ManutencaoPage() {
  const { data: session, status: statusSessao } = useSession();
  const [tabAtiva, setTabAtiva] = useState('nova');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  
  // Dados
  const [ordens, setOrdens] = useState<Ordem[]>([]);

  // Form State
  const [form, setForm] = useState({
    equipamento: '',
    setor: 'UTI',
    tipo: 'Corretiva',
    prioridade: 'Normal',
    solicitante: '',
    data: '',
    descricao: ''
  });

  const carregarOrdens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manutencao');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Erro ao carregar ordens de manutenção.');
      if (!Array.isArray(data)) throw new Error('Resposta inválida ao carregar ordens de manutenção.');
      setOrdens(data);
      setErroCarga('');
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Erro ao carregar ordens de manutenção.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const agora = new Date();
    const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    void Promise.resolve().then(() => { setForm(prev => ({ ...prev, data: prev.data || hoje })); });
  }, []);

  useEffect(() => {
    if (statusSessao === 'loading') return;
    if (statusSessao !== 'authenticated') {
      void Promise.resolve().then(() => { setLoading(false); });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setErroCarga('Sua sessão expirou. Entre novamente para acessar as ordens.');
      return;
    }
    setForm(prev => ({ ...prev, solicitante: session?.user?.name || session?.user?.email || 'Usuário autenticado' }));
    void carregarOrdens();
  }, [statusSessao, session?.user?.name, session?.user?.email, carregarOrdens]);

  const criarOS = async () => {
    if (!form.equipamento || !form.solicitante) {
      alert("Preencha o equipamento ou local e o solicitante.");
      return;
    }

    try {
      const res = await fetch('/api/manutencao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof resposta?.error === 'string' ? resposta.error : 'Erro ao criar OS');

      setForm(prev => ({ ...prev, equipamento: '', descricao: '' }));
      alert('OS criada com sucesso.');
      setTabAtiva('lista');
      await carregarOrdens();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro inesperado.');
    }
  };

  const concluirOS = async (id: string) => {
    if (!await confirm("Confirmar a conclusão desta OS?")) return;
    
    try {
      const res = await fetch(`/api/manutencao/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Concluída' })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof resposta?.error === 'string' ? resposta.error : 'Erro ao concluir OS');
      
      await carregarOrdens();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro inesperado.');
    }
  };

  // Estatísticas
  const abertas = ordens.filter(o => o.status !== "Concluída").length;
  const concluidas = ordens.filter(o => o.status === "Concluída").length;

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-tools"
        title="Manutenção"
        subtitle="Ordens de serviço preventivas e corretivas de prédio e equipamentos."
        actions={<button type="button" className="btn btn-primary" onClick={() => setTabAtiva('nova')}><i className="las la-plus-circle" aria-hidden="true"></i> Nova OS</button>}
      />

      <StatGrid>
        <StatCard icon="las la-clipboard-list" value={ordens.length} label="Total de OS" />
        <StatCard icon="las la-wrench" value={abertas} label="Em aberto" tone="warning" alerta />
        <StatCard icon="las la-check-circle" value={concluidas} label="Concluídas" tone="success" />
      </StatGrid>

      <Tabs label="Seções de manutenção" tabs={ABAS} active={tabAtiva} onChange={setTabAtiva} />

      {loading && ordens.length === 0 && <LoadingState message="Carregando ordens..." />}
      {erroCarga && <p className="mod-aviso mod-aviso-erro" role="alert">{erroCarga}</p>}

      {tabAtiva === 'nova' && (
        <Panel title="Nova ordem de serviço" icon="las la-tools">
          <div className="ux-campos">
            <div className="form-group">
              <label htmlFor="mnt-equipamento">Equipamento ou local *</label>
              <input id="mnt-equipamento" type="text" maxLength={200} required value={form.equipamento} onChange={e => setForm({...form, equipamento: e.target.value})} placeholder="Ex.: ar-condicionado, elevador, maca" />
            </div>
            <div className="form-group">
              <label htmlFor="mnt-setor">Setor *</label>
              <select id="mnt-setor" value={form.setor} onChange={e => setForm({...form, setor: e.target.value})}>
                <option>UTI</option>
                <option>Centro Cirúrgico</option>
                <option>Emergência</option>
                <option>Enfermaria</option>
                <option>Administração</option>
                <option>Externo</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="mnt-tipo">Tipo *</label>
              <select id="mnt-tipo" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option>Corretiva</option>
                <option>Preventiva</option>
                <option>Preditiva</option>
                <option>Calibração</option>
                <option>Emergencial</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="mnt-prioridade">Prioridade</label>
              <select id="mnt-prioridade" value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}>
                <option>Normal</option>
                <option>Urgente</option>
                <option>Emergência</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="mnt-solicitante">Solicitante</label>
              <input id="mnt-solicitante" type="text" value={form.solicitante} readOnly />
            </div>
            <div className="form-group">
              <label htmlFor="mnt-data">Data</label>
              <input id="mnt-data" type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            </div>
            <div className="form-group ux-largo">
              <label htmlFor="mnt-descricao">Descrição do problema</label>
              <textarea id="mnt-descricao" rows={3} maxLength={2000} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Defeito ou serviço necessário"></textarea>
            </div>
          </div>
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-primary" onClick={criarOS}>
              <i className="las la-save" aria-hidden="true"></i> Criar OS
            </button>
          </div>
        </Panel>
      )}

      {tabAtiva === 'lista' && (
        ordens.length === 0 ? (
          loading ? null : <EmptyState icon="las la-clipboard-list" message="Nenhuma OS registrada." />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <caption className="mnt-sr-only">Ordens de serviço de manutenção</caption>
              <thead>
                <tr><th>OS</th><th>Data</th><th>Equipamento</th><th>Setor</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {ordens.map((o, i) => (
                  <tr key={o.id}>
                    <td><strong>#{String(ordens.length - i).padStart(3, '0')}</strong></td>
                    <td>{new Date(o.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>{o.equipamento}</td>
                    <td>{o.setor}</td>
                    <td>{o.tipo}</td>
                    <td><Badge tone={o.prioridade === 'Emergência' ? 'danger' : o.prioridade === 'Urgente' ? 'warning' : 'info'}>{o.prioridade}</Badge></td>
                    <td><Badge tone={o.status === 'Concluída' ? 'success' : 'warning'}>{o.status}</Badge></td>
                    <td>
                      {o.status !== 'Concluída' && (
                        <button type="button" className="btn btn-success btn-sm" onClick={() => concluirOS(o.id)}>
                          <i aria-hidden="true" className="las la-check"></i> Concluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
