package cmd

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInspectSpotifyFiles(t *testing.T) {
	tests := []struct {
		name      string
		spa       bool
		directory bool
		want      spotifyFilesState
	}{
		{"stock", true, false, spotifyFilesStock},
		{"applied", false, true, spotifyFilesApplied},
		{"mixed", true, true, spotifyFilesMixed},
		{"empty", false, false, spotifyFilesInvalid},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			folder := t.TempDir()
			if test.spa {
				if err := os.WriteFile(filepath.Join(folder, "xpui.spa"), []byte("test"), 0600); err != nil {
					t.Fatal(err)
				}
			}
			if test.directory {
				if err := os.Mkdir(filepath.Join(folder, "xpui"), 0700); err != nil {
					t.Fatal(err)
				}
			}

			got, err := inspectSpotifyFiles(folder)
			if err != nil {
				t.Fatal(err)
			}
			if got != test.want {
				t.Fatalf("inspectSpotifyFiles() = %d, want %d", got, test.want)
			}
		})
	}
}

func TestInspectSpotifyFilesMissingFolder(t *testing.T) {
	if _, err := inspectSpotifyFiles(filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Fatal("expected an unreadable Apps folder to return an error")
	}
}

func TestInspectBackupDetail(t *testing.T) {
	folder := t.TempDir()
	level, _ := inspectBackupDetail(folder, "", "1.2.3")
	if level != doctorWarning {
		t.Fatalf("empty backup level = %d, want warning", level)
	}

	if err := os.WriteFile(filepath.Join(folder, "xpui.spa"), []byte("test"), 0600); err != nil {
		t.Fatal(err)
	}
	level, _ = inspectBackupDetail(folder, "1.2.2", "1.2.3")
	if level != doctorWarning {
		t.Fatalf("outdated backup level = %d, want warning", level)
	}

	level, _ = inspectBackupDetail(folder, "1.2.3", "1.2.3")
	if level != doctorOK {
		t.Fatalf("current backup level = %d, want OK", level)
	}
}

func TestReadSpotifyVersion(t *testing.T) {
	prefsPath := filepath.Join(t.TempDir(), "prefs")
	if err := os.WriteFile(prefsPath, []byte("app.last-launched-version=1.2.3\n"), 0600); err != nil {
		t.Fatal(err)
	}

	version, err := readSpotifyVersion(prefsPath)
	if err != nil {
		t.Fatal(err)
	}
	if version != "1.2.3" {
		t.Fatalf("readSpotifyVersion() = %q, want %q", version, "1.2.3")
	}
}

func TestCleanConfigList(t *testing.T) {
	got := cleanConfigList([]string{" marketplace ", "", "reddit"})
	if len(got) != 2 || got[0] != "marketplace" || got[1] != "reddit" {
		t.Fatalf("cleanConfigList() = %#v", got)
	}
}
