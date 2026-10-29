// ===== NUBE (SUPABASE): INICIAR SESIÓN Y GUARDAR LAS BARRAS EN INTERNET =====
// Sin sesión, la app funciona igual que siempre: todo vive en la libreta (localStorage) de este dispositivo.
// Con sesión, además se guarda una copia en la nube, para no perder nada y poder verla en otro celular.
//
// Cómo se mantienen iguales la libreta y la nube:
// - Grupos y barras: cada pocos segundos comparo cómo están con lo último que subí; si algo cambió, subo todo.
// - Historial: cada anotación (y cada Deshacer) entra a una fila de "pendientes" que se sube en orden.
//   Así, si no hay internet, se guarda para después y no se pierde nada.
// - Al abrir la app (o volver a ella): si quedaron cambios sin subir, gana este dispositivo y los subo;
//   si no, gana la nube y bajo lo que haya (por si lo cambié en otro celular).

// Dirección del proyecto y llave pública. Esta llave está hecha para ir aquí, a la vista:
// lo que protege los datos son las reglas de las tablas (ver supabase/tablas.sql).
// La llave secreta ("secret" o "service_role") NUNCA va en este archivo.
const NUBE_URL = "https://ibjvvxqrxvpjajibyyyl.supabase.co";
const NUBE_LLAVE = "sb_publishable_dOQUWhAi4zBJssqo9OMT7g_4Ur0psWV";

// Cada cuánto reviso si hay algo nuevo que subir (milisegundos)
const CADA_CUANTO_SUBIR = 5000;

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

// Sube grupos y barras si cambiaron desde la última vez (o siempre, si "aunqueNoCambien")
// También borra en la nube lo que ya no está en la libreta (y el historial de esas barras)
async function subirTodo(aunqueNoCambien) {
  const filas = filasLocales();
  const huella = JSON.stringify(filas);
  if (!aunqueNoCambien && huella === localStorage.getItem("nube-subido")) return; // Nada nuevo

  revisar(await nube.from("grupos").upsert(filas.grupos));
  revisar(await nube.from("barras").upsert(filas.barras));
  const idsBarras = filas.barras.map(b => b.id);
  await borrarLasQueNoEsten("barras", "id", idsBarras);
  await borrarLasQueNoEsten("historial", "barra_id", idsBarras);
  await borrarLasQueNoEsten("grupos", "id", filas.grupos.map(g => g.id));

  localStorage.setItem("nube-subido", huella); // Anoto cómo quedó la nube
}

// Sube TODO el historial de la libreta (al enlazar un dispositivo por primera vez)
// Si alguna fila ya estaba en la nube, se salta
async function subirHistorialCompleto() {
  const filas = [];
  for (const actividad of actividades) {
    for (const [hora, antes, despues] of leerHistorial(actividad.id)) {
      filas.push({ user_id: usuario.id, barra_id: actividad.id, hora: hora, antes: antes, despues: despues });
    }
  }
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

// app.js me avisa cada vez que anota algo en el historial
function nubeAnotar(id, fila) {
  if (!nubeLista()) return;
  const pendientes = leerPendientes();
  pendientes.push({ accion: "anotar", barra: id, hora: fila[0], antes: fila[1], despues: fila[2] });
  guardarPendientes(pendientes);
}

// app.js me avisa cada vez que Deshacer borra algo del historial
function nubeBorrar(id, hora) {
  if (!nubeLista()) return;
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

// Escribe en la libreta lo que bajé de la nube (después hay que recargar la página para verlo)
function escribirEnLibreta(datos) {
  // Las barras que ya no están en la nube se borran de la libreta
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
    localStorage.setItem(b.id + "-ultimaVez", b.ultima_vez);
    localStorage.setItem(b.id + "-duracion", b.duracion);
    localStorage.setItem(b.id + "-unidad", b.unidad);
    localStorage.setItem(b.id + "-registro", JSON.stringify(b.rellenos));
    localStorage.removeItem(b.id + "-anterior"); // El Deshacer de antes ya no aplica
  }
  // Anoto que la nube y la libreta quedaron iguales
  localStorage.setItem("nube-subido", JSON.stringify(filasDeLaNube(datos)));
}

// ===== SINCRONIZAR =====
// Al abrir la app o volver a ella: si hay cambios sin subir, los subo; si no, bajo lo de la nube
async function sincronizar() {
  if (!nubeLista() || sincronizando) return;
  sincronizando = true;
  try {
    await subirPendientes();
    const hayCambiosSinSubir = JSON.stringify(filasLocales()) !== localStorage.getItem("nube-subido");
    if (hayCambiosSinSubir) {
      await subirTodo();
    } else {
      const datos = await bajarTodo();
      if (JSON.stringify(filasDeLaNube(datos)) !== JSON.stringify(filasLocales())) {
        escribirEnLibreta(datos);
        location.reload(); // Algo cambió en otro dispositivo: vuelvo a abrir con lo nuevo
      }
    }
  } catch (error) {
    console.warn("No se pudo sincronizar (se intenta otra vez después):", error.message);
  }
  sincronizando = false;
}

// Cada pocos segundos: subo lo que haya cambiado (sin bajar nada)
async function subirSiCambio() {
  if (!nubeLista() || sincronizando) return;
  sincronizando = true;
  try {
    await subirPendientes();
    await subirTodo();
  } catch (error) {
    console.warn("No se pudo subir (se intenta otra vez después):", error.message);
  }
  sincronizando = false;
}

// ===== ENLAZAR ESTE DISPOSITIVO CON LA CUENTA =====
// Justo después de entrar: si la cuenta está vacía, subo lo de este dispositivo.
// Si ya tenía barras, pregunto cuáles usar (salvo que este dispositivo nunca haya tocado sus barras).
async function enlazarDispositivo() {
  const conteo = revisar(await nube.from("barras").select("id", { count: "exact", head: true }));
  if (conteo.count === 0) {
    await usarLasDelDispositivo();
  } else if (localStorage.getItem("actividades") === null) {
    await usarLasDeLaNube(); // Dispositivo nuevo, sin cambios propios: no hay nada que preguntar
  } else {
    abrirVentana();
    mostrarPaso("paso-elegir");
  }
}

// Gana la nube: bajo todo y vuelvo a abrir la app con eso
async function usarLasDeLaNube() {
  const datos = await bajarTodo();
  escribirEnLibreta(datos);
  guardarPendientes([]);
  localStorage.setItem("nube-lista", "si");
  location.reload();
}

// Gana este dispositivo: borro lo de la nube y subo todo lo de aquí, historial incluido
async function usarLasDelDispositivo() {
  for (const tabla of ["historial", "barras", "grupos"]) {
    revisar(await nube.from(tabla).delete().eq("user_id", usuario.id));
  }
  await subirTodo(true);
  await subirHistorialCompleto();
  guardarPendientes([]);
  localStorage.setItem("nube-lista", "si");
  cerrarVentana();
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
  for (const id of ["paso-correo", "paso-enlace", "paso-elegir"]) {
    document.getElementById(id).hidden = id !== paso;
  }
  avisar("");
  // Mientras se elige qué barras usar, no se puede cerrar la ventana (hay que escoger)
  document.getElementById("cerrar-ventana").hidden = paso === "paso-elegir";
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
  for (const clave of ["nube-lista", "nube-subido", "nube-pendientes"]) {
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

  // Paso 3: elegir qué barras usar
  document.getElementById("usar-nube").onclick = async function () {
    avisar("Bajando tus barras…");
    try {
      await usarLasDeLaNube();
    } catch (error) {
      avisar(explicarError(error));
    }
  };
  document.getElementById("usar-dispositivo").onclick = async function () {
    if (!confirm("¿Seguro? Las barras que estaban en la nube se reemplazan por las de este dispositivo.")) return;
    avisar("Subiendo tus barras…");
    try {
      await usarLasDelDispositivo();
    } catch (error) {
      avisar(explicarError(error));
    }
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

  // Y cada pocos segundos subo lo que haya cambiado
  setInterval(subirSiCambio, CADA_CUANTO_SUBIR);
} else {
  pintarSesion();
}
