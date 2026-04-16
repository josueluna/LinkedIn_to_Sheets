import { extractProfileFromDocument } from "./lib/scraper";

type LinkedinProfile = {
  name: string;
  company: string;
  title: string;
  location: string;
  profileUrl: string;
};

function extractProfile():
  | { ok: true; profile: LinkedinProfile }
  | { ok: false; error: string } {
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
