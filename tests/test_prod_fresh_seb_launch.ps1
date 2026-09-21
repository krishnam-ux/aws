$sebApp = "C:\Program Files\SafeExamBrowser\Application\SafeExamBrowser.exe"
$sebFile = "C:\Users\krish\aws\fresh_production_verified.seb"

Write-Host "=========================================================="
Write-Host "LIVE PRODUCTION SEB LAUNCH VERIFICATION"
Write-Host "Target Config: $sebFile"
Write-Host "=========================================================="

$startTime = Get-Date

# Start SEB Process
Write-Host "Launching SafeExamBrowser.exe with downloaded production .seb..."
$proc = Start-Process -FilePath $sebApp -ArgumentList "`"$sebFile`"" -PassThru

Write-Host "SEB process started with PID: $($proc.Id)"
Write-Host "Waiting 12 seconds for SEB browser engine to initialize and load /exam..."
Start-Sleep -Seconds 12

# Check running processes
$runningSeb = Get-Process -Name "*SafeExamBrowser*" -ErrorAction SilentlyContinue
Write-Host "Active SEB processes detected: $($runningSeb.Count)"
foreach ($p in $runningSeb) {
    Write-Host "  - Process: $($p.ProcessName) (PID: $($p.Id), Responding: $($p.Responding))"
}

$isAlive = ($runningSeb.Count -gt 0)
Write-Host "SEB Stayed Open (Not closed by quitURL): $(if ($isAlive) { '[PASS] YES - SEB IS RUNNING' } else { '[FAIL] NO - SEB CLOSED' })"

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
        $_ -like "*Start URL*" -or
        $_ -like "*awssbgcuup*" -or
        $_ -like "*Filter*" -or
        $_ -like "*Rule*" -or
        $_ -like "*Blocked*" -or
        $_ -like "*Allow*" -or
        $_ -like "*Navigate*" -or
        $_ -like "*Navigation*" -or
        $_ -like "*quit URL*" -or
        $_ -like "*termination*" -or
        $_ -like "*Browser Window*" -or
        $_ -like "*Status*"
    }
    if ($relevantLines) {
        $relevantLines | ForEach-Object { Write-Host "  $_" }
    } else {
        $lines | Select-Object -Last 15 | ForEach-Object { Write-Host "  $_" }
    }
}

# Cleanly stop SEB processes
Write-Host "`nStopping test SEB processes..."
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
