package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-ini/ini"
	"github.com/spicetify/cli/src/utils"
)

const snowtifyFrostBootstrap = "snowtify-frost.js"

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
