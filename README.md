# ExamMitra AI

ExamMitra AI turns a text-based lecture PDF into cited revision notes, five practice questions and ten flashcards. Students can ask questions grounded in their material, review mistakes, track progress and export notes or quizzes.

## What is included

- React 19 and Vite client with responsive light/dark interfaces
- Express 5 API and MongoDB/Mongoose persistence
- Cookie-based JWT accounts with ownership checks on every private resource
- Private local or S3-compatible PDF storage
- Page-aware PDF extraction, asynchronous jobs and restart recovery
- Gemini structured output with schema and citation validation
- Saved quiz attempts, flashcard review state and document conversations
- PDF and Markdown exports, including a separate quiz answer key
- A clearly labelled sample study pack that works without an account or API key

## Local setup

Requirements: Node.js 20+, npm and either MongoDB 7+ or the included development database launcher.

```bash
cp .env.example .env
npm install
npm run sample
```

In separate terminals, start the local database and application:

```bash
npm run dev:database
npm run dev
```

Open `http://127.0.0.1:5173`. The API runs on `http://127.0.0.1:5001`.

The local development database persists in `.data/mongo`. To use an existing MongoDB instance, skip `npm run dev:database` and change `MONGODB_URI`.

## Environment variables

Required for the complete application:

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: random secret of at least 32 characters in production
- `GEMINI_API_KEY`: Gemini API key used only by the server

Common settings:

- `CLIENT_URL`: allowed browser origin; comma-separated origins are supported
- `GEMINI_MODEL`: defaults to `gemini-3.6-flash`
- `STORAGE_DRIVER`: `local` for development or `s3` for private object storage
- `DATA_DIR`: optional private local storage path
- `S3_BUCKET`, `S3_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: private S3-compatible storage settings
- `PDF_FONT_PATH`: optional Unicode TrueType font for exports; a licensed bundled font is used by default

When Gemini is not configured, account features still run and the interface clearly explains that live generation is unavailable. The curated sample remains available.

## Validation

```bash
npm test
npm run build
npm audit
```

The tests cover two-user isolation, authentication, PDF validation, page preservation, structured AI validation, saved quizzes and flashcards, grounded Q&A, exports, deletion, retries and interrupted-job recovery.

## Deployment

Build the client with `npm run build` and start the combined server with `npm start`. The server serves `client/dist` and listens on the platform-provided `PORT` in production.

For production:

1. Configure MongoDB Atlas or another reachable MongoDB deployment.
2. Configure a private S3-compatible bucket. Uploaded PDFs must never be public.
3. Set all required environment variables and `NODE_ENV=production`.
4. Set `CLIENT_URL` to the exact HTTPS frontend origin.
5. Run `npm run build` during deployment and `npm start` as the start command.
6. Use HTTPS, database backups and provider monitoring.

`render.yaml` provides a deployment blueprint without publishing anything. It intentionally leaves credentials unset.

### Vercel

The repository also supports a complete Vercel deployment. Vercel serves the
Vite build from its CDN and runs the Express API as one Node.js Function. Set
the following project environment variables before deploying:

- `MONGODB_URI`
- `JWT_SECRET` (at least 32 characters)
- `CLIENT_URL` (the exact Vercel production URL)
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `STORAGE_DRIVER=none` for a storage-free deployment. Uploaded PDFs are held
  temporarily in MongoDB and removed after their page text is extracted, so
  original source-PDF viewing is unavailable for those packs. Notes and page
  citations remain available.

PDF generation is started by the study-pack screen and may remain open for
several minutes while the Vercel Function completes. The function is configured
for a 300-second maximum duration. Uploaded files are never written to Vercel's
temporary filesystem. Private Vercel Blob and S3-compatible storage remain
supported when retaining original PDFs is required.

## Current limitations

ExamMitra AI accepts one text-based PDF per pack. The file must be less than 3 MB and contain no more than 100 pages. Scanned PDFs, password-protected PDFs, OCR and other file formats are outside this version.
