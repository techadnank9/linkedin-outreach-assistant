# LinkedIn Outreach Assistant

AI-powered outreach app for job seekers:
- one-time LinkedIn onboarding
- hiring manager/founder LinkedIn extraction
- 3 personalized email variants from Gemini

No mock extraction, generation, or persistence is used. The app requires live Apify, Gemini, and Supabase credentials.

## Documents
- [Product Requirements Document](./PRD.md)
- [Technical Stack and Architecture](./TECH_STACK.md)

## Design Direction
UX direction is inspired by this Dribbble reference:
- [Create email inbox composition](https://dribbble.com/shots/26083118-Create-email-inbox-composition)

## Setup
1. Copy env template:
```bash
cp .env.example .env
```
2. Fill all required keys in `.env`.
3. Create Supabase tables:
- run SQL in `supabase/schema.sql` in your Supabase SQL editor.

## Run
```bash
npm start
```

Server starts on `http://localhost:3000`.

## Test
```bash
npm test
```

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)
- `APIFY_API_TOKEN`
- `APIFY_LINKEDIN_ACTOR_ID`

## Manual Scrape Fallback (for Apify free-plan limits)
If Apify API runs are blocked on your plan, save raw LinkedIn JSON in Supabase and the app will auto-fallback during `/api/extract`.

Save manual profile JSON:
```bash
curl -X POST http://127.0.0.1:3000/api/manual-profile/save \
  -H "Content-Type: application/json" \
  -d '{
    "linkedinUrl": "https://www.linkedin.com/in/techadnank9",
    "payload": { "fullName": "Mohammed Adnan", "headline": "Full Stack Developer (MERN)" }
  }'
```

Then call extract with the same `linkedinUrl`; if Apify fails, server will use the saved payload.

You can also save JSON files directly with scripts:
```bash
npm run save:manual
npm run save:hiring-manager
```

## Deployment (Render + Vercel)

### 1) Deploy API on Render
- This repo includes `/Users/adnan/Documents/linkedin-outreach-assistant/render.yaml`.
- In Render:
  1. Create new Blueprint from your GitHub repo.
  2. Confirm service `linkedin-outreach-api`.
  3. Set required secret env vars in Render:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY`
     - `APIFY_API_TOKEN`
     - `APIFY_LINKEDIN_ACTOR_ID`
  4. Deploy and copy your Render domain, e.g. `linkedin-outreach-api.onrender.com`.

### 2) Configure Vercel frontend proxy
- This repo includes `/Users/adnan/Documents/linkedin-outreach-assistant/vercel.json`.
- Replace `RENDER_API_DOMAIN` in `vercel.json` with your actual Render domain.
- Example destination:
  - `https://linkedin-outreach-api.onrender.com/api/$1`

### 3) Deploy frontend on Vercel
1. Import the same GitHub repo into Vercel.
2. Framework preset: `Other`.
3. No build command required.
4. Deploy.

After deploy:
- Frontend served by Vercel.
- `/api/*` requests are proxied to Render backend.
