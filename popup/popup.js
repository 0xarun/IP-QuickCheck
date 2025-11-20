window.addEventListener("load", async () => {
    const container = document.querySelector(".container");
    const ipBox = document.getElementById("ip");
    const vtMetric = document.getElementById("vtMetric");
    const abuseMetric = document.getElementById("abuseMetric");
    const defangedValue = document.getElementById("defangedValue");
    const copyDefangedBtn = document.getElementById("copyDefanged");
    const ipinfoStatus = document.getElementById("ipinfoStatus");
    const ipinfoGrid = document.getElementById("ipinfoGrid");
    const ipinfoOrg = document.getElementById("ipinfoOrg");
    const ipinfoLocation = document.getElementById("ipinfoLocation");
    const ipinfoRdns = document.getElementById("ipinfoRdns");
    const ipinfoType = document.getElementById("ipinfoType");
    const ipinfoCoords = document.getElementById("ipinfoCoords");
    const privacyChips = document.getElementById("privacyChips");
    const quickLinks = {
        vt: document.getElementById("vtLink"),
        abuse: document.getElementById("abuseLink"),
        ipinfo: document.getElementById("ipinfoLink")
    };

    if (!container || !ipBox || !vtMetric || !abuseMetric || !defangedValue) {
        console.error("Popup markup missing required elements.");
        return;
    }

    const setMetricState = (el, state, valueText, subText) => {
        el.classList.remove("state-good", "state-bad", "state-neutral");
        if (state) {
            el.classList.add(`state-${state}`);
        }
        if (valueText !== undefined) {
            el.querySelector(".metric-value").textContent = valueText;
        }
        if (subText !== undefined) {
            el.querySelector(".metric-subtext").textContent = subText;
        }
    };

    const updateQuickLinks = (ip) => {
        if (!ip) {
            Object.values(quickLinks).forEach((link) => {
                if (!link) return;
                link.setAttribute("aria-disabled", "true");
                link.classList.add("disabled");
                link.removeAttribute("href");
            });
            return;
        }
        Object.values(quickLinks).forEach((link) => {
            if (!link) return;
            link.removeAttribute("aria-disabled");
            link.classList.remove("disabled");
        });
        if (quickLinks.vt) quickLinks.vt.href = `https://www.virustotal.com/gui/ip-address/${ip}`;
        if (quickLinks.abuse) quickLinks.abuse.href = `https://www.abuseipdb.com/check/${ip}`;
        if (quickLinks.ipinfo) quickLinks.ipinfo.href = `https://ipinfo.io/${ip}`;
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
                <button id='setupBtn' class='ghost-btn' style="width:auto;margin-top:12px;">⚙️ Open Setup</button>
            </div>
        `;
        document.getElementById("setupBtn").onclick = () => chrome.runtime.openOptionsPage();
    };

    const showError = (message) => {
        setMetricState(vtMetric, "bad", "Error", message);
        setMetricState(abuseMetric, "bad", "Error", message);
        defangedValue.textContent = message;
        if (ipinfoStatus) {
            ipinfoStatus.textContent = message;
            if (ipinfoGrid) ipinfoGrid.hidden = true;
            if (privacyChips) privacyChips.innerHTML = "";
        }
    };

    const { vtKey, abuseKey, ipinfoKey, selectedIP } = await chrome.storage.local.get(["vtKey", "abuseKey", "ipinfoKey", "selectedIP"]);

    if (!vtKey || !abuseKey) {
        showSetupPrompt();
        return;
    }

    if (!selectedIP) {
        ipBox.innerHTML = `<span style="opacity: 0.7;">No IP selected</span>`;
        setMetricState(vtMetric, null, "—", "Waiting for selection");
        setMetricState(abuseMetric, null, "—", "Waiting for selection");
        defangedValue.textContent = "—";
        if (ipinfoStatus) {
            ipinfoStatus.textContent = "Select an IP to view network information";
            if (ipinfoGrid) ipinfoGrid.hidden = true;
        }
        updateQuickLinks("");
        return;
    }

    ipBox.textContent = selectedIP;
    setMetricState(vtMetric, "neutral", "…", "Checking VirusTotal");
    setMetricState(abuseMetric, "neutral", "…", "Checking AbuseIPDB");
    defangedValue.textContent = "Formatting…";
    updateQuickLinks(selectedIP);

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
        const totalEngines = Object.values(vtStats).reduce((acc, val) => acc + (typeof val === "number" ? val : 0), 0);
        const vtState = malicious > 0 ? "bad" : "good";
        const vtSummary = `${malicious}/${totalEngines} engines`;
        const vtSubtext = malicious > 0 ? "Detections found" : "No malicious hits";
        setMetricState(vtMetric, vtState, vtSummary, vtSubtext);

        const abuseScore = abuseData.abuseConfidenceScore ?? 0;
        const abuseState = abuseScore >= 60 ? "bad" : abuseScore <= 5 ? "good" : "neutral";
        const abuseSubtext = abuseScore >= 60 ? "High risk" : abuseScore <= 5 ? "Low risk" : "Needs review";
        setMetricState(abuseMetric, abuseState, `${abuseScore}%`, abuseSubtext);

        const defangedIP = selectedIP
            .replace(/\./g, "[.]")
            .replace(/:/g, "[:]");
        defangedValue.textContent = defangedIP;

        if (copyDefangedBtn) {
            copyDefangedBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(defangedIP);
                    copyDefangedBtn.textContent = "Copied!";
                    setTimeout(() => (copyDefangedBtn.textContent = "Copy"), 1500);
                } catch (err) {
                    console.error("Clipboard copy failed", err);
                    copyDefangedBtn.textContent = "Copy failed";
                    setTimeout(() => (copyDefangedBtn.textContent = "Copy"), 1500);
                }
            };
        }

        if (ipinfoStatus) {
            if (res.ipinfo) {
                const org = res.ipinfo.org || "Unknown ISP";
                const locParts = [
                    res.ipinfo.city,
                    res.ipinfo.region,
                    res.ipinfo.country
                ].filter(Boolean);
                const coords = res.ipinfo.loc ? res.ipinfo.loc.replace(",", ", ") : "—";
                ipinfoOrg.textContent = org;
                if (ipinfoRdns) {
                    ipinfoRdns.textContent = res.ipinfo.hostname || "—";
                }
                ipinfoLocation.textContent = locParts.length ? locParts.join(", ") : "—";
                ipinfoCoords.textContent = coords;
                if (ipinfoType) {
                    ipinfoType.textContent = deriveIpType(res.ipinfo);
                }
                ipinfoStatus.textContent = "Live data from Ipinfo";
                if (ipinfoGrid) ipinfoGrid.hidden = false;

                if (privacyChips) privacyChips.innerHTML = "";
                const privacy = res.ipinfo.privacy || {};
                const flags = [
                    { label: "VPN", value: privacy.vpn },
                    { label: "Proxy", value: privacy.proxy },
                    { label: "TOR", value: privacy.tor },
                    { label: "Relay", value: privacy.relay },
                    { label: "Hosting", value: privacy.hosting }
                ];

                let renderedChip = false;
                if (privacyChips) {
                    flags.forEach(({ label, value }) => {
                        if (value === undefined) return;
                        const chip = document.createElement("span");
                        chip.className = `privacy-chip${value ? " flagged" : ""}`;
                        chip.textContent = value ? `${label} detected` : `${label} clear`;
                        privacyChips.appendChild(chip);
                        renderedChip = true;
                    });

                    if (!renderedChip) {
                        privacyChips.innerHTML = "";
                    }
                }
            } else if (ipinfoKey) {
                ipinfoStatus.textContent = "Unable to load Ipinfo data";
                if (ipinfoGrid) ipinfoGrid.hidden = true;
                if (privacyChips) privacyChips.innerHTML = "";
            } else {
                ipinfoStatus.textContent = "Add an Ipinfo token in Options to unlock network insights";
                if (ipinfoGrid) ipinfoGrid.hidden = true;
                if (privacyChips) privacyChips.innerHTML = "";
            }
        }
    });

    // Options link handler
    const optionsLink = document.getElementById("optionsLink");
    if (optionsLink) {
        optionsLink.onclick = (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
        };
    }

    function deriveIpType(ipinfo) {
        const privacy = ipinfo.privacy || {};
        if (privacy.tor) return "Tor exit";
        if (privacy.vpn) return "VPN";
        if (privacy.proxy) return "Proxy";
        if (privacy.hosting) return "Hosting / Cloud";
        if (privacy.relay) return "Relay";

        const asnType = ipinfo.asn?.type;
        if (asnType) {
            return formatLabel(asnType);
        }

        const companyType = ipinfo.company?.type;
        if (companyType) {
            return formatLabel(companyType);
        }

        return "Unknown";
    }

    function formatLabel(label) {
        return label
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }
});
