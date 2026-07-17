package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-ini/ini"
	"github.com/spicetify/cli/src/utils"
)

const (
	snowtifyFrostBootstrap = "snowtify-frost.js"
	snowtifyCustomApp      = "snowtify"
	snowtifyAppMarker      = ".snowtify-app-v1"
	snowtifyAppRemoved     = ".snowtify-app-removed-v1"
)

// RemoveSnowtifyApp cleans up the retired control center from snow.5 without
// changing Marketplace or any other custom app.
func RemoveSnowtifyApp() (bool, error) {
	removedMarkerPath := filepath.Join(spicetifyFolder, snowtifyAppRemoved)
	if _, err := os.Stat(removedMarkerPath); err == nil {
		return false, nil
	} else if !os.IsNotExist(err) {
		return false, fmt.Errorf("failed to inspect Snowtify app cleanup state: %w", err)
	}

	changed := removeConfigListValue(featureSection, "custom_apps", snowtifyCustomApp)
	if changed {
		if err := cfg.Write(); err != nil {
			return false, fmt.Errorf("failed to remove retired Snowtify app: %w", err)
		}
	}

	legacyMarkerPath := filepath.Join(spicetifyFolder, snowtifyAppMarker)
	if err := os.WriteFile(legacyMarkerPath, []byte("Snowtify control center retired\n"), 0600); err != nil {
		return changed, fmt.Errorf("failed to save Snowtify legacy app state: %w", err)
	}
	if err := os.WriteFile(removedMarkerPath, []byte("Snowtify control center cleanup completed\n"), 0600); err != nil {
		return changed, fmt.Errorf("failed to save Snowtify app cleanup state: %w", err)
	}

	if changed {
		utils.PrintSuccess("Removed retired Snowtify control center")
	}
	return changed, nil
}

func removeConfigListValue(section *ini.Section, keyName, value string) bool {
	values := section.Key(keyName).Strings("|")
	cleanValues := make([]string, 0, len(values))
	removed := false
	for _, item := range values {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if strings.EqualFold(item, value) {
			removed = true
			continue
		}
		cleanValues = append(cleanValues, item)
	}
	if !removed {
		return false
	}

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
