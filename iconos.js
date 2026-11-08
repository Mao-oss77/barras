// ===== ÍCONOS =====
// Dibujitos de línea (no emojis), todos del mismo estilo: trazo redondeado que toma el color de la letra.
// Cada uno es el dibujo de un cuadro de 24x24.
// En el HTML se ponen así: <span data-icono="borrar"></span>  (al cargar la página se cambia por el dibujo).
// En JavaScript se usa icono("borrar"), que devuelve el dibujo listo para meter con innerHTML.

const ICONOS = {
  menu:         '<path d="M4 6h16M4 12h16M4 18h16"/>',
  puntos:       '<circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>',
  cerrar:       '<path d="M6 6l12 12M18 6L6 18"/>',
  informe:      '<path d="M3 21h18M7 17v-6M12 17V6M17 17v-9"/>',
  guardar:      '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  cargar:       '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
  editar:       '<path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4zM13.5 6.5l4 4"/>',
  borrar:       '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  usuario:      '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  personalizar: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="14.5" cy="7" r="1" fill="currentColor"/><circle cx="17" cy="10.5" r="1" fill="currentColor"/>',
  recorrido:    '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  instalar:     '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 7v7M9.5 11.5L12 14l2.5-2.5"/>',
  nube:         '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 10.5a3.75 3.75 0 0 1-.5 7.5z"/>',
  celular:      '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  sincronizar:  '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.5 4.5l1.5-2M20 20v-4.5h-4.5"/>',
  correo:       '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7.5l8.5 6 8.5-6"/>',
  destello:     '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  sol:          '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna:         '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  camara:       '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  listo:        '<path d="M5 12.5l4.5 4.5L19 7"/>',
  mas:          '<path d="M12 5v14M5 12h14"/>',
  ajustes:      '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  arrastrar:    '<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>',
  corazon:      '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
};

function icono(nombre) {
  return '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[nombre] + "</svg>";
}

// Cambia los <span data-icono="..."> de la página por su dibujo
document.addEventListener("DOMContentLoaded", function () {
  for (const lugar of document.querySelectorAll("[data-icono]")) {
    lugar.outerHTML = icono(lugar.dataset.icono);
  }
});
