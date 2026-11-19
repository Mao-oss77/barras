// ===== XP: LA MONEDA DE TODA LA APP =====
// Se gana al subir el maná de las barras: 100 XP por cada día de maná recargado
// (subir 10 % de una barra de 7 días = 0,7 días de maná = 70 XP). Sirve para la tienda.
// No mide si eres mejor o peor: solo cuenta lo que has hecho (como la experiencia de Minecraft).
//
// Se guarda como una lista de MOVIMIENTOS (lo que gané, lo que devolví con Deshacer, la bienvenida...).
// El saldo es la suma de todos. Nunca se borra ni se cambia un movimiento: solo se agregan,
// así lo ganado en el celular y en el PC se suma sin pisarse (nube.js los sube y los baja).
//
// Reglas:
// - Al 100 % la barra no da más (no hay nada que subir).
// - Si bajo una barra a mano, se devuelve el XP de su última llenada, en proporción a lo que bajé
//   (si me equivoqué de barra y la corrijo bajándola, no me quedo con XP de más).
// - Lo que bajé a mano y que NO venía de esa última llenada (XP de antes, que ya no se devuelve)
//   queda como "techo": volver a subir hasta ahí no da XP de nuevo. El techo también se vacía con el tiempo.
// - Tope de 500 XP al día sumando toda la app.
// - 300 XP de bienvenida.

const XP_POR_DIA_DE_MANA = 100;
const TOPE_XP_DIARIO = 500;
const XP_BIENVENIDA = 300;

// ===== MOVIMIENTOS =====
// Cada uno: { id, hora, cantidad, motivo, barra }
function leerMovimientos() {
  return JSON.parse(localStorage.getItem("xp-movimientos") || "[]");
}

function guardarMovimientos(movimientos) {
  localStorage.setItem("xp-movimientos", JSON.stringify(movimientos));
}

// Los que todavía no se han subido a la nube (nube.js los sube)
function leerPendientesXP() {
  return JSON.parse(localStorage.getItem("xp-pendientes") || "[]");
}

function guardarPendientesXP(ids) {
  localStorage.setItem("xp-pendientes", JSON.stringify(ids));
}

// Anota un movimiento nuevo y lo deja en la fila para subirlo
function nuevoMovimiento(cantidad, motivo, barra, id) {
  const movimiento = {
    id: id || Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    hora: Date.now(),
    cantidad: cantidad,
    motivo: motivo,
    barra: barra || null,
  };
  const movimientos = leerMovimientos();
  movimientos.push(movimiento);
  guardarMovimientos(movimientos);
  guardarPendientesXP(leerPendientesXP().concat(movimiento.id));
  pintarSaldo();
  return movimiento;
}

function saldoXP() {
  return leerMovimientos().reduce((suma, m) => suma + m.cantidad, 0);
}

// Lo que gané hoy llenando barras (lo devuelto con Deshacer o al bajar a mano se descuenta)
function ganadoHoy() {
  const hoy = new Date().toDateString();
  const deBarras = ["barra", "deshacer", "devuelto"];
  return leerMovimientos()
    .filter(m => deBarras.includes(m.motivo) && new Date(m.hora).toDateString() === hoy)
    .reduce((suma, m) => suma + m.cantidad, 0);
}

// ===== EL TECHO (BAJAR A MANO Y VOLVER A SUBIR) =====
// Se guarda igual que el nivel de una barra: la hora en que estaría llena a ese nivel.
// Así se va vaciando solo, al mismo ritmo que la barra.
function nivelDelTecho(id) {
  const guardado = localStorage.getItem(id + "-techo");
  if (guardado === null) return 0;
  const nivel = 100 - ((Date.now() - Number(guardado)) / leerDuracion(id)) * 100;
  return Math.max(0, nivel);
}

// La bajé a mano desde "antes": recuerdo ese punto (si ya había uno más alto, me quedo con ese)
function marcarTecho(id, antes) {
  if (nivelDelTecho(id) >= antes) return;
  const hora = Date.now() - (1 - antes / 100) * leerDuracion(id);
  localStorage.setItem(id + "-techo", Math.round(hora));
}

// ===== LA ÚLTIMA LLENADA =====
// De cada barra recuerdo su última llenada: cuánto XP dio y de qué parte de la barra vino
// (de qué nivel a qué nivel, y cuándo). Así sé cuánto devolver si la bajo a mano o la deshago.
function leerUltimaLlenada(id) {
  const guardado = localStorage.getItem(id + "-xpUltimo");
  if (guardado === null) return null;
  const llenada = JSON.parse(guardado);
  // Las de la versión anterior solo guardaban el número: sirven para Deshacer, no para bajar a mano
  return typeof llenada === "number" ? { xp: llenada, desde: null, hasta: null, hora: 0 } : llenada;
}

function guardarUltimaLlenada(id, llenada) {
  if (!llenada || llenada.xp <= 0) localStorage.removeItem(id + "-xpUltimo");
  else localStorage.setItem(id + "-xpUltimo", JSON.stringify(llenada));
}

// Cuánto ha bajado la barra sola desde esa hora (en puntos de 0 a 100)
function bajadaDesde(id, hora) {
  return ((Date.now() - hora) / leerDuracion(id)) * 100;
}

// ===== GANAR Y DEVOLVER =====
// La barra subió de "antes" a "despues" (de 0 a 100): da el XP que toque y lo anuncia.
function ganarXP(id, antes, despues) {
  localStorage.removeItem(id + "-xpBajada"); // Lo último que hice ya no es bajarla
  const techo = nivelDelTecho(id);
  const desde = Math.max(antes, techo);           // Lo que estaba por debajo del techo ya se había ganado
  if (despues >= techo) localStorage.removeItem(id + "-techo"); // Ya lo pasó: el techo sobra
  const diasDeMana = (Math.max(0, despues - desde) / 100) * (leerDuracion(id) / UNIDADES.dias);
  const completo = Math.round(diasDeMana * XP_POR_DIA_DE_MANA);
  const cabe = Math.max(0, TOPE_XP_DIARIO - ganadoHoy());
  const gana = Math.min(completo, cabe);

  if (gana > 0) {
    nuevoMovimiento(gana, "barra", id);
    guardarUltimaLlenada(id, { xp: gana, desde: desde, hasta: despues, hora: Date.now() });
    flotarXP(id, gana);
  } else {
    guardarUltimaLlenada(id, null);
  }
  // Si el tope no dejó ganar todo, aviso con calma (una vez al día)
  if (gana < completo) avisarTope();
  return gana;
}

// La bajé a mano de "antes" a "despues": devuelvo el XP de la parte de la última llenada que bajé.
// Ejemplo: la llené de 0 a 100 (200 XP) y me equivoqué de barra: la bajo a 0 y se devuelven los 200.
function bajarAMano(id, antes, despues) {
  const llenada = leerUltimaLlenada(id);
  // Recuerdo cómo estaba todo, por si deshago esta bajada
  localStorage.setItem(id + "-xpBajada", JSON.stringify({
    llenada: localStorage.getItem(id + "-xpUltimo"),
    techo: localStorage.getItem(id + "-techo"),
    devuelto: 0,
  }));

  let techoNuevo = antes; // Hasta dónde tenía XP ganado que no se devuelve
  if (llenada && llenada.desde !== null) {
    // Esa llenada también se ha ido vaciando con el tiempo, igual que la barra
    const bajo = bajadaDesde(id, llenada.hora);
    const arriba = Math.min(antes, llenada.hasta - bajo);
    const abajo = Math.max(despues, llenada.desde - bajo);
    const parte = Math.max(0, arriba - abajo);
    if (parte > 0) {
      const devuelto = Math.min(llenada.xp, Math.round(llenada.xp * parte / (llenada.hasta - llenada.desde)));
      if (devuelto > 0) {
        nuevoMovimiento(-devuelto, "devuelto", id);
        flotarXP(id, -devuelto);
        const bajada = JSON.parse(localStorage.getItem(id + "-xpBajada"));
        bajada.devuelto = devuelto;
        localStorage.setItem(id + "-xpBajada", JSON.stringify(bajada));
      }
      // Lo que queda de esa llenada es la parte de abajo, la que no bajé
      llenada.xp -= devuelto;
      llenada.hasta = abajo + bajo;
      guardarUltimaLlenada(id, llenada);
      techoNuevo = abajo; // Lo de arriba ya se devolvió: volver a subirlo sí da XP otra vez
    }
  }
  if (techoNuevo > despues) marcarTecho(id, techoNuevo);
}

// Deshacer: si lo último fue llenarla, devuelve lo que dio esa llenada;
// si lo último fue bajarla a mano, me regresa lo que se había devuelto y deja todo como estaba.
function devolverXP(id) {
  const bajada = localStorage.getItem(id + "-xpBajada");
  if (bajada !== null) {
    const antes = JSON.parse(bajada);
    localStorage.removeItem(id + "-xpBajada");
    if (antes.llenada === null) localStorage.removeItem(id + "-xpUltimo");
    else localStorage.setItem(id + "-xpUltimo", antes.llenada);
    if (antes.techo === null) localStorage.removeItem(id + "-techo");
    else localStorage.setItem(id + "-techo", antes.techo);
    if (antes.devuelto > 0) nuevoMovimiento(antes.devuelto, "deshacer", id);
    return;
  }
  const llenada = leerUltimaLlenada(id);
  guardarUltimaLlenada(id, null);
  if (llenada && llenada.xp > 0) nuevoMovimiento(-llenada.xp, "deshacer", id);
}

function avisarTope() {
  const hoy = new Date().toDateString();
  if (localStorage.getItem("xp-aviso-tope") === hoy) return;
  localStorage.setItem("xp-aviso-tope", hoy);
  mostrarAviso("Ya ganaste los " + TOPE_XP_DIARIO + " XP de hoy. Mañana sigues sumando.");
}

// ===== EN PANTALLA =====
// La pildorita de la cabecera
function pintarSaldo() {
  const numero = document.getElementById("saldo-xp-numero");
  if (numero) numero.textContent = saldoXP().toLocaleString("es-CO");
}

// Un "+70 XP" que sube desde la barra y se desvanece
function flotarXP(id, cantidad) {
  const barra = document.getElementById("barra-" + id);
  if (!barra) return;
  const caja = barra.getBoundingClientRect();
  const globo = document.createElement("span");
  globo.className = "xp-flotante";
  globo.textContent = (cantidad > 0 ? "+" : "−") + Math.abs(cantidad).toLocaleString("es-CO") + " XP";
  if (cantidad < 0) globo.classList.add("devuelto");
  globo.style.left = caja.left + caja.width / 2 + "px";
  globo.style.top = caja.top + "px";
  document.body.append(globo);
  globo.addEventListener("animationend", () => globo.remove());
  if (cantidad < 0) return; // Al devolver no hay saltito de alegría
  // La pildorita da un saltito
  const saldo = document.getElementById("saldo-xp");
  saldo.classList.remove("ganando");
  void saldo.offsetWidth;
  saldo.classList.add("ganando");
}

// ===== ARRANQUE =====
// Bienvenida: una sola vez. Tiene un id fijo, así aunque dos dispositivos la den antes de
// sincronizar, en la nube queda una sola (y al bajar, se juntan por id).
if (!leerMovimientos().some(m => m.id === "bienvenida")) {
  nuevoMovimiento(XP_BIENVENIDA, "bienvenida", null, "bienvenida");
}
pintarSaldo();

document.getElementById("saldo-xp").onclick = function () {
  mostrarAviso("Ganas XP al llenar tus barras. Hoy llevas " + Math.max(0, ganadoHoy()) + " de " + TOPE_XP_DIARIO + ".");
};
