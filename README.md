# Galaxy AI

Galaxy AI is a full-stack AI chatbot. The frontend is **React + TypeScript + Vite**. A small **Node/Express** backend streams replies from **Google Gemini** (the default) or **OpenAI**. API keys live only on the server and never reach the browser.

```
Browser (React) ──POST /api/chat (Server-Sent Events)──▶ Express ──▶ Gemini / OpenAI
```

## Features
- **Chat**
  - Replies stream in as they are generated, with a typing indicator, a **Stop** button and automatic scrolling (with a "jump to latest" button).
  - Each reply has **Regenerate**, **Copy**, and 👍/👎 buttons. Feedback is saved locally only.
  - You can clear a conversation.
- **Sidebar**
  - New chat (Ctrl/⌘+Shift+O).
  - Searches both titles and message text.
  - Chats are grouped by date: Today, Yesterday, and so on.
  - Rename, delete, or delete all chats.
  - The sidebar can be collapsed. On mobile it becomes a drawer that closes after you pick a chat.
- **Composer**
  - The text box grows as you type.
  - Enter sends and Shift+Enter adds a new line. You can switch to Ctrl/⌘+Enter to send in Settings.
  - A character counter appears near the limit.
  - **Attachments:**
    - Images (PNG, JPEG, WebP) and PDFs go to the model as native inputs.
    - Text and code files are added to the prompt.
    - Unsupported files are rejected with a message.
  - **Voice input** uses the browser's speech recognition. The transcript goes into the text box so you can edit it. If the browser doesn't support it, you get a clear message.
- **Models**: you pick **Fast / Balanced / Advanced**. These map to real provider models in `backend/src/models.ts`, and you can override each one in `.env`.
- **Message display**: Markdown (GitHub-flavoured), headings, tables, quotes, links and syntax-highlighted code with **Copy code**. Long code scrolls sideways. Raw HTML is never rendered.
- **Settings**:
  - theme (Light / Dark / System; dark is the default)
  - default model
  - Enter-to-send
  - export and import (JSON, checked on import)
  - clear all
  - about
- **Persistence**: conversations are kept in `localStorage` as `{id, title, createdAt, updatedAt, messages[{id, role, content, timestamp}]}`. Saved data is checked when it loads, so corrupted data can't crash the app.
- **Error handling**: clear messages for:
  - missing or invalid API key
  - rate limits (from the provider, and the server's own per-IP limit)
  - network failures
  - provider outages
  - empty replies
  - stalled streams (60-second idle timeout, so the UI never stays stuck on "generating")
- **Performance**:
  - Messages and the sidebar only re-render when they change.
  - Streamed text is batched once per animation frame.
  - Saving to `localStorage` is delayed slightly so it doesn't run on every token.
  - The Markdown/code-highlighting bundle and the Settings dialog load separately (lazy-loaded).
- **Accessibility**: keyboard-navigable menus and dialogs (focus stays inside an open dialog, and Esc closes it), ARIA labels, visible focus outlines, a skip link, a live region for messages, and reduced-motion support.

## Create (image & video generation)
Use **Create** in the sidebar to open the generation workspace, which has **Image** and **Video** modes. Every request goes through the backend, so provider keys stay on the server.

| | Default provider | Key | Notes |
|---|---|---|---|
| Image | `pollinations` (Pollinations.ai) | optional `IMAGE_API_KEY` | Works without a key on Pollinations' free anonymous tier, which is rate-limited and may add a watermark. Set `IMAGE_PROVIDER=gemini` to use Gemini image models instead (these need a billing-enabled key). |
| Video | `veo` (Google Veo via the Gemini API) | `VIDEO_API_KEY`, or `GEMINI_API_KEY` if that is unset | Videos are generated as background jobs. You can also supply a starting image (image-to-video). **Requires billing**: free-tier keys get a quota error. |

- Endpoints:
  - `POST /api/generate-image`
  - `POST /api/generate-video`
  - `GET /api/generate-video/:jobId`
  - `GET /api/media-config` (what the configured providers support)
  - `GET /api/media/:file` (the generated file)
- Generated files are saved to `backend/data/media` (this folder is git-ignored) and deleted after `MEDIA_RETENTION_HOURS`. If a link has expired, the app says so instead of showing a broken image or video.
- The UI only shows options the provider actually supports: aspect ratio, image upload, and a progress percentage only if the provider reports one. Cancel is not shown because Veo has no cancel endpoint.
- Provider and model settings are in `backend/src/config/aiProviders.ts`. Provider code is in `backend/src/media/{image,video}/`.
- Recent creations are kept in `localStorage`. Only the prompt, date and file URL are saved there, not the image or video itself.

## Project structure
```
backend/src/
  server.ts               Express app (serves frontend/dist in production)
  config.ts               Environment settings and provider selection
  models.ts               Fast/Balanced/Advanced → provider model mapping
  validation.ts           zod request schema and limits
  rateLimit.ts            Per-IP request limit
  api/chat/router.ts      GET /api/config, POST /api/chat (streaming)
  providers/              gemini.ts, openai.ts, shared types and error mapping
frontend/src/
  App.tsx, main.tsx, styles.css
  components/Chat/        ChatHeader, ChatView, Welcome
  components/Sidebar/     Sidebar
  components/Composer/    Composer (attachments, voice)
  components/Message/     MessageItem, Markdown (lazy-loaded)
  components/Settings/    SettingsModal (lazy-loaded)
  components/UI/          Icons, Modal, ConfirmDialog
  hooks/                  useConversations, useChatEngine, useSettings, useSpeechRecognition, useCopy
  services/               api (streaming client), storage
  utils/                  attachments, format, validate (import/export)
  types/
```

## Getting started
```bash
npm install
cp .env.example .env          # then set GEMINI_API_KEY (or OPENAI_API_KEY)
npm run dev                   # API on :3001, app on http://localhost:5173
```
Get a Gemini key at https://aistudio.google.com/apikey.

### Environment variables
| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | one of the two | Google Gemini key |
| `OPENAI_API_KEY` | one of the two | OpenAI key |
| `AI_PROVIDER` | no | Force `gemini` or `openai` |
| `MODEL_FAST` / `MODEL_BALANCED` / `MODEL_ADVANCED` | no | Override the model behind each tier |
| `PORT` | no | API port (default 3001) |
| `RATE_LIMIT_PER_MINUTE` | no | Chat requests allowed per IP per minute (default 30; 0 turns it off) |
| `OPENAI_BASE_URL`, `SYSTEM_PROMPT` | no | Advanced overrides |

## Docker
```bash
docker compose up --build                         # dev with hot reload → http://localhost:5173
docker compose --profile prod up --build prod     # production → http://localhost:3001
```

## Production build
```bash
npm run typecheck
npm run build      # outputs frontend/dist and backend/dist
npm start          # Express serves the API and the built app on PORT
```

## API
`POST /api/chat`
```json
{ "model": "balanced", "messages": [{ "role": "user", "content": "Hello", "attachments": [] }] }
```
The reply is a stream of Server-Sent Events: `{"type":"delta","text":"…"}`, then `{"type":"done"}` or `{"type":"error","code":"rate_limited","message":"…"}`. Problems found before streaming starts are returned as JSON with status 400, 429 or 503.

## Limitations
- Conversations are stored only in this browser. They do not sync across devices, and there are no accounts.
- Only the newest message's attachments are sent to the model; earlier ones are mentioned by filename. If browser storage fills up, saved image and PDF data is removed first so the chat text is kept.
- Voice input depends on browser support (Chrome, Edge, Safari). Firefox shows an "unavailable" message.
- The rate limiter is kept in memory for a single server. There is no authentication, so put the app behind your own access control before exposing it publicly.
