# Horse identity and health review

Owners submit identity information, the horse's current fixed transport stop, a full-body photo, a separate face photo, a passport file, a vaccination/quarantine record and the most recent equine-influenza vaccination date. JPEG, PNG and PDF files are limited to 5 MB each; identity photos must be images. Files are stored separately from Horse documents in MongoDB, and downloads require authentication and access authorization.

`TRANSPORT_SPECIALIST` (Chuyên viên Thủ tục & Kiểm dịch) receives `horse:review_health`. Owners edit and resubmit their own profiles; specialists review profiles without modifying the owner's evidence. A user cannot review their own horse.

- Creation and every profile update set `PENDING_REVIEW`.
- `APPROVED` and `REJECTED` decisions require a written health conclusion/reason.
- Approval requires complete evidence and a vaccination date within six months.
- Review stores the reviewer, timestamp, notes and historical decision. An atomic version check prevents reviewing evidence that changed after the reviewer opened it.
- Booking creation requires every selected horse to be owned by the customer and `APPROVED`.
- Existing profiles without a review status are displayed as pending and cannot create new bookings until their owner completes the evidence and a specialist approves them. Existing orders are not migrated by this change.

## API

All paths below are relative to `/api` or `/api/v1`.

- `POST /horses/files`: authenticated raw JPEG/PNG/PDF body with matching `Content-Type` and URI-encoded `X-File-Name`; returns `{data: {url, name, size}}`.
- `GET /horses/files/:fileId`: authorized binary file retrieval.
- `POST /horses`: `name`, `microchipId` (10–18 alphanumeric characters, matching the existing backend rule), `feiPassportNumber`, `breed`, `dateOfBirth`, `gender`, `weightKg`, `color`, `currentStopId`, `photos` (body then face), `passportScanUrl`, `vaccinationRecordUrl`, `lastVaccinationDate`; optional `identifyingMarks`, `medicalHistoryNotes`. File references must come from the upload endpoint.
- `PUT /horses/:id`: editable profile fields only; ownership and review metadata cannot be assigned through this endpoint.
- `GET /horses`, `GET /horses/:id`: owner-scoped reads or privileged specialist/manager reads.
- `POST /horses/:id/review`: `{decision: "APPROVED" | "REJECTED", notes, profileVersion}` where `profileVersion` is the `__v` returned with the profile. Returns HTTP 409 for stale/already-reviewed profiles.

## Verification

Run `node --test backend/tests/horseProfile.test.js` from the repository root, and `npm run build` from `frontend`.

The regression suite uses mocked database operations and a real local HTTP server for upload/authentication validation; it does not replace a deployment smoke test against MongoDB. The browser UI check uses a temporary isolated fixture, not real customer data.
