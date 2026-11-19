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
// - Si bajo una barra a mano y la vuelvo a subir, solo cuenta lo que pase por encima
//   de donde estaba antes de bajarla (ese punto, "el techo", también se va vaciando con el tiempo).
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

// Lo que gané hoy llenando barras (lo devuelto con Deshacer se descuenta)
function ganadoHoy() {
  const hoy = new Date().toDateString();
  return leerMovimientos()
    .filter(m => (m.motivo === "barra" || m.motivo === "deshacer") && new Date(m.hora).toDateString() === hoy)
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

// ===== GANAR Y DEVOLVER =====
// La barra subió de "antes" a "despues" (de 0 a 100): da el XP que toque y lo anuncia.
// Guarda cuánto dio, para que Deshacer lo pueda devolver.
function ganarXP(id, antes, despues) {
  const techo = nivelDelTecho(id);
  const desde = Math.max(antes, techo);           // Lo que estaba por debajo del techo ya se había ganado
  if (despues >= techo) localStorage.removeItem(id + "-techo"); // Ya lo pasó: el techo sobra
  const diasDeMana = (Math.max(0, despues - desde) / 100) * (leerDuracion(id) / UNIDADES.dias);
  const completo = Math.round(diasDeMana * XP_POR_DIA_DE_MANA);
  const cabe = Math.max(0, TOPE_XP_DIARIO - ganadoHoy());
  const gana = Math.min(completo, cabe);

  if (gana > 0) {
    nuevoMovimiento(gana, "barra", id);
    localStorage.setItem(id + "-xpUltimo", gana);
    flotarXP(id, gana);
  } else {
    localStorage.removeItem(id + "-xpUltimo");
  }
  // Si el tope no dejó ganar todo, aviso con calma (una vez al día)
  if (gana < completo) avisarTope();
  return gana;
}

// Deshacer: devuelve lo que dio la última llenada de esa barra
function devolverXP(id) {
  const dio = Number(localStorage.getItem(id + "-xpUltimo") || 0);
  localStorage.removeItem(id + "-xpUltimo");
  if (dio > 0) nuevoMovimiento(-dio, "deshacer", id);
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
  globo.textContent = "+" + cantidad.toLocaleString("es-CO") + " XP";
  globo.style.left = caja.left + caja.width / 2 + "px";
  globo.style.top = caja.top + "px";
  document.body.append(globo);
  globo.addEventListener("animationend", () => globo.remove());
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
