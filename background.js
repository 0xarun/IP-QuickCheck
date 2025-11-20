chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.storage.local.set({ vtKey: null, abuseKey: null, ipinfoKey: null }, () => {
            chrome.runtime.openOptionsPage();
        });
    } else {
        chrome.storage.local.get(["ipinfoKey"], (res) => {
            if (res.ipinfoKey === undefined) {
                chrome.storage.local.set({ ipinfoKey: null });
            }
        });
    }

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "checkIP",
            title: "Check IP Reputation",
            contexts: ["selection"]
        });
    });
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "checkIP") {
        chrome.storage.local.set({ selectedIP: info.selectionText.trim() });
        chrome.action.openPopup();
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "checkIPNow") {
        runChecks(msg.ip).then(sendResponse);
        return true;
    }
});

async function runChecks(ip) {
    const keys = await chrome.storage.local.get(["vtKey", "abuseKey", "ipinfoKey"]);

    if (!keys.vtKey || !keys.abuseKey) {
        return { error: "NO_API_KEYS" };
    }

    try {
        const [vt, abuse, ipinfo] = await Promise.all([
            fetchVT(ip, keys.vtKey),
            fetchAbuse(ip, keys.abuseKey),
            keys.ipinfoKey ? fetchIpinfo(ip, keys.ipinfoKey) : Promise.resolve(null)
        ]);
        return { vt, abuse, ipinfo };
    } catch (e) {
        return { error: e.toString() };
    }
}

async function fetchVT(ip, key) {
    const res = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
        headers: { "x-apikey": key }
    });
    return await res.json();
}

async function fetchAbuse(ip, key) {
    const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
        headers: {
            "Key": key,
            "Accept": "application/json"
        }
    });
    return await res.json();
}

async function fetchIpinfo(ip, token) {
    const res = await fetch(`https://ipinfo.io/${ip}?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
        throw new Error(`Ipinfo error ${res.status}`);
    }
    return await res.json();
}