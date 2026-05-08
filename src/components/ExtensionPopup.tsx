import { Toast } from "@/components/ui/toast";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ColumnMapping,
  defaultColumnMapping,
  normalizeColumnMapping,
} from "@/lib/mappings";
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
  SlidersHorizontal,
} from "lucide-react";

type ConnectionStatus = "disconnected" | "connected";
type AppState = "empty" | "connected" | "saving" | "success" | "error";
type FeedbackTone = "success" | "error" | "warning" | "";
type Lang = "es" | "en";

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
  columnMapping?: {
    name: { enabled: boolean; column: string };
    company: { enabled: boolean; column: string };
    title: { enabled: boolean; column: string };
    location: { enabled: boolean; column: string };
    profileUrl: { enabled: boolean; column: string };
  };
};

const COLUMN_OPTIONS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
] as const;

const MAPPING_FIELDS = [
  { key: "name", label: "Name", icon: User },
  { key: "company", label: "Company", icon: Building2 },
  { key: "title", label: "Title", icon: Briefcase },
  { key: "location", label: "Location", icon: MapPin },
  { key: "profileUrl", label: "Profile URL", icon: ExternalLink },
] as const;

const messages = {
  es: {
    appTitle: "LinkedIn to Sheets",
    appSubtitle: "Pega información de perfiles de LinkedIn en Google Sheets",
    profilePasted: "Perfil pegado",
    thisProfile: "Este perfil",
    yourSpreadsheet: "tu hoja de cálculo",

    googleAccount: "Cuenta de Google",
    connectGoogle: "Conectar cuenta de Google",
    connecting: "Conectando...",
    connected: "Conectado",
    disconnecting: "Desconectando...",
    disconnectGoogle: "Desconectar cuenta de Google",
    notConnected: "Sin conectar",

    destination: "Destino",
    currentProfile: "Perfil actual",
    spreadsheet: "Hoja de cálculo destino",
    tab: "Pestaña",
    chooseSpreadsheet: "Elige una hoja de cálculo…",
    chooseTab: "Elige una pestaña…",
    loadingTabs: "Cargando pestañas...",
    loadingSpreadsheets: "Cargando hojas de cálculo...",
    noSpreadsheetsFound: "No se encontraron hojas de cálculo",
    searchSpreadsheets: "Buscar hojas de cálculo…",

    refresh: "Actualizar",
    pasteCurrentProfile: "Pegar perfil",
    pasting: "Pegando...",

    configColumns: "Configurar columnas",
    googleSheetTemplate: "Plantilla de Google Sheet",
    customColumnMappingActive: "Configuración de columnas personalizada",

    loading: "Cargando...",
    openProfileAndRefresh: "Abre un perfil de LinkedIn y haz clic en Actualizar.",

    columnMappingReset: "Columnas con valores predeterminados.",
    columnMappingSaved: "Configuración de columnas guardada.",
    googleConnected: "Cuenta de Google conectada.",
    googleDisconnected: "Cuenta de Google desconectada.",
    destinationSpreadsheetSaved: "Hoja de cálculo destino guardada.",
    destinationTabSaved: "Pestaña destino guardada.",
    linkedinProfileLoaded: "Perfil de LinkedIn cargado.",

    chooseSpreadsheetFirst: "Elige una hoja de cálculo primero.",
    chooseTabFirst: "Elige una pestaña destino primero.",
    loadProfileFirst: "Primero carga un perfil de LinkedIn.",
    couldNotLoadLinkedIn: "No se pudo cargar el perfil de LinkedIn.",
    couldNotWriteSheets: "No se pudo escribir en Google Sheets.",
    couldNotPasteProfile: "No se pudo pegar el perfil.",
    couldNotLoadSpreadsheets: "No se pudieron cargar las hojas de cálculo.",
    couldNotLoadTabs: "No se pudieron cargar las pestañas.",
    googleAuthFailed: "Falló la autenticación con Google.",
    couldNotDisconnectGoogle: "No se pudo desconectar la cuenta de Google.",
    couldNotLoadHeaders: "No se pudieron cargar los encabezados de la hoja.",

    duplicateProfile: "Este perfil de LinkedIn ya existe en la fila {row}.",
    profilePastedInto: "{profile} fue pegado en {destination}.",

    sendFeedback: "Envía Feedback",
    changelog: "Últimos cambios",
    developedBy: "Creado por Josué",

    columnMappingTitle: "Configurar columnas",
    columnMappingSubtitle: "Elige qué columna recibe cada campo de LinkedIn",
    back: "← Regresar",
    required: "Obligatorio",
    resetToDefault: "Restablecer",
    saveChanges: "Guardar cambios",
  },

  en: {
    appTitle: "LinkedIn to Sheets",
    appSubtitle: "Paste LinkedIn profile information into Google Sheets",
    profilePasted: "Profile Pasted",
    thisProfile: "This profile",
    yourSpreadsheet: "your spreadsheet",

    googleAccount: "Google Account",
    connectGoogle: "Connect Google Account",
    connecting: "Connecting...",
    connected: "Connected",
    disconnecting: "Disconnecting...",
    disconnectGoogle: "Disconnect Google Account",
    notConnected: "Not connected",

    destination: "Destination",
    currentProfile: "Current Profile",
    spreadsheet: "Spreadsheet",
    tab: "Tab",
    chooseSpreadsheet: "Choose a spreadsheet…",
    chooseTab: "Choose a tab…",
    loadingTabs: "Loading tabs...",
    loadingSpreadsheets: "Loading spreadsheets...",
    noSpreadsheetsFound: "No spreadsheets found",
    searchSpreadsheets: "Search spreadsheets…",

    refresh: "Refresh",
    pasteCurrentProfile: "Paste Current Profile",
    pasting: "Pasting...",

    configColumns: "Config Columns",
    googleSheetTemplate: "Google Sheet Template",
    customColumnMappingActive: "Custom Column Mapping active",

    loading: "Loading...",
    openProfileAndRefresh: "Open a LinkedIn profile and click Refresh.",

    columnMappingReset: "Column mapping reset to default.",
    columnMappingSaved: "Column mapping saved.",
    googleConnected: "Google account connected.",
    googleDisconnected: "Google account disconnected.",
    destinationSpreadsheetSaved: "Destination spreadsheet saved.",
    destinationTabSaved: "Destination tab saved.",
    linkedinProfileLoaded: "LinkedIn profile loaded.",

    chooseSpreadsheetFirst: "Choose a spreadsheet first.",
    chooseTabFirst: "Choose a destination tab first.",
    loadProfileFirst: "Please load a LinkedIn profile first.",
    couldNotLoadLinkedIn: "Could not load LinkedIn profile.",
    couldNotWriteSheets: "Could not write to Google Sheets.",
    couldNotPasteProfile: "Could not paste profile.",
    couldNotLoadSpreadsheets: "Could not load spreadsheets.",
    couldNotLoadTabs: "Could not load tabs.",
    googleAuthFailed: "Google authentication failed.",
    couldNotDisconnectGoogle: "Could not disconnect Google account.",
    couldNotLoadHeaders: "Could not load sheet headers.",

    duplicateProfile: "This LinkedIn profile already exists in row {row}.",
    profilePastedInto: "{profile} was pasted into {destination}.",

    sendFeedback: "Send feedback",
changelog: "Changelog",
developedBy: "Developed by Josué",

columnMappingTitle: "Column Mapping",
columnMappingSubtitle: "Choose which column receives each LinkedIn field",
back: "← Back",
required: "Required",
resetToDefault: "Reset to Default",
saveChanges: "Save changes",
  },
} as const;

function formatMessage(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function useAutoClearingFeedback() {
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("");

  function showError(message: string) {
    setFeedbackMessage(message);
    setFeedbackTone("error");
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

  return {
    feedbackMessage,
    feedbackTone,
    showError,
    clearFeedback,
  };
}

function usePopupToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "warning">(
    "warning",
    );

  function showToast(message: string, type: "success" | "error" | "warning") {
    setToastMessage(message);
    setToastType(type);
  }

  return {
    toastMessage,
    toastType,
    setToastMessage,
    setToastType,
    showToast,
  };
}

function FeedbackBanner({
  feedbackMessage,
  feedbackTone,
}: {
  feedbackMessage: string;
  feedbackTone: FeedbackTone;
}) {
  if (!feedbackMessage) return null;

  return (
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
      );
}

function SuccessState({
  profileName,
  spreadsheetName,
  selectedTab,
  t,
}: {
  profileName?: string;
  spreadsheetName: string;
  selectedTab: string;
  t: (typeof messages)[Lang];
}) {
  return (
    <div className="px-4 py-12 flex flex-col items-center justify-center text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-success" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          {t.profilePasted}
        </h2>
        <p className="text-xs text-muted-foreground">
          {formatMessage(t.profilePastedInto, {
            profile: profileName || t.thisProfile,
            destination: spreadsheetName
            ? `${spreadsheetName}${selectedTab ? ` → ${selectedTab}` : ""}`
            : t.yourSpreadsheet,
          })}
        </p>
      </div>
    </div>
    );
}

function ColumnMappingPanel({
  mappingFields,
  columnMapping,
  mappedColumns,
  availableHeaders,
  columnOptions,
  hasDuplicateColumns,
  setColumnMapping,
  onBack,
  onReset,
  onSave,
  t,
}: {
  mappingFields: readonly {
    key: keyof ColumnMapping;
    label: string;
    icon: any;
  }[];
  columnMapping: ColumnMapping;
  mappedColumns: string[];
  availableHeaders: { column: string; header: string }[];
  columnOptions: readonly string[];
  hasDuplicateColumns: boolean;
  setColumnMapping: (value: React.SetStateAction<ColumnMapping>) => void;
  onBack: () => void;
  onReset: () => void;
  onSave: () => void;
  t: (typeof messages)[Lang];
}) {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#434343]" />
            <h2 className="text-sm font-semibold text-[#434343]">
  {t.columnMappingTitle}
</h2>
          </div>
          <p className="text-[11px] text-[#434343]">
  {t.columnMappingSubtitle}
</p>
        </div>

        <Button
          size="sm"
          className="h-7 px-3 text-[11px] bg-primary/85 hover:bg-primary text-primary-foreground"
          onClick={onBack}
        >
          {t.back}
        </Button>
      </div>

      <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
        <div className="rounded-lg border border-input bg-card overflow-hidden">
          {mappingFields.map((field) => {
            const Icon = field.icon;
            const isDuplicate =
            columnMapping[field.key].enabled &&
            mappedColumns.filter(
              (col) => col === columnMapping[field.key].column,
              ).length > 1;

            return (
              <div
                key={field.key}
                className={`flex items-center justify-between gap-3 px-3 py-3 ${
                  isDuplicate ? "bg-amber-500/5" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={columnMapping[field.key].enabled}
                    disabled={field.key === "profileUrl"}
                    onChange={(e) =>
                    setColumnMapping((prev) => ({
                      ...prev,
                      [field.key]: {
                        ...prev[field.key],
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="h-3.5 w-3.5 accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-[#434343]">{field.label}</span>
                {field.key === "profileUrl" && (
                  <span className="text-[10px] text-muted-foreground">
                    {t.required}
                  </span>
                  )}
              </div>

              <select
                value={columnMapping[field.key].column}
                onChange={(e) =>
                setColumnMapping((prev) => ({
                  ...prev,
                  [field.key]: {
                    ...prev[field.key],
                    column: e.target.value,
                  },
                }))
              }
              disabled={!columnMapping[field.key].enabled}
              className={`h-8 w-[160px] rounded-md border pl-2 pr-7 text-xs outline-none truncate ${
                !columnMapping[field.key].enabled
                ? "border-input bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                : isDuplicate
                ? "border-amber-500/40 bg-background text-[#434343]"
                : "border-input bg-background text-[#434343]"
              }`}
            >
              {(availableHeaders.length
                ? availableHeaders
                : columnOptions.map((col) => ({ column: col, header: "" }))
                ).map((item) => (
                  <option key={item.column} value={item.column}>
                    {item.header
                    ? `${item.column} : ${item.header}`
                    : item.column}
                  </option>
                  ))}
              </select>
            </div>
            );
          })}
        </div>

        <div className="flex justify-between gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-[#434343]"
            onClick={onReset}
          >
            {t.resetToDefault}
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={onSave}
            disabled={hasDuplicateColumns}
          >
            {t.saveChanges}
          </Button>
        </div>
      </div>
    </div>
    );
}

function LoadingShell({ t }: { t: (typeof messages)[Lang] }) {
  return (
    <div className="w-[380px] h-[582px] bg-background text-foreground overflow-hidden">
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
              {t.appTitle}
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {t.appSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[calc(100%-69px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">{t.loading}</span>
        </div>
      </div>
    </div>
    );
}

export default function ExtensionPopup() {
  const [lang, setLang] = useState<Lang>("en");
  const t = messages[lang];
  const [connectionStatus, setConnectionStatus] =
  useState<ConnectionStatus>("disconnected");
  const [appState, setAppState] = useState<AppState>("empty");
  const [isHydrating, setIsHydrating] = useState(true);

  const [profile, setProfile] = useState<LinkedinProfile | null>(null);
  const { feedbackMessage, feedbackTone, showError, clearFeedback } =
  useAutoClearingFeedback();

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [selectedTab, setSelectedTab] = useState("");

  const [allSpreadsheets, setAllSpreadsheets] = useState<SpreadsheetItem[]>([]);
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<
  { column: string; header: string }[]
  >([]);

  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
  const [tabPickerOpen, setTabPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [isDisconnectHover, setIsDisconnectHover] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { toastMessage, toastType, setToastMessage, setToastType, showToast } =
  usePopupToast();

  const [showColumnMapping, setShowColumnMapping] = useState(false);

  const [columnMapping, setColumnMapping] =
  useState<ColumnMapping>(defaultColumnMapping);
  const [draftColumnMapping, setDraftColumnMapping] =
  useState<ColumnMapping | null>(null);

  const isConnected = connectionStatus === "connected";

  const version = chrome.runtime.getManifest().version;

  const filteredSpreadsheets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSpreadsheets;
    return allSpreadsheets.filter((sheet) =>
      sheet.name.toLowerCase().includes(q),
      );
  }, [allSpreadsheets, searchQuery]);

  const activeColumnMapping =
  showColumnMapping && draftColumnMapping
  ? draftColumnMapping
  : columnMapping;

  const mappedColumns = Object.values(activeColumnMapping)
  .filter((field) => field.enabled)
  .map((field) => field.column);

  const hasDuplicateColumns =
  new Set(mappedColumns).size !== mappedColumns.length;

  const hasCustomColumnMapping = useMemo(() => {
    return (
      Object.keys(defaultColumnMapping) as Array<keyof ColumnMapping>
      ).some((key) => {
        const current = columnMapping[key];
        const baseline = defaultColumnMapping[key];
        return (
          current.enabled !== baseline.enabled ||
          current.column !== baseline.column
          );
      });
    }, [columnMapping]);

  const canPaste =
  isConnected &&
  !!profile &&
  !!spreadsheetId &&
  !!selectedTab &&
  !isRefreshingProfile &&
  appState !== "saving";

  const shouldHighlightSpreadsheet = isConnected && !spreadsheetName;
  const shouldHighlightTab = isConnected && !!spreadsheetId && !selectedTab;

  async function handleResetColumnMapping() {
    await chrome.storage.local.set({
      columnMapping: defaultColumnMapping,
    });

    setColumnMapping(defaultColumnMapping);
    setDraftColumnMapping(null);
    setShowColumnMapping(false);
    showToast(t.columnMappingReset, "success");
  }

  async function handleSaveColumnMapping() {
    if (!draftColumnMapping) {
      setShowColumnMapping(false);
      return;
    }

    if (hasDuplicateColumns) {
      return;
    }

    await chrome.storage.local.set({
      columnMapping: draftColumnMapping,
    });

    setColumnMapping(draftColumnMapping);
    setDraftColumnMapping(null);
    showToast(t.columnMappingSaved, "success");
    setShowColumnMapping(false);
  }

  const pasteButtonLabel =
  appState === "saving" ? t.pasting : t.pasteCurrentProfile;

  useEffect(() => {
    const browserLang = (navigator.language || "en").toLowerCase();
    setLang(browserLang.startsWith("es") ? "es" : "en");

    void hydrate();

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
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

  if (isHydrating) {
    return <LoadingShell t={t} />;
  }

  async function loadHeaders(spreadsheetId: string, sheetName: string) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_SHEET_HEADERS",
        spreadsheetId,
        sheetName,
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Could not load sheet headers.");
      }

      const headers = Array.isArray(response.headers) ? response.headers : [];
      setAvailableHeaders(headers);
    } catch {
      setAvailableHeaders([]);
    }
  }

  async function hydrate() {
    try {
      const data = (await chrome.storage.local.get([
        "isConnected",
        "spreadsheetId",
        "spreadsheetName",
        "spreadsheetUrl",
        "sheetName",
        "columnMapping",
      ])) as StoredConfig;

      const connected = Boolean(data.isConnected);
      setConnectionStatus(connected ? "connected" : "disconnected");
      setAppState(connected ? "connected" : "empty");

      setSpreadsheetId(data.spreadsheetId ?? "");
      setSpreadsheetName(data.spreadsheetName ?? "");
      setSpreadsheetUrl(data.spreadsheetUrl ?? "");
      setSelectedTab(data.sheetName ?? "");
      setSearchQuery("");
      setColumnMapping(normalizeColumnMapping(data.columnMapping));

      if (connected) {
        await Promise.all([loadCurrentProfile(false), loadSpreadsheets(true)]);
      } else {
        setProfile(null);
        setAllSpreadsheets([]);
        setAvailableTabs([]);
      }

      if (data.spreadsheetId) {
        await Promise.all([
          loadTabs(data.spreadsheetId, data.sheetName),
          data.sheetName
          ? loadHeaders(data.spreadsheetId, data.sheetName)
          : (setAvailableHeaders([]), Promise.resolve()),
        ]);
      } else {
        setAvailableTabs([]);
        setAvailableHeaders([]);
      }
    } finally {
      setIsHydrating(false);
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
        throw new Error(response?.error || t.googleAuthFailed);
      }

      await chrome.storage.local.set({ isConnected: true });

      setConnectionStatus("connected");
      setAppState("connected");
      showToast(t.googleConnected, "success");

      await loadSpreadsheets(true);
      await loadCurrentProfile(false);
    } catch (error) {
      setAppState("error");
      showError(
        error instanceof Error
        ? error.message
        : t.googleAuthFailed
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
        throw new Error(
          response?.error || t.couldNotDisconnectGoogle,
          );
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

      showToast(t.googleDisconnected, "success");
    } catch (error) {
      setAppState("error");
      showError(
        error instanceof Error
        ? error.message
        : t.couldNotDisconnectGoogle        );
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
      console.log("[popup] GET_ACTIVE_PROFILE response", response);

      if (!response?.ok || !response.profile) {
        setProfile(null);
        if (appState === "error") {
          setAppState("connected");
        }

        return;
      }

      setProfile(response.profile as LinkedinProfile);
      console.log("[popup] Active profile loaded", response.profile);

      if (appState === "error") {
        setAppState("connected");
      }

      if (showLoadedMessage) {
        showToast(t.linkedinProfileLoaded, "success");
      }
    } catch (_error) {
      setProfile(null);
      if (appState === "error") {
        setAppState("connected");
      }
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
        throw new Error(response?.error || t.couldNotLoadSpreadsheets);
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
        error instanceof Error ? error.message : t.couldNotLoadSpreadsheets,
        );
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  }

  async function loadTabs(id: string, preferredTab?: string) {
    try {
      setIsLoadingTabs(true);

      const response = await chrome.runtime.sendMessage({
        type: "GET_SHEET_TABS",
        spreadsheetId: id,
      });

      if (!response?.ok) {
        throw new Error(response?.error || t.couldNotLoadTabs);
      }

      const tabs = Array.isArray(response.tabs) ? response.tabs : [];
      setAvailableTabs(tabs);

      if (preferredTab && tabs.includes(preferredTab)) {
        setSelectedTab(preferredTab);
      }
    } catch (error) {
      setAvailableTabs([]);
      setAppState("error");
      showError(
        error instanceof Error ? error.message : t.couldNotLoadTabs,
        );
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
    setAvailableHeaders([]);
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
    showToast(t.destinationSpreadsheetSaved, "success");
    setAppState("connected");
  }

  async function handleSelectTab(tab: string) {
    clearFeedback();

    setSelectedTab(tab);
    setTabPickerOpen(false);

    await chrome.storage.local.set({
      sheetName: tab,
    });

    if (spreadsheetId) {
      await loadHeaders(spreadsheetId, tab);
    } else {
      setAvailableHeaders([]);
    }

    showToast(t.destinationTabSaved, "success");
    setAppState("connected");
  }

  async function handlePasteProfile() {
    try {
      setAppState("saving");
      clearFeedback();
      setToastMessage(null);

      if (!profile) {
        showToast(t.loadProfileFirst, "warning");
        return;
      }

      if (!spreadsheetId) {
        throw new Error(t.chooseSpreadsheetFirst);
      }

      if (!selectedTab) {
        throw new Error(t.chooseTabFirst);
      }

      const currentProfile = profile;

      const response = await chrome.runtime.sendMessage({
        type: "APPEND_PROFILE",
        spreadsheetId,
        sheetName: selectedTab,
        profile: currentProfile,
        columnMapping,
      });

      if (!response?.ok) {
        throw new Error(response?.error || t.couldNotWriteSheets);
      }

      if (response.result?.duplicate) {
        setAppState("connected");

        setToastMessage(
          formatMessage(t.duplicateProfile, {
            row: String(response.result?.row ?? "?"),
          }),
          );
        setToastType("warning");

        return;
      }

      setAppState("success");

      setTimeout(() => {
        setAppState("connected");
      }, 2200);
    } catch (error) {
      setAppState("error");
      showError(
        error instanceof Error ? error.message : t.couldNotPasteProfile,
        );
    }
  }

  return (
    <div className="w-[380px] h-[582px] bg-background text-foreground overflow-hidden">
      <div className="relative h-full overflow-hidden">
        {/* ── Main Panel ── */}
        <div
          className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out ${
            showColumnMapping
            ? "-translate-x-1/3 pointer-events-none"
            : appState === "success"
            ? "-translate-y-full pointer-events-none"
            : "translate-x-0 translate-y-0 pointer-events-auto"
          }`}
        >
          {/* ── Shared header (always visible) ── */}
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
                  {t.appTitle}
                </h1>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {t.appSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* ── Inner panels container ── */}
          <div className="relative h-[calc(100%-69px)] overflow-hidden">
            {/* ── Login panel — slides down when connecting, up when disconnecting ── */}
            <div
              className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out ${
                isConnected
                ? "-translate-y-full pointer-events-none"
                : "translate-y-0 pointer-events-auto"
              }`}
            >
              <div className="px-4 py-3 h-full flex flex-col relative">
                <div className="space-y-3 pb-10">
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t.googleAccount}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-[10px] px-2 py-0 h-5"
                      >
                        <CircleDot className="w-2.5 h-2.5 mr-1" />
                        {t.notConnected}
                      </Badge>
                    </div>

                    <div className="pt-10">
                      <Button
                        onClick={handleConnect}
                        className="w-full h-8 text-xs"
                        disabled={isConnecting}
                      >
                        {isConnecting && (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          )}
                        {isConnecting ? t.connecting : t.connectGoogle}
                      </Button>
                    </div>
                  </section>
                </div>

                {/* Shared footer */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2 text-xs text-muted-foreground flex justify-between items-center bg-background border-t border-border/40">
                  <div className="space-x-2">
                    <a
                      href="https://forms.gle/xmCiUB8Tzs3ocM616"
                      target="_blank"
                      className="hover:text-primary transition-colors"
                    >
                      {t.sendFeedback}
                    </a>
                    <span>·</span>
                    <a
                      href="https://josueluna.github.io/LinkedIn_to_Sheets/changelog.html"
                      target="_blank"
                      className="hover:text-primary transition-colors"
                    >
                      {t.changelog}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://www.linkedin.com/in/josuelunagamboa/"
                      target="_blank"
                      className="hover:text-primary transition-colors"
                    >
                      {t.developedBy}
                    </a>
                    <span className="opacity-70">v{version}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Connected panel — slides up from bottom when connecting, down when disconnecting ── */}
            <div
              className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out shadow-[0_-4px_16px_rgba(0,0,0,0.08)] ${
                isConnected
                ? "translate-y-0 pointer-events-auto"
                : "translate-y-full pointer-events-none"
              }`}
            >
              <div className="px-4 py-3 h-full flex flex-col relative">
                <div className="space-y-3 pb-10">
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t.googleAccount}
                      </span>
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
                          ? t.disconnecting
                          : isDisconnectHover
                          ? t.disconnectGoogle
                          : t.connected}
                        </Badge>
                      </button>
                    </div>
                  </section>

                  <section className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                        {t.destination}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() =>
                          window.open(
                            "https://docs.google.com/spreadsheets/d/1w7nUnxSllVPVc7t1OhE-M6hN3zbeYIGK0jMf2SBsE60/copy",
                            "_blank",
                            )
                        }
                      >
                        {t.googleSheetTemplate}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => {
                          setDraftColumnMapping(
                            JSON.parse(
                              JSON.stringify(columnMapping),
                              ) as ColumnMapping,
                            );
                          setShowColumnMapping(true);
                        }}
                      >
                        <SlidersHorizontal className="w-3 h-3 mr-1" />
                        {t.configColumns}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Label className="text-[11px] text-muted-foreground">
                        {t.spreadsheet}
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
                        className={`mt-0.5 w-full h-8 flex items-center justify-between gap-2 rounded-md px-2.5 text-xs transition-colors ${
                          shouldHighlightSpreadsheet
                          ? "border border-amber-400/60 bg-amber-50/60 dark:bg-amber-500/10 text-foreground animate-pulse hover:bg-amber-50/70"
                          : "border border-input bg-card text-foreground hover:bg-accent/50"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <FileSpreadsheet className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span
                            className={
                              spreadsheetName
                              ? "text-foreground"
                              : "text-muted-foreground"
                            }
                          >
                            {spreadsheetName || t.chooseSpreadsheet}
                          </span>
                        </span>
                        {isLoadingSpreadsheets ? (
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          ) : (
                          <ChevronDown
                            className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform duration-200 ${
                              sheetPickerOpen ? "rotate-180" : ""
                            }`}
                            />
                            )}
                        </button>

                        {sheetPickerOpen && (
                          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
                            <div className="p-1.5 border-b border-border">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                <input
                                  type="text"
                                  placeholder={t.searchSpreadsheets}
                                  value={searchQuery}
                                  onChange={(e) =>
                                  setSearchQuery(e.target.value)
                                }
                                className="w-full h-7 pl-6 pr-2 rounded-md bg-muted/50 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-[180px] overflow-y-auto">
                            {isLoadingSpreadsheets ? (
                              <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                                {t.loadingSpreadsheets}
                              </div>
                              ) : filteredSpreadsheets.length === 0 ? (
                              <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                                {t.noSpreadsheetsFound}
                              </div>
                              ) : (
                              filteredSpreadsheets.map((sheet) => (
                                <button
                                  key={sheet.id}
                                  type="button"
                                  onClick={() =>
                                  void handleSelectSpreadsheet(sheet)
                                }
                                className={`w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-accent/50 transition-colors ${
                                  spreadsheetId === sheet.id
                                  ? "bg-accent/30"
                                  : ""
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

                      <div className="relative">
                        <Label className="text-[11px] text-muted-foreground">
                          {t.tab}
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
                          className={`mt-0.5 w-full h-8 flex items-center justify-between gap-2 rounded-md px-2.5 text-xs transition-colors ${
                            !spreadsheetId
                            ? "border border-input bg-muted/30 text-muted-foreground cursor-not-allowed"
                            : shouldHighlightTab
                            ? "border border-amber-400/60 bg-amber-50/60 dark:bg-amber-500/10 text-foreground animate-pulse hover:bg-amber-50/70"
                            : "border border-input bg-card text-foreground hover:bg-accent/50"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <Table2 className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span
                              className={
                                selectedTab
                                ? "text-foreground"
                                : "text-muted-foreground"
                              }
                            >
                              {isLoadingTabs
                              ? t.loadingTabs
                              : selectedTab || t.chooseTab}
                            </span>
                          </span>
                          {isLoadingTabs ? (
                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            ) : (
                            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                            {tabPickerOpen && availableTabs.length > 0 && (
                              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
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
                                      <span className="text-xs text-foreground">
                                        {tab}
                                      </span>
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

                        {spreadsheetName && selectedTab && (
                          <div className="space-y-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/10">
                              <Check className="w-3 h-3 text-primary shrink-0" />
                              <span className="text-[10px] text-foreground truncate">
                                {spreadsheetName} → {selectedTab}
                              </span>
                            </div>
                            {hasCustomColumnMapping && (
                              <div className="flex justify-end">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                                  <span>{t.customColumnMappingActive}</span>
                                </div>
                              </div>
                              )}
                          </div>
                          )}
                      </div>
                    </section>

                    <section className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {t.currentProfile}
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
                            {t.refresh}
                            </>
                            )}
                          </Button>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                          {profile ? (
                            MAPPING_FIELDS.filter(
                              ({ key }) => columnMapping[key].enabled,
                              ).map(({ key, icon: Icon }) => {
                                const value =
                                key === "name"
                                ? profile.name
                                : key === "company"
                                ? profile.company
                                : key === "title"
                                ? profile.title
                                : key === "location"
                                ? profile.location
                                : profile.profileUrl;
                                return (
                                  <div
                                    key={key}
                                    className="flex items-center gap-2 animate-in fade-in-0 duration-150"
                                  >
                                    <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="text-xs text-foreground truncate">
                                      {value || "—"}
                                    </span>
                                  </div>
                                  );
                              })
                              ) : (
                              <div className="text-xs text-muted-foreground">
                                {t.openProfileAndRefresh}
                              </div>
                              )}
                            </div>
                          </section>

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

                          <div>
                            <FeedbackBanner
                              feedbackMessage={feedbackMessage}
                              feedbackTone={feedbackTone}
                            />
                          </div>
                        </div>

                {/* Shared footer */}
                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2 text-xs text-muted-foreground flex justify-between items-center bg-background border-t border-border/40">
                          <div className="space-x-2">
                            <a
                              href="https://forms.gle/xmCiUB8Tzs3ocM616"
                              target="_blank"
                              className="animate-feedback-glow hover:text-primary"
                            >
                              {t.sendFeedback}
                            </a>
                            <span>·</span>
                            <a
                              href="https://josueluna.github.io/LinkedIn_to_Sheets/changelog.html"
                              target="_blank"
                              className="hover:text-primary transition-colors"
                            >
                              {t.changelog}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href="https://www.linkedin.com/in/josuelunagamboa/"
                              target="_blank"
                              className="hover:text-primary transition-colors"
                            >
                              {t.developedBy}
                            </a>
                            <span className="opacity-70">v{version}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

        {/* ── Column Mapping Panel ── */}
                <div
                  className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out shadow-[-4px_0_16px_rgba(0,0,0,0.08)] ${
                    showColumnMapping
                    ? "translate-x-0 pointer-events-auto"
                    : "translate-x-full pointer-events-none"
                  }`}
                >
                  <ColumnMappingPanel
                    mappingFields={MAPPING_FIELDS}
                    columnMapping={activeColumnMapping}
                    mappedColumns={mappedColumns}
                    availableHeaders={availableHeaders}
                    columnOptions={COLUMN_OPTIONS}
                    hasDuplicateColumns={hasDuplicateColumns}
                    setColumnMapping={(nextMapping) => {
                      setDraftColumnMapping((prev) => {
                        const baseMapping = prev ?? columnMapping;
                        return typeof nextMapping === "function"
                        ? (nextMapping as (prev: ColumnMapping) => ColumnMapping)(
                          baseMapping,
                          )
                        : nextMapping;
                      });
                    }}
                    onBack={() => {
                      setDraftColumnMapping(null);
                      setShowColumnMapping(false);
                    }}
                    onReset={() => void handleResetColumnMapping()}
                    onSave={() => void handleSaveColumnMapping()}
                    t={t}
                  />
                </div>

        {/* ── Success State ── */}
                <div
                  className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out shadow-[0_-4px_16px_rgba(0,0,0,0.08)] ${
                    appState === "success"
                    ? "translate-y-0 pointer-events-auto"
                    : "translate-y-full pointer-events-none"
                  }`}
                >
                  <SuccessState
                    profileName={profile?.name}
                    spreadsheetName={spreadsheetName}
                    selectedTab={selectedTab}
                    t={t}
                  />
                </div>
              </div>

              {toastMessage && (
                <Toast
                  message={toastMessage}
                  type={toastType}
                  onClose={() => setToastMessage(null)}
                  />
                  )}
            </div>
            );
}
