# softreset

An internal workspace for technicians who maintain Windows PCs remotely. It runs diagnostic workflows, keeps a software library and a set of step-by-step procedures, records customer sessions, and produces a printable customer report.

softreset is a static web app. It has no server, no account system, and no telemetry. All data stays in the browser where it was entered.

## Important limitations

- The browser cannot inspect or change a PC. Every measurement is taken by the technician with the named tool, then typed in. Every change is made by the technician, by hand.
- Data is stored per browser, in IndexedDB. Another browser or another computer starts empty. Clearing site data deletes everything. Export a backup first.
- A backup file contains customer names and contact details. Store it the way you would store any customer record.
- Some tool entries are incomplete. Each entry lists its own unverified items, and the app shows them. Check them before relying on a tool.

## Install and run

Requirements: a current Node.js LTS release, and npm.

```bash
npm install
npm run dev        # development server
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, then builds the production app into `dist/` |
| `npm run preview` | Serves the built app locally for a final check |
| `npm run typecheck` | TypeScript check only |
| `npm run check:workflows` | Confirms every workflow step, procedure, and tool reference resolves, and that every step is reachable |

## Deploy to GitHub Pages

The build is set up for a project page with no server:

- `vite.config.ts` uses `base: './'`, so asset paths are relative.
- The router is a `HashRouter`, so every page works on a plain static host. Addresses look like `https://<user>.github.io/<repo>/#/diagnose`.

Steps:

1. Run `npm run build`.
2. Publish the contents of `dist/` to GitHub Pages. You can use a `gh-pages` branch, or a GitHub Actions workflow that uploads `dist/` as the Pages artifact.
3. Open the published address and check the dashboard loads.

This repository does not include a deployment workflow file. Add one if you want automatic publishing.

## What is built

**Diagnostics.** Three branching workflows, each with a checklist, measurement steps, thresholds, and results with causes, uncertainty, next actions, and verification:

- General system slowdown (startup, idle load, memory pressure, one-application cases)
- Low frame rate, stutter, and frame-time spikes in games
- Low disk space

Results record the reasoning in the session, and the workflow state is saved, so you can pause and continue.

**Software library.** Eight written entries (Task Manager, WizTree, Autoruns, CrystalDiskInfo, HWiNFO64, CapFrameX, BleachBit, Storage Sense). Each entry covers when to use the tool, when not to, installation, recommended configuration, exact usage, what the numbers mean, common mistakes, safety notes, verification, licensing with sources, and the unverified items. The library also shows which tools a workflow needs, and why others are not needed.

**Procedures.** Five step-by-step procedures: a Task Manager baseline, startup review, disk space recovery, disk health check, and frame capture. Checks save to the active session, and "Log as work performed" adds an entry to the session's actions and timeline.

**Windows settings.** Five guides (Storage Sense, startup apps, power mode, Game Mode, virtual memory). Recommendations change with device type, drive type, and main use.

**Customers and sessions.** Create customers and sessions, pause and resume, mark complete, and edit details. Findings, measurements, actions, settings changes, verifications, notes, and a timeline are kept per session.

**Performance analysis.** Before and after comparison. A change counts as measured only when both readings were taken under the same conditions. Other changes are shown as indicative, waiting for a reading, or assumed. Storage recovered is measured from free space on the drive.

**Reports.** A printable service report for each session, with a copy-to-clipboard customer summary. It describes only measured changes.

**Data.** Export a backup, import one (merge or replace), or delete all local data. Each action asks for confirmation.

**Settings.** Light, dark, or system theme, and a list of keyboard shortcuts. Search opens with Ctrl K (Cmd K on a Mac). Press `/` on the library page to focus its search box.

## Planned, not built

These pages exist in the navigation and say so plainly:

- Troubleshooting knowledge base
- Maintenance checklists
- Technician notes across sessions
- Training mode

The library lists about 44 further tools by name only. Their entries are not written yet. Diagnostic workflows for stability problems and for several gaming problems are also not written yet; their entries point to the workflows that exist.

## Verification status

Checked in this build:

- `npm run typecheck` passes with no errors, and no unused locals or parameters.
- `npm run build` passes.
- `npm run check:workflows` passes. It samples 1,845 measurement outcomes and confirms every reference resolves and every step is reachable. Tools referenced but not yet written are reported as notes.
- In a headless Chrome run against the production build, all 26 routes render with no console or page errors.
- The low-disk-space workflow was walked from start to result in the browser.
- The procedure runner was tested in the browser: checks persist across a reload, the progress bar updates, and logged work appears on the session page.

Not checked yet:

- The general slowdown and gaming workflows have not been walked through in a browser. The sampling check covers their logic.
- Layout on phones and small tablets, screen-reader behavior, and keyboard-only use beyond the controls named above.
- Print output and PDF saving from the report page.
- Deployment to GitHub Pages.
- The main JavaScript bundle is about 525 kB before compression (about 157 kB gzipped). The build warns about its size. The performance page, which uses Recharts, is already loaded on demand.

## Project layout

```
src/
  App.tsx                 routes (HashRouter)
  components/             layout, command palette, session banner, UI primitives
  data/                   diagnostic trees, problems, software library, procedures, Windows settings, services
  lib/                    IndexedDB storage, local preferences, sessions, metrics, theme
  pages/                  one file per screen
scripts/
  check-workflows.ts      workflow and reference checks (npm run check:workflows)
```
