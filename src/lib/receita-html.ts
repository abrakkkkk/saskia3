// Limpeza do HTML do editor de receita (só formatação básica e adesivos locais). A API repete a limpeza no servidor.
const ALLOWED_RECIPE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'IMG']);
const DROP_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE']);

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

export function sanitizeRecipeHtml(value: string) {
  if (typeof window === 'undefined') return escapeHtml(value);
  const document = new DOMParser().parseFromString(value, 'text/html');
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (!ALLOWED_RECIPE_TAGS.has(element.tagName)) {
      if (DROP_CONTENT_TAGS.has(element.tagName)) element.remove();
      else element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      if (!src.startsWith('/adesivos/') || src.includes('..') || src.includes('\\')) {
        element.remove();
        continue;
      }
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute('src', src);
      element.setAttribute('alt', alt.slice(0, 120));
    } else {
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
    }
  }
  return document.body.innerHTML;
}
