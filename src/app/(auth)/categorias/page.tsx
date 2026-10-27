'use client';
import { useState, useEffect, useCallback } from 'react';
import { Tags, Plus, Trash2, Tag } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Categoria {
  id: string;
  nome: string;
}

export default function CategoriasPage() {
  const { data: session, status: statusSessao } = useSession();
  const isAdmin = session?.user?.cargo === 'ADMIN';
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  
  const carregarCategorias = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/categorias');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erro ao buscar categorias.');
      setCategorias(data);
      setErro('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao buscar categorias.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (statusSessao === 'loading') return;
    if (!session?.user) {
      setCategorias([]);
      setErro('Entre novamente para consultar as categorias.');
      setCarregando(false);
      return;
    }
    void carregarCategorias();
  }, [statusSessao, session?.user, carregarCategorias]);

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !novaCategoria.trim()) return;

    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaCategoria.trim(), tipo: 'GERAL' })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erro ao criar categoria.');
      setNovaCategoria('');
      await carregarCategorias();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao criar categoria.');
    }
  };

  const handleRemoveCategoria = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Tem certeza que deseja remover esta categoria?')) {
      try {
        const res = await fetch(`/api/categorias/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          await carregarCategorias();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Erro ao remover categoria.');
        }
      } catch (e) {
        console.error(e);
        alert('Erro de conexão ao remover categoria.');
      }
    }
  };

  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-8 shadow-xl text-white gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tags aria-hidden="true" className="w-8 h-8 text-blue-300" />
            Gestão de Categorias
          </h1>
          <p className="text-slate-300 mt-2 font-medium">Organize e cadastre as categorias utilizadas no sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        {erro && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{erro}</p>}
        {isAdmin && <form onSubmit={handleAddCategoria} className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Tag aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              aria-label="Nome da categoria"
              type="text" 
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Ex: Cardiologia, Psiquiatria, Dermatologia..." 
              maxLength={100}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 text-white font-bold px-8 py-4 rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <Plus aria-hidden="true" className="w-5 h-5" />
            Adicionar
          </button>
        </form>}

        <div className="space-y-3">
          {!carregando && categorias.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 font-medium text-slate-700">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Tag aria-hidden="true" className="w-5 h-5" />
                </div>
                {cat.nome}
              </div>
              {isAdmin && <button
                onClick={() => handleRemoveCategoria(cat.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                title="Remover Categoria"
                aria-label={`Remover categoria ${cat.nome}`}
              >
                <Trash2 aria-hidden="true" className="w-5 h-5" />
              </button>}
            </div>
          ))}
          
          {carregando && <p role="status" className="text-center py-12 text-slate-400">Carregando categorias...</p>}
          {!carregando && categorias.length === 0 && !erro && (
            <div className="text-center py-12 text-slate-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
              Nenhuma categoria cadastrada.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
