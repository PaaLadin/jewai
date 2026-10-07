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


    # boot-all.ps1 — полный подъём для ярлыка / автозагрузки.
    agent_lines = ", ".join(f'"{port_base + i}"' for i in range(n))
    chrome_lines = ", ".join(f'"{L} {cdp_base + i}"'
                               for i, L in enumerate(LETTERS[:n]))
    boot = f"""# boot-all.ps1 — поднять jewai после перезагрузки ПК.
# Сгенерировано gen_launchers.py.
$ErrorActionPreference = "Continue"
$root = "{root}"
$log = "$root\\runtime\\boot.log"

function Log($m) {{
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $m"
    Write-Host $line
    Add-Content $log $line -ErrorAction SilentlyContinue
}}

Log "=== BOOT ALL ==="
Log "root: $root"

# 1. doh_proxy
$dp = Get-CimInstance Win32_Process |
  Where-Object {{ ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*doh_proxy*" }}
if (-not $dp) {{
    Start-Process pythonw -ArgumentList @("$root\\sandbox\\doh_proxy.py", "--port", "{proxy_port}") -WindowStyle Hidden
    Log "doh_proxy started"
}} else {{ Log "doh_proxy up" }}

# 2. агенты
$agent = "$root\\extension\\agent.py"
foreach ($line in @({agent_lines})) {{
    $parts = $line -split " "
    $port = $parts[0]
    Start-Process pythonw -ArgumentList @($agent, "$port") -WorkingDirectory "$root\\extension" -WindowStyle Hidden
    Log "agent started ($port)"
}}
Start-Sleep -Seconds 3

# 3. Chrome
$chrome = "$env:PROGRAMFILES\\Google\\Chrome\\Application\\chrome.exe"
foreach ($line in @({chrome_lines})) {{
    $parts = $line -split " "
    $L = $parts[0]
    $cdp = $parts[1]
    $try = $null
    try {{ $try = Invoke-RestMethod "http://127.0.0.1:$cdp/json/version" -TimeoutSec 3 }} catch {{}}
    if ($try) {{ Log "CDP $L ($cdp) up"; continue }}
    $prof = "$root\\chrome-$L-data"
    if (-not (Test-Path $prof)) {{ New-Item -ItemType Directory -Path $prof -Force | Out-Null }}
    $flags = @(
        "--user-data-dir=$prof",
        "--remote-debugging-port=$cdp",
        "--load-extension=$root\\extension",
        "--proxy-server=127.0.0.1:{proxy_port}",
        "--no-first-run",
        "--no-default-browser-check",
        "--restore-last-session"
    )
    Start-Process -FilePath $chrome -ArgumentList $flags
    Log "Chrome $L started (CDP $cdp)"
    Start-Sleep -Seconds 2
}}
Start-Sleep -Seconds 6

# 4. сервер чата
$srv = Get-CimInstance Win32_Process |
  Where-Object {{ ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and $_.CommandLine -like "*council_chat*server.py*" }}
if (-not $srv) {{
    Start-Process pythonw -ArgumentList @("$root\\sandbox\\council_chat\\server.py") -WorkingDirectory "$root\\sandbox\\council_chat" -WindowStyle Hidden
    Log "server {chat_port} started"
}} else {{ Log "chat up" }}
Start-Sleep -Seconds 5

# 5. health
foreach ($line in @({agent_lines})) {{
    $port = ($line -split " ")[0]
    try {{
        $r = Invoke-RestMethod "http://127.0.0.1:$port/ping" -TimeoutSec 4
        Log "agent $port OK: $($r.version)"
    }} catch {{ Log "agent $port DOWN" }}
}}
foreach ($line in @({chrome_lines})) {{
    $parts = $line -split " "
    $cdp = $parts[1]
    try {{
        $v = Invoke-RestMethod "http://127.0.0.1:$cdp/json/version" -TimeoutSec 4
        Log "cdp $cdp OK"
    }} catch {{ Log "cdp $cdp DOWN" }}
}}
Log "=== BOOT DONE ==="
"""
    (ld / "boot-all.ps1").write_text(boot, encoding="utf-8-sig")

    return (["boot-all.ps1", "stop-all.ps1", "create-shortcut.ps1"]
            + [f"start-{L}.ps1" for L in LETTERS[:n]])