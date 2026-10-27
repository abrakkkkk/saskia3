'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './transporte.css';

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

export default function TransportePage() {
  const { data: session, status: statusSessao } = useSession();
  const [activeTab, setActiveTab] = useState<'solicitar'|'lista'>('solicitar');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);

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
      setTransportes([]);
      setPacientes([]);
      setLoading(false);
      return;
    }
    void carregarDados();
    setTranspData(dataHoraLocal(new Date()));
  }, [statusSessao]);

  const solicitarTransporte = async () => {
    if (!transpPaciente) {
      alert(" Selecione o paciente!");
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

    try {
      const res = await fetch('/api/transporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || 'Erro ao solicitar transporte');
      
      setErroCarga('');
      alert(" Transporte solicitado!");
      setActiveTab('lista');
      await carregarDados();
    } catch (error: any) {
      alert(error.message);
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
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const agora = new Date();
  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  const statTotal = transportes.filter(t => t.data.startsWith(hojeStr)).length;
  const statPendentes = transportes.filter(t => t.status === "Pendente").length;

  if (loading && transportes.length === 0) return <div>Carregando...</div>;

  return (
    <div className="conteudo">
      <div className="transp-container">

        {erroCarga && <p role="alert" style={{ color: '#b91c1c', background: '#fef2f2', padding: 12, borderRadius: 8 }}>{erroCarga}</p>}

        <div className="banner-transp">
          <div>
            <h1><i className="las la-ambulance"></i> Transporte de Pacientes</h1>
            <p>Controle de remoções internas e externas</p>
          </div>
          <button className="btn btn-success" onClick={() => setActiveTab('solicitar')}>
            <i className="las la-plus-circle"></i> Nova Solicitação
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-numero">{statTotal}</div>
            <div className="stat-label">Solicitações Hoje</div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#d97706'}}>
            <div className="stat-numero" style={{color: '#d97706'}}>{statPendentes}</div>
            <div className="stat-label">Pendentes</div>
          </div>
        </div>

        <div className="tabs-transp">
          <button className={`tab-btn ${activeTab === 'solicitar' ? 'ativo' : ''}`} onClick={() => setActiveTab('solicitar')}>
            <i className="las la-plus-circle"></i> Solicitar
          </button>
          <button className={`tab-btn ${activeTab === 'lista' ? 'ativo' : ''}`} onClick={() => setActiveTab('lista')}>
            <i className="las la-list"></i> Lista
          </button>
        </div>

        {activeTab === 'solicitar' && (
          <div className="form-panel">
            <h3><i className="las la-ambulance"></i> Solicitar Transporte</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label htmlFor="transporte-paciente">Paciente *</label>
                <select id="transporte-paciente" value={transpPaciente} onChange={e => setTranspPaciente(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="transporte-origem">Origem *</label>
                <select id="transporte-origem" value={transpOrigem} onChange={e => setTranspOrigem(e.target.value)}>
                  <option>Enfermaria</option>
                  <option>UTI</option>
                  <option>Emergência</option>
                  <option>Centro Cirúrgico</option>
                </select>
              </div>
              <div className="form-grupo">
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
              <div className="form-grupo">
                <label htmlFor="transporte-tipo">Tipo *</label>
                <select id="transporte-tipo" value={transpTipo} onChange={e => setTranspTipo(e.target.value)}>
                  <option>Interno (Cadeira de Rodas)</option>
                  <option>Interno (Maca)</option>
                  <option>Externo (Ambulância)</option>
                  <option>UTI Móvel</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="transporte-solicitante">Solicitante</label>
                <input id="transporte-solicitante" type="text" value={session?.user?.name || session?.user?.email || ''} readOnly />
              </div>
              <div className="form-grupo">
                <label htmlFor="transporte-data">Data/Hora</label>
                <input id="transporte-data" type="datetime-local" value={transpData} onChange={e => setTranspData(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-success" onClick={solicitarTransporte} style={{width:'100%', marginTop:'15px', padding:'14px', justifyContent:'center'}}>
              <i className="las la-save"></i> Solicitar Transporte
            </button>
          </div>
        )}

        {activeTab === 'lista' && (
          <div style={{background:'white', borderRadius: '8px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)', overflowX:'auto'}}>
            <table className="tabela-transp">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Paciente</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transportes.length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhuma solicitação</td></tr>
                ) : (
                  transportes.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.data).toLocaleString('pt-BR')}</td>
                      <td><strong>{t.paciente}</strong></td>
                      <td>{t.origem}</td>
                      <td>{t.destino}</td>
                      <td>{t.tipo}</td>
                      <td>
                        <span className={`badge ${t.status === 'Concluído' ? 'badge-success' : 'badge-warning'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        {t.status === 'Pendente' && (
                          <button className="btn btn-xs btn-success" onClick={() => concluirTransporte(t.id)}>
                            <i className="las la-check"></i> Concluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
