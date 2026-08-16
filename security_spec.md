# Security Specification & Test Payloads

## 1. Data Invariants
- Save documents at `/users/{userId}/saves/{saveId}` belong strictly to the user matching `{userId}`.
- Unauthenticated users cannot read or write any user save documents.
- Authenticated users cannot read, write, update, or delete save documents belonging to another `{userId}`.
- All documents must have a valid `updatedAt` field or valid schema fields on write.

## 2. Dirty Dozen Payloads (Security Attack Scenarios)
1. Unauthenticated write to `/users/user123/saves/default` -> Expected: PERMISSION_DENIED
2. Authenticated user A writing to `/users/userB/saves/default` -> Expected: PERMISSION_DENIED
3. Authenticated user A reading `/users/userB/saves/default` -> Expected: PERMISSION_DENIED
4. Authenticated user A attempting shadow update with malicious fields -> Expected: PERMISSION_DENIED
5. Unauthenticated read of user list -> Expected: PERMISSION_DENIED
6. Spoofed user ID path mismatch -> Expected: PERMISSION_DENIED
7. Invalid document ID injection (excessive length / invalid characters) -> Expected: PERMISSION_DENIED
8. Deleting another user's save data -> Expected: PERMISSION_DENIED
9. Listing all saves across all users -> Expected: PERMISSION_DENIED
10. Creating save document with unverified email (if email_verified required) -> Expected: PERMISSION_DENIED
11. Overwriting system test connection doc -> Expected: PERMISSION_DENIED
12. Injecting non-object stats payload -> Expected: PERMISSION_DENIED
