# ⚡ HackJudge Participant Portal

<p align="center">
  <strong>The participant-facing gateway to the HackJudge evaluation arena.</strong>
  <br />
  Submit your project, track AI-assisted evaluation, and view your result in a focused, competition-ready interface.
</p>

<p align="center">
  <a href="https://github.com/DIVYANK-BHARDWAJ/HACKJUDGE-PARTICIPANT-PORTAL"><img src="https://img.shields.io/badge/Project-HackJudge-7C6AF7" alt="HackJudge" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <a href="./SECURITY.md"><img src="https://img.shields.io/badge/Security-Policy-16A34A" alt="Security Policy" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="Apache 2.0" /></a>
</p>

---

## 🧠 What Is HackJudge Participant Portal?

HackJudge Participant Portal is a Next.js web application designed to manage the participant journey in an AI-assisted hackathon evaluation system.

It connects participants with the HackJudge judging engine, validates submission requirements, tracks asynchronous analysis, persists the best repository score, and presents results through a dedicated interface. It also includes organizer-oriented controls for event configuration and submission administration.

> **Design principle:** Make submission simple for participants while keeping the evaluation workflow observable, resilient, and operationally manageable.

## ✨ Core Capabilities

- **Repository submission:** Accept a public GitHub repository URL and deployment link.
- **Deadline enforcement:** Prevent submissions after the configured event deadline.
- **Asynchronous evaluation:** Start analysis through the judging engine and poll for completion.
- **Evaluation progress UX:** Show staged progress while the remote engine processes a repository.
- **Best-score persistence:** Preserve the highest score associated with a repository.
- **Participant result experience:** Display evaluation outcomes and retain local result state.
- **Leaderboard integration:** Read submission data from Supabase and present ranking information.
- **Event configuration:** Read and update deadline and freeze state through configuration APIs.
- **Organizer controls:** Verify admin access and support submission deletion or clearing.
- **Fallback behavior:** Use configured defaults and local browser state where appropriate.

## 🏗️ System Architecture

```text
┌──────────────────────────────┐
│ Participant Web Interface    │
│ Submit · Result · Leaderboard│
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Next.js API Routes           │
│ Submission · Config · Admin  │
└───────┬──────────────┬───────┘
        │              │
        ▼              ▼
┌──────────────┐ ┌──────────────────┐
│ Supabase     │ │ HackJudge Engine │
│ submissions  │ │ analyze / result │
│ config       │ └──────────────────┘
└──────────────┘
```

## 🔄 Submission Lifecycle

1. Participant enters their name, repository URL, and deployment URL.
2. Client-side validation checks the required fields and repository format.
3. The portal checks the event deadline and local repository submission count.
4. `/api/submit` forwards the repository to the judging engine.
5. If analysis is asynchronous, the client polls the result endpoint.
6. The completed score is compared with any existing repository score.
7. The higher score is retained in Supabase.
8. The participant receives the result and the interface updates its local state.

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + custom CSS variables |
| Database / Backend service | Supabase |
| Database driver | `pg` |
| Icons | Lucide React |
| Deployment configuration | Koyeb |
| Evaluation service | External HackJudge judging engine |

## 📁 Project Structure

```text
app/
├── api/
│   ├── admin/action/       # Administrative operations
│   ├── admin/verify/       # Admin credential verification
│   ├── config/             # Deadline and freeze configuration
│   └── submit/             # Submission and result polling
├── globals.css             # Global design system
├── layout.tsx              # Application layout
└── page.tsx                # Main portal entry point

components/
├── AdminTab.tsx
├── LeaderboardTab.tsx
├── ResultTab.tsx
└── SubmitTab.tsx

lib/
└── supabase.ts             # Supabase client initialization
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or later recommended.
- npm.
- A Supabase project, or local placeholder configuration for UI development.
- A reachable HackJudge judging engine instance for real evaluations.

### Installation

```bash
git clone https://github.com/DIVYANK-BHARDWAJ/HACKJUDGE-PARTICIPANT-PORTAL.git
cd HACKJUDGE-PARTICIPANT-PORTAL
npm install
```

### Environment Variables

Create `.env.local` and configure the values required by your environment:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_JUDGING_ENGINE_URL=https://your-judging-engine.example.com
VITE_HACKATHON_END_TIME=2026-12-01T18:00:00Z
VITE_ADMIN_PASSWORD=use-a-strong-secret
```

Never commit `.env.local`, credentials, production database URLs, or administrator secrets. Review `SECURITY.md` before deployment.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run lint
npm run build
npm run start
```

## 🔌 API Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/submit` | `POST` | Start repository evaluation and persist completed results |
| `/api/submit` | `GET` | Poll an evaluation and persist the completed result |
| `/api/config` | `GET` | Read deadline and freeze state |
| `/api/config` | `POST` | Update event configuration with admin credentials |
| `/api/admin/verify` | `POST` | Verify admin credentials |
| `/api/admin/action` | `POST` | Delete a submission or clear evaluation data |

## 🔐 Security and Integrity Notes

This portal handles external URLs, evaluation requests, scores, configuration, and privileged organizer operations. Before public production use:

- Replace any hard-coded or fallback administrator credential.
- Use a secure authentication and authorization system instead of a shared password where possible.
- Store secrets exclusively in encrypted deployment environment settings.
- Validate GitHub and deployment URLs at the server boundary.
- Add rate limiting and abuse protection to public endpoints.
- Apply Supabase Row Level Security policies appropriate to the deployment.
- Avoid exposing internal errors, credentials, or participant information.
- Treat localStorage-based submission limits as UX controls, not authoritative security enforcement.
- Maintain a human review path for disputed evaluation or integrity outcomes.

Report vulnerabilities privately according to [`SECURITY.md`](./SECURITY.md).

## 🤝 Contributing

Contributions are welcome when they improve reliability, accessibility, security, evaluation transparency, or participant experience.

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening an issue or pull request. All participants in the project community are expected to follow [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## 🗺️ Roadmap Ideas

- Server-side submission quotas and rate limiting.
- Strong organizer authentication with role-based access control.
- Better validation and normalization of external URLs.
- Automated tests for score persistence and duplicate submissions.
- Audit logs for administrative operations.
- Improved accessibility and keyboard navigation coverage.
- Participant-facing evaluation explanations and status history.
- Observability for engine latency, failures, and polling timeouts.

## 📜 License

HackJudge Participant Portal is released under the **Apache License 2.0**. See [`LICENSE`](./LICENSE) for details.

## 👤 Maintainer

**Divyank Bhardwaj**

- GitHub: [@DIVYANK-BHARDWAJ](https://github.com/DIVYANK-BHARDWAJ)
- Repository: [HackJudge Participant Portal](https://github.com/DIVYANK-BHARDWAJ/HACKJUDGE-PARTICIPANT-PORTAL)

---

<p align="center"><strong>⚡ BUILD. SUBMIT. GET JUDGED.</strong></p>
