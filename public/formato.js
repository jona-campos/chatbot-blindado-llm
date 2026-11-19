// Formateador minimo de las respuestas del modelo: entiende negrita (**texto**),
// listas (1. / - / *) y parrafos. Devuelve BLOQUES de datos, no HTML: app.js los
// convierte en nodos con textContent, asi que nada de lo que escriba el modelo se
// interpreta como HTML (sin riesgo de XSS y compatible con la CSP estricta).
(function (raiz) {
  // Parte una linea en tramos normales y en negrita segun los pares de **.
  function enLinea(linea) {
    const partes = [];
    linea.split(/\*\*(.+?)\*\*/).forEach((tramo, i) => {
      if (tramo) partes.push({ texto: tramo, negrita: i % 2 === 1 });
    });
    return partes;
  }

  const ITEM = /^\s*(?:(\d+)[.)]|[-*•])\s+(.*)$/;
  const TITULO = /^\s*#{1,6}\s+(.*)$/;

  // Recorre linea por linea: una linea en blanco cierra el parrafo; lineas
  // seguidas que empiezan con "1." o "-" forman una lista.
  function analizar(texto) {
    const bloques = [];
    let parrafo = null;
    let lista = null;
    for (const linea of String(texto).split(/\r?\n/)) {
      const item = linea.match(ITEM);
      const titulo = linea.match(TITULO);
      if (titulo) {
        parrafo = null;
        lista = null;
        bloques.push({ tipo: "parrafo", partes: [{ texto: titulo[1].replace(/\*\*/g, ""), negrita: true }] });
      } else if (item) {
        parrafo = null;
        const ordenada = item[1] !== undefined;
        if (!lista || lista.ordenada !== ordenada) {
          lista = { tipo: "lista", ordenada, items: [] };
          bloques.push(lista);
        }
        lista.items.push(enLinea(item[2]));
      } else if (!linea.trim()) {
        parrafo = null;
        lista = null;
      } else {
        lista = null;
        if (!parrafo) {
          parrafo = { tipo: "en-curso", lineas: [] };
          bloques.push(parrafo);
        }
        parrafo.lineas.push(linea.trim());
      }
    }
    return bloques.map((b) => (b.tipo === "en-curso" ? { tipo: "parrafo", partes: enLinea(b.lineas.join("\n")) } : b));
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { analizar };
  else raiz.Formato = { analizar };
})(this);
