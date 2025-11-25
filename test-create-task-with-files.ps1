# Test creating task with multiple files and email notification

Write-Host "🧪 Testing Task Creation with Files + Email Notification" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as admin
Write-Host "Step 1: Login as admin..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"email":"admin@example.com","password":"adminpassword"}'

Write-Host "✅ Logged in as: $($loginResponse.email) (Role: $($loginResponse.role))" -ForegroundColor Green
Write-Host ""

# Step 2: Get all users to find assignee
Write-Host "Step 2: Getting users..." -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "http://localhost:4000/api/users" -Method Get

$assignee = $users | Where-Object { $_.role -eq 'user' } | Select-Object -First 1
Write-Host "✅ Found assignee: $($assignee.email)" -ForegroundColor Green
Write-Host ""

# Step 3: Create test files
Write-Host "Step 3: Creating test files..." -ForegroundColor Yellow

$file1Path = "test-attachment-1.txt"
$file2Path = "test-attachment-2.txt"

"This is test attachment file 1 for the task.`nContains important project requirements." | Out-File -FilePath $file1Path -Encoding UTF8
"This is test attachment file 2 for the task.`nContains design specifications." | Out-File -FilePath $file2Path -Encoding UTF8

Write-Host "✅ Created test files: $file1Path, $file2Path" -ForegroundColor Green
Write-Host ""

# Step 4: Create task with multiple files
Write-Host "Step 4: Creating task with files (will upload to Cloudinary)..." -ForegroundColor Yellow

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

# Build multipart form data
$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"title`"$LF",
    "Complete Q4 Marketing Campaign",
    "--$boundary",
    "Content-Disposition: form-data; name=`"description`"$LF",
    "Please review the attached files and complete the marketing campaign for Q4. This includes social media strategy and content calendar.",
    "--$boundary",
    "Content-Disposition: form-data; name=`"assignee_id`"$LF",
    "$($assignee.user_id)",
    "--$boundary",
    "Content-Disposition: form-data; name=`"assigner_id`"$LF",
    "$($loginResponse.user_id)",
    "--$boundary",
    "Content-Disposition: form-data; name=`"priority`"$LF",
    "2",
    "--$boundary",
    "Content-Disposition: form-data; name=`"deadline`"$LF",
    "$(Get-Date (Get-Date).AddDays(3) -Format 'yyyy-MM-ddTHH:mm:ss.fffZ')",
    "--$boundary",
    "Content-Disposition: form-data; name=`"attachments`"; filename=`"$file1Path`"",
    "Content-Type: text/plain$LF",
    (Get-Content $file1Path -Raw),
    "--$boundary",
    "Content-Disposition: form-data; name=`"attachments`"; filename=`"$file2Path`"",
    "Content-Type: text/plain$LF",
    (Get-Content $file2Path -Raw),
    "--$boundary--$LF"
)

$body = $bodyLines -join $LF

try {
    $taskResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/tasks" `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body

    Write-Host "✅ Task created successfully!" -ForegroundColor Green
    Write-Host "   Task ID: $($taskResponse.id_task)" -ForegroundColor Cyan
    Write-Host "   Title: $($taskResponse.title)" -ForegroundColor Cyan
    Write-Host "   Status: $($taskResponse.status)" -ForegroundColor Cyan
    Write-Host "   Files attached: $($taskResponse.attachment_ids.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📧 Email notification sent to: $($assignee.email)" -ForegroundColor Magenta
    Write-Host "   Check the email inbox for task assignment notification!" -ForegroundColor Magenta
    Write-Host ""
    
    # Get file details
    if ($taskResponse.attachment_ids.Count -gt 0) {
        Write-Host "📎 Uploaded files (on Cloudinary):" -ForegroundColor Yellow
        $files = Invoke-RestMethod -Uri "http://localhost:4000/api/files" -Method Get
        
        foreach ($fileId in $taskResponse.attachment_ids) {
            $file = $files | Where-Object { $_.id_file -eq $fileId }
            if ($file) {
                Write-Host "   - $($file.name): $($file.url)" -ForegroundColor Cyan
            }
        }
    }
    
} catch {
    Write-Host "❌ Error creating task: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response
}

# Cleanup
Write-Host ""
Write-Host "Cleaning up test files..." -ForegroundColor Yellow
Remove-Item $file1Path -ErrorAction SilentlyContinue
Remove-Item $file2Path -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host "📧 Now check email: $($assignee.email)" -ForegroundColor Magenta
