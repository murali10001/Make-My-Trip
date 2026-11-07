# Test invalid rating (e.g. 6 stars or 0 stars)
try {
    $badRating = @{
        targetId = 'ht-101'
        targetType = 'HOTEL'
        rating = 6
        title = 'Invalid'
        comment = 'Testing bad rating'
    } | ConvertTo-Json
    Invoke-RestMethod -Uri 'http://localhost:8081/api/reviews' -Method POST -Body $badRating -ContentType 'application/json'
    Write-Host "FAILED: Rating 6 did not throw error!"
} catch {
    Write-Host "PASSED: Rating 6 rejected with error: $($_.Exception.Message)"
}

# Test empty targetId
try {
    $badTarget = @{
        targetId = ''
        targetType = 'HOTEL'
        rating = 4
        title = 'No target'
        comment = 'Missing target ID'
    } | ConvertTo-Json
    Invoke-RestMethod -Uri 'http://localhost:8081/api/reviews' -Method POST -Body $badTarget -ContentType 'application/json'
    Write-Host "FAILED: Empty targetId did not throw error!"
} catch {
    Write-Host "PASSED: Empty targetId rejected with error: $($_.Exception.Message)"
}

# Test empty comment
try {
    $badComment = @{
        targetId = 'ht-101'
        targetType = 'HOTEL'
        rating = 4
        title = 'Valid Title'
        comment = ''
    } | ConvertTo-Json
    Invoke-RestMethod -Uri 'http://localhost:8081/api/reviews' -Method POST -Body $badComment -ContentType 'application/json'
    Write-Host "FAILED: Empty comment did not throw error!"
} catch {
    Write-Host "PASSED: Empty comment rejected with error: $($_.Exception.Message)"
}

# Test non-existent review reply
try {
    $badReply = @{
        comment = 'Reply to nothing'
    } | ConvertTo-Json
    Invoke-RestMethod -Uri 'http://localhost:8081/api/reviews/non-existent-999/reply' -Method POST -Body $badReply -ContentType 'application/json'
    Write-Host "FAILED: Reply to non-existent review did not throw error!"
} catch {
    Write-Host "PASSED: Reply to non-existent review rejected with error: $($_.Exception.Message)"
}
