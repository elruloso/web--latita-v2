// =============================================================
// Catálogo de películas
// Lee datos/peliculas.csv y datos/generos.csv con fetch
// (los mismos archivos que genera el programa de Python)
// =============================================================

// Las rutas son relativas al index.html, no a este archivo
const RUTA_PELICULAS = "datos/peliculas.csv";
const RUTA_GENEROS = "datos/generos.csv";
const POSTER_POR_DEFECTO = "datos/posters/sin-poster.svg";

// Un color por género (se reparten según el id_genero)
const COLORES_GENERO = ["#4cc9f0", "#ff6b9a", "#9be564", "#ffb703", "#c77dff", "#ff8a5b"];

// Elementos del DOM
const inputBuscar = document.querySelector("#buscar");
const selectGenero = document.querySelector("#genero");
const ayuda = document.querySelector("#ayuda");
const cargando = document.querySelector("#cargando");
const mensaje = document.querySelector("#mensaje");
const contador = document.querySelector("#contador");
const contenedor = document.querySelector("#contenedor");

// Datos en memoria (solo los registros activos, baja = "0")
let peliculas = [];
let nombresGenero = {}; // { "1": "Acción", "2": "Comedia", ... }


// -------------------------------------------------------------
// 1. Leer el CSV
// -------------------------------------------------------------

// Convierte el texto de un CSV en una lista de filas (lista de listas).
// Respeta las comillas: "Hola, mundo" es UN solo campo aunque tenga una coma.
function parsearCSV(texto) {
  // Algunos programas (Excel) agregan un caracter invisible al principio
  if (texto.charCodeAt(0) === 0xFEFF) {
    texto = texto.slice(1);
  }

  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"'; // "" dentro de comillas es una comilla
        i++;
      } else if (c === '"') {
        entreComillas = false; // se cierran las comillas
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo); // fin de un campo
      campo = "";
    } else if (c === "\n") {
      fila.push(campo); // fin de una línea
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }

  // Última línea, por si el archivo no termina con salto de línea
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas;
}

// La primera fila es el encabezado: sus nombres pasan a ser las
// propiedades de cada objeto. Ej: { id_pelicula: "1", nombre_pelicula: "Matrix", ... }
function csvAObjetos(texto) {
  const filas = parsearCSV(texto);
  const encabezado = filas[0];
  const objetos = [];

  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];

    // Ignora las líneas vacías
    if (fila.length === 1 && fila[0] === "") {
      continue;
    }

    const objeto = {};
    for (let j = 0; j < encabezado.length; j++) {
      objeto[encabezado[j]] = fila[j];
    }
    objetos.push(objeto);
  }

  return objetos;
}

// fetch del archivo + conversión a objetos
async function leerCSV(ruta) {
  const respuesta = await fetch(ruta);

  if (!respuesta.ok) {
    throw new Error(`No se pudo leer ${ruta} (estado ${respuesta.status})`);
  }

  const texto = await respuesta.text(); // es un CSV, no un JSON
  return csvAObjetos(texto);
}


// -------------------------------------------------------------
// 2. Cargar los datos y preparar la pantalla
// -------------------------------------------------------------

async function cargarDatos() {
  try {
    const todosLosGeneros = await leerCSV(RUTA_GENEROS);
    const todasLasPeliculas = await leerCSV(RUTA_PELICULAS);

    // Baja lógica: solo se muestran los registros con baja = "0"
    const generosActivos = todosLosGeneros.filter(g => g.baja === "0");
    peliculas = todasLasPeliculas.filter(p => p.baja === "0");

    for (const genero of generosActivos) {
      nombresGenero[genero.id_genero] = genero.nombre;
    }

    llenarSelect(generosActivos);
    inputBuscar.disabled = false;
    selectGenero.disabled = false;
    filtrar();
  } catch (error) {
    console.error("Hubo un problema al cargar los datos:", error.message);
    mensaje.textContent =
      "No se pudieron cargar los datos. Abrí la página con Live Server (http://) " +
      "y no con doble clic sobre el archivo (file://).";
    mensaje.classList.add("error");
  } finally {
    cargando.hidden = true; // se ejecuta siempre, haya salido bien o mal
  }
}

// Agrega una <option> por cada género activo
function llenarSelect(generosActivos) {
  for (const genero of generosActivos) {
    const opcion = document.createElement("option");
    opcion.value = genero.id_genero;
    opcion.textContent = genero.nombre;
    selectGenero.appendChild(opcion);
  }
}


// -------------------------------------------------------------
// 3. Mostrar las cards
// -------------------------------------------------------------

function crearCard(pelicula) {
  const card = document.createElement("article");
  card.classList.add("card");

  // El CSS usa esta variable para pintar el borde y la etiqueta del género
  const color = COLORES_GENERO[Number(pelicula.id_genero) % COLORES_GENERO.length];
  if (color) {
    card.style.setProperty("--color", color);
  }

  const img = document.createElement("img");
  img.src = pelicula.url_poster;
  img.alt = `Póster de ${pelicula.nombre_pelicula}`;
  img.loading = "lazy";
  // Si la URL del póster no funciona, se muestra una imagen por defecto
  img.addEventListener("error", () => {
    img.src = POSTER_POR_DEFECTO;
  }, { once: true });

  const cuerpo = document.createElement("div");
  cuerpo.classList.add("card-body");

  const titulo = document.createElement("h3");
  titulo.textContent = pelicula.nombre_pelicula;

  const genero = document.createElement("span");
  genero.classList.add("genero");
  genero.textContent = nombresGenero[pelicula.id_genero] || "Sin género";

  const resena = document.createElement("p");
  resena.classList.add("resena");
  resena.textContent = pelicula.resena;
  resena.title = pelicula.resena; // al pasar el mouse se ve la reseña completa

  cuerpo.appendChild(titulo);
  cuerpo.appendChild(genero);
  cuerpo.appendChild(resena);
  card.appendChild(img);
  card.appendChild(cuerpo);

  return card;
}

function mostrarPeliculas(lista) {
  contenedor.innerHTML = "";

  for (const pelicula of lista) {
    contenedor.appendChild(crearCard(pelicula));
  }

  if (lista.length === 0) {
    const vacio = document.createElement("p");
    vacio.classList.add("vacio");
    vacio.textContent = "No se encontraron películas con esos filtros.";
    contenedor.appendChild(vacio);
  }

  contador.textContent = `Mostrando ${lista.length} de ${peliculas.length} películas`;
}


// -------------------------------------------------------------
// 4. Filtros
// -------------------------------------------------------------

function filtrar() {
  const texto = inputBuscar.value.trim().toLowerCase();
  const idGenero = selectGenero.value; // "" significa "Todos los géneros"

  let resultado = peliculas;

  // El nombre filtra recién cuando se escribió la tercera letra
  if (texto.length >= 3) {
    resultado = resultado.filter(p => p.nombre_pelicula.toLowerCase().includes(texto));
  }

  // El género se filtra con el select
  if (idGenero !== "") {
    resultado = resultado.filter(p => p.id_genero === idGenero);
  }

  // Aviso mientras escriben las primeras 1 o 2 letras
  if (texto.length > 0 && texto.length < 3) {
    ayuda.textContent = "Seguí escribiendo: la búsqueda empieza con la 3.ª letra.";
  } else {
    ayuda.textContent = "";
  }

  mostrarPeliculas(resultado);
}


// -------------------------------------------------------------
// 5. Eventos y arranque
// -------------------------------------------------------------

inputBuscar.addEventListener("input", filtrar);   // cada vez que escriben
selectGenero.addEventListener("change", filtrar); // cada vez que eligen un género

cargarDatos();
