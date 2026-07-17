import snowtifyTopbarIcon from "./assets/snowtify-topbar-icon.png";
import { waitFor } from "./shared/async.js";
import { isNewerVersion } from "./shared/version.js";

const updateCommand = "snowtify update";
const updateButtonIcon = `<img src="${snowtifyTopbarIcon}" alt="" aria-hidden="true" draggable="false" style="display:block;width:24px;height:24px;object-fit:contain;pointer-events:none">`;

function getReleaseHighlights(body) {
  return String(body ?? "")
    .split("\n")
    .map((line) => line.match(/^[-*]\s+(.+)/)?.[1])
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => line.replaceAll(/\*\*|`/g, "").replaceAll(/\[([^\]]+)]\([^)]+\)/g, "$1"));
}

function createUpdateContent({ currentVersion, latestVersion, releaseUrl, releaseBody }) {
  const content = document.createElement("div");
  content.id = "snowtify-update";
  content.innerHTML = `
    <style>
      #snowtify-update { --snowtify-ice: #b9eaff; --snowtify-ink: #06141b; width: min(100%, 480px); color: var(--spice-text); }
      #snowtify-update * { box-sizing: border-box; }
      #snowtify-update .snowtify-update-hero { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 14px; align-items: center; padding-bottom: 18px; border-bottom: 1px solid var(--spice-highlight-elevated); }
      #snowtify-update .snowtify-update-logo { width: 52px; height: 52px; padding: 7px; object-fit: contain; border: 1px solid var(--spice-highlight-elevated); background: var(--spice-main); border-radius: 8px; }
      #snowtify-update .snowtify-update-label { display: block; margin-bottom: 5px; color: var(--snowtify-ice); font-size: 10px; font-weight: 700; text-transform: uppercase; }
      #snowtify-update h2 { margin: 0; font-size: 21px; line-height: 1.2; }
      #snowtify-update .snowtify-update-intro { margin: 16px 0; color: var(--spice-subtext); font-size: 13px; line-height: 1.5; }
      #snowtify-update .snowtify-update-versions { display: flex; align-items: center; gap: 9px; margin-top: 9px; color: var(--spice-subtext); font-size: 12px; }
      #snowtify-update .snowtify-update-versions strong { color: var(--snowtify-ice); }
      #snowtify-update .snowtify-update-arrow { color: var(--spice-subtext); }
      #snowtify-update details { margin: 0 0 16px; border-block: 1px solid var(--spice-highlight-elevated); }
      #snowtify-update summary { display: flex; align-items: center; justify-content: space-between; min-height: 42px; color: var(--spice-text); font-size: 13px; font-weight: 700; cursor: pointer; list-style: none; }
      #snowtify-update summary::-webkit-details-marker { display: none; }
      #snowtify-update summary::after { content: "+"; color: var(--snowtify-ice); font-size: 20px; font-weight: 400; }
      #snowtify-update details[open] summary::after { content: "−"; }
      #snowtify-update ul { max-height: 120px; margin: 0 0 14px; padding: 0 0 0 18px; overflow-y: auto; color: var(--spice-subtext); }
      #snowtify-update li { margin: 6px 0; font-size: 12px; line-height: 1.45; }
      #snowtify-update .snowtify-update-command-label { display: block; margin-bottom: 8px; color: var(--spice-subtext); font-size: 11px; font-weight: 600; }
      #snowtify-update .snowtify-update-command { display: flex; align-items: center; min-height: 48px; padding: 0 14px; border: 1px solid var(--spice-highlight-elevated); background: var(--spice-main); border-radius: 7px; }
      #snowtify-update code { overflow-wrap: anywhere; color: var(--snowtify-ice); font-size: 13px; }
      #snowtify-update .snowtify-update-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 9px; margin-top: 10px; }
      #snowtify-update button, #snowtify-update .snowtify-update-release { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 14px; border: 1px solid transparent; border-radius: 7px; font-size: 12px; font-weight: 700; text-align: center; cursor: pointer; }
      #snowtify-update button { background: var(--snowtify-ice); color: var(--snowtify-ink); }
      #snowtify-update button:hover { background: #d7f4ff; }
      #snowtify-update .snowtify-update-release { border-color: var(--spice-highlight-elevated); color: var(--spice-text); text-decoration: none; }
      #snowtify-update .snowtify-update-release:hover { background: var(--spice-highlight); }
      #snowtify-update .snowtify-update-note { margin: 11px 0 0; color: var(--spice-subtext); font-size: 11px; line-height: 1.45; }
      @media (max-width: 520px) {
        #snowtify-update .snowtify-update-actions { grid-template-columns: 1fr; }
      }
    </style>
    <div class="snowtify-update-hero">
      <img class="snowtify-update-logo" src="${snowtifyTopbarIcon}" alt="" aria-hidden="true" draggable="false">
      <div>
        <span class="snowtify-update-label">Update available</span>
        <h2>A fresh Snowtify build is ready</h2>
        <div class="snowtify-update-versions"><span data-current-version></span><span class="snowtify-update-arrow">→</span><strong data-latest-version></strong></div>
      </div>
    </div>
    <p class="snowtify-update-intro">Update without reinstalling or losing your themes, extensions, and Marketplace setup.</p>
    <details data-highlights-section>
      <summary>What's new</summary>
      <ul data-highlights></ul>
    </details>
    <span class="snowtify-update-command-label">PowerShell command</span>
    <div class="snowtify-update-command">
      <code></code>
    </div>
    <div class="snowtify-update-actions">
      <button type="button" data-copy-command>Copy update command</button>
      <a class="snowtify-update-release" target="_blank" rel="noopener noreferrer">View release notes</a>
    </div>
    <p class="snowtify-update-note">Run the copied command in PowerShell. Snowtify will update and reapply your current setup automatically.</p>
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

  content.querySelector("[data-copy-command]").addEventListener("click", () => {
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
      title: "Snowtify",
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
