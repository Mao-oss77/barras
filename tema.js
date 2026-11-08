// ===== PERSONALIZAR: MODO, COLOR Y FONDO =====
// Cómo se ve cada modo y cada fondo está en estilos.css. Aquí solo se elige cuál está puesto.
// Se carga en la cabeza de la página, antes de pintar nada, para que no se vea un parpadeo del de siempre.
// Se guarda en este dispositivo (cada celular o PC puede tener el suyo).
// Más adelante, con el cobro, aquí se marcan cuáles son de pago.

const MODOS = [
  { id: "claro",  nombre: "Claro", icono: "sol",  fondo: "#ffffff", superficie: "#ffffff", texto: "#111111" },
  { id: "oscuro", nombre: "Oscuro", icono: "luna", fondo: "#121212", superficie: "#1e1e1e", texto: "#eeeeee" },
];

// La paleta de colores listos; además, la persona puede escoger cualquier otro con la bolita del arcoíris
const COLORES = [
  { color: "#22b14c", nombre: "Verde" },
  { color: "#3ddc84", nombre: "Menta" },
  { color: "#00a99d", nombre: "Turquesa" },
  { color: "#4fc3f7", nombre: "Cielo" },
  { color: "#1e88e5", nombre: "Océano" },
  { color: "#8e5cd9", nombre: "Lavanda" },
  { color: "#ec407a", nombre: "Rosa" },
  { color: "#ff7043", nombre: "Coral" },
  { color: "#f2a900", nombre: "Ámbar" },
  { color: "#546e7a", nombre: "Grafito" },
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

// Antes había "temas" que juntaban color y modo: los paso a lo nuevo (solo la primera vez)
const TEMAS_VIEJOS = { verde: "#22b14c", oceano: "#1e88e5", lavanda: "#8e5cd9", noche: "#3ddc84" };
if (localStorage.getItem("tema") !== null) {
  const viejo = localStorage.getItem("tema");
  if (TEMAS_VIEJOS[viejo] && localStorage.getItem("color") === null) localStorage.setItem("color", TEMAS_VIEJOS[viejo]);
  if (viejo === "noche" && localStorage.getItem("modo") === null) localStorage.setItem("modo", "oscuro");
  localStorage.removeItem("tema");
}

function modoGuardado() {
  return localStorage.getItem("modo") === "oscuro" ? "oscuro" : "claro";
}

function colorGuardado() {
  const guardado = localStorage.getItem("color");
  return /^#[0-9a-f]{6}$/i.test(guardado || "") ? guardado : COLORES[0].color;
}

function fondoGuardado() {
  const guardado = localStorage.getItem("fondo");
  if (guardado === "foto" && !localStorage.getItem("fondo-foto")) return "liso";
  return FONDOS.some(f => f.id === guardado) ? guardado : "liso";
}

// Dice si un color es claro (entonces la letra encima va oscura, para que se lea)
function esClaro(color) {
  const canal = i => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5) > 0.4;
}

// Pone el modo y el color en la página (y el color de la barra de arriba del celular)
function ponerColores() {
  const modo = MODOS.find(m => m.id === modoGuardado());
  const color = colorGuardado();
  const raiz = document.documentElement;
  raiz.dataset.modo = modo.id;
  raiz.style.setProperty("--acento", color);
  raiz.style.setProperty("--acento-texto", esClaro(color) ? "#111111" : "#ffffff");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = modo.fondo;
}

// Pone el fondo en la página (si es la foto, también la foto)
function ponerFondo(id) {
  document.documentElement.dataset.fondo = id;
  const foto = localStorage.getItem("fondo-foto");
  if (foto) document.documentElement.style.setProperty("--foto", 'url("' + foto + '")');
  else document.documentElement.style.removeProperty("--foto");
}

ponerColores();
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
  ponerColores(); // Otra vez, ahora que ya existe la etiqueta del color de arriba

  // --- Claro / Oscuro ---
  const listaModos = document.getElementById("lista-modos");
  for (const modo of MODOS) {
    const boton = document.createElement("button");
    boton.dataset.modo = modo.id;
    boton.innerHTML = icono(modo.icono) + " " + modo.nombre;
    // Cada botón se ve como su modo
    boton.style.background = modo.superficie;
    boton.style.color = modo.texto;
    boton.onclick = function () {
      localStorage.setItem("modo", modo.id);
      ponerColores();
      marcarElegidos();
    };
    listaModos.append(boton);
  }

  // --- Paleta de colores ---
  const listaColores = document.getElementById("lista-colores");
  const selectorColor = document.getElementById("elegir-color");
  for (const opcion of COLORES) {
    const boton = document.createElement("button");
    boton.dataset.color = opcion.color;
    boton.style.background = opcion.color;
    boton.title = opcion.nombre;
    boton.setAttribute("aria-label", opcion.nombre);
    boton.onclick = function () {
      localStorage.setItem("color", opcion.color);
      ponerColores();
      marcarElegidos();
    };
    listaColores.append(boton);
  }
  // La bolita del arcoíris: abre el selector de color del celular para escoger cualquiera
  const propio = document.createElement("button");
  propio.className = "color-propio";
  propio.title = "Escoge tu color";
  propio.setAttribute("aria-label", "Escoge tu color");
  propio.onclick = function () {
    selectorColor.value = colorGuardado();
    selectorColor.click();
  };
  listaColores.append(propio);
  // Mientras mueve el selector, el color se va viendo en toda la app
  selectorColor.oninput = function () {
    localStorage.setItem("color", this.value);
    ponerColores();
    marcarElegidos();
  };

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
    if (fondo.id === "foto") muestra.innerHTML = icono("camara");
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
    for (const boton of listaModos.children) boton.classList.toggle("elegido", boton.dataset.modo === modoGuardado());
    const color = colorGuardado();
    const esDeLaPaleta = COLORES.some(c => c.color === color);
    for (const boton of listaColores.querySelectorAll("[data-color]")) {
      boton.classList.toggle("elegido", boton.dataset.color === color);
    }
    // Si el color se escogió a mano, la bolita del arcoíris queda marcada con un chulito
    propio.classList.toggle("elegido", !esDeLaPaleta);
    propio.innerHTML = icono(esDeLaPaleta ? "mas" : "listo");
    for (const boton of listaFondos.children) boton.classList.toggle("elegido", boton.dataset.fondo === fondoGuardado());
    // Si ya hay una foto, la muestra de "Tu foto" la enseña en vez de la camarita
    const muestraFoto = listaFondos.querySelector('.muestra-fondo[data-fondo="foto"]');
    muestraFoto.innerHTML = localStorage.getItem("fondo-foto") ? "" : icono("camara");
  }

  const ventana = document.getElementById("ventana-tema");
  function cerrar() {
    ventana.hidden = true;
  }
  document.getElementById("abrir-temas").onclick = function () {
    document.getElementById("menu-principal").hidden = true;
    marcarElegidos();
    ventana.hidden = false;
    ventana.querySelector(".ventana").scrollTop = 0;
  };
  document.getElementById("cerrar-temas").onclick = cerrar;
  document.getElementById("listo-temas").onclick = cerrar;
  // Tocar afuera de la cajita también la cierra
  ventana.addEventListener("click", function (evento) {
    if (evento.target === ventana) cerrar();
  });
});
