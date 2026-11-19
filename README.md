# Chatbot blindado contra prompt injection

Un chatbot de atención al cliente de una fintech ficticia (TicoPay S.A.) que custodia un dato confidencial y lo defiende con cuatro capas, porque un modelo de lenguaje se puede convencer y confiar solo en el system prompt no es seguro. Está pensado para Netlify Functions y usa la API gratuita de Groq.

Nació como trabajo del curso Seguridad Informática (UNA, Sede Regional Brunca). El bot de partida con su rol de TicoPay lo dio el curso; las capas de defensa, la interfaz y las pruebas son mías.

## Las cuatro capas

| Capa | Dónde | Qué hace |
|---|---|---|
| 0. Prompt endurecido | `netlify/functions/chat.js` | Reglas de alcance explícitas. El mensaje del cliente va dentro de una etiqueta con un identificador aleatorio por petición, así que el atacante no puede cerrarla ni hacerse pasar por el sistema. |
| 1. Filtro de entrada | `netlify/functions/lib/capa1-entrada.js` | Revisa el mensaje antes de llamar al modelo. Reglas por categoría de ataque (OWASP LLM01 y LLM07), no por frases exactas, sobre versiones normalizadas del texto: sin acentos, sin homoglifos cirílicos o griegos (`confusibles.js`) y sin trucos de espaciado. |
| 2. Filtro de salida | `netlify/functions/lib/capa2-salida.js` | Revisa la respuesta antes de devolverla. Si el secreto aparece, literal u ofuscado (espacios, guiones, mayúsculas, leetspeak), lo redacta o reemplaza la respuesta completa. |
| 3. Mínimo privilegio | `netlify/functions/chat.js` | El modelo nunca ve el secreto: vive solo en una variable de entorno del servidor y solo lo usa el filtro de salida. Lo que el modelo no vio, no lo puede filtrar. |

Además, `netlify.toml` publica solo `public/` y fija una política de seguridad de contenido estricta (sin scripts en línea ni de terceros) y cabeceras como `X-Frame-Options` y `Referrer-Policy`. La interfaz cuida la accesibilidad (WCAG 2.2 AA).

## Probarlo

```
npm test
```

Son 38 pruebas con `node:test`, sin dependencias. Solo se simula el borde de red (la llamada a Groq).

## Desplegarlo

1. Crea una API key gratuita en la consola de Groq.
2. Sube este repositorio a Netlify.
3. En Site configuration → Environment variables añade `GROQ_API_KEY`, `SECRETO` (el dato que quieres proteger; cualquier texto de prueba sirve) y, si hace falta, `MODELO` (por defecto `openai/gpt-oss-20b`).
4. Vuelve a desplegar para que tome las variables.

## Resultados medidos

Contra mi propio despliegue, en producción, con `openai/gpt-oss-20b`:

- Unos 50 ataques (35 de un sondeo automatizado y unos 15 manuales a la infraestructura y al modelo): 0 fugas del secreto.
- 32 consultas legítimas de un cliente: 0 bloqueadas, 0 vacías.

Estas cifras salen de mis propias mediciones de octubre y noviembre de 2026; este repositorio no incluye el sondeo, así que no se reproducen con solo clonarlo. Los filtros son reglas, no una garantía: un ataque nuevo puede esquivarlos, y por eso existe la capa 3.

## Alcance ético

Probar prompt injection solo se hace sobre sistemas propios o con autorización. En Costa Rica el acceso no autorizado a sistemas informáticos es delito (Ley 9048).

## Licencia

MIT
