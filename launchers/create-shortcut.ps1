# create-shortcut.ps1 — ярлык 'jewai' на рабочем столе.
$root = "C:\DeepSeek\git\jewai"
$desktop = [Environment]::GetFolderPath("Desktop")
$lnk = Join-Path $desktop "jewai.lnk"
$target = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$args = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "' + $root + '\launchers\boot-all.ps1"'
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($lnk)
$sc.TargetPath = $target
$sc.Arguments = $args
$sc.WorkingDirectory = "$root\launchers"
$sc.Save()
Write-Host "Ярлык создан: $lnk"
