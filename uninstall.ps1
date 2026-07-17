$ErrorActionPreference = 'Stop'

$snowtifyFolderPath = "$env:LOCALAPPDATA\snowtify"
$snowtifyExecutablePath = "$snowtifyFolderPath\snowtify.exe"
$snowtifyThemePath = "$env:APPDATA\spicetify\Themes\Snowtify"

function Write-Step {
  param ([string]$Message)
  Write-Host -Object $Message -ForegroundColor 'Cyan'
}

Write-Host
Write-Host -Object 'Snowtify Uninstaller' -ForegroundColor 'Cyan'
Write-Host -Object '--------------------' -ForegroundColor 'DarkGray'

if (Test-Path -LiteralPath $snowtifyExecutablePath -PathType 'Leaf') {
  Write-Step 'Restoring Spotify to its original state...'
  & $snowtifyExecutablePath restore
  if ($LASTEXITCODE -ne 0) {
    throw 'Spotify could not be restored. Snowtify was not removed.'
  }

  & $snowtifyExecutablePath config extensions snowtify-frost.js- | Out-Null
  & $snowtifyExecutablePath config custom_apps snowtify- | Out-Null
}
else {
  Write-Host -Object 'Snowtify executable was not found; continuing with cleanup.' -ForegroundColor 'Yellow'
}

Write-Step 'Removing Snowtify from your user PATH...'
$userTarget = [EnvironmentVariableTarget]::User
$userPath = [Environment]::GetEnvironmentVariable('PATH', $userTarget)
if ($userPath) {
  $normalizedInstallPath = $snowtifyFolderPath.TrimEnd('\')
  $pathEntries = @($userPath -split ';' | Where-Object {
    $_ -and $_.Trim().TrimEnd('\') -ine $normalizedInstallPath
  })
  [Environment]::SetEnvironmentVariable('PATH', ($pathEntries -join ';'), $userTarget)
}

Write-Step 'Removing the Snowtify Frost visual layer...'
Remove-Item -LiteralPath $snowtifyThemePath -Recurse -Force -ErrorAction 'SilentlyContinue'

Write-Step 'Removing Snowtify CLI files...'
Remove-Item -LiteralPath $snowtifyFolderPath -Recurse -Force -ErrorAction 'SilentlyContinue'

Write-Host
Write-Host -Object 'Snowtify was successfully uninstalled.' -ForegroundColor 'Green'
Write-Host -Object 'Your other Spicetify themes and configuration were left untouched.' -ForegroundColor 'DarkGray'
