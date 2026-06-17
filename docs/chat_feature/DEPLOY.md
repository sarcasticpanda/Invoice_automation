# Deployment Guide

Architecture: **frontend on Vercel**, **backend on Render**. Vercel can't host
the FastAPI backend (it writes ChromaDB to disk, loads an embeddings model, and
runs background tasks — none of which work on Vercel serverless).

```
Browser ──> Vercel (React static site) ──/api/*──> Render (FastAPI) ──> Supabase (chat history)
                                                                   └──> Gemini API
```

---

## 0. Prerequisites
- Code pushed to GitHub: `sarcasticpanda/Invoice_automation` (the `feature/policy-chat`
  branch, or merge to `main` first).
- A Supabase project with the chat tables (already done: `nsbtsabteetswttmxlrd`).

## 1. Backend → Render
1. [render.com](https://render.com) → **New → Web Service** → connect the GitHub repo.
2. Render auto-detects [render.yaml](../../render.yaml). Confirm:
   - Build: `pip install -r requirements.txt && python populate_db_local.py`
   - Start: `uvicorn app_server:app --host 0.0.0.0 --port $PORT`
3. Add the secret env vars (dashboard → Environment): `GOOGLE_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `MY_EMAIL`, `GROQ_API_KEY`.
4. Deploy. Note the public URL, e.g. `https://invoiceflow-api.onrender.com`.
5. Test: open `https://<your-render-url>/api/stats` → should return JSON.

### ⚠️ RAM warning (important)
The free instance is **512 MB**. `torch` + `sentence-transformers` (local
embeddings) may **OOM** at startup. If the deploy crashes with out-of-memory:
- **Easiest:** upgrade the Render instance to **Starter** (~$7/mo, 512MB→2GB), or
- **Free-tier fix:** switch embeddings from local HuggingFace to the Google
  Embeddings API (`GoogleGenerativeAIEmbeddings`) so torch is no longer needed.
  This requires re-embedding the docs (the Chroma dimension changes). Ask Claude
  to do this swap if you hit the wall.

> Note: Render free instances also **sleep after 15 min idle** and the disk is
> ephemeral — docs uploaded at runtime are lost on restart, but `data/*.txt` is
> re-indexed on every deploy by the build command.

## 2. Frontend → Vercel
1. Edit [frontend/vercel.json](../../frontend/vercel.json): replace
   `REPLACE-WITH-RENDER-URL.onrender.com` with your real Render host. Commit + push.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. **Set Root Directory = `frontend`** (critical — the repo root is the backend).
4. Framework preset: Vite (auto). Deploy.
5. Open the Vercel URL → the app loads and `/api/*` calls proxy to Render.

## 3. Gmail (email pipeline only — not needed for chat)
The OAuth flow uses a local browser (`run_local_server`) and can't run headless
on Render. The **Policy Chat feature does not need Gmail** and works without it.
To run the email pipeline in the cloud you'd need a headless OAuth flow + a
persistent `token.json` — out of scope for this deploy.

## Quick checklist
- [ ] Repo pushed to GitHub
- [ ] Render backend deployed, `/api/stats` returns JSON
- [ ] Render env vars set
- [ ] `vercel.json` updated with Render URL
- [ ] Vercel root dir = `frontend`, deployed
- [ ] Rotate the keys/passwords that were shared in chat
