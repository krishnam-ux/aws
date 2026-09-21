$sebApp = "C:\Program Files\SafeExamBrowser\Application\SafeExamBrowser.exe"
$sebFile = "C:\Users\krish\aws\production_verified.seb"

Write-Host "=========================================================="
Write-Host "DEEP RUNTIME TRACE: SAFE EXAM BROWSER TERMINATION TEST"
Write-Host "=========================================================="

$startTime = Get-Date

Write-Host "Launching SEB at $startTime..."
$proc = Start-Process -FilePath $sebApp -ArgumentList "`"$sebFile`"" -PassThru
Write-Host "Main SEB PID: $($proc.Id)"

$terminated = $false
for ($i = 1; $i -le 25; $i++) {
    Start-Sleep -Seconds 1
    $procs = Get-Process -Name "*SafeExamBrowser*" -ErrorAction SilentlyContinue
    $procCount = if ($procs) { $procs.Count } else { 0 }
    Write-Host "[$i s] Active SEB processes ($procCount): $(($procs | ForEach-Object { "$($_.ProcessName):$($_.Id)" }) -join ', ')"
    
    # Check if main process exited
    if ($proc.HasExited -and $procCount -eq 0) {
        Write-Host "All SEB processes have exited at $i seconds! ExitCode: $($proc.ExitCode)"
        $terminated = $true
        break
    }
}

# Inspect all new logs
$logsDir = "$env:LOCALAPPDATA\SafeExamBrowser\Logs"
$newLogs = Get-ChildItem $logsDir | Where-Object { $_.LastWriteTime -ge $startTime.AddSeconds(-3) } | Sort-Object LastWriteTime

Write-Host "`n=========================================================="
Write-Host "LOG FILES CAPTURED: $($newLogs.Count)"
Write-Host "=========================================================="

foreach ($logFile in $newLogs) {
    Write-Host "`n>>> COMPLETE LOG FILE: $($logFile.Name) ($($logFile.Length) bytes) <<<"
    $content = Get-Content $logFile.FullName
    foreach ($line in $content) {
        Write-Host $line
    }
}

# Cleanup any remaining process if still open
$procs = Get-Process -Name "*SafeExamBrowser*" -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "`nCleaning up remaining processes..."
    $procs | Stop-Process -Force -ErrorAction SilentlyContinue
}
