// ===== CONFIGURACIÓN =====
// Duración que usa una barra si nunca le he configurado una (2 días)
const DURACION_POR_DEFECTO = 48 * 60 * 60 * 1000;

// Cuántos milisegundos tiene cada unidad
const UNIDADES = {
  horas: 60 * 60 * 1000,
  dias: 24 * 60 * 60 * 1000,
};

// Modo de llenado que usa una barra si nunca le he configurado uno
// "completo": un clic llena la barra entera
// "manual":   arrastro la barra hasta el nivel que yo quiera
const MODO_POR_DEFECTO = "completo";

// Cuánto hay que mantener el dedo quieto sobre la barra antes de poder arrastrarla (milisegundos)
// Si el dedo se mueve antes de ese tiempo, se entiende que quería deslizar la página
const ESPERA_ARRASTRE = 300;

// ===== DESARROLLO (RELLENOS Y NIVELES) =====
// En Desarrollo las barras se vacían igual que en Satisfacción,
// pero además cuentan cuántas veces las he llenado y con eso suben de nivel
const RELLENOS_NIVEL_1 = 5;  // Rellenos para pasar el nivel 1; cada nivel pide 5 más (5, 10, 15...)

// Para que un relleno cuente, la barra tiene que haber bajado al menos un cuarto (estar en 75% o menos).
// Si la relleno estando más arriba, se toma como la misma sesión de trabajo: se llena, pero no suma.
const UMBRAL_RELLENO = 75;

// Color de la etiqueta de nivel (del nivel 5 en adelante se queda el último)
//                     bronce     plata      oro        diamante   maestro
const COLORES_NIVEL = ["#cd7f32", "#a8a9ad", "#f2c200", "#4fc3f7", "#9b59b6"];

// ===== EMOCIONES (LO QUE NOS PESA) =====
// Aquí la barra funciona al revés: llena = me pesa mucho, vacía = ya se me pasó.
// Arrancan vacías, se llenan arrastrando con el dedo y se van bajando solas.
const DURACION_EMOCION = 24 * 60 * 60 * 1000; // Por defecto se pasa en 1 día (configurable)

// Emociones que se agregan con un solo toque desde la tarjeta de "Nueva barra"
const PREESTABLECIDAS = ["Tristeza", "Ansiedad", "Angustia", "Rabia", "Estrés", "Soledad", "Miedo"];

// Pestañas que existen (el nombre es el que va después de "pestana-" en el index.html)
const PESTANAS = ["satisfaccion", "desarrollo", "emociones"];

// Pestaña que se está viendo ahora
let pestanaActual = "satisfaccion";

// ===== LISTA DE ACTIVIDADES =====
// Barras con las que arranca alguien que abre la app por primera vez
const ACTIVIDADES_INICIALES = [
  { id: "series",      nombre: "Series",      boton: "Vi series" },
  { id: "videojuegos", nombre: "Videojuegos", boton: "Jugué" },
  { id: "musica",      nombre: "Música",      boton: "Hice música" },
  { id: "proyectos",   nombre: "Proyectos",   boton: "Avancé" },
  { id: "amigos",      nombre: "Amigos",      boton: "Hablé con amigos" },
  { id: "ingles",      nombre: "Inglés",          boton: "Estudié",  tipo: "desarrollo" },
  { id: "paneles",     nombre: "Paneles solares", boton: "Estudié",  tipo: "desarrollo" },
  { id: "ejercicio",   nombre: "Ejercicio",       boton: "Entrené",  tipo: "desarrollo" },
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
// (las de emociones arrancan vacías: nadie empieza sintiéndose mal)
function leerUltimaVez(id) {
  let guardado = localStorage.getItem(id + "-ultimaVez");
  if (guardado === null) {
    guardado = Date.now();
    if (tipoDe(id) === "emociones") guardado = Date.now() - leerDuracion(id);
    localStorage.setItem(id + "-ultimaVez", guardado);
  }
  return Number(guardado);
}

// Lee de la libreta cuánto tarda esta barra en vaciarse
// Si nunca la he configurado, usa la de por defecto (las de emociones, 1 día)
function leerDuracion(id) {
  const guardado = localStorage.getItem(id + "-duracion");
  if (guardado !== null) return Number(guardado);
  if (tipoDe(id) === "emociones") return DURACION_EMOCION;
  return DURACION_POR_DEFECTO;
}

// Guarda la duración nueva, convertida a milisegundos
function guardarDuracion(id, cantidad, unidad) {
  localStorage.setItem(id + "-duracion", cantidad * UNIDADES[unidad]);
  localStorage.setItem(id + "-unidad", unidad);
  actualizarBarra(id);
}

// Lee de la libreta el modo de llenado de esta barra
function leerModo(id) {
  return localStorage.getItem(id + "-modo") || MODO_POR_DEFECTO;
}

// Guarda el modo de llenado y acomoda la barra en pantalla
function guardarModo(id, modo) {
  localStorage.setItem(id + "-modo", modo);
  aplicarModo(id);
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

// Dice de qué pestaña es una barra (las viejas, sin tipo, son de satisfacción)
function tipoDe(id) {
  const actividad = actividades.find(a => a.id === id);
  return actividad.tipo || "satisfaccion";
}

// ===== REGISTRO DE RELLENOS (SOLO DESARROLLO) =====
// Cada vez que lleno una barra de desarrollo, anoto la fecha y hora en una lista.
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
// Recarga la barra, anotando antes la hora vieja por si me equivoqué
// En desarrollo, además cuenta un relleno (solo si la barra ya había bajado un cuarto)
function recargar(id) {
  const nivelAntes = calcularPorcentaje(id);
  localStorage.setItem(id + "-anterior", leerUltimaVez(id));
  localStorage.setItem(id + "-ultimaVez", Date.now());
  if (tipoDe(id) === "desarrollo") {
    if (nivelAntes <= UMBRAL_RELLENO) {
      anotarRelleno(id);
    } else {
      localStorage.removeItem(id + "-contoRelleno"); // Misma sesión: no suma
    }
  }
  actualizarBarra(id);
}

// Deshace la última recarga de esta actividad
// (y si esa recarga había contado un relleno, también lo borra)
function deshacer(id) {
  const anterior = localStorage.getItem(id + "-anterior");
  if (anterior === null) return;
  localStorage.setItem(id + "-ultimaVez", anterior);
  localStorage.removeItem(id + "-anterior");
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
  document.getElementById("modo-" + id).value = leerModo(id);
  caja.hidden = !caja.hidden;
}

// Conecta el arrastre de la barra (solo hace algo en modo manual)
// En el celular hay que MANTENER el dedo quieto un momento antes de arrastrar;
// si el dedo se mueve enseguida, es que quería deslizar la página y la barra no se toca.
// En el PC, con el mouse, se arrastra de una.
function conectarArrastre(id) {
  const barra = document.getElementById("barra-" + id);
  let arrastrando = false;  // ¿Ya estoy moviendo la barra?
  let temporizador = null;  // El reloj que cuenta el "mantener hundido"
  let inicioY = 0;          // Dónde puse el dedo
  let ultimoY = 0;          // Dónde está el dedo ahora
  let nivelAntes = 0;       // Cómo estaba la barra antes de arrastrar

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
    ponerNivel(id, nivelDesdeAltura(ultimoY));
  }

  // Termina el arrastre (o cancela la espera si nunca empezó)
  function terminar() {
    clearTimeout(temporizador);
    temporizador = null;
    if (!arrastrando) return;
    arrastrando = false;
    barra.classList.remove("agarrada");

    // En desarrollo: si la subí hasta arriba arrastrando, y antes había bajado un cuarto, cuenta como un relleno
    if (tipoDe(id) === "desarrollo") {
      if (nivelAntes <= UMBRAL_RELLENO && calcularPorcentaje(id) >= 99) {
        anotarRelleno(id);
      } else {
        localStorage.removeItem(id + "-contoRelleno"); // Este arrastre no contó
      }
      actualizarBarra(id);
    }
  }

  // Al tocar la barra
  barra.onpointerdown = function (evento) {
    if (leerModo(id) !== "manual") return;
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
    if (leerModo(id) === "manual") evento.preventDefault();
  };
}

// Agrega una barra nueva al final de la lista y la pone en pantalla
function agregarActividad(nombre, boton) {
  const esEmocion = pestanaActual === "emociones";
  const nueva = {
    id: "barra" + Date.now(), // Número único: los milisegundos de este instante
    nombre: nombre,
    boton: boton || (esEmocion ? "Lo sentí" : "Lo hice"), // Si no escribió texto de botón, usa este
    tipo: pestanaActual,       // Queda en la pestaña que estoy viendo
  };
  // Las emociones se llenan arrastrando: el dedo dice qué tan fuerte es
  if (esEmocion) localStorage.setItem(nueva.id + "-modo", "manual");
  actividades.push(nueva);
  guardarActividades();
  crearBarra(nueva);
  actualizarBarra(nueva.id);
  actualizarPreestablecidas();
}

// Muestra solo las emociones preestablecidas que todavía no tengo agregadas
function actualizarPreestablecidas() {
  const nombres = actividades.map(a => a.nombre.toLowerCase());
  for (const boton of document.querySelectorAll("#chips button")) {
    boton.hidden = nombres.includes(boton.textContent.toLowerCase());
  }
}

// Quita una barra (preguntando antes) y borra todo lo que tenía guardado
function quitarActividad(id) {
  const actividad = actividades.find(a => a.id === id);
  if (!confirm("¿Quitar la barra " + actividad.nombre + "?")) return;

  actividades = actividades.filter(a => a.id !== id); // Deja todas menos esta
  guardarActividades();
  document.getElementById("necesidad-" + id).remove();

  // Borra sus datos de la libreta
  for (const dato of ["-ultimaVez", "-duracion", "-unidad", "-anterior", "-modo",
                      "-registro", "-contoRelleno", "-puntos", "-puntosAnterior"]) {
    localStorage.removeItem(id + dato);
  }
  actualizarPreestablecidas(); // Si era preestablecida, vuelve a aparecer para agregarla
}

// Mueve una barra un puesto: antes (-1) o después (+1)
function moverActividad(id, direccion) {
  const i = actividades.findIndex(a => a.id === id); // Puesto actual
  let j = i + direccion;                              // Puesto nuevo
  // Salta las barras de la otra pestaña: solo me cambio con una de la mía
  while (j >= 0 && j < actividades.length && tipoDe(actividades[j].id) !== tipoDe(id)) {
    j = j + direccion;
  }
  if (j < 0 || j >= actividades.length) return;       // Ya está en la punta

  // Intercambia las dos barras en la lista y la guarda
  const vecina = actividades[j];
  actividades[j] = actividades[i];
  actividades[i] = vecina;
  guardarActividades();

  // Intercambia las dos tarjetas en pantalla
  const tarjeta = document.getElementById("necesidad-" + id);
  const tarjetaVecina = document.getElementById("necesidad-" + vecina.id);
  if (direccion === -1) {
    tarjetaVecina.before(tarjeta); // Me pongo antes que la vecina
  } else {
    tarjetaVecina.after(tarjeta);  // Me pongo después de la vecina
  }
}

// ===== FUNCIONES DE PANTALLA =====
// Pinta UNA barra: altura y color según qué tan llena está
// En desarrollo, además escribe el nivel y cuántas veces la he llenado
function actualizarBarra(id) {
  const relleno = document.getElementById("relleno-" + id);
  const porcentaje = calcularPorcentaje(id);

  relleno.style.height = porcentaje + "%";

  // Emociones: rojito tirando a rosa; más fuerte cuanto más pesa
  if (tipoDe(id) === "emociones") {
    relleno.style.background = porcentaje > 50 ? "#e8667a" : "#f4a3b0";
    return;
  }

  if (porcentaje > 50) {
    relleno.style.background = "#22b14c";  // Verde
  } else if (porcentaje > 20) {
    relleno.style.background = "#f2c200";  // Amarillo
  } else {
    relleno.style.background = "#e03131";  // Rojo
  }

  if (tipoDe(id) === "desarrollo") {
    const conteo = contarRellenos(id);
    const n = calcularNivel(conteo.total);
    const etiqueta = document.getElementById("nivel-" + id);
    etiqueta.textContent = "Nivel " + n.nivel + " · " + n.rellenos + "/" + n.meta;
    etiqueta.style.background = COLORES_NIVEL[Math.min(n.nivel, COLORES_NIVEL.length) - 1];
    document.getElementById("conteo-" + id).textContent = "🔁 Hoy " + conteo.hoy + " · Mes " + conteo.mes;
  }
}

// Muestra lo que corresponde según el modo de la barra:
// completo = botón de llenar; manual = barra arrastrable con su pista
function aplicarModo(id) {
  const manual = leerModo(id) === "manual";
  document.getElementById("barra-" + id).classList.toggle("manual", manual);
  document.getElementById("boton-" + id).hidden = manual;
  document.getElementById("pista-" + id).hidden = !manual;
}

// Pinta TODAS las barras
function actualizarTodas() {
  for (const actividad of actividades) {
    actualizarBarra(actividad.id);
  }
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
        <button id="subir-${actividad.id}">⬆️ Subir</button>
        <button id="bajar-${actividad.id}">⬇️ Bajar</button>
      </div>
      <div class="ajustes" id="caja-${actividad.id}" hidden>
        <small id="etiqueta-tiempo-${actividad.id}">Se vacía en:</small>
        <input type="number" id="cantidad-${actividad.id}" min="1">
        <select id="unidad-${actividad.id}">
          <option value="horas">Horas</option>
          <option value="dias">Días</option>
        </select>
        <small>Se llena:</small>
        <select id="modo-${actividad.id}">
          <option value="completo">Con un clic</option>
          <option value="manual">Arrastrando</option>
        </select>
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

  // Conecta el botón de recargar (en desarrollo también cuenta el relleno)
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

  // Conecta los botones de mover (el menú se queda abierto para mover varias veces)
  document.getElementById("subir-" + actividad.id).onclick = function () {
    moverActividad(actividad.id, -1);
  };
  document.getElementById("bajar-" + actividad.id).onclick = function () {
    moverActividad(actividad.id, 1);
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

  // Conecta el botón de guardar los ajustes (duración y modo de llenado)
  document.getElementById("guardar-" + actividad.id).onclick = function () {
    const cantidad = Number(document.getElementById("cantidad-" + actividad.id).value);
    const unidad = document.getElementById("unidad-" + actividad.id).value;
    const modo = document.getElementById("modo-" + actividad.id).value;
    if (cantidad <= 0) return; // No deja guardar cero ni números negativos
    guardarDuracion(actividad.id, cantidad, unidad);
    guardarModo(actividad.id, modo);
    document.getElementById("caja-" + actividad.id).hidden = true;
  };

  // Conecta el arrastre y muestra la barra según su modo
  conectarArrastre(actividad.id);
  aplicarModo(actividad.id);

  // En desarrollo: se ven el nivel y el conteo de rellenos
  const esDesarrollo = tipoDe(actividad.id) === "desarrollo";
  document.getElementById("nivel-" + actividad.id).hidden = !esDesarrollo;
  document.getElementById("conteo-" + actividad.id).hidden = !esDesarrollo;

  // En emociones: tarjeta en tonos rosados y "se pasa" en vez de "se vacía"
  if (tipoDe(actividad.id) === "emociones") {
    document.getElementById("necesidad-" + actividad.id).classList.add("emocion");
    document.getElementById("etiqueta-tiempo-" + actividad.id).textContent = "Se pasa en:";
  }

  // Si no es de la pestaña que estoy viendo, la escondo
  document.getElementById("necesidad-" + actividad.id).hidden = tipoDe(actividad.id) !== pestanaActual;
}

// Muestra solo las barras de una pestaña y pinta el botón de esa pestaña
function mostrarPestana(tipo) {
  pestanaActual = tipo;
  for (const actividad of actividades) {
    document.getElementById("necesidad-" + actividad.id).hidden = tipoDe(actividad.id) !== tipo;
  }
  // Pinta solo el botón de la pestaña que estoy viendo
  for (const pestana of PESTANAS) {
    document.getElementById("pestana-" + pestana).classList.toggle("activa", pestana === tipo);
  }
  // Las preestablecidas solo salen en la pestaña de emociones
  document.getElementById("preestablecidas").hidden = tipo !== "emociones";
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

// ===== BARRAS DE DESARROLLO POR DEFECTO PARA QUIEN YA USABA LA APP =====
// Quien abre la app por primera vez ya las recibe en la lista inicial.
// Quien ya tenía su lista guardada las recibe una sola vez aquí,
// saltando las que ya tenga con el mismo nombre (para no duplicar).
if (localStorage.getItem("desarrolloPorDefecto") === null) {
  const nombres = actividades.map(a => a.nombre.toLowerCase());
  for (const inicial of ACTIVIDADES_INICIALES) {
    if (inicial.tipo === "desarrollo" && !nombres.includes(inicial.nombre.toLowerCase())) {
      actividades.push({ ...inicial, id: inicial.id + Date.now() }); // Id nuevo para no chocar
    }
  }
  guardarActividades();
  localStorage.setItem("desarrolloPorDefecto", "si"); // Ya no lo vuelve a hacer
}

// ===== ARRANQUE =====
// Fabrica una barra por cada actividad de la lista
for (const actividad of actividades) {
  crearBarra(actividad);
}

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
  agregarActividad(nombre, boton);
  document.getElementById("nuevo-nombre").value = "";
  document.getElementById("nuevo-boton").value = "";
  document.getElementById("caja-agregar").hidden = true;
};

// Conecta los botones de las pestañas
for (const pestana of PESTANAS) {
  document.getElementById("pestana-" + pestana).onclick = function () {
    mostrarPestana(pestana);
  };
}

// Fabrica un botoncito por cada emoción preestablecida: un toque y queda agregada
for (const nombre of PREESTABLECIDAS) {
  const boton = document.createElement("button");
  boton.textContent = nombre;
  boton.onclick = function () {
    agregarActividad(nombre, "");
    document.getElementById("caja-agregar").hidden = true;
  };
  document.getElementById("chips").append(boton);
}
actualizarPreestablecidas();

actualizarTodas();                  // Las pinta al abrir
setInterval(actualizarTodas, 1000); // Y las repinta cada segundo
