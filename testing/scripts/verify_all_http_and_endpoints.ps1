# ==============================================================================
# Comprehensive Verification Script: HTTP Status Codes & Semantic REST Endpoints
# MakeMyTrip Full-Stack Platform
# ==============================================================================

$baseUrl = "http://localhost:8081"
$results = @()

function Test-Endpoint {
    param(
        [string]$Task,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [int]$ExpectedStatus,
        [string]$Description
    )
    
    $fullUrl = "$baseUrl$Url"
    $statusCode = 0
    $responseObj = $null
    $success = $false
    
    try {
        $params = @{
            Uri = $fullUrl
            Method = $Method
            UseBasicParsing = $true
        }
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
            $params["ContentType"] = "application/json"
        }
        
        $res = Invoke-WebRequest @params
        $statusCode = [int]$res.StatusCode
        if ($res.Content) {
            $responseObj = $res.Content | ConvertFrom-Json
        }
    } catch {
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        } else {
            $statusCode = 500
        }
    }
    
    $pass = ($statusCode -eq $ExpectedStatus)
    $statusText = if ($pass) { "PASS" } else { "FAIL" }
    
    $resultEntry = [PSCustomObject]@{
        Task = $Task
        Method = $Method
        Endpoint = $Url
        Expected = $ExpectedStatus
        Actual = $statusCode
        Status = $statusText
        Description = $Description
    }
    $script:results += $resultEntry
    
    Write-Host "[$statusText] $Task | $Method $Url -> Actual: $statusCode, Expected: $ExpectedStatus ($Description)"
    return $responseObj
}

Write-Host "`n======================================================="
Write-Host "RUNNING FULL REST ENDPOINT & HTTP STATUS CODE AUDIT"
Write-Host "=======================================================`n"

# ---------------- TASK 1: LIVE FLIGHT STATUS ----------------
Write-Host "--- Task 1: Flight Status & Radar ---"
Test-Endpoint -Task "Task 1" -Method "GET" -Url "/api/flights/status" -ExpectedStatus 200 -Description "Fetch all flight statuses via semantic alias"
Test-Endpoint -Task "Task 1" -Method "GET" -Url "/api/flight-status/AI-101" -ExpectedStatus 200 -Description "Fetch single flight status"
Test-Endpoint -Task "Task 1" -Method "GET" -Url "/api/flight-status/UNKNOWN-999" -ExpectedStatus 404 -Description "Non-existent flight status returns 404 Not Found"

# ---------------- TASK 2: DYNAMIC PRICING ENGINE ----------------
Write-Host "`n--- Task 2: Dynamic Pricing Engine ---"
$pricingBody = @{
    itemId = "FL-101"
    itemType = "FLIGHT"
    basePrice = 5000.0
    demandFactor = "HIGH"
    seasonality = "HOLIDAY"
    travelDate = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
}
Test-Endpoint -Task "Task 2" -Method "POST" -Url "/api/pricing/calculate" -Body $pricingBody -ExpectedStatus 200 -Description "Calculate dynamic surge price"

Test-Endpoint -Task "Task 2" -Method "GET" -Url "/api/pricing/history/FL-101?basePrice=5000" -ExpectedStatus 200 -Description "Get 7-day price history graph points"

$freezeBody = @{
    itemId = "FL-101"
    itemType = "FLIGHT"
    userId = "qa-user-semantic"
    userEmail = "semantic@test.com"
    frozenPrice = 6750.0
    originalPrice = 6750.0
    itemTitle = "AI-101 Deluxe"
}
$freezeRes = Test-Endpoint -Task "Task 2" -Method "POST" -Url "/api/pricing/freeze" -Body $freezeBody -ExpectedStatus 201 -Description "Freeze price creates lock (201 Created)"

if ($freezeRes -and $freezeRes.freezeId) {
    Test-Endpoint -Task "Task 2" -Method "GET" -Url "/api/pricing/freeze/$($freezeRes.freezeId)" -ExpectedStatus 200 -Description "Verify active freeze lock"
}
Test-Endpoint -Task "Task 2" -Method "GET" -Url "/api/pricing/freeze/FRZ-NON-EXISTENT" -ExpectedStatus 404 -Description "Invalid freeze ID returns 404 Not Found"

$couponBody = @{
    code = "INVALID99"
    amount = 5000.0
    category = "FLIGHT"
}
Test-Endpoint -Task "Task 2" -Method "POST" -Url "/api/pricing/apply-coupon" -Body $couponBody -ExpectedStatus 400 -Description "Invalid promo coupon rejected with 400 Bad Request"

# ---------------- TASK 3: CANCELLATION & REFUNDS ----------------
Write-Host "`n--- Task 3: Cancellation & Refunds ---"
Test-Endpoint -Task "Task 3" -Method "GET" -Url "/api/refunds/policy?amount=8000&hoursBeforeBooking=12" -ExpectedStatus 200 -Description "Predefined 24h 50% refund policy calculation"

# Create a sample user & booking first
$uniq = (Get-Random -Minimum 1000 -Maximum 9999)
$testUserBody = @{
    firstName = "Rest"
    lastName = "Tester"
    email = "rest.tester$uniq@test.com"
    phoneNumber = "9876543210"
    password = "password123"
}
$userRes = Test-Endpoint -Task "Task 3 (Prep)" -Method "POST" -Url "/api/users/signup" -Body $testUserBody -ExpectedStatus 201 -Description "Signup test user (201 Created)"
$userId = if ($userRes -and $userRes.id) { $userRes.id } else { "test-user-$uniq" }

# Create a real booking for this user
$bookingResp = Test-Endpoint -Task "Task 3 (Prep)" -Method "POST" -Url "/api/bookings/flight?userId=$userId&flightId=fl-101&seats=1&price=6000" -ExpectedStatus 201 -Description "Book flight for user (201 Created)"
$bookingId = if ($bookingResp -and $bookingResp.bookingId) { $bookingResp.bookingId } else { "BK-FL-$uniq" }

$cancelBody = @{
    bookingId = $bookingId
    userId = $userId
    userEmail = "rest.tester$uniq@test.com"
    bookingType = "FLIGHT"
    originalAmount = 6000.0
    cancellationReason = "Schedule Change"
}
$cancelRes = Test-Endpoint -Task "Task 3" -Method "POST" -Url "/api/refunds/cancel-and-request" -Body $cancelBody -ExpectedStatus 201 -Description "Cancel booking & file refund (201 Created)"

Test-Endpoint -Task "Task 3" -Method "POST" -Url "/api/refunds/cancel-and-request" -Body $cancelBody -ExpectedStatus 400 -Description "Duplicate cancellation rejected with 400 Bad Request"

Test-Endpoint -Task "Task 3" -Method "GET" -Url "/api/refunds/user/$userId" -ExpectedStatus 200 -Description "Fetch user refunds list via semantic path"

# ---------------- TASK 4: SEAT & ROOM SELECTION ----------------
Write-Host "`n--- Task 4: Seat & Room Selection ---"
Test-Endpoint -Task "Task 4" -Method "GET" -Url "/api/selections/seat-map/FL-101" -ExpectedStatus 200 -Description "Fetch Airbus A320 dynamic seat map"
Test-Endpoint -Task "Task 4" -Method "POST" -Url "/api/selection/reserve-seat?flightId=FL-101&seatNo=1B" -ExpectedStatus 409 -Description "Double booking occupied seat 1B returns 409 Conflict"
Test-Endpoint -Task "Task 4" -Method "GET" -Url "/api/selections/rooms/ht-101" -ExpectedStatus 200 -Description "Fetch hotel 4-tier room grid with 3D models"

$prefBody = @{
    userId = $userId
    userEmail = "rest.tester$uniq@test.com"
    preferredSeatType = "Window / Extra Legroom"
    preferredSeatNo = "1F"
    preferredRoomType = "Ocean View Premium Suite"
    preferredBedType = "Super King Suite Bed"
    preferredFloorView = "High Floor Ocean View"
}
Test-Endpoint -Task "Task 4" -Method "POST" -Url "/api/selections/preferences" -Body $prefBody -ExpectedStatus 201 -Description "Save user seat/room preferences (201 Created)"
Test-Endpoint -Task "Task 4" -Method "GET" -Url "/api/selections/preferences/$userId" -ExpectedStatus 200 -Description "Retrieve saved user preferences"

# ---------------- TASK 5: REVIEW & RATING SYSTEM ----------------
Write-Host "`n--- Task 5: Review & Rating System ---"
$reviewBody = @{
    targetId = "ht-101"
    targetType = "HOTEL"
    targetTitle = "The Grand Palace Hotel"
    userId = $userId
    userName = "Rest Tester"
    userEmail = "rest.tester$uniq@test.com"
    rating = 5
    title = "Exceptional ambience and service"
    comment = "The ocean view room was immaculate with excellent amenities."
    photoUrls = @("https://images.unsplash.com/photo-1582719478250-c89cae4dc85b")
}
$createdReview = Test-Endpoint -Task "Task 5" -Method "POST" -Url "/api/reviews" -Body $reviewBody -ExpectedStatus 201 -Description "Submit review with rating & photos (201 Created)"

if ($createdReview -and $createdReview.id) {
    $revId = $createdReview.id
    $replyBody = @{
        userId = "ht-manager-1"
        userName = "General Manager"
        comment = "Thank you for sharing your experience! We look forward to seeing you again."
    }
    Test-Endpoint -Task "Task 5" -Method "POST" -Url "/api/reviews/$revId/reply" -Body $replyBody -ExpectedStatus 201 -Description "Submit management reply to review (201 Created)"
    Test-Endpoint -Task "Task 5" -Method "POST" -Url "/api/reviews/$revId/helpful?userId=voter-1" -ExpectedStatus 200 -Description "Upvote review as helpful"
    Test-Endpoint -Task "Task 5" -Method "POST" -Url "/api/reviews/$revId/flag?userId=voter-2&reason=spam" -ExpectedStatus 200 -Description "Flag review for moderation"
}

$invalidReview = @{
    targetId = "ht-101"
    targetType = "HOTEL"
    rating = 6
    title = "Bad rating"
    comment = "Should fail"
}
Test-Endpoint -Task "Task 5" -Method "POST" -Url "/api/reviews" -Body $invalidReview -ExpectedStatus 400 -Description "Invalid rating > 5 rejected with 400 Bad Request"
Test-Endpoint -Task "Task 5" -Method "GET" -Url "/api/reviews?targetId=ht-101&targetType=HOTEL&sortBy=MOST_HELPFUL" -ExpectedStatus 200 -Description "Query reviews sorted by most helpful"

# ---------------- TASK 6: PERSONALIZED RECOMMENDATIONS ----------------
Write-Host "`n--- Task 6: Personalized Recommendations ---"
$allRecs = Test-Endpoint -Task "Task 6" -Method "GET" -Url "/api/recommendations?userId=$userId&category=ALL" -ExpectedStatus 200 -Description "Fetch personalized collaborative recommendations"
$sampleRecId = if ($allRecs -and $allRecs.Count -gt 0) { $allRecs[0].id } else { "rec-flight-FL-101" }
Test-Endpoint -Task "Task 6" -Method "GET" -Url "/api/recommendations/$sampleRecId" -ExpectedStatus 200 -Description "Fetch recommendation by dynamic ID with reasoning"
Test-Endpoint -Task "Task 6" -Method "GET" -Url "/api/recommendations/rec-unknown-999" -ExpectedStatus 404 -Description "Non-existent recommendation returns 404 Not Found"

# ---------------- CORE ENTITIES & AUTH ----------------
Write-Host "`n--- Core Entities & Semantic Aliases ---"
Test-Endpoint -Task "Core" -Method "GET" -Url "/api/flights" -ExpectedStatus 200 -Description "Fetch all flights via RESTful /api/flights"
Test-Endpoint -Task "Core" -Method "GET" -Url "/api/hotels" -ExpectedStatus 200 -Description "Fetch all hotels via RESTful /api/hotels"
Test-Endpoint -Task "Core" -Method "GET" -Url "/api/bookings/user/$userId" -ExpectedStatus 200 -Description "Fetch user bookings via /api/bookings/user/{id}"

$badLogin = @{
    email = "rest.tester$uniq@test.com"
    password = "WRONG_PASSWORD"
}
Test-Endpoint -Task "Core Auth" -Method "POST" -Url "/api/users/login" -Body $badLogin -ExpectedStatus 401 -Description "Invalid password rejected with 401 Unauthorized"

Write-Host "`n======================================================="
Write-Host "AUDIT SUMMARY"
Write-Host "======================================================="
$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $results.Count

Write-Host "TOTAL TESTS : $totalCount"
Write-Host "PASSED      : $passCount"
Write-Host "FAILED      : $failCount"

if ($failCount -eq 0) {
    Write-Host "`nALL HTTP STATUS CODES & SEMANTIC REST URLS VERIFIED 100% SUCCESSFULLY!`n" -ForegroundColor Green
} else {
    Write-Host "`nWARNING: $failCount test(s) failed!`n" -ForegroundColor Red
}
