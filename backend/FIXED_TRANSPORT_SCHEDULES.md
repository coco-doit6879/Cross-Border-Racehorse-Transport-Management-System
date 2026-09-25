# Fixed transport schedules

Customer bookings now select a published departure rather than submit an arbitrary location or timestamp.

## Initial test configuration

Eight city-level stops: Ho Chi Minh City, Hanoi, Da Nang (VN); Bangkok, Chiang Mai (TH); Phnom Penh, Siem Reap (KH); Singapore (SG). These are test city coordinates, not verified pickup facilities. Configure operational addresses and coordinates in `src/config/transportCatalog.js` before using them as real collection points.

The initial network has 18 directional weekly rules. Outbound sample rules run Monday/Wednesday/Friday at 08:00; return rules run Tuesday/Thursday/Saturday at 14:00. Managers may add routes between the fixed stops, select weekdays and the allowed 08:00/14:00 slots, or suspend booking on a route.

The catalog opens departures in the next 28 local calendar days, with a 24-hour booking cutoff. Times are local to pickup: UTC+07 for VN/TH/KH and UTC+08 for SG. The backend stores a full UTC timestamp plus the local date, time and IANA timezone.

## Management and API

- `GET /api/transport-schedules`: authenticated catalog, stops, rules, generated departures and revision.
- `PUT /api/transport-schedules`: `{revision, rules}`; requires `schedule:manage`, assigned to Logistics Manager and Fleet Coordinator. This persists a singleton configuration in MongoDB. Concurrent edits return HTTP 409.
- `POST /api/orders`: `{horseIds, departureId, scheduleRevision, specialRequirements?}`. The departure ID must belong to the current open catalog. Submitted `origin`, `destination`, `requestedDepartureDate`, `departureDate`, or `departureTime` are rejected. Existing ownership and horse health checks still apply.
- The server snapshots the canonical departure and stops into the order; later schedule edits affect new bookings only, not existing orders or dispatched trips. No capacity pooling or vehicle assignment is implied by a recurring schedule.

The management page is `/manager/schedules`; customers book from `/orders/create`. Existing orders continue to display without migration. A missing schedule configuration uses the test defaults until the first management save, without writing on GET or reseeding other collections.

## Verification

`node --test backend/tests/horseProfile.test.js backend/tests/transportSchedule.test.js`

`npm run build` in `frontend`.

`node --test backend/tests/transportSchedule.integration.test.js` runs against a new, uniquely named local MongoDB test database and removes only that test database afterward. Override the local server with `MONGODB_TEST_SERVER` if necessary. It does not use or alter the application's configured database.
