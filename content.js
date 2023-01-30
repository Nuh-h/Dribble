
const site = new URL(document.location);

chrome.runtime.sendMessage({ type: "GET_RULES", site: site.origin }, (response) => {
    const { data } = response ?? {};

    const rules = data;

    if (rules) {

        console.info("Rules found for this site: ", rules);

        activateRulesListener(rules);

    }
    else {
        console.info("No rules found for this site")
    }

});


function activateRulesListener(rulesForThisSite) {

    window.addEventListener('scroll', async () => {

        chrome.runtime.sendMessage({ type: "UPDATE_BADGE", value: rulesForThisSite?.length ?? 0 });

        rulesForThisSite?.forEach(rule => {

            rule?.itemsSelectors?.forEach(container => {

                const cards = document.querySelectorAll(container);

                Array.from(cards).every(card => {
                    const text = card.innerText;

                    const checkForTerms = (text, terms) => {
                        let isTermFound = false;

                        terms?.every(term => {
                            const pattern = new RegExp(term, "gi")
                            isTermFound = text.toLowerCase().split(pattern).length > 1;

                            //stop the iteration if we find a match
                            return !isTermFound
                        })

                        return isTermFound;
                    }

                    const isMatch = checkForTerms(text, rule.searchTerms);

                    if (isMatch) {
                        card.remove();
                        return false;
                    }

                    rule?.subPages?.linksToFollowSelectors?.forEach(linkToFollow => {

                        const link = card.querySelector(linkToFollow)?.href;

                        (async () => {

                            try {
                                const res = await (await fetch(link)).text();

                                const doc = document.createElement('html');
                                doc.innerHTML = res;

                                rule?.subPages?.itemsSelectors?.forEach(container => {
                                    const blocks = doc.querySelector(container);

                                    Array.from(blocks).every(block => {
                                        const text = block.text;

                                        const isMatch = checkForTerms(text, rule?.subPages?.searchTerms)

                                        if (isMatch) {
                                            block.remove();
                                            return false;
                                        }

                                        return true;
                                    })

                                })
                            }
                            catch (err) {
                                console.error(`Something went wrong trying to check content of a subpage (${link})`);
                            }
                        })();

                    })

                    return true;
                })
            })
        })
    })
}



// TODO: ON request from popup.js, allow the user to hover over elements and click to select which element they want ids/css-selectors calculated for!
function EditMode() {
    document.body.addEventListener('mouseover', function mouseoverListener(e) {
        const el = e.target;
        const computedStyle = window.getComputedStyle(el, null);

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