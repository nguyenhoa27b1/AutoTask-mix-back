# Test Upload Description Files to Cloudinary

Write-Host "🧪 Testing Description File Upload to Cloudinary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Test credentials
$email = "admin@gmail.com"
$password = "admin123"
$baseUrl = "http://localhost:4000/api"

Write-Host "📌 Step 1: Login to get auth token..." -ForegroundColor Yellow

try {
    $loginBody = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResponse.token
    Write-Host "✅ Login successful! Token: $($token.Substring(0,20))..." -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Create test files
Write-Host "📌 Step 2: Creating test files..." -ForegroundColor Yellow

$testFile1 = Join-Path $env:TEMP "test-file-1.txt"
$testFile2 = Join-Path $env:TEMP "test-file-2.txt"
$testFile3 = Join-Path $env:TEMP "test-file-3.pdf"

"This is test file 1 for description upload" | Out-File -FilePath $testFile1 -Encoding UTF8
"This is test file 2 for description upload" | Out-File -FilePath $testFile2 -Encoding UTF8
"Mock PDF content for testing" | Out-File -FilePath $testFile3 -Encoding UTF8

Write-Host "✅ Created 3 test files:" -ForegroundColor Green
Write-Host "   - $testFile1" -ForegroundColor Gray
Write-Host "   - $testFile2" -ForegroundColor Gray
Write-Host "   - $testFile3" -ForegroundColor Gray
Write-Host ""

# Create task with multiple files
Write-Host "📌 Step 3: Creating task with 3 description files..." -ForegroundColor Yellow

try {
    # Build multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    # Start multipart body
    $bodyLines = @()
    
    # Add task data fields
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"title`"$LF"
    $bodyLines += "Test Task with Multiple Files"
    
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"description`"$LF"
    $bodyLines += "Testing multiple file upload to Cloudinary autotask-descriptions folder"
    
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"deadline`"$LF"
    $bodyLines += (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"priority`"$LF"
    $bodyLines += "2"
    
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"assignee_id`"$LF"
    $bodyLines += "1"
    
    # Add file 1
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"attachments`"; filename=`"test-file-1.txt`""
    $bodyLines += "Content-Type: text/plain$LF"
    $bodyLines += (Get-Content $testFile1 -Raw)
    
    # Add file 2
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"attachments`"; filename=`"test-file-2.txt`""
    $bodyLines += "Content-Type: text/plain$LF"
    $bodyLines += (Get-Content $testFile2 -Raw)
    
    # Add file 3
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"attachments`"; filename=`"test-file-3.pdf`""
    $bodyLines += "Content-Type: application/pdf$LF"
    $bodyLines += (Get-Content $testFile3 -Raw)
    
    # End boundary
    $bodyLines += "--$boundary--$LF"
    
    $body = $bodyLines -join $LF
    
    Write-Host "📤 Sending request with FormData..." -ForegroundColor Gray
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/tasks" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ Task created successfully!" -ForegroundColor Green
    Write-Host "   Task ID: $($response.id_task)" -ForegroundColor Gray
    Write-Host "   Title: $($response.title)" -ForegroundColor Gray
    Write-Host "   Attachments: $($response.attachment_ids.Count) files" -ForegroundColor Gray
    
    if ($response.attachment_ids.Count -eq 3) {
        Write-Host "✅ All 3 files uploaded successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Expected 3 files, got $($response.attachment_ids.Count)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "📁 Cloudinary folder: autotask-descriptions" -ForegroundColor Cyan
    Write-Host "🔗 Check files at: https://console.cloudinary.com/pm/c-dfz1ielsb/media-explorer/autotask-descriptions" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Task creation failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

# Cleanup
Write-Host ""
Write-Host "🧹 Cleaning up test files..." -ForegroundColor Yellow
Remove-Item $testFile1 -ErrorAction SilentlyContinue
Remove-Item $testFile2 -ErrorAction SilentlyContinue
Remove-Item $testFile3 -ErrorAction SilentlyContinue
Write-Host "✅ Test completed!" -ForegroundColor Green
