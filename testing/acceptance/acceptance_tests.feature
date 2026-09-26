Feature: MakeMyTrip Travel Platform User Acceptance Testing (UAT)

  As a traveler on the MakeMyTrip platform
  I want to search for flights, lock dynamic prices, apply promo codes, and complete bookings
  So that I can secure the best travel deals conveniently.

  Background:
    Given the MakeMyTrip system APIs are operational
    And valid flight "FL-101" exists from "Delhi" to "Mumbai" with base price 5000 INR

  @Acceptance @FlightSearch @Functional
  Scenario: Traveler searches for flight with dynamic demand pricing
    When the user requests flight pricing for "FL-101" with demand "HIGH" and season "HOLIDAY_PEAK"
    Then the calculated final fare should be 6750 INR
    And the price adjustment percentage should be 35 percent
    And a 7-day price trend history should be generated

  @Acceptance @PriceFreeze @Functional
  Scenario: Traveler freezes flight price for 24 hours
    Given the current flight fare for "FL-101" is 5000 INR
    When the traveler freezes the price for 24 hours
    Then a unique freeze token starting with "FRZ-" is issued
    And the fare is locked at 5000 INR
    And an automated notification "Price Fare Locked!" is dispatched to the user

  @Acceptance @PriceFreeze @Negative
  Scenario: Traveler attempts to retrieve expired price freeze token
    Given a price freeze token "FRZ-EXPIRED" expired 1 hour ago
    When the traveler checks the status of freeze token "FRZ-EXPIRED"
    Then the system deactivates the freeze token
    And returns HTTP status 410 Gone with error "Price freeze has expired. Current market dynamic price applies."

  @Acceptance @PromoCoupon @InputValidation
  Scenario Outline: Traveler applies promotional coupon to booking amount
    When the user applies coupon code "<code>" to booking amount <amount> INR
    Then the system should respond with status <status>
    And discount amount should be <discount> INR

    Examples:
      | code       | amount  | status | discount |
      | WELCOME100 | 10000.0 | 200    | 1000.0   |
      | WELCOME100 | 3000.0  | 200    | 450.0    |
      | WELCOME100 | 1500.0  | 400    | 0.0      |
      | INVALID99  | 5000.0  | 400    | 0.0      |

  @Acceptance @Booking @System
  Scenario: Complete End-to-End Flight Seat Booking Flow
    Given user "USR-001" has an active account
    And flight "FL-101" has 10 available seats
    When user "USR-001" books 2 seats on flight "FL-101" for total price 10000 INR
    Then the booking status should be confirmed
    And available seats on flight "FL-101" should be reduced to 8
    And a flight confirmation notification should be created in the user's inbox
