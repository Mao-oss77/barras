// ===== RECORRIDO DE BIENVENIDA =====
// Oscurece la pantalla e ilumina una parte de la app a la vez, con un globito que la explica.
// Es solo para mirar: no hay que tocar nada para avanzar, y se puede saltar cuando sea.

// Cada paso: qué parte iluminar (o null para el centro) y qué decir
const PASOS_RECORRIDO = [
  {
    buscar: () => null,
    titulo: "¡Bienvenido! 💚",
    texto: "Cada barra es algo que te hace feliz. Mientras más llena, mejor estás en eso.",
  },
  {
    buscar: () => primeraTarjeta() && primeraTarjeta().querySelector(".barra"),
    titulo: "Se vacían solas",
    texto: "Con el tiempo bajan poco a poco. Es normal, no es un regaño: solo te recuerda volver a eso.",
  },
  {
    buscar: () => botonDeRellenar() || (primeraTarjeta() && primeraTarjeta().querySelector(".barra")),
    titulo: "Rellénalas",
    texto: "Cuando lo haces, la llenas con su botón. Algunas, en vez de botón, se llenan manteniendo el dedo y arrastrando hacia arriba.",
  },
  {
    buscar: () => document.getElementById("tarjeta-agregar"),
    titulo: "Agrega las tuyas",
    texto: "Con el + creas tus propias barras. En el ⋮ de cada una cambias cuánto tarda en vaciarse.",
  },
  {
    buscar: () => primeraTarjeta(),
    titulo: "Muévelas a tu gusto",
    texto: "Mantén presionada una tarjeta para cambiarla de lugar. Si la llevas a la papelera de abajo, se borra.",
  },
  {
    buscar: () => document.getElementById("pestanas"),
    titulo: "Grupos",
    texto: "Arriba puedes crear grupos para ordenar tus barras. Satisfacción siempre va primero.",
  },
  {
    buscar: () => document.getElementById("boton-menu-principal"),
    titulo: "El menú ☰",
    texto: "Todo funciona sin iniciar sesión, pero tus barras solo quedan en este celular. " +
           "Si inicias sesión, se guardan en la nube: no las pierdes si cambias de celular o se borran los datos, " +
           "y las ves en todos tus dispositivos. Aquí también puedes guardar un respaldo.",
  },
  {
    buscar: () => null,
    titulo: "¡Listo!",
    texto: "Haz lo que te hace feliz 💚 Si quieres ver esto otra vez, está en el menú ☰.",
  },
];

// La primera barra que se ve en pantalla (sin contar la de "Nueva barra")
function primeraTarjeta() {
  return Array.from(document.querySelectorAll("#panel .necesidad:not(.tarjeta-agregar)"))
    .find(tarjeta => tarjeta.offsetParent !== null) || null;
}

// El botón de rellenar de la primera barra que tenga uno visible
function botonDeRellenar() {
  const tarjetas = document.querySelectorAll("#panel .necesidad:not(.tarjeta-agregar)");
  for (const tarjeta of tarjetas) {
    const boton = tarjeta.querySelector('[id^="boton-"]');
    if (boton && boton.offsetParent !== null) return boton;
  }
  return null;
}

let pasoRecorrido = 0;

function abrirRecorrido() {
  mostrarGrupo(GRUPO_PRINCIPAL.id); // Siempre desde Satisfacción, que es donde están las barras de ejemplo
  document.getElementById("recorrido").hidden = false;
  pasoRecorrido = 0;
  pintarPasoRecorrido();
}

function cerrarRecorrido() {
  document.getElementById("recorrido").hidden = true;
  window.scrollTo(0, 0);
}

function pintarPasoRecorrido() {
  const paso = PASOS_RECORRIDO[pasoRecorrido];
  const ultimo = pasoRecorrido === PASOS_RECORRIDO.length - 1;
  document.getElementById("recorrido-cuenta").textContent = (pasoRecorrido + 1) + " de " + PASOS_RECORRIDO.length;
  document.getElementById("recorrido-titulo").textContent = paso.titulo;
  document.getElementById("recorrido-texto").textContent = paso.texto;
  document.getElementById("recorrido-siguiente").textContent = ultimo ? "¡Listo!" : "Siguiente";
  document.getElementById("recorrido-saltar").hidden = ultimo;

  const objetivo = paso.buscar();
  if (objetivo) objetivo.scrollIntoView({ block: "center" });
  acomodarFoco(objetivo);
}

// Pone el círculo de luz encima de la parte que toca, y el globito arriba o abajo de ella
function acomodarFoco(objetivo) {
  const foco = document.getElementById("recorrido-foco");
  const globo = document.getElementById("recorrido-globo");
  const margen = 6;

  if (!objetivo) {
    // Sin parte que iluminar: pantalla oscura y el globito en el centro
    foco.style.cssText = "top: 50%; left: 50%; width: 0; height: 0;";
    globo.style.top = Math.max(16, (window.innerHeight - globo.offsetHeight) / 2) + "px";
    return;
  }

  const caja = objetivo.getBoundingClientRect();
  foco.style.cssText =
    "top:" + (caja.top - margen) + "px; left:" + (caja.left - margen) + "px;" +
    "width:" + (caja.width + margen * 2) + "px; height:" + (caja.height + margen * 2) + "px;";

  // Si cabe debajo, va debajo; si no, encima
  const alto = globo.offsetHeight;
  const debajo = caja.bottom + margen + 12;
  const encima = caja.top - margen - 12 - alto;
  let arriba = debajo + alto <= window.innerHeight - 8 ? debajo : encima;
  globo.style.top = Math.max(8, Math.min(arriba, window.innerHeight - alto - 8)) + "px";
}

document.getElementById("recorrido-siguiente").onclick = function () {
  if (pasoRecorrido === PASOS_RECORRIDO.length - 1) return cerrarRecorrido();
  pasoRecorrido++;
  pintarPasoRecorrido();
};
document.getElementById("recorrido-saltar").onclick = cerrarRecorrido;

// Si el celular gira o cambia de tamaño, el foco se vuelve a acomodar
window.addEventListener("resize", function () {
  if (!document.getElementById("recorrido").hidden) acomodarFoco(PASOS_RECORRIDO[pasoRecorrido].buscar());
});

// Botón del menú ☰ para verlo cuando uno quiera
document.getElementById("ver-recorrido").onclick = function () {
  document.getElementById("menu-principal").hidden = true;
  abrirRecorrido();
};

// ===== OFRECERLO LA PRIMERA VEZ =====
// Solo a quien abre la app por primera vez (todavía no tiene barras guardadas),
// y una sola vez: diga que sí o que no, no se vuelve a preguntar.
// Si viene llegando del enlace del correo, no lo interrumpo: eso lo maneja nube.js.
const vieneDelCorreo = location.hash.includes("access_token") || location.hash.includes("error_description");
if (esPrimeraVez && !vieneDelCorreo && localStorage.getItem("recorrido-ofrecido") === null) {
  localStorage.setItem("recorrido-ofrecido", "si");
  document.getElementById("oferta-recorrido").hidden = false;
}
document.getElementById("oferta-si").onclick = function () {
  document.getElementById("oferta-recorrido").hidden = true;
  abrirRecorrido();
};
document.getElementById("oferta-no").onclick = function () {
  document.getElementById("oferta-recorrido").hidden = true;
};
