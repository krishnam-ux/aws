$sebApp = "C:\Program Files\SafeExamBrowser\Application\SafeExamBrowser.exe"
$sebFile = "C:\Users\krish\aws\production_verified.seb"

Write-Host "=========================================================="
Write-Host "DEEP CLIENT TRACE: RUNNING SEB UNTIL EVENT"
Write-Host "=========================================================="

$startTime = Get-Date

$proc = Start-Process -FilePath $sebApp -ArgumentList "`"$sebFile`"" -PassThru
Write-Host "Main SEB PID: $($proc.Id)"

# Loop up to 45 seconds or until exit
for ($i = 1; $i -le 45; $i++) {
    Start-Sleep -Seconds 1
    $procs = Get-Process -Name "*SafeExamBrowser*" -ErrorAction SilentlyContinue
    $procCount = if ($procs) { $procs.Count } else { 0 }
    
    # Check if main process exited
    if ($proc.HasExited -and $procCount -le 1) {
        Write-Host "[$i s] SEB main process exited with ExitCode: $($proc.ExitCode)"
        break
    } else {
        Write-Host "[$i s] Running ($procCount processes)..."
    }
}

# Sleep a bit to let log flushes happen
Start-Sleep -Seconds 2

$logsDir = "$env:LOCALAPPDATA\SafeExamBrowser\Logs"
$newLogs = Get-ChildItem $logsDir | Where-Object { $_.LastWriteTime -ge $startTime.AddSeconds(-3) } | Sort-Object LastWriteTime

foreach ($logFile in $newLogs) {
    Write-Host "`n>>> COMPLETE LOG FILE: $($logFile.Name) ($($logFile.Length) bytes) <<<"
    Get-Content $logFile.FullName | ForEach-Object { Write-Host $_ }
}

$procs = Get-Process -Name "*SafeExamBrowser*" -ErrorAction SilentlyContinue
if ($procs) {
    $procs | Stop-Process -Force -ErrorAction SilentlyContinue
}
