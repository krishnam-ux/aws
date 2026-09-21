$sebApp = "C:\Program Files\SafeExamBrowser\Application\SafeExamBrowser.exe"
$sebFile = "C:\Users\krish\aws\production_verified.seb"

Write-Host "=========================================================="
Write-Host "LIVE PRODUCTION SEB FILE VALIDATION IN SAFE EXAM BROWSER"
Write-Host "Config: $sebFile"
Write-Host "=========================================================="

$startTime = Get-Date

# Start SEB Process
Write-Host "Launching SafeExamBrowser.exe with live production .seb file..."
$proc = Start-Process -FilePath $sebApp -ArgumentList "`"$sebFile`"" -PassThru

Write-Host "SEB process started with PID: $($proc.Id)"
Write-Host "Waiting 10 seconds for SEB browser engine to initialize..."
Start-Sleep -Seconds 10

# Check running processes
$runningSeb = Get-Process -Name "*SafeExamBrowser*" -ErrorAction SilentlyContinue
Write-Host "Active SEB processes detected: $($runningSeb.Count)"
foreach ($p in $runningSeb) {
    Write-Host "  - Process: $($p.ProcessName) (PID: $($p.Id))"
}

# Inspect logs created after startTime
$logsDir = "$env:LOCALAPPDATA\SafeExamBrowser\Logs"
$newLogs = Get-ChildItem $logsDir | Where-Object { $_.LastWriteTime -ge $startTime.AddSeconds(-2) } | Sort-Object LastWriteTime

Write-Host "`nNewly generated log files ($($newLogs.Count)):"
foreach ($l in $newLogs) {
    Write-Host "`n----------------------------------------------------------"
    Write-Host "LOG FILE: $($l.Name) ($($l.Length) bytes)"
    Write-Host "----------------------------------------------------------"
    $lines = Get-Content $l.FullName
    $relevantLines = $lines | Where-Object {
        $_ -like "*awssbgcuup*" -or
        $_ -like "*production_verified*" -or
        $_ -like "*Configuration was successful*" -or
        $_ -like "*Success*" -or
        $_ -like "*Error*"
    }
    if ($relevantLines) {
        $relevantLines | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }
    } else {
        $lines | Select-Object -Last 15 | ForEach-Object { Write-Host "  $_" }
    }
}

# Cleanly stop SEB processes
Write-Host "`nStopping SEB processes..."
$runningSeb | ForEach-Object {
    try {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped PID $($_.Id)"
    } catch {
        Write-Host "  Could not stop PID $($_.Id): $_"
    }
}

Write-Host "`n=========================================================="
Write-Host "LIVE PRODUCTION SEB LAUNCH VERIFICATION COMPLETED"
Write-Host "=========================================================="
