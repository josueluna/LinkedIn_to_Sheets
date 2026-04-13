import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Building2,
  Briefcase,
  MapPin,
  ExternalLink,
  CircleDot,
  ChevronDown,
  FileSpreadsheet,
  Table2,
  Search,
  Check,
  RefreshCw,
} from "lucide-react";

type ConnectionStatus = "disconnected" | "connected";
type AppState = "empty" | "connected" | "saving" | "success" | "error";
type FeedbackTone = "success" | "error" | "warning" | "";

type LinkedinProfile = {
  name: string;
  company: string;
  title: string;
  location: string;
  profileUrl: string;
};

type SpreadsheetItem = {
  id: string;
  name: string;
  url: string;
  modifiedTime?: string;
};

type StoredConfig = {
  isConnected?: boolean;
  spreadsheetId?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
};

export default function ExtensionPopup() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [appState, setAppState] = useState<AppState>("empty");

  const [profile, setProfile] = useState<LinkedinProfile | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("");

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [selectedTab, setSelectedTab] = useState("");

  const [allSpreadsheets, setAllSpreadsheets] = useState<SpreadsheetItem[]>([]);
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);

  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
  const [tabPickerOpen, setTabPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [isDisconnectHover, setIsDisconnectHover] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isConnected = connectionStatus === "connected";

  const filteredSpreadsheets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSpreadsheets;
    return allSpreadsheets.filter((sheet) =>
      sheet.name.toLowerCase().includes(q)
    );
  }, [allSpreadsheets, searchQuery]);

  const canPaste =
    isConnected &&
    !!profile &&
    !!spreadsheetId &&
    !!selectedTab &&
    !isRefreshingProfile &&
    appState !== "saving";

  const pasteButtonLabel = useMemo(() => {
    if (appState === "saving") return "Pasting...";
    if (!profile) return "Load a LinkedIn Profile First";
    if (!spreadsheetId) return "Choose a Spreadsheet";
    if (!selectedTab) return "Choose a Tab";
    return "Paste Current Profile";
  }, [appState, profile, spreadsheetId, selectedTab]);

  function showSuccess(message: string) {
    setFeedbackMessage(message);
    setFeedbackTone("success");
  }

  function showError(message: string) {
    setFeedbackMessage(message);
    setFeedbackTone("error");
  }

  function showWarning(message: string) {
    setFeedbackMessage(message);
    setFeedbackTone("warning");
  }

  function clearFeedback() {
    setFeedbackMessage("");
    setFeedbackTone("");
  }

  useEffect(() => {
    if (!feedbackMessage) return;

    const timeout = window.setTimeout(() => {
      clearFeedback();
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [feedbackMessage]);

  useEffect(() => {
    void hydrate();

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local") return;

      if (
        changes.isConnected ||
        changes.spreadsheetId ||
        changes.spreadsheetName ||
        changes.spreadsheetUrl ||
        changes.sheetName
      ) {
        void hydrate();
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  async function hydrate() {
    const data = (await chrome.storage.local.get([
      "isConnected",
      "spreadsheetId",
      "spreadsheetName",
      "spreadsheetUrl",
      "sheetName",
    ])) as StoredConfig;

    const connected = Boolean(data.isConnected);
    setConnectionStatus(connected ? "connected" : "disconnected");
    setAppState(connected ? "connected" : "empty");

    setSpreadsheetId(data.spreadsheetId ?? "");
    setSpreadsheetName(data.spreadsheetName ?? "");
    setSpreadsheetUrl(data.spreadsheetUrl ?? "");
    setSelectedTab(data.sheetName ?? "");
    setSearchQuery("");

    if (connected) {
      await Promise.all([loadCurrentProfile(false), loadSpreadsheets(true)]);
    } else {
      setProfile(null);
      setAllSpreadsheets([]);
      setAvailableTabs([]);
    }

    if (data.spreadsheetId) {
      await loadTabs(data.spreadsheetId);
    } else {
      setAvailableTabs([]);
    }
  }

  async function handleConnect() {
    try {
      setIsConnecting(true);
      clearFeedback();

      const response = await chrome.runtime.sendMessage({
        type: "AUTH_GOOGLE",
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Google authentication failed.");
      }

      await chrome.storage.local.set({ isConnected: true });

      setConnectionStatus("connected");
      setAppState("connected");
      showSuccess("Google account connected.");

      await loadSpreadsheets(true);
      await loadCurrentProfile(false);
    } catch (error) {
      setAppState("error");
      showError(
        error instanceof Error ? error.message : "Google authentication failed."
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      setIsDisconnecting(true);
      clearFeedback();

      const response = await chrome.runtime.sendMessage({
        type: "DISCONNECT_GOOGLE",
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Could not disconnect Google account.");
      }

      setConnectionStatus("disconnected");
      setAppState("empty");
      setProfile(null);
      setSpreadsheetId("");
      setSpreadsheetName("");
      setSpreadsheetUrl("");
      setSelectedTab("");
      setAllSpreadsheets([]);
      setAvailableTabs([]);
      setSheetPickerOpen(false);
      setTabPickerOpen(false);
      setSearchQuery("");
      setIsDisconnectHover(false);

      showSuccess("Google account disconnected.");
    } catch (error) {
      setAppState("error");
      showError(
        error instanceof Error ? error.message : "Could not disconnect Google account."
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function loadCurrentProfile(showLoadedMessage = true) {
    try {
      setIsRefreshingProfile(true);
      if (showLoadedMessage) clearFeedback();

      const response = await chrome.runtime.sendMessage({
        type: "GET_ACTIVE_PROFILE",
      });

      if (!response?.ok || !response.profile) {
        throw new Error(response?.error || "No LinkedIn profile detected.");
      }

      setProfile(response.profile as LinkedinProfile);

      if (appState === "error") {
        setAppState("connected");
      }

      if (showLoadedMessage) {
        showSuccess("LinkedIn profile loaded.");
      }
    } catch (error) {
      setProfile(null);
      setAppState("error");
      showError(
        error instanceof Error ? error.message : "No LinkedIn profile detected."
      );
    } finally {
      setIsRefreshingProfile(false);
    }
  }

  async function loadSpreadsheets(forceRefresh: boolean) {
    try {
      setIsLoadingSpreadsheets(true);

      const response = await chrome.runtime.sendMessage({
        type: "LIST_SPREADSHEETS",
        forceRefresh,
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Could not load spreadsheets.");
      }

      const spreadsheets = Array.isArray(response.spreadsheets)
        ? response.spreadsheets
        : [];

      setAllSpreadsheets(spreadsheets);
      setSearchQuery("");
    } catch (error) {
      setAllSpreadsheets([]);
      setAppState("error");
      showError(
        error instanceof Error ? error.message : "Could not load spreadsheets."
      );
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  }

  async function loadTabs(id: string) {
    try {
      setIsLoadingTabs(true);

      const response = await chrome.runtime.sendMessage({
        type: "GET_SHEET_TABS",
        spreadsheetId: id,
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Could not load spreadsheet tabs.");
      }

      const tabs = Array.isArray(response.tabs) ? response.tabs : [];
      setAvailableTabs(tabs);
    } catch (error) {
      setAvailableTabs([]);
      setAppState("error");
      showError(error instanceof Error ? error.message : "Could not load tabs.");
    } finally {
      setIsLoadingTabs(false);
    }
  }

  async function handleSelectSpreadsheet(sheet: SpreadsheetItem) {
    clearFeedback();

    setSpreadsheetId(sheet.id);
    setSpreadsheetName(sheet.name);
    setSpreadsheetUrl(sheet.url);
    setSelectedTab("");
    setSheetPickerOpen(false);
    setTabPickerOpen(false);
    setSearchQuery("");

    await chrome.storage.local.set({
      spreadsheetId: sheet.id,
      spreadsheetName: sheet.name,
      spreadsheetUrl: sheet.url,
      sheetName: "",
    });

    await loadTabs(sheet.id);
    showSuccess("Destination spreadsheet saved.");
    setAppState("connected");
  }

  async function handleSelectTab(tab: string) {
    clearFeedback();

    setSelectedTab(tab);
    setTabPickerOpen(false);

    await chrome.storage.local.set({
      sheetName: tab,
    });

    showSuccess("Destination tab saved.");
    setAppState("connected");
  }

  async function handlePasteProfile() {
    try {
      setAppState("saving");
      clearFeedback();

      if (!spreadsheetId) {
        throw new Error("Choose a spreadsheet first.");
      }

      if (!selectedTab) {
        throw new Error("Choose a destination tab first.");
      }

      let currentProfile = profile;

      if (!currentProfile) {
        const response = await chrome.runtime.sendMessage({
          type: "GET_ACTIVE_PROFILE",
        });

        if (!response?.ok || !response.profile) {
          throw new Error(response?.error || "Could not load LinkedIn profile.");
        }

        currentProfile = response.profile as LinkedinProfile;
        setProfile(currentProfile);
      }

      const response = await chrome.runtime.sendMessage({
        type: "APPEND_PROFILE",
        spreadsheetId,
        sheetName: selectedTab,
        profile: currentProfile,
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Could not write to Google Sheets.");
      }

      if (response.result?.duplicate) {
        setAppState("connected");
        showWarning(
          `This LinkedIn profile already exists in row ${response.result?.row ?? "?"}.`
        );
        return;
      }

      setAppState("success");
      showSuccess(
        `Profile pasted successfully in row ${response.result?.row ?? "?"}.`
      );

      setTimeout(() => {
        setAppState("connected");
      }, 2200);
    } catch (error) {
      setAppState("error");
      showError(
        error instanceof Error ? error.message : "Could not paste profile."
      );
    }
  }

  return (
    <div className="w-[380px] bg-background text-foreground">
      {appState === "success" ? (
        <div className="px-4 py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Profile Pasted
            </h2>
            <p className="text-xs text-muted-foreground">
              <b>{profile?.name || "This profile"}</b> was pasted into
              <br />
              <b>
                {spreadsheetName
                  ? `${spreadsheetName}${selectedTab ? ` → ${selectedTab}` : ""}`
                  : "your spreadsheet"}
              </b>
              .
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                <img
                  src="/logo.png"
                  alt="LinkedIn to Sheets logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground leading-tight">
                  LinkedIn to Sheets
                </h1>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Paste LinkedIn profile information into Google Sheets
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Account
                </span>

                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => void handleDisconnect()}
                    onMouseEnter={() => setIsDisconnectHover(true)}
                    onMouseLeave={() => setIsDisconnectHover(false)}
                    disabled={isDisconnecting}
                    className="transition-colors"
                  >
                    <Badge
                      variant="default"
                      className={
                        isDisconnectHover
                          ? "bg-destructive/90 text-destructive-foreground text-[10px] px-2 py-0 h-5 cursor-pointer"
                          : "bg-success text-success-foreground text-[10px] px-2 py-0 h-5 cursor-pointer"
                      }
                    >
                      <CircleDot className="w-2.5 h-2.5 mr-1" />
                      {isDisconnecting
                        ? "Disconnecting..."
                        : isDisconnectHover
                        ? "Disconnect Google Account"
                        : "Connected"}
                    </Badge>
                  </button>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground text-[10px] px-2 py-0 h-5"
                  >
                    <CircleDot className="w-2.5 h-2.5 mr-1" />
                    Not connected
                  </Badge>
                )}
              </div>

              {!isConnected && (
                <Button
                  onClick={handleConnect}
                  className="w-full h-8 text-xs"
                  disabled={isConnecting}
                >
                  {isConnecting && (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  )}
                  {isConnecting ? "Connecting..." : "Connect Google Account"}
                </Button>
              )}
            </section>

            {isConnected && (
  <section className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
    
    {/* HEADER */}
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Destination
      </span>

      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] px-2"
        onClick={() =>
          window.open(
            "https://docs.google.com/spreadsheets/d/1w7nUnxSllVPVc7t1OhE-M6hN3zbeYIGK0jMf2SBsE60/copy",
            "_blank"
          )
        }
      >
        Google Sheet Template
      </Button>
    </div>

    {/* CONTENT */}
    <div className="space-y-1.5">

      {/* SPREADSHEET */}
      <div className="relative">
        <Label className="text-[11px] text-muted-foreground">
          Spreadsheet
        </Label>

        <button
          type="button"
          onClick={async () => {
            const nextOpen = !sheetPickerOpen;
            setSheetPickerOpen(nextOpen);
            setTabPickerOpen(false);
            setSearchQuery("");

            if (nextOpen) {
              await loadSpreadsheets(true);
            }
          }}
          className="mt-0.5 w-full h-8 flex items-center justify-between gap-2 rounded-md border border-input bg-card px-2.5 text-xs text-foreground hover:bg-accent/50 transition-colors"
        >
          <span className="flex items-center gap-1.5 truncate">
            <FileSpreadsheet className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className={spreadsheetName ? "text-foreground" : "text-muted-foreground"}>
              {spreadsheetName || "Choose a spreadsheet…"}
            </span>
          </span>

          {isLoadingSpreadsheets ? (
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          ) : (
            <ChevronDown
              className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${
                sheetPickerOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {sheetPickerOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            <div className="p-1.5 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search spreadsheets…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-7 pl-6 pr-2 rounded-md bg-muted/50 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[180px] overflow-y-auto">
              {isLoadingSpreadsheets ? (
                <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                  Loading spreadsheets...
                </div>
              ) : filteredSpreadsheets.length === 0 ? (
                <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                  No spreadsheets found
                </div>
              ) : (
                filteredSpreadsheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    onClick={() => void handleSelectSpreadsheet(sheet)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-accent/50 transition-colors ${
                      spreadsheetId === sheet.id ? "bg-accent/30" : ""
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground truncate">
                        {sheet.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {sheet.url}
                      </div>
                    </div>
                    {spreadsheetId === sheet.id && (
                      <Check className="w-3 h-3 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* TAB */}
      <div className="relative">
        <Label className="text-[11px] text-muted-foreground">
          Tab
        </Label>

        <button
          type="button"
          onClick={() => {
            if (availableTabs.length) {
              setTabPickerOpen(!tabPickerOpen);
              setSheetPickerOpen(false);
            }
          }}
          disabled={!spreadsheetId || isLoadingTabs}
          className={`mt-0.5 w-full h-8 flex items-center justify-between gap-2 rounded-md border border-input px-2.5 text-xs transition-colors ${
            spreadsheetId
              ? "bg-card text-foreground hover:bg-accent/50"
              : "bg-muted/30 text-muted-foreground cursor-not-allowed"
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Table2 className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className={selectedTab ? "text-foreground" : "text-muted-foreground"}>
              {isLoadingTabs
                ? "Loading tabs..."
                : selectedTab || "Choose a tab…"}
            </span>
          </span>

          {isLoadingTabs ? (
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          {tabPickerOpen && availableTabs.length > 0 && (
  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
    <div className="max-h-[140px] overflow-y-auto">
      {availableTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => void handleSelectTab(tab)}
          className={`w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-accent/50 transition-colors ${
            selectedTab === tab ? "bg-accent/30" : ""
          }`}
        >
          <Table2 className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-foreground">{tab}</span>
          {selectedTab === tab && (
            <Check className="w-3 h-3 text-primary shrink-0 ml-auto" />
          )}
        </button>
      ))}
    </div>
  </div>
)}
        </button>
      </div>

      {/* SUMMARY */}
      {spreadsheetName && selectedTab && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/10">
          <Check className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[10px] text-foreground truncate">
            {spreadsheetName} → {selectedTab}
          </span>
        </div>
      )}
    </div>
  </section>
)}

            {isConnected && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Current Profile
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => void loadCurrentProfile(true)}
                    disabled={isRefreshingProfile}
                  >
                    {isRefreshingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                  {profile ? (
                    [
                      { icon: User, label: profile.name },
                      { icon: Building2, label: profile.company },
                      { icon: Briefcase, label: profile.title },
                      { icon: MapPin, label: profile.location },
                      { icon: ExternalLink, label: profile.profileUrl },
                    ].map(({ icon: Icon, label }) => (
                      <div
                        key={`${Icon.displayName ?? "icon"}-${label}`}
                        className="flex items-center gap-2"
                      >
                        <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-foreground truncate">
                          {label || "—"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Open a LinkedIn profile and click Refresh.
                    </div>
                  )}
                </div>
              </section>
            )}

            {isConnected && (
              <Button
                onClick={handlePasteProfile}
                disabled={!canPaste}
                className="w-full h-9 text-xs font-medium"
              >
                {appState === "saving" && (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                )}
                {pasteButtonLabel}
              </Button>
            )}

            <div>
              {feedbackMessage && (
                <div
                  className={
                    feedbackTone === "error"
                      ? "flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20"
                      : feedbackTone === "warning"
                      ? "flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30"
                      : "flex items-center gap-2 p-2 rounded-md bg-success/10 border border-success/20"
                  }
                >
                  {feedbackTone === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  ) : feedbackTone === "warning" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  )}
                  <span
                    className={
                      feedbackTone === "error"
                        ? "text-[11px] text-destructive font-medium"
                        : feedbackTone === "warning"
                        ? "text-[11px] text-amber-700 font-medium"
                        : "text-[11px] text-success font-medium"
                    }
                  >
                    {feedbackMessage}
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground flex justify-between">
            <div className="space-x-2">
              <a href="https://forms.gle/xmCiUB8Tzs3ocM616" target="_blank">
                Send feedback
              </a>
              <span>·</span>
              <a href="https://josueluna.github.io/LinkedIn_to_Sheets/changelog.html" target="_blank">
                Changelog.
              </a>
            </div>

            <a href="https://www.linkedin.com/in/josuelunagamboa/" target="_blank">
              Developed by Josué Luna
            </a>
          </div>

            {appState === "empty" && !isConnected && !feedbackMessage && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                <span className="text-[11px] text-warning font-medium">
                  Please connect your Google account
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
