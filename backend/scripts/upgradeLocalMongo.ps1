$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator approval is required.' }
$config = 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg'
$source = 'C:\Program Files\MongoDB\Server\8.3\data'
$prepared = 'D:\WDP301\backend\scripts\mongod-replicaset.cfg'
$backup = 'D:\WDP301\maintenance-backups\20261007-replicaset'
if (Test-Path -LiteralPath $backup) { throw 'Backup target already exists; do not overwrite.' }
if ((Get-FileHash -LiteralPath $config).Hash -ne 'BA068C8879541C442CB94260D597152C9C9E334A595C429891B362CDF10253FB') { throw 'Original config changed; re-inspect before continuing.' }
if (Get-NetTCPConnection -State Listen -LocalPort 5000 -ErrorAction SilentlyContinue) { throw 'Stop backend before maintenance.' }
$service = Get-CimInstance Win32_Service -Filter "Name='MongoDB'"
if ($service.PathName -notlike '*MongoDB\Server\8.3\bin\mongod.exe*') { throw 'Unexpected MongoDB service executable.' }
New-Item -ItemType Directory -Path $backup | Out-Null
Start-Transcript -Path "$backup\upgrade.log" | Out-Null
$configChanged = $false
try {
  Copy-Item -LiteralPath $config -Destination "$backup\mongod.cfg.original"
  Stop-Service -Name MongoDB
  (Get-Service MongoDB).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(45))
  if (Get-Process mongod -ErrorAction SilentlyContinue) { throw 'mongod still running; cold backup refused.' }
  Copy-Item -LiteralPath $source -Destination "$backup\data" -Recurse
  $manifest = foreach ($file in Get-ChildItem -LiteralPath $source -File -Recurse) {
    $relative = $file.FullName.Substring($source.Length + 1)
    $copy = Join-Path "$backup\data" $relative
    $originalHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    if ((Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash -ne $originalHash) { throw "Backup checksum mismatch: $relative" }
    [pscustomobject]@{ RelativePath = $relative; Bytes = $file.Length; SHA256 = $originalHash }
  }
  $manifest | Export-Csv -LiteralPath "$backup\manifest.csv" -NoTypeInformation
  Copy-Item -LiteralPath $prepared -Destination $config
  $configChanged = $true
  Start-Service -Name MongoDB
  (Get-Service MongoDB).WaitForStatus('Running', [TimeSpan]::FromSeconds(45))
  'BACKUP_VERIFIED_CONFIG_INSTALLED_SERVICE_RUNNING' | Out-File -LiteralPath "$backup\result.txt"
} catch {
  $_ | Out-String | Out-File -LiteralPath "$backup\error.txt"
  if ($configChanged) {
    Stop-Service -Name MongoDB -ErrorAction SilentlyContinue
    Copy-Item -LiteralPath "$backup\mongod.cfg.original" -Destination $config
  }
  if ((Get-Service MongoDB).Status -eq 'Stopped') { Start-Service -Name MongoDB }
  throw
} finally { Stop-Transcript | Out-Null }
