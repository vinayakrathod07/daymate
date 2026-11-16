# Student DayMate Firestore Security Specification

## 1. Data Invariants
1. Every document under `/users/{userId}/private/profile` and `/users/{userId}/records/{recordId}` strictly belongs to the verified authenticated user where `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. `ownerId` is immutable after document creation and must always equal `request.auth.uid`.
3. `createdAt` is immutable and must equal `request.time` on creation; `updatedAt` must equal `request.time` on both creation and update.
4. No arbitrary shadow fields are permitted (`keys().hasAll(...)` and `keys().hasOnly(...)` on create; `affectedKeys().hasOnly(...)` on update).
5. All path IDs (`userId`, `recordId`) must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.

## 2. Dirty Dozen Adversarial Payloads
1. **Unauthenticated read**: `GET /users/uid1/private/profile` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-user profile read**: `GET /users/uid2/private/profile` as `uid1` -> `PERMISSION_DENIED`.
3. **Cross-user record write**: `CREATE /users/uid2/records/rec1` as `uid1` -> `PERMISSION_DENIED`.
4. **Unverified email write**: `CREATE /users/uid1/records/rec1` with `email_verified == false` -> `PERMISSION_DENIED`.
5. **Identity spoofing**: `CREATE /users/uid1/records/rec1` with `ownerId: "uid2"` -> `PERMISSION_DENIED`.
6. **Shadow field injection**: `CREATE /users/uid1/private/profile` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Invalid document ID**: `CREATE /users/uid1/records/bad$id!` -> `PERMISSION_DENIED`.
8. **Type poisoning**: `CREATE /users/uid1/records/rec1` with `payload: "not-a-map"` -> `PERMISSION_DENIED`.
9. **Oversized string**: `CREATE /users/uid1/private/profile` with 20KB `scratchpad` -> `PERMISSION_DENIED`.
10. **Invalid enum kind**: `CREATE /users/uid1/records/rec1` with `kind: "admin_override"` -> `PERMISSION_DENIED`.
11. **Immutable ownerId tamper**: `UPDATE /users/uid1/records/rec1` changing `ownerId` -> `PERMISSION_DENIED`.
12. **Client timestamp forgery**: `UPDATE /users/uid1/records/rec1` with `updatedAt` != `request.time` -> `PERMISSION_DENIED`.
