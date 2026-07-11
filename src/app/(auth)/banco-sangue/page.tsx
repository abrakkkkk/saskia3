'use client';
import { useState, useEffect } from 'react';
import './banco-sangue.css';

interface EstoqueSangue {
  id: string;
  tipo: string;
  quantidade: number;
  status: string; // 'NORMAL', 'ALERTA', 'CRITICO'
}

export default function BancoSanguePage() {
  const [activeTab, setActiveTab] = useState<'estoque'|'compatibilidade'>('estoque');
  
  const [estoque, setEstoque] = useState<EstoqueSangue[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Movimentação
  const [movTipoId, setMovTipoId] = useState('');
  const [movQuantidade, setMovQuantidade] = useState(1);
  const [movOperacao, setMovOperacao] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [modalMov, setModalMov] = useState(false);

  const carregarEstoque = async () => {
    try {
      const res = await fetch('/api/banco-sangue');
      if (res.ok) {
        setEstoque(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstoque();
  }, []);

  const abrirMovimentacao = (tipoOperacao: 'ENTRADA'|'SAIDA') => {
    setMovOperacao(tipoOperacao);
    setMovTipoId('');
    setMovQuantidade(1);
    setModalMov(true);
  };

  const confirmarMovimentacao = async () => {
    if (!movTipoId || movQuantidade <= 0) {
      alert("⚠️ Selecione o tipo sanguíneo e uma quantidade válida!");
      return;
    }

    const item = estoque.find(e => e.id === movTipoId);
    if (!item) return;

    let novaQtd = item.quantidade;
    if (movOperacao === 'ENTRADA') {
      novaQtd += movQuantidade;
    } else {
      if (novaQtd < movQuantidade) {
        alert("⚠️ Quantidade insuficiente em estoque!");
        return;
      }
      novaQtd -= movQuantidade;
    }

    try {
      const res = await fetch(`/api/banco-sangue/${movTipoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: novaQtd })
      });

      if (!res.ok) throw new Error("Erro ao atualizar estoque");

      alert(`✅ ${movOperacao === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      setModalMov(false);
      carregarEstoque();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const criarTipoNovo = async () => {
    const tipo = prompt("Digite o tipo sanguíneo a ser criado (Ex: A+, O-):");
    if (!tipo) return;

    try {
      const res = await fetch('/api/banco-sangue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tipo.trim().toUpperCase(), quantidade: 0 })
      });

      if (!res.ok) throw new Error("Erro ao criar tipo sanguíneo");

      alert("✅ Tipo sanguíneo adicionado ao estoque!");
      carregarEstoque();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getClasseStatus = (status: string) => {
    if (status === 'CRÍTICO') return 'critico';
    if (status === 'ALERTA') return 'baixo';
    return 'ok';
  };

  if (loading) return <div>Carregando Banco de Sangue...</div>;

  return (
    <div className="conteudo">
      <div className="bs-container">
        
        <div className="banner-bs">
          <div>
            <h1><i className="las la-tint"></i> Banco de Sangue e Hemoterapia</h1>
            <p>Gestão de estoque de hemocomponentes e compatibilidade</p>
          </div>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={criarTipoNovo}><i className="las la-plus"></i> Novo Tipo</button>
            <button className="btn btn-success" onClick={() => abrirMovimentacao('ENTRADA')}><i className="las la-arrow-down"></i> Registrar Entrada</button>
            <button className="btn btn-warning" onClick={() => abrirMovimentacao('SAIDA')}><i className="las la-syringe"></i> Transfusão (Saída)</button>
          </div>
        </div>

        <div className="tabs-bs">
          <button className={`tab-btn ${activeTab === 'estoque' ? 'ativo' : ''}`} onClick={() => setActiveTab('estoque')}><i className="las la-boxes"></i> Estoque por Tipagem</button>
          <button className={`tab-btn ${activeTab === 'compatibilidade' ? 'ativo' : ''}`} onClick={() => setActiveTab('compatibilidade')}><i className="las la-project-diagram"></i> Tabela de Compatibilidade</button>
        </div>

        {activeTab === 'estoque' && (
          <div>
            <div className="estoque-grid">
              {estoque.length === 0 ? (
                <div style={{textAlign:'center', padding:'50px', color:'#94a3b8', gridColumn:'1/-1'}}>
                  <i className="las la-box-open" style={{fontSize:'64px', opacity:0.3}}></i>
                  <p style={{fontSize:'15px', marginTop:'10px'}}>Estoque vazio. Adicione um tipo sanguíneo para começar.</p>
                </div>
              ) : (
                estoque.map((item) => (
                  <div key={item.id} className={`estoque-card ${getClasseStatus(item.status)}`}>
                    <div className="estoque-icone">🩸</div>
                    <div className="estoque-tipo" style={{fontSize:'28px', fontWeight:'bold', marginTop:'10px'}}>{item.tipo}</div>
                    <div className="estoque-quantidade" style={{fontSize:'42px', margin:'10px 0'}}>{item.quantidade}</div>
                    <div className="estoque-detalhes">
                      <span className={`badge ${item.status === 'CRÍTICO' ? 'badge-danger' : (item.status === 'ALERTA' ? 'badge-warning' : 'badge-success')}`}>{item.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'compatibilidade' && (
          <div className="form-panel">
            <h3><i className="las la-project-diagram"></i> Tabela de Compatibilidade Sanguínea</h3>
            <div className="compat-grid">
              <div className="compat-item"><div className="compat-sangue">A+</div><div className="compat-doacao">Recebe: A+, A-, O+, O-<br/>Doa: A+, AB+</div></div>
              <div className="compat-item"><div className="compat-sangue">A-</div><div className="compat-doacao">Recebe: A-, O-<br/>Doa: A+, A-, AB+, AB-</div></div>
              <div className="compat-item"><div className="compat-sangue">B+</div><div className="compat-doacao">Recebe: B+, B-, O+, O-<br/>Doa: B+, AB+</div></div>
              <div className="compat-item"><div className="compat-sangue">B-</div><div className="compat-doacao">Recebe: B-, O-<br/>Doa: B+, B-, AB+, AB-</div></div>
              <div className="compat-item"><div className="compat-sangue">AB+</div><div className="compat-doacao">Recebe: TODOS (Universal)<br/>Doa: AB+</div></div>
              <div className="compat-item"><div className="compat-sangue">AB-</div><div className="compat-doacao">Recebe: A-, B-, AB-, O-<br/>Doa: AB+, AB-</div></div>
              <div className="compat-item"><div className="compat-sangue">O+</div><div className="compat-doacao">Recebe: O+, O-<br/>Doa: A+, B+, AB+, O+</div></div>
              <div className="compat-item"><div className="compat-sangue">O-</div><div className="compat-doacao">Recebe: O-<br/>Doa: TODOS (Doador Universal)</div></div>
            </div>
            <div style={{background:'#fef2f2', borderRadius:'14px', padding:'18px', marginTop:'20px', textAlign:'center', border:'2px solid #fecaca'}}>
              <strong style={{color:'#dc2626'}}>⚠️ EMERGÊNCIA:</strong> Tipagem desconhecida → <strong>O NEGATIVO</strong> (mulheres férteis) | <strong>O POSITIVO</strong> (homens e mulheres sem potencial reprodutivo)
            </div>
          </div>
        )}
      </div>

      {modalMov && (
        <div className="bs-modal" onClick={e => { if (e.target === e.currentTarget) setModalMov(false); }}>
          <div className="bs-modal-conteudo" style={{maxWidth:'400px'}}>
            <h3 style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}>
              {movOperacao === 'ENTRADA' ? <><i className="las la-arrow-down" style={{color:'#16a34a'}}></i> Registrar Entrada</> : <><i className="las la-syringe" style={{color:'#d97706'}}></i> Registrar Transfusão (Saída)</>}
            </h3>
            <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
              <div className="form-grupo">
                <label>Tipo Sanguíneo *</label>
                <select value={movTipoId} onChange={e => setMovTipoId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {estoque.map(e => <option key={e.id} value={e.id}>{e.tipo} (Atual: {e.quantidade})</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Quantidade *</label>
                <input type="number" min="1" value={movQuantidade} onChange={e => setMovQuantidade(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" style={{background:'#f1f5f9', color:'#334155'}} onClick={() => setModalMov(false)}>Cancelar</button>
              <button className={movOperacao === 'ENTRADA' ? 'btn btn-success' : 'btn btn-warning'} onClick={confirmarMovimentacao}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
