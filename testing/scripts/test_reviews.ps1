$body = @{
    targetId = 'ht-101'
    targetType = 'HOTEL'
    targetTitle = 'The Grand Palace Hotel'
    userId = 'usr-test-1'
    userName = 'Priya Sharma'
    userEmail = 'priya@example.com'
    rating = 5
    title = 'Exceptional stay and world-class hospitality'
    comment = 'The ocean view deluxe room was spotless, the breakfast buffet was lavish, and the staff was extremely courteous.'
    photoUrls = @('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b')
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri 'http://localhost:8081/api/reviews' -Method POST -Body $body -ContentType 'application/json'
Write-Host "CREATED REVIEW ID: $($created.id)"

$replyBody = @{
    userId = 'usr-test-2'
    userName = 'Hotel General Manager'
    comment = 'Dear Priya, thank you for your warm words. We look forward to welcoming you back!'
} | ConvertTo-Json
$withReply = Invoke-RestMethod -Uri "http://localhost:8081/api/reviews/$($created.id)/reply" -Method POST -Body $replyBody -ContentType 'application/json'
Write-Host "REPLY COUNT: $($withReply.replies.Count)"

$helpful = Invoke-RestMethod -Uri "http://localhost:8081/api/reviews/$($created.id)/helpful?userId=usr-voter-1" -Method POST
Write-Host "HELPFUL COUNT: $($helpful.helpfulCount)"

$flagged = Invoke-RestMethod -Uri "http://localhost:8081/api/reviews/$($created.id)/flag?userId=usr-voter-2&reason=Inappropriate+content" -Method POST
Write-Host "IS FLAGGED: $($flagged.flagged)"

$moderationQueue = Invoke-RestMethod -Uri 'http://localhost:8081/api/reviews/moderation/flagged'
Write-Host "MODERATION QUEUE COUNT: $($moderationQueue.Count)"

$dismissRes = Invoke-RestMethod -Uri "http://localhost:8081/api/reviews/moderation/$($created.id)/action?action=DISMISS" -Method POST
Write-Host "MODERATION ACTION: $($dismissRes.action) - $($dismissRes.message)"

$summary = Invoke-RestMethod -Uri 'http://localhost:8081/api/reviews?targetId=ht-101&targetType=HOTEL'
Write-Host "SUMMARY TOTAL COUNT: $($summary.totalCount), AVG RATING: $($summary.averageRating), PHOTOS: $($summary.photoCount)"
