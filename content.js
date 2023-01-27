
let rulesForThisSite;

//Ask background js for updated store
const site = new URL(document.location);

chrome.runtime.sendMessage({ type: "GET_RULES", site: site.origin }, (response) => {
    const { data } = response ?? {};

    console.log("Current site is: ", site)

    const rules = data;

    if (rules) {

        rulesForThisSite = rules;

        console.info("Rules found for this site:: ", rules)

    }
    else {
        console.info("No rules found for this site")
    }

});

window.addEventListener('scroll', async () => {

    const pathname = window.location.pathname;

    chrome.runtime.sendMessage({ type: "UPDATE_BADGE", value: rulesForThisSite?.length ?? 0 });
    console.log({ rulesForThisSite })

    if (rulesForThisSite) {

        rulesForThisSite.forEach(rule => {

            rule?.itemsSelectors?.forEach(container => {

                const cards = document.querySelectorAll(container);

                cards.forEach(card => {
                    const text = card.innerText;

                    const checkForTerms = (text, terms) => {
                        let isTermFound = false;

                        terms.forEach(term => {
                            const pattern = new RegExp(term, "gi")
                            const isMatch = text.toLowerCase().split(pattern).length > 1;

                            if (isMatch) {
                                isTermFound = true;
                                return;
                            }
                        })

                        return isTermFound;
                    }

                    const isMatch = checkForTerms(text, rule.searchTerms);

                    if (isMatch) {
                        card.remove();
                        return;
                    }

                    rule?.subPages?.linksToFollowSelectors?.forEach(linkToFollow => {

                        const link = card.querySelector(linkToFollow).href;

                        (async () => {

                            const res = await (await fetch(link)).text();

                            const doc = document.createElement('html');
                            doc.innerHTML = res;

                            rule?.subPages?.itemsSelectors?.forEach(container => {
                                const blocks = doc.getElementsByTagName(container);

                                blocks.forEach(block => {
                                    const text = block.text;

                                    const isMatch = checkForTerms(text, rule.subPages.searchTerms)

                                    if (isMatch) {
                                        block.remove();
                                        return;
                                    }
                                })

                            })

                        })();

                    })

                })
            })
        })
    }
})


// TODO: ON request from popup.js, allow the user to hover over elements and click to select which element they want ids calculated for!
function EditMode() {
    document.body.addEventListener('mouseover', function mouseoverListener(e) {
        const el = e.target;
        const elementStyle = el.style;
        const computedStyle = window.getComputedStyle(el, null);

        const inlineBackgroundColor = elementStyle['background-color'];
        const inlineTextColor = elementStyle['color'];
        const computedBackgroundColor = computedStyle['background-color'];
        const computedTextColor = computedStyle['color'];

        el.style.backgroundColor = 'yellow';
        el.style.color = 'blue';

        el.addEventListener('mouseout', function mouseoutListener(e) {
            el.style.backgroundColor = computedBackgroundColor;
            el.style.color = computedTextColor;

            el.removeEventListener('mouseout', mouseoutListener);
        })

        el.addEventListener('click', function mouseClickListener(e) {
            console.log("Should've calculated element selector by now!", e.target);
            el.removeEventListener('click', mouseClickListener);
            document.body.removeEventListener('mouseover', mouseoverListener)
        })
    });
}