

// console.log("Hello background js!")

//injects content script for extension in every page
chrome.runtime.onInstalled.addListener(async () => {
    for (const cs of chrome.runtime.getManifest().content_scripts) {
        for (const tab of await chrome.tabs.query({ url: cs.matches })) {
            if (!tab.url?.startsWith("chrome://") && !tab.url?.startsWith("edge://")) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: cs.js,
                });
            }

        }
    }

});

//add listener for content script requesting data from store

chrome.runtime.onMessage.addListener((request, sender, respond) => {

    if (request.type === "SAVE_TO_STORE") {
        const { data } = request;

        console.log("SAVE_TO_STORE received :: ", request)

        chrome.storage.local.get([data.site], (res) => {

            let content;

            if (res[data.site]) {

                const rules = res[data.site].rules.concat(data.rules);

                res[data.site].rules = rules;

                content = res[data.site]
            }

            chrome.storage.local.set({ [data.site]: content ?? data }).then(() => {

                chrome.action.setBadgeText({ text: data.rules.length + '' })

                console.log("New rules added for ==> " + data.site);
                respond("New rules added for " + data.site + "!")
            });

        })


    }
    if (request.type === "GET_RULES") {
        chrome.storage.local.get([request.site]).then((result) => {

            chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });

            if (result[request.site]) {

                respond({
                    data: result[request.site].rules
                });

                chrome.action.setBadgeText({ text: `${result[request.site]?.rules?.length || 0}`, tabId: sender?.tab?.id || request?.tabId });

            }
            else {
                chrome.action.setBadgeText({ text: '0', tabId: sender?.tab?.id || request.tabId });
            }
        });
    }

    if (request.type === "SAVE_EDIT") {
        chrome.storage.local.get([request.site]).then((result) => {

            result[request.site].rules[request.data.index] = request.data.rule;

            chrome.storage.local.set({ [request.site]: result[request.site] }, (res) => console.log("SAVED EDIT UPON REQUEST"))

        })
    }

    if (request.type === "DELETE_RULE") {
        chrome.storage.local.get([request.site]).then((result) => {

            const rules = result[request.site].rules;
            rules.splice(request.data.index, 1);

            if (rules?.length === 0) {
                chrome.storage.local.remove([request.site], (res) => respond("ALL RULES CLEARED FOR THIS SITE"))
            }
            else {
                result[request.site].rules = rules;

                chrome.storage.local.set({ [request.site]: result[request.site] }, (res) => respond("DELETED RULE FROM SITE RULES"));
            }

        })
    }

    return true
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log(tabId)
})