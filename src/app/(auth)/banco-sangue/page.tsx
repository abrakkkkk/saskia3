'use client';

import { useCallback, useEffect, useState } from 'react';
import { Droplet, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import './banco-sangue.css';

type EstoqueSangue = { id: string; tipo: string; quantidade: number; status: string };

export default function BancoSanguePage() {
  const [estoques, setEstoques] = useState<EstoqueSangue[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [erroFormulario, setErroFormulario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroCarga('');
    try {
      const response = await fetch('/api/banco-sangue', { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar o estoque do hospital.');
      const data = await response.json();
      setEstoques(Array.isArray(data) ? data : []);
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Falha ao carregar estoque.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const adicionar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (salvando) return;
    const formElement = event.currentTarget;
    setSalvando(true);
    setErroFormulario('');
    setMensagem('');
    const form = new FormData(formElement);
    try {
      const response = await fetch('/api/banco-sangue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: form.get('tipo'), quantidade: Number(form.get('quantidade')) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível registrar o estoque.');
      formElement.reset();
      setMensagem('Quantidade registrada.');
      await carregar();
    } catch (error) {
      setErroFormulario(error instanceof Error ? error.message : 'Falha ao registrar estoque.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="conteudo">
      <div className="bs-container bs-page">
        <header className="banner-bs">
          <h1><Droplet aria-hidden="true" /> Banco de Sangue</h1>
          <p>Consulta e registro do estoque agregado de hemocomponentes deste hospital.</p>
        </header>

        <section className="bs-panel" aria-labelledby="estoque-titulo" aria-busy={loading}>
          <div className="bs-panel-header">
            <div><h2 id="estoque-titulo">Estoque registrado</h2><p>A base atual guarda apenas tipo sanguíneo, quantidade e faixa de estoque.</p></div>
            <button className="bs-button bs-button-secondary" type="button" onClick={() => void carregar()} disabled={loading} aria-label="Atualizar estoque"><RefreshCw size={16} aria-hidden="true" /> {loading ? 'Atualizando…' : 'Atualizar'}</button>
          </div>
          {loading ? <p className="bs-feedback" role="status">Carregando estoque…</p> : erroCarga ? <div className="bs-load-error"><p role="alert">{erroCarga}</p><button className="bs-button bs-button-secondary" type="button" onClick={() => void carregar()}>Tentar novamente</button></div> : estoques.length === 0 ? <p className="bs-empty">Nenhum estoque cadastrado para este hospital.</p> : (
            <div className="bs-table-wrap"><table className="bs-table">
              <caption className="sr-only">Estoque agregado de hemocomponentes por tipo sanguíneo</caption>
              <thead><tr>{['Tipo sanguíneo', 'Quantidade registrada', 'Situação'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{estoques.map(item => <tr key={item.id}><td>{item.tipo}</td><td>{item.quantidade}</td><td>{item.status}</td></tr>)}</tbody>
            </table></div>
          )}
        </section>

        <section className="bs-panel bs-register-panel" aria-labelledby="registrar-titulo">
          <h2 id="registrar-titulo">Registrar quantidade</h2>
          <form className="bs-form" onSubmit={adicionar}>
            <label>Tipo sanguíneo<select name="tipo" required><option value="">Selecione</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(tipo => <option key={tipo}>{tipo}</option>)}</select></label>
            <label>Quantidade<input name="quantidade" type="number" min="0" step="1" inputMode="numeric" required /></label>
            <button className="bs-button bs-button-primary" type="submit" disabled={salvando}><Plus size={16} aria-hidden="true" />{salvando ? 'Salvando…' : 'Registrar'}</button>
          </form>
          {erroFormulario && <p className="bs-form-error" role="alert">{erroFormulario}</p>}
          {mensagem && <p className="bs-success" role="status">{mensagem}</p>}
        </section>

        <aside className="bs-note" role="note">
          <ShieldAlert size={20} aria-hidden="true" /><p><strong>Fluxos transfusionais indisponíveis.</strong> Rastreabilidade por bolsa, compatibilidade clínica, prescrição e administração não são persistidas no sistema atual. Esses fluxos permanecem desativados até implementação e validação institucional.</p>
        </aside>
      </div>
    </main>
  );
}
