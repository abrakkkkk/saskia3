'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  status: string;
  classificacao: string;
  leitoTipo?: string;
  leitoNumero?: string;
  nascimento?: string;
}

export default function BuscarPacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/pacientes')
      .then(r => r.json())
      .then(data => {
        setPacientes(data);
        setCarregando(false);
      });
      
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const pacientesFiltrados = termoBusca.length >= 2 ? pacientes.filter(p => {
    const termo = termoBusca.toLowerCase();
    return p.nome.toLowerCase().includes(termo) || 
           (p.cpf && p.cpf.replace(/\D/g, '').includes(termo.replace(/\D/g, '')));
  }) : [];

  const temBusca = termoBusca.length >= 2;

  const calcularIdade = (dataNasc?: string) => {
    if (!dataNasc) return 'Idade n/a';
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return `${idade} anos`;
  };

  const badgeClass = (classificacao: string) => {
    switch (classificacao) {
      case 'Vermelho': return 'bg-red-100 text-red-700 border-red-200';
      case 'Amarelo': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Verde': return 'bg-green-100 text-green-700 border-green-200';
      case 'Azul': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: temBusca ? 'flex-start' : 'center',
      padding: '40px 20px',
      transition: 'all 0.4s ease-in-out'
    }}>
      
      {/* Container Central da Busca */}
      <div style={{ 
        width: '100%', 
        maxWidth: '700px', 
        textAlign: 'center',
        transform: temBusca ? 'translateY(0)' : 'translateY(-50px)',
        transition: 'all 0.4s ease'
      }}>
        
        {!temBusca && (
          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '40px', 
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 20px auto', color: 'white', fontSize: '40px',
              boxShadow: '0 10px 25px rgba(37,99,235,0.3)'
            }}>
              <i className="las la-search"></i>
            </div>
            <h2 style={{ fontSize: '28px', color: 'white', marginBottom: '10px' }}>Busca Global de Pacientes</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px' }}>Digite o nome ou CPF para localizar qualquer paciente no hospital.</p>
          </div>
        )}

        <div style={{ 
          position: 'relative', 
          boxShadow: temBusca ? '0 4px 15px rgba(0,0,0,0.05)' : '0 10px 30px rgba(0,0,0,0.2)', 
          borderRadius: '24px',
          background: 'white',
          border: '1px solid #e2e8f0',
          transition: 'all 0.3s ease'
        }}>
          <i className="las la-search" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px', color: '#64748b' }}></i>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Ex: João da Silva ou 123.456.789-00" 
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '20px 20px 20px 60px',
              fontSize: '18px',
              border: 'none',
              borderRadius: '24px',
              outline: 'none',
              background: 'transparent',
              color: '#0f172a'
            }}
          />
          {termoBusca && (
            <button 
              onClick={() => setTermoBusca('')}
              style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '24px', cursor: 'pointer' }}
            >
              <i className="las la-times-circle"></i>
            </button>
          )}
        </div>
      </div>

      {/* Resultados da Busca */}
      {temBusca && (
        <div style={{ width: '100%', maxWidth: '900px', marginTop: '40px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ marginBottom: '20px', color: 'white', fontWeight: 500 }}>
            {pacientesFiltrados.length} {pacientesFiltrados.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </div>

          {pacientesFiltrados.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
              {pacientesFiltrados.map(paciente => (
                <div key={paciente.id} className="card hover-elevate" style={{ display: 'flex', flexDirection: 'column', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9', background: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{paciente.nome}</h3>
                      <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '14px' }}>
                        <span><i className="las la-id-card"></i> {paciente.cpf || 'Sem CPF'}</span>
                        <span>&bull;</span>
                        <span><i className="las la-birthday-cake"></i> {calcularIdade(paciente.nascimento)}</span>
                      </div>
                    </div>
                    <span className="status-badge" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                      {paciente.status}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Localização Atual</div>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        {paciente.status === 'Internado' && paciente.leitoNumero 
                          ? `${paciente.leitoTipo || 'Leito'} - ${paciente.leitoNumero}` 
                          : paciente.status === 'Recepção' ? 'Aguardando Atendimento'
                          : paciente.status === 'Em Triagem' ? 'Sala de Triagem'
                          : paciente.status === 'Alta' ? 'Paciente Liberado'
                          : 'Setor Não Informado'}
                      </div>
                    </div>
                    {paciente.classificacao && (
                      <div className={`status-badge ${badgeClass(paciente.classificacao)}`} style={{ borderWidth: '1px' }}>
                        {paciente.classificacao}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link href={`/pacientes/${paciente.id}`} className="btn btn-primary" style={{ padding: '8px 20px', width: '100%' }}>
                      <i className="las la-folder-open"></i> Acessar Prontuário
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }}><i className="las la-search-minus"></i></div>
              <h3 style={{ fontSize: '18px', color: '#475569', marginBottom: '8px' }}>Nenhum paciente encontrado</h3>
              <p style={{ color: '#94a3b8' }}>Tente buscar por outro nome ou verifique se o CPF foi digitado corretamente.</p>
            </div>
          )}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hover-elevate { transition: all 0.2s ease; }
        .hover-elevate:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: #cbd5e1 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
