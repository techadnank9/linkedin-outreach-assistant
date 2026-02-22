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
