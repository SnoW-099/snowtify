package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/go-ini/ini"
	"github.com/spicetify/cli/src/utils"
)

const (
	snowtifyFrostBootstrap = "snowtify-frost.js"
	snowtifyCustomApp      = "snowtify"
	snowtifyAppMarker      = ".snowtify-app-v1"
)

// EnsureSnowtifyApp enables the bundled control center once. The marker lets
// users remove it later without Snowtify adding it back on every command.
func EnsureSnowtifyApp() (bool, error) {
	markerPath := filepath.Join(spicetifyFolder, snowtifyAppMarker)
	if _, err := os.Stat(markerPath); err == nil {
		return false, nil
	} else if !os.IsNotExist(err) {
		return false, fmt.Errorf("failed to inspect Snowtify app state: %w", err)
	}

	appPath := filepath.Join(utils.GetExecutableDir(), "CustomApps", snowtifyCustomApp)
	if !directoryExists(appPath) {
		return false, nil
	}

	changed := ensureConfigListValue(featureSection, "custom_apps", snowtifyCustomApp)
	if changed {
		if err := cfg.Write(); err != nil {
			return false, fmt.Errorf("failed to enable Snowtify app: %w", err)
		}
	}

	if err := os.WriteFile(markerPath, []byte("Snowtify control center migration completed\n"), 0600); err != nil {
		return changed, fmt.Errorf("failed to save Snowtify app state: %w", err)
	}

	if changed {
		utils.PrintSuccess("Enabled Snowtify control center")
	}
	return changed, nil
}

func ensureConfigListValue(section *ini.Section, keyName, value string) bool {
	values := section.Key(keyName).Strings("|")
	cleanValues := make([]string, 0, len(values)+1)
	found := false
	for _, item := range values {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if strings.EqualFold(item, value) {
			found = true
		}
		cleanValues = append(cleanValues, item)
	}
	if found {
		return false
	}

	cleanValues = append(cleanValues, value)
	sort.Slice(cleanValues, func(i, j int) bool {
		return strings.ToLower(cleanValues[i]) < strings.ToLower(cleanValues[j])
	})
	section.Key(keyName).SetValue(strings.Join(cleanValues, "|"))
	return true
}

// MigrateSnowtifyFrost moves the legacy local Frost theme to Marketplace's
// theme runtime, allowing Marketplace themes to be installed and removed.
func MigrateSnowtifyFrost() (bool, error) {
	marketplaceApp := filepath.Join(spicetifyFolder, "CustomApps", "marketplace")
	marketplaceTheme := filepath.Join(spicetifyFolder, "Themes", "marketplace")
	if !directoryExists(marketplaceApp) || !directoryExists(marketplaceTheme) {
		return false, nil
	}

	if !migrateSnowtifyFrostConfig(settingSection, featureSection) {
		return false, nil
	}

	if err := cfg.Write(); err != nil {
		return false, fmt.Errorf("failed to migrate Snowtify Frost: %w", err)
	}

	utils.PrintSuccess("Migrated Snowtify Frost to Marketplace theme management")
	return true, nil
}

func directoryExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func migrateSnowtifyFrostConfig(settings, features *ini.Section) bool {
	if !strings.EqualFold(strings.TrimSpace(settings.Key("current_theme").String()), "Snowtify") {
		return false
	}

	settings.Key("current_theme").SetValue("marketplace")
	settings.Key("color_scheme").SetValue("Marketplace")
	settings.Key("inject_css").SetValue("1")
	settings.Key("replace_colors").SetValue("1")

	extensions := features.Key("extensions").Strings("|")
	cleanExtensions := make([]string, 0, len(extensions)+1)
	for _, extension := range extensions {
		extension = strings.TrimSpace(extension)
		if extension == "" {
			continue
		}
		if strings.EqualFold(extension, snowtifyFrostBootstrap) {
			return true
		}
		cleanExtensions = append(cleanExtensions, extension)
	}

	cleanExtensions = append(cleanExtensions, snowtifyFrostBootstrap)
	features.Key("extensions").SetValue(strings.Join(cleanExtensions, "|"))
	return true
}
