// Carga data.json y le da formato honesto: cuentas antes que cotas, horas absolutas y nada de «∞».

const H = 3600;

export const SITE = "renfe.borjagm1.com";
export const REPO = "https://github.com/BorjaGM1/renfe-uptime";
export const CLI = "https://github.com/luisgonzaleznf/renfe-cli";
export const DATOS = "https://renfe-data.borjagm1.com/data.json";
export const LOCAL = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

// En producción, el data.json de R2. En local, el de al lado (el que genera `renfe-uptime serve`), y además:
//   ?datos=prod   los datos de producción, para ver la página con lo de verdad
//   ?estado=…     uno de los casos de prueba de pruebas/ (normal, web-caida, noche, parados, ayer, sin-cifra,
//                 clase-1, clase-2), que no se despliegan
export async function load() {
  const q = new URLSearchParams(location.search), estado = LOCAL ? q.get("estado") : null;
  const url = estado ? `pruebas/data-${estado}.json` : LOCAL && q.get("datos") !== "prod" ? "data.json" : DATOS;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = enrich(await res.json());
  // Los casos de prueba son copias fijas: contra el reloj real todos parecerían parados. Solo uno lo simula.
  if (estado) d._stale = estado === "parados";
  return d;
}

export function enrich(d) {
  const generated = Date.parse(d.generated_at) / 1000;
  d._generated = generated;
  d._first = d.first_ts ?? generated;
  d._stale = Date.now() / 1000 - generated > 3 * d.interval_s;
  // Lo que enseña la página es un día (`day`): hoy o, de madrugada, ayer. Va desde la primera ronda de ese día
  // hasta ahora (o hasta la última ronda de ayer).
  d._desde = d.day?.from_ts ?? generated;
  d._hasta = d.day && !d.day.today ? (d.day.to_ts ?? generated) : generated;
  d._ld = d.trains.find((t) => t.kind === "ld");
  d._cer = d.trains.find((t) => t.kind === "cer");
  d._down = d.services.filter((s) => s.now && !s.now.ok);  // webs que fallan en la última ronda
  return d;
}

const madrid = (ts, opts) => new Date(ts * 1000).toLocaleString("es-ES", { timeZone: "Europe/Madrid", ...opts });
export const hhmm = (ts) => madrid(ts, { hour: "2-digit", minute: "2-digit" });
export const dayMonth = (ts) => madrid(ts, { day: "numeric", month: "long" });

// Horas absolutas, que sobreviven a una captura: «el 24 de noviembre, de 17:24 a 18:20».
export function range(from, to) {
  return dayMonth(from) === dayMonth(to)
    ? `el ${dayMonth(to)}, de ${hhmm(from)} a ${hhmm(to)}`
    : `del ${dayMonth(from)} a las ${hhmm(from)} al ${dayMonth(to)} a las ${hhmm(to)}`;
}

export const nf = (x, digits = 1) => x.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function pct(p, digits = 1) {
  if (p === null || p === undefined) return "—";
  if (p >= 1) return "100 %";
  return `${nf(p * 100, digits)} %`;
}

// Nueves de una proporción: 90 % = 1 · 99 % = 2 · 99,9 % = 3 · 50 % = 0,3. Con 100 % devuelve null: no hay
// cifra medible, se dice con cuentas («18 de 18»).
export function nines(p) {
  if (p === null || p === undefined || p >= 1) return null;
  return -Math.log10(1 - p);
}

// Cota inferior unilateral al 95 % (z = 1,645). Con 0 fallos en n rondas ≈ 1 − 3/n, la regla de tres. Va a las
// notas, no al titular: las rondas no son del todo independientes.
export function lowerBound(p, n, z = 1.645) {
  if (p === null || p === undefined || !n) return null;
  const den = 1 + (z * z) / n, centre = p + (z * z) / (2 * n);
  return Math.max(0, (centre - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den);
}

// ── Lo del día ──
export const rondasDia = (d) => d.day?.rounds ?? 0;

// Las webs del día, contadas: «104 comprobaciones, 104 con las seis bien».
export function websDia(d) {
  const n = rondasDia(d);
  if (!n) return null;
  const ok = d.day.all_ok, p = ok / n;
  return { n, ok, p, perfect: ok === n, nines: nines(p), lowerNines: nines(lowerBound(p, n)) };
}

// Los trenes de larga y media distancia del día: «de cada 100 trenes, 52 iban en hora». Cada tren y trayecto
// cuenta una vez, con el retraso de la última vez que se le vio. Sin bastantes trenes todavía, no hay cifra.
export function trenesDia(d) {
  const t = d._ld, y = t?.day;
  if (!y || !d.day.enough || y.punctual === null || y.punctual === undefined) return null;
  const p = y.punctual;
  return { p, n: y.n, onTimeOf100: Math.round(p * 100), lateOf100: 100 - Math.round(p * 100), nines: nines(p),
           belowOneNine: p < 0.9, now: t.now, worst: y.worst };
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
