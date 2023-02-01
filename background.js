async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

const activeTab = getCurrentTab();

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

});

//add listener for content script requesting data from store

chrome.runtime.onMessage.addListener((request, sender, respond) => {

    if (request.type === "SAVE_TO_STORE") {
        const { data } = request;

        chrome.storage.local.get([data.site], (res) => {

            let content;

            if (res[data.site]) {

                const rules = res[data.site]?.rules?.concat(data.rules) ?? [];

                res[data.site].rules = rules;

                content = res[data.site]
            }

            chrome.storage.local.set({ [data.site]: content ?? data }, (res) => {
                respond("New rules added for " + data.site + "!")
            });

        })


    }
    if (request.type === "GET_RULES") {
        chrome.storage.local.get([request.site]).then((result) => {

            if (result[request.site]) {

                respond({
                    data: result[request.site].rules
                });
            }
            else {
                respond({ data: [] })
            }

        });
    }

    if (request.type === "SAVE_EDIT") {
        chrome.storage.local.get([request.site]).then((result) => {

            result[request.site].rules[request.data.index] = request.data.rule;

            chrome.storage.local.set({ [request.site]: result[request.site] }, (res) => { })

        })
    }

    if (request.type === "DELETE_RULE") {
        chrome.storage.local.get([request.site]).then((result) => {

            const rules = result[request.site]?.rules ?? [];
            rules.splice(request.data.index, 1);

            result[request.site].rules = rules;

            chrome.storage.local.set({ [request.site]: result[request.site] }, (res) => respond("DELETED RULE FROM SITE RULES"));
        })
    }

    return true
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    const url = tab.active && (new URL(tab.url)).origin;

    url && updateBadge(tabId, url);
})