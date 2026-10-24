interface PuterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PuterChatResponse {
  message?: {
    content?: string | Array<{ text?: string }>;
  };
  text?: string;
}

interface PuterAI {
  chat: (
    messages: PuterChatMessage[],
    options?: { model?: string },
  ) => Promise<PuterChatResponse | string>;
}

interface Window {
  puter?: { ai?: PuterAI };
}
