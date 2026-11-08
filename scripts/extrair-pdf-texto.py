"""Extrai o texto de um PDF, página a página, com marcadores ##PAG n. Uso: python extrair-pdf-texto.py entrada.pdf saida.txt
Requer: python -m pip install pypdf"""
import sys
import pypdf

leitor = pypdf.PdfReader(sys.argv[1])
with open(sys.argv[2], "w", encoding="utf-8") as saida:
    saida.write("\n".join(f"##PAG {i + 1}\n" + (p.extract_text() or "") for i, p in enumerate(leitor.pages)))
print("páginas:", len(leitor.pages))
