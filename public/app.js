// Interfaz del chat. Todo el texto entra con textContent o createTextNode,
// nunca con innerHTML: lo que escriba el modelo no se interpreta como HTML.
(function () {
  const chat = document.getElementById("chat");
  const estado = document.getElementById("estado");
  const formulario = document.getElementById("formulario");
  const entrada = document.getElementById("mensaje");
  const boton = document.getElementById("enviar");
  const contador = document.getElementById("contador");
  const sugerencias = document.getElementById("sugerencias");
  const LARGO_MAXIMO = Number(entrada.maxLength) || 2000;
  let esperando = false;

  // Convierte las partes de una linea (normal / negrita) en nodos.
  function agregarPartes(padre, partes) {
    for (const parte of partes) {
      if (parte.negrita) {
        const fuerte = document.createElement("strong");
        fuerte.textContent = parte.texto;
        padre.appendChild(fuerte);
      } else {
        padre.appendChild(document.createTextNode(parte.texto));
      }
    }
  }

  // Convierte los bloques de Formato.analizar en parrafos y listas.
  function contenidoFormateado(texto) {
    const fragmento = document.createDocumentFragment();
    for (const bloque of window.Formato.analizar(texto)) {
      if (bloque.tipo === "lista") {
        const lista = document.createElement(bloque.ordenada ? "ol" : "ul");
        for (const item of bloque.items) {
          const li = document.createElement("li");
          agregarPartes(li, item);
          lista.appendChild(li);
        }
        fragmento.appendChild(lista);
      } else {
        const p = document.createElement("p");
        agregarPartes(p, bloque.partes);
        fragmento.appendChild(p);
      }
    }
    return fragmento;
  }

  const cercaDelFinal = () => chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;

  // Agrega un mensaje al historial. El autor va en texto oculto para que el
  // lector de pantalla diga quien habla (no solo el color y la posicion).
  function agregarMensaje(texto, deQuien, { error = false } = {}) {
    const seguirAbajo = deQuien === "yo" || cercaDelFinal();
    const burbuja = document.createElement("div");
    burbuja.className = `msg ${deQuien}${error ? " error" : ""}`;
    const autor = document.createElement("span");
    autor.className = "oculto";
    autor.textContent = deQuien === "yo" ? "Usted: " : "Asistente: ";
    burbuja.appendChild(autor);
    if (deQuien === "yo") {
      const p = document.createElement("p");
      p.textContent = texto;
      burbuja.appendChild(p);
    } else {
      burbuja.appendChild(contenidoFormateado(texto));
    }
    chat.appendChild(burbuja);
    if (seguirAbajo) chat.scrollTop = chat.scrollHeight;
  }

  function ponerEspera(activa) {
    esperando = activa;
    boton.setAttribute("aria-disabled", String(activa));
    chat.setAttribute("aria-busy", String(activa));
    // El texto va oculto para que el lector de pantalla (role="status") anuncie
    // "escribiendo…"; los tres puntos animados son decorativos (aria-hidden).
    estado.textContent = "";
    if (activa) {
      const aviso = document.createElement("span");
      aviso.className = "oculto";
      aviso.textContent = "El asistente está escribiendo…";
      estado.appendChild(aviso);
      const puntos = document.createElement("span");
      puntos.className = "escribiendo";
      puntos.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 3; i++) puntos.appendChild(document.createElement("span"));
      estado.appendChild(puntos);
    }
  }

  // Oculta las sugerencias iniciales una vez que la conversación arranca.
  function ocultarSugerencias() {
    if (sugerencias) sugerencias.remove();
  }

  // Chips: rellenan el campo y le dan el foco; el usuario decide enviar.
  if (sugerencias) {
    sugerencias.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      entrada.value = chip.textContent;
      actualizarContador();
      entrada.focus();
    });
  }

  function actualizarContador() {
    const largo = entrada.value.length;
    contador.textContent = largo >= LARGO_MAXIMO * 0.9
      ? `${largo} de ${LARGO_MAXIMO} caracteres` : "";
  }
  entrada.addEventListener("input", actualizarContador);

  formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mensaje = entrada.value.trim();
    if (!mensaje || esperando) return;
    ocultarSugerencias();
    agregarMensaje(mensaje, "yo");
    entrada.value = "";
    actualizarContador();
    ponerEspera(true);
    try {
      const r = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje }),
      });
      const datos = await r.json().catch(() => ({}));
      ponerEspera(false);
      agregarMensaje(datos.respuesta || "No recibimos respuesta. Intente de nuevo.", "bot", { error: !r.ok });
    } catch {
      ponerEspera(false);
      agregarMensaje("No se pudo conectar con el asistente. Revise su conexión e intente de nuevo.", "bot", { error: true });
    }
    entrada.focus();
  });
})();
