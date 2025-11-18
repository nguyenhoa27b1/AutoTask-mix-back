# Test: Create a task with description file attachment
$base = 'http://127.0.0.1:4000/api'

Write-Output "Testing task creation with description file..."

# Create test files
$testFile1 = Join-Path $PWD 'test-description.txt'
"This is a description file for the task" | Out-File -FilePath $testFile1 -Encoding utf8

$testFile2 = Join-Path $PWD 'test-description2.txt'
"Another task description" | Out-File -FilePath $testFile2 -Encoding utf8

# Login
Write-Output "1. Logging in..."
$loginResp = Invoke-RestMethod -Uri "$base/login" -Method Post -ContentType 'application/json' -Body (ConvertTo-Json @{ email='admin@example.com'; password='adminpassword' })
$user = $loginResp.user
$authToken = $loginResp.token
Write-Output "   Logged in as: $($user.name)"

# Test 1: Create task WITHOUT file (verify backward compatibility)
Write-Output ""
Write-Output "2. Creating task WITHOUT description file..."
$task1Resp = Invoke-RestMethod -Uri "$base/tasks" -Method Post -ContentType 'application/json' -Body (ConvertTo-Json @{
    title = "Task without file"
    description = "No file attached"
    deadline = (Get-Date).AddDays(1).ToString('o')
    priority = 2
    assignee_id = $user.user_id
    assigner_id = $user.user_id
    status = 'Pending'
})
Write-Output "   Created task ID: $($task1Resp.id_task), id_file: $($task1Resp.id_file)"

# Test 2: Create task WITH file
Write-Output ""
Write-Output "3. Creating task WITH description file..."
$deadline2 = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
$curlArgs = @(
    '-s', '-S',
    '-F', "title=Task with description file",
    '-F', "description=This task has a description file attached",
    '-F', "deadline=$deadline2",
    '-F', "priority=2",
    '-F', "assignee_id=$($user.user_id)",
    '-F', "assigner_id=$($user.user_id)",
    '-F', "status=Pending",
    '-F', "file=@$testFile1",
    '-H', "Authorization: Bearer $authToken",
    "$base/tasks",
    '-o', (Join-Path $PWD 'task-create-resp.json')
)
& curl.exe @curlArgs
$task2Raw = Get-Content -Raw -LiteralPath (Join-Path $PWD 'task-create-resp.json')
$task2Resp = $task2Raw | ConvertFrom-Json
Write-Output "   Created task ID: $($task2Resp.id_task), id_file: $($task2Resp.id_file)"

if ($task2Resp.id_file) {
    Write-Output "   OK: Description file was saved (id_file=$($task2Resp.id_file))"
} else {
    Write-Output "   FAILED: Description file was NOT saved"
}

# Test 3: Get all tasks and verify they appear
Write-Output ""
Write-Output "4. Fetching all tasks..."
$allTasks = Invoke-RestMethod -Uri "$base/tasks" -Method Get
Write-Output "   Total tasks: $($allTasks.Count)"
$allTasks | ForEach-Object {
    $fileInfo = if ($_.id_file) { "with file ($($_.id_file))" } else { "no file" }
    Write-Output "   - Task $($_.id_task): '$($_.title)' [$fileInfo]"
}

# Test 4: Get all files and verify the description file was persisted
Write-Output ""
Write-Output "5. Fetching all files..."
$allFiles = Invoke-RestMethod -Uri "$base/files" -Method Get
Write-Output "   Total files: $($allFiles.Count)"
$allFiles | ForEach-Object {
    Write-Output "   - File $($_.id_file): $($_.name) (user $($_.id_user))"
}

Write-Output ""
Write-Output "Test complete."

