'use client';

import { useEffect, useId, useState } from 'react';
import '@/components/ui/busca.css';

export type Cid10Item = { codigo: string; descricao: string };

/** Busca no CID-10 oficial. Escolher um item devolve "CÓDIGO - descrição" para o campo de diagnóstico. */
export default function BuscaCid({ onEscolher }: { onEscolher: (cid: Cid10Item) => void }) {
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState<Cid10Item[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const id = useId();
  const buscando = termo.trim().length >= 2;

  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) return;
    let ativo = true;
    const espera = setTimeout(async () => {
      setCarregando(true);
      try {
        const r = await fetch(`/api/cid10?q=${encodeURIComponent(t)}`);
        const dados = await r.json();
        if (!r.ok) throw new Error(dados.error || 'Não foi possível buscar.');
        if (ativo) { setLista(Array.isArray(dados) ? dados : []); setErro(''); }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro na busca.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }, 300);
    return () => { ativo = false; clearTimeout(espera); };
  }, [termo]);

  return (
    <div className="rec-busca-med">
      <label htmlFor={`${id}-cid`} className="rec-busca-rotulo">Buscar no CID-10</label>
      <input
        id={`${id}-cid`}
        type="search"
        autoComplete="off"
        placeholder="Código (J45, E11.9) ou nome da doença"
        value={termo}
        onChange={e => setTermo(e.target.value)}
        aria-controls={`${id}-lista`}
      />
      {buscando && carregando && <p className="mod-nota" role="status">Buscando…</p>}
      {buscando && erro && <p className="mod-aviso mod-aviso-erro" role="alert">{erro}</p>}
      {buscando && !carregando && !erro && lista.length === 0 && <p className="mod-nota" role="status">Nenhum código encontrado. Você pode escrever o diagnóstico à mão.</p>}
      {buscando && lista.length > 0 && (
        <ul id={`${id}-lista`} className="rec-busca-lista" aria-label="Resultados do CID-10">
          {lista.map(c => (
            <li key={c.codigo}>
              <button type="button" onClick={() => { onEscolher(c); setTermo(''); setLista([]); }}>
                <strong>{c.codigo}</strong> <span className="rec-busca-subst">{c.descricao}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
