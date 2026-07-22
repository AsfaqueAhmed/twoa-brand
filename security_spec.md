# Security Specification: E-Commerce Store

This specification outlines the data invariants, 12 malicious "Dirty Dozen" test payloads designed to break the security model, and a Firestore testing structure to ensure absolute safety.

## 1. Data Invariants

1. **Product Integrity**:
   - Products are read-only for all customers.
   - Standard users cannot create, edit, or delete catalog items. Only authorized admins or system actions can modify catalog state.

2. **Order Recipient Identity Bound**:
   - Users can only create and read orders where the `userId` field strictly matches their own authenticated Firebase `request.auth.uid`.
   - Anonymous/unauthenticated users cannot create orders or query any orders.

3. **Status Progression Flow**:
   - A standard user can only create an order with `status: 'pending'`.
   - Users cannot update the tracking `status` themselves (this is simulated via the admin/seller tracking module which performs updates as a designated staff role, or is restricted to staff IDs/admin users).
   - Once an order status is marked as `delivered` or `cancelled` (terminal states), it becomes completely immutable and locked. No further modifications can be made.

4. **COD Restriction**:
   - The `paymentMethod` field must strictly be set to `'cash_on_delivery'`. No other payment methods are permitted.

5. **Payload Size Guardrails**:
   - Recipient `address` cannot exceed 500 characters.
   - Recipient `phone` cannot exceed 20 characters.
   - Document ID keys must conform to safe string limits and alphanumeric character regex.

---

## 2. The "Dirty Dozen" Payloads (Malicious Test Vectors)

### Payload 1: Unauthorized Product Insertion
- **Goal**: Inject a rogue product into the store catalog as an anonymous browser.
- **Path**: `products/rogue_product_123`
- **Payload**:
  ```json
  {
    "id": "rogue_product_123",
    "name": "Rogue Product",
    "price": 0.01,
    "image": "https://malicious.url/img.jpg",
    "category": "hacks",
    "stock": 9999
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (anonymous write)

### Payload 2: Price Manipulation by Standard User
- **Goal**: Tamper with a legitimate product's price to purchase it for $0.00.
- **Path**: `products/prod_iphone_15` (update)
- **Payload**:
  ```json
  {
    "price": 0.00
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (read-only for standard users)

### Payload 3: Order Spoofing (Attacker placing order under another User's ID)
- **Goal**: Create an order using a different victim's `userId`.
- **Path**: `orders/order_hijack_1` (create)
- **Caller UID**: `attacker_uid`
- **Payload**:
  ```json
  {
    "id": "order_hijack_1",
    "userId": "victim_uid_999",
    "userName": "Attacker",
    "userEmail": "attacker@hacks.com",
    "address": "123 Hack St",
    "phone": "+1234567890",
    "items": [],
    "totalAmount": 150,
    "status": "pending",
    "paymentMethod": "cash_on_delivery",
    "createdAt": "2026-07-21T00:00:00Z",
    "updatedAt": "2026-07-21T00:00:00Z"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (userId mismatch with `request.auth.uid`)

### Payload 4: Invalid Payment Method (Bypassing Payment Gateway)
- **Goal**: Place an order specifying a "credit_card" payment, bypassing the system gateway.
- **Path**: `orders/order_card_1` (create)
- **Caller UID**: `user_abc_123`
- **Payload**:
  ```json
  {
    "id": "order_card_1",
    "userId": "user_abc_123",
    "userName": "Alice Jones",
    "userEmail": "alice@gmail.com",
    "address": "456 Oak Ln",
    "phone": "+123456789",
    "items": [{"productId": "p1", "price": 50, "quantity": 1}],
    "totalAmount": 50,
    "status": "pending",
    "paymentMethod": "credit_card",
    "createdAt": "2026-07-21T00:00:00Z",
    "updatedAt": "2026-07-21T00:00:00Z"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (paymentMethod must be cash_on_delivery)

### Payload 5: Buffer Overflow shipping address
- **Goal**: Attempt to write a 50KB string as an address to cause billing/resource fatigue.
- **Path**: `orders/order_bloat_1` (create)
- **Caller UID**: `user_abc_123`
- **Payload**:
  ```json
  {
    "id": "order_bloat_1",
    "userId": "user_abc_123",
    "userName": "Alice Jones",
    "userEmail": "alice@gmail.com",
    "address": "[50,000 character long address string]",
    "phone": "+123456789",
    "items": [],
    "totalAmount": 100,
    "status": "pending",
    "paymentMethod": "cash_on_delivery",
    "createdAt": "2026-07-21T00:00:00Z",
    "updatedAt": "2026-07-21T00:00:00Z"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (address length validation failure)

### Payload 6: Status Manipulation (User marking order as Delivered)
- **Goal**: Attacker updates their own order status directly to "delivered" without paying.
- **Path**: `orders/order_alice_123` (update)
- **Caller UID**: `user_abc_123`
- **Payload**:
  ```json
  {
    "status": "delivered"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (customers are forbidden from updating status field to delivered)

### Payload 7: Terminal State Violation (Updating an order that is already completed)
- **Goal**: Override delivery info or item details on an order that has already been delivered.
- **Path**: `orders/completed_order_999` (update)
- **Caller UID**: `user_abc_123` (owner)
- **Current State in DB**: `{ "status": "delivered", "address": "Old Road" }`
- **Payload**:
  ```json
  {
    "address": "New Road"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (terminal state locking)

### Payload 8: Altering Read-Only Field `userId`
- **Goal**: Keep the order but change the owner to another user account.
- **Path**: `orders/alice_order_5` (update)
- **Caller UID**: `user_abc_123`
- **Payload**:
  ```json
  {
    "userId": "victim_uid"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (userId is immutable)

### Payload 9: Malicious ID Injection (Path Poisoning)
- **Goal**: Write an order document using a massive junk string with special characters as the ID.
- **Path**: `orders/JUNK_CHARACTERS_$$$___$$$_OVERFLOW_JUNK` (create)
- **Caller UID**: `user_abc_123`
- **Payload**: Valid order schema
- **Expected Outcome**: `PERMISSION_DENIED` (isValidId regex check fails)

### Payload 10: Anonymous Order Listing (Scraping client info)
- **Goal**: Read the `orders` collection without signing in.
- **Path**: `orders` (list)
- **Caller**: Unauthenticated
- **Expected Outcome**: `PERMISSION_DENIED` (isSignedIn requirement)

### Payload 11: Cross-User Order Scraping (Harvesting customer data)
- **Goal**: Bob attempts to read Alice's orders or query all orders without filtering by his own userId.
- **Path**: `orders` (list)
- **Caller UID**: `bob_uid`
- **Expected Query**: All orders
- **Expected Outcome**: `PERMISSION_DENIED` (list rules enforce `resource.data.userId == request.auth.uid`)

### Payload 12: Missing Required Field (Broken Contract)
- **Goal**: Post an order with missing price/totalAmount to break system metrics.
- **Path**: `orders/order_broken_123` (create)
- **Caller UID**: `user_abc_123`
- **Payload**:
  ```json
  {
    "id": "order_broken_123",
    "userId": "user_abc_123",
    "userName": "Alice",
    "userEmail": "alice@gmail.com",
    "items": [],
    "status": "pending",
    "paymentMethod": "cash_on_delivery"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (missing required keys totalAmount, phone, address, etc.)

---

## 3. The Test Runner Structure

A `firestore.rules.test.ts` layout is structured to execute these assertions against local firestore emulator or test suites:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Verification implementation runs during CI/CD checks to prevent regression of the "Dirty Dozen" vectors.
```
