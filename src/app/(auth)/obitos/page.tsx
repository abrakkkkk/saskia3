'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './obitos.css';

export default function ObitosPage() {
  const { data: session } = useSession();
  const [tabAtiva, setTabAtiva] = useState('registro');
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [obitos, setObitos] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    nome: '',
    nascimento: '',
    cpf: '',
    sexo: '',
    data: '',
    hora: '',
    local: 'Hospitalar - Enfermaria',
    causa: '',
    causaSec: '',
    medico: '',
    prontuario: '',
    declaracaoObito: '',
    documentoAnexo: '',
    documentoBase64: '',
    responsavel: '',
    telefone: '',
    observacoes: ''
  });

  // Filtros
  const [buscaLista, setBuscaLista] = useState('');
  const [filtroMes, setFiltroMes] = useState('todos');

  // Modal
  const [modalVisualizar, setModalVisualizar] = useState<any>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/obitos');
      if (res.ok) {
        setObitos(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    const hoje = new Date().toISOString().split('T')[0];
    setForm(prev => ({ ...prev, data: hoje }));
  }, []);

  const registrarObito = async () => {
    if (!form.nome || !form.data || !form.hora || !form.causa || !form.medico) {
      alert(" Preencha os campos obrigatórios (*): Nome, Data, Hora, Causa Principal e Médico!");
      return;
    }

    const u = JSON.stringify(getSessionUser());
    const usuario = session?.user || (u ? JSON.parse(u) : null);

    const payload = {
      ...form,
      registradoPor: usuario?.name || usuario?.nome || "Sistema",
      dataRegistro: new Date().toLocaleString('pt-BR'),
      certidaoEmitida: false
    };

    try {
      const res = await fetch('/api/obitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Erro ao registrar óbito');

      limparFormulario();
      alert(" Óbito registrado com sucesso!");
      carregarDados();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setForm(prev => ({
          ...prev,
          documentoAnexo: file.name,
          documentoBase64: ev.target?.result as string
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const limparFormulario = () => {
    setForm({
      nome: '',
      nascimento: '',
      cpf: '',
      sexo: '',
      data: new Date().toISOString().split('T')[0],
      hora: '',
      local: 'Hospitalar - Enfermaria',
      causa: '',
      causaSec: '',
      medico: '',
      prontuario: '',
      declaracaoObito: '',
      documentoAnexo: '',
      documentoBase64: '',
      responsavel: '',
      telefone: '',
      observacoes: ''
    });
  };

  const emitirCertidao = async (id: string) => {
    if(!await confirm("Deseja emitir a certidão para este óbito?")) return;
    
    try {
      const res = await fetch(`/api/obitos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certidaoEmitida: true })
      });
      if (!res.ok) throw new Error('Erro ao emitir certidão');
      
      alert(" Certidão emitida com sucesso!");
      carregarDados();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const imprimirObito = (o: any) => {
    setModalVisualizar(o);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Filtros de Tabela
  let listaFiltrada = obitos.slice();
  if (filtroMes !== 'todos') {
    listaFiltrada = listaFiltrada.filter(o => {
      const mesObito = new Date(o.data + 'T00:00:00').getMonth() + 1;
      return mesObito === parseInt(filtroMes);
    });
  }
  if (buscaLista) {
    const t = buscaLista.toLowerCase();
    listaFiltrada = listaFiltrada.filter(o => 
      o.nome.toLowerCase().includes(t) || 
      o.causa.toLowerCase().includes(t) ||
      o.medico.toLowerCase().includes(t)
    );
  }

  const certidoesEmitidas = obitos.filter(o => o.certidaoEmitida);

  // Estatísticas
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const obitosMes = obitos.filter(o => {
    const d = new Date(o.data + 'T00:00:00');
    return (d.getMonth() + 1) === mesAtual && d.getFullYear() === anoAtual;
  }).length;
  
  const pendentes = obitos.filter(o => !o.certidaoEmitida).length;
  const emitidasCount = obitos.filter(o => o.certidaoEmitida).length;

  if (loading && obitos.length === 0) return <div>Carregando...</div>;

  return (
    <div className="conteudo">
      <div className="obitos-container">

        <div className="banner-obitos">
          <div>
            <h1><i className="las la-cross"></i> Registro de Óbitos</h1>
            <p>Controle e documentação de óbitos hospitalares</p>
          </div>
          <div>
            <button className="btn-obitos btn-primary" onClick={() => setTabAtiva('registro')}>
              <i className="las la-plus-circle"></i> Novo Registro
            </button>
          </div>
        </div>

        <div className="status-cards">
          <div className="status-card">
            <div className="card-icon"><i className="las la-cross"></i></div>
            <div className="card-numero">{obitos.length}</div>
            <div className="card-label">Total de Óbitos</div>
          </div>
          <div className="status-card">
            <div className="card-icon"><i className="las la-calendar-check"></i></div>
            <div className="card-numero">{obitosMes}</div>
            <div className="card-label">Este Mês</div>
          </div>
          <div className="status-card">
            <div className="card-icon"><i className="las la-file-medical-alt"></i></div>
            <div className="card-numero">{emitidasCount}</div>
            <div className="card-label">Certidões Emitidas</div>
          </div>
          <div className="status-card">
            <div className="card-icon" style={{color: '#f59e0b'}}><i className="las la-clock"></i></div>
            <div className="card-numero" style={{color: '#d97706'}}>{pendentes}</div>
            <div className="card-label">Pendentes de Emissão</div>
          </div>
        </div>

        <div className="tabs-obitos" id="ignorePrint">
          <button className={`tab-btn ${tabAtiva === 'registro' ? 'ativo' : ''}`} onClick={() => setTabAtiva('registro')}>
            <i className="las la-plus-circle"></i> Registrar
          </button>
          <button className={`tab-btn ${tabAtiva === 'listagem' ? 'ativo' : ''}`} onClick={() => setTabAtiva('listagem')}>
            <i className="las la-list"></i> Listagem
          </button>
          <button className={`tab-btn ${tabAtiva === 'certidoes' ? 'ativo' : ''}`} onClick={() => setTabAtiva('certidoes')}>
            <i className="las la-file-alt"></i> Certidões
          </button>
        </div>

        {tabAtiva === 'registro' && (
          <div className="form-obitos">
            <h3><i className="las la-cross"></i> Registrar Novo Óbito</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label><i className="las la-user"></i> Nome Completo *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome do falecido" />
              </div>
              <div className="form-grupo">
                <label><i className="las la-calendar"></i> Data Nascimento</label>
                <input type="date" value={form.nascimento} onChange={e => setForm({...form, nascimento: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label><i className="las la-id-card"></i> CPF</label>
                <input type="text" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} placeholder="000.000.000-00" />
              </div>
              <div className="form-grupo">
                <label><i className="las la-venus-mars"></i> Sexo</label>
                <select value={form.sexo} onChange={e => setForm({...form, sexo: e.target.value})}>
                  <option value="">Selecione...</option>
                  <option>Masculino</option>
                  <option>Feminino</option>
                </select>
              </div>
              <div className="form-grupo">
                <label><i className="las la-calendar-check"></i> Data do Óbito *</label>
                <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label><i className="las la-clock"></i> Horário *</label>
                <input type="time" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label><i className="las la-door-open"></i> Local</label>
                <select value={form.local} onChange={e => setForm({...form, local: e.target.value})}>
                  <option>Hospitalar - Enfermaria</option>
                  <option>Hospitalar - UTI</option>
                  <option>Hospitalar - Emergência</option>
                  <option>Hospitalar - Centro Cirúrgico</option>
                  <option>Domiciliar</option>
                  <option>Via Pública</option>
                  <option>Outro</option>
                </select>
              </div>
              <div className="form-grupo">
                <label><i className="las la-procedures"></i> Causa Principal *</label>
                <input type="text" value={form.causa} onChange={e => setForm({...form, causa: e.target.value})} placeholder="Ex: Choque Cardiogênico" />
              </div>
              <div className="form-grupo">
                <label><i className="las la-stethoscope"></i> Causas Secundárias</label>
                <input type="text" value={form.causaSec} onChange={e => setForm({...form, causaSec: e.target.value})} placeholder="Opcional" />
              </div>
              <div className="form-grupo">
                <label><i className="las la-user-md"></i> Médico Declarante *</label>
                <input type="text" value={form.medico} onChange={e => setForm({...form, medico: e.target.value})} placeholder="Nome e CRM" />
              </div>
              <div className="form-grupo">
                <label><i className="las la-file-medical"></i> Prontuário</label>
                <input type="text" value={form.prontuario} onChange={e => setForm({...form, prontuario: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label><i className="las la-certificate"></i> Nº Declaração de Óbito (D.O.)</label>
                <input type="text" value={form.declaracaoObito} onChange={e => setForm({...form, declaracaoObito: e.target.value})} placeholder="Ex: DO-12345678-9" />
              </div>
              <div className="form-grupo">
                <label><i className="las la-file-upload"></i> Documento Assinado pelo Médico (PDF / Foto)</label>
                <input type="file" accept=".pdf,image/*" onChange={handleFileChange} />
                {form.documentoAnexo && <small style={{ color: '#16a34a', display: 'block', marginTop: 4 }}> Anexado: {form.documentoAnexo}</small>}
              </div>
              <div className="form-grupo">
                <label><i className="las la-user-friends"></i> Responsável Familiar</label>
                <input type="text" value={form.responsavel} onChange={e => setForm({...form, responsavel: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label><i className="las la-phone"></i> Telefone do Responsável</label>
                <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} placeholder="(00) 00000-0000" />
              </div>
              <div className="form-grupo" style={{ gridColumn: '1 / -1' }}>
                <label><i className="las la-comment-medical"></i> Observações</label>
                <textarea rows={3} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}></textarea>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn-obitos btn-success" onClick={registrarObito}>
                <i className="las la-save"></i> Salvar Registro
              </button>
              <button className="btn-obitos btn-warning" onClick={limparFormulario}>
                <i className="las la-eraser"></i> Limpar Formulário
              </button>
            </div>
          </div>
        )}

        {tabAtiva === 'listagem' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por nome, causa, médico..." value={buscaLista} onChange={e => setBuscaLista(e.target.value)} />
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
                <option value="todos">Todos os Meses</option>
                <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option>
                <option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option>
                <option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option>
                <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
              </select>
            </div>
            
            <div>
              {listaFiltrada.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <i className="las la-cross" style={{ fontSize: '48px' }}></i>
                  <p>Nenhum registro encontrado</p>
                </div>
              ) : (
                listaFiltrada.map((o) => (
                  <div key={o.id} className="registro-card">
                    <div className="registro-header">
                      <h4><i className="las la-user"></i> {o.nome}</h4>
                      <span className={`badge ${o.certidaoEmitida ? 'badge-success' : 'badge-warning'}`}>
                        {o.certidaoEmitida ? 'Certidão Emitida' : 'Pendente Emissão'}
                      </span>
                    </div>
                    <div className="registro-info">
                      <p><i className="las la-calendar-check"></i> <strong>Óbito:</strong> {new Date(o.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {o.hora}</p>
                      <p><i className="las la-procedures"></i> <strong>Causa:</strong> {o.causa}</p>
                      <p><i className="las la-user-md"></i> <strong>Médico:</strong> {o.medico}</p>
                    </div>
                    <div className="registro-actions">
                      <button className="btn-obitos btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setModalVisualizar(o)}>
                        <i className="las la-eye"></i> Visualizar
                      </button>
                      {!o.certidaoEmitida && (
                        <button className="btn-obitos btn-success" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => emitirCertidao(o.id)}>
                          <i className="las la-file-alt"></i> Emitir Certidão
                        </button>
                      )}
                      <button className="btn-obitos btn-warning" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => imprimirObito(o)}>
                        <i className="las la-print"></i> Imprimir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tabAtiva === 'certidoes' && (
          <div>
            {certidoesEmitidas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <i className="las la-file-alt" style={{ fontSize: '48px' }}></i>
                <p>Nenhuma certidão emitida</p>
              </div>
            ) : (
              certidoesEmitidas.map((o) => (
                <div key={o.id} className="certidao-preview">
                  <h4>CERTIDÃO DE ÓBITO</h4>
                  <p style={{ lineHeight: '1.6' }}>
                    Certifico para os devidos fins que <strong>{o.nome}</strong>, faleceu nas dependências desta instituição 
                    no dia <strong>{new Date(o.data + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às <strong>{o.hora}</strong>, 
                    tendo como causa atestada: <strong>{o.causa}</strong>.
                  </p>
                  <p style={{ marginTop: '10px' }}>Médico Declarante: <strong>{o.medico}</strong></p>
                  <p style={{ textAlign: 'right', marginTop: '20px', fontSize: '12px', color: '#666' }}>
                    Emitido pelo sistema Saskia Saúde em: {new Date().toLocaleString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {modalVisualizar && (
        <div className="modal-obitos" onClick={(e) => { if(e.target === e.currentTarget) setModalVisualizar(null); }}>
          <div className="modal-obitos-conteudo" id="printArea">
            <h3 style={{ color: '#0a1f44', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              <i className="las la-cross"></i> Ficha de Registro de Óbito
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <p><strong>Nome:</strong> {modalVisualizar.nome}</p>
              <p><strong>Data Nasc.:</strong> {modalVisualizar.nascimento ? new Date(modalVisualizar.nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/I'}</p>
              <p><strong>CPF:</strong> {modalVisualizar.cpf || 'N/I'}</p>
              <p><strong>Sexo:</strong> {modalVisualizar.sexo || 'N/I'}</p>
              <p><strong>Data do Óbito:</strong> {new Date(modalVisualizar.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {modalVisualizar.hora}</p>
              <p><strong>Local:</strong> {modalVisualizar.local}</p>
              <p style={{ gridColumn: '1/-1' }}><strong>Causa Principal:</strong> {modalVisualizar.causa}</p>
              <p style={{ gridColumn: '1/-1' }}><strong>Causas Secundárias:</strong> {modalVisualizar.causaSec || 'N/A'}</p>
              <p><strong>Médico:</strong> {modalVisualizar.medico}</p>
              <p><strong>Prontuário:</strong> {modalVisualizar.prontuario || 'N/I'}</p>
              <p><strong>Nº Declaração Óbito (D.O.):</strong> {modalVisualizar.declaracaoObito || 'N/I'}</p>
              <p><strong>Responsável:</strong> {modalVisualizar.responsavel || 'N/I'}</p>
              <p><strong>Telefone Resp.:</strong> {modalVisualizar.telefone || 'N/I'}</p>
              {modalVisualizar.documentoBase64 && (
                <div style={{ gridColumn: '1/-1', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 600 }}>
                    <i className="las la-file-signature" style={{ fontSize: '18px', marginRight: '6px' }}></i> Documento Assinado pelo Médico Anexado
                  </span>
                  <a href={modalVisualizar.documentoBase64} download={modalVisualizar.documentoAnexo || 'declaracao_obito_assinada.pdf'} className="btn-obitos btn-success" style={{ padding: '6px 14px', fontSize: '12px', textDecoration: 'none' }}>
                    <i className="las la-download"></i> Baixar Arquivo ({modalVisualizar.documentoAnexo || 'Documento'})
                  </a>
                </div>
              )}
              <p style={{ gridColumn: '1/-1' }}><strong>Observações:</strong> {modalVisualizar.observacoes || 'Nenhuma'}</p>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}>
              <p><strong>Registrado por:</strong> {modalVisualizar.registradoPor} em {modalVisualizar.dataRegistro}</p>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }} id="ignorePrintActions">
              <button className="btn-obitos btn-warning" onClick={() => window.print()}>
                <i className="las la-print"></i> Imprimir Ficha
              </button>
              <button className="btn-obitos btn-primary" onClick={() => setModalVisualizar(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printArea, #printArea * { visibility: visible; }
          #printArea { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          #ignorePrint, #ignorePrintActions { display: none !important; }
        }
      `}} />

    </div>
  );
}
