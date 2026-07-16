$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

#region Variables
$snowtifyFolderPath = "$env:LOCALAPPDATA\snowtify"
$snowtifyThemePath = "$env:APPDATA\spicetify\Themes\Snowtify"
#endregion Variables

#region Functions
function Show-SnowtifyBanner {
  [CmdletBinding()]
  param ()
  process {
    $snowflake = [char]0x2744

    Write-Host
    Write-Host -Object '  +------------------------------------------+' -ForegroundColor 'Cyan'
    Write-Host -Object '  |                                          |' -ForegroundColor 'Cyan'
    Write-Host -Object '  |              ' -ForegroundColor 'Cyan' -NoNewline
    Write-Host -Object "$snowflake  SNOWTIFY  $snowflake" -ForegroundColor 'White' -NoNewline
    Write-Host -Object '              |' -ForegroundColor 'Cyan'
    Write-Host -Object '  |                                          |' -ForegroundColor 'Cyan'
    Write-Host -Object '  |                by SnoW099                |' -ForegroundColor 'DarkGray'
    Write-Host -Object '  +------------------------------------------+' -ForegroundColor 'Cyan'
    Write-Host
  }
}

function Write-Success {
  [CmdletBinding()]
  param ()
  process {
    Write-Host -Object ' > OK' -ForegroundColor 'Green'
  }
}

function Write-Unsuccess {
  [CmdletBinding()]
  param ()
  process {
    Write-Host -Object ' > ERROR' -ForegroundColor 'Red'
  }
}

function Test-Admin {
  [CmdletBinding()]
  param ()
  begin {
    Write-Host -Object "Checking if the script is not being run as administrator..." -NoNewline
  }
  process {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    -not $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  }
}

function Test-PowerShellVersion {
  [CmdletBinding()]
  param ()
  begin {
    $PSMinVersion = [version]'5.1'
  }
  process {
    Write-Host -Object 'Checking if your PowerShell version is compatible...' -NoNewline
    $PSVersionTable.PSVersion -ge $PSMinVersion
  }
}

function Get-Snowtify {
  [CmdletBinding()]
  param ()
  begin {
    if ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64') {
      $architecture = 'x64'
    }
    elseif ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
      $architecture = 'arm64'
    }
    else {
      $architecture = 'x32'
    }
    if ($v) {
      if ($v -match '^\d+\.\d+\.\d+(?:-snow\.\d+)?$') {
        $targetVersion = $v
      }
      else {
        Write-Warning -Message "You have specified an invalid Snowtify version: $v `nUse a version such as 2.44.0-snow.1"
        Pause
        exit
      }
    }
    else {
      Write-Host -Object 'Fetching the latest Snowtify version...' -NoNewline
      $latestRelease = Invoke-RestMethod -Uri 'https://api.github.com/repos/SnoW-099/snowtify/releases/latest'
      $targetVersion = $latestRelease.tag_name -replace '^v', ''
      Write-Success
    }
    $archivePath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "snowtify.zip")
  }
  process {
    Write-Host -Object "Downloading Snowtify v$targetVersion..." -NoNewline
    $Parameters = @{
      Uri            = "https://github.com/SnoW-099/snowtify/releases/download/v$targetVersion/snowtify-$targetVersion-windows-$architecture.zip"
      UseBasicParsing = $true
      OutFile        = $archivePath
    }
    Invoke-WebRequest @Parameters
    Write-Success
  }
  end {
    $archivePath
  }
}

function Add-SnowtifyToPath {
  [CmdletBinding()]
  param ()
  begin {
    Write-Host -Object 'Making Snowtify available in the PATH...' -NoNewline
    $user = [EnvironmentVariableTarget]::User
    $path = [Environment]::GetEnvironmentVariable('PATH', $user)
  }
  process {
    if ($path -notlike "*$snowtifyFolderPath*") {
      $path = "$path;$snowtifyFolderPath"
    }
  }
  end {
    [Environment]::SetEnvironmentVariable('PATH', $path, $user)
    if (($env:PATH -split ';') -notcontains $snowtifyFolderPath) {
      $env:PATH = "$env:PATH;$snowtifyFolderPath"
    }
    Write-Success
  }
}

function Install-Snowtify {
  [CmdletBinding()]
  param ()
  begin {
    Write-Host -Object 'Installing Snowtify...'
  }
  process {
    $archivePath = Get-Snowtify
    Write-Host -Object 'Extracting Snowtify...' -NoNewline
    Expand-Archive -Path $archivePath -DestinationPath $snowtifyFolderPath -Force
    Set-Content -Path "$snowtifyFolderPath\spicetify.cmd" -Encoding 'ASCII' -Value '@echo off
"%~dp0snowtify.exe" %*'
    Write-Success
    Add-SnowtifyToPath
  }
  end {
    Remove-Item -Path $archivePath -Force -ErrorAction 'SilentlyContinue'
    Write-Host -Object 'Snowtify was successfully installed!' -ForegroundColor 'Green'
  }
}

function Install-SnowtifyLayer {
  [CmdletBinding()]
  param ()
  begin {
    $themeBaseUrl = 'https://raw.githubusercontent.com/SnoW-099/snowtify/main/Themes/Snowtify'
    Write-Host -Object 'Installing the Snowtify Frost visual layer...' -NoNewline
  }
  process {
    New-Item -Path $snowtifyThemePath -ItemType 'Directory' -Force | Out-Null

    foreach ($themeFile in @('color.ini', 'user.css')) {
      $Parameters = @{
        Uri             = "$themeBaseUrl/$themeFile"
        UseBasicParsing = $true
        OutFile         = "$snowtifyThemePath\$themeFile"
      }
      Invoke-WebRequest @Parameters
    }
    Write-Success

    Write-Host -Object 'Configuring Snowtify Frost as the active theme...'
    & "$snowtifyFolderPath\snowtify.exe" config current_theme Snowtify color_scheme Frost inject_css 1 replace_colors 1
    if ($LASTEXITCODE -ne 0) {
      throw 'Snowtify could not configure the Frost visual layer.'
    }

    Write-Host -Object 'Applying the Snowtify layer to Spotify...'
    & "$snowtifyFolderPath\snowtify.exe" backup apply
    if ($LASTEXITCODE -ne 0) {
      throw 'Snowtify could not apply the Frost visual layer.'
    }
  }
  end {
    Write-Host -Object 'Snowtify Frost is active.' -ForegroundColor 'Cyan'
  }
}
#endregion Functions

#region Main
Show-SnowtifyBanner

#region Checks
if (-not (Test-PowerShellVersion)) {
  Write-Unsuccess
  Write-Warning -Message 'PowerShell 5.1 or higher is required to run this script'
  Write-Warning -Message "You are running PowerShell $($PSVersionTable.PSVersion)"
  Write-Host -Object 'PowerShell 5.1 install guide:'
  Write-Host -Object 'https://learn.microsoft.com/skypeforbusiness/set-up-your-computer-for-windows-powershell/download-and-install-windows-powershell-5-1'
  Write-Host -Object 'PowerShell 7 install guide:'
  Write-Host -Object 'https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows'
  Pause
  exit
}
else {
  Write-Success
}
if (-not (Test-Admin)) {
  Write-Unsuccess
  Write-Warning -Message "The script was run as administrator. This can result in problems with the installation process or unexpected behavior. Do not continue if you do not know what you are doing."
  $Host.UI.RawUI.Flushinputbuffer()
  $choices = [System.Management.Automation.Host.ChoiceDescription[]] @(
    (New-Object System.Management.Automation.Host.ChoiceDescription '&Yes', 'Abort installation.'),
    (New-Object System.Management.Automation.Host.ChoiceDescription '&No', 'Resume installation.')
  )
  $choice = $Host.UI.PromptForChoice('', 'Do you want to abort the installation process?', $choices, 0)
  if ($choice -eq 0) {
    Write-Host -Object 'Snowtify installation aborted' -ForegroundColor 'Yellow'
    Pause
    exit
  }
}
else {
  Write-Success
}
#endregion Checks

#region Snowtify
Install-Snowtify
Write-Host -Object "`nRun" -NoNewline
Write-Host -Object ' snowtify -h ' -NoNewline -ForegroundColor 'Cyan'
Write-Host -Object 'to get started'
#endregion Snowtify

#region Marketplace
$Host.UI.RawUI.Flushinputbuffer()
$choices = [System.Management.Automation.Host.ChoiceDescription[]] @(
    (New-Object System.Management.Automation.Host.ChoiceDescription "&Yes", "Install Spicetify Marketplace (compatible with Snowtify)."),
    (New-Object System.Management.Automation.Host.ChoiceDescription "&No", "Do not install Spicetify Marketplace.")
)
$choice = $Host.UI.PromptForChoice('', "`nDo you also want to install Spicetify Marketplace? It will become available within the Spotify client, where you can easily install themes and extensions.", $choices, 0)
if ($choice -eq 1) {
  Write-Host -Object 'Spicetify Marketplace installation aborted' -ForegroundColor 'Yellow'
}
else {
  Write-Host -Object 'Starting the Spicetify Marketplace installation script...'
  $Parameters = @{
    Uri             = 'https://raw.githubusercontent.com/spicetify/spicetify-marketplace/main/resources/install.ps1'
    UseBasicParsing = $true
  }
  Invoke-WebRequest @Parameters | Invoke-Expression
}
#endregion Marketplace

#region Snowtify Layer
Install-SnowtifyLayer
#endregion Snowtify Layer
#endregion Main
