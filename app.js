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

// ===== LISTA DE ACTIVIDADES =====
// Barras con las que arranca alguien que abre la app por primera vez
const ACTIVIDADES_INICIALES = [
  { id: "series",      nombre: "Series",      boton: "Vi series" },
  { id: "videojuegos", nombre: "Videojuegos", boton: "Jugué" },
  { id: "musica",      nombre: "Música",      boton: "Hice música" },
  { id: "proyectos",   nombre: "Proyectos",   boton: "Avancé" },
  { id: "amigos",      nombre: "Amigos",      boton: "Hablé con amigos" },
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
// Si nunca la he registrado, arranca con la hora de ahora (barra llena)
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
  if (guardado === null) return DURACION_POR_DEFECTO;
  return Number(guardado);
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

// ===== FUNCIONES DE BOTONES =====
// Recarga la barra, anotando antes la hora vieja por si me equivoqué
function recargar(id) {
  localStorage.setItem(id + "-anterior", leerUltimaVez(id));
  localStorage.setItem(id + "-ultimaVez", Date.now());
  actualizarBarra(id);
}

// Deshace la última recarga de esta actividad
function deshacer(id) {
  const anterior = localStorage.getItem(id + "-anterior");
  if (anterior === null) return;
  localStorage.setItem(id + "-ultimaVez", anterior);
  localStorage.removeItem(id + "-anterior");
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
function conectarArrastre(id) {
  const barra = document.getElementById("barra-" + id);
  let arrastrando = false;

  // Convierte la altura del dedo (o del mouse) en un porcentaje de la barra
  function nivelDesdeDedo(evento) {
    const caja = barra.getBoundingClientRect();
    let porcentaje = ((caja.bottom - evento.clientY) / caja.height) * 100;
    if (porcentaje < 0) porcentaje = 0;
    if (porcentaje > 100) porcentaje = 100;
    return porcentaje;
  }

  // Al tocar la barra: anoto el nivel viejo (para Deshacer) y empiezo a arrastrar
  barra.onpointerdown = function (evento) {
    if (leerModo(id) !== "manual") return;
    arrastrando = true;
    barra.setPointerCapture(evento.pointerId);
    localStorage.setItem(id + "-anterior", leerUltimaVez(id));
    ponerNivel(id, nivelDesdeDedo(evento));
  };

  // Mientras muevo el dedo, la barra sigue al dedo
  barra.onpointermove = function (evento) {
    if (!arrastrando) return;
    ponerNivel(id, nivelDesdeDedo(evento));
  };

  // Al soltar, dejo de arrastrar
  barra.onpointerup = function () { arrastrando = false; };
  barra.onpointercancel = function () { arrastrando = false; };
}

// Agrega una barra nueva al final de la lista y la pone en pantalla
function agregarActividad(nombre, boton) {
  const nueva = {
    id: "barra" + Date.now(), // Número único: los milisegundos de este instante
    nombre: nombre,
    boton: boton || "Lo hice", // Si no escribió texto de botón, usa este
  };
  actividades.push(nueva);
  guardarActividades();
  crearBarra(nueva);
  actualizarBarra(nueva.id);
}

// Quita una barra (preguntando antes) y borra todo lo que tenía guardado
function quitarActividad(id) {
  const actividad = actividades.find(a => a.id === id);
  if (!confirm("¿Quitar la barra " + actividad.nombre + "?")) return;

  actividades = actividades.filter(a => a.id !== id); // Deja todas menos esta
  guardarActividades();
  document.getElementById("necesidad-" + id).remove();

  // Borra sus datos de la libreta
  for (const dato of ["-ultimaVez", "-duracion", "-unidad", "-anterior", "-modo"]) {
    localStorage.removeItem(id + dato);
  }
}

// ===== FUNCIONES DE PANTALLA =====
// Pinta UNA barra: altura y color según el nivel
function actualizarBarra(id) {
  const porcentaje = calcularPorcentaje(id);
  const relleno = document.getElementById("relleno-" + id);

  relleno.style.height = porcentaje + "%";

  if (porcentaje > 50) {
    relleno.style.background = "#22b14c";  // Verde
  } else if (porcentaje > 20) {
    relleno.style.background = "#f2c200";  // Amarillo
  } else {
    relleno.style.background = "#e03131";  // Rojo
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
  const panel = document.getElementById("panel");

  panel.insertAdjacentHTML("beforeend", `
    <div class="necesidad" id="necesidad-${actividad.id}">
      <div class="barra" id="barra-${actividad.id}">
        <div class="relleno" id="relleno-${actividad.id}"></div>
      </div>
      <p id="nombre-${actividad.id}"></p>
      <small class="pista" id="pista-${actividad.id}" hidden>↕ Arrastra la barra</small>
      <button id="boton-${actividad.id}"></button>
      <button id="deshacer-${actividad.id}">Deshacer</button>
      <button id="ajustes-${actividad.id}">⚙️ Ajustes</button>
      <div class="ajustes" id="caja-${actividad.id}" hidden>
        <small>Se vacía en:</small>
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

  // Conecta los botones de recargar y deshacer
  document.getElementById("boton-" + actividad.id).onclick = function () {
    recargar(actividad.id);
  };
  document.getElementById("deshacer-" + actividad.id).onclick = function () {
    deshacer(actividad.id);
  };

  // Conecta el botón que abre la cajita de ajustes
  document.getElementById("ajustes-" + actividad.id).onclick = function () {
    abrirAjustes(actividad.id);
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

actualizarTodas();                  // Las pinta al abrir
setInterval(actualizarTodas, 1000); // Y las repinta cada segundo