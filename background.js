let cleaning = false;

browser.action.onClicked.addListener(async () => {
  if (cleaning) return;
  cleaning = true;

  try {
    const windows = await browser.windows.getAll({ populate: true });
    for (const window of windows) {
      if (window.type !== "normal" || window.incognito) continue;

      for (const candidate of window.tabs) {
        if (candidate.pinned) continue;

        try {
          const currentWindow = await browser.windows.get(window.id);
          if (currentWindow.type !== "normal" || currentWindow.incognito) continue;

          // Check the tab last; skip tabs moved out of the checked window.
          const tab = await browser.tabs.get(candidate.id);
          if (tab.pinned || tab.incognito || tab.windowId !== currentWindow.id) continue;

          // Firefox cannot atomically remove a tab only if it is still unpinned.
          await browser.tabs.remove(tab.id);
        } catch {
          // Missing tabs/windows and other API failures must not stop the rest.
          // Do not log API error text: it can contain browsing data.
          console.error("JOMO: Could not check or close a tab; skipping it.");
        }
      }
    }
  } catch {
    console.error("JOMO: Could not enumerate browser windows.");
  } finally {
    cleaning = false;
  }
});
