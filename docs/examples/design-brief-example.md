# study-dashboard — Claude Design brief

Redesign the frontend of **study-dashboard**, a personal study-management app. Make it look **fascinatingly nice** — distinctive, crafted, memorable. Not another generic SaaS dashboard. Think Linear × Raycast × Arc × a hand-bound Moleskine planner.

## Context

- **Single user.** This is Ammar, a 4th-semester CS undergrad. No signup flow, no "teams", no marketing surfaces.
- **Used multiple times a day.** Mornings to plan, between classes to check, evenings to mark topics studied. It's a tool — scanability beats delight, but delight isn't forbidden.
- **Mixed German/English content.** Words like *Vorlesung*, *Übung*, *Übungsblatt*, *Klausur*, *Praktikum* appear literally. Design must handle umlauts, long compound words, and tight code-pills gracefully.

## Input context

Before designing, please ingest:

1. The codebase at `github.com/AmmarSaleh50/study-dashboard` — extract my current Tailwind tokens, component conventions, and color palette as the starting design system.

Keep the course codes **AML, ASB, RA, RN** and their existing accent colors as first-class identifiers.

## What the user does here, in priority order

1. **"Am I falling behind on anything?"** — Study topics covered in past lectures that he hasn't studied yet. Urgency escalates when the next lecture on that topic is imminent (≤72h).
2. **"What's due and when?"** — Übungsblätter, projects, Praktikum blocks, each with a due date and status (open / in_progress / submitted / graded / skipped).
3. **"What am I doing today / this week?"** — Lectures, Übungen, tasks, time-blocked.

Everything secondary: browse a course in depth, open PDFs of slides/Übungsblätter, prep for Klausuren.

## Screens to design (in priority order)

### 1. Dashboard — the most important screen, nail this first

Components on the page, top to bottom:

- **Greeting strip** — "Good morning, Ammar" + a *Next up: RA in 2d* hint. Should feel personal, not corporate.
- **Fall-behind banner** — only renders when something's actually behind. At severity=critical it should be unmissable; at severity=warn, present but not alarming; at ok, gone entirely. Don't fill the banner with the entire topic list — summarize (*"3 ASB topics unstudied, next lecture in 2 days"*) with expand/drill-in.
- **4 metric tiles** in a row — *Next deadline*, *Tasks this week*, *Avg. progress*, *Falling-behind courses*. Each has an icon, a label, a big value, a one-line hint, and a **tone**: default / ok / warn / critical. Tone should shift the tile's border/background subtly, not wrap it in a bright alert box.
- **Weekly schedule grid** — Mon–Fri columns, each column is the current day's timetable, lectures/Übungen rendered as time-blocked cards with course color stripe + time + name + room. Today's column is highlighted. Empty days are empty, not padded with filler.
- **Course cards** — 4 in a row on desktop, one per course. Each card: course code as a colored pill, full name beneath, next-lecture time (relative: *in 2d*), behind count if any, progress bar.
- **Upcoming deadlines** — list of the next ~5 deliverables, each row: course pill, name, relative due time, optional file/link affordance.
- **Task inbox** — personal todos list, each row: course pill (if linked), title, due-in-Nd badge, checkbox.

### 2. Course detail

Tabbed view. Default tab is **Topics** — a chaptered list of study topics the user needs to learn. Each topic has:

- Chapter number (§0.1.1)
- Name + description preview
- A **status chip**: `not_started` / `in_progress` / `studied` / `mastered` / `struggling`
- Optional confidence (0–100, represented as a small bar)
- Covered-on date (when the lecture covered it)

Status should be the primary visual signal — a neutral topic shouldn't scream for attention; a *struggling* topic should. Ammar bulk-marks topics studied, so the row needs a comfortable hit target.

Also design the tab bar (Topics / Lectures / Deliverables / Files / Klausur) and the course header (code pill, full name, ECTS, language, next lecture, overall progress).

### 3. Component kit

Deliver these as reusable pieces:

- **Course pill** — colored background or bordered chip with the 2–3-letter code.
- **Status chip** — one per status value above, each with its own tone.
- **Fall-behind banner** — three variants (ok/warn/critical). Only warn + critical actually render.
- **Metric tile** — default/ok/warn/critical tones.
- **Weekly-grid lecture card**.
- **Deadline row** and **task row**.

## Aesthetic direction

Push this hard. "Fascinatingly nice" means:

- **Typography with opinion.** Pair a sharp sans (Inter / Geist / Söhne) with something unexpected — e.g. a serif for course full-names or chapter numbers (Instrument Serif, GT Super, Fraunces). Course codes rendered in tabular/mono numerals.
- **A signature visual element.** Could be a subtle grid, a faint gradient tied to day-of-week, an accent underline under the day header, a hand-drawn dot for the "today" marker. Pick one and repeat it across screens so the app feels *authored*.
- **Depth through restraint.** Dark background, 2–3 elevation levels via tiny shifts in surface tone (not big shadows). Borders at 1px or less. Inner glow on focused elements rather than hard outlines.
- **Course color used structurally** — a 3–4px left stripe on cards/rows, not a full colored tile. Across 4 courses in the grid, the stripes should feel like a chord, not noise.
- **Microtypography.** Tight letter-spacing on headers, relaxed on body. Numeric values in tabular figures. Relative times ("in 2d", "next Tue 14:15") styled distinctly from absolute dates.
- **Motion is a hint, not a show.** 150ms ease-out on state changes; no page-load reveals.
- **Light mode exists but feels like a second citizen.** Dark is default and should look richer than light.

## Constraints

- **Don't** invent new routes or entities. The information architecture is fixed.
- **Don't** add login/signup, billing, team invitations, onboarding tours.
- **Do** make the mobile layout first-class. Weekly grid becomes a horizontal day-selector with a single column of lectures below. Course cards stack. Banner compresses.
- **Do** keep the data shape intact — these entities must be surfaced: Course, Schedule slot, Lecture, Study topic, Deliverable, Task, Fall-behind item, Klausur.

## Deliverables

1. Full **Dashboard** screen, dark + light.
2. Full **Course detail** screen (Topics tab), dark + light.
3. **Component kit** with each component in all its variants.
4. A short style-token summary: palette, type scale, spacing scale, radius scale, elevation levels.
5. A **handoff bundle** for Claude Code with a single instruction so implementation can start from this design directly.
