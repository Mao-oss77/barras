// ===== AYUDANTE DE LA APP INSTALADA (service worker) =====
// Guarda una copia de los archivos de la app para que abra aunque no haya internet.
// Siempre intenta traer lo más nuevo primero; la copia solo se usa si no hay conexión.
// Los datos de las barras NO pasan por aquí: esos siguen en la libreta y en la nube.

const COPIA = "barras-copia";

// Al instalarse, empieza a trabajar de una vez (sin esperar a que se cierre la app)
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (evento) {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (evento) {
  const pedido = evento.request;
  const direccion = new URL(pedido.url);
  // Solo me encargo de leer archivos de la app y de la librería de Supabase.
  // Lo que se habla con la nube (iniciar sesión, guardar barras) pasa directo.
  const esDeLaApp = direccion.origin === self.location.origin;
  const esLibreria = direccion.hostname === "cdn.jsdelivr.net";
  if (pedido.method !== "GET" || (!esDeLaApp && !esLibreria)) return;

  evento.respondWith(
    fetch(pedido)
      .then(function (respuesta) {
        // Llegó lo nuevo: guardo una copia para la próxima vez sin internet
        // ("opaque" es como llega la librería de Supabase, que viene de otra página)
        if (respuesta.ok || respuesta.type === "opaque") {
          const copia = respuesta.clone();
          caches.open(COPIA).then(function (cajon) { cajon.put(pedido, copia); });
        }
        return respuesta;
      })
      .catch(function () {
        // Sin internet: uso la copia (para la página, sirve la de inicio)
        return caches.match(pedido).then(function (guardada) {
          return guardada || (pedido.mode === "navigate" ? caches.match("./") : undefined);
        });
      })
  );
});
