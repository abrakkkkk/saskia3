'use client';
import { useEffect, useRef } from 'react';
import './categorias.css';

export default function CategoriasPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = ``;
        document.body.appendChild(scriptEl);

        return () => {
            if (scriptEl.parentNode) {
                scriptEl.parentNode.removeChild(scriptEl);
            }
        };
    }, []);

    return (
        <div 
            className="migrated-page-container" 
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: `<div class="conteudo">
<h2><i class="las la-tags"></i> Categorias</h2>

<input placeholder="Nova categoria">
<button>Adicionar</button>

<p>Ex: Diabetes, Hipertensão, Pediatria...</p>
</div>` }} 
        />
    );
}
