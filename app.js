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

// ===== DESARROLLO (PUNTOS DE EXPERIENCIA) =====
const PUNTOS_POR_CLIC = 10;  // Cuánto suma cada clic
const META_NIVEL_1 = 30;     // Puntos para pasar el nivel 1; cada nivel pide 30 más (30, 60, 90...)

// Color de la barra según el nivel (del nivel 5 en adelante se queda el último)
//                     bronce     plata      oro        diamante   maestro
const COLORES_NIVEL = ["#cd7f32", "#a8a9ad", "#f2c200", "#4fc3f7", "#9b59b6"];

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

// Dice de qué pestaña es una barra (las viejas, sin tipo, son de satisfacción)
function tipoDe(id) {
  const actividad = actividades.find(a => a.id === id);
  return actividad.tipo || "satisfaccion";
}

// Lee los puntos acumulados de una barra de desarrollo
function leerPuntos(id) {
  return Number(localStorage.getItem(id + "-puntos") || 0);
}

// Suma puntos, anotando antes los viejos por si me equivoqué
function sumarPuntos(id) {
  localStorage.setItem(id + "-puntosAnterior", leerPuntos(id));
  localStorage.setItem(id + "-puntos", leerPuntos(id) + PUNTOS_POR_CLIC);
  actualizarBarra(id);
}

// Convierte los puntos totales en nivel, puntos del nivel actual y meta
// Ej: 50 puntos = nivel 2 (gastó 30 en el nivel 1) con 20 de 60
function calcularNivel(puntosTotales) {
  let nivel = 1;
  let puntos = puntosTotales;
  let meta = META_NIVEL_1;
  while (puntos >= meta) {  // Mientras alcance para pasar de nivel...
    puntos = puntos - meta; // ...gasta los puntos de ese nivel
    nivel = nivel + 1;      // ...sube uno
    meta = META_NIVEL_1 * nivel; // ...y el siguiente pide más
  }
  return { nivel: nivel, puntos: puntos, meta: meta };
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
  // En desarrollo, deshacer devuelve los puntos de antes
  if (tipoDe(id) === "desarrollo") {
    const puntosAnteriores = localStorage.getItem(id + "-puntosAnterior");
    if (puntosAnteriores === null) return;
    localStorage.setItem(id + "-puntos", puntosAnteriores);
    localStorage.removeItem(id + "-puntosAnterior");
    actualizarBarra(id);
    return;
  }

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
    tipo: pestanaActual,       // Queda en la pestaña que estoy viendo
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
  for (const dato of ["-ultimaVez", "-duracion", "-unidad", "-anterior", "-modo", "-puntos", "-puntosAnterior"]) {
    localStorage.removeItem(id + dato);
  }
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
// Pinta UNA barra: altura y color según el nivel
function actualizarBarra(id) {
  const relleno = document.getElementById("relleno-" + id);

  // Barras de desarrollo: se llenan con puntos y su color depende del nivel
  if (tipoDe(id) === "desarrollo") {
    const n = calcularNivel(leerPuntos(id));
    relleno.style.height = (n.puntos / n.meta) * 100 + "%";
    relleno.style.background = COLORES_NIVEL[Math.min(n.nivel, COLORES_NIVEL.length) - 1];
    document.getElementById("nivel-" + id).textContent = "Nivel " + n.nivel + " · " + n.puntos + "/" + n.meta;
    return; // Ya terminé; lo de abajo es para las de satisfacción
  }

  const porcentaje = calcularPorcentaje(id);

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
  const tarjetaAgregar = document.getElementById("tarjeta-agregar");

  tarjetaAgregar.insertAdjacentHTML("beforebegin", `
    <div class="necesidad" id="necesidad-${actividad.id}">
      <div class="barra" id="barra-${actividad.id}">
        <div class="relleno" id="relleno-${actividad.id}"></div>
      </div>
      <p id="nombre-${actividad.id}"></p>
      <small class="nivel" id="nivel-${actividad.id}" hidden></small>
      <small class="pista" id="pista-${actividad.id}" hidden>↕ Arrastra la barra</small>
      <button id="boton-${actividad.id}"></button>
      <button class="boton-menu" id="menu-${actividad.id}" aria-label="Más opciones">⋮</button>
      <div id="opciones-${actividad.id}" hidden>
        <button id="deshacer-${actividad.id}">Deshacer</button>
        <button id="ajustes-${actividad.id}">⚙️ Ajustes</button>
        <button id="subir-${actividad.id}">⬆️ Subir</button>
        <button id="bajar-${actividad.id}">⬇️ Bajar</button>
      </div>
      <div class="ajustes" id="caja-${actividad.id}" hidden>
        <div id="tiempo-${actividad.id}">
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
        </div>
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
    if (tipoDe(actividad.id) === "desarrollo") {
      sumarPuntos(actividad.id);
    } else {
      recargar(actividad.id);
    }
  };
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

  // En desarrollo: se ve el nivel y se esconden los ajustes de tiempo (no se vacía sola)
  const esDesarrollo = tipoDe(actividad.id) === "desarrollo";
  document.getElementById("nivel-" + actividad.id).hidden = !esDesarrollo;
  document.getElementById("tiempo-" + actividad.id).hidden = esDesarrollo;

  // Si no es de la pestaña que estoy viendo, la escondo
  document.getElementById("necesidad-" + actividad.id).hidden = tipoDe(actividad.id) !== pestanaActual;
}

// Muestra solo las barras de una pestaña y pinta el botón de esa pestaña
function mostrarPestana(tipo) {
  pestanaActual = tipo;
  for (const actividad of actividades) {
    document.getElementById("necesidad-" + actividad.id).hidden = tipoDe(actividad.id) !== tipo;
  }
  document.getElementById("pestana-satisfaccion").classList.toggle("activa", tipo === "satisfaccion");
  document.getElementById("pestana-desarrollo").classList.toggle("activa", tipo === "desarrollo");
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
document.getElementById("pestana-satisfaccion").onclick = function () {
  mostrarPestana("satisfaccion");
};
document.getElementById("pestana-desarrollo").onclick = function () {
  mostrarPestana("desarrollo");
};

actualizarTodas();                  // Las pinta al abrir
setInterval(actualizarTodas, 1000); // Y las repinta cada segundo