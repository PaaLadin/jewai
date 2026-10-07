# boot-all.ps1 — поднять jewai после перезагрузки ПК.
# Сгенерировано gen_launchers.py.
$ErrorActionPreference = "Continue"
$root = "C:\DeepSeek\git\jewai"
$log = "$root\runtime\boot.log"

function Log($m) {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $m"
    Write-Host $line
    Add-Content $log $line -ErrorAction SilentlyContinue
}

Log "=== BOOT ALL ==="
Log "root: $root"

# 1. doh_proxy
$dp = Get-CimInstance Win32_Process |
  Where-Object { ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*doh_proxy*" }
if (-not $dp) {
    Start-Process pythonw -ArgumentList @("$root\sandbox\doh_proxy.py", "--port", "9999") -WindowStyle Hidden
    Log "doh_proxy started"
} else { Log "doh_proxy up" }

# 2. агенты
$agent = "$root\extension\agent.py"
foreach ($line in @("8766", "8767", "8768", "8769")) {
    $parts = $line -split " "
    $port = $parts[0]
    Start-Process pythonw -ArgumentList @($agent, "$port") -WorkingDirectory "$root\extension" -WindowStyle Hidden
    Log "agent started ($port)"
}
Start-Sleep -Seconds 3

# 3. Chrome
$chrome = "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe"
foreach ($line in @("A 9222", "B 9223", "C 9224", "D 9225")) {
    $parts = $line -split " "
    $L = $parts[0]
    $cdp = $parts[1]
    $try = $null
    try { $try = Invoke-RestMethod "http://127.0.0.1:$cdp/json/version" -TimeoutSec 3 } catch {}
    if ($try) { Log "CDP $L ($cdp) up"; continue }
    $prof = "$root\chrome-$L-data"
    if (-not (Test-Path $prof)) { New-Item -ItemType Directory -Path $prof -Force | Out-Null }
    $flags = @(
        "--user-data-dir=$prof",
        "--remote-debugging-port=$cdp",
        "--load-extension=$root\extension",
        "--proxy-server=127.0.0.1:9999",
        "--no-first-run",
        "--no-default-browser-check",
        "--restore-last-session"
    )
    Start-Process -FilePath $chrome -ArgumentList $flags
    Log "Chrome $L started (CDP $cdp)"
    Start-Sleep -Seconds 2
}
Start-Sleep -Seconds 6

# 4. сервер чата
$srv = Get-CimInstance Win32_Process |
  Where-Object { ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*council_chat*server.py*" }
if (-not $srv) {
    Start-Process pythonw -ArgumentList @("$root\sandbox\council_chat\server.py") -WorkingDirectory "$root\sandbox\council_chat" -WindowStyle Hidden
    Log "server 8770 started"
} else { Log "chat up" }
Start-Sleep -Seconds 5

# 5. health
foreach ($line in @("8766", "8767", "8768", "8769")) {
    $port = ($line -split " ")[0]
    try {
        $r = Invoke-RestMethod "http://127.0.0.1:$port/ping" -TimeoutSec 4
        Log "agent $port OK: $($r.version)"
    } catch { Log "agent $port DOWN" }
}
foreach ($line in @("A 9222", "B 9223", "C 9224", "D 9225")) {
    $parts = $line -split " "
    $cdp = $parts[1]
    try {
        $v = Invoke-RestMethod "http://127.0.0.1:$cdp/json/version" -TimeoutSec 4
        Log "cdp $cdp OK"
    } catch { Log "cdp $cdp DOWN" }
}
Log "=== BOOT DONE ==="
