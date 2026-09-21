$sebApp = "C:\Program Files\SafeExamBrowser\Application\SafeExamBrowser.exe"
$sebFile = "C:\Users\krish\aws\fresh_certification_exam.seb"

Write-Host "=========================================================="
Write-Host "REAL SAFE EXAM BROWSER LAUNCH TEST"
Write-Host "Target Config: $sebFile"
Write-Host "=========================================================="

$startTime = Get-Date

# Start SEB Process
Write-Host "Launching SafeExamBrowser.exe..."
$proc = Start-Process -FilePath $sebApp -ArgumentList "`"$sebFile`"" -PassThru

Write-Host "SEB process started with PID: $($proc.Id)"
Write-Host "Waiting 10 seconds for SEB browser engine to initialize and navigate..."
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
        $_ -like "*Start URL*" -or
        $_ -like "*awssbgcuup*" -or
        $_ -like "*Filter*" -or
        $_ -like "*Rule*" -or
        $_ -like "*Blocked*" -or
        $_ -like "*Allow*" -or
        $_ -like "*Navigate*" -or
        $_ -like "*Status*" -or
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
Write-Host "REAL SEB LAUNCH TEST COMPLETED"
Write-Host "=========================================================="
