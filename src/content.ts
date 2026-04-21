import { extractProfileFromDocument } from "./lib/scraper";

function extractProfile() {
  const result = extractProfileFromDocument(document);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    profile: {
      ...result.profile,
      profileUrl: window.location.href.split("?")[0],
    },
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EXTRACT_PROFILE") {
    sendResponse(extractProfile());
  }
  return true;
});
