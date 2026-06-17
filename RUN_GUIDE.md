# How to Run InvoiceFlow

You need **two terminals** running at the same time: one for the backend (API),
one for the frontend (the website). Keep both open — if you close the backend,
the dashboard goes blank ("offline").

## Terminal 1 — Backend (API on port 5000)
```powershell
cd "c:\Users\Lunar Panda\3-Main\invoice_automation"
.\venv\Scripts\python.exe app_server.py
```
Leave this running. It serves all `/api/...` endpoints.

## Terminal 2 — Frontend (website on port 3000)
```powershell
cd "c:\Users\Lunar Panda\3-Main\invoice_automation\frontend"
npm run dev
```
Leave this running. Then open **http://localhost:3000** in your browser.

---

## One-time setup (already done, for reference)
- Python deps:  `.\venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-chat.txt`
- Frontend deps: `cd frontend; npm install`
- Index documents into the vector DB: `.\venv\Scripts\python.exe populate_db_local.py`
- `.env` filled with `GOOGLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `MY_EMAIL`.

## Gmail sign-in (needed for the email pipeline)
The email features need a valid Gmail login. If the dashboard says Gmail isn't
connected, run this once and approve in the browser:
```powershell
.\venv\Scripts\python.exe main.py --no-auto-send
```
- `--no-auto-send` → AI replies are saved as **Gmail drafts** for you to review.
- `--auto-send`    → AI replies are **sent automatically**.
> Note: the Google OAuth app is in "Testing" mode, so the login expires about
> every 7 days. To stop that, publish the app (or add yourself as a Test user)
> in Google Cloud Console → OAuth consent screen.

## Running the email pipeline
- **From the dashboard:** click **Run Once**, or flip **Auto-Polling** on (runs every 60s).
- **From a terminal:** `.\venv\Scripts\python.exe main.py --no-auto-send`

The pipeline looks at emails from the **last 8 hours** that don't already have a reply.
