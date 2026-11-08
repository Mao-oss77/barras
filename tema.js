// ===== PERSONALIZAR: COLOR Y FONDO =====
// Los colores de cada tema y cómo se ve cada fondo están en estilos.css. Aquí solo se elige cuál está puesto.
// Se carga en la cabeza de la página, antes de pintar nada, para que no se vea un parpadeo del de siempre.
// Se guarda en este dispositivo (cada celular o PC puede tener el suyo).
// Más adelante, con el cobro, aquí se marcan cuáles son de pago.

const TEMAS = [
  { id: "verde",   nombre: "Verde",   acento: "#22b14c", fondo: "#ffffff" },
  { id: "oceano",  nombre: "Océano",  acento: "#1e88e5", fondo: "#ffffff" },
  { id: "lavanda", nombre: "Lavanda", acento: "#8e5cd9", fondo: "#ffffff" },
  { id: "noche",   nombre: "Noche",   acento: "#3ddc84", fondo: "#121212" },
];

// "foto" es la que escoge la persona de su galería
const FONDOS = [
  { id: "liso",      nombre: "Liso" },
  { id: "puntos",    nombre: "Puntos" },
  { id: "cuadros",   nombre: "Cuadros" },
  { id: "ondas",     nombre: "Ondas" },
  { id: "burbujas",  nombre: "Burbujas" },
  { id: "garabatos", nombre: "Garabatos" },
  { id: "atardecer", nombre: "Atardecer" },
  { id: "aurora",    nombre: "Aurora" },
  { id: "mar",       nombre: "Mar" },
  { id: "bosque",    nombre: "Bosque" },
  { id: "durazno",   nombre: "Durazno" },
  { id: "galaxia",   nombre: "Galaxia" },
  { id: "foto",      nombre: "Tu foto" },
];

// La foto se achica a este tamaño (el lado más largo) para que quepa en la libreta
const LADO_FOTO = 1280;

function temaGuardado() {
  const guardado = localStorage.getItem("tema");
  return TEMAS.some(t => t.id === guardado) ? guardado : "verde";
}

function fondoGuardado() {
  const guardado = localStorage.getItem("fondo");
  if (guardado === "foto" && !localStorage.getItem("fondo-foto")) return "liso";
  return FONDOS.some(f => f.id === guardado) ? guardado : "liso";
}

// Pone el tema en la página (y el color de la barra de arriba del celular)
function ponerTema(id) {
  const tema = TEMAS.find(t => t.id === id);
  document.documentElement.dataset.tema = tema.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = tema.fondo;
}

// Pone el fondo en la página (si es la foto, también la foto)
function ponerFondo(id) {
  document.documentElement.dataset.fondo = id;
  const foto = localStorage.getItem("fondo-foto");
  if (foto) document.documentElement.style.setProperty("--foto", 'url("' + foto + '")');
  else document.documentElement.style.removeProperty("--foto");
}

ponerTema(temaGuardado());
ponerFondo(fondoGuardado());

// Achica la foto escogida, la guarda y la pone de fondo
function usarFoto(archivo, alTerminar) {
  const direccion = URL.createObjectURL(archivo);
  const imagen = new Image();
  imagen.onload = function () {
    const escala = Math.min(1, LADO_FOTO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    URL.revokeObjectURL(direccion);
    try {
      localStorage.setItem("fondo-foto", lienzo.toDataURL("image/jpeg", 0.8));
    } catch (error) {
      alert("No se pudo guardar esa foto (es muy pesada). Prueba con otra.");
      return;
    }
    localStorage.setItem("fondo", "foto");
    ponerFondo("foto");
    alTerminar();
  };
  imagen.onerror = function () {
    URL.revokeObjectURL(direccion);
    alert("No se pudo abrir esa imagen. Prueba con otra.");
  };
  imagen.src = direccion;
}

// La ventana para elegir (los botones existen cuando la página termina de cargar)
document.addEventListener("DOMContentLoaded", function () {
  ponerTema(temaGuardado()); // Otra vez, ahora que ya existe la etiqueta del color de arriba

  // --- Colores ---
  const listaTemas = document.getElementById("lista-temas");
  for (const tema of TEMAS) {
    const boton = document.createElement("button");
    boton.dataset.tema = tema.id;
    // La muestra: una barrita llena del color del tema, con el fondo del tema
    const muestra = document.createElement("span");
    muestra.className = "muestra-tema";
    muestra.style.background = "linear-gradient(to top, " + tema.acento + " 70%, " + tema.fondo + " 70%)";
    muestra.style.borderColor = tema.id === "noche" ? "#d8d8d8" : "black";
    muestra.style.outline = "6px solid " + tema.fondo;
    boton.append(muestra, tema.nombre);
    boton.onclick = function () {
      localStorage.setItem("tema", tema.id);
      ponerTema(tema.id);
      marcarElegidos();
    };
    listaTemas.append(boton);
  }

  // --- Fondos ---
  const listaFondos = document.getElementById("lista-fondos");
  const selectorFoto = document.getElementById("foto-fondo");
  for (const fondo of FONDOS) {
    const boton = document.createElement("button");
    boton.dataset.fondo = fondo.id;
    // La muestra lleva el mismo fondo en chiquito (estilos.css lo pinta por el data-fondo)
    const muestra = document.createElement("span");
    muestra.className = "muestra-fondo";
    muestra.dataset.fondo = fondo.id;
    if (fondo.id === "foto") muestra.textContent = "📷";
    boton.append(muestra, fondo.nombre);
    boton.onclick = function () {
      if (fondo.id === "foto") {
        selectorFoto.click(); // Siempre deja escoger otra foto
        return;
      }
      localStorage.setItem("fondo", fondo.id);
      ponerFondo(fondo.id);
      marcarElegidos();
    };
    listaFondos.append(boton);
  }
  selectorFoto.onchange = function () {
    const archivo = this.files[0];
    if (archivo) usarFoto(archivo, marcarElegidos);
    this.value = ""; // Para poder escoger la misma foto otra vez si hace falta
  };

  function marcarElegidos() {
    for (const boton of listaTemas.children) boton.classList.toggle("elegido", boton.dataset.tema === temaGuardado());
    for (const boton of listaFondos.children) boton.classList.toggle("elegido", boton.dataset.fondo === fondoGuardado());
    // Si ya hay una foto, la muestra de "Tu foto" la enseña en vez de la camarita
    const muestraFoto = listaFondos.querySelector('.muestra-fondo[data-fondo="foto"]');
    muestraFoto.textContent = localStorage.getItem("fondo-foto") ? "" : "📷";
  }

  document.getElementById("abrir-temas").onclick = function () {
    document.getElementById("menu-principal").hidden = true;
    marcarElegidos();
    document.getElementById("ventana-tema").hidden = false;
  };
  document.getElementById("cerrar-temas").onclick = function () {
    document.getElementById("ventana-tema").hidden = true;
  };
});
