# Test 1: Fetch seat map for a flight
$flightId = 'FL-101'
$seatMap = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/seatmap/$flightId"
Write-Host "SeatMap Aircraft: $($seatMap.aircraftType), Rows: $($seatMap.totalRows), Total Seats: $($seatMap.seats.Count)"

# Test 2: Double booking test on an already OCCUPIED seat (e.g. 1B or 5A)
try {
    Invoke-RestMethod -Uri "http://localhost:8081/api/selection/reserve-seat?flightId=$flightId&seatNo=1B" -Method POST
    Write-Host "FAILED: Reserving occupied seat 1B did not fail!"
} catch {
    Write-Host "PASSED: Seat 1B double-booking rejected with error: $($_.Exception.Message)"
}

# Test 3: Hotel room-type grid
$hotelId = 'ht-101'
$rooms = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/hotel-rooms/$hotelId"
Write-Host "Hotel Room Tiers Count: $($rooms.Count)"
foreach ($r in $rooms) {
    Write-Host "  -> Tier: $($r.roomTypeName) | Addon: +Rs $($r.priceUpgradeAddon) | 3D Tour: $($r.preview3dModelUrl)"
}

# Test 4: Save User Preference
$prefBody = @{
    userId = 'usr-trainer-test'
    userEmail = 'trainer@test.com'
    preferredSeatType = 'Window / Extra Legroom'
    preferredSeatNo = '1F'
    preferredRoomType = 'Ocean View Premium Suite'
    preferredBedType = 'Super King Suite Bed'
    preferredFloorView = 'High Floor Ocean View'
} | ConvertTo-Json

$savedPref = Invoke-RestMethod -Uri 'http://localhost:8081/api/selection/preferences' -Method POST -Body $prefBody -ContentType 'application/json'
Write-Host "SAVED PREF FOR: $($savedPref.userId), Seat: $($savedPref.preferredSeatNo), Room: $($savedPref.preferredRoomType)"

# Test 5: Retrieve User Preference
$retrievedPref = Invoke-RestMethod -Uri "http://localhost:8081/api/selection/preferences/$($savedPref.userId)"
Write-Host "RETRIEVED PREF MATCH: $($retrievedPref.preferredSeatNo -eq '1F' -and $retrievedPref.preferredRoomType -eq 'Ocean View Premium Suite')"
