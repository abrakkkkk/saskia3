'use client';
import { useState, useEffect } from 'react';
import { Tags, Plus, Trash2, Tag } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Categoria {
  id: string;
  nome: string;
}

export default function CategoriasPage() {
  const { data: session } = useSession();
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  
  const carregarCategorias = async () => {
    try {
      const res = await fetch('/api/categorias');
      if (res.ok) {
        const data = await res.json();
        setCategorias(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarCategorias();
  }, []);

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;

    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaCategoria.trim(), tipo: 'GERAL' })
      });
      if (res.ok) {
        setNovaCategoria('');
        carregarCategorias();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveCategoria = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta categoria?')) {
      try {
        const res = await fetch(`/api/categorias/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          carregarCategorias();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-8 shadow-xl text-white gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tags className="w-8 h-8 text-blue-300" />
            Gestão de Categorias
          </h1>
          <p className="text-slate-300 mt-2 font-medium">Organize e cadastre as categorias utilizadas no sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <form onSubmit={handleAddCategoria} className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Ex: Cardiologia, Psiquiatria, Dermatologia..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-4 rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Adicionar
          </button>
        </form>

        <div className="space-y-3">
          {categorias.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 font-medium text-slate-700">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                {cat.nome}
              </div>
              <button 
                onClick={() => handleRemoveCategoria(cat.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Remover Categoria"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          
          {categorias.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
              Nenhuma categoria cadastrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
