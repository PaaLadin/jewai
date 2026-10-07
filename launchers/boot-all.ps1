# boot-all.ps1 — поднять jewai после перезагрузки ПК.
# Читает config.json. Работает при N каналах от 1 до 10.
# Все python — через pythonw + Hidden (без окон).
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $Root "logs\boot.log"

function Log($m) {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $m"
    Write-Host $line
    Add-Content $log $line -ErrorAction SilentlyContinue
}

Log "=== BOOT ALL ==="
Log "root: $Root"

# --- config ---
$cfgFile = Join-Path $Root "config.json"
if (-not (Test-Path $cfgFile)) {
    Log "FAIL: config.json not found: $cfgFile"
    exit 1
}
$cfg = Get-Content $cfgFile -Raw | ConvertFrom-Json
$letters = @($cfg.letters)
$n = $letters.Count
Log "channels: $n ($($letters -join ', '))"

# --- 1. doh_proxy ---
$dp = Get-CimInstance Win32_Process |
  Where-Object { ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*doh_proxy*" }
if (-not $dp) {
    Log "start doh_proxy"
    Start-Process pythonw -ArgumentList @("$Root\sandbox\doh_proxy.py", "--port", "9999") -WindowStyle Hidden
    Start-Sleep -Seconds 1
} else { Log "doh_proxy up" }

# --- 2. агенты (N) ---
$agent = Join-Path $Root "extension\agent.py"
if (-not (Test-Path $agent)) {
    Log "FAIL: agent.py not found: $agent"
    exit 1
}
foreach ($L in $letters) {
    $port = $cfg.channels.$L.agent
    $already = Get-CimInstance Win32_Process |
      Where-Object { ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*agent.py*$port*" }
    if ($already) { Log "agent $L ($port) up"; continue }
    Start-Process pythonw -ArgumentList @($agent, "$port") -WorkingDirectory (Split-Path $agent) -WindowStyle Hidden
    Log "agent $L started ($port)"
    Start-Sleep -Milliseconds 300
}
Start-Sleep -Seconds 3

# --- 3. Chrome (N) ---
foreach ($L in $letters) {
    $cdp = $cfg.channels.$L.cdp
    $try = $null
    try { $try = Invoke-RestMethod "http://127.0.0.1:$cdp/json/version" -TimeoutSec 3 } catch {}
    if ($try) { Log "CDP $L ($cdp) up"; continue }

    $chrome = "$env:PROGRAMFILES\Google\Chrome\Application\chrome.exe"
    $prof = "$Root\chrome-$L-data"
    $ext = "$Root\extension"
    if (-not (Test-Path $prof)) { New-Item -ItemType Directory -Path $prof -Force | Out-Null }
    $first = -not (Test-Path (Join-Path $prof "Default\Preferences"))
    $args = @(
        "--user-data-dir=$prof",
        "--remote-debugging-port=$cdp",
        "--load-extension=$ext",
        "--proxy-server=127.0.0.1:9999",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--no-first-run",
        "--no-default-browser-check",
        "--restore-last-session"
    )
    if ($first) { $args += "https://chat.deepseek.com/" }
    Start-Process -FilePath $chrome -ArgumentList $args
    Log "Chrome $L started (CDP $cdp)"
    Start-Sleep -Seconds 2
}
Start-Sleep -Seconds 6

# --- 4. сервер чата 8770 ---
$srv = Get-CimInstance Win32_Process |
  Where-Object { ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*council_chat*server.py*" }
if (-not $srv) {
    Start-Process pythonw -ArgumentList @("$Root\sandbox\council_chat\server.py") -WorkingDirectory "$Root\sandbox\council_chat" -WindowStyle Hidden
    Log "server 8770 started"
} else { Log "8770 up" }
Start-Sleep -Seconds 5

# --- 5. health ---
foreach ($L in $letters) {
    $port = $cfg.channels.$L.agent
    try {
        $r = Invoke-RestMethod "http://127.0.0.1:$port/ping" -TimeoutSec 4
        Log "agent $L ($port) OK: $($r.version)"
    } catch { Log "agent $L ($port) DOWN" }
}
foreach ($L in $letters) {
    $cdp = $cfg.channels.$L.cdp
    try {
        $v = Invoke-RestMethod "http://127.0.0.1:$cdp/json/version" -TimeoutSec 4
        Log "cdp $L ($cdp) OK: $($v.Browser)"
    } catch { Log "cdp $L ($cdp) DOWN" }
}
$chat = $cfg.chat_port
if (-not $chat) { $chat = 8770 }
try { $s = Invoke-RestMethod "http://127.0.0.1:$chat/api/health" -TimeoutSec 40; Log "chat $chat OK" } catch { Log "chat $chat DOWN" }

Log "=== BOOT DONE ==="