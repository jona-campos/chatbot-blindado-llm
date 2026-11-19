// Pruebas del formateador de respuestas por su interfaz publica: analizar(texto) -> bloques.
// Los bloques luego se convierten en nodos con textContent (nunca innerHTML).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { analizar } = require("../public/formato.js");

test("un texto simple es un parrafo sin formato", () => {
  assert.deepEqual(analizar("Abrimos a las 8am."), [
    { tipo: "parrafo", partes: [{ texto: "Abrimos a las 8am.", negrita: false }] },
  ]);
});

test("separa parrafos, listas numeradas y listas con vinetas", () => {
  const texto = "Para abrir una cuenta:\n\n1. **Descargue** la app\n2. Regístrese\n\nRequisitos:\n- Ser mayor de 18\n* Tener cédula";
  const p = (t) => [{ texto: t, negrita: false }];
  assert.deepEqual(analizar(texto), [
    { tipo: "parrafo", partes: p("Para abrir una cuenta:") },
    { tipo: "lista", ordenada: true, items: [
      [{ texto: "Descargue", negrita: true }, { texto: " la app", negrita: false }],
      p("Regístrese"),
    ] },
    { tipo: "parrafo", partes: p("Requisitos:") },
    { tipo: "lista", ordenada: false, items: [p("Ser mayor de 18"), p("Tener cédula")] },
  ]);
});

test("un titulo markdown (### ...) se muestra como parrafo en negrita, sin numerales", () => {
  assert.deepEqual(analizar("### Requisitos básicos"), [
    { tipo: "parrafo", partes: [{ texto: "Requisitos básicos", negrita: true }] },
  ]);
});

test("el HTML del modelo queda como texto literal, nunca como etiquetas", () => {
  const ataque = '<img src=x onerror="alert(1)"> y **<script>alert(2)</script>**';
  assert.deepEqual(analizar(ataque), [
    { tipo: "parrafo", partes: [
      { texto: '<img src=x onerror="alert(1)"> y ', negrita: false },
      { texto: "<script>alert(2)</script>", negrita: true },
    ] },
  ]);
});

test("la negrita se marca y los asteriscos desaparecen", () => {
  assert.deepEqual(analizar("Use la **app TicoPay** para pagar."), [
    { tipo: "parrafo", partes: [
      { texto: "Use la ", negrita: false },
      { texto: "app TicoPay", negrita: true },
      { texto: " para pagar.", negrita: false },
    ] },
  ]);
});
