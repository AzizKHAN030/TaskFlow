# TaskFlow

Production-ready task management web app built with Next.js App Router, Auth.js (Google login), Neon Postgres, Prisma, shadcn/ui, @dnd-kit drag-and-drop, and DOCX export.

## 1. Architecture overview

- `app/`:
  - App Router pages and route handlers
  - Protected app area in `app/(app)`
  - Login page in `app/(auth)/login`
  - Auth route handler in `app/api/auth/[...nextauth]/route.ts`
  - DOCX export route in `app/api/projects/[projectId]/export/route.ts`
- `auth.ts`:
  - Auth.js configuration with Google provider + Prisma adapter
- `middleware.ts`:
  - Route protection for all app pages
- `prisma/schema.prisma`:
  - Auth.js models + `Project` + `Task`
- `lib/actions/*`:
  - Server actions for CRUD and drag/drop updates
- `components/app/*`:
  - Projects CRUD UI, week/month calendar board, export panel
- `lib/docs/task-report.ts`:
  - DOCX generation logic and formatting

## 2. Package list

Core runtime dependencies:

- `next`, `react`, `react-dom`, `typescript`
- `tailwindcss`, `postcss`, `autoprefixer`
- `next-auth`, `@auth/prisma-adapter`
- `@prisma/client`, `prisma`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `docx`
- `zod`
- `sonner`
- `date-fns`
- shadcn/ui dependencies:
  - `class-variance-authority`, `clsx`, `tailwind-merge`
  - `@radix-ui/react-alert-dialog`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-slot`

## 3. Environment variables template

Use `.env.local`:

```env
# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_long_random_secret
AUTH_SECRET=replace_with_long_random_secret

# Google OAuth
AUTH_GOOGLE_ID=replace_with_google_client_id
AUTH_GOOGLE_SECRET=replace_with_google_client_secret

# Neon + Prisma
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/taskflow?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/taskflow?sslmode=require
```

## 4. Step-by-step setup instructions

### 4.1 Create project and install packages

```bash
npx create-next-app@latest taskflow --ts --tailwind --eslint --app --src-dir=false --use-npm
cd taskflow
npm install
```

Install app dependencies:

```bash
npm install next-auth @auth/prisma-adapter @prisma/client prisma zod date-fns docx @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sonner lucide-react class-variance-authority clsx tailwind-merge @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-slot
npm install -D tsx
```

Install shadcn/ui CLI and initialize:

```bash
npx shadcn@latest init
npx shadcn@latest add button card input textarea label dialog alert-dialog dropdown-menu
```

### 4.2 Google OAuth setup (exact steps)

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project (or select existing).
3. Open `APIs & Services` -> `OAuth consent screen`.
4. Choose `External` (or `Internal` if Workspace-only), fill required fields, add your email.
5. Add scopes: `email`, `profile`, `openid`.
6. Add test users while app is in testing mode.
7. Go to `Credentials` -> `Create Credentials` -> `OAuth client ID`.
8. Select `Web application`.
9. Add Authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://YOUR_DOMAIN/api/auth/callback/google`
10. Copy Client ID and Client Secret into:
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`

### 4.3 Neon Postgres setup

1. Go to Neon: https://console.neon.tech/
2. Create a new project.
3. Open project dashboard and copy connection string.
4. Paste into `.env.local` as `DATABASE_URL`.
5. Use same (or non-pooled direct URL if provided) for `DIRECT_URL`.

### 4.4 Prisma initialization and migration

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Optional demo seed:

```bash
npm run db:seed
```

### 4.5 Run locally

```bash
npm run dev
```

Open http://localhost:3000

## 5. Full Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  projects      Project[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([sessionToken])
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  tasks Task[]

  @@index([ownerId])
  @@index([createdAt])
}

model Task {
  id          String   @id @default(cuid())
  projectId   String
  title       String
  description String?
  taskDate    DateTime @db.Date
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, taskDate])
  @@index([projectId, sortOrder])
}
```

## 6. Full source code by file

All source files are generated in this repository. Key files:

- `package.json`
- `.env.example`
- `auth.ts`
- `middleware.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/projects/page.tsx`
- `app/(app)/projects/[projectId]/page.tsx`
- `app/(app)/projects/[projectId]/week/page.tsx`
- `app/(app)/projects/[projectId]/month/page.tsx`
- `app/(app)/projects/[projectId]/export/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/projects/[projectId]/export/route.ts`
- `components/app/*`
- `components/ui/*`
- `lib/actions/*`
- `lib/docs/task-report.ts`
- `lib/data.ts`
- `lib/prisma.ts`
- `lib/date.ts`
- `lib/validators/*`
- `types/next-auth.d.ts`

## 7. DOCX export logic

- Endpoint: `GET /api/projects/:projectId/export`
- Modes:
  - `?type=weekly`
  - `?type=monthly`
  - `?type=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`
- Rules implemented:
  - Includes only days that have tasks
  - Dynamic title: `Tasks done DD.MM.YYYY - DD.MM.YYYY`
  - Day headings generated from actual task dates
  - Preserves line breaks in task descriptions
  - Typography:
    - Export title: `20pt` (`size: 40`)
    - Day title: `14pt` (`size: 28`)
    - Task title: `12pt bold` (`size: 24`)
    - Description: `10.5pt italic` (`size: 21`)

## 8. Commands to run locally

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Optional:

```bash
npm run db:seed
npm run lint
npm run build
```

## 9. Deployment steps for Vercel

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add environment variables in Vercel Project Settings:
   - `NEXTAUTH_URL` = your production URL
   - `NEXTAUTH_SECRET`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `DATABASE_URL`
   - `DIRECT_URL`
4. In Google OAuth credentials, add production redirect URI:
   - `https://YOUR_DOMAIN/api/auth/callback/google`
5. Deploy.
6. Run Prisma migrations in production:

```bash
npx prisma migrate deploy
```

## 10. Notes on future improvements

- Add optimistic ordering within a day with persisted drag-sort indexes.
- Add filtering by project tags/labels.
- Add user timezone preference for date consistency.
- Add team collaboration (shared projects + role-based access).
- Add PDF export in addition to DOCX.

## Troubleshooting

### Google OAuth errors

- `redirect_uri_mismatch`:
  - Ensure URI matches exactly:
    - `http://localhost:3000/api/auth/callback/google`
    - `https://YOUR_DOMAIN/api/auth/callback/google`
- `Access blocked` during test mode:
  - Add your Google email to OAuth consent screen test users.

### Prisma migration errors

- `P1001` / cannot reach database:
  - Verify Neon DB is active and `DATABASE_URL` is correct.
- `relation already exists`:
  - If schema drift occurred, run `npx prisma migrate reset` in local development only.

### DOCX export errors

- `No tasks found in selected range`:
  - Ensure at least one task exists within selected dates.
- Corrupt download/open issues:
  - Confirm `docx` is installed and route returns content-type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
