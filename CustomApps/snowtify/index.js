const { React: snowtifyReact } = Spicetify;
const { useEffect, useState } = snowtifyReact;
const snowtifyElement = snowtifyReact.createElement;

const SNOWTIFY_REPOSITORY = "https://github.com/SnoW-099/snowtify";
const SNOWTIFY_RELEASE_API = "https://api.github.com/repos/SnoW-099/snowtify/releases/latest";
const SNOWTIFY_FEEDBACK_EMAIL = "angelgp11.max@gmail.com";
const SNOWTIFY_UPDATE_COMMAND = "snowtify update";

function parseSnowtifyVersion(input) {
	const match = String(input ?? "")
		.trim()
		.replace(/^v/i, "")
		.split("+", 1)[0]
		.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
	if (!match) return null;
	return { core: match.slice(1, 4).map(Number), prerelease: match[4]?.split(".") ?? [] };
}

function compareSnowtifyVersions(leftInput, rightInput) {
	const left = parseSnowtifyVersion(leftInput);
	const right = parseSnowtifyVersion(rightInput);
	if (!left || !right) return null;

	for (let index = 0; index < left.core.length; index += 1) {
		if (left.core[index] !== right.core[index]) return left.core[index] - right.core[index];
	}
	if (left.prerelease.length === 0 || right.prerelease.length === 0) {
		if (left.prerelease.length === right.prerelease.length) return 0;
		return left.prerelease.length === 0 ? 1 : -1;
	}

	const length = Math.max(left.prerelease.length, right.prerelease.length);
	for (let index = 0; index < length; index += 1) {
		const leftPart = left.prerelease[index];
		const rightPart = right.prerelease[index];
		if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1;
		const leftNumber = /^\d+$/.test(leftPart);
		const rightNumber = /^\d+$/.test(rightPart);
		let comparison;
		if (leftNumber && rightNumber) comparison = Number(leftPart) - Number(rightPart);
		else if (leftNumber !== rightNumber) comparison = leftNumber ? -1 : 1;
		else comparison = leftPart.localeCompare(rightPart);
		if (comparison !== 0) return comparison;
	}
	return 0;
}

function SnowtifyIcon({ name }) {
	const markup = Spicetify.SVGIcons?.[name];
	if (!markup) return null;
	return snowtifyElement("svg", {
		className: "snowtify-control-icon",
		viewBox: "0 0 16 16",
		"aria-hidden": "true",
		dangerouslySetInnerHTML: { __html: markup },
	});
}

function copySnowtifyText(value, message) {
	Spicetify.Platform.ClipboardAPI.copy(value);
	Spicetify.showNotification(message);
}

function SnowtifyStatus({ installedVersion, release }) {
	let label = "Checking";
	let tone = "checking";
	let detail = "Looking for the latest release";

	if (release.state === "ready") {
		const comparison = compareSnowtifyVersions(release.version, installedVersion);
		if (comparison !== null && comparison > 0) {
			label = "Update available";
			tone = "update";
			detail = `v${release.version} is ready`;
		} else {
			label = "Up to date";
			tone = "current";
			detail = `Latest release: v${release.version}`;
		}
	} else if (release.state === "error") {
		label = "Offline";
		tone = "error";
		detail = "Could not reach GitHub";
	}

	return snowtifyElement(
		"div",
		{ className: `snowtify-release-status is-${tone}` },
		snowtifyElement("span", { className: "snowtify-status-dot" }),
		snowtifyElement("div", null, snowtifyElement("strong", null, label), snowtifyElement("small", null, detail))
	);
}

function SnowtifyApp() {
	const installedVersion = Spicetify.Config?.version || "Unknown";
	const spotifyVersion = Spicetify.Platform?.version || "Unknown";
	const [release, setRelease] = useState({ state: "loading", version: "", url: `${SNOWTIFY_REPOSITORY}/releases` });
	const [category, setCategory] = useState("General feedback");
	const [message, setMessage] = useState("");
	const [mailOpened, setMailOpened] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		fetch(SNOWTIFY_RELEASE_API, {
			headers: { Accept: "application/vnd.github+json" },
			signal: controller.signal,
		})
			.then((response) => {
				if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
				return response.json();
			})
			.then((data) => {
				setRelease({
					state: "ready",
					version: String(data.tag_name ?? "").replace(/^v/i, ""),
					url: data.html_url || `${SNOWTIFY_REPOSITORY}/releases`,
				});
			})
			.catch((error) => {
				if (error.name !== "AbortError") setRelease({ state: "error", version: "", url: `${SNOWTIFY_REPOSITORY}/releases` });
			});
		return () => controller.abort();
	}, []);

	function sendFeedback(event) {
		event.preventDefault();
		const cleanMessage = message.trim();
		if (!cleanMessage) return;
		const subject = `Snowtify feedback: ${category}`;
		const body = [
			"Hi Snowtify,",
			"",
			cleanMessage,
			"",
			"---",
			`Category: ${category}`,
			`Snowtify: v${installedVersion}`,
			`Spotify: ${spotifyVersion}`,
		].join("\n");
		const mailLink = document.createElement("a");
		mailLink.href = `mailto:${SNOWTIFY_FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		mailLink.style.display = "none";
		document.body.append(mailLink);
		mailLink.click();
		mailLink.remove();
		setMailOpened(true);
	}

	const updateAvailable =
		release.state === "ready" && compareSnowtifyVersions(release.version, installedVersion) > 0;

	return snowtifyElement(
		"main",
		{ className: "snowtify-app" },
		snowtifyElement(
			"header",
			{ className: "snowtify-app-header" },
			snowtifyElement("div", { className: "snowtify-app-mark", "aria-hidden": "true" }, "❄"),
			snowtifyElement(
				"div",
				null,
				snowtifyElement("p", { className: "snowtify-eyebrow" }, "Control center"),
				snowtifyElement("h1", null, "Snowtify"),
				snowtifyElement("p", { className: "snowtify-lead" }, "Your Spotify, below zero.")
			)
		),
		snowtifyElement(
			"section",
			{ className: "snowtify-facts", "aria-label": "Snowtify status" },
			snowtifyElement("div", null, snowtifyElement("span", null, "Installed"), snowtifyElement("strong", null, `v${installedVersion}`)),
			snowtifyElement("div", null, snowtifyElement("span", null, "Spotify"), snowtifyElement("strong", null, spotifyVersion)),
			snowtifyElement("div", null, snowtifyElement("span", null, "Release status"), snowtifyElement(SnowtifyStatus, { installedVersion, release }))
		),
		snowtifyElement(
			"div",
			{ className: "snowtify-content-grid" },
			snowtifyElement(
				"section",
				{ className: "snowtify-project" },
				snowtifyElement("p", { className: "snowtify-section-label" }, "Project"),
				snowtifyElement("h2", null, updateAvailable ? "A new release is ready." : "Everything in one place."),
				snowtifyElement(
					"p",
					{ className: "snowtify-section-copy" },
					updateAvailable
						? `Version v${release.version} is available. Update from PowerShell without reinstalling.`
						: "View the source, follow releases, and keep Snowtify current without leaving your setup behind."
				),
				updateAvailable &&
					snowtifyElement(
						"div",
						{ className: "snowtify-command" },
						snowtifyElement("code", null, SNOWTIFY_UPDATE_COMMAND),
						snowtifyElement(
							"button",
							{
								type: "button",
								className: "snowtify-icon-button",
								title: "Copy update command",
								"aria-label": "Copy update command",
								onClick: () => copySnowtifyText(SNOWTIFY_UPDATE_COMMAND, "Update command copied"),
							},
							snowtifyElement(SnowtifyIcon, { name: "copy" })
						)
					),
				snowtifyElement(
					"div",
					{ className: "snowtify-link-list" },
					snowtifyElement(
						"a",
						{ href: SNOWTIFY_REPOSITORY, target: "_blank", rel: "noopener noreferrer" },
						snowtifyElement("span", null, snowtifyElement("strong", null, "GitHub repository"), snowtifyElement("small", null, "Source code, releases, and changelog")),
						snowtifyElement(SnowtifyIcon, { name: "external-link" })
					),
					snowtifyElement(
						"a",
						{ href: release.url, target: "_blank", rel: "noopener noreferrer" },
						snowtifyElement("span", null, snowtifyElement("strong", null, "Latest release"), snowtifyElement("small", null, release.state === "ready" ? `Version v${release.version}` : "Release downloads")),
						snowtifyElement(SnowtifyIcon, { name: "external-link" })
					)
				)
			),
			snowtifyElement(
				"section",
				{ className: "snowtify-feedback" },
				snowtifyElement("p", { className: "snowtify-section-label" }, "Feedback"),
				snowtifyElement("h2", null, "Help shape Snowtify."),
				snowtifyElement("p", { className: "snowtify-section-copy" }, "Found a bug or have an idea? Send it directly to the project owner."),
				snowtifyElement(
					"form",
					{ onSubmit: sendFeedback },
					snowtifyElement("label", { htmlFor: "snowtify-feedback-category" }, "Category"),
					snowtifyElement(
						"select",
						{ id: "snowtify-feedback-category", value: category, onChange: (event) => setCategory(event.target.value) },
						snowtifyElement("option", null, "General feedback"),
						snowtifyElement("option", null, "Bug report"),
						snowtifyElement("option", null, "Feature idea")
					),
					snowtifyElement("label", { htmlFor: "snowtify-feedback-message" }, "Message"),
					snowtifyElement("textarea", {
						id: "snowtify-feedback-message",
						value: message,
						maxLength: 2000,
						rows: 6,
						placeholder: "Tell us what happened or what would make Snowtify better...",
						onChange: (event) => {
							setMessage(event.target.value);
							setMailOpened(false);
						},
					}),
					snowtifyElement(
						"div",
						{ className: "snowtify-feedback-footer" },
						snowtifyElement("small", null, mailOpened ? "Email app opened. Review the message and press Send." : `Opens your email app · ${message.length}/2000`),
						snowtifyElement(
							"button",
							{ type: "submit", className: "snowtify-primary-button", disabled: message.trim().length === 0 },
							"Send feedback",
							snowtifyElement(SnowtifyIcon, { name: "external-link" })
						)
					)
				)
			)
		)
	);
}

function render() {
	return snowtifyElement(SnowtifyApp);
}
