'use client';
import { useState, useEffect } from 'react';
import './financeiro.css';

// --- Interfaces ---
interface PagamentoInfo { data: string; forma: string; comprovante?: string; }
interface Fatura { id: string; hospitalId: string; hospitalNome: string; plano: string; categoria: string; valor: number; vencimento: string; status: string; tipoInst: string; pagamento?: PagamentoInfo; }
interface Conta { id: number; tipo: 'receber' | 'pagar'; descricao: string; valor: number; vencimento: string; fornecedor: string; status: string; }
interface GuiaTISS { id: number; convenio: string; guia: string; data: string; procedimento: string; valor: number; lote: string; status: string; }
interface Glosa { id: number; fatura: string; convenio: string; valor: number; motivo: string; status: string; data: string; obs: string; }
interface SUS { id: number; tipo: string; numero: string; paciente: string; cns: string; procedimento: string; valor: number; data: string; status: string; }
interface NFe { id: number; emitente: string; tomador: string; descricao: string; valor: number; numero: string; data: string; }

export default function AdminFinanceiroPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('faturas');

  // --- Estados de Dados ---
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [tiss, setTiss] = useState<GuiaTISS[]>([]);
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [sus, setSus] = useState<SUS[]>([]);
  const [nfe, setNfe] = useState<NFe[]>([]);

  // --- Carregamento Inicial ---
  useEffect(() => {
    setMounted(true);
    // Mock inicial caso localStorage esteja vazio
    const loadState = (key: string, defaultData: any) => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try { return JSON.parse(saved); } catch(e) { return defaultData; }
      }
      return defaultData;
    };

    setFaturas(loadState('saskiaFaturas', [
      { id: 'FAT-001', hospitalId: 'hosp_1', hospitalNome: 'Hospital São Lucas', plano: 'Premium', categoria: 'Licença Mensal', valor: 799.00, vencimento: new Date(Date.now() + 86400000*5).toISOString().split('T')[0], status: 'Pendente', tipoInst: 'Privado' }
    ]));
    setContas(loadState('saskiaContas', []));
    setTiss(loadState('saskiaTISS', []));
    setGlosas(loadState('saskiaGlosas', []));
    setSus(loadState('saskiaSUS', []));
    setNfe(loadState('saskiaNFe', []));
  }, []);

  // --- Salvar Modificações ---
  const saveState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  if (!mounted) return null;

  // --- Lógica das Abas ---
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  // Stats Faturas
  const totalFaturas = faturas.length;
  const pagasMes = faturas.filter(f => f.status === 'Pago' && f.pagamento && new Date(f.pagamento.data).getMonth() + 1 === mesAtual).length;
  const pendentes = faturas.filter(f => f.status === 'Pendente' || f.status === 'Vencido').length;
  const vencidas = faturas.filter(f => (f.status === 'Pendente' || f.status === 'Vencido') && new Date(f.vencimento) < hoje).length;
  const receitaFaturasMes = faturas.filter(f => f.status === 'Pago' && f.pagamento && new Date(f.pagamento.data).getMonth() + 1 === mesAtual).reduce((acc, f) => acc + f.valor, 0);
  
  // Stats Fluxo de Caixa Global
  const totalContasReceber = contas.filter(c => c.tipo === 'receber' && c.status === 'Pendente').reduce((acc, c) => acc + c.valor, 0);
  const totalContasPagar = contas.filter(c => c.tipo === 'pagar' && c.status === 'Pendente').reduce((acc, c) => acc + c.valor, 0);
  const fluxoAtual = receitaFaturasMes - contas.filter(c => c.tipo === 'pagar' && c.status === 'Pago' && new Date(c.vencimento).getMonth() + 1 === mesAtual).reduce((acc, c) => acc + c.valor, 0);

  // --- Funções Interativas ---
  const pagarFatura = (id: string) => {
    const newFaturas = faturas.map(f => f.id === id ? { ...f, status: 'Pago', pagamento: { data: new Date().toISOString(), forma: 'Transferência' } } : f);
    setFaturas(newFaturas); saveState('saskiaFaturas', newFaturas);
    alert('Fatura paga com sucesso!');
  };

  const baixarConta = (id: number) => {
    const newContas = contas.map(c => c.id === id ? { ...c, status: 'Pago' } : c);
    setContas(newContas); saveState('saskiaContas', newContas);
    alert('Conta baixada com sucesso!');
  };

  const formAction = (e: React.FormEvent, tipo: string) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    if (tipo === 'tiss') {
      const newTiss: GuiaTISS = { id: Date.now(), convenio: formData.get('convenio') as string, guia: formData.get('guia') as string, data: formData.get('data') as string, procedimento: formData.get('procedimento') as string, valor: Number(formData.get('valor')), lote: formData.get('lote') as string, status: formData.get('status') as string };
      const updated = [newTiss, ...tiss]; setTiss(updated); saveState('saskiaTISS', updated); alert('Guia TISS Registrada!');
    } else if (tipo === 'conta') {
      const novaConta: Conta = { id: Date.now(), tipo: formData.get('tipo') as 'receber'|'pagar', descricao: formData.get('descricao') as string, valor: Number(formData.get('valor')), vencimento: formData.get('vencimento') as string, fornecedor: formData.get('fornecedor') as string, status: 'Pendente' };
      const updated = [novaConta, ...contas]; setContas(updated); saveState('saskiaContas', updated); alert('Conta Registrada!');
    } else if (tipo === 'glosa') {
      const novaGlosa: Glosa = { id: Date.now(), fatura: formData.get('fatura') as string, convenio: formData.get('convenio') as string, valor: Number(formData.get('valor')), motivo: formData.get('motivo') as string, status: formData.get('status') as string, data: formData.get('data') as string, obs: formData.get('obs') as string };
      const updated = [novaGlosa, ...glosas]; setGlosas(updated); saveState('saskiaGlosas', updated); alert('Glosa Registrada!');
    } else if (tipo === 'sus') {
      const novoSus: SUS = { id: Date.now(), tipo: formData.get('tipo') as string, numero: formData.get('numero') as string, paciente: formData.get('paciente') as string, cns: formData.get('cns') as string, procedimento: formData.get('procedimento') as string, valor: Number(formData.get('valor')), data: formData.get('data') as string, status: formData.get('status') as string };
      const updated = [novoSus, ...sus]; setSus(updated); saveState('saskiaSUS', updated); alert('Guia SUS Registrada!');
    } else if (tipo === 'nfe') {
      const novaNfe: NFe = { id: Date.now(), emitente: formData.get('emitente') as string, tomador: formData.get('tomador') as string, descricao: formData.get('descricao') as string, valor: Number(formData.get('valor')), data: formData.get('data') as string, numero: `NF-${Math.floor(Math.random()*10000)}` };
      const updated = [novaNfe, ...nfe]; setNfe(updated); saveState('saskiaNFe', updated); alert('NF-e Emitida!');
    }
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="conteudo">
      <div className="fin-container">
        
        <div className="banner-fin">
          <div>
            <h1><i className="las la-coins"></i> Painel Financeiro Global</h1>
            <p>Faturamento TISS, Contas a Receber/Pagar, Fluxo de Caixa, APAC/AIH, NF-e</p>
          </div>
          <div>
            <button className="btn btn-info" onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white' }}>
              <i className="las la-print"></i> Imprimir Relatório
            </button>
          </div>
        </div>

        {/* --- STATS GRID --- */}
        <div className="stats-grid">
          <div className="stat-card azul"><div className="stat-icon"><i className="las la-file-invoice"></i></div><div className="stat-valor">{totalFaturas}</div><div className="stat-label">Total de Faturas</div></div>
          <div className="stat-card verde"><div class="stat-icon"><i className="las la-check-circle"></i></div><div className="stat-valor">{pagasMes}</div><div className="stat-label">Faturas Pagas (Mês)</div></div>
          <div className="stat-card vermelho"><div className="stat-icon"><i className="las la-exclamation-triangle"></i></div><div className="stat-valor">{vencidas}</div><div className="stat-label">Faturas Vencidas</div></div>
          <div className="stat-card verde"><div className="stat-icon"><i className="las la-money-bill"></i></div><div className="stat-valor">R$ {receitaFaturasMes.toFixed(2)}</div><div className="stat-label">Receita (Mês)</div></div>
          <div className="stat-card azul"><div className="stat-icon"><i className="las la-hand-holding-usd"></i></div><div className="stat-valor">R$ {totalContasReceber.toFixed(2)}</div><div className="stat-label">Contas a Receber</div></div>
          <div className="stat-card vermelho"><div className="stat-icon"><i className="las la-money-check"></i></div><div className="stat-valor">R$ {totalContasPagar.toFixed(2)}</div><div className="stat-label">Contas a Pagar</div></div>
          <div className="stat-card amarelo"><div className="stat-icon"><i className="las la-chart-line"></i></div><div className="stat-valor">R$ {fluxoAtual.toFixed(2)}</div><div className="stat-label">Fluxo Caixa (Mês)</div></div>
        </div>

        {/* --- MENU ABAS --- */}
        <div className="tabs-fin">
          {[
            { id: 'faturas', icon: 'la-file-invoice', label: 'Faturas' },
            { id: 'tiss', icon: 'la-hospital-alt', label: 'Convênios TISS' },
            { id: 'contas', icon: 'la-calculator', label: 'Contas a Receber/Pagar' },
            { id: 'fluxo', icon: 'la-chart-bar', label: 'Fluxo de Caixa' },
            { id: 'glosas', icon: 'la-ban', label: 'Glosas' },
            { id: 'sus', icon: 'la-flag-usa', label: 'APAC/AIH SUS' },
            { id: 'nfe', icon: 'la-file-invoice', label: 'NF-e' },
            { id: 'historico', icon: 'la-history', label: 'Histórico' }
          ].map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'ativo' : ''}`} onClick={() => setActiveTab(t.id)}>
              <i className={`las ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        {/* --- ABA FATURAS --- */}
        {activeTab === 'faturas' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
            <div className="tabela-wrapper">
              <table className="tabela-fin">
                <thead><tr><th>Fatura</th><th>Hospital</th><th>Plano</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {faturas.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center', padding:'30px'}}>Nenhuma fatura</td></tr> : faturas.map(f => (
                    <tr key={f.id} className={f.status === 'Vencido' ? 'vencido' : ''}>
                      <td><strong>{f.id}</strong></td>
                      <td>{f.hospitalNome}</td>
                      <td>{f.plano}</td>
                      <td>R$ {f.valor.toFixed(2)}</td>
                      <td>{new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td><span className={`badge badge-${f.status.toLowerCase()}`}>{f.status}</span></td>
                      <td>{f.status === 'Pendente' && <button className="btn btn-success btn-xs" onClick={() => pagarFatura(f.id)}>Pagar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA TISS --- */}
        {activeTab === 'tiss' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
            <div className="form-panel" style={{ background: 'white', padding: '25px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginBottom: '15px', color: '#1e293b' }}><i className="las la-hospital-alt"></i> Faturamento por Convênio (TISS)</h3>
              <form onSubmit={(e) => formAction(e, 'tiss')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div><label className="form-label">Convênio</label><input name="convenio" required className="input-field" /></div>
                <div><label className="form-label">Nº Guia TISS</label><input name="guia" required className="input-field" /></div>
                <div><label className="form-label">Data</label><input name="data" type="date" required className="input-field" /></div>
                <div><label className="form-label">Procedimento (TUSS)</label><input name="procedimento" required className="input-field" /></div>
                <div><label className="form-label">Valor (R$)</label><input name="valor" type="number" step="0.01" required className="input-field" /></div>
                <div><label className="form-label">Lote</label><input name="lote" className="input-field" /></div>
                <div><label className="form-label">Status</label><select name="status" className="input-field"><option>Enviado</option><option>Autorizado</option><option>Pendente</option></select></div>
                <div style={{ gridColumn: 'span 3' }}>
                  <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Registrar Guia TISS</button>
                </div>
              </form>
            </div>

            <div className="tabela-wrapper">
              <table className="tabela-fin">
                <thead><tr><th>Guia</th><th>Convênio</th><th>Data</th><th>Procedimento</th><th>Valor</th><th>Lote</th><th>Status</th></tr></thead>
                <tbody>
                  {tiss.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center', padding:'30px'}}>Nenhuma guia TISS</td></tr> : tiss.map(t => (
                    <tr key={t.id}><td>{t.guia}</td><td>{t.convenio}</td><td>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td>{t.procedimento}</td><td>R$ {t.valor.toFixed(2)}</td><td>{t.lote}</td><td><span className="badge badge-info">{t.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA CONTAS --- */}
        {activeTab === 'contas' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
            <div className="form-panel" style={{ background: 'white', padding: '25px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginBottom: '15px', color: '#1e293b' }}><i className="las la-calculator"></i> Nova Conta</h3>
              <form onSubmit={(e) => formAction(e, 'conta')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label className="form-label">Tipo</label><select name="tipo" className="input-field"><option value="receber">A Receber</option><option value="pagar">A Pagar</option></select></div>
                <div><label className="form-label">Descrição</label><input name="descricao" required className="input-field" /></div>
                <div><label className="form-label">Valor (R$)</label><input name="valor" type="number" step="0.01" required className="input-field" /></div>
                <div><label className="form-label">Vencimento</label><input name="vencimento" type="date" required className="input-field" /></div>
                <div style={{ gridColumn: 'span 2' }}><label className="form-label">Fornecedor / Cliente</label><input name="fornecedor" className="input-field" /></div>
                <div style={{ gridColumn: 'span 2' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Salvar Conta</button>
                </div>
              </form>
            </div>

            <div className="tabela-wrapper">
              <table className="tabela-fin">
                <thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Fornecedor</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {contas.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center', padding:'30px'}}>Nenhuma conta</td></tr> : contas.map(c => (
                    <tr key={c.id}>
                      <td>{c.descricao}</td>
                      <td><span className={c.tipo === 'receber' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{c.tipo === 'receber' ? 'A Receber' : 'A Pagar'}</span></td>
                      <td>R$ {c.valor.toFixed(2)}</td>
                      <td>{new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td>{c.fornecedor}</td>
                      <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span></td>
                      <td>{c.status === 'Pendente' && <button className="btn btn-success btn-xs" onClick={() => baixarConta(c.id)}>Baixar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA FLUXO --- */}
        {activeTab === 'fluxo' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}><i className="las la-chart-bar"></i> Fluxo de Caixa Global do Sistema</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
               <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
                 <div className="stat-valor" style={{ color: '#16a34a', fontSize: '32px' }}>+ R$ {receitaFaturasMes.toFixed(2)}</div>
                 <div className="stat-label" style={{ fontSize: '14px' }}>Entradas de Licenças (Hospitalares)</div>
               </div>
               <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
                 <div className="stat-valor" style={{ color: '#16a34a', fontSize: '32px' }}>+ R$ {totalContasReceber.toFixed(2)}</div>
                 <div className="stat-label" style={{ fontSize: '14px' }}>Contas a Receber</div>
               </div>
               <div className="stat-card" style={{ borderLeftColor: '#dc2626' }}>
                 <div className="stat-valor" style={{ color: '#dc2626', fontSize: '32px' }}>- R$ {totalContasPagar.toFixed(2)}</div>
                 <div className="stat-label" style={{ fontSize: '14px' }}>Contas a Pagar</div>
               </div>
               <div className="stat-card" style={{ borderLeftColor: fluxoAtual >= 0 ? '#16a34a' : '#dc2626', background: fluxoAtual >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                 <div className="stat-valor" style={{ color: fluxoAtual >= 0 ? '#16a34a' : '#dc2626', fontSize: '36px' }}>R$ {fluxoAtual.toFixed(2)}</div>
                 <div className="stat-label" style={{ fontSize: '16px', fontWeight: 'bold' }}>Saldo Previsto</div>
               </div>
            </div>
          </div>
        )}

        {/* --- ABA GLOSAS --- */}
        {activeTab === 'glosas' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
            <div className="form-panel" style={{ background: 'white', padding: '25px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginBottom: '15px', color: '#1e293b' }}><i className="las la-ban"></i> Registrar Nova Glosa</h3>
              <form onSubmit={(e) => formAction(e, 'glosa')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label className="form-label">Fatura/Guia</label><input name="fatura" required className="input-field" /></div>
                <div><label className="form-label">Convênio</label><input name="convenio" required className="input-field" /></div>
                <div><label className="form-label">Valor Glosado (R$)</label><input name="valor" type="number" step="0.01" required className="input-field" /></div>
                <div><label className="form-label">Data Glosa</label><input name="data" type="date" required className="input-field" /></div>
                <div><label className="form-label">Motivo</label><select name="motivo" className="input-field"><option>Ausência de autorização</option><option>Código incorreto</option><option>Outro</option></select></div>
                <div><label className="form-label">Status Recurso</label><select name="status" className="input-field"><option>Glosado</option><option>Recurso Enviado</option></select></div>
                <div style={{ gridColumn: 'span 2' }}>
                  <button type="submit" className="btn btn-warning" style={{ width: '100%' }}>Registrar Glosa</button>
                </div>
              </form>
            </div>
            
            <div className="tabela-wrapper">
              <table className="tabela-fin">
                <thead><tr><th>Guia</th><th>Convênio</th><th>Valor</th><th>Motivo</th><th>Data</th><th>Status</th></tr></thead>
                <tbody>
                  {glosas.length === 0 ? <tr><td colSpan={6} style={{textAlign:'center', padding:'30px'}}>Nenhuma glosa</td></tr> : glosas.map(g => (
                    <tr key={g.id}><td>{g.fatura}</td><td>{g.convenio}</td><td>R$ {g.valor.toFixed(2)}</td><td>{g.motivo}</td><td>{new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td><span className="badge badge-pendente">{g.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA SUS --- */}
        {activeTab === 'sus' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
             <div className="form-panel" style={{ background: 'white', padding: '25px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginBottom: '15px', color: '#1e293b' }}><i className="las la-flag-usa"></i> Faturamento SUS (APAC/AIH)</h3>
              <form onSubmit={(e) => formAction(e, 'sus')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div><label className="form-label">Tipo</label><select name="tipo" className="input-field"><option>APAC</option><option>AIH</option></select></div>
                <div><label className="form-label">Nº Autorização</label><input name="numero" required className="input-field" /></div>
                <div><label className="form-label">Paciente</label><input name="paciente" required className="input-field" /></div>
                <div><label className="form-label">CNS</label><input name="cns" required className="input-field" /></div>
                <div><label className="form-label">Procedimento (SIGTAP)</label><input name="procedimento" required className="input-field" /></div>
                <div><label className="form-label">Valor (R$)</label><input name="valor" type="number" step="0.01" required className="input-field" /></div>
                <div><label className="form-label">Data</label><input name="data" type="date" required className="input-field" /></div>
                <div><label className="form-label">Status</label><select name="status" className="input-field"><option>Enviado</option><option>Aprovado</option></select></div>
                <div style={{ gridColumn: 'span 3' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', background: '#6366f1' }}>Registrar APAC/AIH</button>
                </div>
              </form>
            </div>
            
            <div className="tabela-wrapper">
              <table className="tabela-fin">
                <thead><tr><th>Tipo</th><th>Número</th><th>Paciente</th><th>Procedimento</th><th>Valor</th><th>Data</th><th>Status</th></tr></thead>
                <tbody>
                  {sus.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center', padding:'30px'}}>Nenhum registro SUS</td></tr> : sus.map(s => (
                    <tr key={s.id}><td><span className="badge badge-purple">{s.tipo}</span></td><td>{s.numero}</td><td>{s.paciente}</td><td>{s.procedimento}</td><td>R$ {s.valor.toFixed(2)}</td><td>{new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td>{s.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA NF-e --- */}
        {activeTab === 'nfe' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
             <div className="form-panel" style={{ background: 'white', padding: '25px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginBottom: '15px', color: '#1e293b' }}><i className="las la-file-invoice"></i> Emissão de NF-e</h3>
              <form onSubmit={(e) => formAction(e, 'nfe')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label className="form-label">Emitente (Hospital)</label><input name="emitente" required className="input-field" /></div>
                <div><label className="form-label">Tomador</label><input name="tomador" required className="input-field" /></div>
                <div><label className="form-label">Descrição do Serviço</label><input name="descricao" required className="input-field" /></div>
                <div><label className="form-label">Valor (R$)</label><input name="valor" type="number" step="0.01" required className="input-field" /></div>
                <div><label className="form-label">Data Emissão</label><input name="data" type="date" required className="input-field" /></div>
                <div style={{ gridColumn: 'span 2' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', background: '#0ea5e9' }}>Emitir NF-e</button>
                </div>
              </form>
            </div>
            
            <div className="tabela-wrapper">
              <table className="tabela-fin">
                <thead><tr><th>NF-e</th><th>Emitente</th><th>Tomador</th><th>Serviço</th><th>Valor</th><th>Data</th></tr></thead>
                <tbody>
                  {nfe.length === 0 ? <tr><td colSpan={6} style={{textAlign:'center', padding:'30px'}}>Nenhuma nota fiscal emitida</td></tr> : nfe.map(n => (
                    <tr key={n.id}><td><strong>{n.numero}</strong></td><td>{n.emitente}</td><td>{n.tomador}</td><td>{n.descricao}</td><td>R$ {n.valor.toFixed(2)}</td><td>{new Date(n.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ABA HISTÓRICO --- */}
        {activeTab === 'historico' && (
          <div className="tab-conteudo ativo animate-in fade-in duration-300">
             {faturas.filter(f => f.status === 'Pago').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <i className="las la-history" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                <p style={{ margin: 0 }}>Nenhum pagamento registrado no histórico</p>
              </div>
            ) : (
              faturas.filter(f => f.status === 'Pago').map(f => (
                <div key={f.id} className="historico-card pago" style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #16a34a', marginBottom: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}><i className="las la-check-circle" style={{ color: '#16a34a' }}></i> {f.hospitalNome} - {f.plano}</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#475569' }}><strong>Fatura:</strong> {f.id} | <strong>Valor:</strong> R$ {f.valor.toFixed(2)} | <strong>Vencimento:</strong> {new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    <strong>Pago em:</strong> {f.pagamento ? new Date(f.pagamento.data).toLocaleDateString('pt-BR') : 'N/D'} | 
                    <strong> Forma:</strong> {f.pagamento?.forma}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
