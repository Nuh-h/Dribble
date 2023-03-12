async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

const currentActiveTab = getCurrentTab();

chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });

const updateBadge = (tabId, url) => {
    chrome.storage.local.get([url], async (result) => {

        if (url?.startsWith("chrome://") || url?.startsWith("edge://")) return;

        if (result[url]) {

            chrome.action.setBadgeText({ text: `${result[url]?.rules?.length || 0}`, tabId: tabId });

        }
        else {
            chrome.action.setBadgeText({ text: '0', tabId: tabId });
        }
    });
}

// injects content script for extension in every page
chrome.runtime.onInstalled.addListener(async () => {

    for (const cs of chrome.runtime.getManifest().content_scripts) {
        for (const tab of await chrome.tabs.query({ url: cs.matches })) {

            if (!tab.url?.startsWith("chrome://") && !tab.url?.startsWith("edge://")) {

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: cs.js,
                });

                updateBadge(tab.id, tab.url);
            }

        }
    }

    return true

});

//add listener for content script requesting data from store

chrome.runtime.onMessage.addListener((request, sender, respond) => {

    switch (request.type) {
        case "SAVE_TO_STORE":
            console.log(">>> Going to save something in store --> ", request?.data)
            const { data } = request;

            chrome.storage.local.get([data.site], (res) => {

                console.log(">>> Succeeded with checking store --> ", res)

                let content;

                if (res[data.site]) {

                    const rules = res[data.site]?.rules?.concat(data.rules) ?? [];

                    res[data.site].rules = rules;

                    content = res[data.site]
                }

                chrome.storage.local.set({ [data.site]: content ?? data }, (res) => {
                    updateBadge(sender.tab.id, request.site)
                    respond("New rules added for " + data.site + "!")
                });

            });
            break;
        case "GET_RULES":

            console.log(">>> Getting rules for: ", request.site);

            chrome.storage.local.get([request.site]).then((result) => {

                console.log(">>> Got rules --> ", result)

                if (result[request.site]) {
                    const data = result[request.site]?.rules ?? [];

                    console.log(`>>> Sending rules of length ${data.length}`)

                    respond({ data });
                }
                else {
                    respond({ data: [] })
                }

            }).catch(console.error);
            break;

        case "SAVE_EDIT":
            chrome.storage.local.get([request.site]).then((result) => {

                result[request.site].rules[request.data.index] = request.data.rule;

                chrome.storage.local.set({ [request.site]: result[request.site] }, (res) => {
                    updateBadge(sender.tab.id, request.site)
                })

            });
            break;

        case "DELETE_RULE":
            chrome.storage.local.get([request.site]).then((result) => {

                const rules = result[request.site]?.rules ?? [];
                rules.splice(request.data.index, 1);

                result[request.site].rules = rules;

                chrome.storage.local.set({ [request.site]: result[request.site] }, (res) => {
                    updateBadge(sender.tab.id, request.site)
                    respond("DELETED RULE FROM SITE RULES")
                });
            });
            break;

        case "CLEAR_RULES":
            chrome.storage.local.remove([request.site], () => {
                updateBadge(sender.tab.id, request.site);
                respond({ deleted: true });
            })

        default: break;
    }

    updateBadge(currentActiveTab.id, request.site);

    return true
})

const UiToggle = (tabId, url) => {
    chrome.storage.local.get(["DRIBBLE_ACTIVE_TABS"], (res) => {

        const activeDribbleTabs = res["DRIBBLE_ACTIVE_TABS"];

        if (!(activeDribbleTabs && activeDribbleTabs.includes(url))) {
            chrome.storage.local.set({ "DRIBBLE_ACTIVE_TABS": [...(activeDribbleTabs ?? []), url] }, () => {
                chrome.tabs.sendMessage(tabId, { type: "TOGGLE_UI", shouldShow: true });
            });
        }
        else {
            const newTabs = activeDribbleTabs.filter((item) => item !== url);
            chrome.storage.local.set({ "DRIBBLE_ACTIVE_TABS": newTabs }, () => {
                chrome.tabs.sendMessage(tabId, { type: "TOGGLE_UI", shouldShow: false });
            });
        }

        updateBadge(tabId, url);

    });
};

const dispatchUiToggle = (tab, isTabUpdated = false) => {
    const url = tab.active && (new URL(tab.url)).origin;

    if (isTabUpdated) {
        url && chrome.storage.local.get(["DRIBBLE_ACTIVE_TABS"], (res) => {

            const activeDribbleTabs = res["DRIBBLE_ACTIVE_TABS"];

            chrome.storage.local.set({ "DRIBBLE_ACTIVE_TABS": newTabs }, () => {
                chrome.tabs.sendMessage(tabId, { type: "TOGGLE_UI", shouldShow: activeDribbleTabs?.includes(url) ?? false });
            });
        });

        return;
    }

    url && UiToggle(tab.id, url)
}

chrome.action.onClicked.addListener((tab) => dispatchUiToggle(tab));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => dispatchUiToggle(tab, true))