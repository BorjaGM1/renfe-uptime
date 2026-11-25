// E · El billete picado. De un data.json sale un «plano» del billete en décimas de milímetro (el Edmondson mide
// 30,5 × 57 mm: 305 × 570 unidades) y dos pintores lo dibujan igual: uno en SVG, para la página, y otro en canvas,
// para la imagen que se guarda y para la tarjeta de X. Un solo plano: lo que se ve es lo que se comparte.
import * as c from "./common.js";

const e = c.esc;
const NUM = ["ninguna", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
export const word = (n) => NUM[n] ?? String(n);
export const int = (x) => Math.round(x).toLocaleString("es-ES");
export const list = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`);
const EN_FRASE = { web: "la web renfe.com", search: "el buscador de billetes", legacy: "la venta antigua",
  live: "el mapa en tiempo real", gtfs: "el horario GTFS", cercanias: "el tiempo real de Cercanías" };
const EN_TALON = { web: "web", search: "buscador", legacy: "venta antigua", live: "mapa", gtfs: "horarios", cercanias: "Cercanías" };
export const frase = (s) => EN_FRASE[s.key] ?? s.name;
export const enTalon = (s) => EN_TALON[s.key] ?? s.name;
export const LMD = "larga y media distancia";
export const PUNTUAL_MIN = 5;
export const hard = (html) => html.replace(/(\d) (%|min\b|s\b|segundos|minutos|horas|nueves)/g, "$1\u00a0$2");

// ── Color: el color es la clase del billete ──
// En los Edmondson españoles el color del cartón decía la clase: amarillo para la primera, verde para la
// segunda y siena para la tercera; los complementarios y de control, normalmente en azul; en 1969 todo pasó a
// amarillo (CRTM, «La Historia del Billete de Transporte en Madrid 1847-2015», p. 36). Aquí la clase se la gana
// Renfe con su cifra: tercera por debajo de un nueve, segunda de uno a dos, primera de dos en adelante. Ese
// reparto es nuestro; el código de colores, no. Las webs van en el azul de los complementarios; caducado, gris.
//
// Cada paleta trae su mostrador: lo que se ve por los agujeros es el fondo de la página, y es eso lo que hace
// que se lean como agujeros. Contrastes (WCAG), comprobados para cada paleta: tinta sobre cada cartón ≥ 6,5;
// texto secundario del dorso ≥ 4,6; agujero contra cartón ≥ 3,7 (≥ 4,9 en las tres publicables); textos sobre
// el mostrador ≥ 5,8.
export const PALETAS = {
  // Muestreada de las láminas del CRTM (pp. 25 y 37; referencias locales, no se publican). Verde: el Edmondson
  // de RENFE de 2.ª clase de 1949. Amarillo: el Hugin de 1979, el de la unificación. Gris: un documento escolar
  // de los setenta. Tinta: el negro más oscuro de la impresión de 1921. Mostrador: el marrón del fondo de la
  // lámina, sobre el que están fotografiados (y por cuyo agujero se ve). Siena y azul no salen en las láminas:
  // son tierra de Siena natural y un azul de papel llevados a la luminosidad del verde muestreado.
  historica: { nombre: "Histórica", tinta: "#16120f", mostrador: "#4e2f24", sombra: "#1d100b", claro: "#f0dcb4", medio: "#cdb08f", a2: 0.8,
    estampa: "#2a2270", carton: { tercera: "#d29a66", segunda: "#9ad09b", primera: "#e2cc43", azul: "#a9c8dc", gris: "#c6ccc5", recibo: "#f1eee4" } },
  // 1969: todas las clases, en el amarillo de la unificación. La clase solo va impresa.
  1969: { nombre: "1969", tinta: "#16120f", mostrador: "#4e2f24", sombra: "#1d100b", claro: "#f0dcb4", medio: "#cdb08f", a2: 0.8,
    estampa: "#2a2270", carton: { tercera: "#e2cc43", segunda: "#e2cc43", primera: "#e2cc43", azul: "#a9c8dc", gris: "#c6ccc5", recibo: "#f1eee4" } },
  // El mismo código (siena, verde, amarillo, azul) con tonos de hoy, más limpios, sobre azul tinta.
  contemporanea: { nombre: "Contemporánea", tinta: "#0b0e14", mostrador: "#152447", sombra: "#070c1c", claro: "#f3f1ea", medio: "#aab6d0", a2: 0.8,
    carton: { tercera: "#f08a4b", segunda: "#62d6a0", primera: "#ffd426", azul: "#7fc4ff", gris: "#c3c7cd", recibo: "#f3f1ea" } },
  // La paleta por defecto. Aquí el color no dice la clase
  // sino el SERVICIO, como en la identidad de Renfe de 2026 (tres familias: alta velocidad en azul, larga y
  // media distancia en el morado corporativo, y Cercanías, que mantiene su blanco y rojo). Solo los colores,
  // como código de servicio: ni logotipo, ni «galleta», ni la «C», ni su tipografía.
  //   · morado #5B064B: el del logotipo de 2026, según Wikimedia Commons.
  //   · azul #1E4FA3 y rojo #D5001C: APROXIMADOS con criterio; no tenemos los valores exactos.
  // El cartón es blanco en las tres clases (la clase va solo impresa); el servicio lo dicen la franja de arriba
  // y la cifra. Talón y webs, en gris neutro. El mostrador es del mismo morado que la cifra: así la cifra y los
  // agujeros se leen como lo mismo, mostrador que asoma por el cartón. (Antes era gris neutro, #29292c: los
  // agujeros salían negros y la página, apagada.) Ese morado es un punto más hondo que el del logotipo
  // (#5b064b, que se queda en la franja): a toda página el corporativo deslumbraba y el texto costaba de leer.
  "renfe-actual": { nombre: "Renfe actual", tinta: "#1a1a1a", mostrador: "#430438", sombra: "#1d0118", claro: "#ffffff", medio: "#efe2eb", a2: 0.8,
    carton: { tercera: "#ffffff", segunda: "#ffffff", primera: "#ffffff", azul: "#e3e3e0", gris: "#b9bab8", cercanias: "#e2e3dc", recibo: "#f6f6f3" },
    // El mapa de Renfe mezcla alta velocidad con Intercity y Regional y el medidor no los separa: el billete
    // grande va en el morado de larga y media distancia, con una franja en el azul de alta velocidad.
    servicio: { lmd: { acento: "#430438", franja: [["#5b064b", 0.72], ["#1e4fa3", 0.28]] }, cer: { acento: "#d5001c", franja: [["#d5001c", 1]] } } },
};
export const COLOR = { ...PALETAS.historica, id: "historica" };
export function usaPaleta(id) { const k = PALETAS[id] ? id : "renfe-actual"; Object.assign(COLOR, { servicio: null, estampa: PALETAS[k].tinta }, PALETAS[k], { id: k }); T = TIPOS[k]; _hoja = null; _hojaLista = false; _tinta.clear(); return COLOR; }
export const tipos = () => T;
// Mezcla de la tinta con un cartón: el texto secundario del dorso.
export function tinta2(carton) {
  const h = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)), f = h(COLOR.tinta), b = h(carton);
  return `#${f.map((v, i) => Math.round(v * COLOR.a2 + b[i] * (1 - COLOR.a2)).toString(16).padStart(2, "0")).join("")}`;
}
// La clase que da una cifra de nueves (null = ningún fallo medido: primera).
export const CLASES = { tercera: { ord: "3.ª", n: 3 }, segunda: { ord: "2.ª", n: 2 }, primera: { ord: "1.ª", n: 1 } };
export const claseDe = (nines) => (nines === null || nines >= 2 ? "primera" : nines >= 1 ? "segunda" : "tercera");
export const AVISO = "Medidor independiente. No está afiliado a Renfe ni la representa.";
// El que va DENTRO de cada imagen que se guarda.
export const AVISO_IMG = "Medidor independiente. No está afiliado a Renfe ni la representa · No válido para viajar";

// ── Número de serie ──
// No puede reiniciarse: es lo que hace único a cada billete. `rounds` solo cuenta las rondas que el medidor
// conserva (30 días de comprobaciones), así que se le suman las que cabían entre la primera medición de todas
// (EPOCA, fija) y la primera que se conserva (`first_ts`).
const EPOCA = 1795537454;
export const numeroDeSerie = (d) => (d.rounds ?? 0) + Math.max(0, Math.round(((d.first_ts ?? EPOCA) - EPOCA) / d.interval_s));

// Azar con semilla (mulberry32): el descentrado de cada agujero sale del número de serie y de nada más.
function azar(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const parts = (ts, opts) => Object.fromEntries(new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", ...opts })
  .formatToParts(new Date(ts * 1000)).map((p) => [p.type, p.value]));
export function fechaSello(ts) {
  const p = parts(ts, { day: "2-digit", month: "short", year: "2-digit" });
  return `${p.day} ${p.month.replace(".", "").slice(0, 3).toUpperCase()} ${p.year}`;
}

// Intervalo de Wilson a dos colas (95 %), en nueves. Va junto a la cifra, en la prueba.
export function margen(p, n, z = 1.96) {
  if (p === null || p === undefined || !n) return null;
  const den = 1 + (z * z) / n, centre = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [c.nines(Math.max(0, (centre - half) / den)), c.nines(Math.min(0.999999, (centre + half) / den))];
}
// Por debajo del primer nueve, «0,96» redondearía a 1,0 y contradiría el «no llegan»: como mucho 0,9.
export const cifraDe = (n) => (n === null ? null : n < 1 ? Math.min(0.9, Math.round(n * 10) / 10) : n);

// Todo lo que el billete y la página dicen, calculado una vez.
export function lectura(d) {
  const stale = d._stale;
  // `to` es ahora (la última ronda); lo que se enseña es un día: de `from` a `hasta`. De madrugada, el de ayer.
  const to = d._generated, from = d._desde, hasta = d._hasta, hoy = d.day?.today !== false;
  const at = c.hhmm(to);
  const hat = c.hhmm(hasta), sameDay = c.dayMonth(from) === c.dayMonth(hasta);
  const delDia = stale ? "del día" : hoy ? "de hoy" : "de ayer";
  const tc = c.trenesDia(d), wc = c.websDia(d);
  const down = d._down, total = d.services.length;
  const night = !stale && d._ld && !d._ld.now;
  const alert = !stale && down.length > 0;
  const shown = !tc ? null : cifraDe(tc.nines);
  const clase = tc ? claseDe(tc.nines) : null;
  const stock = stale || !tc ? "gris" : clase;
  const n = numeroDeSerie(d);
  const serie = String(n).padStart(6, "0");
  const sello = sameDay ? `${fechaSello(hasta)} · ${c.hhmm(from)}–${hat}` : `${fechaSello(from)} ${c.hhmm(from)} – ${fechaSello(hasta)} ${hat}`;
  // La ventana, dicha como la validez de un billete, de más larga a más corta (se usa la primera que quepa). No
  // pierde la hora de inicio: «válido… hasta» a secas escondería desde cuándo se mide.
  const junta = (t) => fechaSello(t).replace(/ /g, "");
  const validos = sameDay ? [`VÁLIDO ${fechaSello(hasta)} · ${c.hhmm(from)} HASTA ${hat}`, `VÁLIDO ${junta(hasta)} · ${c.hhmm(from)} HASTA ${hat}`, sello]
    : [`VÁLIDO ${junta(from)} ${c.hhmm(from)} HASTA ${junta(hasta)} ${hat}`, sello];
  // Fecha y hora de la ronda, con segundos, como la estampa una máquina.
  const q = parts(to, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const fechaHora = `${q.year}/${q.month}/${q.day} ${q.hour}:${q.minute}:${q.second}`;
  const estado = stale ? "parado" : alert ? "alerta" : night ? "noche" : "normal";
  return { d, stale, to, from, hasta, hat, hoy, delDia, at, sameDay, tc, wc, down, total, night, alert, shown, stock, clase, n, serie, sello, validos, fechaHora, estado };
}

export function remate(tc) {
  if (!tc) return "";
  if (tc.nines === null || !tc.belowOneNine) return "Hoy no\u00a0hay\u00a0chiste.";
  const on = tc.onTimeOf100;
  if (on < 45) return "A\u00a0cara o\u00a0cruz saldrían más:\u00a050.";
  if (on <= 55) return "A\u00a0cara o\u00a0cruz saldrían\u00a050.";
  return "";
}

// ═════════════ Tipos ═════════════
// Un sistema tipográfico por paleta. Cada papel del billete es un «rol»:
//   pila   la familia y sus reservas, con comillas simples (así vale igual en `font` de canvas y en un atributo
//          style de SVG; «Numeradora 49» lleva una cifra en el nombre y sin comillas la declaración no pinta)
//   w, st, it   peso, ancho (solo los que tienen nombre en CSS, que son los que admite canvas) y cursiva
//   k      cuerpo relativo al que pide el plano (las Numeradora tienen un solo peso: lo fuerte va por cuerpo)
//   min    cuerpo mínimo en píxeles reales que fijó el tipógrafo; el plano sabe cuántos píxeles mide su unidad
//          en la pantalla más pequeña en que se pinta, y ningún texto baja de ahí
//   tr     interletrado propio (en em), que sustituye al que pida el plano
//   mayus  se compone en versales (las Numeradora no tienen minúsculas)
// La cifra, además: `coma` (tamaño de la coma respecto a las cifras) y `ka`/`kd` (lo que se le quita o se le
// pone al blanco de antes y de después de la coma, en em, sobre el espaciado propio de la fuente).
const R = (pila, w, x = {}) => ({ pila, w, ...x });
const CASLON = "'Libre Caslon Text', Georgia, serif", N49 = "'Numeradora 49', 'Libre Caslon Text', Georgia, serif";
const ROT = "'Numeradora 49 Rotulo', 'Arial Narrow', Arial, sans-serif";
const CHIVO = "'Chivo Mono', Menlo, monospace", ARCH = "'Archivo', 'Arial Narrow', Arial, sans-serif";
const FD = "'Funnel Display', 'Funnel Sans', system-ui, sans-serif", FS = "'Funnel Sans', system-ui, sans-serif";
const FI = "'Fira Sans', 'Helvetica Neue', Arial, sans-serif", FX = "'Fira Sans Extra Condensed', 'Arial Narrow', Arial, sans-serif";
const XC = "extra-condensed";
export const TIPOS = {
  // La numeradora y la caja de imprenta de 1949: cifra y serie en Numeradora 49 (propia, en fonts/), leyendas en
  // su Rotulo, y la pregunta y el texto en una Caslon de lectura.
  historica: {
    enlace: "family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Chivo+Mono:wght@500",
    maquina: R(N49, 400, { mayus: true, min: 15 }), recibo: R(CHIVO, 500, { mayus: true, min: 12 }),
    cifra: R(N49, 400), serie: R(N49, 400, { min: 15 }), serieChica: R(ROT, 400, { k: 1.12, min: 11.5 }), no: { s: "№", rol: "serie", k: 1, hueco: 0.3 },
    pregunta: R(CASLON, 700, { max: 21 }), unidad: R(ROT, 400, { mayus: true, tr: 0.05, kU: 0.135 }),
    leyenda: R(ROT, 400, { mayus: true, tr: 0.07, k: 1.12, min: 11.5 }), suave: R(ROT, 400, { mayus: true, tr: 0.07, k: 1.12, min: 11.5 }),
    fuerte: R(ROT, 400, { mayus: true, tr: 0.07, k: 1.29, min: 11.5 }), ruta: R(ROT, 400, { mayus: true, tr: 0.05, k: 1.2, min: 11.5 }),
    a: R(CASLON, 400, { it: true, k: 1.12, min: 15 }), sello: R(ROT, 400, { mayus: true, tr: 0.1, k: 1.2, min: 11.5 }), clase: R(ROT, 400, { mayus: true, tr: 0.08, k: 1.4, min: 11.5 }),
    nota: R(ROT, 400, { mayus: true, tr: 0.05, k: 1.12, min: 11.5 }), talon: R(ROT, 400, { mayus: true, tr: 0.05, k: 1.08, min: 11.5 }),
    texto: R(CASLON, 400, { k: 0.92, min: 15 }), frase: R(CASLON, 400),
    pagina: { titulo: [CASLON, 700], texto: [CASLON, 400, "normal"], rotulo: [ROT, 400, "normal", ".07em"], serie: [N49, 400], tabla: "normal", col: "88px" },
  },
  // 1969 / Hugin: lo preimpreso, en grotesca estrecha; lo que estampa la máquina (cifra, serie, fecha, clase),
  // en paso fijo. La coma ocupa su casilla.
  1969: {
    enlace: "family=Chivo+Mono:wght@400..800&family=Archivo:wdth,wght@62..125,100..900",
    maquina: R(CHIVO, 600, { mayus: true, min: 12 }), recibo: R(CHIVO, 500, { mayus: true, min: 12 }),
    cifra: R(CHIVO, 800), serie: R(CHIVO, 600, { min: 12 }), serieChica: R(CHIVO, 600, { min: 12 }), no: { s: "N.º", rol: "leyenda", k: 0.62, hueco: 0.3 },
    pregunta: R(ARCH, 800, { st: "semi-condensed", max: 22 }), unidad: R(ARCH, 800, { st: "semi-condensed", mayus: true, tr: 0.12, kU: 0.13 }),
    leyenda: R(ARCH, 650, { st: XC, tr: 0.075, min: 12 }), suave: R(ARCH, 600, { st: XC, tr: 0.03, min: 12 }), fuerte: R(ARCH, 800, { st: XC, tr: 0.075, min: 12 }),
    ruta: R(ARCH, 750, { st: XC, mayus: true, tr: 0.03, min: 12 }), a: R(ARCH, 750, { st: XC, mayus: true, tr: 0.03, min: 12 }),
    sello: R(CHIVO, 600, { k: 0.86, tr: 0, min: 12 }), clase: R(CHIVO, 700, { k: 0.9, tr: 0, min: 12 }),
    nota: R(ARCH, 500, { st: "condensed", min: 12 }), talon: R(ARCH, 450, { st: "semi-condensed", min: 12 }),
    texto: R(ARCH, 450, { st: "semi-condensed", min: 15 }), frase: R(ARCH, 450),
    pagina: { titulo: [ARCH, 800], texto: [ARCH, 450, "96%"], rotulo: [ARCH, 650, "62.5%", ".075em"], serie: [CHIVO, 600], tabla: "80%", col: "76px" },
  },
  // Contemporánea: Funnel Display para lo grande y Funnel Sans para lo demás.
  contemporanea: {
    enlace: "family=Funnel+Display:wght@300..800&family=Funnel+Sans:ital,wght@0,300..800;1,300..800&family=Chivo+Mono:wght@500",
    maquina: R(FD, 700, { mayus: true, min: 12 }), recibo: R(CHIVO, 500, { mayus: true, min: 12 }),
    cifra: R(FD, 800), serie: R(FD, 700), serieChica: R(FD, 700, { min: 11 }), no: { s: "N.º", rol: "leyenda", k: 0.62, hueco: 0.3 },
    pregunta: R(FD, 700, { max: 21 }), unidad: R(FD, 800, { kU: 0.17 }),
    leyenda: R(FS, 700, { mayus: true, tr: 0.04, k: 0.9, min: 11 }), suave: R(FS, 600, { mayus: true, tr: 0.03, k: 0.9, min: 11 }), fuerte: R(FS, 800, { mayus: true, tr: 0.04, k: 0.9, min: 11 }),
    ruta: R(FS, 700, { mayus: true, tr: 0.03, k: 0.9, min: 11 }), a: R(FS, 700, { mayus: true, tr: 0.03, k: 0.9, min: 11 }),
    sello: R(FS, 700, { mayus: true, tr: 0.05, k: 0.88, min: 11 }), clase: R(FD, 700, { mayus: true, tr: 0.03, k: 1 }),
    nota: R(FS, 600, { mayus: true, tr: 0.03, k: 0.9, min: 11 }), talon: R(FS, 500, { k: 0.9, min: 15 }),
    texto: R(FS, 400, { k: 0.95, min: 15 }), frase: R(FS, 400),
    pagina: { titulo: [FD, 700], texto: [FS, 400, "normal"], rotulo: [FS, 700, "normal", ".05em"], serie: [FD, 700], tabla: "normal", col: "84px" },
  },
  // No es la letra de Renfe ni la copia: Fira Sans, de Mozilla, y dos de matriz de puntos para la máquina.
  "renfe-actual": {
    // Autoalojadas (fonts/renfe-actual.css): es la paleta que se publica y no debe esperar a otro dominio.
    hoja: "fonts/renfe-actual.css",
    // La voz de la máquina expendedora (billete de Cercanías): matriz de puntos. Lo pequeño, en DotGothic16, que
    // a 13–14 px se lee sin esfuerzo (Doto a ese cuerpo queda fina y su «:» se confunde); lo grande, en Doto.
    maquina: R("'DotGothic16', 'Chivo Mono', Menlo, monospace", 400, { mayus: true, min: 13.5 }), recibo: R("'DotGothic16', 'Chivo Mono', Menlo, monospace", 400, { mayus: true, min: 13.5 }), maquinaGrande: R("'Doto', 'DotGothic16', monospace", 900),
    cifra: R(FI, 900), serie: R(FI, 700), serieChica: R(FI, 700, { min: 12.5 }), no: { s: "N.º", rol: "leyenda", k: 0.62, hueco: 0.3 },
    pregunta: R(FI, 700, { max: 21 }), unidad: R(FI, 900, { kU: 0.16 }),
    leyenda: R(FX, 600, { mayus: true, tr: 0.05, k: 1.1, min: 12.5 }), suave: R(FX, 500, { mayus: true, tr: 0.04, k: 1.1, min: 12.5 }), fuerte: R(FX, 700, { mayus: true, tr: 0.05, k: 1.1, min: 12.5 }),
    ruta: R(FX, 600, { mayus: true, tr: 0.03, k: 1.1, min: 12.5 }), a: R(FX, 600, { mayus: true, tr: 0.03, k: 1.1, min: 12.5 }),
    sello: R(FX, 700, { mayus: true, tr: 0.06, k: 1.1, min: 12.5 }), clase: R(FI, 700, { mayus: true, tr: 0.04, k: 0.92 }),
    nota: R(FX, 500, { mayus: true, tr: 0.04, k: 1.1, min: 12.5 }), talon: R(FI, 400, { k: 0.9, min: 15 }),
    texto: R(FI, 400, { k: 0.95, min: 15 }), frase: R(FI, 400),
    pagina: { titulo: [FI, 700], texto: [FI, 400, "normal"], rotulo: [FX, 600, "normal", ".05em"], serie: [FI, 700], tabla: "normal", col: "82px" },
  },
};
let T = TIPOS.historica;
const roles = () => Object.values(T).filter((r) => r && r.pila);
export const fuente = (f, z) => `${f.it ? "italic " : ""}${f.w} ${f.st ? `${f.st} ` : ""}${z}px ${f.pila}`;

// Las fuentes. La hoja de la paleta se enlaza aquí: la propia (`hoja`, en fonts/) o, en las paletas que solo se
// ven en local, la de Google. El billete se compone midiendo la tinta de cada signo: medir con la letra de
// reserva y pintar con la buena saca la cifra del cartón. Por eso `fuentesListas` dice si han llegado todas y,
// si no, quien pinta vuelve a componer cuando lleguen (`fuentesDelTodo`).
const MUESTRA = "¿0123456789,.º№? NUEVES CLASE nueves a";
let _hoja = null, _hojaLista = false;
function enlaza() {
  if (_hoja) return _hoja;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = T.hoja ? new URL(T.hoja, import.meta.url).href : `https://fonts.googleapis.com/css2?${T.enlace}&display=swap`;
  _hoja = new Promise((r) => { l.onload = () => { _hojaLista = true; r(); }; l.onerror = () => r(); });
  document.head.append(l);
  return _hoja;
}
const cargadas = () => _hojaLista && roles().every((f) => document.fonts.check(fuente(f, 20), MUESTRA));
export const fuentesDelTodo = () => enlaza().then(() => Promise.all(roles().map((f) => document.fonts.load(fuente(f, 20), MUESTRA)))).then(() => { _tinta.clear(); return cargadas(); }, () => false);
export function fuentesListas(ms = 600) {
  return Promise.race([fuentesDelTodo(), new Promise((r) => setTimeout(r, ms))]).then(() => cargadas());
}

let _m = null, _upx = Infinity;   // _upx: píxeles reales que mide una unidad del plano que se está componiendo
const mctx = () => (_m ??= document.createElement("canvas").getContext("2d"));
function mide(s, f, z = 100) { const x = mctx(); x.font = fuente(f, z); return x.measureText(s); }
// Lo que de verdad se pinta de un texto en un rol: en versales si el rol lo pide, con su cuerpo (nunca por
// debajo del mínimo) y con su interletrado.
const cuerpo = (f, z) => Math.max(z * (f.k ?? 1), (f.min ?? 0) / _upx);
const real = (s, f, z, tr = 0) => ({ s: f.mayus ? s.toUpperCase() : s, z: cuerpo(f, z), tr: tr ? (f.tr ?? tr) : 0 });
// Ancho de una línea tal como se va a pintar. Sin interletrado, con el kerning de la fuente (así la pintan el
// SVG y el canvas). Con interletrado, signo a signo y sin kerning: el SVG lleva `font-kerning: none` en esas
// líneas y el canvas las pinta signo a signo, para que las dos cuadren al píxel.
function ancho(s0, f, z0, tr0 = 0) {
  const { s, z, tr } = real(s0, f, z0, tr0);
  if (!tr) return mide(s, f, z).width;
  let w = 0; for (const ch of s) w += mide(ch, f, z).width;
  return w + tr * z * (Math.max(1, [...s].length) - 1);
}
function en_lineas(s, f, z, max, tr = 0) {
  const out = []; let line = "";
  for (const w of s.split(" ")) {
    const t = line ? `${line} ${w}` : w;
    if (line && ancho(t.replace(/ /g, " "), f, z, tr) > max) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out.map((l) => l.replace(/ /g, " "));
}
// Un texto en un máximo de renglones: se prueba a su cuerpo y, si no cabe, un paso y otro más pequeño (nunca
// por debajo del mínimo del rol). Si ni así, se apunta en los avisos del plano: las pruebas lo miran.
function encaja(P, s, f, z, max, n, tr = 0) {
  for (const k of [1, 0.95, 0.9, 0.85, 0.8]) { const ls = en_lineas(s, f, z * k, max, tr); if (ls.length <= n) return { lineas: ls, z: z * k }; }
  P.avisos.push(`no cabe en ${n} renglones: «${s.slice(0, 40)}…»`);
  return { lineas: en_lineas(s, f, z * 0.8, max, tr).slice(0, n), z: z * 0.8 };
}

// ═════════════ El plano ═════════════
// Primitivas: t (texto), l (línea), o (anillo impreso), p (puntos conductores). Y los agujeros y el corte.
// `upx`: píxeles que mide una unidad del plano en la pantalla más pequeña en que se pinta (para los mínimos).
function nuevoPlano(w, h, stock, sombra, upx) { _upx = upx; return { w, h, stock, sombra, corte: 0, sierra: 0, talon: null, franjas: [], acento: null, prims: [], holes: [], tapas: [], avisos: [] }; }
// Color por servicio (solo en la paleta que lo trae): una franja arriba del cartón y la cifra en ese color.
function servicio(P, cual, alto, hasta = P.w) {
  const sv = COLOR.servicio?.[cual]; if (!sv) return;
  P.acento = sv.acento; let y = 0;
  for (const [fill, k] of sv.franja) { P.franjas.push({ x: 0, y, w: hasta, h: alto * k, fill }); y += alto * k; }
}
const txt = (P, s0, x, y, f, z0, o = {}) => {
  const { s, z, tr } = real(s0, f, z0, o.tr ?? 0), w = ancho(s0, f, z0, o.tr ?? 0);
  P.prims.push({ k: "t", s, x: o.a === "end" ? x - w : o.a === "mid" ? x - w / 2 : x, y, f, z, tr, rol: o.rol, fill: o.fill });
  return w;
};
// Una línea con varios tipos seguidos (el trayecto: versales estrechas y, en la histórica, una «a» en cursiva).
const anchoTramos = (partes) => partes.reduce((n, q) => n + ancho(q.s, q.f, q.z, q.tr ?? 0) + (q.gap ?? 0), 0);
function tramos(P, partes, x, y, o = {}) {
  const w = anchoTramos(partes);
  let cx = o.a === "end" ? x - w : x;
  for (const q of partes) { cx += q.gap ?? 0; cx += txt(P, q.s, cx, y, q.f, q.z, { tr: q.tr ?? 0 }); }
  return w;
}

// La numeradora: cada cifra sale de su rueda, a paso fijo, y ninguna asienta igual. El baile (hasta ±0,9 u de
// alto y ±0,7° de giro, para un cuerpo de 17 u) sale del número de serie. El paso sale de la fuente: el ancho
// de su cero. Delante, el signo de la numeradora («№» en la Numeradora 49; «N.º» en las demás).
function numeradora(P, serie, x, y, z0, rng, conNo = true, f = T.serie) {
  let cx = x; const z = cuerpo(f, z0);
  if (conNo) { const n = T.no, fn = n.rol === "serie" ? f : T.leyenda; cx += txt(P, n.s, x, y, fn, n.rol === "serie" ? z0 : z0 * n.k, n.rol === "serie" ? {} : { tr: 0.06 }) + z * n.hueco; }
  const paso = mide("0", f, z).width * 1.07, k = z / 17;
  for (const ch of serie) {
    const w = mide(ch, f, z).width, dy = (rng() * 2 - 1) * 0.9 * k, rot = (rng() * 2 - 1) * 0.7;
    P.prims.push({ k: "t", s: ch, x: cx + (paso - w) / 2, y: y + dy, f, z, tr: 0, rot, px: cx + paso / 2, py: y + dy - z * 0.35, rol: "serie" });
    cx += paso;
  }
  return cx - x;
}

// La cifra. Se parte del espaciado propio de cada fuente (sus avances y su kerning: en la de paso fijo la coma
// ocupa su casilla; en la Numeradora 49 manda el kerning que le dibujó el tipógrafo) y sobre él se afina: el
// tamaño de la coma y lo que se le quita a sus dos blancos. Luego se escala para que la TINTA, no la caja, llene
// el ancho: del borde izquierdo del primer signo al derecho del último. La unidad («nueves») asienta bajo la
// última cifra, cierra con ella por la tinta y no pisa la coma: si no cabe a su cuerpo, encoge.
function cifra(P, s, x, top, w, o = {}) {
  const f = T.cifra, COMA = f.coma ?? 1, KA = f.ka ?? 0, KD = f.kd ?? 0, ch = [...s];
  const adv = (t) => mide(t, f, 100).width / 100;
  const g = ch.map((c0, i) => {
    const k = c0 === "," ? COMA : 1, m = mide(c0, f, 100);
    const natural = adv(ch.slice(0, i + 1).join("")) - adv(ch.slice(0, i).join(""));   // avance con su kerning
    return { ch: c0, k, av: natural * k, l: (m.actualBoundingBoxLeft / 100) * k, r: (m.actualBoundingBoxRight / 100) * k,
      up: (m.actualBoundingBoxAscent / 100) * k, down: (m.actualBoundingBoxDescent / 100) * k };
  });
  let pos = 0;
  g.forEach((q, i) => { if (q.ch === ",") pos += KA; if (i && g[i - 1].ch === ",") pos += KD; q.x = pos; pos += q.av; });
  const izq = g[0].x - g[0].l, der = g.at(-1).x + g.at(-1).r, total = der - izq;
  const alto = Math.max(...g.filter((q) => q.ch !== ",").map((q) => q.up));
  const z = Math.min(w / total, (o.maxAlto ?? 1e9) / alto);
  const base = top + alto * z, X = (q) => x + (q.x - izq) * z;
  let dondeComa = null;
  for (const q of g) {
    if (q.ch === ",") dondeComa = { x: X(q), z: z * q.k, der: X(q) + q.r * z };
    P.prims.push({ k: "t", s: q.ch, x: X(q), y: base, f, z: z * q.k, tr: 0, rol: "cifra" });
  }
  const ult = g.at(-1), right = x + total * z;
  const out = { z, base, right, left: x, coma: dondeComa, pie: base + Math.max(...g.map((q) => q.down)) * z, unidadIzq: right };
  if (o.unidad) {
    const fu = T.unidad, su = fu.mayus ? o.unidad.toUpperCase() : o.unidad, tr = fu.tr ?? 0;
    const medida = (zu) => { const m = mide(su, fu, zu); return { m, w: tr ? ancho(o.unidad, fu, zu, tr) : m.width }; };
    if (o.unidadAlLado) {
      // Al lado de la cifra, sobre su línea base, y sin pasar de donde empieza lo de la derecha.
      let zu = z * (o.kUnidad ?? (fu.mayus ? 0.2 : 0.3));
      const w1 = medida(1).w, x0 = right + z * 0.07; if (o.hasta && x0 + w1 * zu > o.hasta) zu = Math.max(0, (o.hasta - x0) / w1);
      const { m } = medida(zu);
      txt(P, o.unidad, x0 + (tr ? 0 : m.actualBoundingBoxLeft), base, fu, zu, { tr, rol: "unidad" });
    } else {
      // A la derecha de la coma (su tinta, más un margen) y hasta el borde de la última cifra.
      const sitio = right - (dondeComa ? dondeComa.der + z * 0.03 : X(ult) - ult.l * z);
      let zu = z * (o.kUnidad ?? fu.kU ?? 0.15);
      const w1 = medida(1).w; if (w1 * zu > sitio) zu = sitio / w1;
      const { m, w: wu } = medida(zu), sube = mide(su, fu, zu).actualBoundingBoxAscent;
      const yb = base + ult.down * z + z * 0.035 + sube;
      txt(P, o.unidad, right - wu, yb, fu, zu, { tr, rol: "unidad" });
      out.unidadIzq = right - wu; out.pie = Math.max(out.pie, yb + m.actualBoundingBoxDescent);
    }
  }
  return out;
}

// Dónde empieza la tinta de un signo, por la izquierda, en una franja de alturas (y0..y1, hacia abajo desde la
// línea base, en em del signo). Se dibuja el signo y se mira: la caja no vale, porque la coma cuelga en diagonal.
const _tinta = new Map();
function tintaIzquierda(ch, f, y0, y1) {
  const N = 240, key = `${ch}|${f.pila}|${f.w}`;
  if (!_tinta.has(key)) {
    const cv = document.createElement("canvas"); cv.width = N * 1.2; cv.height = N * 1.6;
    const x = cv.getContext("2d", { willReadFrequently: true }); x.font = fuente(f, N); x.textBaseline = "alphabetic"; x.fillText(ch, N * 0.1, N);
    const px = x.getImageData(0, 0, cv.width, cv.height).data, filas = [];
    for (let r = 0; r < cv.height; r++) { let m = Infinity; for (let q = 0; q < cv.width; q++) if (px[(r * cv.width + q) * 4 + 3] > 40) { m = q; break; } filas.push(m === Infinity ? Infinity : (m - N * 0.1) / N); }
    _tinta.set(key, filas);
  }
  const filas = _tinta.get(key); let m = Infinity;
  for (let r = Math.max(0, Math.floor((1 + y0) * N)); r <= Math.min(filas.length - 1, Math.ceil((1 + y1) * N)); r++) m = Math.min(m, filas[r]);
  return m;
}

// La leyenda de bajo el cero. Cada renglón puede llegar hasta la tinta de la coma a su altura, menos un margen;
// si no hay coma a esa altura, hasta el tope (donde empieza la unidad). Se prueba en dos renglones a su cuerpo;
// si no cabe, encoge un paso y luego otro (nunca por debajo del mínimo del rol); si ni así, en tres; y lo último
// es la versión corta. `sueltos`: los textos son renglones independientes, que nunca se mezclan en una línea.
function leyenda(P, textos, medios, cortos, f, x, base, techo, suelo, coma, tope, sueltos) {
  const MARGEN = 7;
  const limite = (yb, z) => {
    if (!coma) return tope - x;
    const izq = tintaIzquierda(",", T.cifra, (yb - z * 0.74 - 1.5 - base) / coma.z, (yb + 1.5 - base) / coma.z);
    return (izq === Infinity ? tope : Math.min(tope, coma.x + izq * coma.z - MARGEN)) - x;
  };
  const w = (t, z) => ancho(t, f, z, 0.07);
  const reparte = (palabras, lims, z) => {
    const out = []; let i = 0;
    for (const lim of lims) { let ln = ""; while (i < palabras.length && w(ln ? `${ln} ${palabras[i]}` : palabras[i], z) <= lim) ln = ln ? `${ln} ${palabras[i++]}` : palabras[i++]; if (!ln) return null; out.push(ln); if (i >= palabras.length) break; }
    return i >= palabras.length ? out : null;
  };
  const intenta = (tx, z0, n) => {
    const z = cuerpo(f, z0), paso = n === 2 ? z * 1.19 : z * 1.1, alto = z * 0.72, fin = n === 2 ? suelo : suelo + 3.5;
    const y1 = Math.min(base + techo + alto, fin - (n - 1) * paso), ys = Array.from({ length: n }, (_, i) => y1 + i * paso);
    if (y1 - alto < base + 3.5) return null;   // se metería en el pie de la cifra
    const lims = ys.map((yb) => limite(yb, z));
    let lineas = null;
    if (!sueltos) lineas = reparte(tx.join(" ").split(" "), lims, z0);
    else if (n === 2) lineas = (tx.length === 2 ? [tx, [tx[1], tx[0]]] : [tx]).find((o) => o.every((t, i) => w(t, z0) <= lims[i])) ?? null;
    else { lineas = []; for (const t of tx) { const r = lineas && reparte(t.split(" "), lims.slice(lineas.length), z0); lineas = r ? [...lineas, ...r] : null; } }
    if (!lineas || lineas.length > n) return null;
    lineas.forEach((t, i) => txt(P, t, x, ys[i], f, z0, { tr: 0.07, rol: "leyenda" }));
    return { z, lineas, anchos: lineas.map((t) => +w(t, z0).toFixed(1)), lims: lims.map((v) => +v.toFixed(1)) };
  };
  for (const z of [9.7, 9.2, 8.7]) { const r = intenta(textos, z, 2); if (r) return r; }
  for (const z of [9.2, 8.7]) { const r = intenta(medios, z, 2); if (r) return { ...r, media: true }; }
  for (const z of [9.2, 8.2, 7.8]) { const r = intenta(cortos, z, 2); if (r) return { ...r, corta: true }; }
  P.avisos.push("la leyenda de bajo el cero no cabe");
  return null;
}

// Las cien casillas. Impreso: un anillo fino por casilla, la diana del picador. Picada: un agujero de verdad,
// algo más pequeño que su anillo y descentrado según el número de serie, como cae una tenaza a mano.
// La décima fila va apartada: es la del primer nueve, la única que podría faltar, y lo lleva rotulado.
function casilla(P, cx, cy, paso, picada, rng) {
  P.prims.push({ k: "o", cx, cy, r: paso * 0.365, w: Math.max(0.3, paso * 0.022) });
  if (!picada) return;
  const a = rng() * Math.PI * 2, m = (0.35 + 0.65 * rng()) * paso * 0.042;
  const h = { cx: cx + Math.cos(a) * m, cy: cy + Math.sin(a) * m, r: paso * 0.3, i: P.tapas.length };
  P.holes.push(h); P.tapas.push(h);
}
const rotuloClase = (L) => (L.clase ? `${CLASES[L.clase].ord} CLASE` : "SIN CLASE");
function campo(P, x0, y0, pasoX, pasoY, on, rng, o = {}) {
  const aparte = o.aparte ?? 0, paso = Math.min(pasoX, pasoY);
  for (let i = 0; i < 100; i++) {
    const fila = Math.floor(i / 10);
    casilla(P, x0 + pasoX / 2 + (i % 10) * pasoX, y0 + pasoY / 2 + fila * pasoY + (fila === 9 ? aparte : 0), paso, i >= on, rng);
  }
  if (aparte && o.rotulo) {
    const ym = y0 + 9 * pasoY + aparte / 2, late = 100 - on, z = o.rotulo, ze = cuerpo(T.leyenda, z);
    // «Sobran 38» a secas no se entiende: se dice de qué, si cabe en el ancho del campo.
    const cands = late > 10 ? [`UN NUEVE: SOLO ESTA FILA · SOBRAN ${late - 10} AGUJEROS`, `UN NUEVE: SOLO ESTA FILA · SOBRAN ${late - 10}`, "UN NUEVE: SOLO ESTA FILA", "UN NUEVE: ESTA FILA"]
      : late === 10 ? ["UN NUEVE: SOLO ESTA FILA", "UN NUEVE: ESTA FILA"] : [`UN NUEVE: SOLO ESTA FILA · ${late === 9 ? "QUEDA 1 ENTERA" : `QUEDAN ${10 - late} ENTERAS`}`, "UN NUEVE: SOLO ESTA FILA", "UN NUEVE: ESTA FILA"];
    const s = cands.find((t) => ancho(t, T.leyenda, z, 0.07) <= 10 * pasoX);
    if (!s) P.avisos.push("el rótulo de la décima fila no cabe");
    const w = txt(P, s ?? cands.at(-1), x0, ym + ze * 0.355, T.leyenda, z, { tr: 0.07, rol: "leyenda" });
    if (x0 + 10 * pasoX - (x0 + w + ze * 0.7) > 4) P.prims.push({ k: "l", x1: x0 + w + ze * 0.7, y1: ym, x2: x0 + 10 * pasoX, y2: ym, w: Math.max(0.45, ze * 0.07) });
  }
  return y0 + 10 * pasoY + aparte;
}

// El trayecto: lo que hace billete a un billete. Aquí, el del peor tren visto en la ventana, con sus datos.
// Si no cabe en un renglón, se acortan los nombres por el guion; y si la letra de la paleta es ancha y el plano
// deja dos renglones, el retraso va arriba y el trayecto debajo. Devuelve los renglones ya compuestos.
function trayecto(P, L, max, z, dos = false) {
  const w = L.tc?.worst;
  if (!w) return [];
  const [de, a] = (w.route ?? "").split(" → ").map((t) => t.toUpperCase());
  const corta = (t) => t.split("-")[0];
  const cola = `+${int(w.delay)} MIN`, r = (s, x = {}) => ({ s, f: T.ruta, z, tr: 0.03, ...x });
  const ruta = (d, h) => [r(d), { s: "a", f: T.a, z, gap: cuerpo(T.ruta, z) * 0.3, tr: T.a.mayus ? 0.03 : 0 }, r(h, { gap: cuerpo(T.ruta, z) * 0.3 })];
  if (!a) return [[r(`PEOR TREN · N.º ${w.train} · ${cola}`)]];
  const pares = [[de, a], [de, corta(a)], [corta(de), corta(a)]];
  const uno = (d, h, k) => [r("PEOR TREN · ", { z: z * k }), ...ruta(d, h).map((q) => ({ ...q, z: z * k })), r(` · ${cola}`, { z: z * k })];
  for (const [d, h, k] of [[de, a, 1], [de, a, 0.93], [de, corta(a), 1], [de, corta(a), 0.93], [de, corta(a), 0.86], [corta(de), corta(a), 1], [corta(de), corta(a), 0.9]]) { const ps = uno(d, h, k); if (anchoTramos(ps) <= max) return [ps]; }
  if (dos) for (const [d, h] of pares) { const ps = ruta(d, h); if (anchoTramos(ps) <= max) return [[r(`PEOR TREN · ${cola}`)], ps]; }
  P.avisos.push("el trayecto no cabe");
  return [[r(`PEOR TREN · ${cola}`)]];
}

// ── El billete de pie (móvil): 305 × 570. La unidad mide 1,174 px en un móvil de 390 (cartón de 358 px). ──
export function planoVertical(L) {
  const P = nuevoPlano(305, 570, L.stock, [1.5, 1.9], 358 / 305), rng = azar(L.n), M = 16, R = 289, W = R - M;
  const { d, tc, stale, shown, down, at } = L;
  // Caducado: el billete se anula como se anulaban, cortándole una esquina. Va en la máscara, como los agujeros.
  if (stale) P.corte = 34;
  servicio(P, "lmd", 12);
  numeradora(P, L.serie, M, 28, 17, rng);
  // A la derecha, la clase, impresa como en los billetes de verdad, y debajo el aviso.
  const RC = stale ? R - 14 : R;
  txt(P, rotuloClase(L), RC, 25.5, T.clase, 13.4, { a: "end", tr: 0.09, rol: "clase" });
  txt(P, "NO ES DE RENFE · NO VÁLIDO PARA VIAJAR", RC, 38.5, T.leyenda, 8.6, { a: "end", tr: 0.07, rol: "leyenda" });
  // La pregunta llena el ancho por su cuerpo (hasta el tope de su rol), medida con el kerning con que se pinta.
  const q = "¿Cuántos nueves tiene Renfe?", zq = Math.min(W / ancho(q, T.pregunta, 1), T.pregunta.max ?? 99);
  txt(P, q, M, 63, T.pregunta, zq, { rol: "pregunta" });

  // El pie se compone de abajo arriba: serie y dirección; sello y las seis webs; el trayecto (uno o dos renglones).
  const alto = (f, z) => cuerpo(f, z) * 0.74, AIRE = 4.6;
  const yC = 562, hC = Math.max(alto(T.serieChica, 11), alto(T.sello, 9.6));
  const yB = yC - hC - AIRE, zs = 11.2, hB = alto(T.sello, zs);
  const tr = trayecto(P, L, W, 11, true), pasoT = cuerpo(T.ruta, 11) * 1.14;
  const yA = yB - hB - AIRE, finCampo = yA - (tr.length ? (tr.length - 1) * pasoT + alto(T.ruta, 11) : 0) - 6.4;
  tr.forEach((ps, i) => tramos(P, ps, M, yA - (tr.length - 1 - i) * pasoT));

  // La cifra a todo el ancho y, debajo, el campo de cien, que se queda con lo que quede (sin bajar de 22,5 u de
  // paso). Si la cifra de la paleta es baja, el campo no crece: se queda abajo, y el aire va entre los dos.
  const PX = W / 10, APARTE = 10, BLOQUE = Math.max(31, 13.5 + 1.91 * cuerpo(T.leyenda, 9.2)), TOP = 75.5;
  const on = tc ? (tc.nines === null ? 100 : tc.onTimeOf100) : 100;
  let base = TOP + 149, f = null;
  let bloque = BLOQUE;
  if (shown !== null) {
    // Primero en falso, para saber cuánto cuelga la unidad por debajo de la cifra: el campo empieza más abajo.
    const f0 = cifra({ prims: [], avisos: [] }, c.nf(shown), M, TOP, W, { maxAlto: finCampo - APARTE - 225 - BLOQUE - TOP, unidad: "nueves" });
    bloque = Math.max(BLOQUE, f0.pie - f0.base + 8.5);
    f = cifra(P, c.nf(shown), M, TOP, W, { maxAlto: finCampo - APARTE - 225 - bloque - TOP, unidad: "nueves" }); base = f.base;
  } else txt(P, tc ? "todos en hora" : "sin medir", M, 150, T.pregunta, 30);
  const PY = Math.min(25.7, (finCampo - APARTE - (base + bloque)) / 10), campoTop = finCampo - APARTE - 10 * PY;
  // Bajo el cero, lo que el campo dice, escrito; caducado, desde cuándo. Se mide contra la tinta de la coma.
  const suelo = Math.max(campoTop + 3.4 - 7.5, base + BLOQUE - 4.1) , tope = f ? f.unidadIzq - 6 : R, techo = 9;
  P.leyenda = stale ? leyenda(P, ["BILLETE CADUCADO: MEDIDOR", `PARADO DESDE LAS ${at}`], ["BILLETE CADUCADO", `PARADO DESDE LAS ${at}`], ["CADUCADO", `DESDE LAS ${at}`], T.fuerte, M, base, techo, suelo, f?.coma, tope, false)
    : tc && tc.nines !== null ? leyenda(P, [`${100 - on} ${on === 99 ? "PICADA" : "PICADAS"}, CON RETRASO`, `${on} ${on === 1 ? "ENTERA" : "ENTERAS"}, EN HORA`], [`${100 - on} ${on === 99 ? "PICADA" : "PICADAS"}, TARDE`, `${on} ${on === 1 ? "ENTERA" : "ENTERAS"}, EN HORA`], [`${100 - on} ${on === 99 ? "PICADA" : "PICADAS"}`, `${on} ${on === 1 ? "ENTERA" : "ENTERAS"}`], T.leyenda, M, base, techo, suelo, f?.coma, tope, true) : null;
  campo(P, M, campoTop, PX, PY, on, rng, { aparte: APARTE, rotulo: 8.6 });

  // La validez (la ventana medida, con su hora de inicio) y, debajo, el número otra vez, como en el Edmondson de
  // 1949, y la fecha y la hora de la ronda con segundos. Las webs ya no van aquí: tienen su justificante.
  const v = L.validos.find((t) => ancho(t, T.sello, zs, 0.1) <= W); if (!v) P.avisos.push("la validez no cabe");
  txt(P, v ?? L.validos.at(-1), M, yB, T.sello, zs, { tr: 0.1, rol: "sello" });
  const wn = numeradora(P, L.serie, M, yC, 11, rng, false, T.serieChica);
  const fh = [L.fechaHora, L.fechaHora.split(" ")[1]].find((t) => ancho(t, T.sello, 9.6, 0.06) <= W - wn - 8);
  if (fh) txt(P, fh, R, yC - 0.4, T.sello, 9.6, { a: "end", tr: 0.06, rol: "sello" }); else P.avisos.push("la fecha y la hora no caben");
  return P;
}

// ── El billete tumbado (escritorio y tarjeta de X): 570 × 305, con el talón de las webs tras el trepado. ──
// Pensado para verse a ~516 px en el timeline: nada por debajo de 9,3 u. Abajo a la izquierda (donde X pone su
// rótulo) solo va la dirección, que X ya enseña; el sello va a la derecha. La unidad mide 1,54 px en la
// pantalla de escritorio más estrecha (cartón de 880 px).
export function planoHorizontal(L) {
  const P = nuevoPlano(570, 305, L.stock, [1.3, 1.6], 880 / 570), rng = azar(L.n), M = 15;
  const { d, tc, wc, stale, alert, shown, down, total, at } = L;
  const TREP = 452, R = TREP - 15, paso = 16.6, APARTE = 10, cx0 = R - paso * 10, cy0 = 37, WL = cx0 - 34 - M;
  if (stale) P.corte = 34;
  servicio(P, "lmd", 10.6);
  numeradora(P, L.serie, M, 26, 15, rng);
  const cab = ["CADUCADO · NO ES DE RENFE · NO VÁLIDO PARA VIAJAR", "NO ES DE RENFE · NO VÁLIDO PARA VIAJAR", "NO ES DE RENFE"].slice(stale ? 0 : 1);
  txt(P, cab.find((t) => ancho(t, stale ? T.fuerte : T.leyenda, 10.4, 0.07) <= R - M - 118) ?? cab.at(-1), R, 25, stale ? T.fuerte : T.leyenda, 10.4, { a: "end", tr: 0.07, rol: "leyenda" });
  const on = tc ? (tc.nines === null ? 100 : tc.onTimeOf100) : 100;
  // La cifra, y encima la pregunta, que toma su ancho.
  let wq = WL;
  if (shown !== null) { const f = cifra(P, c.nf(shown), M, 60, WL, { maxAlto: 122, unidad: "nueves" }); wq = f.right - M; }
  else txt(P, tc ? "todos en hora" : "sin medir", M, 130, T.pregunta, 24);
  const q = "¿Cuántos nueves tiene Renfe?", zq = Math.min(wq / ancho(q, T.pregunta, 1), (T.pregunta.max ?? 99) * 0.82);
  txt(P, q, M, 51.5, T.pregunta, zq, { rol: "pregunta" });
  campo(P, cx0, cy0, paso, paso, on, rng, { aparte: APARTE, rotulo: 9.3 });
  const wc0 = txt(P, rotuloClase(L), R, 231, T.clase, 12.6, { a: "end", tr: 0.09, rol: "clase" });
  trayecto(P, L, R - M - wc0 - 14, 11.4).forEach((ps) => tramos(P, ps, M, 231));
  if (tc && tc.nines !== null) {
    const frase = `De cada 100 trenes del día, ${on} iban en hora y ${100 - on} con más de ${PUNTUAL_MIN} min de retraso: los agujeros. Un nueve son 90.`;
    const e2 = encaja(P, frase, T.texto, 13, R - M, 2), pasoF = cuerpo(T.texto, e2.z) * 1.2;
    e2.lineas.forEach((ln, i) => txt(P, ln, M, 247.5 + i * pasoF, T.texto, e2.z, { rol: "texto" }));
  }
  txt(P, c.SITE, M, 291, T.nota, 10.4, { tr: 0.02, rol: "nota" });
  const sellos = stale ? [`PARADO DESDE LAS ${at} · ${L.sello}`, ...L.validos] : L.validos;
  txt(P, sellos.find((t) => ancho(t, T.sello, 11, 0.1) <= R - M - ancho(c.SITE, T.nota, 10.4, 0.02) - 14) ?? sellos.at(-1), R, 291, T.sello, 11, { a: "end", tr: 0.1, rol: "sello" });

  // Trepado: agujeros pequeños, también de verdad.
  for (let yy = 6.5; yy < 300; yy += 5.4) P.holes.push({ cx: TREP, cy: yy, r: 1.05 });

  // Talón: el resguardo del billete, del mismo cartón. La clase, el número otra vez, la fecha y la hora de la
  // ronda con segundos y, abajo, el aviso entero, que así va dentro de la tarjeta de X. Las webs ya no van
  // aquí: tienen su justificante.
  const X = TREP + 12, XR = 557;
  txt(P, "RESGUARDO", X, 25, T.leyenda, 10.4, { tr: 0.07, rol: "leyenda" });
  txt(P, rotuloClase(L), X, 49, T.clase, 12.6, { tr: 0.09, rol: "clase" });
  numeradora(P, L.serie, X, 70, 12, rng, false);
  const [fecha, hora] = L.fechaHora.split(" "), pasoS = cuerpo(T.sello, 10.4) * 1.2;
  txt(P, fecha, X, 91, T.sello, 10.4, { tr: 0.06, rol: "sello" }); txt(P, hora, X, 91 + pasoS, T.sello, 10.4, { tr: 0.06, rol: "sello" });
  const zn = 9.6, av = en_lineas(AVISO_IMG, T.nota, zn, XR - X, 0.02), pasoN = cuerpo(T.nota, zn) * 1.15;
  if (291 - (av.length - 1) * pasoN - cuerpo(T.nota, zn) * 0.8 < 91 + pasoS + 6) P.avisos.push("el aviso no cabe en el resguardo");
  av.forEach((ln, i) => txt(P, ln, X, 291 - (av.length - 1 - i) * pasoN, T.nota, zn, { tr: 0.02, rol: "nota" }));
  return P;
}

// ── El billete de Cercanías (en la paleta de color por servicio). Toma la gramática de
//    los de máquina expendedora de los 2000: cartón gris muy claro con una trama fina de seguridad, los datos
//    estampados en matriz de puntos, una muesca en el borde de arriba, galones rojos y una banda roja al pie.
//    Solo la gramática: ni logotipos ni símbolos; en la banda va nuestro aviso. Los datos son los nuestros, en
//    la voz de la máquina. Ningún texto pisa un galón: tinta sobre rojo no llega a AA. ──
export function planoCercanias(o) {
  const W = 190, M = 8, R = 182, P = nuevoPlano(W, 130, "cercanias", [0.9, 1.1], 310 / 190);
  const fm = T.maquina, fg = T.maquinaGrande, rojo = COLOR.servicio?.cer.acento ?? "#d5001c", z = 8, n1 = (v) => +v.toFixed(1);
  const m = (s0, x, y, x2 = {}) => txt(P, s0, x, y, fm, z, { rol: "maquina", ...x2 });
  // Cabecera: a la izquierda, qué es y su número; a la derecha, la ventana, como la validez de un billete.
  m(`CERCANÍAS ${o.clase} CLASE`, M, 17); m(`N.º ${o.serie}`, M, 26.5);
  m(`VÁLIDO ${o.valido}`, R, 17, { a: "end" }); m(`HASTA ${o.hasta}`, R, 26.5, { a: "end" });
  // La muesca, en el hueco entre las dos: un mordisco de verdad en el cartón, como los agujeros.
  P.holes.push({ cx: 104, cy: 0, r: 5.6 });
  // En grande, lo que dice el billete; a su derecha, los cancelados.
  const wC = o.cancelados ? Math.max(ancho("CANCELADOS", fm, z), ancho(o.cancelados, fm, z)) : 0;
  const zg = Math.min(22, (R - M - (wC ? wC + 9 : 0)) / ancho(o.cifra, fg, 1));
  txt(P, o.cifra, M, 50.5, fg, zg, { rol: "cifra" });
  if (o.cancelados) { m("CANCELADOS", R, 41, { a: "end" }); m(o.cancelados, R, 50.5, { a: "end" }); }
  // La cuenta, en un renglón si cabe; si no, en dos. Debajo, la fecha y la hora de la ronda, con segundos.
  let y = 62.5;
  const cuenta = `${o.on} DE CADA 100 EN HORA`, veces = "(TRENES DEL DÍA)";
  if (ancho(`${cuenta} ${veces}`, fm, z) <= R - M) m(`${cuenta} ${veces}`, M, y); else { m(cuenta, M, y); y += 9.5; m(veces, M, y); }
  y += 9.5; m(o.fecha, M, y);
  // Los galones, debajo de todo lo escrito, y la banda roja con nuestro aviso.
  const g0 = y + 5.5, g1 = g0 + 23, gm = (g0 + g1) / 2;
  // En un renglón si cabe; si no, en dos, partido por el punto medio y sin dejarlo colgando.
  const entero = "NO ES DE RENFE · NO VÁLIDO PARA VIAJAR · MEDIDOR INDEPENDIENTE", partes = ["NO ES DE RENFE · NO VÁLIDO PARA VIAJAR", "MEDIDOR INDEPENDIENTE"];
  const aviso = ancho(entero, T.leyenda, 7.2, 0.05) <= R - M ? { lineas: [entero], z: 7.2 } : { lineas: partes, z: 7.2 };
  if (aviso.lineas.some((ln) => ancho(ln, T.leyenda, 7.2, 0.05) > R - M)) P.avisos.push("el aviso de la banda no cabe");
  const pasoB = cuerpo(T.leyenda, aviso.z) * 1.14, b0 = g1 + 4, hB = aviso.lineas.length * pasoB + 6;
  P.h = n1(b0 + hB);
  // La trama de seguridad: líneas blancas muy finas. A la izquierda, horizontales; en el resto, dos familias de
  // ondas que se cruzan. Blanco sobre gris muy claro (1,3:1): se ve y no le quita nada al texto.
  let trama = "";
  for (let yy = 3; yy < b0; yy += 4.4) trama += `M0 ${n1(yy)}H42`;
  for (let c0 = -8; c0 < b0 + 8; c0 += 5.6) for (const sg of [1, -1]) {
    trama += `M42 ${n1(c0)}`;
    for (let x = 46; x <= W + 2; x += 4) trama += `L${x} ${n1(c0 + sg * 5.6 * Math.sin(((x - 42) / 31) * Math.PI * 2))}`;
  }
  P.franjas.push({ d: trama, stroke: "#ffffff", sw: 0.42, op: 0.85 });
  let galones = "";
  for (const x0 of [-17, 44, 105, 166]) galones += `M${x0} ${n1(g0)}L${x0 + 31} ${n1(gm)}L${x0} ${n1(g1)}`;
  P.franjas.push({ d: galones, stroke: rojo, sw: 6.4 });
  P.franjas.push({ x: 0, y: b0, w: W, h: hB, fill: rojo });
  P.zonaGalones = [g0 - 3.2, g1 + 3.2];
  aviso.lineas.forEach((ln, i) => { const w = ancho(ln, T.leyenda, aviso.z, 0.05); txt(P, ln, (W - w) / 2, b0 + 3 + cuerpo(T.leyenda, aviso.z) * 0.74 + i * pasoB, T.leyenda, aviso.z, { tr: 0.05, rol: "banda", fill: "#ffffff" }); });
  return P;
}

// ── El billete de Cercanías en las paletas publicables: solo información, sin perforar. Toma la gramática de los
//    billetes de cartulina que rellenaba una máquina (los Hugin de los setenta): unos campos preimpresos, con su
//    rótulo, y dentro lo que estampa la máquina, en su tinta. Solo la gramática: sin logotipo ni trama. ──
export function planoCercaniasFicha(o) {
  const W = 190, M = 8, R = 182, P = nuevoPlano(W, 130, o.stock, [0.9, 1.1], 310 / 190);
  const pre = (s0, x, y, x2 = {}) => txt(P, s0, x, y, T.leyenda, 7.2, { tr: 0.07, rol: "leyenda", ...x2 });
  const raya = (y) => P.prims.push({ k: "l", x1: M, y1: y, x2: R, y2: y, w: 0.5 });
  // Un campo: el rótulo preimpreso y, debajo, el valor estampado, al cuerpo en que quepa en su columna.
  const campoF = (rots, val, x, y, wCol, z0 = 12) => {
    const rot = [rots].flat().find((t) => ancho(t, T.leyenda, 7.2, 0.07) <= wCol - 3) ?? [rots].flat().at(-1);   // el rótulo más largo que quepa
    pre(rot, x, y);
    const yv = y + cuerpo(T.leyenda, 7.2) * 0.5 + cuerpo(T.maquina, z0) * 0.86;
    const z = Math.min(z0, ((wCol - 5) / ancho(val, T.maquina, 1)));
    if (cuerpo(T.maquina, z) * ancho(val, { ...T.maquina, k: 1, min: 0 }, 1) > wCol - 2 || ancho(rot, T.leyenda, 7.2, 0.07) > wCol - 2) P.avisos.push(`el campo «${rot}» no cabe`);
    txt(P, val, x, yv, T.maquina, z, { rol: "estampa", fill: COLOR.estampa });
    return yv;
  };
  txt(P, "CERCANÍAS", M, 17.5, T.clase, 11.6, { tr: 0.09, rol: "clase" });
  const ws = txt(P, o.serie, R, 17.5, T.maquina, 11, { a: "end", rol: "estampa", fill: COLOR.estampa });
  pre("BILLETE N.º", R - ws - 4, 16.6, { a: "end" });
  raya(23);
  const c1 = 54, c2 = 68, c3 = R - M - c1 - c2, y1 = 32.5;
  const yv1 = Math.max(campoF("NUEVES", o.nueves ?? "—", M, y1, c1), campoF(["EN HORA, DE 100", "EN HORA /100"], String(o.on), M + c1, y1, c2), campoF("CLASE", o.clase, M + c1 + c2, y1, c3));
  const y2 = yv1 + 12.5;
  const yv2 = Math.max(campoF(["CANCELADOS", "CANCEL."], o.cancelados ?? "—", M, y2, c1), campoF("VÁLIDO", o.valido, M + c1, y2, c2), campoF("HASTA", o.hasta, M + c1 + c2, y2, c3));
  raya(yv2 + 6);
  const yv3 = campoF("FECHA Y HORA DE LA RONDA", o.fecha.replace(" ", "   "), M, yv2 + 15.5, R - M, 10.4);   // la numeradora tiene el espacio estrecho
  // Al pie, preimpreso, lo que no puede faltar.
  const pie = encaja(P, "CADA TREN CUENTA UNA VEZ AL DÍA. NO ES DE RENFE NI VALE PARA VIAJAR.", T.leyenda, 7.2, R - M, 3, 0.07);
  const pasoP = cuerpo(T.leyenda, pie.z) * 1.16; let y = yv3 + 6 + cuerpo(T.leyenda, pie.z);
  for (const ln of pie.lineas) { pre(ln, M, y); y += pasoP; }
  P.h = +(y - pasoP + 8).toFixed(1);
  return P;
}
// El billete de Cercanías que toca en cada paleta.
export const planoCercaniasDe = (o) => (COLOR.servicio ? planoCercanias(o) : planoCercaniasFicha(o));

// ── El justificante de la máquina: las seis webs. Un tique estrecho de papel térmico, con el corte de sierra
//    arriba y abajo: una línea por web con su hora y su resultado, el total y la ventana. En la voz de la
//    máquina y en una monoespaciada que se lee. ──
export function planoRecibo(L) {
  const W = 150, M = 9, R = W - M, P = nuevoPlano(W, 260, "recibo", [0.8, 1], 240 / 150), f = T.recibo, z = 7.4;
  const { d, wc, stale, down, at, from } = L, paso = cuerpo(f, z) * 1.42, n24 = c.rondasDia(d);
  P.sierra = 3;
  let y = 9 + paso;
  const t = (s0, x, x2 = {}) => txt(P, s0, x, y, f, z, { rol: "recibo", ...x2 });
  const centro = (s0) => { for (const ln of en_lineas(s0, f, z, R - M)) { t(ln, W / 2, { a: "mid" }); y += paso; } };
  const fila = (izq, der) => {
    if (ancho(izq, f, z) + ancho(der, f, z) + cuerpo(f, z) * 0.5 <= R - M) { t(izq, M); t(der, R, { a: "end" }); y += paso; }
    else { t(izq, M); y += paso; t(der, R, { a: "end" }); y += paso; }
    if (Math.max(ancho(izq, f, z), ancho(der, f, z)) > R - M) P.avisos.push(`el justificante no tiene ancho para «${izq} / ${der}»`);
  };
  const regla = () => { const yr = y - paso * 0.66; P.prims.push({ k: "l", x1: M, y1: yr, x2: R, y2: yr, w: 0.5, dash: [1.8, 1.5] }); y += paso * 0.42; };
  centro("Medidor independiente"); centro("No es de Renfe");
  regla();
  centro("Justificante");
  fila("N.º", L.serie); fila(...L.fechaHora.split(" "));
  if (stale) centro(`Caducado: medidor parado desde las ${at}`);
  regla();
  centro(`Las ${word(d.services.length)} webs de Renfe`);
  for (const sv of d.services) {
    const hh = sv.now ? c.hhmm(sv.now.ts) : "--:--", http = sv.now?.detail?.match(/HTTP (\d{3})/);
    const res = !sv.now ? "Sin dato" : sv.now.ok ? `OK ${sv.latency_ms == null ? "" : `${c.nf(sv.latency_ms / 1000, 1)} s`}`.trim() : http ? `Fallo HTTP ${http[1]}` : "Fallo";
    fila(`${hh} ${EN_TALON[sv.key] ?? sv.name}`, res);
  }
  regla();
  if (wc) { fila("Rondas", int(wc.n)); fila(`Con las ${word(d.services.length)} bien`, int(wc.ok)); }
  const junta = (ts) => `${fechaSello(ts).replace(/ /g, "")} ${c.hhmm(ts)}`;
  fila("Desde", junta(from)); fila("Hasta", junta(L.hasta));
  regla();
  centro("Tiempos: lo que suele tardar cada una"); centro("Medimos desde un solo sitio");
  regla();
  centro("No válido para viajar");
  P.h = +(y - paso + 10 + P.sierra).toFixed(1);
  return P;
}

// El corte de sierra del papel de máquina: dientes arriba y abajo, que se le quitan al contorno.
function sierra(P) {
  const t = P.sierra, h = t * 0.55; let d = "";
  for (let x = 0; x < P.w; x += t) d += `M${x} 0L${x + t / 2} ${h}L${x + t} 0ZM${x} ${P.h}L${x + t / 2} ${P.h - h}L${x + t} ${P.h}Z`;
  return d;
}

// ═════════════ Pintor 1: SVG (la página) ═════════════
let _id = 0;
export function svg(P, o = {}) {
  const id = `b${++_id}`, carton = COLOR.carton[P.stock], [dx, dy] = P.sombra, n = (v) => +v.toFixed(2);
  const t = (p) => `<text x="${n(p.x)}" y="${n(p.y)}"${p.rot ? ` transform="rotate(${n(p.rot)} ${n(p.px)} ${n(p.py)})"` : ""} ${p.rol ? ` data-rol="${p.rol}"` : ""}${p.fill || (P.acento && (p.rol === "cifra" || p.rol === "unidad")) ? ` fill="${p.fill ?? P.acento}"` : ""} style="white-space:pre;font:${fuente(p.f, n(p.z))}${p.tr ? `;letter-spacing:${n(p.tr * p.z)}px;font-kerning:none` : ""}">${e(p.s)}</text>`;
  const puntos = (p) => { let out = ""; for (let x = p.x2; x >= p.x1; x -= p.paso) out += `<circle cx="${n(x)}" cy="${n(p.y)}" r="${p.r}"/>`; return out; };
  const prim = (p) => p.k === "t" ? t(p)
    : p.k === "l" ? `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}" stroke="${COLOR.tinta}" stroke-width="${n(p.w)}"${p.dash ? ` stroke-dasharray="${p.dash.join(" ")}"` : ""}/>`
    : p.k === "p" ? puntos(p)
    : `<circle cx="${n(p.cx)}" cy="${n(p.cy)}" r="${n(p.r)}" fill="none" stroke="${COLOR.tinta}" stroke-width="${n(p.w)}"/>`;
  // El cartón es un solo trazo, relleno con la regla par-impar: el rectángulo y, dentro, cada recorte (los
  // agujeros, la esquina cortada si está caducado, los dientes del justificante). Debajo va el mismo trazo,
  // desplazado: es la sombra dura que el cartón echa sobre el mostrador, y asoma por el borde de cada recorte.
  // Antes esto era una máscara y un filtro de SVG: se pintaban en una capa aparte, y al darle la vuelta al billete
  // llegaba primero la tinta y medio segundo después el cartón. Un trazo se pinta de una vez con todo lo demás.
  // Una muesca en el borde es un círculo que se sale: de él solo se recorta lo que cae dentro.
  const hoyo = ({ cx, cy, r }) => {
    if (cy - r >= 0 && cy + r <= P.h) return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
    const y = cy - r < 0 ? 0 : P.h, a = Math.sqrt(Math.max(0, r * r - (y - cy) ** 2));
    return `M${n(cx - a)} ${y}A${n(r)} ${n(r)} 0 ${cy > 0 && cy < P.h ? 1 : 0} ${y === 0 ? 0 : 1} ${n(cx + a)} ${y}Z`;
  };
  const forma = `M0 0H${P.w}V${P.h}H0Z${P.corte ? `M${P.w - P.corte} 0H${P.w}V${P.corte}Z` : ""}${P.sierra ? sierra(P) : ""}${P.holes.map(hoyo).join("")}`;
  // Lo que va impreso a sangre (las franjas, el talón) solo se recorta con el contorno si de verdad toca un
  // recorte: el billete grande, que es el que gira, no lo necesita y se queda sin ningún recurso de SVG.
  const toca = (f) => P.holes.some((h) => h.cx + h.r > f.x && h.cx - h.r < f.x + f.w && h.cy + h.r > f.y && h.cy - h.r < f.y + f.h);
  const recorta = !!P.talon || P.franjas.some((f) => f.d) || (P.franjas.length > 0 && (P.corte > 0 || P.sierra > 0 || P.franjas.some(toca)));
  const sangre = `${P.talon ? `<rect x="${P.talon.x}" width="${P.w - P.talon.x}" height="${P.h}" fill="${COLOR.carton[P.talon.stock]}"/>` : ""}${P.franjas.map((f) => (f.d ? `<path d="${f.d}" fill="${f.fill ?? "none"}"${f.stroke ? ` stroke="${f.stroke}" stroke-width="${f.sw}" stroke-opacity="${f.op ?? 1}" stroke-miterlimit="10"` : ""}/>`
    : `<rect x="${f.x}" y="${n(f.y)}" width="${f.w}" height="${n(f.h)}" fill="${f.fill}"/>`)).join("")}`;
  // Las tapas son solo para el picado al cargar: tapan cada agujero hasta que le toca, y desaparecen de golpe.
  const tapas = !o.pica ? "" : `<g class="tapas" aria-hidden="true">${P.tapas.map((h) =>
    `<circle class="tapa" style="--i:${h.i}" cx="${n(h.cx)}" cy="${n(h.cy)}" r="${n(h.r + 0.5)}" fill="${P.talon && h.cx > P.talon.x ? COLOR.carton[P.talon.stock] : carton}"/>`).join("")}</g>`;
  return `<svg class="carton${o.cls ? ` ${o.cls}` : ""}"${P.avisos.length ? ` data-avisos="${e(P.avisos.join(" | "))}"` : ""} viewBox="0 0 ${P.w} ${P.h}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" fill="${COLOR.tinta}"${o.label ? ` role="img" aria-label="${e(o.label)}"` : ' aria-hidden="true"'}>
  ${recorta ? `<defs><clipPath id="${id}c"><path d="${forma}" clip-rule="evenodd"/></clipPath></defs>` : ""}
  <path d="${forma}" fill-rule="evenodd" fill="${COLOR.sombra}" fill-opacity=".78" transform="translate(${dx} ${dy})"/>
  <path d="${forma}" fill-rule="evenodd" fill="${carton}"/>
  ${sangre ? (recorta ? `<g clip-path="url(#${id}c)">${sangre}</g>` : sangre) : ""}
  ${P.prims.map(prim).join("")}
  ${tapas}
</svg>`;
}

// ═════════════ Pintor 2: canvas (la imagen) ═════════════
export function pinta(ctx, P, x, y, s) {
  const carton = COLOR.carton[P.stock], [dx, dy] = P.sombra;
  // El contorno del cartón, con su esquina cortada si la tiene y con sus agujeros.
  const forma = () => {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(P.w - P.corte, 0); ctx.lineTo(P.w, P.corte); ctx.lineTo(P.w, P.h); ctx.lineTo(0, P.h); ctx.closePath();
    for (const hh of P.holes) { ctx.moveTo(hh.cx + hh.r, hh.cy); ctx.arc(hh.cx, hh.cy, hh.r, 0, Math.PI * 2, true); }
    if (P.sierra) { const t = P.sierra, h = t * 0.55; for (let x = 0; x < P.w; x += t) { ctx.moveTo(x, 0); ctx.lineTo(x + t / 2, h); ctx.lineTo(x + t, 0); ctx.closePath(); ctx.moveTo(x, P.h); ctx.lineTo(x + t / 2, P.h - h); ctx.lineTo(x + t, P.h); ctx.closePath(); } }
  };
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // La sombra dura del cartón: por los recortes se ve, igual que en la página.
  // Todo lo que se rellena va recortado al rectángulo del cartón: una muesca en el borde es un círculo que se
  // sale, y sin el recorte su mitad de fuera se pintaría.
  const lleno = (fill) => { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, P.w, P.h); ctx.clip(); ctx.fillStyle = fill; forma(); ctx.fill("evenodd"); ctx.restore(); };
  ctx.save(); ctx.translate(dx, dy); ctx.globalAlpha = 0.78; lleno(COLOR.sombra); ctx.restore();
  lleno(carton);
  if (P.talon) { ctx.save(); ctx.beginPath(); ctx.rect(P.talon.x, 0, P.w - P.talon.x, P.h); ctx.clip(); ctx.fillStyle = COLOR.carton[P.talon.stock]; forma(); ctx.fill("evenodd"); ctx.restore(); }
  for (const f of P.franjas) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, P.w, P.h); ctx.clip(); forma(); ctx.clip("evenodd");
    if (!f.d) { ctx.fillStyle = f.fill; ctx.fillRect(f.x, f.y, f.w, f.h); }
    else { const path = new Path2D(f.d); if (f.fill) { ctx.fillStyle = f.fill; ctx.fill(path); } if (f.stroke) { ctx.globalAlpha = f.op ?? 1; ctx.strokeStyle = f.stroke; ctx.lineWidth = f.sw; ctx.miterLimit = 10; ctx.stroke(path); } }
    ctx.restore();
  }
  ctx.strokeStyle = COLOR.tinta;
  ctx.fillStyle = COLOR.tinta; ctx.strokeStyle = COLOR.tinta; ctx.textBaseline = "alphabetic";
  for (const p of P.prims) {
    if (p.k === "t") {
      ctx.font = fuente(p.f, p.z); ctx.fillStyle = p.fill ?? (P.acento && (p.rol === "cifra" || p.rol === "unidad") ? P.acento : COLOR.tinta);
      if (p.rot) { ctx.save(); ctx.translate(p.px, p.py); ctx.rotate((p.rot * Math.PI) / 180); ctx.fillText(p.s, p.x - p.px, p.y - p.py); ctx.restore(); }
      else if (!p.tr) ctx.fillText(p.s, p.x, p.y);
      else { let cx = p.x; for (const ch of p.s) { ctx.fillText(ch, cx, p.y); cx += ctx.measureText(ch).width + p.tr * p.z; } }
    } else if (p.k === "l") {
      ctx.lineWidth = p.w; ctx.setLineDash(p.dash ?? []); ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke(); ctx.setLineDash([]);
    } else if (p.k === "o") {
      ctx.lineWidth = p.w; ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2); ctx.stroke();
    } else if (p.k === "p") {
      ctx.fillStyle = COLOR.tinta;
      for (let xx = p.x2; xx >= p.x1; xx -= p.paso) { ctx.beginPath(); ctx.arc(xx, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
}

// La imagen de compartir el enlace (og.png): el billete tumbado, casi a sangre, a 1200 × 630, la tarjeta de X.
// El aviso «No es de Renfe · no válido para viajar» va impreso en el propio cartón.
export function imagen(L) {
  const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
  cv.width = 1200; cv.height = 630;
  ctx.fillStyle = COLOR.mostrador; ctx.fillRect(0, 0, 1200, 630);
  pinta(ctx, planoHorizontal(L), 30, 9, 2);
  return cv;
}

// Lo que se guarda de cada pieza y de «las tres»: solo las piezas, sobre un margen del mostrador (es lo que se
// ve por los agujeros) y sin ningún texto alrededor. El aviso ya va impreso en cada una.
// piezas: [{ P, s, dy }], con P ya compuesto.
export function lamina(piezas, o = {}) {
  const mx = o.margen ?? 48, gap = o.gap ?? 56;
  const wP = piezas.reduce((n, q) => n + q.P.w * q.s, 0) + gap * (piezas.length - 1);
  const hP = Math.max(...piezas.map((q) => q.P.h * q.s + (q.dy ?? 0)));
  const cv = document.createElement("canvas"); cv.width = Math.round(wP + 2 * mx); cv.height = Math.round(hP + 2 * mx);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = COLOR.mostrador; ctx.fillRect(0, 0, cv.width, cv.height);
  let x = mx;
  for (const q of piezas) { pinta(ctx, q.P, x, mx + (q.dy ?? 0), q.s); x += q.P.w * q.s + gap; }
  return cv;
}

// El parte, para pegar en X (cabe en 280).
export function parte(L) {
  const { tc, wc, shown, stale, hoy, hasta, hat, delDia } = L;
  if (shown === null || stale) return null;
  const dm = (ts) => new Date(ts * 1000).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" }).replace(".", "");
  const win = hoy ? `${dm(hasta)}, hasta las ${hat}` : dm(hasta);
  const w = tc.worst;
  return `¿Cuántos nueves tiene Renfe? ${c.nf(shown)}. De cada 100 trenes de larga o media distancia ${delDia}, ${tc.onTimeOf100} iban en hora (${win}).`
    + (w ? ` El peor${w.route ? `, ${w.route}` : ""}: ${int(w.delay)} min de retraso.` : "")
    + (wc ? ` Sus webs, bien en ${int(wc.ok)} de ${int(wc.n)} comprobaciones.` : "")
    + ` ${c.SITE}`;
}

// El nueve del favicon: un trazo que da la vuelta y baja. Entero, en tenue; en tinta, hasta donde
// llegan los trenes (un nueve completo sería llegar al primero).
export function favicon(f, stock = "tercera") {
  const R = 9, S = 15, PHI = (125 * Math.PI) / 180, cx = 14.5, cy = 12, r = (v) => v.toFixed(2);
  const L1 = 2 * Math.PI * R, L = L1 + S + PHI * R;
  const dTo = (s) => {
    const l = Math.max(0, Math.min(1, s)) * L, A = `A${R} ${R} 0 0 0 `;
    let d = `M${r(cx + R)} ${r(cy)}`;
    const a = Math.min(l, L1) / R;
    if (a > Math.PI) d += `${A}${r(cx - R)} ${r(cy)}`;
    if (a > 0) d += a >= 2 * Math.PI - 1e-9 ? `${A}${r(cx + R)} ${r(cy)}` : `${A}${r(cx + R * Math.cos(a))} ${r(cy - R * Math.sin(a))}`;
    if (l > L1) d += `L${r(cx + R)} ${r(cy + Math.min(l - L1, S))}`;
    if (l > L1 + S) { const p = (l - L1 - S) / R; d += `A${R} ${R} 0 0 1 ${r(cx + R * Math.cos(p))} ${r(cy + S + R * Math.sin(p))}`; }
    return d;
  };
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40"><rect width="32" height="40" fill="${COLOR.carton[stock]}"/><path d="${dTo(1)}" fill="none" stroke="${COLOR.tinta}" stroke-width="5" opacity=".26"/><path d="${dTo(f)}" fill="none" stroke="${COLOR.tinta}" stroke-width="5"/></svg>`;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.append(link); }
  link.href = `data:image/svg+xml,${encodeURIComponent(out)}`;
}
