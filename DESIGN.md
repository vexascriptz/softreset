# softreset design notes

## Subject and job

softreset is an internal workbench for a technician who maintains customers' Windows PCs remotely. The technician knows Windows well and is building diagnostic depth. The job is to move from a customer's complaint to a verified, recorded outcome without guessing which tool to open or how to read a number.

## Palette

The brief's colors are the base. Two adjustments were needed for legibility.

| Token | Light | Role |
| --- | --- | --- |
| canvas | #F6F9FC | page background |
| surface | #FFFFFF | panels |
| brand | #8BBCE8 | fills, selected states, primary button (never body text) |
| brand-soft | #DCEEFF | selected rows, tinted notes |
| ink | #26394D | primary text and button label |
| muted | #5B6C80 | secondary text |
| accent | #2A6496 | links and focus rings |

Revision: the brief's secondary text color #718096 measures about 4.0:1 on white, below the 4.5:1 needed for small text. The app uses #5B6C80 (about 5.4:1) for all secondary text. #718096 is kept for decorative icon strokes only.

Status colors (ok, caution, concern) each have a text color and a soft background. Text never sits on the saturated color.

## Type

One family: IBM Plex Sans, weights 400, 500, 600. Numbers use tabular figures so columns of measurements line up. No monospace face, and no tracked all-caps labels. Sentence case throughout. Prose stays under about 70 characters per line.

## Layout

- Fixed sidebar with the four groups from the brief. Content column left-aligned, maximum width about 1080px.
- Panels are flat: a 1px hairline border and no shadow. Shadow is reserved for floating layers (the command palette).
- Radius carries meaning. Panels use 14px, controls 8px, and status pills are fully rounded.
- Procedures use numbered steps, because the steps really are a sequence. Nowhere else uses numbers as decoration.

## Signature element

The diagnostic runner keeps an evidence thread beside the current question. Each answered step stays visible with the observation it produced, so the technician can see why they are on this step and can go back.

## Motion

One orchestrated moment: when a diagnosis concludes, the observations settle in sequence (about 120 ms apart). Everything else is instant. Reduced motion turns this off.

## Writing

Buttons name the action they perform ("Save finding", "Start capture"). Errors state what is wrong and what to enter. Empty states say what to do next.

## Review against the brief and the default AI aesthetic

Checked against the common defaults:

- SaaS card kit: avoided. Panels are flat, radii vary by role, and no two panel types share a shadow.
- Gradients: none. The brief warns against excess gradients.
- Eyebrow labels, middle-dot strings, arrows after links, one accented headline word: none used.
- Monospace for data: not used. Tabular numerals do that job.
- Hero: the dashboard does not open with a stats row. The first question is "What is the customer describing?", with the customer's own words as entry points. A stats row would invite invented numbers, which the brief forbids.

Revisions made during review:

1. The first plan had a centered hero with three stat tiles. Cut: it conflicts with the no-fake-statistics rule and reads as a template.
2. The first plan put a gradient on the primary button. Cut: the brief asks for restraint, and the solid #8BBCE8 fill with ink text passes contrast.
3. Secondary text was changed from #718096 to #5B6C80 for contrast (see Palette).
