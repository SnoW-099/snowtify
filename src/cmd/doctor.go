package cmd

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-ini/ini"
	"github.com/spicetify/cli/src/utils"
)

type doctorLevel int

const (
	doctorOK doctorLevel = iota
	doctorWarning
	doctorError
)

type doctorCheck struct {
	level  doctorLevel
	name   string
	detail string
}

type spotifyFilesState int

const (
	spotifyFilesInvalid spotifyFilesState = iota
	spotifyFilesStock
	spotifyFilesApplied
	spotifyFilesMixed
)

const snowtifyLogMaxSize int64 = 1024 * 1024

func Doctor(version string) bool {
	checks := collectDoctorChecks(version)
	utils.PrintBold("Snowtify doctor")

	healthy := true
	for _, check := range checks {
		message := check.name + ": " + check.detail
		switch check.level {
		case doctorOK:
			utils.PrintSuccess(message)
		case doctorWarning:
			utils.PrintWarning(message)
		case doctorError:
			healthy = false
			utils.PrintError(message)
		}
	}

	if healthy {
		utils.PrintSuccess("No blocking problems found")
	} else {
		utils.PrintInfo(`Fix the reported paths or reinstall Spotify, then run "snowtify repair".`)
	}

	if err := appendSnowtifyLog("doctor", formatDoctorChecks(checks)); err != nil {
		utils.PrintWarning("Could not save the diagnostic log: " + err.Error())
	}
	utils.PrintInfo("Diagnostic log: " + SnowtifyLogPath())
	return healthy
}

func Repair(version string) error {
	if err := appendSnowtifyLog("repair", []string{"Repair started", "Snowtify version: " + version}); err != nil {
		utils.PrintWarning("Could not save the repair log: " + err.Error())
	}

	utils.PrintBold("Snowtify repair")
	utils.PrintInfo("Checking Spotify, backup, and customization state")

	backupVersion := backupSection.Key("version").MustString("")
	backupWith := backupSection.Key("with").MustString("")
	spotifyVersion, err := readSpotifyVersion(prefsPath)
	if err != nil {
		return finishRepair(err)
	}

	backupState, err := inspectBackup(backupFolder, backupVersion, spotifyVersion)
	if err != nil {
		return finishRepair(err)
	}
	destinationState, err := inspectSpotifyFiles(appDestPath)
	if err != nil {
		return finishRepair(err)
	}

	if destinationState == spotifyFilesApplied && backupState == doctorOK && backupWith != version {
		utils.PrintInfo("Rebuilding the backup for this Snowtify version")
		Restore()
		Backup(version, true)
		destinationState = spotifyFilesStock
	}

	if err := Auto(version); err != nil {
		return finishRepair(err)
	}

	if destinationState == spotifyFilesApplied {
		utils.PrintInfo("Reapplying the current theme and extensions")
		CheckStates()
		InitSetting()
		Apply(version)
	}

	utils.PrintSuccess("Snowtify repair completed")
	if err := appendSnowtifyLog("repair", []string{"Repair completed successfully"}); err != nil {
		utils.PrintWarning("Could not save the repair result: " + err.Error())
	}
	return nil
}

func finishRepair(err error) error {
	_ = appendSnowtifyLog("repair", []string{"Repair failed: " + err.Error()})
	return err
}

func ShowSnowtifyLogs() {
	path := SnowtifyLogPath()
	utils.PrintBold("Snowtify logs")
	utils.PrintInfo(path)

	content, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		utils.PrintInfo(`No logs yet. Run "snowtify doctor" to create a diagnostic report.`)
		return
	}
	if err != nil {
		utils.PrintError("Could not read the log: " + err.Error())
		return
	}

	log.Print(strings.TrimSpace(string(content)))
}

func SnowtifyLogPath() string {
	return filepath.Join(utils.GetStateFolder("Logs"), "snowtify.log")
}

func collectDoctorChecks(version string) []doctorCheck {
	checks := []doctorCheck{{doctorOK, "Snowtify", "v" + version}}
	configPath := GetConfigPath()
	if info, err := os.Stat(configPath); err != nil || info.IsDir() {
		checks = append(checks, doctorCheck{doctorError, "Configuration", "config-xpui.ini is not readable"})
	} else {
		checks = append(checks, doctorCheck{doctorOK, "Configuration", configPath})
	}

	configuredSpotifyPath := utils.ReplaceEnvVarsInString(settingSection.Key("spotify_path").String())
	configuredPrefsPath := utils.ReplaceEnvVarsInString(settingSection.Key("prefs_path").String())
	appsPath := filepath.Join(configuredSpotifyPath, "Apps")
	spotifyState, spotifyErr := inspectSpotifyFiles(appsPath)
	if spotifyErr != nil {
		checks = append(checks, doctorCheck{doctorError, "Spotify", spotifyErr.Error()})
	} else {
		checks = append(checks, doctorCheck{doctorOK, "Spotify", configuredSpotifyPath})
	}

	spotifyVersion, prefsErr := readSpotifyVersion(configuredPrefsPath)
	if prefsErr != nil {
		checks = append(checks, doctorCheck{doctorError, "Spotify prefs", prefsErr.Error()})
	} else {
		checks = append(checks, doctorCheck{doctorOK, "Spotify version", spotifyVersion})
	}

	if spotifyErr == nil {
		switch spotifyState {
		case spotifyFilesStock:
			checks = append(checks, doctorCheck{doctorWarning, "Customization", `Spotify is in stock state; run "snowtify repair"`})
		case spotifyFilesApplied:
			checks = append(checks, doctorCheck{doctorOK, "Customization", "Snowtify is applied"})
		case spotifyFilesMixed:
			checks = append(checks, doctorCheck{doctorWarning, "Customization", `Spotify was partially updated; run "snowtify repair"`})
		case spotifyFilesInvalid:
			checks = append(checks, doctorCheck{doctorError, "Customization", "Spotify's Apps folder is empty"})
		}
	}

	if prefsErr == nil {
		backupVersion := backupSection.Key("version").MustString("")
		backupLevel, backupDetail := inspectBackupDetail(backupFolder, backupVersion, spotifyVersion)
		if backupLevel == doctorWarning && spotifyState == spotifyFilesApplied {
			backupLevel = doctorError
			backupDetail += "; reinstall Spotify before repairing"
		}
		checks = append(checks, doctorCheck{backupLevel, "Backup", backupDetail})

		backupWith := backupSection.Key("with").MustString("")
		if backupLevel == doctorOK && backupWith != version {
			preparedBy := "an unknown Snowtify version"
			if backupWith != "" {
				preparedBy = "v" + backupWith
			}
			checks = append(checks, doctorCheck{doctorWarning, "Backup engine", `prepared by ` + preparedBy + `; run "snowtify repair"`})
		}
	}

	checks = append(checks, inspectConfiguredComponents()...)
	return checks
}

func inspectConfiguredComponents() []doctorCheck {
	checks := make([]doctorCheck, 0)
	themeName := strings.TrimSpace(settingSection.Key("current_theme").String())
	if themeName == "" {
		checks = append(checks, doctorCheck{doctorOK, "Theme", "no local theme selected"})
	} else {
		themePaths := []string{
			filepath.Join(userThemesFolder, themeName),
			filepath.Join(utils.GetExecutableDir(), "Themes", themeName),
		}
		if firstExistingDirectory(themePaths) == "" {
			checks = append(checks, doctorCheck{doctorError, "Theme", `"` + themeName + `" was not found`})
		} else {
			checks = append(checks, doctorCheck{doctorOK, "Theme", themeName})
		}
	}

	for _, extension := range cleanConfigList(featureSection.Key("extensions").Strings("|")) {
		if _, err := utils.GetExtensionPath(extension); err != nil {
			checks = append(checks, doctorCheck{doctorError, "Extension", `"` + extension + `" was not found`})
		} else {
			checks = append(checks, doctorCheck{doctorOK, "Extension", extension})
		}
	}

	for _, app := range cleanConfigList(featureSection.Key("custom_apps").Strings("|")) {
		if _, err := utils.GetCustomAppPath(app); err != nil {
			checks = append(checks, doctorCheck{doctorError, "Custom app", `"` + app + `" was not found`})
		} else {
			checks = append(checks, doctorCheck{doctorOK, "Custom app", app})
		}
	}
	return checks
}

func inspectSpotifyFiles(appsPath string) (spotifyFilesState, error) {
	entries, err := os.ReadDir(appsPath)
	if err != nil {
		return spotifyFilesInvalid, fmt.Errorf("Spotify Apps folder is not readable: %s", appsPath)
	}

	spaFiles := 0
	directories := 0
	for _, entry := range entries {
		if entry.IsDir() {
			directories++
		} else if strings.EqualFold(filepath.Ext(entry.Name()), ".spa") {
			spaFiles++
		}
	}

	switch {
	case spaFiles > 0 && directories > 0:
		return spotifyFilesMixed, nil
	case spaFiles > 0:
		return spotifyFilesStock, nil
	case directories > 0:
		return spotifyFilesApplied, nil
	default:
		return spotifyFilesInvalid, nil
	}
}

func inspectBackup(folder, configuredVersion, spotifyVersion string) (doctorLevel, error) {
	level, detail := inspectBackupDetail(folder, configuredVersion, spotifyVersion)
	if level == doctorError {
		return level, fmt.Errorf("backup is unusable: %s", detail)
	}
	return level, nil
}

func inspectBackupDetail(folder, configuredVersion, spotifyVersion string) (doctorLevel, string) {
	entries, err := os.ReadDir(folder)
	if err != nil {
		return doctorError, "backup folder is not readable: " + folder
	}

	spaFiles := 0
	for _, entry := range entries {
		if !entry.IsDir() && strings.EqualFold(filepath.Ext(entry.Name()), ".spa") {
			spaFiles++
		}
	}
	if spaFiles == 0 {
		return doctorWarning, `no backup found; run "snowtify repair"`
	}
	if configuredVersion != spotifyVersion {
		return doctorWarning, fmt.Sprintf("backup is for Spotify %s, installed version is %s", configuredVersion, spotifyVersion)
	}
	return doctorOK, fmt.Sprintf("ready for Spotify %s (%d app files)", spotifyVersion, spaFiles)
}

func readSpotifyVersion(path string) (string, error) {
	prefs, err := ini.Load(path)
	if err != nil {
		return "", fmt.Errorf("prefs file is not readable: %s", path)
	}
	version := strings.TrimSpace(prefs.Section("").Key("app.last-launched-version").String())
	if version == "" {
		return "", fmt.Errorf("Spotify version is missing from prefs: %s", path)
	}
	return version, nil
}

func firstExistingDirectory(paths []string) string {
	for _, path := range paths {
		if info, err := os.Stat(path); err == nil && info.IsDir() {
			return path
		}
	}
	return ""
}

func cleanConfigList(values []string) []string {
	clean := make([]string, 0, len(values))
	for _, value := range values {
		if value = strings.TrimSpace(value); value != "" {
			clean = append(clean, value)
		}
	}
	return clean
}

func formatDoctorChecks(checks []doctorCheck) []string {
	lines := make([]string, 0, len(checks))
	for _, check := range checks {
		status := "OK"
		if check.level == doctorWarning {
			status = "WARN"
		} else if check.level == doctorError {
			status = "ERROR"
		}
		lines = append(lines, fmt.Sprintf("[%s] %s: %s", status, check.name, check.detail))
	}
	return lines
}

func appendSnowtifyLog(event string, lines []string) error {
	path := SnowtifyLogPath()
	if info, err := os.Stat(path); err == nil && info.Size() >= snowtifyLogMaxSize {
		oldPath := path + ".old"
		_ = os.Remove(oldPath)
		if err := os.Rename(path, oldPath); err != nil {
			return err
		}
	}

	file, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	defer file.Close()

	if _, err := fmt.Fprintf(file, "[%s] %s\n", time.Now().Format(time.RFC3339), strings.ToUpper(event)); err != nil {
		return err
	}
	for _, line := range lines {
		if _, err := fmt.Fprintln(file, line); err != nil {
			return err
		}
	}
	_, err = fmt.Fprintln(file)
	return err
}
