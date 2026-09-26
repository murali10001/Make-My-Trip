# Equivalence Partitioning & Boundary Value Analysis (BVA) Matrix

## Overview
This document specifies the Equivalence Partitions (EP) and Boundary Value Analysis (BVA) test case suite for core application features of the **MakeMyTrip / MakeMyTour** software system.

---

## 1. Flight Search & Passenger Count Input

### Input Parameter: `passengerCount` (Integer)
- **Valid Domain**: `1` to `9` passengers.
- **Invalid Domain**: `<= 0` (negative / zero) or `> 9` passengers.

| Partition | Input Value | Expected Result | Testing Method |
| :--- | :--- | :--- | :--- |
| Invalid Partition 1 (`count < 1`) | `-1` | Validation Error: "Passenger count must be at least 1" | Boundary (Below Min) |
| Invalid Partition 1 (`count = 0`) | `0` | Validation Error: "Passenger count must be at least 1" | Boundary Value |
| Valid Partition (`1 <= count <= 9` min) | `1` | Search returns valid flights for 1 passenger | Min Boundary |
| Valid Partition (`1 <= count <= 9` nominal) | `4` | Search returns valid flights for 4 passengers | Nominal EP |
| Valid Partition (`1 <= count <= 9` max) | `9` | Search returns valid flights for 9 passengers | Max Boundary |
| Invalid Partition 2 (`count > 9`) | `10` | Validation Error: "Maximum 9 passengers allowed per booking" | Boundary Value |
| Invalid Partition 2 (`count >> 9`) | `99` | Validation Error: "Maximum 9 passengers allowed per booking" | Above Max EP |

---

## 2. Dynamic Pricing Engine

### Input Parameter: `basePrice` (Double)
- **Valid Domain**: `price > 0.0`
- **Fallback Domain**: `price <= 0.0` (System defaults base price to `5000.0 INR`)

| Partition | Input Value | Demand Level | Season Type | Expected Final Price | Testing Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Zero / Negative Price | `-500.0` | `NORMAL` | `REGULAR` | `5000.0 INR` (Fallback) | Negative Boundary |
| Valid Nominal Price | `6000.0` | `HIGH` (+15%) | `HOLIDAY_PEAK` (+20%) | `8100.0 INR` (6000 * 1.35) | Functional EP |
| High Base Price | `50000.0` | `MEDIUM` (+5%) | `WEEKEND` (+10%) | `57500.0 INR` (50000 * 1.15) | Boundary EP |

---

## 3. Offer Coupon Discount Engine

### Input Parameter: `bookingAmount` vs `minBookingAmount` (INR)
- **Coupon Code**: `WELCOME100` (`minBookingAmount = 2000.0 INR`, `discount = 15%`, `maxDiscount = 1000.0 INR`)

| Test Case ID | Input `bookingAmount` | Active Status | Expected Result | Reason |
| :--- | :--- | :--- | :--- | :--- |
| `TC-CP-01` | `1999.0` (Min - 1) | `true` | `400 Bad Request` ("Minimum booking amount for code WELCOME100 is ₹2000") | Boundary Value Below |
| `TC-CP-02` | `2000.0` (Exact Min) | `true` | `200 OK` (Discount: ₹300, Final: ₹1700) | Exact Min Boundary |
| `TC-CP-03` | `5000.0` (Nominal) | `true` | `200 OK` (Discount: ₹750, Final: ₹4250) | Valid EP (Uncapped) |
| `TC-CP-04` | `10000.0` (High) | `true` | `200 OK` (Discount: ₹1000, Final: ₹9000) | Capped Max Discount EP |
| `TC-CP-05` | `5000.0` | `false` | `400 Bad Request` ("This coupon code is no longer active.") | Negative State EP |

---

## 4. Price Freeze Duration Engine

### Input Parameter: `durationHours` (Long)
- **Valid Domain**: `1` to `72` hours.
- **Default Domain**: `durationHours <= 0` defaults to `24` hours.

| Input `durationHours` | System Set Expiration | Status Check after 25h | Result |
| :--- | :--- | :--- | :--- |
| `0` (Zero / Negative) | `now + 24h` | Expired | Throws `410 PriceFreezeExpiredException` |
| `24` (Standard) | `now + 24h` | Check after 1h -> Active | Returns `200 OK` (`active = true`) |
| `24` (Expired) | `now + 24h` | Check after 25h -> Expired | Deactivates token (`active = false`), returns `410 GONE` |
