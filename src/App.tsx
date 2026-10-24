import { useEffect, useRef, useState } from 'react';

type Side = 'left' | 'right';

interface Turn {
  side: Side;
  text: string;
}

interface TalkConfig {
  systemPrompt: string;
  topic: string;
  style: string;
  model: string;
}

const MAX_TURNS = 60;
const PROMPT_HISTORY_TURNS = 12;

const SIDE_LABEL: Record<Side, string> = {
  left: 'Izquierda',
  right: 'Derecha',
};

function extractText(response: PuterChatResponse | string): string {
  if (typeof response === 'string') return response.trim();
  const content = response.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((block) => block.text ?? '')
      .join('')
      .trim();
  }
  return (response.text ?? '').trim();
}

function buildPrompt(side: Side, config: TalkConfig, turns: Turn[]) {
  const systemLines = [config.systemPrompt.trim()];
  if (config.topic.trim()) systemLines.push(`Tema de la conversación: ${config.topic.trim()}.`);
  if (config.style.trim()) systemLines.push(`Estilo: ${config.style.trim()}.`);
  systemLines.push(
    `Eres el interlocutor de la ${SIDE_LABEL[side].toUpperCase()} en una conversación entre dos personas.`,
    'Responde únicamente con tu intervención, en 1 a 4 frases, sin encabezados, sin narrar lo que hace el otro y sin repetir la conversación completa.',
  );

  const recent = turns.slice(-PROMPT_HISTORY_TURNS);
  const transcript = recent
    .map((turn) => `${SIDE_LABEL[turn.side]}: ${turn.text}`)
    .join('\n');

  const user =
    turns.length === 0
      ? `Empieza tú la conversación${config.topic.trim() ? ` sobre "${config.topic.trim()}"` : ''}.`
      : `Esta es la conversación hasta ahora:\n${transcript}\n\nAhora te toca a ti. Responde a la última intervención, sin repetirla.`;

  return [
    { role: 'system' as const, content: systemLines.join('\n') },
    { role: 'user' as const, content: user },
  ];
}

async function askPuter(side: Side, config: TalkConfig, turns: Turn[]) {
  if (!window.puter?.ai?.chat) {
    throw new Error(
      'Puter.js no está cargado. Revisa tu conexión y recarga la página.',
    );
  }
  const options = config.model.trim() ? { model: config.model.trim() } : undefined;
  const response = await window.puter.ai.chat(buildPrompt(side, config, turns), options);
  const text = extractText(response);
  if (!text) throw new Error('El modelo devolvió una respuesta vacía.');
  return text;
}

export default function App() {
  const [systemPrompt, setSystemPrompt] = useState(
    'Eres un conversador curioso y amable. Escucha lo que dice el otro, responde con naturalidad y haz preguntas de vez en cuando para que la conversación avance.',
  );
  const [topic, setTopic] = useState('La vida en una ciudad dentro de 50 años');
  const [style, setStyle] = useState('Conversación natural y cercana, con frases cortas');
  const [model, setModel] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [thinkingSide, setThinkingSide] = useState<Side | null>(null);
  const [status, setStatus] = useState('En espera. Pulsa TALK para empezar.');
  const [error, setError] = useState<string | null>(null);

  const runningRef = useRef(false);
  const sessionRef = useRef(0);
  const turnsRef = useRef<Turn[]>([]);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    leftPanelRef.current?.scrollTo({ top: leftPanelRef.current.scrollHeight });
    rightPanelRef.current?.scrollTo({ top: rightPanelRef.current.scrollHeight });
  }, [turns, thinkingSide]);

  const addTurn = (turn: Turn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  };

  const handleTalk = async () => {
    if (runningRef.current) return;
    const config: TalkConfig = { systemPrompt, topic, style, model };
    const session = ++sessionRef.current;
    runningRef.current = true;
    turnsRef.current = [];
    setTurns([]);
    setError(null);
    setRunning(true);

    let side: Side = 'left';
    let count = 0;
    let stoppedByError: string | null = null;

    while (runningRef.current && sessionRef.current === session && count < MAX_TURNS) {
      setThinkingSide(side);
      setStatus(`Hablando… turno ${count + 1} — ${SIDE_LABEL[side]}`);
      try {
        const text = await askPuter(side, config, turnsRef.current);
        // La respuesta en curso se muestra aunque se haya pulsado STOP
        // mientras se esperaba: STOP impide el siguiente turno, no borra esta.
        if (sessionRef.current !== session) break;
        addTurn({ side, text });
        count += 1;
        side = side === 'left' ? 'right' : 'left';
      } catch (err) {
        if (sessionRef.current === session) {
          stoppedByError = err instanceof Error ? err.message : 'Error desconocido al llamar al modelo.';
        }
        break;
      }
    }

    setThinkingSide(null);
    runningRef.current = false;
    setRunning(false);
    if (sessionRef.current !== session) return;
    if (stoppedByError) {
      setError(stoppedByError);
      setStatus('Detenida por un error.');
    } else if (count >= MAX_TURNS) {
      setStatus(`Detenida automáticamente tras ${MAX_TURNS} turnos. Pulsa TALK para otra conversación.`);
    } else {
      setStatus('Detenida. Pulsa TALK para empezar otra conversación.');
    }
  };

  const handleStop = () => {
    runningRef.current = false;
    setRunning(false);
    setStatus('Deteniendo… la respuesta en curso se mostrará y no habrá más turnos.');
  };

  const leftTurns = turns.filter((turn) => turn.side === 'left');
  const rightTurns = turns.filter((turn) => turn.side === 'right');

  const renderPanel = (side: Side, panelTurns: Turn[], panelRef: React.RefObject<HTMLDivElement | null>) => (
    <section className={`panel panel-${side}`} aria-label={`Panel ${SIDE_LABEL[side]}`}>
      <h2>{SIDE_LABEL[side]}</h2>
      <div className="messages" ref={panelRef}>
        {panelTurns.length === 0 && thinkingSide !== side && (
          <p className="empty">Aquí aparecerá lo que diga {SIDE_LABEL[side].toLowerCase()}.</p>
        )}
        {panelTurns.map((turn, index) => (
          <p key={`${side}-${index}`} className="message">
            {turn.text}
          </p>
        ))}
        {thinkingSide === side && <p className="message thinking">…</p>}
      </div>
    </section>
  );

  return (
    <main className="app">
      <header className="header">
        <h1>Talker</h1>
        <p>Dos voces, una conversación. Pulsa TALK y deja que hablen; STOP las detiene.</p>
      </header>

      <section className="config" aria-label="Configuración de la conversación">
        <label>
          System prompt
          <textarea
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            disabled={running}
            rows={4}
            placeholder="Cómo deben comportarse los dos interlocutores…"
          />
        </label>
        <div className="config-row">
          <label>
            Tema
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={running}
              placeholder="¿De qué van a hablar?"
            />
          </label>
          <label>
            Estilo
            <input
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              disabled={running}
              placeholder="Tono, longitud, registro…"
            />
          </label>
          <label>
            Modelo Puter (opcional)
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={running}
              placeholder="Vacío = modelo por defecto de Puter"
            />
          </label>
        </div>
        <p className="hint">
          La configuración se congela al pulsar TALK. Edítala antes de empezar; cada turno
          envía al mismo LLM el system prompt, el tema, el estilo y la conversación hasta ese momento.
        </p>
      </section>

      <div className="controls">
        <button type="button" className="talk" onClick={handleTalk} disabled={running}>
          TALK
        </button>
        <button type="button" className="stop" onClick={handleStop} disabled={!running}>
          STOP
        </button>
        <p className="status" role="status">
          {status} {turns.length > 0 && `(${turns.length} ${turns.length === 1 ? 'turno' : 'turnos'})`}
        </p>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="panels">
        {renderPanel('left', leftTurns, leftPanelRef)}
        {renderPanel('right', rightTurns, rightPanelRef)}
      </div>

      <footer>Por Jon Peciña (jpecina) · Funciona con Puter.js, sin claves ni backend.</footer>
    </main>
  );
}
