import { extractProfileFromDocument } from "./lib/scraper";

type LinkedinProfile = {
  name: string;
  company: string;
  title: string;
  location: string;
  profileUrl: string;
};

type ExtractProfileResponse =
  | { ok: true; profile: LinkedinProfile }
  | { ok: false; error: string };

const EXTRACTION_RETRY_ATTEMPTS = 3;
const EXTRACTION_RETRY_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForDocumentReady(timeoutMs = 3000) {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    return;
  }

  await Promise.race([
    new Promise<void>((resolve) => {
      const onReady = () => {
        if (document.readyState === "complete" || document.readyState === "interactive") {
          document.removeEventListener("readystatechange", onReady);
          resolve();
        }
      };
      document.addEventListener("readystatechange", onReady);
    }),
    sleep(timeoutMs),
  ]);
}

async function extractProfile(): Promise<ExtractProfileResponse> {
  console.log("[content] Starting profile extraction", {
    url: window.location.href,
    readyState: document.readyState,
  });

  await waitForDocumentReady();

  let lastError = "Could not extract LinkedIn profile.";

  for (let attempt = 1; attempt <= EXTRACTION_RETRY_ATTEMPTS; attempt += 1) {
    let result: ReturnType<typeof extractProfileFromDocument>;
    try {
      result = extractProfileFromDocument(document);
    } catch (error) {
      const thrownMessage =
        error instanceof Error ? error.message : "Unexpected extraction error.";
      lastError = thrownMessage;
      console.log("[content] extractProfileFromDocument threw", {
        attempt,
        error: thrownMessage,
      });

      if (attempt < EXTRACTION_RETRY_ATTEMPTS) {
        await sleep(EXTRACTION_RETRY_DELAY_MS);
        continue;
      }

      return { ok: false, error: thrownMessage };
    }

    if (result.ok) {
      const success: ExtractProfileResponse = {
        ok: true,
        profile: {
          ...result.profile,
          profileUrl: window.location.href.split("?")[0],
        },
      };
      console.log("[content] Profile extraction success", {
        attempt,
        profile: success.profile,
      });
      return success;
    }

    lastError = result.error;
    console.log("[content] Profile extraction attempt failed", {
      attempt,
      error: result.error,
      readyState: document.readyState,
    });

    if (attempt < EXTRACTION_RETRY_ATTEMPTS) {
      await sleep(EXTRACTION_RETRY_DELAY_MS);
    }
  }

  console.log("[content] Profile extraction failed", {
    error: lastError,
  });

  return {
    ok: false,
    error: lastError,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "EXTRACT_PROFILE") {
    return false;
  }

  extractProfile()
    .then((response) => sendResponse(response))
    .catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected extraction error.";
      console.log("[content] Unhandled extraction error", { error: errorMessage });
      sendResponse({
        ok: false,
        error: errorMessage,
      });
    });

  return true;
});
