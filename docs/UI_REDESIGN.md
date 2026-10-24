# CBRT — Heritage Equestrian redesign

Implemented 24 October 2026. This document replaces the visual direction in `UIUX_REFERENCE_BLUEPRINT.md`; that file describes the historical cloned interface.

## Design and scope

- Original CBRT route/bridle monogram and wordmark, with matching SVG favicon. No use of the previous logo in the live UI.
- Guest: asymmetric photographic hero, editorial service rows, welfare feature, a four-part explanation of the real workflow, an explicitly illustrative route diagram and functional FAQ. No carousel, floating lookup widget, invented certifications, coverage counts or testimonials.
- Customer: persistent navigation rail; actionable home; dossier-style horse register and detail; four-step booking with vertical desktop progress and persistent summary; shipment ledger; vertical detail navigation and milestones; existing payment/result, document and support integrations retained.
- Manager: decision queue, shipment register and actual upcoming departures replace the old Kanban/calendar template. Review and crew allocation use a side drawer. Personnel lists remain functional and scroll inside their own table on small screens.
- Specialist: review counts and queue are arranged as a workbench, with a document-review drawer. The queue uses API records only. Submitted evidence is distinct from verified evidence. Unavailable document types are not presented as verified or fabricated.
- Coordinator: allocation, route/stops and review/confirmation are separate work areas. The summary/history stays alongside the active area. Resource selection is a compact register with eligibility reasons. Vehicles, staff and schedule modules use the shared operational workbench.
- Monitoring/SOS: shared operational shell, compact shipment summaries, responsive tracking controls and exception layouts. The existing sockets, map and incident actions are retained.
- Revenue: actual transaction/settlement registers, monthly/order charts, bank breakdown and cash reconciliation. No hardcoded 20%/80% estimates. Chart data has an accessible numeric table. VNPAY local timestamps and ISO timestamps are both supported.
- Staff-assisted order creation keeps its API payloads and fields, with a redesigned frame and summary positioning.

## Identity and components

Palette: forest `#243C32`, ivory `#F4F0E7`, charcoal `#20231F`, burgundy `#7B3438`, brass `#8C795A`, border `#DDD9CF`. Status colors are separate from brand accents.

Typography adjustment after Vietnamese visual QA:

- Lora for editorial Vietnamese headings.
- Be Vietnam Pro for operational/body text, forms, tables and navigation.
- Libre Baskerville for the Latin CBRT wordmark.

The brief's Libre Baskerville and DM Sans metadata do not list a Vietnamese subset. Lora and Be Vietnam Pro explicitly support Vietnamese. Fonts are self-hosted, with OFL licenses in `frontend/public/fonts`; the UI does not rely on Google Fonts availability.

Primary references:
- https://github.com/google/fonts/blob/main/ofl/librebaskerville/METADATA.pb
- https://github.com/google/fonts/blob/main/ofl/dmsans/METADATA.pb
- https://github.com/google/fonts/blob/main/ofl/lora/METADATA.pb
- https://github.com/google/fonts/blob/main/ofl/bevietnampro/METADATA.pb

Shared implementation: `styles/heritageTheme.js`, `styles/heritage.css`, `styles/fonts.css`, `BrandLogo`, `AuthStory`, `CustomerNavigation`, `MainLayout`, `Workspace`, `Metrics`, `StatusPill`, `PlanningResourcePicker`, and the review drawers. Heritage styles load after legacy module styles. Reduced motion, visible focus, navigation landmarks, skip links and tabular numerals are included.

## Preserved workflow

Approved horse profile → four-step shipment request → 30% deposit → manager approval → remaining balance → coordinator confirms vehicle/horse allocation and route → manager assigns driver and escort → transport milestones → delivery/handover → completion.

No changes to backend contracts, database models, authentication, role policy, pricing calculations, payment initiation, socket event names or transition endpoints. The existing server remains the authority for financial and operational decisions.

The UI additionally avoids claiming an approved legacy record has paid in full when both payment and pricing information are missing.

## Validation

- Frontend: 41 passing tests covering API/store errors, booking eligibility and prices, customer lifecycle, local dates, access policy, and VNPAY timestamp parsing.
- Backend regression selection: 46 passing tests covering 30% deposit and approval gates, health evidence and review permissions, planning API role/version/capacity/crew/welfare gates, compliance requests, driver milestone/handover sequence and revenue access. Tests use mocked persistence and local HTTP servers; no live records were changed by these tests.
- Production Vite build passes. The pre-existing large-bundle warning remains.
- Browser checks with seeded local customer, manager, specialist and coordinator accounts. Checked real catalog/price reads, booking form validation, data retention on previous step, blocked unapproved horses, detail tabs, document/crew drawers, picker eligibility, and disabled plan confirmation on unpaid/unroutable records.
- Responsive checks at 1440px and 390px; corrected overflow in planning, monitoring controls and personnel tables. Also reviewed the tablet header layout.
- Real payments, order creation, approvals, document decisions, personnel changes, and dispatch actions were not executed against live data during visual QA.

## Existing integration limitations

- Public shipment lookup has no connected endpoint. The public UI directs customers to their authenticated shipments instead of presenting a working anonymous lookup.
- Public route prices are not exposed by the current backend; current schedules and costs remain in the authenticated booking flow.
- OSRM returned an upstream routing error for the existing seeded international order during QA. The UI reports this, offers retry, and does not fabricate distances, arrival estimates or allow confirmation without road data. Map tiles/routing still depend on the existing external providers.
- Existing seed data can contain historical or incomplete financial/profile records. The redesign shows missing information; it does not silently repair or replace records with demo values.

## Illustration assets

Generated with the built-in ImageGen tool, not the CLI. These are illustrative brand images, not evidence of the company's actual employees, premises, fleet or customers. The original generated PNGs are copied into the project:

1. `frontend/public/images/equine-editorial.png`
2. `frontend/public/images/equine-care-editorial.png`

Hero prompt:

> Create a single photographic asset for an editorial premium equestrian transport website. Photorealistic natural editorial photography, vertical 4:5 composition. Close portrait of a calm dark bay thoroughbred horse with an elegant dark brown leather halter, head and upper neck in three quarter profile facing left, full ears visible with comfortable breathing room, rich natural coat texture, gentle soft daylight, muted forest green foliage and warm stone stable background softly out of focus. Understated heritage equestrian magazine photography, restrained color grading, realistic anatomy. No typography, no logos, no text, no graphic elements, no dramatic lighting, no gradients, no neon, no saddled rider, no crowds. This is a decorative illustrative brand photograph, not a documentary claim about an actual company.

Welfare prompt:

> Generate a single natural editorial photograph, landscape 3:2, for a heritage equestrian logistics website section about horse welfare. An adult groom in a simple plain forest-green cotton work shirt gently checking a calm dark bay thoroughbred horse's leather halter beside a warm limestone stable doorway. Frame the horse's head and upper neck on the right and the groom's hands and upper torso on the left; groom looking at horse, discreet face mostly side profile. Authentic quiet caring moment, realistic hands and anatomy, soft overcast morning daylight, muted earthy colors, tactile coat and leather detail, candid equestrian magazine photography. No words, no logos, no branding, no badges, no typography, no medical instruments, no vehicles, no posed smiling advertising look, no flashy lighting. Illustrative decorative brand image, not a claim about actual staff or facilities.

Browser previews are saved in `output/redesign/`.
