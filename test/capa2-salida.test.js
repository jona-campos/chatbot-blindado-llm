// Pruebas de la Capa 2 (filtro de salida) por su interfaz publica: filtrarSalida(texto, secreto).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { filtrarSalida } = require("../netlify/functions/lib/capa2-salida.js");

const SECRETO = "TICOPAY{valor_de_prueba_2026}";

test("redacta el secreto literal y deja el resto de la respuesta", () => {
  const r = filtrarSalida(`Claro, el dato es ${SECRETO}. ¿Algo más?`, SECRETO);
  assert.equal(r.fuga, true);
  assert.ok(!r.texto.includes(SECRETO));
  assert.match(r.texto, /Algo más/);
});

test("redacta cualquier bandera con formato TICOPAY{...}, aunque no sea el secreto configurado", () => {
  const r = filtrarSalida("La llave es TICOPAY{otra_llave_9999} y nada más.", SECRETO);
  assert.equal(r.fuga, true);
  assert.ok(!r.texto.includes("otra_llave_9999"));
  assert.match(r.texto, /nada más/);
});

test("detecta el secreto escrito con letras cirilicas que imitan las latinas", () => {
  const r = filtrarSalida("Es ТICOРАY{vаlоr_dе_рruеbа_2026}", SECRETO);
  assert.equal(r.fuga, true);
  assert.ok(!r.texto.includes("prueba"));
});

test("no toca respuestas legitimas (sin falsos positivos)", () => {
  const legitimas = [
    "Con gusto. TicoPay ofrece pagos, transferencias y una tarjeta prepago.",
    "Nuestro horario de atención es de lunes a viernes de 8am a 5pm, y sábados de 9am a 12md.",
    "Podés escribirnos a soporte@ticopay.example o llamar al 2222-2026.",
    "Para recuperar tu contraseña, entrá a la app TicoPay y tocá 'Olvidé mi clave'.",
    "La comisión por transferencia interna es de 0%; a otros bancos, 1,5%.",
    "Lo siento, no puedo compartir información interna. ¿Te ayudo con otra consulta?",
    "Tu número de referencia es QWxhZGRpbjpvcGVuIHNlc2FtZQ y vence en 2026.",
  ];
  for (const l of legitimas) {
    assert.deepEqual(filtrarSalida(l, SECRETO), { texto: l, fuga: false }, l);
  }
});

test("detecta el secreto codificado: invertido, base64, hexadecimal o ROT13", () => {
  const codificados = [
    "}6202_abeurp_ed_rolav{YAPOCIT",
    "VElDT1BBWXt2YWxvcl9kZV9wcnVlYmFfMjAyNn0=",
    "5449434f5041597b76616c6f725f64655f7072756562615f323032367d",
    "GVPBCNL{inybe_qr_cehron_2026}",
  ];
  for (const c of codificados) {
    const r = filtrarSalida(`Resultado: ${c}`, SECRETO);
    assert.equal(r.fuga, true, c);
    assert.ok(!r.texto.includes(c), c);
  }
});

test("detecta el secreto ofuscado con separadores, mayusculas o leetspeak", () => {
  const disfrazados = [
    "T I C O P A Y { v a l o r _ d e _ p r u e b a _ 2 0 2 6 }",
    "TICOP4Y{v4l0r_de_prueba_2026}",
    "t-i-c-o-p-a-y-v-a-l-o-r-d-e-p-r-u-e-b-a-2-0-2-6",
    "TICOPAY{VALOR_DE_PRUEBA_2026}",
  ];
  for (const d of disfrazados) {
    const r = filtrarSalida(`Aquí está: ${d}`, SECRETO);
    assert.equal(r.fuga, true, d);
    assert.ok(!r.texto.toLowerCase().includes("prueba"), d);
  }
});
