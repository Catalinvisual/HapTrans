# HapCargo — Premium Redesign

Premium redesign of the HapCargo transport landing page (Next.js app in `../web`).
Design-only: **all functional logic (price calculator, quote/Language forms, stats
count-up & API fetch, globe, testimonials, reveal-on-scroll) is unchanged.**

## Deliverables in this folder

| File | Purpose |
| --- | --- |
| `_variables.scss` | Design tokens — colors, radii, shadows, typography, spacing, breakpoints, focus ring, separator fill colors |
| `_components.scss` | Component recipes — `.btn-*`, `.card`, `.input`, separators, focus/reduced-motion |
| `svgs/wave.svg` | Wave separator, `preserveAspectRatio="none"`, `aria-hidden` |
| `svgs/diagonal.svg` | Diagonal separator (edit the `fill` by placement: `#F7F7F8` wedge at how-it-works→map, `#FFFFFF` wedge at map→testimonials) |
| `svgs/blob.svg` | Blob accent (brand 6 % opacity) |
| `demo.html` | Self-contained visual preview of the full design (split hero + trust row + wave, services, how-it-works, light map card, testimonials) |

## Where each piece is implemented in the app

| Design element | App location |
| --- | --- |
| Design tokens (`:root`) | `web/src/app/globals.css` |
| Buttons, `.card`, `.card-calculator`, `.brand-image-filter`, focus rules, `.sep-*` | `web/src/app/globals.css` |
| Hero rework + trust row + calculator + wave | `web/src/components/Hero/Hero.tsx` + `Hero.module.css` |
| Hero micro-trust strings | `web/src/context/LanguageContext.tsx` (`heroTrust1..3`) |
| Trust section (light chips) | `web/src/components/TrustSection/TrustSection.tsx` |
| Stats section (light cards) | `web/src/components/StatsSection/StatsSection.tsx` |
| Features / Services / How it works | `web/src/components/Features`, `ServicesSection`, `HowItWorksSection` (module CSS) |
| Diagonal transitions (light) | `HowItWorksSection.module.css` (`.diagonal`) + `MapSection.module.css` (`.diagonalBottom`) |
| Map on white card, brand-highlighted countries | `MapSection` (module CSS) + `GlobeCanvas.tsx` (light globe colors, `#FF6A2B` highlights) |
| Testimonials (light + logo chips + swipeable carousel) | `web/src/components/TestimonialsSection/TestimonialsSection.tsx` |

## Acceptance checklist (copy-paste)

- [ ] `_variables.scss` added
- [ ] `_components.scss` added
- [ ] Hero integrated with overlay and trust row (3 micro-trust items under CTA)
- [ ] Wave SVG under hero implemented
- [ ] Calculator sticky desktop / full-width mobile (sticky right column `top:120px`)
- [ ] All cards unified (radius + shadow + hover `-6px`)
- [ ] Two additional SVG separators implemented (diagonal how-it-works→map, diagonal map→testimonials)
- [ ] Brand image filter applied site-wide (`.brand-image-filter` = sepia 6% / saturate 110% / contrast 102%)
- [ ] Map on white card with highlighted countries (`fill: var(--brand)`)
- [ ] Testimonials updated with logos/photos and mobile swipe carousel (scroll-snap)
- [ ] Scroll reveal and microinteractions implemented
- [ ] Accessibility checks passed (AA contrast, focus states, keyboard)
- [ ] Demo HTML and README delivered

## Notes

- SCSS partials are **design references**. The app is Next.js + CSS Modules and has no
  `sass` dependency installed; the living implementation lives in `globals.css` and the
  per-component `.module.css` files listed above.
- `.btn-primary` uses `linear-gradient(180deg, var(--brand), var(--brand-dark))`
  (hover `#FF7A45 → #D64B10`), padding `14px 20px`, focus ring `rgba(255,106,43,0.12)`.
- The light map section places the globe on a white `.card`-style panel with countries
  highlighted in brand; hover tooltips/`countryItem` chips are styled in `--brand`.
- `demo.html` is intentionally standalone (single file, no build step) so the design can
  be reviewed without running the app.