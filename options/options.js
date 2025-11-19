const saveBtn = document.getElementById("save");
const vtInput = document.getElementById("vtKey");
const abuseInput = document.getElementById("abuseKey");
const saveSuccess = document.getElementById("saveSuccess");

// Load saved keys
chrome.storage.local.get(["vtKey", "abuseKey"], (res) => {
    if (res.vtKey) vtInput.value = res.vtKey;
    if (res.abuseKey) abuseInput.value = res.abuseKey;
});

// Save keys
saveBtn.onclick = () => {
    const vtKey = vtInput.value.trim();
    const abuseKey = abuseInput.value.trim();

    if (!vtKey || !abuseKey) {
        alert("Please enter both API keys");
        return;
    }

    chrome.storage.local.set({
        vtKey: vtKey,
        abuseKey: abuseKey
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
