window.addEventListener("load", async () => {
    const container = document.querySelector(".container");
    const ipBox = document.getElementById("ip");
    const vtBox = document.getElementById("vt");
    const abuseBox = document.getElementById("abuse");
    const defangedBox = document.getElementById("defanged");

    if (!container || !ipBox || !vtBox || !abuseBox || !defangedBox) {
        console.error("Popup markup missing required elements.");
        return;
    }

    const setState = (el, state) => {
        el.classList.remove("state-good", "state-bad", "state-neutral");
        if (state) {
            el.classList.add(`state-${state}`);
        }
    };

    const showSetupPrompt = () => {
        container.innerHTML = `
            <div class="popup-header">
                <img src="../assets/icon128.png" alt="IP QuickCheck" class="header-icon">
                <div class="header-text">
                    <h2>IP QuickCheck</h2>
                    <p class="subhead">Built by 0xarun</p>
                </div>
            </div>
            <div style="padding: 24px 18px; text-align: center;">
                <p class='warn'>🔑 API keys missing!</p>
                <button id='setupBtn'>⚙️ Open Setup</button>
            </div>
        `;
        document.getElementById("setupBtn").onclick = () => chrome.runtime.openOptionsPage();
    };

    const showError = (message) => {
        setState(vtBox, "bad");
        setState(abuseBox, "bad");
        setState(defangedBox, "bad");
        vtBox.innerHTML = `<p>❌ ${message}</p>`;
        abuseBox.innerHTML = `<p>❌ ${message}</p>`;
        defangedBox.innerHTML = `<p>❌ ${message}</p>`;
    };

    const { vtKey, abuseKey, selectedIP } = await chrome.storage.local.get(["vtKey", "abuseKey", "selectedIP"]);

    if (!vtKey || !abuseKey) {
        showSetupPrompt();
        return;
    }

    if (!selectedIP) {
        ipBox.innerHTML = `<span style="opacity: 0.7;">No IP selected</span>`;
        vtBox.innerHTML = `<p style="opacity: 0.6;">—</p>`;
        abuseBox.innerHTML = `<p style="opacity: 0.6;">—</p>`;
        defangedBox.innerHTML = `<p style="opacity: 0.6;">—</p>`;
        return;
    }

    ipBox.innerHTML = `<span>${selectedIP}</span>`;
    vtBox.innerHTML = `<p>⏳ Checking VirusTotal...</p>`;
    setState(vtBox, "neutral");
    abuseBox.innerHTML = `<p>⏳ Checking AbuseIPDB...</p>`;
    setState(abuseBox, "neutral");
    defangedBox.innerHTML = `<p>⏳ Formatting...</p>`;
    setState(defangedBox, "neutral");

    chrome.runtime.sendMessage({ action: "checkIPNow", ip: selectedIP }, (res) => {
        if (chrome.runtime.lastError) {
            showError("Background unreachable");
            console.error(chrome.runtime.lastError.message);
            return;
        }

        if (!res || res.error) {
            const message = res?.error === "NO_API_KEYS" ? "API keys missing" : "Error fetching data";
            showError(message);
            return;
        }

        const vtStats = res.vt?.data?.attributes?.last_analysis_stats;
        const abuseData = res.abuse?.data;

        if (!vtStats || !abuseData) {
            showError("Malformed response");
            return;
        }

        const malicious = vtStats.malicious ?? 0;
        const harmless = vtStats.harmless ?? 0;
        const vtState = malicious > 0 ? "bad" : "good";
        setState(vtBox, vtState);
        const vtIcon = malicious > 0 ? "🔴" : "🟢";
        vtBox.innerHTML = `<p>${vtIcon} ${malicious} malicious | ${harmless} harmless</p>`;

        const abuseScore = abuseData.abuseConfidenceScore ?? 0;
        const abuseState = abuseScore >= 60 ? "bad" : abuseScore <= 5 ? "good" : "neutral";
        setState(abuseBox, abuseState);
        const abuseIcon = abuseScore >= 60 ? "🔴" : abuseScore <= 5 ? "🟢" : "🟡";
        abuseBox.innerHTML = `<p>${abuseIcon} Confidence: ${abuseScore}%</p>`;

        const defangedIP = selectedIP
            .replace(/\./g, "[.]")
            .replace(/:/g, "[:]");
        setState(defangedBox, "neutral");
        defangedBox.innerHTML = `
            <div>
                <p class="defanged-label">Defanged form</p>
                <p class="defanged-ip">${defangedIP}</p>
            </div>
        `;
    });

    // Options link handler
    const optionsLink = document.getElementById("optionsLink");
    if (optionsLink) {
        optionsLink.onclick = (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
        };
    }
});
