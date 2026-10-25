'use client';

import { useCallback, useEffect, useState } from 'react';
import { Droplet, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import './banco-sangue.css';

type EstoqueSangue = { id: string; tipo: string; quantidade: number; status: string };

export default function BancoSanguePage() {
  const [estoques, setEstoques] = useState<EstoqueSangue[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const response = await fetch('/api/banco-sangue');
      if (!response.ok) throw new Error('Não foi possível carregar o estoque do hospital.');
      const data = await response.json();
      setEstoques(Array.isArray(data) ? data : []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar estoque.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const adicionar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/banco-sangue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: form.get('tipo'), quantidade: Number(form.get('quantidade')) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível registrar o estoque.');
      event.currentTarget.reset();
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao registrar estoque.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="conteudo">
      <div className="bs-container">
        <header className="banner-bs" style={{ background: 'linear-gradient(135deg,#7c0101,#dc2626)', borderRadius: 8, padding: '28px 32px', color: 'white', marginBottom: 24 }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Droplet aria-hidden="true" /> Banco de Sangue</h1>
          <p style={{ marginBottom: 0 }}>Consulta e registro do estoque agregado de hemocomponentes deste hospital.</p>
        </header>

        <section aria-labelledby="estoque-titulo" style={{ background: 'white', padding: 24, borderRadius: 8, border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div><h2 id="estoque-titulo" style={{ margin: 0, color: '#0f172a' }}>Estoque registrado</h2><p style={{ color: '#475569', marginBottom: 0 }}>A base atual guarda apenas tipo sanguíneo, quantidade e faixa de estoque.</p></div>
            <button type="button" onClick={() => void carregar()} disabled={loading} aria-label="Atualizar estoque" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '10px 14px' }}><RefreshCw size={16} aria-hidden="true" /> Atualizar</button>
          </div>
          {erro && <p role="alert" style={{ color: '#b91c1c', marginTop: 16 }}>{erro}</p>}
          {loading ? <p role="status">Carregando estoque…</p> : estoques.length === 0 ? <p>Nenhum estoque cadastrado para este hospital.</p> : (
            <div style={{ overflowX: 'auto', marginTop: 20 }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr>{['Tipo sanguíneo', 'Quantidade registrada', 'Situação'].map(label => <th key={label} style={{ padding: 12, borderBottom: '1px solid #cbd5e1' }}>{label}</th>)}</tr></thead>
              <tbody>{estoques.map(item => <tr key={item.id}><td style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>{item.tipo}</td><td style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>{item.quantidade}</td><td style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>{item.status}</td></tr>)}</tbody>
            </table></div>
          )}
        </section>

        <section aria-labelledby="registrar-titulo" style={{ background: 'white', padding: 24, marginTop: 20, borderRadius: 8, border: '1px solid #cbd5e1' }}>
          <h2 id="registrar-titulo" style={{ marginTop: 0, color: '#0f172a' }}>Registrar quantidade</h2>
          <form onSubmit={adicionar} style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <label style={{ display: 'grid', gap: 6 }}>Tipo sanguíneo<select name="tipo" required style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }}><option value="">Selecione</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(tipo => <option key={tipo}>{tipo}</option>)}</select></label>
            <label style={{ display: 'grid', gap: 6 }}>Quantidade<input name="quantidade" type="number" min="0" step="1" required style={{ padding: 10, border: '1px solid #94a3b8', borderRadius: 6 }} /></label>
            <button type="submit" disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}><Plus size={16} aria-hidden="true" />{salvando ? 'Salvando…' : 'Registrar'}</button>
          </form>
        </section>

        <aside role="note" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 20, padding: 16, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 8 }}>
          <ShieldAlert size={20} aria-hidden="true" /><p style={{ margin: 0 }}><strong>Fluxos transfusionais indisponíveis.</strong> Rastreabilidade por bolsa, compatibilidade clínica, prescrição e administração não são persistidas no sistema atual. Esses fluxos permanecem desativados até implementação e validação institucional.</p>
        </aside>
      </div>
    </main>
  );
}
