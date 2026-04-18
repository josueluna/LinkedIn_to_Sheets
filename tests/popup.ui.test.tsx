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
      getManifest: vi.fn(() => ({ version: "0.1.9" })),
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

function getSectionByTitle(title: string) {
  const titleNode = screen.getByText(title);
  const section = titleNode.closest("section");
  if (!section) {
    throw new Error(`Could not find section for title: ${title}`);
  }

  return section;
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

    expect(screen.getAllByText("Google Account").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Connect Google Account").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not connected").length).toBeGreaterThan(0);
  });

  it("renders connected sections when connected state is hydrated", async () => {
    renderPopupWithStorage({
      isConnected: true,
      spreadsheetId: "sheet-123",
      spreadsheetName: "Candidates",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-123",
      sheetName: "Leads",
    });

    await screen.findByText("Destination");

    const destinationSection = getSectionByTitle("Destination");
    const profileSection = getSectionByTitle("Current Profile");

    expect(destinationSection).toBeInTheDocument();
    expect(profileSection).toBeInTheDocument();

    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByText("Current Profile")).toBeInTheDocument();
    });

  it("current profile preview respects enabled mapping fields", async () => {
    renderPopupWithStorage({
      isConnected: true,
      columnMapping: {
        name: { enabled: true, column: "B" },
        company: { enabled: false, column: "C" },
        title: { enabled: true, column: "D" },
        location: { enabled: false, column: "E" },
        profileUrl: { enabled: true, column: "F" },
      },
    });

    await screen.findByText("Current Profile");

    const profileSection = getSectionByTitle("Current Profile");
    const profileCard = profileSection.querySelector(".rounded-lg");
    if (!profileCard) {
      throw new Error("Could not find current profile card");
    }

    const scoped = within(profileCard);

    expect(scoped.getByText(defaultProfile.name)).toBeInTheDocument();
    expect(scoped.getByText(defaultProfile.title)).toBeInTheDocument();
    expect(scoped.getByText(defaultProfile.profileUrl)).toBeInTheDocument();

    expect(scoped.queryByText(defaultProfile.company)).not.toBeInTheDocument();
    expect(scoped.queryByText(defaultProfile.location)).not.toBeInTheDocument();
  });

  it("disables Done when active mapping columns are duplicated", async () => {
    renderPopupWithStorage({ isConnected: true });

    await screen.findByText("Destination");
    const destinationSection = getSectionByTitle("Destination");

    fireEvent.click(
      within(destinationSection).getByRole("button", {
        name: /config columns/i,
      })
    );

    expect(await screen.findByText("Column Mapping")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "B" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    });
  });

  it("keeps Profile URL required and not user-disableable", async () => {
    renderPopupWithStorage({ isConnected: true });

    await screen.findByText("Destination");
    const destinationSection = getSectionByTitle("Destination");

    fireEvent.click(
      within(destinationSection).getByRole("button", {
        name: /config columns/i,
      })
    );

    expect(await screen.findByText("Column Mapping")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    const profileUrlCheckbox = checkboxes[checkboxes.length - 1];

    expect(profileUrlCheckbox).toBeDisabled();
    expect(profileUrlCheckbox).toBeChecked();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});
