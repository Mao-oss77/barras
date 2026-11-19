// ===== AYUDANTE DE LA APP INSTALADA (service worker) =====
// Guarda una copia de los archivos de la app para que abra rápido y aunque no haya internet.
// Los datos de las barras NO pasan por aquí: esos siguen en la libreta y en la nube.
//
// Cómo decide de dónde sacar cada archivo:
// - Los que tienen versión (app.js?v=13, la librería de Supabase, las letras): primero la copia.
//   Nunca cambian (si cambian, cambia el número), así que no hace falta preguntarle a internet.
// - La página principal: primero internet, para que lleguen las actualizaciones;
//   pero si internet tarda, uso la copia para no dejar a la persona esperando.
// - Lo demás (íconos, manifest): primero internet, y la copia si no hay conexión.

const COPIA = "barras-copia";

// Cuánto espero a internet antes de abrir la página con la copia (milisegundos)
const ESPERA_PAGINA = 1500;

// Al instalarse, empieza a trabajar de una vez (sin esperar a que se cierre la app)
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (evento) {
  evento.waitUntil(self.clients.claim());
});

// Guarda una respuesta en la copia ("opaque" es como llegan las cosas de otras páginas, como Supabase).
// Si es un archivo con versión, borra las versiones viejas de ese mismo archivo para no llenar el celular.
function guardarCopia(pedido, respuesta) {
  if (!respuesta.ok && respuesta.type !== "opaque") return;
  const copia = respuesta.clone();
  caches.open(COPIA).then(async function (cajon) {
    const direccion = new URL(pedido.url);
    if (direccion.origin === self.location.origin && direccion.searchParams.has("v")) {
      for (const vieja of await cajon.keys()) {
        const otra = new URL(vieja.url);
        if (otra.pathname === direccion.pathname && otra.search !== direccion.search) cajon.delete(vieja);
      }
    }
    cajon.put(pedido, copia);
  });
}

// Primero internet; si no hay conexión, la copia
function primeroInternet(pedido) {
  return fetch(pedido)
    .then(function (respuesta) {
      guardarCopia(pedido, respuesta);
      return respuesta;
    })
    .catch(function () {
      return caches.match(pedido);
    });
}

// Primero la copia; si no la tengo, internet (y la guardo)
function primeroCopia(pedido) {
  return caches.match(pedido).then(function (guardada) {
    return guardada || primeroInternet(pedido);
  });
}

// La página: internet, pero sin esperar más de ESPERA_PAGINA si ya tengo una copia
function pagina(pedido) {
  const deInternet = fetch(pedido).then(function (respuesta) {
    guardarCopia(pedido, respuesta);
    return respuesta;
  });
  const deLaCopia = new Promise(function (listo) {
    setTimeout(function () {
      caches.match(pedido).then(function (guardada) {
        return guardada || caches.match("./");
      }).then(function (guardada) {
        if (guardada) listo(guardada);
      });
    }, ESPERA_PAGINA);
  });
  // Gana la que llegue primero; si internet falla del todo, también sirve la copia
  return Promise.race([deInternet, deLaCopia]).catch(function () {
    return caches.match(pedido).then(guardada => guardada || caches.match("./"));
  });
}

self.addEventListener("fetch", function (evento) {
  const pedido = evento.request;
  const direccion = new URL(pedido.url);
  // Solo me encargo de leer archivos de la app, la librería de Supabase y la letra (Google Fonts).
  // Lo que se habla con la nube (iniciar sesión, guardar barras) pasa directo.
  const esDeLaApp = direccion.origin === self.location.origin;
  const esLibreria = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"].includes(direccion.hostname);
  if (pedido.method !== "GET" || (!esDeLaApp && !esLibreria)) return;

  if (pedido.mode === "navigate") {
    evento.respondWith(pagina(pedido));
  } else if (esLibreria || direccion.searchParams.has("v")) {
    evento.respondWith(primeroCopia(pedido));
  } else {
    evento.respondWith(primeroInternet(pedido));
  }
});
