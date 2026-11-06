'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, StatGrid, StatCard, Tabs, Panel, Badge, EmptyState, LoadingState } from '@/components/ui';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import '@/components/ui/modal.css';

interface Transporte {
  id: string;
  paciente: string;
  origem: string;
  destino: string;
  tipo: string;
  solicitante: string;
  data: string;
  status: string;
}

const ABAS = [{ id: 'solicitar', label: 'Solicitar', icon: 'las la-plus-circle' }, { id: 'lista', label: 'Lista', icon: 'las la-list' }] as const;

export default function TransportePage() {
  const { data: session, status: statusSessao } = useSession();
  const [activeTab, setActiveTab] = useState<'solicitar'|'lista'>('solicitar');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [pacientes, setPacientes] = useState<{ id: string; nome: string }[]>([]);

  // Form State
  const [transpPaciente, setTranspPaciente] = useState('');
  const [transpOrigem, setTranspOrigem] = useState('Enfermaria');
  const [transpDestino, setTranspDestino] = useState('Centro de Imagem');
  const [transpTipo, setTranspTipo] = useState('Interno (Cadeira de Rodas)');
  const [transpData, setTranspData] = useState('');

  const dataHoraLocal = (data: Date) => {
    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const resT = await fetch('/api/transporte');
      if (!resT.ok) throw new Error((await resT.json().catch(() => null))?.error || 'Não foi possível carregar os transportes.');
      const dadosTransporte: unknown = await resT.json();
      if (!Array.isArray(dadosTransporte)) throw new Error('Resposta inválida ao carregar transportes.');
      setTransportes(dadosTransporte);
      
      const resP = await fetch('/api/pacientes');
      if (!resP.ok) throw new Error((await resP.json().catch(() => null))?.error || 'Não foi possível carregar pacientes.');
      const dadosPacientes: unknown = await resP.json();
      if (!Array.isArray(dadosPacientes)) throw new Error('Resposta inválida ao carregar pacientes.');
      setPacientes(dadosPacientes);
      setErroCarga('');
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Erro ao carregar a página.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (statusSessao === 'loading') return;
    if (statusSessao !== 'authenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setTransportes([]);
      setPacientes([]);
      setLoading(false);
      return;
    }
    void carregarDados();
    setTranspData(dataHoraLocal(new Date()));
  }, [statusSessao]);

  const solicitarTransporte = async () => {
    if (isSaving) return;
    if (!transpPaciente) {
      alert("Selecione o paciente.");
      return;
    }

    const payload = {
      pacienteId: transpPaciente,
      origem: transpOrigem,
      destino: transpDestino,
      tipo: transpTipo,
      data: transpData || dataHoraLocal(new Date()),
      status: "Pendente"
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/transporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || 'Erro ao solicitar transporte');
      
      setErroCarga('');
      alert('Transporte solicitado.');
      setActiveTab('lista');
      await carregarDados();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally {
      setIsSaving(false);
    }
  };

  const concluirTransporte = async (id: string) => {
    if(await confirm("Deseja marcar este transporte como Concluído?")) {
      try {
        const res = await fetch(`/api/transporte/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Concluído' })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Erro ao concluir transporte');
        await carregarDados();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro inesperado.');
      }
    }
  };

  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  const statTotal = transportes.filter(t => t.data.startsWith(hojeStr)).length;
  const statPendentes = transportes.filter(t => t.status === "Pendente").length;

  if (loading && transportes.length === 0) return <div className="mod-pagina"><PageHeader icon="las la-ambulance" title="Transporte" /><LoadingState message="Carregando..." /></div>;

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-ambulance"
        title="Transporte de pacientes"
        subtitle="Remoções internas e externas."
        actions={<button type="button" className="btn btn-primary" onClick={() => setActiveTab('solicitar')}><i className="las la-plus-circle" aria-hidden="true"></i> Nova solicitação</button>}
      />

      {erroCarga && <p role="alert" className="mod-aviso mod-aviso-erro">{erroCarga}</p>}

      <StatGrid>
        <StatCard icon="las la-calendar-day" value={statTotal} label="Solicitações hoje" />
        <StatCard icon="las la-hourglass-half" value={statPendentes} label="Pendentes" tone="warning" alerta />
      </StatGrid>

      <Tabs label="Seções de transporte" tabs={ABAS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'solicitar' && (
        <Panel title="Solicitar transporte" icon="las la-ambulance">
          <div className="ux-campos">
            <div className="form-group">
              <label htmlFor="transporte-paciente">Paciente *</label>
              <select id="transporte-paciente" value={transpPaciente} onChange={e => setTranspPaciente(e.target.value)}>
                <option value="">Selecione...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transporte-origem">Origem *</label>
              <select id="transporte-origem" value={transpOrigem} onChange={e => setTranspOrigem(e.target.value)}>
                <option>Enfermaria</option>
                <option>UTI</option>
                <option>Emergência</option>
                <option>Centro Cirúrgico</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transporte-destino">Destino *</label>
              <select id="transporte-destino" value={transpDestino} onChange={e => setTranspDestino(e.target.value)}>
                <option>Centro de Imagem</option>
                <option>Laboratório</option>
                <option>UTI</option>
                <option>Enfermaria</option>
                <option>Alta/Hospitalar</option>
                <option>Transferência Externa</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transporte-tipo">Tipo *</label>
              <select id="transporte-tipo" value={transpTipo} onChange={e => setTranspTipo(e.target.value)}>
                <option>Interno (Cadeira de Rodas)</option>
                <option>Interno (Maca)</option>
                <option>Externo (Ambulância)</option>
                <option>UTI Móvel</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transporte-solicitante">Solicitante</label>
              <input id="transporte-solicitante" type="text" value={session?.user?.name || session?.user?.email || ''} readOnly />
            </div>
            <div className="form-group">
              <label htmlFor="transporte-data">Data e hora</label>
              <input id="transporte-data" type="datetime-local" value={transpData} onChange={e => setTranspData(e.target.value)} />
            </div>
          </div>
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-primary" onClick={solicitarTransporte} disabled={isSaving || statusSessao !== 'authenticated'}>
              <i className="las la-save" aria-hidden="true"></i> {isSaving ? 'Enviando…' : 'Solicitar transporte'}
            </button>
          </div>
        </Panel>
      )}

      {activeTab === 'lista' && (
        transportes.length === 0 ? (
          <EmptyState icon="las la-ambulance" message="Nenhuma solicitação." />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Paciente</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transportes.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.data).toLocaleString('pt-BR')}</td>
                    <td><strong>{t.paciente}</strong></td>
                    <td>{t.origem}</td>
                    <td>{t.destino}</td>
                    <td>{t.tipo}</td>
                    <td><Badge tone={t.status === 'Concluído' ? 'success' : 'warning'}>{t.status}</Badge></td>
                    <td>
                      {t.status === 'Pendente' && (
                        <button type="button" className="btn btn-xs btn-success" onClick={() => concluirTransporte(t.id)}>
                          <i className="las la-check" aria-hidden="true"></i> Concluir
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
