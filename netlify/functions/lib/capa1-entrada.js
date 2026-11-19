// >>> CAPA 1 — FILTRO DE ENTRADA <<<
// Revisa el mensaje ANTES de mandarlo al modelo y corta si parece un intento de
// inyeccion. Bloquear aca tambien ahorra la llamada a la API (latencia y cuota).
//
// Las reglas describen CATEGORIAS de ataque (OWASP LLM01 / LLM07), no frases
// exactas, para no sobreajustarse a un set de pruebas. Un cliente de TicoPay no
// necesita pedir "el secreto", "tus instrucciones" ni "el texto de sistema".

const REGLAS = [
  // LLM01 — pedir que olvide/ignore sus reglas.
  { categoria: "inyeccion_directa",
    patron: /\b(ignor|olvid|omit|salt|desobedec|anul)\w*\b.{0,40}\b(instrucci|regla|indicaci|restricci|politic|directriz|directrices)/ },
  { categoria: "inyeccion_directa",
    patron: /\b(ignor|olvid)\w*\b.{0,15}\blo que te (dijeron|indicaron|ordenaron|programaron)/ },
  { categoria: "inyeccion_directa",
    patron: /\b(ignore|disregard|forget)\b.{0,30}\b(instructions?|rules|prompt)\b/ },
  { categoria: "objetivo_sensible",
    patron: /\b(reveal|tell|give|print|show|leak|output)\b.{0,30}\b(password|secret|flag|hidden|configuration|(your|system|initial) (instructions|prompt|rules))\b|\b(hidden|initial|original) (configuration|instructions|prompt)\b/ },

  // LLM02 / LLM07 — mencionar el activo protegido o la configuracion interna.
  { categoria: "objetivo_sensible",
    patron: /(?<!\ben )\bsecret[oa]s?\b|\bsecrets?\b|\bdatos? (interno|confidencial)|\bllave\b|\bflag\b|\bbandera\b/ },
  { categoria: "objetivo_sensible",
    patron: /\b(contrasena|clave|password)\b.{0,30}\b(proteg|guard|custodi|ocult)|\b(revel|entreg|d[ae]me|dime|comparte)\w*\b.{0,15}\b(la|tu) (clave|contrasena)\b/ },
  { categoria: "extraccion_prompt",
    patron: /\b(system ?prompt|prompt (de|del) sistema|(texto|mensaje|instrucciones|configuracion) (de|del) sistema|tus (instrucciones|reglas|directrices|ordenes)|variables? internas?|configuracion interna|credenciales|api ?key|token)\b/ },
  { categoria: "extraccion_prompt",
    patron: /\b(repite|repeti|imprime|muestra|copia)\b.{0,30}\b(palabra por palabra|literal|texto de arriba|todo lo anterior|tu texto)/ },

  // Suplantacion de autoridad / inyeccion indirecta: marcas falsas de sistema.
  { categoria: "suplantacion",
    patron: /\[\s*(sistema|system|admin|root|developer)\s*\]|<\|?\s*(im_start|system)|#{3,}|-{4,}|\bnueva politica\b|\bfin de (las )?reglas\b/ },
  { categoria: "suplantacion",
    patron: /\bmodo (debug|depuracion|desarrollador|mantenimiento|administrador|dios)\b|\bdeveloper mode\b|\bsoy (tu|el|del|un) (desarrollador|administrador|creador|programador|equipo de seguridad)/ },

  // Falso entorno de pruebas ("virtualizacion"), configuracion disfrazada de XML/JSON,
  // sondeo de herramientas e instrucciones ocultas para el asistente en texto pegado.
  { categoria: "suplantacion",
    patron: /\b(entorno|ambiente|modo) de (prueba|pruebas|desarrollo|test|testing)\b.{0,60}\b(restriccion|regla|filtro|seguridad)|\b(restriccion|regla|filtro)\w* (estan |estas )?(desactivad|deshabilitad|apagad)/ },
  { categoria: "suplantacion",
    patron: /<\s*\/?\s*(config|configuracion|policy|politica|rol|role|system|sistema|instruccion|instruction)\b|"\s*role\s*"\s*:/ },
  { categoria: "extraccion_prompt",
    patron: /\b(funciones|herramientas|plugins?)\b.{0,30}\ba las que (tienes|tenes|tiene|dispones) acceso|\b(tools|functions) you have access to\b/ },
  { categoria: "suplantacion",
    patron: /<!--|\b(instruccion(es)?|nota|mensaje) para (el|la) (asistente|ia|bot|modelo)\b/ },

  // Juego de rol / jailbreak.
  { categoria: "jailbreak",
    patron: /\b(actua|finge|haz de cuenta|imagina que eres|pretend|act as)\b|\bdan\b|\bjailbreak\b|\bsin (reglas|restricciones|filtros|limites)\b|\bobra de teatro\b|\btu personaje\b/ },
];

const { quitarConfusibles } = require("./confusibles.js");

function normalizar(texto) {
  return quitarConfusibles(texto)
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "") // caracteres invisibles
    .toLowerCase();
}

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

// Une letras sueltas separadas ("s e c r e t o", "s-e-c-r-e-t-o") en una palabra.
const unirLetrasSueltas = (t) =>
  t.replace(/(?:\b\w[\s.\-_*·]+){3,}\w\b/g, (tramo) => tramo.replace(/[\s.\-_*·]+/g, ""));

// Decodifica tramos en base64 que resulten ser texto legible.
function decodificarBase64(t) {
  return (t.match(/[A-Za-z0-9+/]{16,}={0,2}/g) || [])
    .map((b) => Buffer.from(b, "base64").toString("utf8"))
    .filter((d) => /^[\x20-\x7eÀ-ſ\s]+$/.test(d));
}

// Las "vistas" del mensaje que se revisan: tal cual, sin leetspeak, con letras
// sueltas unidas y lo que haya escondido en base64.
function vistas(mensaje) {
  const texto = normalizar(mensaje);
  const sinLeet = texto.replace(/[013457@$]/g, (c) => LEET[c]);
  const base = [texto, sinLeet, unirLetrasSueltas(sinLeet)];
  return [...base, ...decodificarBase64(mensaje).map(normalizar)];
}

function revisarEntrada(mensaje) {
  for (const v of vistas(mensaje)) {
    const regla = REGLAS.find((r) => r.patron.test(v));
    if (regla) return { bloqueado: true, categoria: regla.categoria };
  }
  return { bloqueado: false };
}

module.exports = { revisarEntrada };
