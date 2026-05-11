import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExtensionPopup from "../src/components/ExtensionPopup";

type StorageState = {
  isConnected?: boolean;
  spreadsheetId?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
  columnMapping?: {
    name: { enabled: boolean; column: string };
    company: { enabled: boolean; column: string };
    title: { enabled: boolean; column: string };
    location: { enabled: boolean; column: string };
    profileUrl: { enabled: boolean; column: string };
  };
};

type SendMessagePayload = {
  type?: string;
  [key: string]: unknown;
};

const defaultProfile = {
  name: "Ada Lovelace",
  company: "Analytical Engines Inc.",
  title: "Engineer",
  location: "London",
  profileUrl: "https://linkedin.com/in/ada",
};

// ── Force English so all text assertions match regardless of test runner locale ──
beforeEach(() => {
  Object.defineProperty(navigator, "language", {
    value: "en-US",
    configurable: true,
  });
});

function createChromeMock({
  storageState,
  profile = defaultProfile,
}: {
  storageState: StorageState;
  profile?: typeof defaultProfile;
}) {
  const addListener = vi.fn();
  const removeListener = vi.fn();

  const sendMessage = vi.fn(async (payload: SendMessagePayload) => {
    switch (payload.type) {
    case "GET_ACTIVE_PROFILE":
      return { ok: true, profile };
    case "LIST_SPREADSHEETS":
      return { ok: true, spreadsheets: [] };
    case "GET_SHEET_TABS":
      return { ok: true, tabs: [] };
    case "GET_SHEET_HEADERS":
      return { ok: true, headers: [] };
    default:
      return { ok: true };
    }
  });

  return {
    runtime: {
      getManifest: vi.fn(() => ({ version: "0.1.10" })),
      sendMessage,
    },
    storage: {
      local: {
        get: vi.fn(async () => storageState),
        set: vi.fn(async () => undefined),
      },
      onChanged: {
        addListener,
        removeListener,
      },
    },
  };
}

function renderPopupWithStorage(storageState: StorageState) {
  (globalThis as { chrome?: unknown }).chrome = createChromeMock({ storageState });
  return render(<ExtensionPopup />);
}

/**
 * getSectionByTitle — finds a labeled section by its visible text.
 *
 * The redesigned popup uses <div> containers instead of <section> elements,
 * so we walk up from the label text node to the nearest ancestor that also
 * contains the section's interactive content (inputs, buttons, etc.).
 * We stop at the first <div> whose textContent includes the title AND has
 * more than one direct child (i.e. it is a real section wrapper, not just
 * the label span itself).
 */
function getSectionByTitle(title: string): HTMLElement {
  const titleNode = screen.getByText(title);

  // Walk up the DOM until we find a div that wraps the whole section
  let el: HTMLElement | null = titleNode.parentElement;
  while (el && el !== document.body) {
    if (
      el.tagName === "DIV" &&
      el.children.length > 1 &&
      el.textContent?.includes(title)
      ) {
      return el;
  }
  el = el.parentElement;
}

  // Fallback: return the closest named container
const fallback = titleNode.closest("[class]") as HTMLElement | null;
if (fallback) return fallback;

throw new Error(`Could not find section wrapper for title: "${title}"`);
}

describe("ExtensionPopup UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it("shows disconnected initial state", async () => {
    renderPopupWithStorage({ isConnected: false });

    // Wait for hydration — the Connect button should appear
    await screen.findByRole("button", { name: /connect google account/i });

    expect(screen.getAllByText(/google account/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/connect google account/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not connected/i).length).toBeGreaterThan(0);
  });

  it("renders connected sections when connected state is hydrated", async () => {
    renderPopupWithStorage({
      isConnected: true,
      spreadsheetId: "sheet-123",
      spreadsheetName: "Candidates",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-123",
      sheetName: "Leads",
    });

    // Wait for hydration
    await screen.findByText(/destination/i);

    const destinationSection = getSectionByTitle("Destination");

    expect(destinationSection).toBeInTheDocument();
    expect(screen.getByText(/^destination$/i)).toBeInTheDocument();

    // Use getAllByText to avoid collision with "Paste Current Profile" button
    const profileLabelEls = screen.getAllByText(/current profile/i);
    expect(profileLabelEls.some((el) => el.tagName === "SPAN")).toBe(true);
  });

  it("current profile preview respects enabled mapping fields", async () => {
    renderPopupWithStorage({
      isConnected: true,
      columnMapping: {
        name:       { enabled: true,  column: "B" },
        company:    { enabled: false, column: "C" },
        title:      { enabled: true,  column: "D" },
        location:   { enabled: false, column: "E" },
        profileUrl: { enabled: true,  column: "F" },
      },
    });

    // Wait for the profile name to appear — the mock returns defaultProfile
    // so we wait for the name directly instead of the empty-state placeholder
    await screen.findByText(defaultProfile.name);

    // Assert enabled fields are visible
    expect(screen.getByText(defaultProfile.name)).toBeInTheDocument();
    expect(screen.getByText(defaultProfile.title)).toBeInTheDocument();
    const normalizedVisibleUrl = defaultProfile.profileUrl
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");

    expect(
      screen.getByText((content) => content.includes(normalizedVisibleUrl))
      ).toBeInTheDocument();

    // Assert disabled fields are NOT visible
    expect(screen.queryByText(defaultProfile.company)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultProfile.location)).not.toBeInTheDocument();
  });

  it("disables Save changes when active mapping columns are duplicated", async () => {
    renderPopupWithStorage({ isConnected: true });

    await screen.findByText(/destination/i);
    const destinationSection = getSectionByTitle("Destination");

    fireEvent.click(
      within(destinationSection).getByRole("button", {
        name: /config columns/i,
      })
      );

    // Column mapping panel title (EN: "Column Mapping")
    expect(await screen.findByText(/column mapping/i)).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "B" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save changes/i })
        ).toBeDisabled();
    });
  });

  it("keeps Profile URL required and not user-disableable", async () => {
    renderPopupWithStorage({ isConnected: true });

    await screen.findByText(/destination/i);
    const destinationSection = getSectionByTitle("Destination");

    fireEvent.click(
      within(destinationSection).getByRole("button", {
        name: /config columns/i,
      })
      );

    expect(await screen.findByText(/column mapping/i)).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    const profileUrlCheckbox = checkboxes[checkboxes.length - 1];

    expect(profileUrlCheckbox).toBeDisabled();
    expect(profileUrlCheckbox).toBeChecked();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
});