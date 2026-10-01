# Your-AI

A full-stack AI chat app: **React + Vite + TypeScript** frontend, **Node.js + Express** backend, and the **official OpenAI SDK**. Replies stream to the UI as they are generated. The OpenAI API key stays on the server and is never sent to the browser.

```
Browser (React) ──/api/chat (SSE)──▶ Express ──▶ OpenAI API
```

## Features
- Responsive sidebar with chat history, search, rename and delete
- Streaming replies with a Stop button and protection against double submits
- Markdown (GFM) rendering, syntax-highlighted code blocks, Copy code and Copy response buttons
- Enter sends, Shift+Enter adds a new line, and the view auto-scrolls during replies
- Model picker, configured on the server through `OPENAI_MODELS`
- Light, dark and system themes; your choice is saved
- Chats are saved in `localStorage`. Each chat keeps its id, title, creation time, update time and messages
- Attachments:
  - Images (PNG, JPEG, WebP or GIF, up to 4 MB) are sent to the model as vision input
  - Text and code files are added to the prompt
  - Other file types are rejected with a message
- Request validation (zod) and size limits, with error messages that never show stack traces or secrets

## Project structure
```
backend/src/
  server.ts            Express app (also serves frontend/dist in production)
  config.ts            Settings read from the environment and .env
  validation.ts        Request schema and limits
  routes/chat.ts       GET /api/config, POST /api/chat (SSE)
  services/openai.ts   OpenAI client, message mapping, error mapping
frontend/src/
  App.tsx              Main screen and chat state
  components/          Sidebar, Composer, MessageItem, Markdown, Welcome, Icons
  hooks/               useChats (localStorage), useTheme
  lib/                 api (SSE client), storage, attachments
  types/
```

## Local development
1. **Install dependencies.** You need Node 20 or later.
   ```bash
   npm install
   ```
2. **Create the `.env` file.**
   ```bash
   cp .env.example .env
   ```
3. **Add your key** to `.env`: `OPENAI_API_KEY=sk-...`. You can also set `OPENAI_MODELS` (a comma-separated list; the first entry is the default).
4. **Start the dev servers.** This runs the API on port 3001 and Vite on port 5173. Vite forwards `/api` requests to the API.
   ```bash
   npm run dev
   ```
5. **Open the app** at http://localhost:5173.

If no key is set, the app shows a "Setup required" banner and the API returns a `missing_api_key` error. It never shows made-up replies.

## Docker
```bash
cp .env.example .env              # add OPENAI_API_KEY
docker compose up --build         # dev with hot reload → http://localhost:5173
docker compose --profile prod up --build prod   # production → http://localhost:3001
```
`docker-compose.alloy.yaml` is the host-network setup used by the Alloy sandbox.

## Production build
```bash
npm run typecheck
npm run build      # outputs frontend/dist and backend/dist
npm start          # Express serves the API and the built UI on PORT (default 3001)
```

## Environment variables
| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | yes | – | OpenAI key (used only on the server) |
| `OPENAI_MODELS` | no | `gpt-5-mini,gpt-5,gpt-4.1-mini` | Models offered in the picker |
| `OPENAI_DEFAULT_MODEL` | no | first entry in `OPENAI_MODELS` | Default model |
| `PORT` | no | `3001` | API port |
| `OPENAI_BASE_URL` | no | – | Address of an OpenAI-compatible API, if not using OpenAI's |
| `SYSTEM_PROMPT` | no | built-in | Instructions given to the assistant |

## Limitations
- Chats live only in this browser's `localStorage`. They do not sync between devices, and there are no user accounts.
- If browser storage fills up, saved image data is removed first so the chat text is kept. Older images then can't be sent to the model again.
- PDFs and other binary documents are not supported.
- There is no rate limiting or authentication. Put the app behind your own auth before exposing it publicly.
