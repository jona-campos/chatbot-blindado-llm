// >>> CAPA 2 — FILTRO DE SALIDA <<<
// Revisa la respuesta del modelo ANTES de devolverla al cliente. No confia en
// que el modelo "decida" callar: si el secreto aparece, se redacta.
//  - Literal: se reemplaza solo el secreto y el resto de la respuesta se conserva.
//  - Ofuscado (espacios, guiones, mayusculas, leetspeak...): no se puede recortar
//    con precision, asi que se reemplaza la respuesta completa.

const MARCA = "[DATO PROTEGIDO]";
const BANDERA = /TICOPAY\s*\{[^}]*\}/gi;
const RESPUESTA_SEGURA = "[BLOQUEADO] Esa información es confidencial. ¿Le ayudo con otra consulta?";

// Largo minimo (ya normalizado) de un fragmento del secreto que cuenta como fuga.
// Con 10 daba falsos positivos: "no puedo compartir" contiene "ocompartir". Con 16
// (casi la mitad del secreto) se atrapan fugas parciales sin chocar con frases comunes.
const FRAGMENTO = 16;

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

// Lleva el texto a una forma canonica: minusculas, sin acentos, sin leetspeak
// y solo letras/digitos, para que "T-1-C-0 P4Y" y "ticopay" se comparen igual.
const { quitarConfusibles } = require("./confusibles.js");

function normalizar(texto) {
  return quitarConfusibles(texto)
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/[^a-z0-9]/g, "");
}

function contieneFragmento(texto, secretoNormal) {
  if (secretoNormal.length <= FRAGMENTO) return texto.includes(secretoNormal);
  for (let i = 0; i + FRAGMENTO <= secretoNormal.length; i++) {
    if (texto.includes(secretoNormal.slice(i, i + FRAGMENTO))) return true;
  }
  return false;
}

const rot13 = (t) => t.replace(/[a-z]/gi, (c) => {
  const base = c <= "Z" ? 65 : 97;
  return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
});

// Decodifica los tramos que parecen base64 o hexadecimal; si no son texto valido, se ignoran.
function decodificados(texto) {
  const salida = [];
  for (const t of texto.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) || []) {
    salida.push(Buffer.from(t, "base64").toString("latin1"));
  }
  for (const t of texto.match(/(?:[0-9a-fA-F]{2}[\s:]?){8,}/g) || []) {
    salida.push(Buffer.from(t.replace(/[\s:]/g, ""), "hex").toString("latin1"));
  }
  return salida;
}

// Las "vistas" de la respuesta en que podria esconderse el secreto.
function vistas(texto) {
  const base = [texto, [...texto].reverse().join(""), rot13(texto)];
  return [...base, ...base.flatMap(decodificados)];
}

function filtrarSalida(texto, secreto) {
  if (!secreto) return { texto, fuga: false };
  let fuga = false;
  if (texto.includes(secreto)) {
    texto = texto.split(secreto).join(MARCA);
    fuga = true;
  }
  // Cualquier bandera con el formato de la empresa, por si el secreto vigente cambio.
  const sinBanderas = texto.replace(BANDERA, MARCA);
  if (sinBanderas !== texto) {
    texto = sinBanderas;
    fuga = true;
  }
  const secretoNormal = normalizar(secreto);
  if (vistas(texto).some((v) => contieneFragmento(normalizar(v), secretoNormal))) {
    return { texto: RESPUESTA_SEGURA, fuga: true };
  }
  return { texto, fuga };
}

module.exports = { filtrarSalida };
