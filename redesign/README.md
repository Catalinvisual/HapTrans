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
| `svgs/diagonal.svg` | Diagonal separator (edit the `fill` by placement: `#0B1B2A` dark wedge or `#FFFFFF` light wedge) |
| `svgs/blob.svg` | Blob accent (brand 6 % opacity) |
| `demo.html` | Self-contained visual preview of the full design (hero + wave, trust, stats, services, how-it-works, dark map panel, testimonials) |

## Where each piece is implemented in the app

| Design element | App location |
| --- | --- |
| Design tokens (`:root`) | `web/src/app/globals.css` |
| Buttons, `.card`, `.input`, focus rules, `.sep-*` | `web/src/app/globals.css` |
| Hero rework + calculator + wave | `web/src/components/Hero/Hero.tsx` + `Hero.module.css` |
| Trust section (light chips) | `web/src/components/TrustSection/TrustSection.tsx` |
| Stats section (light cards) | `web/src/components/StatsSection/StatsSection.tsx` |
| Features / Services / How it works | `web/src/components/Features`, `ServicesSection`, `HowItWorksSection` (module CSS) |
| Diagonal dark→light transitions | `HowItWorksSection.module.css` (`.diagonal`) + `MapSection.module.css` (`.diagonalBottom`) |
| Testimonials (light + swipeable carousel) | `web/src/components/TestimonialsSection/TestimonialsSection.tsx` |

## Acceptance checklist

- [ ] Brand color `#FF6A2B` / `#E0551A`; background `#F7F7F8`; text `#2E3A45`; muted `#6B7280`; link `#0F6FFF`; success `#16A34A`; danger `#DC2626`
- [ ] Rates: 16px cards / 12px buttons; shadows per spec (`--shadow-card`, `--shadow-cta`)
- [ ] Typography Inter/Poppins, H1 44–48 px/600, H2 32 px/600, H3 22 px/600, body 16/1.5
- [ ] Spacing 64 / 40 / 24 px
- [ ] `.btn-primary` gradient + hover lift + active press + focus ring
- [ ] `.card` hover micro-interaction (lift `-6px` + shadow + brand border)
- [ ] Focus states & keyboard a11y (`:focus-visible`, aria on carousel/lang/menu)
- [ ] Hero: desktop left text / right image + sticky calculator, CTA visible without scroll
- [ ] Hero mobile: image above text, calculator full-width stacked, 320/375/414 px verified
- [ ] Wave separator hero→trust; diagonal how-it-works→map; diagonal dark→light map→testimonials
- [ ] Blob accent on testimonials
- [ ] Trust chips, stats cards, services/features/how-it-works cards all light
- [ ] Testimonials: logo chip + quote + name + role + star rating; mobile swipeable carousel (scroll-snap)
- [ ] Scroll-reveal preserved on all sections (`Reveal` component, IntersectionObserver)
- [ ] `prefers-reduced-motion` respected
- [ ] `npm run lint` and `npm run build` green

## Notes

- SCSS partials are **design references**. The app is Next.js + CSS Modules and has no
  `sass` dependency installed; the living implementation lives in `globals.css` and the
  per-component `.module.css` files listed above.
- The dark globe map panel is intentionally kept dark as the one dark emphasis section.
- `demo.html` is intentionally standalone (single file, no build step) so the design can
  be reviewed without running the app.