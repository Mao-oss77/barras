// ===== CONFIGURACIÓN =====
// Cuánto tarda cada barra en vaciarse (10 minutos para probar)
const DURACION = 48 * 60 * 60 * 1000; // 2 días

// ===== LISTA DE ACTIVIDADES =====
// Para agregar una barra nueva, solo agrega un renglón aquí
const ACTIVIDADES = [
  { id: "series",      nombre: "Series",      boton: "Vi series" },
  { id: "videojuegos", nombre: "Videojuegos", boton: "Jugué" },
  { id: "musica",      nombre: "Música",      boton: "Hice música" },
  { id: "proyectos",   nombre: "Proyectos",   boton: "Avancé" },
  { id: "amigos",      nombre: "Amigos",      boton: "Hablé con amigos" },
];

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

// Calcula qué tan llena está la barra de esta actividad
function calcularPorcentaje(id) {
  const tiempoPasado = Date.now() - leerUltimaVez(id);
  let porcentaje = 100 - (tiempoPasado / DURACION) * 100;
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

// Pinta TODAS las barras
function actualizarTodas() {
  for (const actividad of ACTIVIDADES) {
    actualizarBarra(actividad.id);
  }
}

// Fabrica el HTML de una barra y la mete en el panel
function crearBarra(actividad) {
  const panel = document.getElementById("panel");

  panel.insertAdjacentHTML("beforeend", `
    <div class="necesidad">
      <div class="barra">
        <div class="relleno" id="relleno-${actividad.id}"></div>
      </div>
      <p>${actividad.nombre}</p>
      <button id="boton-${actividad.id}">${actividad.boton}</button>
      <button id="deshacer-${actividad.id}">Deshacer</button>
    </div>
  `);

  // Conecta los dos botones de esta barra
  document.getElementById("boton-" + actividad.id).onclick = function () {
    recargar(actividad.id);
  };
  document.getElementById("deshacer-" + actividad.id).onclick = function () {
    deshacer(actividad.id);
  };
}

// ===== ARRANQUE =====
// Fabrica una barra por cada actividad de la lista
for (const actividad of ACTIVIDADES) {
  crearBarra(actividad);
}
actualizarTodas();                  // Las pinta al abrir
setInterval(actualizarTodas, 1000); // Y las repinta cada segundo