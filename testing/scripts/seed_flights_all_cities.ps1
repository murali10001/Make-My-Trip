# ==============================================================================
# Seed Flight Data for Each City to All Cities using Admin API Call
# Endpoint: POST http://localhost:8081/admin/flight
# ==============================================================================

param(
    [string]$BaseUrl = "http://localhost:8081",
    [switch]$ForceOverwrite = $false
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "     MakeMyTrip Admin API - All-City Flight Seeder" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Define Cities with Codes, Coordinates (for realistic duration/fare), and Terminals
$cities = @(
    @{ name = "Delhi (DEL)";      city = "Delhi";     code = "DEL"; lat = 28.6139; lon = 77.2090; terminals = @("T1", "T2", "T3") },
    @{ name = "Mumbai (BOM)";     city = "Mumbai";    code = "BOM"; lat = 19.0760; lon = 72.8777; terminals = @("T1", "T2") },
    @{ name = "Bengaluru (BLR)";  city = "Bengaluru"; code = "BLR"; lat = 12.9716; lon = 77.5946; terminals = @("T1", "T2") },
    @{ name = "Goa (GOI)";        city = "Goa";       code = "GOI"; lat = 15.2993; lon = 74.1240; terminals = @("T1") },
    @{ name = "Kolkata (CCU)";    city = "Kolkata";   code = "CCU"; lat = 22.5726; lon = 88.3639; terminals = @("T1", "T2") },
    @{ name = "Chennai (MAA)";    city = "Chennai";   code = "MAA"; lat = 13.0827; lon = 80.2707; terminals = @("T1", "T4") },
    @{ name = "Hyderabad (HYD)";  city = "Hyderabad"; code = "HYD"; lat = 17.3850; lon = 78.4867; terminals = @("T1") },
    @{ name = "Pune (PNQ)";       city = "Pune";      code = "PNQ"; lat = 18.5204; lon = 73.8567; terminals = @("T1") },
    @{ name = "Ahmedabad (AMD)";  city = "Ahmedabad"; code = "AMD"; lat = 23.0225; lon = 72.5714; terminals = @("T1", "T2") },
    @{ name = "Kochi (COK)";      city = "Kochi";     code = "COK"; lat = 9.9312;  lon = 76.2673; terminals = @("T1", "T3") },
    @{ name = "Jaipur (JAI)";     city = "Jaipur";    code = "JAI"; lat = 26.9124; lon = 75.7873; terminals = @("T1", "T2") },
    @{ name = "Lucknow (LKO)";    city = "Lucknow";   code = "LKO"; lat = 26.8467; lon = 80.9462; terminals = @("T1", "T2", "T3") }
)

# Supported Airlines with flight prefixes and fleet
$airlines = @(
    @{ name = "IndiGo";    prefix = "6E"; fleet = @("Airbus A320neo", "Airbus A321neo") },
    @{ name = "Air India"; prefix = "AI"; fleet = @("Airbus A320neo", "Boeing 787-8 Dreamliner", "Airbus A350-900") },
    @{ name = "Vistara";   prefix = "UK"; fleet = @("Airbus A320neo", "Boeing 787-9 Dreamliner") },
    @{ name = "SpiceJet";  prefix = "SG"; fleet = @("Boeing 737-800", "Boeing 737 MAX 8") },
    @{ name = "Akasa Air"; prefix = "QP"; fleet = @("Boeing 737 MAX 8") }
)

# Function to calculate Great Circle distance in km between two lat/lon pairs
function Get-DistanceKm($lat1, $lon1, $lat2, $lon2) {
    $r = 6371.0 # Earth's radius in km
    $dLat = ($lat2 - $lat1) * [Math]::PI / 180.0
    $dLon = ($lon2 - $lon1) * [Math]::PI / 180.0
    $a = [Math]::Sin($dLat / 2) * [Math]::Sin($dLat / 2) +
         [Math]::Cos($lat1 * [Math]::PI / 180.0) * [Math]::Cos($lat2 * [Math]::PI / 180.0) *
         [Math]::Sin($dLon / 2) * [Math]::Sin($dLon / 2)
    $c = 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1 - $a))
    return [Math]::Round($r * $c)
}

# Function to calculate duration string and arrival time
function Get-FlightTimes($depTimeStr, $durationMinutes) {
    $depDt = [DateTime]::ParseExact($depTimeStr, "hh:mm tt", [System.Globalization.CultureInfo]::InvariantCulture)
    $arrDt = $depDt.AddMinutes($durationMinutes)
    $hours = [Math]::Floor($durationMinutes / 60)
    $mins = $durationMinutes % 60
    $durationStr = "${hours}h ${mins}m"
    $arrTimeStr = $arrDt.ToString("hh:mm tt")
    return @{
        Duration = $durationStr
        ArrivalTime = $arrTimeStr
    }
}

# Standard departure time slots throughout the day
$timeSlots = @("06:00 AM", "07:15 AM", "08:30 AM", "10:00 AM", "11:45 AM", "01:15 PM", "03:00 PM", "04:45 PM", "06:30 PM", "08:15 PM", "09:45 PM")

# 1. Verify Backend Connectivity
Write-Host "`n[1/4] Checking Backend Connectivity at $BaseUrl..." -ForegroundColor Yellow
$backendReady = $false
try {
    $testResp = Invoke-WebRequest -Uri "$BaseUrl/" -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($testResp.StatusCode -eq 200) {
        $backendReady = $true
        Write-Host " -> Backend is ONLINE: $($testResp.Content.Trim())" -ForegroundColor Green
    }
} catch {
    Write-Host " -> Backend is not reachable at $BaseUrl" -ForegroundColor Red
}

if (-not $backendReady) {
    Write-Host "`nBackend service must be running on port 8081 before seeding." -ForegroundColor Red
    Write-Host "Please start the backend using: mvn spring-boot:run" -ForegroundColor Yellow
    exit 1
}

# 2. Fetch Existing Flights to avoid duplicates
Write-Host "`n[2/4] Fetching existing flights from database..." -ForegroundColor Yellow
$existingMap = @{}
try {
    $existingList = Invoke-RestMethod -Uri "$BaseUrl/flight" -Method GET -ErrorAction Stop
    Write-Host " -> Found $($existingList.Count) existing flight(s) in database." -ForegroundColor Cyan
    foreach ($ef in $existingList) {
        if ($ef.from -and $ef.to) {
            $key = "$($ef.from.Trim().ToLower())-->$($ef.to.Trim().ToLower())-->$($ef.flightNo)"
            $existingMap[$key] = $true
            # Also key by from->to to know if route has any flight
            $routeKey = "$($ef.from.Trim().ToLower())-->$($ef.to.Trim().ToLower())"
            $existingMap[$routeKey] = $true
        }
    }
} catch {
    Write-Host " -> Could not query existing flights, will proceed with direct admin seeding." -ForegroundColor Gray
}

# 3. Generate and Post Flight Data for Each City to All Other Cities
Write-Host "`n[3/4] Generating & Posting Flight Data (Each City -> All Cities)..." -ForegroundColor Yellow
$totalRoutes = $cities.Count * ($cities.Count - 1)
Write-Host "Total City Pairs: $($cities.Count) cities x $($cities.Count - 1) destinations = $totalRoutes routes" -ForegroundColor Cyan

$successCount = 0
$skippedCount = 0
$failedCount = 0
$seedIndex = 100

for ($i = 0; $i -lt $cities.Count; $i++) {
    $origin = $cities[$i]
    
    for ($j = 0; $j -lt $cities.Count; $j++) {
        if ($i -eq $j) { continue } # Skip same city to same city
        
        $dest = $cities[$j]
        $routeKey = "$($origin.name.Trim().ToLower())-->$($dest.name.Trim().ToLower())"
        
        # Determine airline and aircraft based on deterministic rotation
        $seedIndex++
        $airlineObj = $airlines[$seedIndex % $airlines.Count]
        $flightNum = "$($airlineObj.prefix)-$($seedIndex + 100)"
        $aircraft = $airlineObj.fleet[$seedIndex % $airlineObj.fleet.Count]
        
        # Calculate distance, duration, price
        $dist = Get-DistanceKm $origin.lat $origin.lon $dest.lat $dest.lon
        # Duration: ~720 km/h flight speed + 30 min ground/taxi/approach
        $durationMinutes = [Math]::Max(50, [Math]::Round(($dist / 720.0) * 60 + 30))
        $depTime = $timeSlots[($i * 3 + $j) % $timeSlots.Count]
        $timeInfo = Get-FlightTimes $depTime $durationMinutes
        
        # Price: Base fare proportional to distance + rounding
        $baseFare = [Math]::Round((2800 + ($dist * 2.45)) / 50) * 50
        $taxes = [Math]::Round(($baseFare * 0.12) / 10) * 10
        $otherServices = 150.0
        $discounts = 200.0
        $availableSeats = 120 + (($seedIndex * 7) % 61) # 120 to 180 seats
        
        $depTerminal = $origin.terminals[$seedIndex % $origin.terminals.Count]
        $arrTerminal = $dest.terminals[($seedIndex + 1) % $dest.terminals.Count]
        
        # Skip if already exists and not forcing
        if ($existingMap.ContainsKey($routeKey) -and -not $ForceOverwrite) {
            $skippedCount++
            continue
        }
        
        # Construct payload matching Flight model
        $flightPayload = @{
            flightName        = "$($airlineObj.name) $flightNum"
            flightNo          = $flightNum
            airline           = $airlineObj.name
            from              = $origin.name
            to                = $dest.name
            departureTime     = $depTime
            arrivalTime       = $timeInfo.ArrivalTime
            duration          = $timeInfo.Duration
            price             = [double]$baseFare
            availableSeats    = [int]$availableSeats
            aircraft          = $aircraft
            departureTerminal = $depTerminal
            arrivalTerminal   = $arrTerminal
            cabinBaggage      = "7 Kgs / Adult"
            checkInBaggage    = "15 Kgs (1 piece only) / Adult"
            taxes             = [double]$taxes
            otherServices     = [double]$otherServices
            discounts         = [double]$discounts
        }
        
        $jsonBody = $flightPayload | ConvertTo-Json -Depth 5
        
        # Call Admin API POST /admin/flight
        try {
            $adminApiUrl = "$BaseUrl/admin/flight"
            $postResp = Invoke-RestMethod -Uri $adminApiUrl -Method POST -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
            $successCount++
            Write-Host " [CREATED] $($origin.code) -> $($dest.code) | $($airlineObj.name) $flightNum | $depTime - $($timeInfo.ArrivalTime) | Rs $baseFare" -ForegroundColor Green
        } catch {
            # Try alternate semantic endpoint /api/admin/flight
            try {
                $altUrl = "$BaseUrl/api/admin/flight"
                $postResp = Invoke-RestMethod -Uri $altUrl -Method POST -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
                $successCount++
                Write-Host " [CREATED via /api/admin/flight] $($origin.code) -> $($dest.code) | $($airlineObj.name) $flightNum" -ForegroundColor Green
            } catch {
                $failedCount++
                Write-Host " [FAILED] $($origin.name) -> $($dest.name): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

# 4. Verification Summary
Write-Host "`n[4/4] Admin Seeding Summary" -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Total Target Routes:  $totalRoutes" -ForegroundColor Cyan
Write-Host "Successfully Created: $successCount" -ForegroundColor Green
Write-Host "Existing / Skipped:   $skippedCount" -ForegroundColor Yellow
Write-Host "Failed:               $failedCount" -ForegroundColor $(if ($failedCount -eq 0) { "Green" } else { "Red" })

# Verify total count in database
try {
    $allFinal = Invoke-RestMethod -Uri "$BaseUrl/flight" -Method GET
    Write-Host "Total Flights Currently in Database: $($allFinal.Count)" -ForegroundColor Green
} catch {
    Write-Host "Could not query final flight count: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Seeding process complete!" -ForegroundColor Cyan

