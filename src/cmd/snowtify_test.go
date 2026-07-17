package cmd

import (
	"testing"

	"github.com/go-ini/ini"
)

func newFrostTestSections(t *testing.T) (*ini.Section, *ini.Section) {
	t.Helper()
	config := ini.Empty()
	settings, err := config.NewSection("Setting")
	if err != nil {
		t.Fatal(err)
	}
	features, err := config.NewSection("AdditionalOptions")
	if err != nil {
		t.Fatal(err)
	}
	return settings, features
}

func assertConfigValue(t *testing.T, section *ini.Section, key, expected string) {
	t.Helper()
	if actual := section.Key(key).String(); actual != expected {
		t.Fatalf("%s = %q, want %q", key, actual, expected)
	}
}

func TestMigrateSnowtifyFrostConfig(t *testing.T) {
	settings, features := newFrostTestSections(t)

	settings.Key("current_theme").SetValue("Snowtify")
	settings.Key("color_scheme").SetValue("Frost")
	features.Key("extensions").SetValue("existing.js")

	if !migrateSnowtifyFrostConfig(settings, features) {
		t.Fatal("expected legacy Frost config to migrate")
	}
	assertConfigValue(t, settings, "current_theme", "marketplace")
	assertConfigValue(t, settings, "color_scheme", "Marketplace")
	assertConfigValue(t, settings, "inject_css", "1")
	assertConfigValue(t, settings, "replace_colors", "1")
	assertConfigValue(t, features, "extensions", "existing.js|snowtify-frost.js")
}

func TestMigrateSnowtifyFrostConfigIsIdempotent(t *testing.T) {
	settings, features := newFrostTestSections(t)

	settings.Key("current_theme").SetValue("snowtify")
	features.Key("extensions").SetValue("snowtify-frost.js")

	if !migrateSnowtifyFrostConfig(settings, features) {
		t.Fatal("expected legacy Frost config to migrate")
	}
	assertConfigValue(t, features, "extensions", "snowtify-frost.js")
}

func TestMigrateSnowtifyFrostConfigLeavesOtherThemesAlone(t *testing.T) {
	settings, features := newFrostTestSections(t)

	settings.Key("current_theme").SetValue("marketplace")
	features.Key("extensions").SetValue("another.js")

	if migrateSnowtifyFrostConfig(settings, features) {
		t.Fatal("expected non-Frost theme to remain unchanged")
	}
	assertConfigValue(t, settings, "current_theme", "marketplace")
	assertConfigValue(t, features, "extensions", "another.js")
}

func TestMigrateSnowtifyFrostConfigHandlesEmptyExtensions(t *testing.T) {
	settings, features := newFrostTestSections(t)
	settings.Key("current_theme").SetValue("Snowtify")
	features.Key("extensions").SetValue("")

	if !migrateSnowtifyFrostConfig(settings, features) {
		t.Fatal("expected legacy Frost config to migrate")
	}
	assertConfigValue(t, features, "extensions", "snowtify-frost.js")
}

func TestRemoveConfigListValueRemovesSnowtifyOnly(t *testing.T) {
	_, features := newFrostTestSections(t)
	features.Key("custom_apps").SetValue("marketplace|snowtify|reddit")

	if !removeConfigListValue(features, "custom_apps", "snowtify") {
		t.Fatal("expected Snowtify custom app to be removed")
	}
	assertConfigValue(t, features, "custom_apps", "marketplace|reddit")
}

func TestRemoveConfigListValueMatchesCase(t *testing.T) {
	_, features := newFrostTestSections(t)
	features.Key("custom_apps").SetValue("marketplace|Snowtify")

	if !removeConfigListValue(features, "custom_apps", "snowtify") {
		t.Fatal("expected Snowtify custom app to be removed case-insensitively")
	}
	assertConfigValue(t, features, "custom_apps", "marketplace")
}

func TestRemoveConfigListValueLeavesOtherAppsAlone(t *testing.T) {
	_, features := newFrostTestSections(t)
	features.Key("custom_apps").SetValue("marketplace|reddit")

	if removeConfigListValue(features, "custom_apps", "snowtify") {
		t.Fatal("expected unrelated custom apps to remain unchanged")
	}
	assertConfigValue(t, features, "custom_apps", "marketplace|reddit")
}
