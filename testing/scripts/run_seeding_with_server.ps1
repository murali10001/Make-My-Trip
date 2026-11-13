# ==============================================================================
# Helper Script: Ensure Backend is Running & Execute Admin Flight Seeding
# ==============================================================================

$baseUrl = "http://localhost:8081"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Checking if Spring Boot Backend is active on port 8081..." -ForegroundColor Cyan

$serverRunning = $false
try {
    $resp = Invoke-WebRequest -Uri "$baseUrl/" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
        $serverRunning = $true
        Write-Host "Spring Boot backend is ALREADY running on port 8081!" -ForegroundColor Green
    }
} catch {
    Write-Host "Backend is not currently running. Starting Spring Boot..." -ForegroundColor Yellow
}

$proc = $null
if (-not $serverRunning) {
    # Start Spring Boot in a separate background process
    $proc = Start-Process -FilePath "mvn.cmd" -ArgumentList "spring-boot:run" -PassThru -NoNewWindow
    Write-Host "Launched Spring Boot with PID: $($proc.Id). Waiting for port 8081 readiness..." -ForegroundColor Yellow
    
    $attempts = 0
    $maxAttempts = 40
    while ($attempts -lt $maxAttempts -and -not $serverRunning) {
        Start-Sleep -Seconds 2
        $attempts++
        try {
            $resp = Invoke-WebRequest -Uri "$baseUrl/" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -eq 200) {
                $serverRunning = $true
                Write-Host "Spring Boot backend is now READY on port 8081! (Took ~ $($attempts * 2) seconds)" -ForegroundColor Green
                break
            }
        } catch {
            Write-Host -NoNewline "."
        }
    }
}

if (-not $serverRunning) {
    Write-Host "`nFailed to connect to Spring Boot backend after waiting." -ForegroundColor Red
    exit 1
}

# Run the seeding script
Write-Host "`nExecuting Flight Seeder via Admin API..." -ForegroundColor Cyan
& "$scriptDir\seed_flights_all_cities.ps1" -BaseUrl $baseUrl

# Run verification checks on sample routes
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "Sample Route Search Verifications via GET /flight?from=...&to=..." -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$samplePairs = @(
    @("Delhi", "Mumbai"),
    @("Bengaluru", "Kolkata"),
    @("Goa", "Chennai"),
    @("Hyderabad", "Ahmedabad"),
    @("Kochi", "Pune"),
    @("Jaipur", "Lucknow"),
    @("Mumbai", "Goa")
)

foreach ($pair in $samplePairs) {
    $from = $pair[0]
    $to = $pair[1]
    try {
        $url = "$baseUrl/flight?from=$from&to=$to"
        $results = Invoke-RestMethod -Uri $url -Method GET -ErrorAction Stop
        if ($results.Count -gt 0) {
            $f = $results[0]
            Write-Host "[VERIFIED] $from -> $to : Found $($results.Count) flight(s) | Sample: $($f.flightName) ($($f.departureTime) - $($f.arrivalTime)) Rs $($f.price)" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] $from -> $to : No flights found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] $from -> $to : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nAll operations completed successfully!" -ForegroundColor Green

