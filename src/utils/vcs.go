package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type GithubRelease struct {
	TagName string `json:"tag_name"`
	Message string `json:"message"`
}

func FetchLatestTag() (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	res, err := client.Get("https://api.github.com/repos/SnoW-099/snowtify/releases/latest")
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("GitHub returned %s", res.Status)
	}

	var release GithubRelease
	if err = json.NewDecoder(res.Body).Decode(&release); err != nil {
		return "", err
	}

	if release.TagName == "" {
		return "", errors.New("GitHub response: " + release.Message)
	}

	return strings.TrimPrefix(release.TagName, "v"), nil
}
