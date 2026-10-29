// ===== CONFIGURACIÓN =====
// Duración que usa una barra si nunca le he configurado una (2 días)
const DURACION_POR_DEFECTO = 48 * 60 * 60 * 1000;

// Cuántos milisegundos tiene cada unidad
const UNIDADES = {
  horas: 60 * 60 * 1000,
  dias: 24 * 60 * 60 * 1000,
};

// Cuánto hay que mantener el dedo quieto sobre la barra antes de poder arrastrarla (milisegundos)
// Si el dedo se mueve antes de ese tiempo, se entiende que quería deslizar la página
const ESPERA_ARRASTRE = 300;

// Cuánto hay que mantener el dedo quieto sobre una tarjeta para despegarla y cambiarla de puesto
const ESPERA_MOVER = 500;

// Con el mouse no hay espera: la tarjeta se despega al moverla estos píxeles con el botón hundido
const DISTANCIA_MOUSE = 6;

// ===== TIPOS DE BARRA =====
// El tipo dice cómo se llena una barra:
// "clic":     un clic la llena entera
// "arrastre": la arrastro hasta el nivel que yo quiera
// "niveles":  un clic la llena, y además cuenta los rellenos para subir de nivel
const TIPOS = {
  clic:     "Un clic",
  arrastre: "Arrastrando",
  niveles:  "Con niveles",
};

// ===== BARRAS CON NIVELES =====
// Se vacían igual que las demás, pero además cuentan cuántas veces las he llenado y con eso suben de nivel
const RELLENOS_NIVEL_1 = 5;  // Rellenos para pasar el nivel 1; cada nivel pide 5 más (5, 10, 15...)

// Para que un relleno cuente, la barra tiene que haber bajado al menos un cuarto (estar en 75% o menos).
// Si la relleno estando más arriba, se toma como la misma sesión de trabajo: se llena, pero no suma.
const UMBRAL_RELLENO = 75;

// Color de la etiqueta de nivel (del nivel 5 en adelante se queda el último)
//                     bronce     plata      oro        diamante   maestro
const COLORES_NIVEL = ["#cd7f32", "#a8a9ad", "#f2c200", "#4fc3f7", "#9b59b6"];

// ===== BARRAS PREESTABLECIDAS (SOLO EN SATISFACCIÓN) =====
// Barras listas para agregar con un solo toque desde la tarjeta de "Nueva barra".
// Si ya tengo una barra con el mismo nombre, esa no aparece.
// "tipo" es opcional: si no lo pongo, se llena con un clic.
const PREESTABLECIDAS = [
  { nombre: "Música",      boton: "Hice música" },
  { nombre: "Leer",        boton: "Leí" },
  { nombre: "Series",      boton: "Vi series" },
  { nombre: "Videojuegos", boton: "Jugué" },
  { nombre: "Socializar",  boton: "Hablé con alguien", tipo: "arrastre" }, // Un saludo no basta: se llena arrastrando
];

// Todo lo que una barra guarda en la libreta (para borrarlo cuando se quita la barra)
// "-modo", "-puntos" y "-puntosAnterior" son de versiones viejas
const DATOS_BARRA = ["-ultimaVez", "-duracion", "-unidad", "-anterior", "-modo",
                     "-registro", "-contoRelleno", "-historial", "-anotoHistorial",
                     "-puntos", "-puntosAnterior"];

// ===== GRUPOS (LAS PESTAÑAS DE ARRIBA) =====
// Cada persona arma sus propios grupos. Satisfacción siempre existe y va de primera,
// porque es el origen de la app: no se puede borrar ni cambiar de nombre.
const GRUPO_PRINCIPAL = { id: "satisfaccion", nombre: "Satisfacción" };

// Lee de la libreta los grupos de esta persona (si nunca los ha guardado, solo está Satisfacción)
function leerGrupos() {
  const guardado = localStorage.getItem("grupos");
  if (guardado === null) return [GRUPO_PRINCIPAL];
  return JSON.parse(guardado);
}

// Guarda la lista de grupos en la libreta
function guardarGrupos() {
  localStorage.setItem("grupos", JSON.stringify(grupos));
}

// La lista de grupos con la que trabaja la app mientras está abierta
let grupos = leerGrupos();

// Grupo que se está viendo ahora
let grupoActual = GRUPO_PRINCIPAL.id;

// ===== LISTA DE ACTIVIDADES =====
// Barras con las que arranca alguien que abre la app por primera vez
const ACTIVIDADES_INICIALES = [
  { id: "series",      nombre: "Series",      boton: "Vi series",        grupo: "satisfaccion", tipo: "clic" },
  { id: "videojuegos", nombre: "Videojuegos", boton: "Jugué",            grupo: "satisfaccion", tipo: "clic" },
  { id: "musica",      nombre: "Música",      boton: "Hice música",      grupo: "satisfaccion", tipo: "clic" },
  { id: "proyectos",   nombre: "Proyectos",   boton: "Avancé",           grupo: "satisfaccion", tipo: "clic" },
  { id: "amigos",      nombre: "Amigos",      boton: "Hablé con amigos", grupo: "satisfaccion", tipo: "clic" },
];

// Lee de la libreta la lista de barras de esta persona
// Si nunca la ha guardado, usa las iniciales
function leerActividades() {
  const guardado = localStorage.getItem("actividades");
  if (guardado === null) return ACTIVIDADES_INICIALES;
  return JSON.parse(guardado); // Convierte el texto guardado de vuelta en lista
}

// Guarda la lista de barras en la libreta (convertida a texto)
function guardarActividades() {
  localStorage.setItem("actividades", JSON.stringify(actividades));
}

// La lista con la que trabaja la app mientras está abierta
let actividades = leerActividades();

// ===== FUNCIONES DE DATOS =====
// Lee de la libreta la última vez que hice esta actividad
// Si nunca la he registrado, arranca con la barra llena
function leerUltimaVez(id) {
  let guardado = localStorage.getItem(id + "-ultimaVez");
  if (guardado === null) {
    guardado = Date.now();
    localStorage.setItem(id + "-ultimaVez", guardado);
  }
  return Number(guardado);
}

// Lee de la libreta cuánto tarda esta barra en vaciarse
// Si nunca la he configurado, usa la de por defecto
function leerDuracion(id) {
  const guardado = localStorage.getItem(id + "-duracion");
  if (guardado !== null) return Number(guardado);
  return DURACION_POR_DEFECTO;
}

// Guarda la duración nueva, convertida a milisegundos
function guardarDuracion(id, cantidad, unidad) {
  localStorage.setItem(id + "-duracion", cantidad * UNIDADES[unidad]);
  localStorage.setItem(id + "-unidad", unidad);
  actualizarBarra(id);
}

// Dice de qué tipo es una barra (clic, arrastre o niveles)
function tipoDe(id) {
  return actividades.find(a => a.id === id).tipo;
}

// Cambia el tipo de una barra y la acomoda en pantalla
// (si deja de ser "con niveles", sus rellenos se quedan guardados por si vuelve)
function guardarTipo(id, tipo) {
  actividades.find(a => a.id === id).tipo = tipo;
  guardarActividades();
  aplicarTipo(id);
  actualizarBarra(id);
}

// Pone la barra en un nivel exacto (de 0 a 100)
// Truco: calcula qué "última vez" daría ese porcentaje y la guarda,
// así la barra sigue vaciándose normal desde ese nivel
function ponerNivel(id, porcentaje) {
  const tiempoPasado = (1 - porcentaje / 100) * leerDuracion(id);
  localStorage.setItem(id + "-ultimaVez", Math.round(Date.now() - tiempoPasado));
  actualizarBarra(id);
}

// Calcula qué tan llena está la barra de esta actividad
function calcularPorcentaje(id) {
  const tiempoPasado = Date.now() - leerUltimaVez(id);
  let porcentaje = 100 - (tiempoPasado / leerDuracion(id)) * 100;
  if (porcentaje < 0) porcentaje = 0;
  return porcentaje;
}

// Borra de la libreta todo lo que tenía guardado una barra
function borrarDatos(id) {
  for (const dato of DATOS_BARRA) {
    localStorage.removeItem(id + dato);
  }
}

// ===== HISTORIAL (TODAS LAS BARRAS) =====
// Cada vez que lleno una barra, de cualquier tipo, anoto cuándo fue, cómo estaba y cómo quedó.
// NO se muestra en la pantalla principal (ver cuánto hace que no hago algo se siente feo):
// es para el informe.
// Cada anotación es [hora, nivel antes, nivel después], con los niveles redondeados de 0 a 100.
// Ej: [1793248937776, 40, 100] = la llené del 40% al 100% en ese momento

// Lee el historial de una barra
function leerHistorial(id) {
  return JSON.parse(localStorage.getItem(id + "-historial") || "[]");
}

// Anota un llenado con la hora de ahora
// y deja una marca para que Deshacer sepa que tiene que borrarlo
// (si hay sesión iniciada, nube.js la sube también)
function anotarHistorial(id, antes, despues) {
  const historial = leerHistorial(id);
  const fila = [Date.now(), Math.round(antes), Math.round(despues)];
  historial.push(fila);
  localStorage.setItem(id + "-historial", JSON.stringify(historial));
  localStorage.setItem(id + "-anotoHistorial", "si");
  if (typeof nubeAnotar === "function") nubeAnotar(id, fila);
}

// Borra la última anotación (lo usa Deshacer)
function borrarUltimoHistorial(id) {
  const historial = leerHistorial(id);
  const fila = historial.pop(); // Quita la última de la lista
  localStorage.setItem(id + "-historial", JSON.stringify(historial));
  localStorage.removeItem(id + "-anotoHistorial");
  if (fila && typeof nubeBorrar === "function") nubeBorrar(id, fila[0]);
}

// ===== REGISTRO DE RELLENOS (SOLO BARRAS CON NIVELES) =====
// Cada vez que lleno una barra con niveles, anoto la fecha y hora en una lista.
// Con esa lista sé cuántas veces la he llenado hoy, este mes y en total.
// (Esta lista también servirá después para el informe mensual)

// Lee la lista de rellenos de una barra
function leerRegistro(id) {
  return JSON.parse(localStorage.getItem(id + "-registro") || "[]");
}

// Anota un relleno nuevo con la hora de ahora
// y deja una marca para que Deshacer sepa que tiene que borrarlo
function anotarRelleno(id) {
  const registro = leerRegistro(id);
  registro.push(Date.now());
  localStorage.setItem(id + "-registro", JSON.stringify(registro));
  localStorage.setItem(id + "-contoRelleno", "si");
}

// Borra el último relleno anotado (lo usa Deshacer)
function borrarUltimoRelleno(id) {
  const registro = leerRegistro(id);
  registro.pop(); // Quita el último de la lista
  localStorage.setItem(id + "-registro", JSON.stringify(registro));
  localStorage.removeItem(id + "-contoRelleno");
}

// Cuenta los rellenos de hoy, de este mes y de siempre
function contarRellenos(id) {
  const registro = leerRegistro(id);
  const ahora = new Date();
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
  return {
    total: registro.length,
    hoy: registro.filter(hora => hora >= inicioDia).length,
    mes: registro.filter(hora => hora >= inicioMes).length,
  };
}

// Convierte los rellenos totales en nivel, rellenos del nivel actual y meta
// Ej: 8 rellenos = nivel 2 (gastó 5 en el nivel 1) con 3 de 10
function calcularNivel(rellenosTotales) {
  let nivel = 1;
  let rellenos = rellenosTotales;
  let meta = RELLENOS_NIVEL_1;
  while (rellenos >= meta) {       // Mientras alcance para pasar de nivel...
    rellenos = rellenos - meta;    // ...gasta los rellenos de ese nivel
    nivel = nivel + 1;             // ...sube uno
    meta = RELLENOS_NIVEL_1 * nivel; // ...y el siguiente pide más
  }
  return { nivel: nivel, rellenos: rellenos, meta: meta };
}

// ===== FUNCIONES DE BOTONES =====
// Recarga la barra, anotando antes la hora vieja por si me equivoqué, y la anota en el historial
// (aunque ya estuviera llena: si oprimí el botón, es que lo hice otra vez)
// Si es con niveles, además cuenta un relleno (solo si la barra ya había bajado un cuarto)
function recargar(id) {
  const nivelAntes = calcularPorcentaje(id);
  localStorage.setItem(id + "-anterior", leerUltimaVez(id));
  localStorage.setItem(id + "-ultimaVez", Date.now());
  anotarHistorial(id, nivelAntes, 100);
  if (tipoDe(id) === "niveles" && nivelAntes <= UMBRAL_RELLENO) {
    anotarRelleno(id);
  } else {
    localStorage.removeItem(id + "-contoRelleno"); // Misma sesión (o no es con niveles): no suma
  }
  actualizarBarra(id);
}

// Deshace la última recarga de esta actividad
// (y si esa recarga había quedado en el historial o había contado un relleno, también los borra)
function deshacer(id) {
  const anterior = localStorage.getItem(id + "-anterior");
  if (anterior === null) return;
  localStorage.setItem(id + "-ultimaVez", anterior);
  localStorage.removeItem(id + "-anterior");
  if (localStorage.getItem(id + "-anotoHistorial") !== null) {
    borrarUltimoHistorial(id);
  }
  if (localStorage.getItem(id + "-contoRelleno") !== null) {
    borrarUltimoRelleno(id);
  }
  actualizarBarra(id);
}

// Abre o cierra la cajita de ajustes, rellenándola con lo que ya está guardado
function abrirAjustes(id) {
  const caja = document.getElementById("caja-" + id);
  const unidad = localStorage.getItem(id + "-unidad") || "dias";
  document.getElementById("cantidad-" + id).value = leerDuracion(id) / UNIDADES[unidad];
  document.getElementById("unidad-" + id).value = unidad;
  document.getElementById("tipo-" + id).value = tipoDe(id);
  caja.hidden = !caja.hidden;
}

// Conecta el arrastre de la barra (solo hace algo si es de tipo arrastre)
// En el celular hay que MANTENER el dedo quieto un momento antes de arrastrar;
// si el dedo se mueve enseguida, es que quería deslizar la página y la barra no se toca.
// En el PC, con el mouse, se arrastra de una.
function conectarArrastre(id) {
  const barra = document.getElementById("barra-" + id);
  let arrastrando = false;  // ¿Ya estoy moviendo la barra?
  let temporizador = null;  // El reloj que cuenta el "mantener hundido"
  let inicioY = 0;          // Dónde puse el dedo
  let ultimoY = 0;          // Dónde está el dedo ahora
  let nivelAntes = 0;       // Cómo estaba la barra antes de arrastrar (para el historial)

  // Convierte una altura de la pantalla en un porcentaje de la barra
  function nivelDesdeAltura(y) {
    const caja = barra.getBoundingClientRect();
    let porcentaje = ((caja.bottom - y) / caja.height) * 100;
    if (porcentaje < 0) porcentaje = 0;
    if (porcentaje > 100) porcentaje = 100;
    return porcentaje;
  }

  // Empieza el arrastre: anoto el nivel viejo (para Deshacer) y aviso que ya agarró
  function empezar() {
    temporizador = null;
    arrastrando = true;
    barra.classList.add("agarrada");              // Se agranda un poquito
    if (navigator.vibrate) navigator.vibrate(30); // Vibra cortico (si el celular puede)
    nivelAntes = calcularPorcentaje(id);
    localStorage.setItem(id + "-anterior", leerUltimaVez(id));
    localStorage.removeItem(id + "-contoRelleno");   // Arrastrar nunca cuenta rellenos
    localStorage.removeItem(id + "-anotoHistorial"); // Lo anoto al soltar, si cambió algo
    ponerNivel(id, nivelDesdeAltura(ultimoY));
  }

  // Termina el arrastre (o cancela la espera si nunca empezó)
  // Si el nivel cambió, lo anoto en el historial
  function terminar() {
    clearTimeout(temporizador);
    temporizador = null;
    if (!arrastrando) return;
    arrastrando = false;
    barra.classList.remove("agarrada");
    const nivelDespues = calcularPorcentaje(id);
    if (Math.round(nivelDespues) !== Math.round(nivelAntes)) {
      anotarHistorial(id, nivelAntes, nivelDespues);
    }
  }

  // Al tocar la barra
  barra.onpointerdown = function (evento) {
    if (tipoDe(id) !== "arrastre") return;
    inicioY = evento.clientY;
    ultimoY = evento.clientY;
    if (evento.pointerType === "mouse") {   // PC: arrastra de una
      barra.setPointerCapture(evento.pointerId);
      empezar();
      return;
    }
    temporizador = setTimeout(empezar, ESPERA_ARRASTRE); // Celular: espera
  };

  // Mientras muevo el dedo
  barra.onpointermove = function (evento) {
    ultimoY = evento.clientY;
    if (arrastrando) {
      ponerNivel(id, nivelDesdeAltura(ultimoY)); // La barra sigue al dedo
      return;
    }
    // Si se movió más de 10px antes de tiempo, era para deslizar: cancelo la espera
    if (temporizador !== null && Math.abs(ultimoY - inicioY) > 10) {
      clearTimeout(temporizador);
      temporizador = null;
    }
  };

  // Al soltar, o si el navegador se queda con el gesto para deslizar
  barra.onpointerup = terminar;
  barra.onpointercancel = terminar;

  // Ya agarrada la barra, que el dedo NO deslice la página
  barra.addEventListener("touchmove", function (evento) {
    if (arrastrando) evento.preventDefault();
  }, { passive: false });

  // Que al mantener hundido no salga el menú del navegador
  barra.oncontextmenu = function (evento) {
    if (tipoDe(id) === "arrastre") evento.preventDefault();
  };
}

// ===== DESPEGAR Y LLEVAR (TARJETAS Y PESTAÑAS, COMO LOS ÍCONOS DEL CELULAR) =====
// En el celular: mantengo el dedo medio segundo, el elemento se "despega" y lo llevo a donde quiera.
// En el PC: lo agarro con el mouse y lo muevo de una.
// Si el dedo se mueve antes de tiempo, era para deslizar la página: no pasa nada.
// Mientras lo llevo, abajo aparece la papelera: si lo suelto ahí, se borra (preguntando antes).
// "acciones" dice qué hacer en cada caso:
//   sePuedeAgarrar(tocado): si desde ese punto se puede agarrar (opcional; si no está, se puede siempre)
//   alMover():              algo que hacer mientras lo llevo, como cambiar de puesto (opcional)
//   alSoltar():             al soltarlo, caiga donde caiga (opcional)
//   alBorrar():             al soltarlo en la papelera
function hacerDespegable(elemento, acciones) {
  const papelera = document.getElementById("papelera");
  let apretado = false;     // ¿Tengo el dedo (o el mouse) hundido encima?
  let moviendo = false;     // ¿Ya se despegó?
  let recienMovido = false; // Para que soltarlo no cuente también como un clic
  let temporizador = null;  // El reloj que cuenta el medio segundo
  let dedo = null;          // Cuál dedo (o mouse) lo agarró
  let inicioX = 0, inicioY = 0; // Dónde puse el dedo
  let ultimoX = 0, ultimoY = 0; // Dónde está el dedo ahora
  let agarreX = 0, agarreY = 0; // Dónde lo agarré, medido desde su esquina

  // Dice si el dedo está encima de la papelera
  function sobrePapelera() {
    const caja = papelera.getBoundingClientRect();
    return ultimoX >= caja.left && ultimoX <= caja.right && ultimoY >= caja.top && ultimoY <= caja.bottom;
  }

  // Se despega: anoto de dónde lo agarré, saco la papelera y aviso con una vibración
  function empezar() {
    temporizador = null;
    moviendo = true;
    const caja = elemento.getBoundingClientRect();
    agarreX = inicioX - caja.left;
    agarreY = inicioY - caja.top;
    elemento.classList.add("levantada");
    papelera.hidden = false;
    if (navigator.vibrate) navigator.vibrate(30);
    seguirDedo();
  }

  // Hace lo que toque mientras lo llevo y lo dibujo justo debajo del dedo
  function seguirDedo() {
    const encima = sobrePapelera();
    papelera.classList.toggle("encima", encima);
    if (!encima && acciones.alMover) acciones.alMover(ultimoX, ultimoY);
    elemento.style.transform = ""; // Mido dónde quedaría quieto...
    const caja = elemento.getBoundingClientRect();
    const x = ultimoX - agarreX - caja.left; // ...y lo corro hasta el dedo
    const y = ultimoY - agarreY - caja.top;
    elemento.style.transform = "translate(" + x + "px, " + y + "px) scale(1.05)";
  }

  // Lo suelto: vuelve a su puesto, escondo la papelera, y si cayó en ella se borra
  function terminar() {
    apretado = false;
    clearTimeout(temporizador);
    temporizador = null;
    window.removeEventListener("pointermove", alMoverDedo);
    window.removeEventListener("pointerup", alSoltarDedo);
    window.removeEventListener("pointercancel", alSoltarDedo);
    if (!moviendo) return;
    moviendo = false;
    recienMovido = true;
    setTimeout(function () { recienMovido = false; }, 0);
    const enPapelera = sobrePapelera();
    papelera.hidden = true;
    papelera.classList.remove("encima");
    elemento.classList.remove("levantada");
    elemento.style.transform = "";
    if (acciones.alSoltar) acciones.alSoltar();
    if (enPapelera) acciones.alBorrar();
  }

  // Mientras el dedo está hundido, lo escucho en TODA la página y no solo encima del elemento:
  // al cambiarlo de puesto el navegador lo "suelta", y si muevo rápido el dedo se le escapa
  // (antes eso hacía que se quedara atascado a medio camino).
  elemento.addEventListener("pointerdown", function (evento) {
    if (acciones.sePuedeAgarrar && !acciones.sePuedeAgarrar(evento.target)) return;
    apretado = true;
    dedo = evento.pointerId;
    inicioX = ultimoX = evento.clientX;
    inicioY = ultimoY = evento.clientY;
    window.addEventListener("pointermove", alMoverDedo);
    window.addEventListener("pointerup", alSoltarDedo);
    window.addEventListener("pointercancel", alSoltarDedo);
    if (evento.pointerType !== "mouse") temporizador = setTimeout(empezar, ESPERA_MOVER);
  });

  // Solo hago caso al dedo que lo agarró (por si hay otro dedo tocando la pantalla)
  function alSoltarDedo(evento) {
    if (evento.pointerId === dedo) terminar();
  }

  function alMoverDedo(evento) {
    if (!apretado || evento.pointerId !== dedo) return;
    ultimoX = evento.clientX;
    ultimoY = evento.clientY;
    const distancia = Math.hypot(ultimoX - inicioX, ultimoY - inicioY);
    if (moviendo) {
      // Cerca del borde de arriba o de abajo, la página se desliza sola (menos encima de la papelera)
      if (ultimoY < 60) window.scrollBy(0, -12);
      if (ultimoY > window.innerHeight - 60 && !sobrePapelera()) window.scrollBy(0, 12);
      seguirDedo();
    } else if (evento.pointerType === "mouse") {
      if (distancia > DISTANCIA_MOUSE) empezar();  // PC: se despega al mover el mouse
    } else if (temporizador !== null && distancia > 10) {
      clearTimeout(temporizador);  // Celular: se movió antes de tiempo, quería deslizar
      temporizador = null;
    }
  }

  // Soltarlo no cuenta como clic (si no, al soltar una pestaña se abriría ese grupo)
  elemento.addEventListener("click", function (evento) {
    if (!recienMovido) return;
    evento.stopImmediatePropagation();
    evento.preventDefault();
  }, true);

  // Ya despegado, que el dedo NO deslice la página
  elemento.addEventListener("touchmove", function (evento) {
    if (moviendo) evento.preventDefault();
  }, { passive: false });

  // Que al mantener hundido no salga el menú del navegador
  elemento.addEventListener("contextmenu", function (evento) {
    if (!acciones.sePuedeAgarrar || acciones.sePuedeAgarrar(evento.target)) evento.preventDefault();
  });
}

// Hace que una tarjeta se pueda llevar a otro puesto o a la papelera.
// No se agarra desde los botones ni los ajustes, ni desde la barra si es de arrastre (ahí el dedo ajusta el nivel).
// Si la suelto sin pasar por encima de otra tarjeta, se queda donde estaba.
function conectarMover(id) {
  const tarjeta = document.getElementById("necesidad-" + id);
  hacerDespegable(tarjeta, {
    sePuedeAgarrar: function (tocado) {
      if (tocado.closest("button, input, select, .ajustes")) return false;
      if (tocado.closest(".barra.manual")) return false;
      return true;
    },
    // Si el dedo está sobre otra tarjeta, me cambio de puesto con ella
    alMover: function (x, y) {
      const otra = document.elementsFromPoint(x, y)
        .map(elemento => elemento.closest(".necesidad"))
        .find(t => t && t !== tarjeta && t.id !== "tarjeta-agregar");
      if (!otra) return;
      if (tarjeta.compareDocumentPosition(otra) & Node.DOCUMENT_POSITION_FOLLOWING) {
        otra.after(tarjeta);  // La otra estaba después: me pongo detrás de ella
      } else {
        otra.before(tarjeta); // La otra estaba antes: me pongo delante de ella
      }
    },
    // Guardo el orden como quedó en pantalla
    alSoltar: function () {
      const orden = [...document.querySelectorAll("#panel .necesidad")].map(t => t.id.replace("necesidad-", ""));
      actividades.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
      guardarActividades();
    },
    alBorrar: function () {
      quitarActividad(id);
    },
  });
}

// Agrega una barra nueva al final de la lista y la pone en pantalla
// Queda en el grupo que estoy viendo; si no digo el tipo, se llena con un clic
function agregarActividad(nombre, boton, tipo) {
  const nueva = {
    id: "barra" + Date.now(), // Número único: los milisegundos de este instante
    nombre: nombre,
    boton: boton || "Lo hice", // Si no escribió texto de botón, usa este
    grupo: grupoActual,
    tipo: tipo || "clic",
    creada: Date.now(),        // Para el informe: desde cuándo existe esta barra
  };
  actividades.push(nueva);
  guardarActividades();
  crearBarra(nueva);
  actualizarBarra(nueva.id);
  actualizarPreestablecidas();
}

// Muestra solo las barras preestablecidas que todavía no tengo agregadas
function actualizarPreestablecidas() {
  const nombres = actividades.map(a => a.nombre.toLowerCase());
  for (const boton of document.querySelectorAll("#chips button")) {
    boton.hidden = nombres.includes(boton.textContent.toLowerCase());
  }
}

// Quita una barra (preguntando antes) y borra todo lo que tenía guardado
function quitarActividad(id) {
  const actividad = actividades.find(a => a.id === id);
  if (!confirm("¿Seguro que quieres quitar la barra " + actividad.nombre + "?")) return;

  actividades = actividades.filter(a => a.id !== id); // Deja todas menos esta
  guardarActividades();
  document.getElementById("necesidad-" + id).remove();
  borrarDatos(id);
  actualizarPreestablecidas(); // Si era preestablecida, vuelve a aparecer para agregarla
}

// ===== FUNCIONES DE GRUPOS =====
// Pide un nombre y crea un grupo nuevo (vacío), y me lleva a verlo
function crearGrupo() {
  const nombre = (prompt("Nombre del grupo nuevo:") || "").trim().slice(0, 20);
  if (nombre === "") return;
  const nuevo = { id: "grupo" + Date.now(), nombre: nombre };
  grupos.push(nuevo);
  guardarGrupos();
  mostrarGrupo(nuevo.id);
}

// Cambia el nombre del grupo que estoy viendo (Satisfacción no se puede)
function renombrarGrupo() {
  const grupo = grupos.find(g => g.id === grupoActual);
  if (grupo.id === GRUPO_PRINCIPAL.id) return;
  const nombre = (prompt("Nuevo nombre del grupo:", grupo.nombre) || "").trim().slice(0, 20);
  if (nombre === "") return;
  grupo.nombre = nombre;
  guardarGrupos();
  pintarPestanas();
}

// Borra un grupo junto con sus barras (preguntando antes; Satisfacción no se puede)
function borrarGrupo(id) {
  const grupo = grupos.find(g => g.id === id);
  if (grupo.id === GRUPO_PRINCIPAL.id) return;
  const barras = actividades.filter(a => a.grupo === grupo.id);
  let pregunta = "¿Seguro que quieres borrar el grupo " + grupo.nombre + "?";
  if (barras.length === 1) pregunta += " También se borra su barra.";
  if (barras.length > 1) pregunta += " También se borran sus " + barras.length + " barras.";
  if (!confirm(pregunta)) return;

  for (const actividad of barras) {
    borrarDatos(actividad.id);
    document.getElementById("necesidad-" + actividad.id).remove();
  }
  actividades = actividades.filter(a => a.grupo !== grupo.id);
  grupos = grupos.filter(g => g.id !== grupo.id);
  guardarActividades();
  guardarGrupos();
  actualizarPreestablecidas();
  // Si estaba viendo el grupo que borré, vuelvo a Satisfacción; si no, me quedo donde estaba
  mostrarGrupo(grupoActual === grupo.id ? GRUPO_PRINCIPAL.id : grupoActual);
}

// ===== FUNCIONES DE PANTALLA =====
// Pinta UNA barra: altura y color según qué tan llena está
// Si es con niveles, además escribe el nivel y cuántas veces la he llenado
function actualizarBarra(id) {
  const relleno = document.getElementById("relleno-" + id);
  const porcentaje = calcularPorcentaje(id);

  relleno.style.height = porcentaje + "%";

  if (porcentaje > 50) {
    relleno.style.background = "#22b14c";  // Verde
  } else if (porcentaje > 20) {
    relleno.style.background = "#f2c200";  // Amarillo
  } else {
    relleno.style.background = "#e03131";  // Rojo
  }

  if (tipoDe(id) === "niveles") {
    const conteo = contarRellenos(id);
    const n = calcularNivel(conteo.total);
    const etiqueta = document.getElementById("nivel-" + id);
    etiqueta.textContent = "Nivel " + n.nivel + " · " + n.rellenos + "/" + n.meta;
    etiqueta.style.background = COLORES_NIVEL[Math.min(n.nivel, COLORES_NIVEL.length) - 1];
    document.getElementById("conteo-" + id).textContent = "🔁 Hoy " + conteo.hoy + " · Mes " + conteo.mes;
  }
}

// Muestra lo que corresponde según el tipo de la barra:
// clic = botón de llenar; arrastre = barra arrastrable con su pista; niveles = botón, nivel y conteo
function aplicarTipo(id) {
  const tipo = tipoDe(id);
  document.getElementById("barra-" + id).classList.toggle("manual", tipo === "arrastre");
  document.getElementById("boton-" + id).hidden = tipo === "arrastre";
  document.getElementById("pista-" + id).hidden = tipo !== "arrastre";
  document.getElementById("nivel-" + id).hidden = tipo !== "niveles";
  document.getElementById("conteo-" + id).hidden = tipo !== "niveles";
}

// Pinta TODAS las barras
function actualizarTodas() {
  for (const actividad of actividades) {
    actualizarBarra(actividad.id);
  }
}

// Fabrica las opciones de un selector de tipo de barra
function opcionesDeTipo() {
  return Object.entries(TIPOS).map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join("");
}

// Fabrica el HTML de una barra y la mete en el panel
function crearBarra(actividad) {
  const tarjetaAgregar = document.getElementById("tarjeta-agregar");

  tarjetaAgregar.insertAdjacentHTML("beforebegin", `
    <div class="necesidad" id="necesidad-${actividad.id}">
      <div class="barra" id="barra-${actividad.id}">
        <div class="relleno" id="relleno-${actividad.id}"></div>
      </div>
      <p id="nombre-${actividad.id}"></p>
      <small class="nivel" id="nivel-${actividad.id}" hidden></small>
      <small class="conteo" id="conteo-${actividad.id}" hidden></small>
      <small class="pista" id="pista-${actividad.id}" hidden>↕ Mantén y arrastra</small>
      <button id="boton-${actividad.id}"></button>
      <button class="boton-menu" id="menu-${actividad.id}" aria-label="Más opciones">⋮</button>
      <div id="opciones-${actividad.id}" hidden>
        <button id="deshacer-${actividad.id}">Deshacer</button>
        <button id="ajustes-${actividad.id}">⚙️ Ajustes</button>
      </div>
      <div class="ajustes" id="caja-${actividad.id}" hidden>
        <small>Se vacía en:</small>
        <input type="number" id="cantidad-${actividad.id}" min="1">
        <select id="unidad-${actividad.id}">
          <option value="horas">Horas</option>
          <option value="dias">Días</option>
        </select>
        <small>Tipo de barra:</small>
        <select id="tipo-${actividad.id}">${opcionesDeTipo()}</select>
        <button id="guardar-${actividad.id}">Guardar</button>
        <button class="boton-quitar" id="quitar-${actividad.id}">🗑️ Quitar barra</button>
      </div>
    </div>
  `);

  // Escribe el nombre y el texto del botón como texto puro
  // (así, si alguien escribe código raro como nombre, no se ejecuta)
  document.getElementById("nombre-" + actividad.id).textContent = actividad.nombre;
  document.getElementById("boton-" + actividad.id).textContent = actividad.boton;

  // Conecta el botón de quitar la barra
  document.getElementById("quitar-" + actividad.id).onclick = function () {
    quitarActividad(actividad.id);
  };

  // Conecta el botón de recargar (si es con niveles, también cuenta el relleno)
  document.getElementById("boton-" + actividad.id).onclick = function () {
    recargar(actividad.id);
  };

  // Conecta el botón de deshacer
  document.getElementById("deshacer-" + actividad.id).onclick = function () {
    deshacer(actividad.id);
    document.getElementById("opciones-" + actividad.id).hidden = true; // Cierra el menú
  };

  // Conecta el botón que abre la cajita de ajustes
  document.getElementById("ajustes-" + actividad.id).onclick = function () {
    abrirAjustes(actividad.id);
    document.getElementById("opciones-" + actividad.id).hidden = true; // Cierra el menú
  };

  // Conecta el botón ⋮ de la esquina
  document.getElementById("menu-" + actividad.id).onclick = function () {
    const opciones = document.getElementById("opciones-" + actividad.id);
    const caja = document.getElementById("caja-" + actividad.id);
    if (!caja.hidden) {       // Si los ajustes están abiertos, el ⋮ los cierra
      caja.hidden = true;
      return;
    }
    opciones.hidden = !opciones.hidden; // Si no, abre o cierra el menú
  };

  // Conecta el botón de guardar los ajustes (duración y tipo)
  document.getElementById("guardar-" + actividad.id).onclick = function () {
    const cantidad = Number(document.getElementById("cantidad-" + actividad.id).value);
    const unidad = document.getElementById("unidad-" + actividad.id).value;
    const tipo = document.getElementById("tipo-" + actividad.id).value;
    if (cantidad <= 0) return; // No deja guardar cero ni números negativos
    guardarDuracion(actividad.id, cantidad, unidad);
    guardarTipo(actividad.id, tipo);
    document.getElementById("caja-" + actividad.id).hidden = true;
  };

  // Conecta el arrastre de la barra, el de mover la tarjeta, y la muestra según su tipo
  conectarArrastre(actividad.id);
  conectarMover(actividad.id);
  aplicarTipo(actividad.id);

  // Si no es del grupo que estoy viendo, la escondo
  document.getElementById("necesidad-" + actividad.id).hidden = actividad.grupo !== grupoActual;
}

// Fabrica un botón de pestaña por cada grupo, más el "+" para crear uno nuevo
// Las pestañas (menos Satisfacción) se pueden arrastrar para cambiarlas de puesto,
// o llevar a la papelera para borrar el grupo. Satisfacción siempre se queda de primera.
function pintarPestanas() {
  const contenedor = document.getElementById("pestanas");
  contenedor.innerHTML = "";
  for (const grupo of grupos) {
    const boton = document.createElement("button");
    boton.className = "pestana";
    boton.classList.toggle("activa", grupo.id === grupoActual);
    boton.textContent = grupo.nombre;
    boton.dataset.grupo = grupo.id; // Para saber de qué grupo es al reordenar
    boton.onclick = function () {
      mostrarGrupo(grupo.id);
    };
    if (grupo.id !== GRUPO_PRINCIPAL.id) {
      hacerDespegable(boton, {
        // Si el dedo pasó la mitad de otra pestaña (que no sea Satisfacción ni el "+"), me cambio con ella.
        // Lo de "la mitad" evita que tiemble cuando las pestañas son de distinto ancho.
        alMover: function (x, y) {
          const otra = document.elementsFromPoint(x, y)
            .map(elemento => elemento.closest(".pestana"))
            .find(p => p && p !== boton && p.dataset.grupo && p.dataset.grupo !== GRUPO_PRINCIPAL.id);
          if (!otra) return;
          const caja = otra.getBoundingClientRect();
          const mitad = caja.left + caja.width / 2;
          if (boton.compareDocumentPosition(otra) & Node.DOCUMENT_POSITION_FOLLOWING) {
            if (x > mitad) otra.after(boton);  // La otra estaba después: me pongo detrás de ella
          } else if (x < mitad) {
            otra.before(boton);                // La otra estaba antes: me pongo delante de ella
          }
        },
        // Guardo el orden de los grupos como quedó en pantalla
        alSoltar: function () {
          const orden = [...document.querySelectorAll("#pestanas .pestana")].map(p => p.dataset.grupo);
          grupos.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
          guardarGrupos();
        },
        alBorrar: function () {
          borrarGrupo(grupo.id);
        },
      });
    }
    contenedor.append(boton);
  }
  const nuevo = document.createElement("button");
  nuevo.className = "pestana pestana-nueva";
  nuevo.textContent = "+";
  nuevo.setAttribute("aria-label", "Nuevo grupo");
  nuevo.onclick = crearGrupo;
  contenedor.append(nuevo);
}

// Muestra solo las barras de un grupo y pinta su pestaña
function mostrarGrupo(id) {
  grupoActual = id;
  for (const actividad of actividades) {
    document.getElementById("necesidad-" + actividad.id).hidden = actividad.grupo !== id;
  }
  pintarPestanas();
  // Las preestablecidas solo salen en Satisfacción
  document.getElementById("preestablecidas").hidden = id !== GRUPO_PRINCIPAL.id;
  // Satisfacción no se puede renombrar ni borrar
  document.getElementById("renombrar-grupo").disabled = id === GRUPO_PRINCIPAL.id;
  document.getElementById("borrar-grupo").disabled = id === GRUPO_PRINCIPAL.id;
}

// ===== MUDANZA DE DATOS VIEJOS =====
// La versión anterior de Desarrollo guardaba puntos (10 por clic).
// Aquí los convierto en rellenos (10 puntos = 1 relleno) para no perder el nivel.
// Se anotan con fecha 0 (año 1970) para que sumen al nivel pero no a "hoy" ni a "mes".
// Solo hace algo la primera vez; después ya no quedan puntos que mudar.
for (const actividad of actividades) {
  const puntos = localStorage.getItem(actividad.id + "-puntos");
  if (puntos === null) continue;
  if (localStorage.getItem(actividad.id + "-registro") === null) {
    const cantidad = Math.floor(Number(puntos) / 10);
    localStorage.setItem(actividad.id + "-registro", JSON.stringify(new Array(cantidad).fill(0)));
  }
  localStorage.removeItem(actividad.id + "-puntos");
  localStorage.removeItem(actividad.id + "-puntosAnterior");
}

// ===== LIMPIEZA: SE QUITÓ LA PESTAÑA EMOCIONES =====
// Si alguien tenía barras de emociones, las borra junto con sus datos.
// Solo hace algo la primera vez; después ya no quedan.
if (actividades.some(a => a.tipo === "emociones")) {
  for (const actividad of actividades) {
    if (actividad.tipo === "emociones") borrarDatos(actividad.id);
  }
  actividades = actividades.filter(a => a.tipo !== "emociones");
  guardarActividades();
}

// ===== MUDANZA: DE PESTAÑAS FIJAS A GRUPOS Y TIPOS =====
// Antes "tipo" decía la pestaña (satisfaccion o desarrollo) y el modo de llenado se guardaba aparte.
// Ahora "grupo" dice la pestaña y "tipo" dice cómo se llena.
// Las de Desarrollo pasan a un grupo Desarrollo y quedan de tipo "con niveles".
// Solo hace algo la primera vez; después ya todas tienen grupo.
if (actividades.some(a => !a.grupo)) {
  for (const actividad of actividades) {
    if (actividad.grupo) continue;
    if (actividad.tipo === "desarrollo") {
      actividad.grupo = "desarrollo";
      actividad.tipo = "niveles";
    } else {
      actividad.grupo = GRUPO_PRINCIPAL.id;
      actividad.tipo = localStorage.getItem(actividad.id + "-modo") === "manual" ? "arrastre" : "clic";
    }
    localStorage.removeItem(actividad.id + "-modo");
  }
  if (actividades.some(a => a.grupo === "desarrollo") && !grupos.some(g => g.id === "desarrollo")) {
    grupos.push({ id: "desarrollo", nombre: "Desarrollo" });
    guardarGrupos();
  }
  guardarActividades();
}

// Por si acaso: Satisfacción siempre existe, y una barra sin grupo conocido se va a Satisfacción
if (!grupos.some(g => g.id === GRUPO_PRINCIPAL.id)) {
  grupos.unshift(GRUPO_PRINCIPAL);
  guardarGrupos();
}
for (const actividad of actividades) {
  if (!grupos.some(g => g.id === actividad.grupo)) actividad.grupo = GRUPO_PRINCIPAL.id;
}

// ===== ARRANQUE =====
// Fabrica una barra por cada actividad de la lista
for (const actividad of actividades) {
  crearBarra(actividad);
}

// Llena el selector de tipo de la tarjeta "Nueva barra"
// y esconde el texto del botón si es de arrastre (esas no tienen botón)
const selectorNuevoTipo = document.getElementById("nuevo-tipo");
selectorNuevoTipo.innerHTML = opcionesDeTipo();
selectorNuevoTipo.onchange = function () {
  document.getElementById("campo-boton").hidden = selectorNuevoTipo.value === "arrastre";
};

// Conecta el botón que abre la cajita de "Nueva barra"
document.getElementById("abrir-agregar").onclick = function () {
  const caja = document.getElementById("caja-agregar");
  caja.hidden = !caja.hidden;
};

// Conecta el botón de "Agregar"
document.getElementById("confirmar-agregar").onclick = function () {
  const nombre = document.getElementById("nuevo-nombre").value.trim();
  const boton = document.getElementById("nuevo-boton").value.trim();
  if (nombre === "") return; // No deja crear una barra sin nombre
  agregarActividad(nombre, boton, selectorNuevoTipo.value);
  document.getElementById("nuevo-nombre").value = "";
  document.getElementById("nuevo-boton").value = "";
  document.getElementById("caja-agregar").hidden = true;
};

// Fabrica un botoncito por cada barra preestablecida: un toque y queda agregada
for (const preestablecida of PREESTABLECIDAS) {
  const boton = document.createElement("button");
  boton.textContent = preestablecida.nombre;
  boton.onclick = function () {
    agregarActividad(preestablecida.nombre, preestablecida.boton, preestablecida.tipo);
    document.getElementById("caja-agregar").hidden = true;
  };
  document.getElementById("chips").append(boton);
}
actualizarPreestablecidas();

// ===== MENÚ ☰ Y RESPALDO =====
// Abre o cierra el menú de la esquina
document.getElementById("boton-menu-principal").onclick = function () {
  const menu = document.getElementById("menu-principal");
  menu.hidden = !menu.hidden;
};

// Si toco cualquier otra parte de la página, el menú se cierra
document.addEventListener("click", function (evento) {
  const menu = document.getElementById("menu-principal");
  const boton = document.getElementById("boton-menu-principal");
  if (!menu.contains(evento.target) && evento.target !== boton) menu.hidden = true;
});

// Conecta los botones del menú para renombrar y borrar el grupo que estoy viendo
document.getElementById("renombrar-grupo").onclick = function () {
  document.getElementById("menu-principal").hidden = true;
  renombrarGrupo();
};
document.getElementById("borrar-grupo").onclick = function () {
  document.getElementById("menu-principal").hidden = true;
  borrarGrupo(grupoActual);
};

// Dice si un dato de la libreta es de esta app
// (en mao-oss77.github.io todas mis páginas comparten la misma libreta,
//  así que solo tomo lo que es de las barras)
function esDatoDeLaApp(clave) {
  if (clave === "actividades" || clave === "grupos" || clave === "desarrolloPorDefecto") return true;
  return actividades.some(a => clave.startsWith(a.id + "-"));
}

// Descarga un archivo con todos los datos de las barras
function exportarRespaldo() {
  const datos = {};
  for (let i = 0; i < localStorage.length; i++) {
    const clave = localStorage.key(i);
    if (esDatoDeLaApp(clave)) datos[clave] = localStorage.getItem(clave);
  }
  // La marca "app" sirve para reconocer el archivo al cargarlo
  const respaldo = { app: "barras", version: 1, fecha: new Date().toISOString(), datos: datos };

  // Convierte el respaldo en un archivo y lo descarga con un enlace invisible
  const archivo = new Blob([JSON.stringify(respaldo)], { type: "application/json" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = "respaldo-barras-" + new Date().toISOString().slice(0, 10) + ".json";
  enlace.click();
  setTimeout(function () { URL.revokeObjectURL(enlace.href); }, 1000); // Limpia después
}

// Lee el archivo escogido y deja la app como estaba en ese respaldo
// (los respaldos viejos, sin grupos, se mudan solos al recargar)
function importarRespaldo(archivo) {
  const lector = new FileReader();
  lector.onload = function () {
    let respaldo = null;
    try {
      respaldo = JSON.parse(lector.result);
    } catch (error) {
      // No era un archivo de texto válido: respaldo se queda en null
    }
    if (!respaldo || respaldo.app !== "barras" || !respaldo.datos) {
      alert("Ese archivo no es un respaldo de las barras.");
      return;
    }
    const fecha = new Date(respaldo.fecha).toLocaleDateString();
    if (!confirm("¿Cargar el respaldo del " + fecha + "? Se reemplazan las barras que tienes ahora.")) return;

    // Primero anoto las claves (si borro mientras recorro, se corren los puestos)
    const claves = [];
    for (let i = 0; i < localStorage.length; i++) claves.push(localStorage.key(i));
    // Borro los datos actuales de las barras...
    for (const clave of claves) {
      if (esDatoDeLaApp(clave)) localStorage.removeItem(clave);
    }
    // ...y escribo los del respaldo
    for (const clave in respaldo.datos) {
      localStorage.setItem(clave, respaldo.datos[clave]);
    }
    location.reload(); // Vuelve a abrir la app con los datos nuevos
  };
  lector.readAsText(archivo);
}

// Conecta los botones del menú
document.getElementById("exportar").onclick = function () {
  exportarRespaldo();
  document.getElementById("menu-principal").hidden = true;
};
document.getElementById("importar").onclick = function () {
  document.getElementById("archivo-respaldo").click(); // Abre el selector de archivos
};
document.getElementById("archivo-respaldo").onchange = function () {
  const archivo = this.files[0];
  if (archivo) importarRespaldo(archivo);
  this.value = ""; // Para poder escoger el mismo archivo otra vez si hace falta
  document.getElementById("menu-principal").hidden = true;
};

// ===== APP INSTALABLE =====
// Enciende el ayudante que deja abrir la app sin internet (sw.js)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(function () {
    // Si no se pudo, la app sigue funcionando igual, solo que no abre sin internet
  });
}

// El navegador avisa cuando se puede instalar: guardo ese aviso y muestro el botón del menú
let avisoInstalar = null;
window.addEventListener("beforeinstallprompt", function (evento) {
  evento.preventDefault(); // Que no salga su cartelito solo; lo saco yo cuando toque el botón
  avisoInstalar = evento;
  document.getElementById("instalar-app").hidden = false;
});
document.getElementById("instalar-app").onclick = function () {
  document.getElementById("menu-principal").hidden = true;
  if (!avisoInstalar) return;
  avisoInstalar.prompt();  // Sale la pregunta del navegador: "¿Instalar?"
  avisoInstalar = null;    // Solo sirve una vez
  this.hidden = true;
};
// Ya quedó instalada: el botón sobra
window.addEventListener("appinstalled", function () {
  document.getElementById("instalar-app").hidden = true;
});

mostrarGrupo(GRUPO_PRINCIPAL.id);   // Arranca en Satisfacción
actualizarTodas();                  // Las pinta al abrir
setInterval(actualizarTodas, 1000); // Y las repinta cada segundo
