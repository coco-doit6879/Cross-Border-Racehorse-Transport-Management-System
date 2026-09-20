# FE-02 Logistics Manager — GAP LOG

Checked against:

- `CBRT_Frontend_Team_Work_Plan_V1.0.docx`
- workspace `main`
- backend implementation at `origin/feature/backend-api-swagger` (`2cd134d`)

## Contract differences found

| Area | Work plan / request | Backend source found | Frontend decision |
| --- | --- | --- | --- |
| API prefix | `/api/v1/*` | Server mounts routes at `/api/*` | Keep the existing FE-01 base URL (`http://localhost:5000/api`). Backend owner must confirm versioned production URL. |
| Backend on `main` | V1.0 locked and implemented | Controllers return `501`; `server.js` does not mount API routes | Integration requires the backend implementation branch/commit to be merged or deployed. |
| Auth lifecycle | Login, profile, refresh and logout | Implemented branch exposes login and profile with one 7-day JWT; no refresh or logout endpoint/cookie contract exists | Bootstrap profile once from the stored access token. A confirmed 401 clears the local session; network/server errors retain it for retry. Refresh is BLOCKED until a contract exists. |
| Permission model | Permission strings such as `booking:approve` and `route:dispatch` | Backend authorizes role names only | UI maps documented role permissions for UX. Backend remains the authority. |
| Coordinator role | `FLEET_COORDINATOR` in request wording | `ROUTE_COORDINATOR` in User enum | Frontend retains the backend value `ROUTE_COORDINATOR`. |
| Dispatch | Manager must not have `route:dispatch` | Backend `POST /routes` allows `LOGISTICS_MANAGER` | No dispatch or assignment action is exposed to Manager. |
| Order transitions | State machine restricts transitions | Backend accepts any Order enum value from three roles without transition validation | Manager UI exposes only `PENDING_APPROVAL → APPROVED`; it never exposes other transitions. Backend owner must enforce the state machine. |
| Rejection reason | Required and must be sent with the confirmed field name | Order model and status payload contain only `status`; controller discards other fields | Rejection form is not shown; UI immediately states that rejection is unavailable. No local-only business state is created. |
| Order fields | Transport date and special requirements expected | Neither field exists in Order model/response | UI displays “Chưa có dữ liệu”. |
| List query | Search, filter and pagination by backend contract | `GET /orders` accepts no documented query params and returns the complete list | Search/filter/pagination are client-side over the complete response. |
| Incident API | `PATCH /incidents/:id/status`; 5-state machine | `PATCH /incidents/:id/resolve`; enum is only `OPEN`, `IN_PROGRESS`, `RESOLVED` | Incidents are read-only in Manager UI. |
| SOS event | `sos:alert_broadcast` | Backend emits `sos:broadcast_alert` globally | Listener uses the implemented event. Initial state still comes from `GET /incidents`. |
| GPS room/events | `trip_<tripId>`, `route:location_changed` | `gps:join_room`, room `order:<orderId>`, event `gps:position_changed` | Not added to Manager scope until naming/authentication is reconciled. |

## BLOCKED API / PERMISSION

### Reject booking with reason

- Missing: persisted rejection-reason field and exact request body name.
- Questions for backend owner:
  1. Is the field `rejectionReason`, `reason`, or another name?
  2. Is it stored on Order or in an audit/history collection?
  3. Is it required only for `PENDING_APPROVAL → REJECTED`?

### Assign or replace driver / escort / vehicle

- Missing: permission, update endpoint, payload, allowed trip states, conflict response and assignment history.
- Questions for backend owner:
  1. May Logistics Manager assign or replace staff, or is this Coordinator-only?
  2. What endpoint and payload update an existing assignment?
  3. Which trip states allow changes?
  4. How are schedule conflicts reported?
  5. Is a reason required and where is assignment history returned?

### Transport plan details

- Available read data: order, route waypoints, `vehicleId`, driver and current location.
- Missing: escort, vehicle plate model, ETA/schedule and trip status.
- Question: will these fields be added to `TransportRoute`, or supplied by separate read endpoints?

### Approve operational changes

- No API, permission or model is defined for route, vehicle, staff, schedule or additional-cost approvals.
- Required contract: request/response schema, decision states, rejection reason, history and authorization.

### Incident handling

- Document and backend disagree on endpoint and state machine.
- Required decision: adopt `/incidents/:id/status` with `OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED`, or revise the locked specification to match `/resolve` and the three-state model.

### KPI, Users and Audit

- No users, analytics or audit routes exist in the inspected backend implementation.
- Dashboard only derives counts from complete, unpaginated Orders/Routes/Incidents responses.
- Required endpoints: documented `/users`, `/analytics/kpi`, `/audit-logs` response and query schemas.

## Shared changes for FE-01 coordination

- `store/useAuthStore.js`: added explicit session states, one application-level profile bootstrap, retryable profile errors, session clearing and socket cleanup on logout.
- `services/apiClient.js`: a confirmed 401 on authenticated requests expires the local session; 403 is left untouched. Refresh was not invented because the inspected backend has no refresh contract.
- `routes/ProtectedRoute.jsx` and `routes/AppRoutes.jsx`: added bootstrap-aware authentication, role checks, Manager redirect from `/`, and a 403 destination.
- `components/common/Header.jsx` and `Sidebar.jsx`: now consume the same shared user/session and permission source as route guards.
- `App.jsx`: starts the single shared bootstrap. Feature pages no longer request the current profile independently.

The existing interfaces (`user`, `token`, `isAuthenticated`, `setUser`, `logout`) remain available. The feature-local operations feedback/status components can be replaced after FE-01 publishes stable shared props.
