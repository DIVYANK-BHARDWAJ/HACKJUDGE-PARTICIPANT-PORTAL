# Hackathon Submission & Leaderboard Platform — Design Document

## 1. Project Goal
Build "HACK ARENA", a visually stunning, premium participant portal for hackathon project submissions, live leaderboard standing updates, and individual result displays. The application is a True Single-Page Application (SPA) utilizing dynamic client-side tab state with a dark, premium theme ("Void Crimson" variants / Neon accents).

---

## 2. Design System & Aesthetics

### Color Tokens
```css
:root {
  --bg: #09090f;
  --surface: #0f0f1a;
  --surface2: #161625;
  --border: #1e1e35;
  --border2: #2a2a45;
  --accent: #7c6af7;
  --accent2: #5e4df0;
  --lime: #a3ff5e;
  --cyan: #00e5c9;
  --pink: #ff4d8f;
  --amber: #ffb830;
  --text: #f0eeff;
  --text2: #9490b8;
  --text3: #5c5880;
  
  --gold: #ffd700;
  --silver: #c0c0d8;
  --bronze: #cd7f32;
}
```

### Typography
* **Syne** (Google Fonts): Utilized for headings, navigation links, and primary action buttons.
* **DM Mono** (Google Fonts): Utilized for scores, metrics, badges, code representation, dates, and labels.

### Visual Effects
* **Noise Overlay:** 3% opacity subtle noise pattern fixed over the entire viewport.
* **Drifting Radial Glows:** Two large blurred ambient background circles:
  * Top-Left: Violet plasma glow (`--accent`)
  * Bottom-Right: Cyan glow (`--cyan`)
  * Drifts slowly via keyframes over 8 seconds (`alternate` infinite).

---

## 3. Architecture & Data Flow

```
[SPA Client Tab State]
   │
   ├─► Submit Tab  ───────► [POST /api/submit] ──► [Judging Engine]
   │                              │                      │ (score response)
   │                              ▼                      ▼
   │                         [Write Record] ◄────────────┘
   │                              │
   │                              ▼
   ├─◄ Leaderboard Tab ◄──── [Supabase] (Dynamic Read / API Proxy check)
   │
   └─◄ Admin Tab ─────────► [POST /api/admin/*] (Verify password & clear/delete)
```

### Next.js API Routes (Proxy)
1. `/api/submit`
   * Receives `github_url`.
   * Contacts the Judging Engine endpoint (`VITE_JUDGING_ENGINE_URL`).
   * Parses the score response.
   * Inserts the entry into Supabase `submissions` using server-side credentials.
2. `/api/admin/verify`
   * Securely compares admin password with `VITE_ADMIN_PASSWORD` (not exposed to browser bundle).
3. `/api/admin/action`
   * Performs database deletes/clearance upon authentication check.

---

## 4. Components & Pages

### Navbar
* Left: logo mark `⌬ HACK ARENA` (with "ARENA" in `--accent` color).
* Right: live submissions count and status badge featuring a pulsing lime green dot.
* Navigation buttons with active state underline markers.

### Submit Page
* **Hero Section:** High-impact text layout featuring custom outline fonts and linear gradients.
* **Submit Card:** Styled input and elevated primary CTA button with hover animations.
* **Evaluation Progress Card:** Multi-segment sequential progress bar simulating compile, test, and score phases during judging.
* **Stats Row:** Summary grid showing counts, average scores, and remaining times.

### Leaderboard Page
* Ranking cards with custom border glows for Top 3 (Gold, Silver, Bronze).
* Expandable row detail for individual metrics check.
* Staggered entrance transition effects.

### My Result Page
* Showcases personal score, percentile comparison, code share trigger, and weighted parameter scores.

### Admin Page
* Lock screen gate verifying the password, leading to standard deletion tables and leaderboard freeze toggle.
