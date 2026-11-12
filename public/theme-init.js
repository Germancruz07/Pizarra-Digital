// Aplica el tema guardado antes de pintar la página para evitar un destello claro.
// "pd:theme" solo existe si la persona aceptó guardar sus preferencias (ver banner de cookies).
(function () {
  try {
    var p = localStorage.getItem('pd:theme') || 'system';
    var dark = p === 'dark' || (p === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* almacenamiento no disponible */
  }
})();
