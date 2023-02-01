## DRIBBLE: An extension to simplify your browsing experience

**Story behind this extension:** I was unfortunately sifting through many pages of many websites daily looking for a house. Adverts, as they usually do, and irrelevant results annoy me. So, I came up with the idea to build something that I can tell what to delete for me before my eyes see them ... and that is this item.

**Current status:** The extension is in its first draft, usable by fellow devs and to non-devs with a little dev guidance. The extension is also powered by messy JavaScript. I will look into rewriting it properly so that:
- The JS is cleaner
- The extension can autocalculate CSS selectors and allow users to just pinpoint the elements with their mouse or touch.
- Enable the user to choose actions that will be taken by the extension when provided conditions are met. At the moment, it defaults to deleting items.

**Application:** This extension can be used in different sites for different purposes. For example, you may want to remove clickbait videos in YouTube based on terms that appear in their title or you may want filter out tweets containing inappropriate terms, or job adverts that are irrelevant to your search query, or even car listings that don't matter to you. It gives you the ability to filter what you don't want based on terms (if any). As mentioned in the above section, I acknowledge that being able to choose the action the extension will take when conditions are met will broaden the use cases and usefulness of the extension, and I hope to work on that when I get time.

**Example use case:** Take github as an example and let's say you don't want to see any `.js` files in the repository content table above. Then you can pass `div[role=row]` to the _containers_ input and `.js` to the _terms to look for_ input. [Example image](./example.png)

**Installation:** At this stage, the extension has not been published to the chrome / edge extensions store. However, you can still use the extension by cloning this repo and uploading it unpacked, in dev mode, to your browser. Here's the relevant how-to guide for [Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading) and for [Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked). 