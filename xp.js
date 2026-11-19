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
// - Si bajo una barra a mano, se devuelve el XP que tenía adentro en la parte que bajé, aunque la haya
//   llenado por partes (si me equivoqué de barra y la corrijo bajándola, no me quedo con XP de más).
//   Subir y bajar una barra siempre me deja donde empecé.
// - Lo que bajé a mano y que no sé de qué llenada venía (de antes de esta regla) queda como "techo":
//   volver a subir hasta ahí no da XP de nuevo. El techo también se vacía con el tiempo.
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

// Lo que gané hoy llenando barras (lo devuelto con Deshacer o al bajar a mano se descuenta).
// Nunca baja de 0: devolver hoy XP que gané ayer no debe agrandar el tope de hoy.
function ganadoHoy() {
  const hoy = new Date().toDateString();
  const deBarras = ["barra", "deshacer", "devuelto"];
  const suma = leerMovimientos()
    .filter(m => deBarras.includes(m.motivo) && new Date(m.hora).toDateString() === hoy)
    .reduce((total, m) => total + m.cantidad, 0);
  return Math.max(0, suma);
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

// ===== LAS LLENADAS QUE TIENE ADENTRO =====
// De cada barra recuerdo sus llenadas que todavía no se han vaciado: cuánto XP dio cada una
// y de qué parte de la barra vino (de qué nivel a qué nivel, y cuándo).
// Así, si la bajo a mano, sé cuánto devolver aunque la haya llenado por partes.
function leerLlenadas(id) {
  return JSON.parse(localStorage.getItem(id + "-xpLlenadas") || "[]");
}

// Guarda la lista, olvidando las que ya se vaciaron solas con el tiempo
function guardarLlenadas(id, llenadas) {
  const vivas = llenadas.filter(l => l.xp > 0 && (l.desde === null || l.hasta - bajadaDesde(id, l.hora) > 0));
  if (vivas.length === 0) localStorage.removeItem(id + "-xpLlenadas");
  else localStorage.setItem(id + "-xpLlenadas", JSON.stringify(vivas));
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
    guardarLlenadas(id, leerLlenadas(id).concat({ xp: gana, desde: desde, hasta: despues, hora: Date.now() }));
    flotarXP(id, gana);
  }
  // Si el tope no dejó ganar todo, aviso con calma (una vez al día)
  if (gana < completo) avisarTope();
  return gana;
}

// La bajé a mano de "antes" a "despues": devuelvo el XP de todas las llenadas que tenía adentro
// en la parte que bajé. Ejemplo: la llené en dos partes (+238 y +67) y la bajo toda: se devuelven las dos.
function bajarAMano(id, antes, despues) {
  const llenadas = leerLlenadas(id);
  // Recuerdo cómo estaba todo, por si deshago esta bajada
  const comoEstaba = {
    llenadas: localStorage.getItem(id + "-xpLlenadas"),
    techo: localStorage.getItem(id + "-techo"),
    devuelto: 0,
  };

  let devuelto = 0;
  const tapados = []; // Las partes de lo que bajé que sí venían de una llenada (esas ya se devolvieron)
  for (const llenada of llenadas) {
    if (llenada.desde === null) continue; // De una versión vieja: no sé de qué parte vino
    // Cada llenada también se ha ido vaciando con el tiempo, igual que la barra
    const bajo = bajadaDesde(id, llenada.hora);
    const arriba = Math.min(antes, llenada.hasta - bajo);
    const abajo = Math.max(despues, llenada.desde - bajo);
    const parte = arriba - abajo;
    if (parte <= 0) continue;
    const esta = Math.min(llenada.xp, Math.round(llenada.xp * parte / (llenada.hasta - llenada.desde)));
    devuelto += esta;
    llenada.xp -= esta;
    llenada.hasta -= parte; // Se queda con lo de abajo, lo que no bajé
    tapados.push([abajo, arriba]);
  }
  guardarLlenadas(id, llenadas);

  if (devuelto > 0) {
    nuevoMovimiento(-devuelto, "devuelto", id);
    flotarXP(id, -devuelto);
    comoEstaba.devuelto = devuelto;
  }
  localStorage.setItem(id + "-xpBajada", JSON.stringify(comoEstaba));

  // Lo que bajé y que NO venía de ninguna llenada que recuerde es XP de antes: queda como techo.
  // Busco, desde arriba, el primer punto que no tape ninguna llenada.
  let punto = antes;
  tapados.sort((a, b) => b[1] - a[1]);
  for (const [abajo, arriba] of tapados) {
    if (arriba >= punto - 0.5) punto = Math.min(punto, abajo);
  }
  if (punto > despues + 0.5) marcarTecho(id, punto);
}

// Deshacer: si lo último fue llenarla, devuelve lo que dio esa llenada;
// si lo último fue bajarla a mano, me regresa lo que se había devuelto y deja todo como estaba.
function devolverXP(id) {
  const bajada = localStorage.getItem(id + "-xpBajada");
  if (bajada !== null) {
    const antes = JSON.parse(bajada);
    localStorage.removeItem(id + "-xpBajada");
    if (antes.llenadas === null) localStorage.removeItem(id + "-xpLlenadas");
    else localStorage.setItem(id + "-xpLlenadas", antes.llenadas);
    if (antes.techo === null) localStorage.removeItem(id + "-techo");
    else localStorage.setItem(id + "-techo", antes.techo);
    if (antes.devuelto > 0) nuevoMovimiento(antes.devuelto, "deshacer", id);
    return;
  }
  const llenadas = leerLlenadas(id);
  const ultima = llenadas.pop();
  guardarLlenadas(id, llenadas);
  if (ultima && ultima.xp > 0) nuevoMovimiento(-ultima.xp, "deshacer", id);
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
// Mudanza (una sola vez): antes solo se recordaba la última llenada ("-xpUltimo"), y los techos
// de esa regla vieja tapaban XP que ya se corrigió aparte. Empiezo limpio con la regla nueva.
if (localStorage.getItem("xp-reglas") !== "2") {
  for (const clave of Object.keys(localStorage)) {
    if (clave.endsWith("-xpUltimo") || clave.endsWith("-techo") || clave.endsWith("-xpBajada")) {
      localStorage.removeItem(clave);
    }
  }
  localStorage.setItem("xp-reglas", "2");
}

// Bienvenida: una sola vez. Tiene un id fijo, así aunque dos dispositivos la den antes de
// sincronizar, en la nube queda una sola (y al bajar, se juntan por id).
if (!leerMovimientos().some(m => m.id === "bienvenida")) {
  nuevoMovimiento(XP_BIENVENIDA, "bienvenida", null, "bienvenida");
}
pintarSaldo();

document.getElementById("saldo-xp").onclick = function () {
  mostrarAviso("Ganas XP al llenar tus barras. Hoy llevas " + Math.max(0, ganadoHoy()) + " de " + TOPE_XP_DIARIO + ".");
};
