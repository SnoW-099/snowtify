(async () => {
  const markerKey = "snowtify:frost-marketplace-v1";
  if (localStorage.getItem(markerKey)) return;

  const databaseName = "spicetify-marketplace";
  const storeName = "settings";
  const frostKey = "marketplace:installed:SnoW-099/snowtify/Themes/Snowtify/user.css";
  const installedThemesKey = "marketplace:installed-themes";
  const activeThemeKey = "marketplace:theme-installed";
  const localThemeKey = "marketplace:local-theme";
  const rawBase = "https://raw.githubusercontent.com/SnoW-099/snowtify/main";

  const frostTheme = {
    manifest: {
      name: "Snowtify Frost",
      description: "A clean, dark Spotify theme with crisp ice-blue accents.",
      preview: "assets/snowtify-icon.png",
      usercss: "Themes/Snowtify/user.css",
      schemes: "Themes/Snowtify/color.ini",
      readme: "README.md",
      authors: [{ name: "SnoW099", url: "https://github.com/SnoW-099" }]
    },
    type: "theme",
    title: "Snowtify Frost",
    subtitle: "A clean, dark Spotify theme with crisp ice-blue accents.",
    authors: [{ name: "SnoW099", url: "https://github.com/SnoW-099" }],
    user: "SnoW-099",
    repo: "snowtify",
    branch: "main",
    imageURL: `${rawBase}/assets/snowtify-icon.png`,
    readmeURL: `${rawBase}/README.md`,
    cssURL: `${rawBase}/Themes/Snowtify/user.css`,
    schemesURL: `${rawBase}/Themes/Snowtify/color.ini`,
    schemes: {
      Frost: {
        text: "F4FBFF",
        subtext: "A8BEC8",
        main: "071014",
        "main-elevated": "0D1A20",
        highlight: "13252C",
        "highlight-elevated": "19313A",
        sidebar: "050B0E",
        player: "091318",
        card: "101F25",
        shadow: "020507",
        "selected-row": "8ADFFF",
        button: "7ADDF7",
        "button-active": "A6ECFF",
        "button-disabled": "3C4B52",
        "tab-active": "132A33",
        notification: "7ADDF7",
        "notification-error": "FF7B70",
        misc: "9CE8CD"
      }
    },
    activeScheme: "Frost",
    stars: 0,
    tags: ["dark", "minimal", "blue"],
    lastUpdated: "2026-07-17T00:00:00Z",
    created: "2026-07-17T00:00:00Z"
  };

  const openDatabase = () => new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    const request = window.indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  const readRecord = (database, key) => new Promise((resolve) => {
    if (!database) return resolve(null);
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => resolve(null);
  });

  const writeRecords = (database, records) => new Promise((resolve) => {
    if (!database) return resolve();
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    records.forEach(([key, value]) => store.put({ key, value }));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });

  const database = await openDatabase();
  const storedActiveTheme = await readRecord(database, activeThemeKey);
  const activeTheme = storedActiveTheme || localStorage.getItem(activeThemeKey);

  if (activeTheme && activeTheme !== frostKey) {
    localStorage.setItem(markerKey, "preserved-existing-theme");
    return;
  }

  const storedThemes = await readRecord(database, installedThemesKey);
  let installedThemes;
  try {
    installedThemes = JSON.parse(storedThemes || localStorage.getItem(installedThemesKey) || "[]");
  } catch {
    installedThemes = [];
  }
  if (!installedThemes.includes(frostKey)) installedThemes.push(frostKey);

  const records = [
    [frostKey, JSON.stringify(frostTheme)],
    [installedThemesKey, JSON.stringify(installedThemes)],
    [activeThemeKey, frostKey],
    [localThemeKey, "marketplace"]
  ];

  records.forEach(([key, value]) => localStorage.setItem(key, value));
  await writeRecords(database, records);
  localStorage.setItem(markerKey, "installed");

  if (!sessionStorage.getItem("snowtify:frost-marketplace-reload")) {
    sessionStorage.setItem("snowtify:frost-marketplace-reload", "1");
    window.setTimeout(() => window.location.reload(), 250);
  }
})();
