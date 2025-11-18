# End-to-end test: create task -> submit file -> verify scoring and file listing
$base = 'http://127.0.0.1:4000/api'

# helper to POST JSON and return parsed object
function Post-Json($url, $obj) {
    $body = $obj | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $body
}

# ensure test file exists
$uploadFile = Join-Path $PWD 'e2e-test-file.txt'
"This is a test upload" | Out-File -FilePath $uploadFile -Encoding utf8

# login (no auth token required by server for operation but we follow flow)
Write-Output "Logging in as admin..."
try {
    $loginResp = Post-Json "$base/login" @{ email='admin@example.com'; password='adminpassword' }
    # server returns { user, token }
    $login = $loginResp.user
    $authToken = $loginResp.token
    Write-Output ("Logged in: {0} ({1})" -f $login.name, $login.email)
} catch {
    Write-Error "Login failed: $_"
    exit 1
}

$testCases = @(
    @{ name='BEFORE'; offset=5; expected=1 },
    @{ name='ON'; offset=0; expected=0 },
    @{ name='AFTER'; offset=-1; expected=-1 }
)

$index = 1
foreach ($tc in $testCases) {
    Write-Output ""
    Write-Output ("=== Test {0}: {1} ===" -f $index, $tc.name)
    $deadline = (Get-Date).AddDays($tc.offset).ToString('yyyy-MM-dd')
    $taskPayload = @{
        title = "E2E Task $index - $($tc.name)"
        description = "E2E test"
        priority = 2
        deadline = $deadline
        id_user = $login.user_id
        status = 'In Progress'
    }
    $task = Post-Json "$base/tasks" $taskPayload
    Write-Output ("Created task id: {0} deadline: {1}" -f $task.id_task, $task.deadline)

    # upload file using curl (multipart) to the API submit endpoint
    $submitUrl = "http://127.0.0.1:4000/api/tasks/$($task.id_task)/submit"
    Write-Output "Submitting file to $submitUrl"
    # Use curl.exe to avoid PowerShell alias to Invoke-WebRequest
    $tmpOut = Join-Path $PWD "submit-out-$($task.id_task).txt"
    $tmpOut = Join-Path $PWD "submit-out-$($task.id_task).txt"
    # include Authorization header during upload — call curl.exe with argument array to avoid quoting issues
    $curlArgs = @('-s','-S','-F',"file=@$uploadFile",'-H',"Authorization: Bearer $authToken",$submitUrl,'-o',$tmpOut)
    & curl.exe @curlArgs
    $raw = Get-Content -Raw -LiteralPath $tmpOut
    try {
        $submitResult = $raw | ConvertFrom-Json
        Write-Output ("Submit result: task.score={0} status={1}" -f $submitResult.task.score, $submitResult.task.status)
    } catch {
        Write-Error "Failed to parse submit response as JSON. Raw output:`n$raw"
        $submitResult = $null
    }

    if ($submitResult.task.score -eq $tc.expected) {
        Write-Output "Score OK: $($submitResult.task.score)"
    } else {
        Write-Warning "Score MISMATCH: expected $($tc.expected) got $($submitResult.task.score)"
    }

    # attempt authenticated download of the submitted file to verify the download path
    try {
        $fileId = $submitResult.file.id_file
        $dlOut = Join-Path $PWD "downloaded-$($fileId).bin"
        $dlArgs = @('-s','-S','-H',"Authorization: Bearer $authToken","http://127.0.0.1:4000/files/$fileId/download",'-o',$dlOut)
        & curl.exe @dlArgs
        if (Test-Path $dlOut) { Write-Output "Downloaded file to $dlOut" } else { Write-Warning "Download failed for file $fileId" }
    } catch {
        Write-Warning "Download check failed: $_"
    }

    $files = Invoke-RestMethod -Uri "$base/files" -Method Get
    Write-Output "Files (latest):"
    $files | Select-Object -Last 3 | Format-Table id_file, id_user, name, url

    $index++
}

Write-Output ""
Write-Output "E2E run complete."