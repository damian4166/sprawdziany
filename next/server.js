const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

async function main() {
  const { createInitialState, addQuestion, submitAnswer } = await import('./lib/quiz-state.mjs');
  const { loadState, saveState } = await import('./lib/state-storage.mjs');

  const dev = process.env.NODE_ENV !== 'production';
  const hostname = process.env.HOST || '0.0.0.0';
  const port = Number(process.env.PORT || 3000);

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  let state = await loadState();

  await app.prepare();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const WS_PATH = '/api/ws';
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const pathname = parse(req.url || '', true).pathname;

    if (pathname === WS_PATH) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  const broadcastState = () => {
    const payload = JSON.stringify({ type: 'state', payload: state });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'state', payload: state }));

    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());

        if (message.type === 'add-question') {
          state = addQuestion(state, message.payload);
          saveState(state).catch(() => {});
          broadcastState();
        }

        if (message.type === 'submit-answer') {
          state = submitAnswer(state, message.payload);
          saveState(state).catch(() => {});
          broadcastState();
        }

        if (message.type === 'get-state') {
          ws.send(JSON.stringify({ type: 'state', payload: state }));
        }
      } catch {
        // Ignore malformed websocket messages.
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

main();
