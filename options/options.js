const saveBtn = document.getElementById("save");
const vtInput = document.getElementById("vtKey");
const abuseInput = document.getElementById("abuseKey");
const ipinfoInput = document.getElementById("ipinfoKey");
const saveSuccess = document.getElementById("saveSuccess");
const visibilityToggles = document.querySelectorAll(".toggle-visibility");

// Load saved keys
chrome.storage.local.get(["vtKey", "abuseKey", "ipinfoKey"], (res) => {
    if (res.vtKey) vtInput.value = res.vtKey;
    if (res.abuseKey) abuseInput.value = res.abuseKey;
    if (res.ipinfoKey) ipinfoInput.value = res.ipinfoKey;
});

// Save keys
saveBtn.onclick = () => {
    const vtKey = vtInput.value.trim();
    const abuseKey = abuseInput.value.trim();
    const ipinfoKey = ipinfoInput.value.trim();

    if (!vtKey || !abuseKey) {
        alert("Please enter both VirusTotal and AbuseIPDB API keys");
        return;
    }

    chrome.storage.local.set({
        vtKey,
        abuseKey,
        ipinfoKey: ipinfoKey || null
    }, () => {
        // Visual feedback on button
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="btn-icon">✓</span> Saved!';
        saveBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        
        // Show success message
        saveSuccess.style.display = 'flex';
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.style.background = '';
        }, 2000);
    });
};

visibilityToggles.forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        btn.textContent = isHidden ? "🙈" : "👁️";
        btn.setAttribute("aria-label", isHidden ? "Hide API key" : "Show API key");
    });
});
