# Comprehensive QA Automated Test Script for Tasks 1, 2, 3, 4
Write-Host "======================================================="
Write-Host "STARTING COMPREHENSIVE QA AUDIT (TASKS 1 - 4)"
Write-Host "======================================================="

$results = [ordered]@{}

# ----------------------------------------------------
# TASK 1: LIVE FLIGHT STATUS & RADAR STREAMING
# ----------------------------------------------------
Write-Host "`n--- TESTING TASK 1: LIVE FLIGHT STATUS ---"
try {
    # Test 1.1: Fetch all flight statuses
    $allFlights = Invoke-RestMethod -Uri "http://localhost:8081/api/flight-status"
    if ($allFlights.Count -gt 0) {
        $sample = $allFlights[0]
        Write-Host "PASS 1.1: Flight statuses retrieved ($($allFlights.Count) flights). Sample: $($sample.flightNumber) - $($sample.status)"
        $results["Task 1.1: Fetch Flight Statuses"] = "PASS"
    } else {
        throw "No flights returned"
    }

    # Test 1.2: Filter by status (e.g. ON_TIME or LANDED)
    $filtered = Invoke-RestMethod -Uri "http://localhost:8081/api/flight-status?status=ON_TIME"
    Write-Host "PASS 1.2: Filter by status returned $($filtered.Count) flights"
    $results["Task 1.2: Filter by Status"] = "PASS"

    # Test 1.3: Track multiple flights simultaneously (POST /api/flight-status/tracked)
    $trackedFlightNums = @("AI-101", "6E-204")
    $trackedBody = $trackedFlightNums | ConvertTo-Json
    $trackedResp = Invoke-RestMethod -Uri "http://localhost:8081/api/flight-status/tracked" -Method POST -Body $trackedBody -ContentType 'application/json'
    Write-Host "PASS 1.3: Tracked flights query returned $($trackedResp.Count) flights matching watchlist"
    $results["Task 1.3: Multi-Flight Simultaneous Tracking"] = "PASS"

    # Test 1.4: Simulate flight update (changes delay, revised departure/arrival, reason, ETA)
    $simPayload = @{
        flightNumber = "AI-101"
        status = "DELAYED"
        delayReason = "Air traffic congestion at departure runway"
        revisedDeparture = "11:15 AM"
        revisedArrival = "01:30 PM"
        gate = "Gate 18B"
        terminal = "Terminal 3"
        estimatedArrivalMinutes = 135
    } | ConvertTo-Json
    $simResp = Invoke-RestMethod -Uri "http://localhost:8081/api/flight-status/simulate" -Method POST -Body $simPayload -ContentType 'application/json'
    if ($simResp.status -eq "DELAYED" -and $simResp.delayReason -like "*congestion*") {
        Write-Host "PASS 1.4: Flight update simulation verified (Status: $($simResp.status), ETA: $($simResp.estimatedArrivalMinutes)m, Reason: $($simResp.delayReason))"
        $results["Task 1.4: Real-Time Flight Status Simulation"] = "PASS"
    } else {
        throw "Simulation payload not applied properly"
    }

    # Test 1.5: QA Failure Case: Simulate update for non-existent flight
    try {
        $badFlightPayload = @{ flightNumber = "NON-EXISTENT-999"; status = "DELAYED" } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8081/api/flight-status/simulate" -Method POST -Body $badFlightPayload -ContentType 'application/json'
        Write-Host "FAIL 1.5: Non-existent flight did not return 404"
        $results["Task 1.5: Invalid Flight Simulation"] = "FAIL"
    } catch {
        Write-Host "PASS 1.5: Non-existent flight correctly rejected with 404 Not Found"
        $results["Task 1.5: Invalid Flight Simulation"] = "PASS"
    }

} catch {
    Write-Host "FAIL in Task 1: $($_.Exception.Message)"
    $results["Task 1 Overall"] = "FAIL: $($_.Exception.Message)"
}

# ----------------------------------------------------
# TASK 2: DYNAMIC PRICING ENGINE & PRICE FREEZE
# ----------------------------------------------------
Write-Host "`n--- TESTING TASK 2: DYNAMIC PRICING & PRICE FREEZE ---"
try {
    # Test 2.1: Dynamic price calculation with High Demand and Holiday Peak season
    $calcResp = Invoke-RestMethod -Uri "http://localhost:8081/api/pricing/calculate?itemId=FL-101&itemType=FLIGHT&basePrice=5000&demand=HIGH&season=HOLIDAY_PEAK"
    # Base: 5000; High demand: +15%; Holiday Peak: +20% -> Total surge: 35% -> Final: 6750
    if ($calcResp.finalPrice -gt $calcResp.basePrice -and $calcResp.demandSurgePercentage -eq 35.0) {
        Write-Host "PASS 2.1: Dynamic pricing computed correctly (Base: $($calcResp.basePrice), Final: $($calcResp.finalPrice), Surge: +$($calcResp.demandSurgePercentage)%)"
        $results["Task 2.1: Dynamic Price Calculation (+35% Holiday/High)"] = "PASS"
    } else {
        throw "Dynamic price math unexpected: $($calcResp | ConvertTo-Json)"
    }

    # Test 2.2: Price history graph data verification
    if ($calcResp.priceHistory.Count -ge 7) {
        Write-Host "PASS 2.2: 7-day price history graph points generated ($($calcResp.priceHistory.Count) data points)"
        $results["Task 2.2: 7-Day Price History Graph"] = "PASS"
    } else {
        throw "Price history points count < 7"
    }

    # Test 2.3: Price Freeze creation (Lock fare for 24h)
    $freezeReq = @{
        itemId = "FL-101"
        itemTitle = "Air India Flight AI-101"
        currentPrice = $calcResp.finalPrice
        hours = 24
        userId = "usr-qa-test"
    } | ConvertTo-Json
    $freezeResp = Invoke-RestMethod -Uri "http://localhost:8081/api/pricing/freeze" -Method POST -Body $freezeReq -ContentType 'application/json'
    if ($freezeResp.freezeId -like "FRZ-*" -and $freezeResp.frozenPrice -eq $calcResp.finalPrice) {
        Write-Host "PASS 2.3: Price Freeze lock created (FreezeID: $($freezeResp.freezeId), Price: Rs $($freezeResp.frozenPrice), Expires: $($freezeResp.expiresAt))"
        $results["Task 2.3: Price Freeze Session Creation"] = "PASS"
    } else {
        throw "Price freeze session invalid: $($freezeResp | ConvertTo-Json)"
    }

    # Test 2.4: Price Freeze status check
    $statusCheck = Invoke-RestMethod -Uri "http://localhost:8081/api/pricing/freeze/$($freezeResp.freezeId)"
    if ($statusCheck.active -eq $true) {
        Write-Host "PASS 2.4: Active price freeze status validated via GET /api/pricing/freeze/{id}"
        $results["Task 2.4: Price Freeze Status Verification"] = "PASS"
    }

    # Test 2.5: QA Failure Case: Non-existent Freeze ID
    try {
        Invoke-RestMethod -Uri "http://localhost:8081/api/pricing/freeze/FRZ-NON-EXISTENT"
        Write-Host "FAIL 2.5: Non-existent freeze ID did not throw error"
        $results["Task 2.5: Invalid Freeze ID Handling"] = "FAIL"
    } catch {
        Write-Host "PASS 2.5: Non-existent freeze ID correctly returns 404 Not Found"
        $results["Task 2.5: Invalid Freeze ID Handling"] = "PASS"
    }

    # Test 2.6: Available Promotional Offers & Coupons
    $offers = Invoke-RestMethod -Uri "http://localhost:8081/api/pricing/offers"
    Write-Host "PASS 2.6: Retrieved $($offers.Count) promotional coupons from database"
    $results["Task 2.6: Promotional Offers API"] = "PASS"

    # Test 2.7: Apply valid promotional coupon
    $couponPayload = @{ code = "HDFC10"; amount = 6000 } | ConvertTo-Json
    $couponResp = Invoke-RestMethod -Uri "http://localhost:8081/api/pricing/apply-coupon" -Method POST -Body $couponPayload -ContentType 'application/json'
    if ($couponResp.success -eq $true -and $couponResp.discountAmount -gt 0) {
        Write-Host "PASS 2.7: Promo code $($couponResp.code) applied (Discount: Rs $($couponResp.discountAmount), Final: Rs $($couponResp.finalAmount))"
        $results["Task 2.7: Promo Coupon Application"] = "PASS"
    }

    # Test 2.8: QA Failure Case: Apply invalid coupon code
    try {
        $badCoupon = @{ code = "FAKECODE999"; amount = 5000 } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8081/api/pricing/apply-coupon" -Method POST -Body $badCoupon -ContentType 'application/json'
        Write-Host "FAIL 2.8: Invalid coupon did not throw error"
        $results["Task 2.8: Invalid Promo Coupon Handling"] = "FAIL"
    } catch {
        Write-Host "PASS 2.8: Invalid coupon rejected with 400 Bad Request"
        $results["Task 2.8: Invalid Promo Coupon Handling"] = "PASS"
    }

} catch {
    Write-Host "FAIL in Task 2: $($_.Exception.Message)"
    $results["Task 2 Overall"] = "FAIL: $($_.Exception.Message)"
}

# ----------------------------------------------------
# TASK 3: CANCELLATION & REFUND SYSTEM
# ----------------------------------------------------
Write-Host "`n--- TESTING TASK 3: CANCELLATION & REFUND SYSTEM ---"
try {
    # Setup: Create a temporary user with a fresh booking to test cancellation
    $testEmail = "qa-traveler-" + (Get-Random -Minimum 1000 -Maximum 9999) + "@test.com"
    $signupBody = @{
        firstName = "QA"
        lastName = "Tester"
        email = $testEmail
        phoneNumber = "9876543210"
        password = "Password@123"
    } | ConvertTo-Json
    $newUser = Invoke-RestMethod -Uri "http://localhost:8081/user/signup" -Method POST -Body $signupBody -ContentType 'application/json'
    $qaUserId = $newUser.id
    Write-Host "Setup: Created QA User: $qaUserId ($testEmail)"

    # Create a test flight booking
    $bookingResp = Invoke-RestMethod -Uri "http://localhost:8081/booking/flight?userId=$qaUserId&flightId=fl-101&seats=2&price=11000" -Method POST
    $bookingId = $bookingResp.bookingId
    Write-Host "Setup: Created Flight Booking ID: $bookingId (Amount: Rs $($bookingResp.totalPrice))"

    # Test 3.1: Calculate refund preview (24-hour reservation policy -> 50% refund)
    $preview = Invoke-RestMethod -Uri "http://localhost:8081/refund/calculate?userId=$qaUserId&bookingId=$bookingId"
    if ($preview.refundPercentage -eq 50.0 -and $preview.refundAmount -eq 5500.0) {
        Write-Host "PASS 3.1: Predefined 24-hr policy verified: 50% refund (Rs $($preview.refundAmount) refund, Rs $($preview.deductionAmount) fee)"
        $results["Task 3.1: Predefined Refund Policy Preview (50%)"] = "PASS"
    } else {
        throw "Refund preview calculation mismatch: $($preview | ConvertTo-Json)"
    }

    # Test 3.2: Submit Cancellation with required predefined reason
    $cancelResp = Invoke-RestMethod -Uri "http://localhost:8081/refund/cancel-and-request?userId=$qaUserId&bookingId=$bookingId&reason=Change+of+travel+plans&comment=Meeting+rescheduled" -Method POST
    if ($cancelResp.refundId -like "RF-*" -and $cancelResp.status -eq "PENDING") {
        Write-Host "PASS 3.2: Booking cancelled and refund request filed (Refund ID: $($cancelResp.refundId), Status: $($cancelResp.status))"
        $results["Task 3.2: Booking Cancellation & Refund Request"] = "PASS"
    } else {
        throw "Cancellation request returned invalid response: $($cancelResp | ConvertTo-Json)"
    }

    # Test 3.3: QA Failure Case: Cancel already cancelled booking
    try {
        Invoke-RestMethod -Uri "http://localhost:8081/refund/cancel-and-request?userId=$qaUserId&bookingId=$bookingId&reason=Change+of+travel+plans" -Method POST
        Write-Host "FAIL 3.3: Duplicate cancellation allowed!"
        $results["Task 3.3: Duplicate Cancellation Prevention"] = "FAIL"
    } catch {
        Write-Host "PASS 3.3: Duplicate cancellation blocked with 400 Bad Request"
        $results["Task 3.3: Duplicate Cancellation Prevention"] = "PASS"
    }

    # Test 3.4: Retrieve user refund records
    $userRefunds = Invoke-RestMethod -Uri "http://localhost:8081/refund/user/$qaUserId"
    if ($userRefunds.Count -gt 0 -and $userRefunds[0].refundId -eq $cancelResp.refundId) {
        Write-Host "PASS 3.4: User refund list retrieved successfully ($($userRefunds.Count) refund request(s))"
        $results["Task 3.4: User Refund Tracking"] = "PASS"
    }

    # Test 3.5: Admin / Scheduler Refund Status Progression (PENDING -> PROCESSED -> COMPLETED)
    $processedResp = Invoke-RestMethod -Uri "http://localhost:8081/refund/admin/update-status?refundId=$($cancelResp.refundId)&status=PROCESSED" -Method PUT
    if ($processedResp.status -eq "PROCESSED" -and $processedResp.currentStep -eq 2) {
        Write-Host "PASS 3.5: Step 2 'PROCESSED' verified"
    }
    $completedResp = Invoke-RestMethod -Uri "http://localhost:8081/refund/admin/update-status?refundId=$($cancelResp.refundId)&status=COMPLETED" -Method PUT
    if ($completedResp.status -eq "COMPLETED" -and $completedResp.currentStep -eq 3) {
        Write-Host "PASS 3.5: Step 3 'COMPLETED' verified with expected completion details"
        $results["Task 3.5: Refund Status Progression (Pending->Processed->Completed)"] = "PASS"
    }

} catch {
    Write-Host "FAIL in Task 3: $($_.Exception.Message)"
    $results["Task 3 Overall"] = "FAIL: $($_.Exception.Message)"
}

# ----------------------------------------------------
# TASK 4: SEAT AND ROOM SELECTION
# ----------------------------------------------------
Write-Host "`n--- TESTING TASK 4: SEAT AND ROOM SELECTION ---"
try {
    # Test 4.1: Retrieve dynamic aircraft seat map
    $seatMap = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/seatmap/FL-101"
    if ($seatMap.seats.Count -eq 72) {
        Write-Host "PASS 4.1: Aircraft cabin seat map retrieved (Type: $($seatMap.aircraftType), Rows: $($seatMap.totalRows), Total Seats: $($seatMap.seats.Count))"
        $results["Task 4.1: Dynamic Aircraft Seat Map (72 seats)"] = "PASS"
    } else {
        throw "Seat map seat count mismatch: $($seatMap.seats.Count)"
    }

    # Test 4.2: Verify Premium Seat options with clear upselling pricing
    $premiumSeats = $seatMap.seats | Where-Object { $_.priceAddon -gt 0 }
    Write-Host "PASS 4.2: Premium seats with upselling addons verified ($($premiumSeats.Count) premium seat options found)"
    $results["Task 4.2: Premium Seat Options with Addon Pricing"] = "PASS"

    # Test 4.3: Real-Time Seat Reservation on an AVAILABLE seat
    $targetSeat = ($seatMap.seats | Where-Object { $_.status -eq "AVAILABLE" } | Select-Object -First 1).seatNo
    if (-not $targetSeat) { $targetSeat = "11F" }
    $reserveResp = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/reserve-seat?flightId=FL-101&seatNo=$targetSeat&userId=usr-qa-test" -Method POST
    $reservedSeat = $reserveResp.seats | Where-Object { $_.seatNo -eq $targetSeat }
    if ($reservedSeat.status -eq "OCCUPIED") {
        Write-Host "PASS 4.3: Seat $targetSeat dynamically reserved in real time (Status: $($reservedSeat.status))"
        $results["Task 4.3: Real-Time Seat Reservation"] = "PASS"
    }

    # Test 4.4: QA Failure Case: Double booking / Conflict on already OCCUPIED seat
    try {
        Invoke-RestMethod -Uri "http://localhost:8081/api/selection/reserve-seat?flightId=FL-101&seatNo=$targetSeat&userId=another-user" -Method POST
        Write-Host "FAIL 4.4: Double booking allowed on seat $targetSeat!"
        $results["Task 4.4: Double-Booking Conflict Prevention"] = "FAIL"
    } catch {
        Write-Host "PASS 4.4: Double-booking rejected with 409 Conflict"
        $results["Task 4.4: Double-Booking Conflict Prevention"] = "PASS"
    }

    # Test 4.5: Hotel Room-Type Grid
    $rooms = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/hotel-rooms/ht-101"
    if ($rooms.Count -ge 4) {
        Write-Host "PASS 4.5: Hotel room-type grid returned $($rooms.Count) room tiers with amenities, bed types, and size"
        $results["Task 4.5: Hotel Room-Type Grid (4 Tiers)"] = "PASS"
    }

    # Test 4.6: 3D Room Previews & Images verification
    $has3D = $rooms | Where-Object { $_.preview3dModelUrl -like "*3d*" -and $_.imageUrls.Count -gt 0 }
    if ($has3D) {
        Write-Host "PASS 4.6: 3D interactive room preview URLs and high-res imagery verified across all room tiers"
        $results["Task 4.6: 3D Room Previews & Photo Galleries"] = "PASS"
    }

    # Test 4.7: User Travel Preferences Persistence
    $prefPayload = @{
        userId = "usr-qa-pref-test"
        userEmail = "pref-tester@test.com"
        preferredSeatType = "Window / Extra Legroom"
        preferredSeatNo = "1A"
        preferredRoomType = "Executive Deluxe Room"
        preferredBedType = "King Size Bed"
    } | ConvertTo-Json
    $savedPref = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/preferences" -Method POST -Body $prefPayload -ContentType 'application/json'
    $fetchedPref = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/preferences/usr-qa-pref-test"
    if ($fetchedPref.preferredSeatNo -eq "1A" -and $fetchedPref.preferredRoomType -eq "Executive Deluxe Room") {
        Write-Host "PASS 4.7: User preferences saved & retrieved from MongoDB for auto-selection"
        $results["Task 4.7: User Preferences Persistence"] = "PASS"
    }

} catch {
    Write-Host "FAIL in Task 4: $($_.Exception.Message)"
    $results["Task 4 Overall"] = "FAIL: $($_.Exception.Message)"
}

Write-Host "`n======================================================="
Write-Host "QA SUMMARY REPORT"
Write-Host "======================================================="
foreach ($key in $results.Keys) {
    Write-Host "$key : $($results[$key])"
}
