# Security Specification: Digitales Scheckheft

## Data Invariants
1. A Vehicle must always have an `ownerId` matching the creator's UID.
2. A Service Entry (History) must always have an `ownerId` matching the creator's UID and a `vehicleId` belonging to that same user.
3. Users can only read, update, or delete data they own.
4. Terminal state: There is no strict terminal state for vehicles, but `ownerId` is immutable.

## The "Dirty Dozen" Payloads (Deny Test Cases)

1. **Identity Spoofing**: Create a vehicle with `ownerId: "someone_else_uid"`.
2. **Orphaned Write**: Create a service entry for a `vehicleId` that doesn't exist.
3. **Cross-User Leak**: Try to `get` a vehicle using a valid ID that belongs to another user.
4. **Shadow Field Injection**: `update` a vehicle with a ghost field `isAdmin: true`.
5. **ID Poisoning**: Create a vehicle with a 2MB string as its document ID.
6. **Resource Exhaustion**: Send a 1MB string in the `name` field of a vehicle.
7. **Privilege Escalation**: Try to `list` vehicles without being authenticated.
8. **Relational Sync Bypass**: Add a history entry to another user's vehicle.
9. **Timestamp Fraud**: `create` a document with a `createdAt` date in the future (not `request.time`).
10. **Immutable Violation**: `update` a vehicle and try to change its `ownerId`.
11. **Type Poisoning**: Send a number into the `tasks` array instead of strings.
12. **Collection Scraping**: Try to `list` all vehicles without the `ownerId` filter.

## Test Runner (firestore.rules.test.ts)
(To be implemented if environment supports testing, otherwise verified via manual audit).
