# Snowtify

<p align="center">
  <img src="assets/snowtify-icon.png" width="128" alt="Snowtify icon" />
</p>

Snowtify is a stability-focused fork of [Spicetify CLI](https://github.com/spicetify/cli), maintained by [SnoW-099](https://github.com/SnoW-099).

It customizes the official Spotify desktop client on Windows, macOS, and Linux while preserving compatibility with existing Spicetify themes, extensions, custom apps, Marketplace, and configuration files.

## Snowtify additions

- A clearer `snowtify repair` command for recovering customization after Spotify updates.
- The official `Snowtify Frost` theme is installed by default and managed from Marketplace's **Installed** tab, where it can be removed or replaced like any other theme.
- Spotify shows a one-time Snowtify notification and update button only when a newer release is available.
- A compatibility-first approach so upstream Spicetify improvements can still be merged.

## Install on Windows

Open PowerShell as your normal user and run:

```powershell
iwr -useb https://raw.githubusercontent.com/SnoW-099/snowtify/main/install.ps1 | iex
```

After installation, use `snowtify -h` to see the available commands.

Update Snowtify in place without uninstalling or reinstalling:

```powershell
snowtify update
```

The Snowtify website lives in the `codex/website` branch and is deployed through Netlify.

<img src=".github/assets/logo.png" alt="img" align="right" width="560px" height="400px">

## Features

- Change colors across the User Interface
- Inject CSS for advanced customization
- Inject Extensions to extend functionalities, manipulate UI and control player
- Inject Custom Apps
- Make yourself in control of the Spotify client

## Compatibility

Snowtify intentionally keeps the internal `Spicetify` JavaScript API and existing configuration layout. Renaming those interfaces would break community themes and extensions.

Snowtify releases are published on [GitHub](https://github.com/SnoW-099/snowtify/releases). For shared Spicetify commands, the upstream [usage documentation](https://spicetify.app/docs/getting-started#basic-usage) remains a useful reference.

## Upstream

This project is derived from [spicetify/cli](https://github.com/spicetify/cli) and remains licensed under the LGPL-2.1 license.

---

## Code Signing Policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org/).
