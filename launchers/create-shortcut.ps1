# create-shortcut.ps1 — ярлык JewAI на рабочем столе.
# Запускает boot-all.ps1 (полный подъём jewai).
$Root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath("Desktop")
$lnk = Join-Path $desktop "JewAI.lnk"
$target = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$args = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "' + $Root + '\launchers\boot-all.ps1"'
$icon = Join-Path $Root "jewai.ico"

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($lnk)
$sc.TargetPath = $target
$sc.Arguments = $args
$sc.WorkingDirectory = "$Root\launchers"
if (Test-Path $icon) {
    $sc.IconLocation = "$icon,0"
}
$sc.Description = "JewAI — DeepSeek Local Agent Bridge"
$sc.Save()
Write-Host "Ярлык создан: $lnk"
Write-Host "  -> $target"
Write-Host "  -> $args"
if (Test-Path $icon) {
    Write-Host "  icon: $icon"
} else {
    Write-Host "  (icon не найден: $icon)"
}