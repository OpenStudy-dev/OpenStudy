# Claude Design brief — a template for a "fascinatingly nice" redesign

[Claude Design](https://claude.ai/design) is Anthropic's visual prototyping tool (launched April 2026). You describe what you want, it generates an HTML/CSS/JS prototype, and you iterate in conversation. When the design is ready, you can export a **handoff bundle** that Claude Code reads to implement the design in your actual codebase.

This is a guide to writing a brief that gets you something distinctive — not another Notion-lite dashboard. The original brief that produced this repo's current design is included at the bottom as a concrete example.

## What goes in a good brief

A bad brief: *"redesign my dashboard, make it look nice"*.

A good brief tells Claude Design:
1. **What the app is** — audience, use case, frequency of use.
2. **Who uses it** — one user? teams? occasional visitors? full-time power users?
3. **What the important screens are**, in priority order, with the components on each.
4. **What the data looks like** — the entities the UI has to surface.
5. **Aesthetic direction** with references — "Linear × Raycast × Arc" beats "clean and modern."
6. **What to keep** — existing brand, codebase tokens, course codes, anything that can't change.
7. **What NOT to do** — hard constraints so it doesn't waste time on the wrong thing.
8. **Deliverables** — which screens, dark/light, handoff bundle for Claude Code.

Length: 300–700 words is a sweet spot. Too short and you'll get generic; too long and Claude gets lost in details.

## Give Claude Design real context

Before writing the brief, point Claude Design at:

- **Your repo** — it reads the codebase, extracts your Tailwind tokens, component conventions, existing color palette, so the design fits your stack.
- **Your live URL** via the built-in web capture — so it sees the current baseline to riff off (or explicitly depart from).
- **Screenshots / reference designs** you like — drag images into the chat.
- **DOCX / PPTX / XLSX** design specs if you have them.

Claude Design then uses your codebase's design system automatically across everything it generates. That's the part that makes it feel "designed for your app" vs. generic.

## Template

Adapt this to your project. Replace `{{PLACEHOLDERS}}`. Delete sections that don't apply.

```markdown
# {{APP_NAME}} — Claude Design brief

Redesign the frontend of **{{APP_NAME}}**, a {{one-sentence description}}. Make it look **fascinatingly nice** — distinctive, crafted, memorable. Not another generic SaaS dashboard. Think {{3 REFERENCES, e.g. "Linear × Raycast × Arc × a hand-bound Moleskine planner"}}.

## Context

- **{{Single user / small team / power tool / etc.}}** — {{who uses it, in one sentence}}. {{Any constraints: no signup, no marketing surfaces, etc.}}
- **Used {{frequency — multiple times a day / weekly / occasionally}}.** {{What the main job-to-be-done is.}}
- **{{Any content quirks — multilingual? technical jargon? long words?}}** Design must handle {{specific edge case}}.

## Input context

Please ingest:

1. The codebase at `{{github URL}}` — extract my current tokens, component conventions, and color palette as the starting design system.
2. The live site at `{{URL}}` via web capture, so you see the current baseline.

Keep the {{brand / identifier / color system}} intact.

## What the user does here, in priority order

1. **"{{Question 1 — e.g. 'What's due and when?'}}"** — {{how this is currently served}}.
2. **"{{Question 2}}"** — {{…}}.
3. **"{{Question 3}}"** — {{…}}.

Everything secondary: {{brief list}}.

## Screens to design (in priority order)

### 1. {{PRIMARY_SCREEN}} — the most important screen, nail this first

Components on the page, top to bottom:

- **{{Component 1}}** — {{what it shows, what it does}}.
- **{{Component 2}}** — {{…}}.
- ...

### 2. {{SECONDARY_SCREEN}}

{{…}}

### 3. Component kit

Deliver these as reusable pieces:

- **{{Piece 1}}** — {{spec}}.
- **{{Piece 2}}** — {{spec}}.
- ...

## Aesthetic direction

Push this hard. "Fascinatingly nice" means:

- **Typography with opinion.** Pair a {{sharp sans}} with {{something unexpected — e.g. a serif for headings}}. {{Any specific font preferences.}}
- **A signature visual element.** {{Describe one repeated motif that makes the app feel authored — a hand-drawn dot, a subtle grid, an unusual underline — so it's the same across every screen.}}
- **Depth through restraint.** {{Describe how elevation works — tiny shifts in surface tone, thin borders, inner glows rather than hard outlines.}}
- **{{Brand color used structurally}}** — not filled, used as {{stripes / borders / accents}}.
- **Microtypography.** {{letter-spacing rules, tabular figures, relative-time styling, etc.}}
- **Motion is a hint, not a show.** 150ms ease-out on state changes; no page-load reveals.
- **{{Dark / light mode preferences}}.**

## Constraints

- **Don't** {{invent new routes / add signup flow / change the information architecture / use certain colors / etc.}}.
- **Do** make the {{mobile / desktop / specific breakpoint}} layout first-class — {{describe how it collapses}}.
- **Do** keep the data shape intact — these entities must be surfaced: {{list your entities}}.

## Deliverables

1. Full **{{PRIMARY_SCREEN}}** screen, dark + light.
2. Full **{{SECONDARY_SCREEN}}** screen, dark + light.
3. **Component kit** with each component in all its variants.
4. A short style-token summary: palette, type scale, spacing scale, radius scale, elevation levels.
5. A **handoff bundle** for Claude Code with a single instruction so implementation can start from this design directly.

Iterate with me on the first {{PRIMARY_SCREEN}} pass before generating the rest.
```

## Iterating

After the first generation, Claude Design supports four refinement modes. Use them all:

- **Inline comments** on specific elements. Click on a component, type "smaller padding" / "swap this for a serif".
- **Direct text edits** for copy.
- **Custom sliders** for spacing, color, layout — great for nudges that are hard to verbalise.
- **Conversational requests** — "make the fall-behind banner quieter at warn severity", "tighten letter-spacing on all headers by 0.01em", "swap the amber for a warmer tone".

Be specific. "Make it pop more" is worse than "bump the serif weight to 500 and add 6% opacity tint behind metric tiles."

## Exporting

When you're happy:
- **Handoff bundle** for Claude Code — single instruction: *"implement the dashboard screen from this bundle, match the visual output, adapt to the existing stack."*
- **Export HTML / PDF / PPTX / Canva** for sharing with non-developers.
- **Internal share URL** scoped to your team/org.

## The actual brief that produced this repo's design

For reference / inspiration, the lived-in brief that produced study-dashboard's current design is at [`./examples/design-brief-example.md`](./examples/design-brief-example.md). Your app, users, and aesthetics are different — don't copy verbatim, but seeing a real one helps calibrate.
