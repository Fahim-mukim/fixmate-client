# FixMate Design System — v0.2

## Design direction
Option C: Modern Tech × Cinematic Editorial. Brand mark direction: minimal Smart Home + Shield + Wrench. The identity should feel premium, calm, capable, and trustworthy—not noisy or overly futuristic.

## Refined brand tokens
| Token | Value | Use |
|---|---|---|
| Navy 950 | #101C2C | Primary brand, dark text |
| Navy 900 | #081725 | Dark page background |
| Teal 500 | #17B8A6 | Primary brand accent |
| Teal 600 | #109B90 | Hover/active accent after contrast testing |
| Amber 500 | #F4A340 | Small secondary accent only |
| Mist 100 | #EAF2F5 | Light tinted surface |
| White | #FFFFFF | Light surface |
| Slate 600 | #526477 | Secondary text |
| Dark surface | #102638 | Dark cards |
| Dark border | #294354 | Dark separators |
| Success | #16865D | Success/completed |
| Warning | #B87518 | Pending/attention |
| Danger | #C83E4B | Failed/error |
| Info | #2877B8 | In progress/information |

## Typography
Primary candidate: Plus Jakarta Sans. Use a restrained scale:
- Display 48/56, 700–800
- H1 40/48, 700
- H2 32/40, 700
- H3 24/32, 600
- Body 16/24, 400
- Small 14/20, 400
- Caption 12/16, 500
Avoid using many weights in one viewport.

## Layout principles
- Generous whitespace; consistent 4px spacing base.
- Content max-width target 1200–1280px; confirm with actual app layout.
- Prefer editorial split layouts for hero and storytelling sections.
- Use clean cards with subtle borders; avoid excessive glassmorphism and neon glow.
- Avoid decorative UI that resembles clickable controls.

## Components
- Buttons belong in application components, not in static banners or decorative artwork.
- Static banners must contain no fake CTA, navigation, controls, or interaction affordances.
- Cards use clear hierarchy and restrained shadow.
- Inputs have persistent labels, visible focus, validation, disabled and error states.
- Badges always pair semantic color with text/icon.
- Tables become stacked cards on narrow screens when that improves readability.

## Light theme
Page #F7FAFC; surface #FFFFFF; text #101C2C; muted text #526477; border #DCE7ED; teal accent #17B8A6.

## Dark theme
Page #081725; surface #102638; text #F4F8FA; muted text #B6C7D1; border #294354; teal accent #17B8A6. Dark mode is a designed palette, not a color inversion.

## Responsive targets
Mobile <640px; tablet 640–1023px; desktop 1024–1279px; wide >=1280px. Re-evaluate based on content and test real breakpoints.
