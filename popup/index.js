async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    });

    return await tabs[0];
}

const activeTab = getActiveTabURL();

let uiPanel;

function listenToAddNewRule() {
    document.querySelector('button[id=add-new]')?.addEventListener('click', (e) => {
        preSave = uiPanel.innerHTML;

        uiPanel.innerHTML = newRuleForm;

        const form = document.querySelector('form');
        form?.addEventListener('submit', handleFormSubmit);

        document.querySelector('button[id=cancel-rule]')?.addEventListener('click', (e) => {
            console.log("Redirecting to dashboard ...>");
            uiPanel.innerHTML = preSave;

            listenToAddNewRule();
            listenToViewRules();
        })

    })
}

const listenToViewRules = async () => {

    document.querySelector('button[id=view-rules]')?.addEventListener('click', (e) => {
        RenderViewRules()
    })
}

function generateViewRule(item) {
    return (
        `
        <dl>
            <div>
                <dt>
                    Containers to check (separated by semi-colons):
                </dt>
                <dd>${item?.itemsSelectors.join(', ')}</dd>
            </div>

            <div>
                <dt>
                    Terms to look for (separated by semi-colons):
                </dt>
                <dd>${item?.searchTerms.join(', ')}</dd>
            </div>

            <div>
                <dt>
                    Link elements to follow in container (separated by semi-colons):
                </dt>
                <dd>${item?.subPages[0]?.linksToFollowSelectors.join(', ')}</dd>
            </div>
            <div>
                <dt>
                    Elements to check in followed links (separated by semi-colons):
                </dt>
                <dd>${item?.subPages[0]?.itemsSelectors.join(', ')}</dd>

            </div>
            <div>
                <dt>
                    Terms to look for in following links (separated by semi-colons):
                </dt>
                <dd>${item?.subPages[0]?.searchTerms.join(', ')}</dd>
            </div>
        </dl>
        <button id="edit-rule" style="margin-bottom: 2%;" type="text">EDIT THIS RULE</button>
        <button id="delete-rule" style="margin-bottom: 2%;" type="text">DELETE THIS RULE</button>
        `
    )
}

async function listenToEditRule(data, index) {
    const url = new URL((await activeTab).url);

    const item = data[index];

    document.querySelector('button[id=edit-rule]')?.addEventListener('click', (e) => {

        uiPanel.innerHTML = editRuleForm(item);

        document.querySelector('button[id=cancel-edit]')?.addEventListener('click', (e) => addDashboard())

        const form = document.querySelector('form');

        form?.addEventListener('submit', (e) => {

            console.log("attempting to save edit rule");

            chrome.runtime.sendMessage({
                type: "SAVE_EDIT", site: url.origin, tabId: activeTab.id, data: {
                    index,
                    rule: {
                        itemsSelectors: e.target.querySelector('input[id=container]').value.toString().split(';'),
                        searchTerms: e.target.querySelector('input[id=terms]').value.toString().split(';'),
                        action: "DELETE",
                        subPages: [
                            {
                                linksToFollowSelectors: e.target.querySelector('input[id=links-to-follow]').value.toString().split(';'),
                                itemsSelectors: e.target.querySelector('input[id=subpage-containers]').value.toString().split(';'),
                                searchTerms: e.target.querySelector('input[id=subpage-terms]').value.toString().split(';'),
                            }
                        ]
                    }
                }
            }, (res) => console.log("Done editing rule"))

        });
    })
}

async function listenToDeleteRule(data, index) {
    const url = new URL((await activeTab).url);

    document.querySelector('button[id=delete-rule]')?.addEventListener('click', (e) => {
        chrome.runtime.sendMessage({
            type: "DELETE_RULE",
            site: url.origin,
            tabId: activeTab.id,
            data: {
                index
            }
        }, (res) => {
            console.log(res);

            RenderViewRules();
        })
    })

}


function updateRuleViewDOM(data, InComingPagination) {
    const pagination = { ...InComingPagination }

    uiPanel.innerHTML = `
        <div class="view-items">
            <div class="pagination">
                ${pagination.current === 1 ? '<button id="return-home">Back to dashboard</button>' : '<button id="prev-item" type="text">Previous</button>'}
                <div class="pagination-status">${pagination.current} of ${pagination.total}</div>
                ${pagination.current === data.length ? '<div></div>' : '<button id="next-item" type="text">Next</button>'}
            </div>
            <div class="view-item">
                ${generateViewRule(data[pagination.current - 1])}
            </div>
        </div>
    `;

    listenToEditRule(data, pagination.current - 1);
    listenToDeleteRule(data, pagination.current - 1);

    document.querySelector('button[id=return-home]')?.addEventListener('click', (e) => {
        addDashboard();
    })

    pagination.current > 1 && document.querySelector('button[id*=prev-item]')?.addEventListener('click', (e) => {
        if (pagination.current === 1) return;

        pagination.current -= 1;
        updateRuleViewDOM(data, pagination)
    })

    pagination.current < pagination.total && document.querySelector('button[id*=next-item]')?.addEventListener('click', (e) => {
        if (pagination.current === pagination.total) return;

        pagination.current += 1;
        updateRuleViewDOM(data, pagination)
    })
}

async function RenderViewRules() {
    const url = new URL((await activeTab).url);

    chrome.runtime.sendMessage({ type: "GET_RULES", site: url.origin, tabId: activeTab.id }, (response) => {
        const { data } = response;

        const pagination = {
            current: 1,
            total: data.length
        }

        updateRuleViewDOM(data, pagination);
    })
}


const newRuleForm = `
    <div>
        Add rules for the current page, please pass appropriate CSS selectors for elements. Each rule will determine types of items that can be deleted from the page!
        <form>
            <label for="containers">
                Containers to check (separated by semi-colons):
            </label>
            <input id="container" type="text" placeholder="div[id*=property-]" />

            <label for="terms">
                Terms to look for (separated by semi-colons):
            </label>
            <input id="terms" type="text" placeholder="student" />

            <label for="links-to-follow">
                Link elements to follow in container (separated by semi-colons):
            </label>
            <input id="links-to-follow" type="text" placeholder="a.propertyCard-link" />

            <label for="subpage-containers">
                Elements to check in followed links (separated by semi-colons):
            </label>
            <input id="subpage-containers" type="text" placeholder="main#property-info" />

            <label for="subpage-terms">
                Terms to look for in following links (separated by semi-colons):
            </label>
            <input id="subpage-terms" type="text" placeholder="Student;Flat;Shared">

            <span class="notification"></span>

            <div style="display: flex; width: 100%; gap: 2%; justify-content: end;">
                <button id="cancel-rule" type="button" style="margin-bottom: 2%;">CANCEL</button>
                <button id="add-rule" type="submit" style="margin-bottom: 2%;">ADD RULE</button>
            <div>
        </form>
    </div>
`;

const editRuleForm = (item) => `
    <div>
        Edit rule
        <form>
            <label for="containers">
                Container IDs (separated by semi-colons):
            </label>
            <input id="container" type="text" placeholder="div[id*=property-]" value="${item.itemsSelectors.join(';')}" />

            <label for="terms">
                Terms to look for (separated by semi-colons):
            </label>
            <input id="terms" type="text" placeholder="student" value="${item.searchTerms.join(';')}" />

            <label for="links-to-follow">
                Link elements to follow in container (separated by semi-colons):
            </label>
            <input id="links-to-follow" type="text" placeholder="a.propertyCard-link" value="${item.subPages[0].linksToFollowSelectors.join(';')}" />

            <label for="subpage-containers">
                Elements to check in followed links (separated by semi-colons):
            </label>
            <input id="subpage-containers" type="text" placeholder="main#property-info" value="${item.subPages[0].itemsSelectors.join(';')}"/>

            <label for="subpage-terms">
                Terms to look for in following links (separated by semi-colons):
            </label>
            <input id="subpage-terms" type="text" placeholder="Student;Flat;Shared" value="${item.subPages[0].searchTerms.join(";")}">
            <span class="notification"></span>
            <button style="margin-bottom: 2%;" type="button" id="cancel-edit">CANCEL</button>
            <button style="margin-bottom: 2%;" type="submit" id="save-edit">SAVE</button>
        </form>
    </div>
`;

async function addDashboard() {

    const url = new URL((await activeTab).url);

    chrome.runtime.sendMessage({ type: "GET_RULES", site: url.origin, tabId: activeTab.id }, (response) => {
        console.log("Requesting content for ... ", url.origin)
        const { data } = response ?? {};

        const rules = data;

        if (rules) {

            chrome.action.setBadgeText({ text: rules.length + '' })

            uiPanel.innerHTML = `
                <div>
                    <div>
                        There are ${rules.length} rules for this site
                    </div>
                    <div class="rule-count-wrapper" aria-hidden="true">
                        <div class="rule-count">${rules.length}</div>
                    </div>
                    </div>
                    <div>
                    Do you want to?
                    <button id="view-rules" type="text">View rules</button>
                    <button id="add-new" type="text">Add new rule</button>
                </div>
            `;

        }
        else {
            chrome.action.setBadgeText({ text: '0' })

            uiPanel.innerHTML = `
                <div>
                    <div>
                        There are 0 rules for this site
                    </div>
                    <div class="rule-count-wrapper" aria-hidden="true">
                        <div class="rule-count">0</div>
                    </div>
                    </div>
                    <div>
                    Do you want to?
                    <button id="add-new" type="text">Add new rule</button>
                </div>
            `;
        }

        listenToAddNewRule();

        listenToViewRules();

    });
}


document.addEventListener('DOMContentLoaded', async () => {


    uiPanel = document.querySelector('.r-side');

    listenToAddNewRule();

    addDashboard();

})

/*
    Sends message containing new item to add which will be heard by Background.js and stored in extensionStorage
*/
async function handleFormSubmit(e) {

    e.preventDefault();
    e.stopPropagation();


    const url = new URL((await activeTab).url);

    try {

        const siteToAdd = [
            {
                title: activeTab.title,
                site: url.origin,
                path: url.pathname,
                rules: [
                    {
                        itemsSelectors: e.target.querySelector('input[id=container]').value.toString().split(';'),
                        searchTerms: e.target.querySelector('input[id=terms]').value.toString().split(';'),
                        action: "DELETE",
                        subPages: [
                            {
                                linksToFollowSelectors: e.target.querySelector('input[id=links-to-follow]').value.toString().split(';'),
                                itemsSelectors: e.target.querySelector('input[id=subpage-containers]').value.toString().split(';'),
                                searchTerms: e.target.querySelector('input[id=subpage-terms]').value.toString().split(';'),
                            }
                        ]
                        // subPageAction: "DELETE" //will use parent action if affirmative
                    }
                ]
            }
        ]

        try {
            const callback = (response) => {
                console.log("Received add-reply from background.js  >>> ", response);
                document.querySelector('form').reset();
                const notification = document.querySelector('.notification')
                notification.style = 'display: block; width: auto; height: 100%; padding: 2%; background-color:green; color:yellow; transition: all 1s ease-in;'
                notification.innerText = "Successfully added new rule!"
                setTimeout(() => {
                    notification.style = "display: none; height:0px;"
                    addDashboard();
                }, 5000)
            }
            console.log("Going to try and send message to background! ")
            chrome.runtime.sendMessage({ type: "SAVE_TO_STORE", data: siteToAdd[0] }, callback);
        }
        catch (err) {
            console.error("Oops, there's an error about sending to store data! >> ", err)
        }

    }
    catch (err) {
        console.error("Ouch, there's been submission error :: ", err)
    }
}
