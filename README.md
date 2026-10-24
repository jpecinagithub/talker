# Talker

Web app sencilla (Vite + React + TypeScript) donde dos interlocutores conversan
entre sí con el mismo LLM, a través de Puter.js. Sin backend y sin claves: la
llamada al modelo se hace desde el navegador con `puter.ai.chat()`.

## Cómo funciona

- Arriba, una zona amplia de configuración: **system prompt**, **tema**, **estilo**
  y, opcionalmente, el **modelo Puter** (vacío = modelo por defecto de Puter).
- **TALK** empieza una conversación nueva: el panel izquierdo habla primero y el
  derecho responde a esa intervención. Después se turnan hasta que se pulse STOP.
- Cada turno envía al mismo LLM el system prompt, el tema, el estilo y la
  conversación hasta ese momento (limitada a los últimos 12 turnos en el prompt,
  para no inflar el contexto).
- **STOP** impide el siguiente turno. La respuesta que estuviera en curso se
  muestra igualmente; no se borra.
- Seguridad: la conversación se detiene sola tras 60 turnos.

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue en Vercel

Importa este repositorio en Vercel con el framework **Vite** (valores por
defecto: `npm run build`, directorio de salida `dist`). No hace falta ninguna
variable de entorno.

Nota: Puter funciona con el modelo "user-pays": la primera vez, el navegador
puede pedir iniciar sesión en Puter para cubrir el uso del modelo.

Por Jon Peciña (jpecina).
