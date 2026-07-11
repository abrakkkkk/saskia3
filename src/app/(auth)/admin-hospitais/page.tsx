'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './hospitais.css';

const SENHA_MASTER = "admin123";

const planosValores: Record<string, number> = {
  "pref_grandes_capitais": 5000,
  "pref_metropolitanas": 3500,
  "pref_medio_porte": 2500,
  "pref_pequenas": 1200,
  "consultorio_individual": 149,
  "clinica_pequena": 399,
  "clinica_media": 799,
  "policlinica": 1499,
  "hospital_pequeno": 2499,
  "hospital_medio": 3999,
  "hospital_grande": 5999,
  "rede_hospitalar": 0,
  "filantropico": 0
};

const getNomePlano = (valor: string) => {
  const nomes: Record<string, string> = {
    "pref_grandes_capitais": "Grandes Capitais",
    "pref_metropolitanas": "Cidades Metropolitanas",
    "pref_medio_porte": "Cidades de Médio Porte",
    "pref_pequenas": "Cidades Pequenas",
    "consultorio_individual": "Consultório Individual",
    "clinica_pequena": "Clínica Pequena",
    "clinica_media": "Clínica Média",
    "policlinica": "Policlínica",
    "hospital_pequeno": "Hospital Pequeno Porte",
    "hospital_medio": "Hospital Médio Porte",
    "hospital_grande": "Hospital Grande Porte",
    "rede_hospitalar": "Rede Hospitalar",
    "filantropico": "🎁 Filantrópico"
  };
  return nomes[valor] || valor;
};

export default function AdminHospitaisPage() {
  const router = useRouter();

  // Security Lock
  const [isLocked, setIsLocked] = useState(true);
  const [senhaInput, setSenhaInput] = useState('');
  const [senhaError, setSenhaError] = useState(false);

  // Data Arrays
  const [hospitais, setHospitais] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);

  // Forms State
  const [formHospital, setFormHospital] = useState({ nome: '', cnpj: '', endereco: '', telefone: '' });
  const [formUsuario, setFormUsuario] = useState({ hospitalId: '', nome: '', email: '', senha: '123456', cargo: 'diretor_geral' });
  const [formFatura, setFormFatura] = useState({ 
    hospitalId: '', plano: '', valor: 0, vencimento: '', referencia: '', categoria: 'Hospital', tipoInst: 'Privado', obs: '' 
  });

  // Filtering
  const [filtroHospitalFaturas, setFiltroHospitalFaturas] = useState('todos');

  // Modal Pagamento
  const [modalPgOpen, setModalPgOpen] = useState(false);
  const [pgFatura, setPgFatura] = useState<any>(null);
  const [pgData, setPgData] = useState('');
  const [pgForma, setPgForma] = useState('PIX');
  const [pgComprovante, setPgComprovante] = useState('');

  useEffect(() => {
    try {
      fetch('/api/hospital').then(res => res.json()).then(data => {
        if (Array.isArray(data)) setHospitais(data.map((h: any) => ({ ...h, ativo: h.ativo !== false })));
      }).catch(console.error);

      fetch('/api/usuario').then(res => res.json()).then(data => {
        if (Array.isArray(data)) setUsuarios(data.map((u: any) => ({ ...u, ativo: u.ativo !== false })));
      }).catch(console.error);

      fetch('/api/fatura').then(res => res.json()).then(data => {
        if (Array.isArray(data)) {
          const hoje = new Date();
          hoje.setHours(0,0,0,0);
          setFaturas(data.map((fat: any) => {
            const dtVenc = new Date(fat.vencimento);
            let s = fat.status;
            if ((s === 'Pendente' || s === 'Vencido') && dtVenc < hoje) {
              s = 'Vencido';
            }
            return {
              id: fat.id,
              hospitalId: fat.hospitalId,
              hospitalNome: fat.hospital?.nome || 'Hospital ' + fat.hospitalId.substring(0,4),
              plano: 'Plano',
              valor: fat.valor,
              vencimento: dtVenc.toISOString().split('T')[0],
              status: s,
              tipoInst: 'Privado',
              pagamento: null,
            };
          }));
        }
      }).catch(console.error);

      const hoje = new Date();
      setFormFatura(prev => ({
        ...prev,
        vencimento: new Date(new Date().setMonth(hoje.getMonth() + 1)).toISOString().split('T')[0],
        referencia: hoje.toISOString().split('T')[0].substring(0, 7)
      }));
    } catch (e) {}
  }, []);

  const handleVerify = () => {
    if (senhaInput === SENHA_MASTER) {
      setIsLocked(false);
      setSenhaError(false);
    } else {
      setSenhaError(true);
      setSenhaInput('');
    }
  };

  const handleCadastrarHospital = () => {
    const { nome, cnpj, endereco, telefone } = formHospital;
    if (!nome.trim()) { alert("⚠️ Digite o nome do hospital!"); return; }
    if (hospitais.some(h => h.nome.toLowerCase() === nome.toLowerCase())) { alert("⚠️ Já existe um hospital com este nome!"); return; }

    const novo = {
      id: "hosp_" + Date.now(),
      nome, cnpj, endereco, telefone,
      dataCriacao: new Date().toISOString(),
      ativo: true
    };

    const novosHospitais = [...hospitais, novo];
    setHospitais(novosHospitais);
    
    fetch('/api/hospital', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cnpj, endereco, telefone })
    }).catch(console.error);
    setFormHospital({ nome: '', cnpj: '', endereco: '', telefone: '' });
    alert("✅ Hospital cadastrado com sucesso!");
  };

  const toggleHospital = (id: string) => {
    if (!confirm("Tem certeza que deseja alterar o status deste hospital?")) return;
    const novosHospitais = hospitais.map(h => h.id === id ? { ...h, ativo: !h.ativo } : h);
    setHospitais(novosHospitais);
  };

  const handleCadastrarUsuario = () => {
    const { hospitalId, nome, email, senha, cargo } = formUsuario;
    if (!hospitalId || !nome || !email) { alert("⚠️ Preencha hospital, nome e e-mail!"); return; }
    if (!email.includes('@') || !email.includes('.')) { alert("⚠️ Digite um e-mail válido!"); return; }
    
    if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) { alert("⚠️ Já existe um usuário com este e-mail!"); return; }

    const novo = {
      id: "user_" + Date.now(),
      hospitalId, nome, email: email.toLowerCase(), senha, cargo,
      ativo: true, dataCadastro: new Date().toISOString()
    };

    const novosUsuarios = [...usuarios, novo];
    setUsuarios(novosUsuarios);
    
    fetch('/api/usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId, nome, email, senha, cargo })
    }).catch(console.error);
    setFormUsuario(prev => ({ ...prev, nome: '', email: '', senha: '123456' }));
    alert("✅ Usuário cadastrado com sucesso!");
  };

  const toggleUsuario = (id: string) => {
    if (!confirm("Tem certeza que deseja alterar o status deste usuário?")) return;
    const novosUsuarios = usuarios.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u);
    setUsuarios(novosUsuarios);
  };

  const handlePlanoChange = (e: any) => {
    const plano = e.target.value;
    const valor = planosValores[plano] || 0;
    
    let tipoInst = formFatura.tipoInst;
    if (plano === "filantropico") {
      tipoInst = "Filantrópico";
      alert("🎁 Plano Filantrópico selecionado! A fatura será gerada como CORTESIA (R$ 0,00).");
    }

    setFormFatura(prev => ({ ...prev, plano, valor, tipoInst }));
  };

  const handleTipoInstChange = (e: any) => {
    const tipoInst = e.target.value;
    let plano = formFatura.plano;
    let valor = formFatura.valor;

    if (tipoInst === "Filantrópico") {
      valor = 0;
      plano = "filantropico";
      alert("🎁 Instituição Filantrópica! A fatura será gerada como CORTESIA (R$ 0,00).");
    }

    setFormFatura(prev => ({ ...prev, tipoInst, plano, valor }));
  };

  const handleEmitirFatura = () => {
    const { hospitalId, plano, valor, vencimento, referencia, categoria, tipoInst, obs } = formFatura;
    if (!hospitalId || !plano || !vencimento || !referencia) { alert("⚠️ Preencha hospital, plano, vencimento e referência!"); return; }

    const hospital = hospitais.find(h => h.id === hospitalId);
    const fatura = {
        id: "FAT-" + Date.now(),
        hospitalId,
        hospitalNome: hospital ? hospital.nome : "",
        plano: getNomePlano(plano),
        planoId: plano,
        valor: parseFloat(valor.toString()),
        categoria,
        tipoInst,
        vencimento,
        referencia,
        status: plano === "filantropico" || tipoInst === "Filantrópico" ? "Cortesia" : "Pendente",
        dataEmissao: new Date().toISOString(),
        obs,
        pagamento: null
    };

    const novasFaturas = [...faturas, fatura];
    setFaturas(novasFaturas);
    
    fetch('/api/fatura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId,
        valor: parseFloat(valor.toString()),
        vencimento: new Date(vencimento).toISOString(),
        status: fatura.status
      })
    }).catch(console.error);
    setFormFatura(prev => ({ ...prev, obs: '' }));
    alert("✅ Fatura emitida com sucesso!");
  };

  const abrirModalPagamento = (fatura: any) => {
    setPgFatura(fatura);
    setPgData(new Date().toISOString().split('T')[0]);
    setPgForma('PIX');
    setPgComprovante('');
    setModalPgOpen(true);
  };

  const confirmarPagamento = () => {
    if (!pgFatura) return;
    
    const novasFaturas = faturas.map(f => {
      if (f.id === pgFatura.id) {
        return {
          ...f,
          status: 'Pago',
          pagamento: {
            data: pgData,
            forma: pgForma,
            comprovante: pgComprovante,
            registradoPor: "Administrador",
            dataRegistro: new Date().toISOString()
          }
        };
      }
      return f;
    });

    setFaturas(novasFaturas);
    setModalPgOpen(false);
    alert("✅ Pagamento registrado com sucesso!");
  };

  const excluirFatura = (id: string) => {
    if (!confirm("⚠️ Tem certeza que deseja EXCLUIR esta fatura?\n\nEsta ação não pode ser desfeita!")) return;
    if (!confirm("🔴 CONFIRMAÇÃO FINAL: Deseja realmente excluir esta fatura permanentemente?")) return;
    const novasFaturas = faturas.filter(f => f.id !== id);
    setFaturas(novasFaturas);
    alert("🗑️ Fatura excluída com sucesso!");
  };

  const verRecibo = (f: any) => {
    if (!f.pagamento) return;
    alert(`📄 RECIBO\n\nFatura: ${f.id}\nHospital: ${f.hospitalNome}\nPlano: ${f.plano}\nValor: R$ ${f.valor.toFixed(2)}\nPago em: ${new Date(f.pagamento.data + 'T00:00:00').toLocaleDateString('pt-BR')}\nForma: ${f.pagamento.forma}\nComprovante: ${f.pagamento.comprovante || 'N/I'}`);
  };

  const getFaturasFiltradas = () => {
    let list = [...faturas].reverse();
    if (filtroHospitalFaturas !== 'todos') {
      list = list.filter(f => f.hospitalId === filtroHospitalFaturas);
    }
    return list;
  };

  const formatarCargo = (c: string) => { 
    const cargos: any = { "diretor_geral": "Diretor Geral", "medico_especialista": "Médico Especialista", "enfermeiro_assistencial": "Enfermeiro Assistencial", "recepcionista": "Recepcionista", "farmaceutico": "Farmacêutico", "tecnico_enfermagem": "Técnico de Enfermagem" }; 
    return cargos[c] || c; 
  };

  if (isLocked) {
    return (
      <div className="conteudo">
        <div className="modal-verificacao">
          <div className="modal-verificacao-content">
            <div className="lock-icon" style={{ color: '#f59e0b' }}><i className="las la-lock"></i></div>
            <h3>Verificação de Segurança</h3>
            <p>Para acessar o gerenciamento de hospitais, confirme sua identidade com a senha master.</p>
            
            <input 
              type="password" 
              placeholder="Digite a senha master" 
              value={senhaInput}
              onChange={e => setSenhaInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter') handleVerify() }}
              autoFocus
            />
            {senhaError && <div className="erro-msg"><i className="las la-exclamation-triangle"></i> Senha incorreta!</div>}
            
            <button className="btn btn-primary" onClick={handleVerify} style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}>
              <i className="las la-check-circle"></i> Verificar e Acessar
            </button>
            <button className="btn-logout" onClick={() => router.push('/dashboard')}>
              <i className="las la-arrow-left"></i> Voltar para o Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hospitaisAtivos = hospitais.filter(h => h.ativo);

  return (
    <div className="conteudo">
      <div className="admin-container">
        
        <div className="banner-admin">
          <div>
            <h1><i className="las la-hospital"></i> Gerenciar Hospitais (Admin)</h1>
            <p>Cadastre e gerencie os hospitais, usuários e finanças (faturamento) do sistema Saskia</p>
          </div>
        </div>

        <div className="alerta-restrito">
          <i className="las la-shield-alt icone"></i>
          <div>
            <strong>Área Restrita - Acesso Controlado</strong>
            <p>Todas as ações nesta página são vitais para o funcionamento do sistema multi-tenant.</p>
          </div>
        </div>

        <div className="form-panel">
          <h3><i className="las la-plus-circle"></i> Cadastrar Novo Hospital (Tenant)</h3>
          <div className="form-grid">
            <div className="form-grupo"><label>Nome do Hospital *</label><input type="text" value={formHospital.nome} onChange={e => setFormHospital({...formHospital, nome: e.target.value})} placeholder="Ex: Hospital São Lucas" /></div>
            <div className="form-grupo"><label>CNPJ</label><input type="text" value={formHospital.cnpj} onChange={e => setFormHospital({...formHospital, cnpj: e.target.value})} placeholder="00.000.000/0001-00" /></div>
            <div className="form-grupo"><label>Endereço</label><input type="text" value={formHospital.endereco} onChange={e => setFormHospital({...formHospital, endereco: e.target.value})} placeholder="Rua, número, bairro, cidade - UF" /></div>
            <div className="form-grupo"><label>Telefone</label><input type="text" value={formHospital.telefone} onChange={e => setFormHospital({...formHospital, telefone: e.target.value})} placeholder="(00) 0000-0000" /></div>
          </div>
          <button className="btn btn-success" onClick={handleCadastrarHospital} style={{ marginTop: '15px', width: '100%', justifyContent: 'center', padding: '14px' }}>
            <i className="las la-save"></i> Cadastrar Hospital
          </button>
        </div>

        <div className="form-panel">
          <h3><i className="las la-users"></i> Cadastrar Usuário no Hospital</h3>
          <div className="form-grid">
            <div className="form-grupo">
              <label>Hospital *</label>
              <select value={formUsuario.hospitalId} onChange={e => setFormUsuario({...formUsuario, hospitalId: e.target.value})}>
                <option value="">Selecione o hospital...</option>
                {hospitaisAtivos.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
              </select>
            </div>
            <div className="form-grupo"><label>Nome Completo *</label><input type="text" value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} placeholder="Nome do profissional" /></div>
            <div className="form-grupo"><label>E-mail *</label><input type="email" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} placeholder="email@hospital.com" /></div>
            <div className="form-grupo"><label>Senha *</label><input type="password" value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} placeholder="Senha de acesso" /></div>
            <div className="form-grupo">
              <label>Cargo</label>
              <select value={formUsuario.cargo} onChange={e => setFormUsuario({...formUsuario, cargo: e.target.value})}>
                <option value="diretor_geral">Diretor Geral (CEO)</option>
                <option value="medico_especialista">Médico Especialista</option>
                <option value="enfermeiro_assistencial">Enfermeiro Assistencial</option>
                <option value="recepcionista">Recepcionista</option>
                <option value="farmaceutico">Farmacêutico</option>
                <option value="tecnico_enfermagem">Técnico de Enfermagem</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleCadastrarUsuario} style={{ marginTop: '15px', width: '100%', justifyContent: 'center', padding: '14px' }}>
            <i className="las la-user-plus"></i> Cadastrar Usuário
          </button>
        </div>

        <div className="form-panel">
          <h3><i className="las la-coins"></i> Gestão Financeira de Licenças (Faturar Hospital)</h3>
          <div className="form-grid">
            <div className="form-grupo">
              <label>Hospital *</label>
              <select value={formFatura.hospitalId} onChange={e => setFormFatura({...formFatura, hospitalId: e.target.value})}>
                <option value="">Selecione o hospital para faturar...</option>
                {hospitaisAtivos.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
              </select>
            </div>
            <div className="form-grupo">
              <label>Plano *</label>
              <select value={formFatura.plano} onChange={handlePlanoChange}>
                <option value="">Selecione o plano...</option>
                <optgroup label="🏛️ Prefeituras e Órgãos Públicos">
                  <option value="pref_grandes_capitais">Grandes Capitais - R$ 5.000/mês</option>
                  <option value="pref_metropolitanas">Cidades Metropolitanas - R$ 3.500/mês</option>
                  <option value="pref_medio_porte">Cidades de Médio Porte - R$ 2.500/mês</option>
                  <option value="pref_pequenas">Cidades Pequenas - R$ 1.200/mês</option>
                </optgroup>
                <optgroup label="🏥 Clínicas e Consultórios">
                  <option value="consultorio_individual">Consultório Individual - R$ 149/mês</option>
                  <option value="clinica_pequena">Clínica Pequena (até 5 prof.) - R$ 399/mês</option>
                  <option value="clinica_media">Clínica Média (6-20 prof.) - R$ 799/mês</option>
                  <option value="policlinica">Policlínica (+20 prof.) - R$ 1.499/mês</option>
                </optgroup>
                <optgroup label="🏨 Hospitais e Unidades Hospitalares">
                  <option value="hospital_pequeno">Hospital Pequeno Porte (até 50 leitos) - R$ 2.499/mês</option>
                  <option value="hospital_medio">Hospital Médio Porte (51-150 leitos) - R$ 3.999/mês</option>
                  <option value="hospital_grande">Hospital Grande Porte (+150 leitos) - R$ 5.999/mês</option>
                  <option value="rede_hospitalar">Rede Hospitalar - Sob consulta</option>
                </optgroup>
                <optgroup label="🎁 Instituições Filantrópicas">
                  <option value="filantropico">🎁 Filantrópico / Santa Casa - R$ 0,00 (Cortesia)</option>
                </optgroup>
              </select>
            </div>
            <div className="form-grupo"><label>Valor (R$)</label><input type="number" value={formFatura.valor} onChange={e => setFormFatura({...formFatura, valor: parseFloat(e.target.value) || 0})} /></div>
            <div className="form-grupo"><label>Data Vencimento *</label><input type="date" value={formFatura.vencimento} onChange={e => setFormFatura({...formFatura, vencimento: e.target.value})} /></div>
            <div className="form-grupo"><label>Mês Referência *</label><input type="month" value={formFatura.referencia} onChange={e => setFormFatura({...formFatura, referencia: e.target.value})} /></div>
            <div className="form-grupo">
              <label>Categoria</label>
              <select value={formFatura.categoria} onChange={e => setFormFatura({...formFatura, categoria: e.target.value})}>
                <option>Hospital</option><option>Clínica</option><option>Posto de Saúde</option><option>Laboratório</option><option>Prefeitura</option><option>Consultório</option>
              </select>
            </div>
            <div className="form-grupo">
              <label>Tipo Instituição</label>
              <select value={formFatura.tipoInst} onChange={handleTipoInstChange}>
                <option value="Privado">Privado</option><option value="Público">Público</option><option value="Filantrópico">🎁 Filantrópico (Cortesia)</option>
              </select>
            </div>
            <div className="form-grupo full"><label>Observações</label><textarea value={formFatura.obs} onChange={e => setFormFatura({...formFatura, obs: e.target.value})} rows={2}></textarea></div>
          </div>
          <button className="btn btn-success" onClick={handleEmitirFatura} style={{ marginTop: '15px', width: '100%', justifyContent: 'center', padding: '14px' }}>
            <i className="las la-save"></i> Emitir Fatura
          </button>
        </div>

        <h3 className="section-title"><i className="las la-file-invoice"></i> Faturas Emitidas (Global)</h3>
        <div className="search-box">
          <select value={filtroHospitalFaturas} onChange={e => setFiltroHospitalFaturas(e.target.value)}>
            <option value="todos">Todos os hospitais (Filtro)</option>
            {hospitais.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
          </select>
        </div>
        
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr><th>Fatura</th><th>Hospital</th><th>Plano</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {getFaturasFiltradas().length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhuma fatura encontrada</td></tr>
              ) : (
                getFaturasFiltradas().map(f => {
                  let statusBadge = "badge-pendente";
                  if (f.status === "Pago") statusBadge = "badge-ativo";
                  if (f.status === "Cortesia") statusBadge = "badge-info";
                  if (f.status === "Vencido") statusBadge = "badge-inativo";

                  return (
                    <tr key={f.id}>
                      <td><strong>{f.id}</strong></td>
                      <td>{f.hospitalNome}</td>
                      <td>{f.plano}</td>
                      <td><strong>R$ {f.valor.toFixed(2)}</strong></td>
                      <td>{new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td><span className={`badge ${statusBadge}`}>{f.status}</span></td>
                      <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(f.status === 'Pendente' || f.status === 'Vencido') && (
                          <button className="btn btn-success btn-sm" onClick={() => abrirModalPagamento(f)}>
                            <i className="las la-credit-card"></i> Pagar
                          </button>
                        )}
                        {f.status === 'Pago' && (
                          <button className="btn btn-info btn-sm" onClick={() => verRecibo(f)}>
                            <i className="las la-receipt"></i> Recibo
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => excluirFatura(f.id)}>
                          <i className="las la-trash"></i> Excluir
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <h3 className="section-title"><i className="las la-hospital"></i> Hospitais Cadastrados</h3>
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>CNPJ</th><th>Endereço</th><th>Telefone</th><th>Status</th><th>Usuários</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {hospitais.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum hospital cadastrado</td></tr>
              ) : (
                hospitais.map(h => {
                  const qtdUsuarios = usuarios.filter(u => u.hospitalId === h.id).length;
                  return (
                    <tr key={h.id}>
                      <td><strong>{h.nome}</strong></td>
                      <td>{h.cnpj || '-'}</td>
                      <td>{h.endereco || '-'}</td>
                      <td>{h.telefone || '-'}</td>
                      <td>
                        <span className={`badge ${h.ativo ? 'badge-ativo' : 'badge-inativo'}`}>
                          <i className={`las la-${h.ativo ? 'check' : 'times'}-circle`}></i> {h.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td><span className="badge badge-info">{qtdUsuarios} usuário(s)</span></td>
                      <td>
                        <button className={`btn ${h.ativo ? 'btn-danger' : 'btn-success'} btn-sm`} onClick={() => toggleHospital(h.id)}>
                          <i className={`las la-${h.ativo ? 'ban' : 'check'}`}></i> {h.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <h3 className="section-title"><i className="las la-users"></i> Usuários Cadastrados</h3>
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Cargo</th><th>Hospital</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum usuário cadastrado</td></tr>
              ) : (
                usuarios.map(u => {
                  const hosp = hospitais.find(h => h.id === u.hospitalId);
                  return (
                    <tr key={u.id}>
                      <td><strong>{u.nome}</strong></td>
                      <td>{u.email}</td>
                      <td>{formatarCargo(u.cargo)}</td>
                      <td>{hosp ? hosp.nome : <span style={{ color: '#dc2626' }}>Não encontrado</span>}</td>
                      <td>
                        <span className={`badge ${u.ativo ? 'badge-ativo' : 'badge-inativo'}`}>
                          <i className={`las la-${u.ativo ? 'check' : 'times'}-circle`}></i> {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <button className={`btn ${u.ativo ? 'btn-danger' : 'btn-success'} btn-sm`} onClick={() => toggleUsuario(u.id)}>
                          <i className={`las la-${u.ativo ? 'ban' : 'check'}`}></i> {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {modalPgOpen && pgFatura && (
        <div className="modal-verificacao">
          <div className="modal-verificacao-content modal-pagamento-body">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div className="lock-icon" style={{ color: '#16a34a', fontSize: '56px' }}><i className="las la-credit-card"></i></div>
              <h3 style={{ margin: '10px 0 0 0', color: '#0a1f44' }}>Registrar Pagamento</h3>
            </div>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <p><strong>Fatura:</strong> {pgFatura.id}</p>
              <p><strong>Hospital:</strong> {pgFatura.hospitalNome}</p>
              <p><strong>Valor:</strong> R$ {pgFatura.valor.toFixed(2)}</p>
            </div>

            <div className="form-grupo">
              <label>Data Pagamento</label>
              <input type="date" value={pgData} onChange={e => setPgData(e.target.value)} />
            </div>
            <div className="form-grupo">
              <label>Forma Pagamento</label>
              <select value={pgForma} onChange={e => setPgForma(e.target.value)}>
                <option>PIX</option><option>Boleto</option><option>Transferência</option><option>Cartão</option><option>Dinheiro</option>
              </select>
            </div>
            <div className="form-grupo">
              <label>Comprovante</label>
              <input type="text" value={pgComprovante} onChange={e => setPgComprovante(e.target.value)} placeholder="Nº de transação ou link" />
            </div>

            <button className="btn btn-success" onClick={confirmarPagamento} style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}>
              <i className="las la-check-circle"></i> Confirmar Pagamento
            </button>
            <button className="btn-logout" onClick={() => setModalPgOpen(false)} style={{ marginTop: '10px' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
