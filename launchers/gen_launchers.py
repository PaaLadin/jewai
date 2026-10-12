"""gen_launchers.py — генератор launchers для jewai.

Создаёт:
  start-<L>.ps1   — Chrome с профилем + агент
  boot-all.ps1    — все каналы + DoH + сервер чата
  stop-all.ps1    — остановить всё
  create-shortcut.ps1 — ярлык на рабочем столе

Сигнатура: gen_launchers(root, n, port_base, cdp_base, chat_port, proxy_port)
Все python-процессы — pythonw + Hidden (без окон).
"""
from pathlib import Path

LETTERS = "ABCDEFGHIJ"

# хелпер: универсальный фильтр процессов
PY_FILTER = ('Get-CimInstance Win32_Process |\n'
             '  Where-Object { $_.Name -eq "python.exe" -or '
             '$_.Name -eq "pythonw.exe" } |')


def gen_launchers(root, n, port_base, cdp_base, chat_port, proxy_port=9999):
    root = Path(root)
    ld = root / "launchers"
    ld.mkdir(parents=True, exist_ok=True)

    start_lines = []
    for i, L in enumerate(LETTERS[:n]):
        agent_port = port_base + i
        cdp_port = cdp_base + i
        (root / f"chrome-{L}-data").mkdir(exist_ok=True)

        ps = f"""# start-{L}.ps1 — Chrome-{L} (CDP {cdp_port}) + агент {L} ({agent_port})
# Сгенерировано gen_launchers.py. Правки потеряются при переустановке.
$ErrorActionPreference = "Continue"
$root = "{root}"
$chrome = "$env:PROGRAMFILES\\Google\\Chrome\\Application\\chrome.exe"
$ext = "$root\\extension"
$prof = "$root\\chrome-{L}-data"
$log = "$root\\runtime\\start-chrome-{L}.log"

function Log($m) {{
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $m"
    Write-Host $line
    Add-Content -Path $log -Value $line -ErrorAction SilentlyContinue
}}

Log "=== start-{L} begin ==="

$ours = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object {{ $_.CommandLine -match "chrome-{L}-data" }}
if ($ours) {{
    Log ("graceful close: " + $ours.Count)
    $ours | ForEach-Object {{
        $p = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
        if ($p) {{ $p.CloseMainWindow() | Out-Null }}
    }}
    for ($i = 0; $i -lt 16; $i++) {{
        Start-Sleep -Milliseconds 500
        $still = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
          Where-Object {{ $_.CommandLine -match "chrome-{L}-data" }}
        if (-not $still) {{ Log "closed cleanly"; break }}
    }}
    $still = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
      Where-Object {{ $_.CommandLine -match "chrome-{L}-data" }}
    if ($still) {{
        Log "graceful timeout, force kill"
        $still | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}
        Start-Sleep -Seconds 2
    }}
}}

New-Item -ItemType Directory -Path $prof -Force | Out-Null

$flags = @(
    "--user-data-dir=$prof",
    "--remote-debugging-port={cdp_port}",
    "--load-extension=$ext",
    "--proxy-server=127.0.0.1:{proxy_port}",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "--no-first-run",
    "--no-default-browser-check",
    "--restore-last-session"
)

$firstRun = -not (Test-Path (Join-Path $prof "Default\\Preferences"))
if ($firstRun) {{
    $flags += "https://chat.deepseek.com/"
    Log "first run: opening chat"
}}

$cmd = 'start "" "' + $chrome + '" ' + ($flags -join ' ')
cmd /c $cmd
Start-Sleep -Seconds 8

try {{
    $v = Invoke-RestMethod -Uri "http://127.0.0.1:{cdp_port}/json/version" -TimeoutSec 5
    Log ("CDP-{L} OK: " + $v.Browser)
}} catch {{
    Log ("CDP-{L} DOWN: " + $_.Exception.Message)
}}

$agent = "$root\\extension\\agent.py"
if (Test-Path $agent) {{
    Start-Process -FilePath "pythonw" -ArgumentList @($agent, "{agent_port}") -WorkingDirectory "$root\\extension" -WindowStyle Hidden
    Log "agent {L} started on {agent_port}"
}} else {{
    Log "agent.py not found: $agent"
}}

Write-Host "{L}: agent {agent_port}, CDP {cdp_port}"
"""
        (ld / f"start-{L}.ps1").write_text(ps, encoding="utf-8-sig")
        start_lines.append(f"  .\\start-{L}.ps1")


    # stop-all.ps1
    stop_all = (
        "# stop-all.ps1 — остановить агентов и Chrome этого проекта.\n"
        f"$root = \"{root}\"\n"
        "Write-Host \"Останавливаю jewai из $root\"\n"
        "\n"
        + PY_FILTER + "\n"
        "  Where-Object { $_.CommandLine -like \"*agent.py*\" -and "
        "$_.CommandLine -like \"*$root*\" } |\n"
        "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force "
        "-ErrorAction SilentlyContinue }\n"
        "\n"
        + PY_FILTER + "\n"
        "  Where-Object { $_.CommandLine -like \"*launch_server.py*\" } |\n"
        "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force "
        "-ErrorAction SilentlyContinue }\n"
        "\n"
        "$chromeNames = @("
        + ", ".join(f"\"chrome-{L}-data\"" for L in LETTERS[:n])
        + ")\n"
        "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" |\n"
        "  Where-Object {\n"
        "    $cl = $_.CommandLine\n"
        "    $chromeNames | Where-Object { $cl -like \"*$_*\" }\n"
        "  } |\n"
        "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force "
        "-ErrorAction SilentlyContinue }\n"
        "\n"
        "Write-Host \"Остановлено.\"\n"
    )
    (ld / "stop-all.ps1").write_text(stop_all, encoding="utf-8-sig")

    # create-shortcut.ps1 — ярлык на boot-all.ps1
    shortcut = (
        "# create-shortcut.ps1 — ярлык 'jewai' на рабочем столе.\n"
        f"$root = \"{root}\"\n"
        "$desktop = [Environment]::GetFolderPath(\"Desktop\")\n"
        "$lnk = Join-Path $desktop \"jewai.lnk\"\n"
        "$target = \"$env:SystemRoot\\System32\\WindowsPowerShell\\v1.0\\powershell.exe\"\n"
        "$args = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized "
        "-File \"' + $root + '\\launchers\\boot-all.ps1\"'\n"
        "$wsh = New-Object -ComObject WScript.Shell\n"
        "$sc = $wsh.CreateShortcut($lnk)\n"
        "$sc.TargetPath = $target\n"
        "$sc.Arguments = $args\n"
        "$sc.WorkingDirectory = \"$root\\launchers\"\n"
        "$sc.Save()\n"
        "Write-Host \"Ярлык создан: $lnk\"\n"
    )
    (ld / "create-shortcut.ps1").write_text(shortcut, encoding="utf-8-sig")


    # boot-all.ps1 — config-driven, 1-10 каналов, + mail_bot.
    # PowerShell-скобки литеральны: НЕ f-string, root через $PSScriptRoot.
    boot = r'''# boot-all.ps1 — поднять jewai после перезагрузки ПК.
# Сгенерировано gen_launchers.py. Читает config.json, N каналов 1-10.
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

# --- 4. сервер чата ---
$srv = Get-CimInstance Win32_Process |
  Where-Object { ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*council_chat*server.py*" }
if (-not $srv) {
    Start-Process pythonw -ArgumentList @("$Root\sandbox\council_chat\server.py") -WorkingDirectory "$Root\sandbox\council_chat" -WindowStyle Hidden
    Log "server 8770 started"
} else { Log "8770 up" }
Start-Sleep -Seconds 5

# --- 4b. mail_bot ---
$mb = Get-CimInstance Win32_Process |
  Where-Object { ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*mail_bot*" }
$mbScript = Join-Path $Root "projects\mail_bot\mail_bot.py"
if ($mb) {
    Log "mail_bot up"
} elseif (-not (Test-Path $mbScript)) {
    Log "mail_bot skipped (no script)"
} elseif (-not (Test-Path "$Root\.smtp_token")) {
    Log "mail_bot skipped (no .smtp_token)"
} else {
    Start-Process pythonw -ArgumentList @($mbScript, "--loop") -WorkingDirectory (Split-Path $mbScript) -WindowStyle Hidden
    Log "mail_bot started"
}
Start-Sleep -Seconds 2

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
'''
    (ld / "boot-all.ps1").write_text(boot, encoding="utf-8-sig")

    return (["boot-all.ps1", "stop-all.ps1", "create-shortcut.ps1"]
            + [f"start-{L}.ps1" for L in LETTERS[:n]])