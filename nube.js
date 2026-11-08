// ===== NUBE (SUPABASE): INICIAR SESIÓN Y GUARDAR LAS BARRAS EN INTERNET =====
// Sin sesión, la app funciona igual que siempre: todo vive en la libreta (localStorage) de este dispositivo.
// Con sesión, además se guarda una copia en la nube, para no perder nada y poder verla en otro celular.
//
// Cómo se mantienen iguales la libreta y la nube (aunque use varios dispositivos):
// - Grupos y barras: siempre bajo lo de la nube y lo JUNTO con lo de aquí, barra por barra.
//   Para saber quién cambió qué, guardo cómo quedaron la última vez que estuvieron iguales ("nube-subido"):
//   si una barra cambió solo aquí, gana la de aquí; si cambió solo allá, gana la de allá;
//   si cambió en los dos, gana la que se usó más recientemente. Nunca se reemplaza todo de golpe.
// - Historial: cada anotación (y cada Deshacer) entra a una fila de "pendientes" que se sube en orden
//   (si no hay internet, se guarda para después). Después bajo el historial de la nube, que trae
//   lo que anoté en los otros dispositivos.
// - Sincronizo al abrir la app, al volver a ella, cada vez que cambio algo y cada minuto.

// Dirección del proyecto y llave pública. Esta llave está hecha para ir aquí, a la vista:
// lo que protege los datos son las reglas de las tablas (ver supabase/tablas.sql).
// La llave secreta ("secret" o "service_role") NUNCA va en este archivo.
const NUBE_URL = "https://ibjvvxqrxvpjajibyyyl.supabase.co";
const NUBE_LLAVE = "sb_publishable_dOQUWhAi4zBJssqo9OMT7g_4Ur0psWV";

// Cada cuánto reviso si hay algo nuevo que subir (milisegundos)
const CADA_CUANTO_SUBIR = 5000;

// Cada cuánto traigo lo nuevo de otros dispositivos mientras la app está abierta (milisegundos)
const CADA_CUANTO_BAJAR = 60000;

// Cuántas filas de historial subo de una vez cuando subo todo el historial
const FILAS_POR_TANDA = 500;

// Cómo venía la dirección al abrir (si vengo del enlace del correo, trae la sesión o un error al final).
// La guardo antes de conectar, porque la librería la limpia.
const finalDeLaDireccion = location.hash;

// La conexión con la nube (si la librería no cargó, por ejemplo sin internet, queda en null)
// "implicit": el enlace del correo trae la sesión adentro, así funciona aunque lo abra en otro navegador
const nube = typeof supabase !== "undefined"
  ? supabase.createClient(NUBE_URL, NUBE_LLAVE, { auth: { flowType: "implicit" } })
  : null;

// La persona que inició sesión (null si nadie)
let usuario = null;

// Para no sincronizar dos veces al mismo tiempo
let sincronizando = false;

// Dice si este dispositivo ya quedó enlazado con la cuenta (ya se eligió qué barras usar).
// Mientras no, no subo ni bajo nada, para no pisar las barras de la nube por accidente.
function nubeLista() {
  return usuario !== null && localStorage.getItem("nube-lista") === "si";
}

// ===== CÓMO SE VEN LAS FILAS EN LA NUBE =====
// Arma, a partir de la libreta, las filas de grupos y barras tal como van en la nube
function filasLocales() {
  return {
    grupos: grupos.map((grupo, i) => ({
      user_id: usuario.id,
      id: grupo.id,
      nombre: grupo.nombre,
      orden: i,
    })),
    barras: actividades.map((actividad, i) => ({
      user_id: usuario.id,
      id: actividad.id,
      grupo_id: actividad.grupo,
      nombre: actividad.nombre,
      boton: actividad.boton,
      tipo: actividad.tipo,
      duracion: leerDuracion(actividad.id),
      unidad: localStorage.getItem(actividad.id + "-unidad") || "dias",
      ultima_vez: leerUltimaVez(actividad.id),
      rellenos: leerRegistro(actividad.id),
      orden: i,
      creada: actividad.creada || null,
    })),
  };
}

// Arma las mismas filas, pero a partir de lo que bajé de la nube
// (así puedo comparar las dos y saber si algo cambió)
function filasDeLaNube(datos) {
  return {
    grupos: datos.grupos.map(g => ({
      user_id: usuario.id,
      id: g.id,
      nombre: g.nombre,
      orden: g.orden,
    })),
    barras: datos.barras.map(b => ({
      user_id: usuario.id,
      id: b.id,
      grupo_id: b.grupo_id,
      nombre: b.nombre,
      boton: b.boton,
      tipo: b.tipo,
      duracion: Number(b.duracion),
      unidad: b.unidad,
      ultima_vez: Number(b.ultima_vez),
      rellenos: b.rellenos,
      orden: b.orden,
      creada: b.creada === null ? null : Number(b.creada),
    })),
  };
}

// ===== SUBIR =====
// Si algo devolvió error, lo lanzo para que quien llamó se entere y no siga
function revisar(respuesta) {
  if (respuesta.error) throw respuesta.error;
  return respuesta;
}

// Borra de una tabla mis filas cuya columna NO esté en la lista (las que ya no existen en la libreta)
async function borrarLasQueNoEsten(tabla, columna, ids) {
  let consulta = nube.from(tabla).delete().eq("user_id", usuario.id);
  if (ids.length > 0) {
    consulta = consulta.not(columna, "in", "(" + ids.map(id => '"' + id + '"').join(",") + ")");
  }
  revisar(await consulta);
}

// Sube estas filas tal cual (grupos y barras) y borra en la nube lo que ya no está en ellas
// (y el historial de las barras que ya no existen)
async function subirFilas(filas) {
  revisar(await nube.from("grupos").upsert(filas.grupos));
  revisar(await nube.from("barras").upsert(filas.barras));
  const idsBarras = filas.barras.map(b => b.id);
  await borrarLasQueNoEsten("barras", "id", idsBarras);
  await borrarLasQueNoEsten("historial", "barra_id", idsBarras);
  await borrarLasQueNoEsten("grupos", "id", filas.grupos.map(g => g.id));
}

// Sube TODO el historial de la libreta (al enlazar un dispositivo, o la primera vez con esta versión)
// Si alguna fila ya estaba en la nube, se salta
async function subirHistorialCompleto() {
  const filas = [];
  for (const actividad of actividades) {
    for (const [hora, antes, despues] of leerHistorial(actividad.id)) {
      filas.push({ user_id: usuario.id, barra_id: actividad.id, hora: hora, antes: antes, despues: despues });
    }
  }
  await subirFilasDeHistorial(filas);
}

async function subirFilasDeHistorial(filas) {
  for (let i = 0; i < filas.length; i += FILAS_POR_TANDA) {
    revisar(await nube.from("historial").upsert(filas.slice(i, i + FILAS_POR_TANDA), { ignoreDuplicates: true }));
  }
}

// ===== PENDIENTES DEL HISTORIAL =====
function leerPendientes() {
  return JSON.parse(localStorage.getItem("nube-pendientes") || "[]");
}

function guardarPendientes(pendientes) {
  localStorage.setItem("nube-pendientes", JSON.stringify(pendientes));
}

// app.js me avisa cada vez que anota algo en el historial.
// Miro solo la marca de la libreta (no si ya cargó la sesión): así no se escapa
// lo que anote en el primer segundo después de abrir, mientras la sesión todavía está cargando.
function nubeAnotar(id, fila) {
  if (localStorage.getItem("nube-lista") !== "si") return;
  const pendientes = leerPendientes();
  pendientes.push({ accion: "anotar", barra: id, hora: fila[0], antes: fila[1], despues: fila[2] });
  guardarPendientes(pendientes);
}

// app.js me avisa cada vez que Deshacer borra algo del historial
function nubeBorrar(id, hora) {
  if (localStorage.getItem("nube-lista") !== "si") return;
  const pendientes = leerPendientes();
  pendientes.push({ accion: "borrar", barra: id, hora: hora });
  guardarPendientes(pendientes);
}

// Sube los pendientes en orden, uno por uno. Si uno falla (sin internet), para y lo intenta después.
async function subirPendientes() {
  while (leerPendientes().length > 0) {
    const p = leerPendientes()[0];
    if (p.accion === "anotar") {
      const fila = { user_id: usuario.id, barra_id: p.barra, hora: p.hora, antes: p.antes, despues: p.despues };
      revisar(await nube.from("historial").upsert(fila, { ignoreDuplicates: true }));
    } else {
      revisar(await nube.from("historial").delete()
        .eq("user_id", usuario.id).eq("barra_id", p.barra).eq("hora", p.hora));
    }
    // Lo quito de la fila (vuelvo a leerla: mientras subía pudieron llegar pendientes nuevos)
    const pendientes = leerPendientes();
    pendientes.shift();
    guardarPendientes(pendientes);
  }
}

// ===== BAJAR =====
// Trae de la nube mis grupos y barras, en orden
async function bajarTodo() {
  const respuestaGrupos = revisar(await nube.from("grupos").select("id, nombre, orden").order("orden"));
  const respuestaBarras = revisar(await nube.from("barras").select("*").order("orden"));
  return { grupos: respuestaGrupos.data, barras: respuestaBarras.data };
}

// Trae todo mi historial de la nube (de a 1000 filas, que es lo máximo que entrega de una vez)
async function bajarHistorial() {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const respuesta = revisar(await nube.from("historial")
      .select("barra_id, hora, antes, despues")
      .order("barra_id").order("hora")
      .range(desde, desde + 999));
    filas.push(...respuesta.data);
    if (respuesta.data.length < 1000) return filas;
  }
}

// Escribe en la libreta los grupos y barras que quedaron (después hay que recargar la página para verlo)
function escribirEnLibreta(datos) {
  // Las barras que ya no están se borran de la libreta
  for (const actividad of actividades) {
    if (!datos.barras.some(b => b.id === actividad.id)) borrarDatos(actividad.id);
  }
  const nuevas = datos.barras.map(function (b) {
    const actividad = { id: b.id, nombre: b.nombre, boton: b.boton, grupo: b.grupo_id, tipo: b.tipo };
    if (b.creada !== null) actividad.creada = Number(b.creada);
    return actividad;
  });
  localStorage.setItem("actividades", JSON.stringify(nuevas));
  localStorage.setItem("grupos", JSON.stringify(datos.grupos.map(g => ({ id: g.id, nombre: g.nombre }))));
  for (const b of datos.barras) {
    // Si la última vez cambió (la llené en otro dispositivo), el Deshacer de aquí ya no aplica
    if (localStorage.getItem(b.id + "-ultimaVez") !== String(b.ultima_vez)) {
      localStorage.removeItem(b.id + "-anterior");
    }
    localStorage.setItem(b.id + "-ultimaVez", b.ultima_vez);
    localStorage.setItem(b.id + "-duracion", b.duracion);
    localStorage.setItem(b.id + "-unidad", b.unidad);
    localStorage.setItem(b.id + "-registro", JSON.stringify(b.rellenos));
  }
  // Anoto que la nube y la libreta quedaron iguales
  localStorage.setItem("nube-subido", JSON.stringify(filasDeLaNube(datos)));
}

// ===== JUNTAR LO DE AQUÍ CON LO DE LA NUBE =====
// Una fila sin su puesto (el orden se junta aparte), para comparar si cambió
function sinOrden(fila) {
  const copia = Object.assign({}, fila);
  delete copia.orden;
  return JSON.stringify(copia);
}

// Dos versiones de la misma barra cambiaron: gana la que se usó más recientemente,
// y los rellenos (para los niveles) se suman sin repetir
function combinarBarras(aqui, alla) {
  const ganadora = Number(alla.ultima_vez) > Number(aqui.ultima_vez) ? alla : aqui;
  const rellenos = Array.from(new Set([...(aqui.rellenos || []), ...(alla.rellenos || [])])).sort((a, b) => a - b);
  return Object.assign({}, ganadora, { rellenos: rellenos });
}

// Junta dos listas (grupos o barras) que se identifican por su id.
// "base" es cómo estaban la última vez que quedaron iguales; si es null (primera vez), no se borra nada:
// se queda todo lo que haya en cualquiera de los dos lados.
function juntarLista(base, aqui, alla, combinar) {
  const mapa = lista => new Map((lista || []).map(fila => [fila.id, fila]));
  const B = mapa(base), A = mapa(aqui), N = mapa(alla);
  const juntas = new Map();
  for (const id of new Set([...A.keys(), ...N.keys()])) {
    const b = B.get(id), a = A.get(id), n = N.get(id);
    if (!base || !b) {
      // Primera vez, o algo nuevo: se queda (y si está en los dos lados, se combinan)
      juntas.set(id, a && n ? combinar(a, n) : (a || n));
      continue;
    }
    const cambioAqui = !a || sinOrden(a) !== sinOrden(b);
    const cambioAlla = !n || sinOrden(n) !== sinOrden(b);
    if (!a) { if (cambioAlla) juntas.set(id, n); continue; }  // La borré aquí (se queda solo si la cambiaron allá)
    if (!n) { if (cambioAqui) juntas.set(id, a); continue; }  // La borraron allá (se queda solo si la cambié aquí)
    if (cambioAqui && cambioAlla) juntas.set(id, combinar(a, n));
    else juntas.set(id, cambioAlla ? n : a);
  }

  // El orden: si solo cambió allá (o es la primera vez), uso el de allá; si no, el de aquí.
  // Lo que no esté en ese orden va al final, en el orden del otro lado.
  const ids = lista => (lista || []).map(fila => fila.id);
  const ordenCambioAlla = base && JSON.stringify(ids(alla)) !== JSON.stringify(ids(base));
  const ordenCambioAqui = base && JSON.stringify(ids(aqui)) !== JSON.stringify(ids(base));
  const usoElDeAlla = !base || (ordenCambioAlla && !ordenCambioAqui);
  const elegido = usoElDeAlla ? ids(alla) : ids(aqui);
  const otro = usoElDeAlla ? ids(aqui) : ids(alla);
  const puesto = id => elegido.includes(id) ? elegido.indexOf(id) : elegido.length + otro.indexOf(id);
  return Array.from(juntas.values())
    .sort((x, y) => puesto(x.id) - puesto(y.id))
    .map((fila, i) => Object.assign({}, fila, { orden: i }));
}

function juntar(base, aqui, alla) {
  const juntas = {
    grupos: juntarLista(base && base.grupos, aqui.grupos, alla.grupos, a => a),
    barras: juntarLista(base && base.barras, aqui.barras, alla.barras, combinarBarras),
  };
  // Satisfacción siempre va primero
  const principal = juntas.grupos.findIndex(g => g.id === GRUPO_PRINCIPAL.id);
  if (principal > 0) juntas.grupos.unshift(juntas.grupos.splice(principal, 1)[0]);
  juntas.grupos.forEach((g, i) => { g.orden = i; });
  // Si una barra quedó en un grupo que se borró, la mando a Satisfacción
  for (const barra of juntas.barras) {
    if (!juntas.grupos.some(g => g.id === barra.grupo_id)) barra.grupo_id = GRUPO_PRINCIPAL.id;
  }
  return juntas;
}

// El historial: queda el de la nube (que ya trae lo de todos los dispositivos),
// más lo que anoté aquí después de la última vez que bajé y que por alguna razón no subió (ese lo subo)
async function sincronizarHistorial(idsBarras) {
  const ultimaBajada = Number(localStorage.getItem("nube-historial-bajado") || 0);
  const ahora = Date.now();
  const deLaNube = {};
  for (const fila of await bajarHistorial()) {
    (deLaNube[fila.barra_id] = deLaNube[fila.barra_id] || []).push([Number(fila.hora), fila.antes, fila.despues]);
  }
  const faltan = [];
  for (const id of idsBarras) {
    const enLaNube = deLaNube[id] || [];
    const horas = new Set(enLaNube.map(fila => fila[0]));
    const soloAqui = leerHistorial(id).filter(fila => fila[0] > ultimaBajada && !horas.has(fila[0]));
    for (const [hora, antes, despues] of soloAqui) {
      faltan.push({ user_id: usuario.id, barra_id: id, hora: hora, antes: antes, despues: despues });
    }
    const todo = enLaNube.concat(soloAqui).sort((x, y) => x[0] - y[0]);
    localStorage.setItem(id + "-historial", JSON.stringify(todo));
  }
  await subirFilasDeHistorial(faltan);
  localStorage.setItem("nube-historial-bajado", ahora);
}

// ===== SINCRONIZAR =====
// Sube lo pendiente, baja lo de la nube, lo junta con lo de aquí, y sube lo que quedó.
// Si llegó algo nuevo de otro dispositivo, vuelve a abrir la app para mostrarlo.
async function sincronizar() {
  if (!nubeLista() || sincronizando) return;
  sincronizando = true;
  try {
    await subirPendientes();
    // La primera vez con esta versión no confío en lo anotado antes: junto sin borrar nada
    // y subo todo el historial de aquí (por si a la nube le falta algo)
    const primeraVez = localStorage.getItem("nube-version") !== "2";
    if (primeraVez) await subirHistorialCompleto();
    const base = primeraVez ? null : JSON.parse(localStorage.getItem("nube-subido") || "null");

    const aqui = filasLocales();
    const alla = filasDeLaNube(await bajarTodo());
    const juntas = juntar(base, aqui, alla);
    if (JSON.stringify(juntas) !== JSON.stringify(alla)) await subirFilas(juntas);

    const cambiaAqui = JSON.stringify(juntas) !== JSON.stringify(aqui);
    if (cambiaAqui) escribirEnLibreta(juntas);
    else localStorage.setItem("nube-subido", JSON.stringify(juntas));

    await sincronizarHistorial(juntas.barras.map(b => b.id));
    localStorage.setItem("nube-version", "2");
    if (cambiaAqui) location.reload(); // Algo cambió en otro dispositivo: vuelvo a abrir con lo nuevo
  } catch (error) {
    console.warn("No se pudo sincronizar (se intenta otra vez después):", error.message);
  }
  sincronizando = false;
}

// Dice si estoy en medio de algo (arrastrando, escribiendo, con un menú o el informe abierto),
// para no recargar la página encima
function estoyOcupado() {
  const activo = document.activeElement;
  return document.querySelector(".levantada, .agarrada") !== null
    || (activo !== null && ["INPUT", "SELECT", "TEXTAREA"].includes(activo.tagName))
    || Array.from(document.querySelectorAll(".ajustes, [id^='opciones-']")).some(caja => !caja.hidden)
    || !document.getElementById("menu-principal").hidden
    || !document.getElementById("informe").hidden
    || !document.getElementById("recorrido").hidden;
}

// Cada pocos segundos: si cambié algo aquí, sincronizo
function sincronizarSiCambio() {
  if (!nubeLista()) return;
  const cambie = leerPendientes().length > 0
    || JSON.stringify(filasLocales()) !== localStorage.getItem("nube-subido");
  if (cambie) sincronizar();
}

// ===== ENLAZAR ESTE DISPOSITIVO CON LA CUENTA =====
// Justo después de entrar. Si este dispositivo es nuevo (nunca tocó sus barras) y la nube ya tiene,
// tomo las de la nube. Si no, junto las de aquí con las de la nube, sin borrar ninguna.
async function enlazarDispositivo() {
  localStorage.removeItem("nube-subido");
  localStorage.removeItem("nube-version");
  localStorage.removeItem("nube-historial-bajado");
  guardarPendientes([]);
  const conteo = revisar(await nube.from("barras").select("id", { count: "exact", head: true }));
  if (conteo.count > 0 && localStorage.getItem("actividades") === null) {
    escribirEnLibreta(await bajarTodo());
    localStorage.setItem("nube-lista", "si");
    location.reload(); // Al abrir otra vez, sincronizar() baja también el historial
    return;
  }
  localStorage.setItem("nube-lista", "si");
  await sincronizar();
}

// ===== VENTANA DE INICIAR SESIÓN =====
function abrirVentana() {
  document.getElementById("ventana-sesion").hidden = false;
}

function cerrarVentana() {
  document.getElementById("ventana-sesion").hidden = true;
  mostrarPaso("paso-correo");
}

// Muestra solo uno de los pasos de la ventana y borra el mensaje de abajo
function mostrarPaso(paso) {
  for (const id of ["paso-correo", "paso-enlace"]) {
    document.getElementById(id).hidden = id !== paso;
  }
  avisar("");
}

// Escribe un mensaje debajo de la ventana
function avisar(texto) {
  document.getElementById("mensaje-sesion").textContent = texto;
}

// Traduce los errores más comunes a algo que se entienda
function explicarError(error) {
  const mensaje = (error.message || "").toLowerCase();
  if (mensaje.includes("rate") || mensaje.includes("seconds")) return "Espera un momento antes de pedir otro enlace.";
  if (mensaje.includes("expired") || mensaje.includes("invalid")) return "El enlace ya venció o ya se usó. Pide otro.";
  if (mensaje.includes("fetch") || mensaje.includes("network")) return "No hay conexión a internet.";
  return "Algo salió mal: " + error.message;
}

// Pone el botón del menú ☰ según haya sesión o no
function pintarSesion() {
  const boton = document.getElementById("boton-sesion");
  if (!nube) {
    boton.textContent = "👤 Iniciar sesión (sin conexión)";
    boton.disabled = true;
  } else if (usuario) {
    boton.textContent = "👤 Cerrar sesión (" + usuario.email + ")";
  } else {
    boton.textContent = "👤 Iniciar sesión";
  }
}

// Cierra la sesión. Las barras se quedan en este dispositivo; solo deja de guardarse en la nube.
async function cerrarSesion() {
  if (!confirm("¿Cerrar sesión? Tus barras se quedan en este dispositivo, pero dejan de guardarse en la nube.")) return;
  await nube.auth.signOut();
  for (const clave of ["nube-lista", "nube-subido", "nube-pendientes", "nube-version", "nube-historial-bajado"]) {
    localStorage.removeItem(clave);
  }
}

// ===== ARRANQUE =====
if (nube) {
  // Botón del menú ☰: abre la ventana, o cierra la sesión si ya hay una
  document.getElementById("boton-sesion").onclick = function () {
    document.getElementById("menu-principal").hidden = true;
    if (usuario) {
      cerrarSesion();
    } else {
      abrirVentana();
    }
  };

  document.getElementById("cerrar-ventana").onclick = cerrarVentana;

  // Paso 1: pedir el enlace al correo. El enlace trae de vuelta a esta misma página.
  // (Cuando haya correo propio, se puede cambiar por un código de números: queda mejor en la app instalada)
  document.getElementById("enviar-enlace").onclick = async function () {
    const correo = document.getElementById("correo").value.trim();
    if (!correo.includes("@")) {
      avisar("Escribe un correo válido.");
      return;
    }
    avisar("Enviando…");
    const { error } = await nube.auth.signInWithOtp({
      email: correo,
      options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname },
    });
    if (error) {
      avisar(explicarError(error));
      return;
    }
    mostrarPaso("paso-enlace");
    avisar("Enviado a " + correo + ".");
  };

  // Paso 2 pasa en el correo: al tocar el enlace, la página se abre ya con la sesión
  // y el arranque de abajo se encarga de enlazar este dispositivo.

  document.getElementById("otro-correo").onclick = function () {
    mostrarPaso("paso-correo");
  };

  // Cuando la sesión empieza o termina, acomodo el menú
  nube.auth.onAuthStateChange(function (evento, sesion) {
    usuario = sesion ? sesion.user : null;
    pintarSesion();
  });

  // Al abrir: si ya había sesión (o vengo del enlace del correo), sincronizo,
  // o enlazo este dispositivo si todavía no estaba enlazado
  nube.auth.getSession().then(function ({ data }) {
    // Si vengo de un enlace que no sirvió (vencido o ya usado), aviso
    if (finalDeLaDireccion.includes("error_description")) {
      abrirVentana();
      avisar("El enlace ya venció o ya se usó. Pide otro.");
    }
    // Limpio la dirección: el enlace deja datos de la sesión pegados al final
    if (location.hash.includes("access_token") || location.hash.includes("error")) {
      history.replaceState(null, "", location.pathname);
    }

    usuario = data.session ? data.session.user : null;
    pintarSesion();
    if (!usuario) return;
    if (localStorage.getItem("nube-lista") === "si") {
      sincronizar();
    } else {
      enlazarDispositivo().catch(error => console.warn("No se pudo enlazar:", error.message));
    }
  });

  // Al volver a la app (por ejemplo, desde otra app del celular), traigo lo nuevo
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") sincronizar();
  });

  // Cada pocos segundos subo lo que haya cambiado aquí...
  setInterval(sincronizarSiCambio, CADA_CUANTO_SUBIR);
  // ...y cada minuto, si la app está a la vista y no estoy en medio de algo, traigo lo de otros dispositivos
  setInterval(function () {
    if (document.visibilityState === "visible" && !estoyOcupado()) sincronizar();
  }, CADA_CUANTO_BAJAR);
} else {
  pintarSesion();
}
