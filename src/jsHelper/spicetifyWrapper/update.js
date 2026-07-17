import { waitFor } from "./shared/async.js";
import { isNewerVersion } from "./shared/version.js";
import snowtifyTopbarIcon from "./assets/snowtify-topbar-icon.png";

const updateCommand = "snowtify update";
const updateButtonIcon = `<img src="${snowtifyTopbarIcon}" alt="" aria-hidden="true" draggable="false" style="display:block;width:24px;height:24px;object-fit:contain;pointer-events:none">`;

function getReleaseHighlights(body) {
  return String(body ?? "")
    .split("\n")
    .map((line) => line.match(/^[-*]\s+(.+)/)?.[1])
    .filter(Boolean)
    .slice(0, 6)
    .map((line) => line.replaceAll(/\*\*|`/g, "").replaceAll(/\[([^\]]+)]\([^)]+\)/g, "$1"));
}

function createUpdateContent({ currentVersion, latestVersion, releaseUrl, releaseBody }) {
  const content = document.createElement("div");
  content.id = "snowtify-update";
  content.innerHTML = `
    <style>
      #snowtify-update { color: var(--spice-text); }
      #snowtify-update .snowtify-update-intro { margin: 0 0 18px; color: var(--spice-subtext); line-height: 1.55; }
      #snowtify-update .snowtify-update-versions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
      #snowtify-update .snowtify-update-version { padding: 13px 14px; border: 1px solid var(--spice-highlight-elevated); background: var(--spice-main-elevated); border-radius: 6px; }
      #snowtify-update .snowtify-update-version span { display: block; margin-bottom: 4px; color: var(--spice-subtext); font-size: 11px; }
      #snowtify-update .snowtify-update-version strong { font-size: 14px; }
      #snowtify-update .snowtify-update-version:last-child strong { color: var(--spice-button); }
      #snowtify-update h3 { margin: 22px 0 10px; font-size: 16px; }
      #snowtify-update ul { margin: 0; padding-left: 20px; color: var(--spice-subtext); }
      #snowtify-update li { margin: 7px 0; line-height: 1.45; }
      #snowtify-update .snowtify-update-command { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 9px 9px 9px 14px; border: 1px solid var(--spice-highlight-elevated); background: var(--spice-main); border-radius: 6px; }
      #snowtify-update code { overflow-wrap: anywhere; color: var(--spice-text); font-size: 13px; }
      #snowtify-update button, #snowtify-update .snowtify-update-release { min-height: 36px; padding: 0 14px; border: 0; border-radius: 6px; font-weight: 700; cursor: pointer; }
      #snowtify-update button { background: var(--spice-button); color: var(--spice-main); }
      #snowtify-update button:hover { background: var(--spice-button-active); }
      #snowtify-update .snowtify-update-actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
      #snowtify-update .snowtify-update-release { display: inline-flex; align-items: center; color: var(--spice-text); text-decoration: none; }
      #snowtify-update .snowtify-update-release:hover { background: var(--spice-highlight); }
      #snowtify-update .snowtify-update-note { margin: 14px 0 0; color: var(--spice-subtext); font-size: 12px; line-height: 1.45; }
      @media (max-width: 520px) {
        #snowtify-update .snowtify-update-versions { grid-template-columns: 1fr; }
        #snowtify-update .snowtify-update-command { grid-template-columns: 1fr; }
      }
    </style>
    <p class="snowtify-update-intro">A new Snowtify release is ready with improvements and fixes.</p>
    <div class="snowtify-update-versions">
      <div class="snowtify-update-version"><span>Installed</span><strong data-current-version></strong></div>
      <div class="snowtify-update-version"><span>Available</span><strong data-latest-version></strong></div>
    </div>
    <div data-highlights-section>
      <h3>What's new</h3>
      <ul data-highlights></ul>
    </div>
    <h3>Update from PowerShell</h3>
    <div class="snowtify-update-command">
      <code></code>
      <button type="button">Copy update command</button>
    </div>
    <div class="snowtify-update-actions">
      <a class="snowtify-update-release" target="_blank" rel="noopener noreferrer">View release notes</a>
    </div>
    <p class="snowtify-update-note">Spotify cannot start PowerShell commands directly. Copy the command, run it in PowerShell, and Snowtify will update and reapply automatically.</p>
  `;

  content.querySelector("[data-current-version]").textContent = `v${currentVersion}`;
  content.querySelector("[data-latest-version]").textContent = `v${latestVersion}`;
  content.querySelector("code").textContent = updateCommand;
  content.querySelector(".snowtify-update-release").href = releaseUrl;

  const highlights = getReleaseHighlights(releaseBody);
  const highlightsSection = content.querySelector("[data-highlights-section]");
  if (highlights.length === 0) {
    highlightsSection.remove();
  } else {
    const list = content.querySelector("[data-highlights]");
    for (const highlight of highlights) {
      const item = document.createElement("li");
      item.textContent = highlight;
      list.append(item);
    }
  }

  content.querySelector("button").addEventListener("click", () => {
    Spicetify.Platform.ClipboardAPI.copy(updateCommand);
    Spicetify.showNotification("Update command copied");
  });

  return content;
}

void (async function checkForUpdate() {
  if (!Spicetify.Config) {
    setTimeout(checkForUpdate, 300);
    return;
  }

  const { check_spicetify_update: checkForUpdates, version: currentVersion } = Spicetify.Config;
  if (!checkForUpdates || !currentVersion || currentVersion === "Dev") return;

  try {
    const response = await fetch("https://api.github.com/repos/SnoW-099/snowtify/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

    const release = await response.json();
    const latestVersion = String(release.tag_name ?? "").replace(/^v/i, "");
    if (!isNewerVersion(latestVersion, currentVersion)) return;

    const content = createUpdateContent({
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url,
      releaseBody: release.body,
    });
    const updateModal = {
      title: "Snowtify update available",
      content,
      isLarge: false,
    };

    new Spicetify.Topbar.Button("Snowtify update available", updateButtonIcon, () => {
      Spicetify.PopupModal.display(updateModal);
    });

    await waitFor(() => Spicetify.PopupModal?.display, 300);
    Spicetify.PopupModal.display(updateModal);
  } catch (error) {
    console.warn("[Snowtify] Could not check for updates", error);
  }
})();
