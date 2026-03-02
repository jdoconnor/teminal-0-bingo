<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/79237661-fc32-4f70-a574-a6a579c16542

## Run Locally

**Prerequisites:**  Node.js 20+, [pnpm](https://pnpm.io/installation)

1. Install dependencies (creates `pnpm-lock.yaml`):
   `pnpm install`
2. (Optional) Add `.env` entries if you introduce new APIs—none are required today.
3. Start the Cloudflare-aware dev server with hot reload + Workers runtime:
   `pnpm dev`
4. Open the printed local URL (default `http://localhost:5173`) and interact with the app. The Worker + Durable Object logic runs locally through the Cloudflare Vite plugin, so WebSockets behave the same as production.

## Deploy to Cloudflare Workers

1. Authenticate once: `pnpm dlx wrangler login`
2. Build the client + Worker bundle: `pnpm build`
3. Deploy globally: `pnpm deploy`

The build output (client + generated `wrangler.json`) lives in `dist/`. The entry Worker resides in [`worker/index.ts`](worker/index.ts) and serves both the SPA assets via Workers Static Assets and multiplayer state via a Durable Object (`GAME_ROOM`).
