/** Descripciones en texto de los elementos del lienzo, para lectores de pantalla. */
export function describeElement(el) {
  switch (el.type) {
    case 'text':
      return `Texto: «${(el.text || '').replace(/\s+/g, ' ').trim()}»`;
    case 'image':
      return el.alt ? `Imagen: ${el.alt}` : 'Imagen sin descripción';
    case 'rect':
      return el.fillEnabled ? 'Rectángulo con relleno' : 'Rectángulo';
    case 'ellipse':
      return el.fillEnabled ? 'Elipse con relleno' : 'Elipse';
    case 'triangle':
      return el.fillEnabled ? 'Triángulo con relleno' : 'Triángulo';
    case 'line':
    case 'arrow':
      if (el.arrowStart && el.arrowEnd) return 'Flecha doble';
      if (el.arrowStart || el.arrowEnd) return 'Flecha';
      return 'Línea';
    case 'freedraw':
      return 'Trazo a mano alzada';
    default:
      return 'Elemento';
  }
}

/** Texto alternativo por defecto a partir del nombre del archivo: "foto-clase_2.jpg" → "foto clase 2". */
export function altFromFileName(name = '') {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
}
