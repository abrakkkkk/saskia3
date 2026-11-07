'use client';

import { useEffect, useState } from 'react';
import type { CategoriaDocumento, DocumentoItem } from '@/lib/documentos';

/** Documentos de uma categoria do acervo (catálogo no banco, arquivos no Blob privado). */
export function useDocumentos(categoria: CategoriaDocumento) {
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    fetch(`/api/documentos?categoria=${categoria}`)
      .then(async r => {
        const dados = await r.json();
        if (!r.ok) throw new Error(dados.error || 'Não foi possível carregar os documentos.');
        return dados;
      })
      .then(dados => { if (ativo) setDocumentos(Array.isArray(dados) ? dados : []); })
      .catch(e => { if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os documentos.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [categoria]);

  return { documentos, carregando, erro };
}
