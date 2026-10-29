// ===== MI INFORME =====
// Pantalla aparte (se abre desde ☰) que lee el historial de todas las barras y lo resume:
// cuántas veces llené mis barras, qué días, cuáles más, qué tan llenas estuvieron y cuándo fue la última vez.
// Aquí sí aparece "hace X días", pero con calma: sin rojo ni alertas. Y solo se compara si fue mejor.
// (Más adelante, cuando hagamos el cobro, esta pantalla será de pago)

const DIA = 24 * 60 * 60 * 1000;
const PERIODOS = { semana: 7, mes: 30 };        // Cuántos días mira cada vista
const LETRAS_DIA = ["D", "L", "M", "M", "J", "V", "S"]; // getDay(): 0 es domingo

let periodoInforme = "semana";

// Medianoche del día de esa hora (para agrupar por días)
function inicioDelDia(hora) {
  const fecha = new Date(hora);
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

// Una vez = una anotación del historial en la que la barra subió o se rellenó
// (si arrastré una barra hacia abajo, eso no es "hacerlo")
function vecesDeLaBarra(id, desde, hasta) {
  return leerHistorial(id).filter(fila => fila[0] >= desde && fila[0] < hasta && fila[2] >= fila[1]);
}

// Qué tan llena estuvo la barra, en promedio, durante el período (de 0 a 100)
// Rearma el nivel hora por hora con el historial: después de cada anotación,
// la barra arranca en el nivel "después" y se va vaciando con su duración.
// Las horas de antes de la primera anotación no cuentan (no sé cómo estaba).
// Si no hay ninguna hora con datos, devuelve null.
function promedioDeNivel(id, desde, hasta) {
  const historial = leerHistorial(id);
  if (historial.length === 0) return null;
  const duracion = leerDuracion(id);
  const fin = Math.min(hasta, Date.now());
  let suma = 0;
  let cuantas = 0;
  let cual = -1; // La última anotación que ya pasó
  for (let hora = desde; hora < fin; hora += 60 * 60 * 1000) {
    while (cual + 1 < historial.length && historial[cual + 1][0] <= hora) cual++;
    if (cual < 0) continue;
    const [cuando, , despues] = historial[cual];
    suma += Math.max(0, despues - ((hora - cuando) / duracion) * 100);
    cuantas++;
  }
  return cuantas === 0 ? null : suma / cuantas;
}

// La última vez que la hice (de todo el historial), o null si nunca
function ultimaVezQueLaHice(id) {
  const veces = leerHistorial(id).filter(fila => fila[2] >= fila[1]);
  return veces.length ? veces[veces.length - 1][0] : null;
}

function textoHace(hora) {
  if (hora === null) return "todavía no";
  const dias = Math.round((inicioDelDia(Date.now()) - inicioDelDia(hora)) / DIA);
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return "hace " + dias + " días";
}

// Atajo para fabricar un elemento con clase y texto (el texto siempre como texto puro)
function hacer(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function seccion(titulo) {
  const caja = hacer("section", "informe-seccion");
  caja.append(hacer("h3", "", titulo));
  return caja;
}

function pintarInforme() {
  const dias = PERIODOS[periodoInforme];
  const hasta = inicioDelDia(Date.now()) + DIA;    // Hasta el final de hoy
  const desde = hasta - dias * DIA;
  const desdeAnterior = desde - dias * DIA;        // El período de antes, para comparar
  const nombrePeriodo = periodoInforme === "semana" ? "últimos 7 días" : "últimos 30 días";

  document.querySelectorAll(".informe-periodo button").forEach(boton => {
    boton.classList.toggle("elegido", boton.dataset.periodo === periodoInforme);
  });

  const contenido = document.getElementById("informe-contenido");
  contenido.innerHTML = "";

  // Cuántas veces hice cada barra, en este período y en el anterior
  const datos = actividades.map(actividad => ({
    actividad: actividad,
    veces: vecesDeLaBarra(actividad.id, desde, hasta),
    vecesAntes: vecesDeLaBarra(actividad.id, desdeAnterior, desde).length,
  }));
  const total = datos.reduce((suma, dato) => suma + dato.veces.length, 0);
  const totalAntes = datos.reduce((suma, dato) => suma + dato.vecesAntes, 0);

  // Cuántas veces por día (para el calendario)
  const porDia = {};
  for (const dato of datos) {
    for (const fila of dato.veces) {
      const dia = inicioDelDia(fila[0]);
      porDia[dia] = (porDia[dia] || 0) + 1;
    }
  }
  const diasActivos = Object.keys(porDia).length;

  // --- 1. Resumen (y la comparación, solo si fue mejor) ---
  const resumen = hacer("section", "informe-seccion informe-resumen");
  if (total === 0) {
    resumen.append(hacer("p", "informe-grande", "Aquí vas a ver todo lo que haces 💚"));
    resumen.append(hacer("p", "", "Cuando llenes tus barras, aparecerá en este informe."));
  } else {
    resumen.append(hacer("p", "informe-numero", String(total)));
    resumen.append(hacer("p", "", (total === 1 ? "vez llenaste tus barras" : "veces llenaste tus barras") +
      " en los " + nombrePeriodo + (diasActivos > 1 ? ", en " + diasActivos + " días distintos." : ".")));
    if (total > totalAntes && totalAntes > 0) {
      const mas = total - totalAntes;
      resumen.append(hacer("p", "informe-mejor",
        "🎉 " + mas + (mas === 1 ? " vez más" : " veces más") + " que en los " + dias + " días anteriores."));
    }
  }
  contenido.append(resumen);

  // --- 2. Calendario: un cuadrito por día, más verde mientras más hice ---
  const calendario = seccion(periodoInforme === "semana" ? "Tu semana" : "Tu mes");
  const cuadricula = hacer("div", "informe-calendario");
  const maximoDia = Math.max(1, ...Object.values(porDia));
  // En el mes, el primer cuadrito se corre hasta su día de la semana (las columnas van de lunes a domingo)
  if (periodoInforme === "mes") {
    for (const letra of ["L", "M", "M", "J", "V", "S", "D"]) cuadricula.append(hacer("small", "informe-letra", letra));
    const corrimiento = (new Date(desde).getDay() + 6) % 7;
    for (let i = 0; i < corrimiento; i++) cuadricula.append(hacer("span", ""));
  }
  for (let dia = desde; dia < hasta; dia += DIA) {
    const fecha = new Date(dia);
    const veces = porDia[inicioDelDia(dia)] || 0;
    const cuadro = hacer("div", "informe-dia");
    // De 0 a 4 tonos de verde según cuánto hice ese día comparado con mi mejor día
    cuadro.dataset.tono = veces === 0 ? 0 : Math.ceil((veces / maximoDia) * 4);
    if (dia === hasta - DIA) cuadro.classList.add("hoy");
    if (periodoInforme === "semana") cuadro.append(hacer("small", "", LETRAS_DIA[fecha.getDay()]));
    cuadro.append(hacer("span", "", periodoInforme === "semana" ? (veces ? String(veces) : "") : String(fecha.getDate())));
    cuadro.title = fecha.toLocaleDateString() + ": " + veces + (veces === 1 ? " vez" : " veces");
    cuadricula.append(cuadro);
  }
  calendario.append(cuadricula);
  contenido.append(calendario);

  // --- 3. Lo que más hice, por grupo ---
  const ranking = seccion("Lo que más hiciste");
  const maximoBarra = Math.max(1, ...datos.map(dato => dato.veces.length));
  let algunaFila = false;
  for (const grupo of grupos) {
    const delGrupo = datos
      .filter(dato => dato.actividad.grupo === grupo.id && dato.veces.length > 0)
      .sort((a, b) => b.veces.length - a.veces.length);
    if (delGrupo.length === 0) continue;
    algunaFila = true;
    if (grupos.length > 1) ranking.append(hacer("h4", "", grupo.nombre));
    for (const dato of delGrupo) {
      const fila = hacer("div", "informe-fila");
      fila.append(hacer("span", "informe-nombre", dato.actividad.nombre));
      const tira = hacer("div", "informe-tira");
      const lleno = hacer("div", "informe-tira-relleno");
      lleno.style.width = (dato.veces.length / maximoBarra) * 100 + "%";
      tira.append(lleno);
      fila.append(tira);
      fila.append(hacer("span", "informe-valor", dato.veces.length + (dato.veces.length === 1 ? " vez" : " veces")));
      ranking.append(fila);
    }
  }
  if (!algunaFila) ranking.append(hacer("p", "informe-suave", "Todavía no hay nada en estos días."));
  contenido.append(ranking);

  // --- 4. Qué tan llenas estuvieron ---
  const niveles = seccion("Qué tan llenas estuvieron");
  const promedios = actividades
    .map(actividad => ({ actividad: actividad, promedio: promedioDeNivel(actividad.id, desde, hasta) }))
    .filter(dato => dato.promedio !== null)
    .sort((a, b) => b.promedio - a.promedio);
  for (const dato of promedios) {
    const fila = hacer("div", "informe-fila");
    fila.append(hacer("span", "informe-nombre", dato.actividad.nombre));
    const tira = hacer("div", "informe-tira");
    const lleno = hacer("div", "informe-tira-relleno");
    lleno.style.width = dato.promedio + "%";
    tira.append(lleno);
    fila.append(tira);
    fila.append(hacer("span", "informe-valor", Math.round(dato.promedio) + "%"));
    niveles.append(fila);
  }
  if (promedios.length === 0) niveles.append(hacer("p", "informe-suave", "Aparecerá cuando llenes tus barras."));
  else niveles.append(hacer("small", "informe-suave", "Es el nivel promedio de cada barra en estos días."));
  contenido.append(niveles);

  // --- 5. La última vez (de siempre, no solo del período) ---
  const ultimas = seccion("La última vez");
  const conFecha = actividades
    .map(actividad => ({ actividad: actividad, hora: ultimaVezQueLaHice(actividad.id) }))
    .sort((a, b) => (b.hora || 0) - (a.hora || 0)); // Las más recientes primero
  for (const dato of conFecha) {
    const fila = hacer("div", "informe-fila informe-fila-simple");
    fila.append(hacer("span", "informe-nombre", dato.actividad.nombre));
    fila.append(hacer("span", "informe-valor", textoHace(dato.hora)));
    ultimas.append(fila);
  }
  contenido.append(ultimas);
}

function abrirInforme() {
  document.getElementById("informe").hidden = false;
  document.body.classList.add("sin-scroll"); // Que la página de atrás no se mueva
  pintarInforme();
  document.getElementById("informe").scrollTop = 0;
}

function cerrarInforme() {
  document.getElementById("informe").hidden = true;
  document.body.classList.remove("sin-scroll");
}

document.getElementById("abrir-informe").onclick = function () {
  document.getElementById("menu-principal").hidden = true;
  abrirInforme();
};
document.getElementById("cerrar-informe").onclick = cerrarInforme;
document.querySelectorAll(".informe-periodo button").forEach(boton => {
  boton.onclick = function () {
    periodoInforme = boton.dataset.periodo;
    pintarInforme();
  };
});
