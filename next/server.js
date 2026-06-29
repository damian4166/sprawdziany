const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const nodemailer = require('nodemailer');

async function main() {
  const { createInitialState, addQuestion, submitAnswer, isAnswerCorrect } = await import('./lib/quiz-state.mjs');
  const { loadState, saveState } = await import('./lib/state-storage.mjs');

  const dev = process.env.NODE_ENV !== 'production';
  const hostname = process.env.HOST || '0.0.0.0';
  const port = Number(process.env.PORT || 3000);

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  let state = await loadState();

  // Setup SMTP Transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 25),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });

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

        if (message.type === 'send-result-email') {
          const { studentId, email } = message.payload;
          const studentAnswers = state.answers.filter((answer) => answer.studentId === studentId);
          const correctCount = studentAnswers.filter((answer) => {
            const question = state.questions.find((q) => q.id === answer.questionId);
            return question && isAnswerCorrect(question, answer.value);
          }).length;
          const totalAnswered = studentAnswers.length;
          const percentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

          const mailOptions = {
            from: process.env.SMTP_FROM || 'sprawdziany@example.com',
            to: email,
            subject: 'Twój wynik z testu online',
            html: `
              <h2>Wynik testu</h2>
              <p>Cześć ${studentId},</p>
              <p>Twoje wyniki z testu online:</p>
              <p><strong>Poprawne odpowiedzi: ${correctCount} / ${totalAnswered}</strong></p>
              <p><strong>Wynik: ${percentage}%</strong></p>
              <p>Dziękujemy za uczestnictwo w teście!</p>
            `,
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error('Error sending email:', err);
            } else {
              console.log('Email sent:', info.response);
            }
          });
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
