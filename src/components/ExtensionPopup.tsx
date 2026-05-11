import { useEffect, useMemo, useState, type ReactNode, type SetStateAction } from "react";
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
  // Profile field icons replaced with Tabler SVG components below
  CircleDot,
  ChevronDown,
  FileSpreadsheet,
  Table2,
  Search,
  Check,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = "disconnected" | "connected";
type AppState = "empty" | "connected" | "saving" | "success" | "error";
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

// ─── Tabler icon components (inline SVG) ─────────────────────────────────────
const GREEN = "oklch(0.66 0.19 145)";
const svgProps = (size = 14) => ({
  xmlns: "http://www.w3.org/2000/svg",
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: { flexShrink: 0 },
  "aria-hidden": true,
});

function TablerUser({ size = 14 }: { size?: number }) {
  return (
    <svg {...svgProps(size)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <circle cx="12" cy="7" r="4"/>
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>
    </svg>
    );
}

function TablerBuildingSkyscraper({ size = 14 }: { size?: number }) {
  return (
    <svg {...svgProps(size)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <line x1="3" y1="21" x2="21" y2="21"/>
      <path d="M5 21v-14l8 -4v18"/>
      <path d="M19 21v-10l-6 -4"/>
      <line x1="9" y1="9" x2="9" y2="9.01"/>
      <line x1="9" y1="12" x2="9" y2="12.01"/>
      <line x1="9" y1="15" x2="9" y2="15.01"/>
      <line x1="9" y1="18" x2="9" y2="18.01"/>
    </svg>
    );
}

function TablerBriefcase({ size = 14 }: { size?: number }) {
  return (
    <svg {...svgProps(size)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <rect x="3" y="7" width="18" height="13" rx="2"/>
      <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12.01"/>
      <path d="M3 13a20 20 0 0 0 18 0"/>
    </svg>
    );
}

function TablerMapPin({ size = 14 }: { size?: number }) {
  return (
    <svg {...svgProps(size)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <circle cx="12" cy="11" r="3"/>
      <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"/>
    </svg>
    );
}

function TablerBrandLinkedin({ size = 14 }: { size?: number }) {
  return (
    <svg {...svgProps(size)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <line x1="8" y1="11" x2="8" y2="16"/>
      <line x1="8" y1="8" x2="8" y2="8.01"/>
      <line x1="12" y1="16" x2="12" y2="11"/>
      <path d="M16 16v-3a2 2 0 0 0 -4 0"/>
    </svg>
    );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_OPTIONS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
] as const;

const MAPPING_FIELDS = [
  { key: "name",       labelKey: "fieldName",       Icon: TablerUser },
  { key: "company",    labelKey: "fieldCompany",     Icon: TablerBuildingSkyscraper },
  { key: "title",      labelKey: "fieldTitle",       Icon: TablerBriefcase },
  { key: "location",   labelKey: "fieldLocation",    Icon: TablerMapPin },
  { key: "profileUrl", labelKey: "fieldProfileUrl",  Icon: TablerBrandLinkedin },
] as const;

// ─── Brand design tokens (mirrors the landing pages) ─────────────────────────
//
//   --primary      : oklch(0.66 0.19 145)  → green  #22c55e-ish
//   --linkedin     : oklch(0.50 0.15 245)  → blue   #0a66c2-ish
//   --background   : oklch(0.995 0.002 255)
//   --foreground   : oklch(0.18 0.025 265)
//   --muted-fg     : oklch(0.50 0.02 260)
//   --border       : oklch(0.92 0.008 255)
//
// We keep using Tailwind's CSS-variable system (bg-background, text-foreground,
// etc.) and only add the brand-specific one-off values inline.

// ─── i18n ─────────────────────────────────────────────────────────────────────

const messages = {
  es: {
    appTitle: "LinkedIn to Sheets",
    appSubtitle: "Copia información de LinkedIn directo a Google Sheets",
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

    destination: "Ubicación",
    currentProfile: "Perfil actual",
    spreadsheet: "Hoja de cálculo",
    tab: "Pestaña",
    chooseSpreadsheet: "Elige una hoja de cálculo…",
    chooseTab: "Elige una pestaña…",
    loadingTabs: "Cargando pestañas...",
    loadingSpreadsheets: "Cargando hojas de cálculo...",
    noSpreadsheetsFound: "No se encontraron hojas de cálculo",
    searchSpreadsheets: "Buscar hojas de cálculo…",

    refresh: "Actualizar",
    pasteCurrentProfile: "Copiar perfil",
    pasting: "Pegando...",

    configColumns: "Config. columnas",
    googleSheetTemplate: "Plantilla",
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
    columnMappingSubtitle: "Elige qué columna recibe cada campo",
    back: "← Regresar",
    required: "Obligatorio",
    resetToDefault: "Restablecer",
    saveChanges: "Guardar cambios",
    fieldName: "Nombre",
    fieldCompany: "Empresa",
    fieldTitle: "Puesto",
    fieldLocation: "Ubicación",
    fieldProfileUrl: "URL",

    feedbackPromptTitle: "¿Te está gustando LinkedIn to Sheets?",
    feedbackPromptBody:
    "Tu feedback ayuda a mejorar la extensión y seguir lanzando actualizaciones.",
    feedbackPromptButton: "Enviar feedback",
    feedbackPromptDismiss: "Ahora no",
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
    googleSheetTemplate: "Template",
    customColumnMappingActive: "Custom column mapping active",

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
    fieldName: "Name",
    fieldCompany: "Company",
    fieldTitle: "Title",
    fieldLocation: "Location",
    fieldProfileUrl: "Profile URL",

    feedbackPromptTitle: "Enjoying LinkedIn to Sheets?",
    feedbackPromptBody:
    "Your feedback helps improve the extension and supports future updates.",
    feedbackPromptButton: "Send feedback",
    feedbackPromptDismiss: "Not now",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessage(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

// ── Unified toast hook — success (2s), warning (3.5s), error (3.5s) ──────────
function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType]       = useState<"success" | "warning" | "error">("success");

  useEffect(() => {
    if (!toastMessage) return;
    const duration = toastType === "success" ? 2000 : 3500;
    const timer = window.setTimeout(() => setToastMessage(null), duration);
    return () => window.clearTimeout(timer);
  }, [toastMessage, toastType]);

  function showToast(message: string, type: "success" | "warning" | "error") {
    setToastMessage(message);
    setToastType(type);
  }
  function dismissToast() { setToastMessage(null); }

  return { toastMessage, toastType, showToast, dismissToast, setToastMessage, setToastType };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * BrandToast — floats above the Paste button, light palette, three variants:
 *
 *  success  → verde menta   bg: oklch(0.96 0.030 145)  text: oklch(0.28 0.10 145)
 *  warning  → ámbar claro   bg: oklch(0.97 0.025  80)  text: oklch(0.34 0.09  65)
 *  error    → rojo claro    bg: oklch(0.97 0.020  15)  text: oklch(0.32 0.10  15)
 */
function BrandToast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "warning" | "error";
  onClose: () => void;
}) {
  const isSuccess = type === "success";
  const isWarning = type === "warning";

  // ── palette tokens ────────────────────────────────────────────────────────
  const bg = isSuccess ? "oklch(0.96 0.030 145)"
  : isWarning ? "oklch(0.97 0.025  80)"
  :              "oklch(0.97 0.020  15)";

  const border = isSuccess ? "oklch(0.72 0.13 145 / 0.55)"
  : isWarning ? "oklch(0.72 0.14  65 / 0.50)"
  :              "oklch(0.72 0.14  15 / 0.50)";

  const iconColor = isSuccess ? "oklch(0.42 0.17 145)"
  : isWarning ? "oklch(0.52 0.15  65)"
  :              "oklch(0.50 0.18  15)";

  const textColor = isSuccess ? "oklch(0.28 0.10 145)"
  : isWarning ? "oklch(0.34 0.09  65)"
  :              "oklch(0.32 0.10  15)";

  const barBg   = isSuccess ? "oklch(0.75 0.13 145 / 0.28)"
  : isWarning ? "oklch(0.75 0.13  65 / 0.28)"
  :              "oklch(0.75 0.13  15 / 0.28)";

  const barFill = isSuccess ? "oklch(0.50 0.17 145)"
  : isWarning ? "oklch(0.58 0.15  65)"
  :              "oklch(0.55 0.18  15)";

  const duration = isSuccess ? 2000 : 3500;
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="absolute left-3 right-3 z-50 overflow-hidden rounded-xl"
      style={{ bottom: "52px", background: bg, border: `1px solid ${border}` }}
      role="alert"
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {isSuccess
        ? <Check        className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
        : <AlertCircle  className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
      }
      <span className="text-[11px] font-medium flex-1 leading-snug" style={{ color: textColor }}>
        {message}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 transition-opacity hover:opacity-100 opacity-40"
        style={{ color: iconColor }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div className="h-[2px]" style={{ background: barBg }}>
      <div
        className="h-full"
        style={{ background: barFill, animation: `toast-shrink ${duration}ms linear forwards` }}
      />
    </div>
    <style>{`@keyframes toast-shrink { from { width:100% } to { width:0% } }`}</style>
  </div>
  );
}

/** Full-screen success animation */
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
    <div className="px-5 py-14 flex flex-col items-center justify-center text-center gap-4">
      {/* Animated ring */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-20 h-20 rounded-full opacity-20 animate-ping"
          style={{ background: "oklch(0.66 0.19 145)" }}
        />
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.66 0.19 145 / 0.12)", border: "1.5px solid oklch(0.66 0.19 145 / 0.25)" }}
        >
          <CheckCircle2
            className="w-7 h-7"
            style={{ color: "oklch(0.66 0.19 145)" }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-foreground tracking-tight">
          {t.profilePasted}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
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

/** Column mapping configuration panel */
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
  mappingFields: readonly { key: keyof ColumnMapping; label: string; Icon: React.ComponentType<{ size?: number }> }[];
  columnMapping: ColumnMapping;
  mappedColumns: string[];
  availableHeaders: { column: string; header: string }[];
  columnOptions: readonly string[];
  hasDuplicateColumns: boolean;
  setColumnMapping: (value: SetStateAction<ColumnMapping>) => void;
  onBack: () => void;
  onReset: () => void;
  onSave: () => void;
  t: (typeof messages)[Lang];
}) {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "oklch(0.66 0.19 145)" }} />
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              {t.columnMappingTitle}
            </h2>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t.columnMappingSubtitle}
          </p>
        </div>
        <button
          onClick={onBack}
          className="h-7 px-2.5 text-[11px] font-medium rounded-lg border border-border bg-card hover:bg-accent/50 text-foreground transition-colors whitespace-nowrap shrink-0"
        >
          {t.back}
        </button>
      </div>

      {/* Fields */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {mappingFields.map((field, idx) => {
          const { Icon } = field;
          const isDuplicate =
          columnMapping[field.key].enabled &&
          mappedColumns.filter((col) => col === columnMapping[field.key].column).length > 1;

          return (
            <div
              key={field.key}
              className={[
                "flex items-center justify-between gap-3 px-3 py-2.5",
                idx < mappingFields.length - 1 ? "border-b border-border/60" : "",
                isDuplicate ? "bg-amber-50/60 dark:bg-amber-500/5" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={columnMapping[field.key].enabled}
                    disabled={field.key === "profileUrl"}
                    onChange={(e) =>
                    setColumnMapping((prev) => ({
                      ...prev,
                      [field.key]: { ...prev[field.key], enabled: e.target.checked },
                    }))
                  }
                  className="h-3.5 w-3.5 rounded disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ accentColor: "oklch(0.66 0.19 145)" }}
                />
                <Icon size={14} />
                <span className="text-xs text-foreground">{field.label}</span>
                {field.key === "profileUrl" && (
                  <span className="text-[10px] text-muted-foreground">({t.required})</span>
                  )}
              </div>
              <select
                value={columnMapping[field.key].column}
                onChange={(e) =>
                setColumnMapping((prev) => ({
                  ...prev,
                  [field.key]: { ...prev[field.key], column: e.target.value },
                }))
              }
              disabled={!columnMapping[field.key].enabled}
              className={[
                "h-7 w-[150px] rounded-lg border pl-2 pr-6 text-xs outline-none truncate transition-colors",
                !columnMapping[field.key].enabled
                ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : isDuplicate
                ? "border-amber-400/60 bg-background text-foreground"
                : "border-border bg-background text-foreground hover:border-primary/40",
                ].join(" ")}
              >
                {(availableHeaders.length
                  ? availableHeaders
                  : columnOptions.map((col) => ({ column: col, header: "" }))
                  ).map((item) => (
                    <option key={item.column} value={item.column}>
                      {item.header ? `${item.column} : ${item.header}` : item.column}
                    </option>
                    ))}
                </select>
              </div>
              );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-2">
        <button
          onClick={onReset}
          className="h-8 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent/50 text-muted-foreground transition-colors"
        >
          {t.resetToDefault}
        </button>
        <button
          onClick={onSave}
          disabled={hasDuplicateColumns}
          className="h-8 px-4 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "oklch(0.66 0.19 145)" }}
        >
          {t.saveChanges}
        </button>
      </div>
    </div>
    );
}

/** Loading skeleton */
function LoadingShell({ t }: { t: (typeof messages)[Lang] }) {
  return (
    <div className="w-[380px] h-[600px] bg-background text-foreground overflow-hidden flex flex-col">
      <PopupHeader t={t} />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "oklch(0.66 0.19 145)" }} />
          <span className="text-xs">{t.loading}</span>
        </div>
      </div>
    </div>
    );
}

/** Shared header bar */
function PopupHeader({ t }: { t: (typeof messages)[Lang] }) {
  return (
    <div className="px-4 pt-4 pb-3.5 border-b border-border/60 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
          <img
            src="/logo.png"
            alt="LinkedIn to Sheets logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-tight tracking-tight">
            {t.appTitle}
          </h1>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {t.appSubtitle}
          </p>
        </div>
      </div>
    </div>
    );
}

function FeedbackPromptOverlay({
  onClose,
  onSendFeedback,
  t,
}: {
  onClose: () => void;
  onSendFeedback: () => void;
  t: (typeof messages)[Lang];
}) {
  return (
    <div className="absolute inset-0 z-40 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[320px] rounded-2xl border border-border bg-card shadow-xl p-4 text-center space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: "oklch(0.66 0.19 145 / 0.12)",
            border: "1px solid oklch(0.66 0.19 145 / 0.25)",
          }}
        >
          <CheckCircle2
            className="w-6 h-6"
            style={{ color: "oklch(0.66 0.19 145)" }}
          />
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t.feedbackPromptTitle}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t.feedbackPromptBody}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onSendFeedback}
            className="w-full h-9 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "oklch(0.66 0.19 145)" }}
          >
            {t.feedbackPromptButton}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            {t.feedbackPromptDismiss}
          </button>
        </div>
      </div>
    </div>
    );
}

/** Shared footer bar */
function PopupFooter({ t, version }: { t: (typeof messages)[Lang]; version: string }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2.5 border-t border-border/40 bg-background flex justify-between items-center">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <a
          href="https://josueluna.github.io/LinkedIn_to_Sheets/feedback.html"
          target="_blank"
          className="hover:text-foreground transition-colors"
        >
          {t.sendFeedback}
        </a>
        <span className="opacity-40">·</span>
        <a
          href="https://josueluna.github.io/LinkedIn_to_Sheets/changelog.html"
          target="_blank"
          className="hover:text-foreground transition-colors"
        >
          {t.changelog}
        </a>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <a
          href="https://www.linkedin.com/in/josuelunagamboa/"
          target="_blank"
          className="hover:text-foreground transition-colors"
        >
          {t.developedBy}
        </a>
        <span className="opacity-40">v{version}</span>
      </div>
    </div>
    );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExtensionPopup() {
  const [lang, setLang] = useState<Lang>("en");
  const t = messages[lang];
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [appState, setAppState] = useState<AppState>("empty");
  const [isHydrating, setIsHydrating] = useState(true);

  const [profile, setProfile] = useState<LinkedinProfile | null>(null);
  const { toastMessage, toastType, showToast, dismissToast, setToastMessage, setToastType } = useToast();
  // convenience aliases that preserve existing call-sites unchanged
  function showError(msg: string)   { showToast(msg, "error"); }
  function clearFeedback()          { dismissToast(); }

  const [spreadsheetId, setSpreadsheetId]     = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [spreadsheetUrl, setSpreadsheetUrl]   = useState("");
  const [selectedTab, setSelectedTab]         = useState("");

  const [allSpreadsheets, setAllSpreadsheets]   = useState<SpreadsheetItem[]>([]);
  const [availableTabs, setAvailableTabs]       = useState<string[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<{ column: string; header: string }[]>([]);

  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
  const [tabPickerOpen, setTabPickerOpen]     = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");

  const [isConnecting, setIsConnecting]               = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs]             = useState(false);
  const [isDisconnectHover, setIsDisconnectHover]     = useState(false);
  const [isDisconnecting, setIsDisconnecting]         = useState(false);
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);


  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMapping, setColumnMapping]         = useState<ColumnMapping>(defaultColumnMapping);
  const [draftColumnMapping, setDraftColumnMapping] = useState<ColumnMapping | null>(null);

  const [showSuccessAfterFeedback, setShowSuccessAfterFeedback] = useState(false);

  const isConnected = connectionStatus === "connected";
  const version     = chrome.runtime.getManifest().version;

  // ── Feedback prompt logic ────────────────────────────────────────────────
  const FEEDBACK_FIRST_PROMPT_AT = 20;
  const FEEDBACK_DISMISS_DELAY = 30;
  const FEEDBACK_SEND_DELAY = 100;

  async function handleSendFeedback() {
    const stored = await chrome.storage.local.get(["pasteCount"]);
    const count = (stored.pasteCount as number) ?? 0;

    await chrome.storage.local.set({
      feedbackSuppressUntil: count + FEEDBACK_SEND_DELAY,
      feedbackHasShownOnce: true,
    });

    setShowFeedbackOverlay(false);

    if (showSuccessAfterFeedback) {
      showSuccessThenReturn();
    }

    window.open(
      "https://josueluna.github.io/LinkedIn_to_Sheets/feedback.html",
      "_blank",
      );
  }

  function showSuccessThenReturn() {
    setShowSuccessAfterFeedback(false);
    setAppState("success");

    setTimeout(() => {
      setAppState("connected");
    }, 2200);
  }

  async function handleDismissFeedback() {
    const stored = await chrome.storage.local.get(["pasteCount"]);
    const count = (stored.pasteCount as number) ?? 0;

    await chrome.storage.local.set({
      feedbackSuppressUntil: count + FEEDBACK_DISMISS_DELAY,
      feedbackHasShownOnce: true,
    });

    setShowFeedbackOverlay(false);

    if (showSuccessAfterFeedback) {
      showSuccessThenReturn();
    }
  }

  const filteredSpreadsheets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSpreadsheets;
    return allSpreadsheets.filter((s) => s.name.toLowerCase().includes(q));
  }, [allSpreadsheets, searchQuery]);

  const activeColumnMapping = showColumnMapping && draftColumnMapping ? draftColumnMapping : columnMapping;
  const mappedColumns = Object.values(activeColumnMapping).filter((f) => f.enabled).map((f) => f.column);
  const hasDuplicateColumns = new Set(mappedColumns).size !== mappedColumns.length;

  const hasCustomColumnMapping = useMemo(() => {
    return (Object.keys(defaultColumnMapping) as Array<keyof ColumnMapping>).some((key) => {
      const curr = columnMapping[key];
      const base = defaultColumnMapping[key];
      return curr.enabled !== base.enabled || curr.column !== base.column;
    });
  }, [columnMapping]);

  const canPaste =
  isConnected && !!profile && !!spreadsheetId && !!selectedTab &&
  !isRefreshingProfile && appState !== "saving";

  const shouldHighlightSpreadsheet = isConnected && !spreadsheetName;
  const shouldHighlightTab         = isConnected && !!spreadsheetId && !selectedTab;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleResetColumnMapping() {
    await chrome.storage.local.set({ columnMapping: defaultColumnMapping });
    setColumnMapping(defaultColumnMapping);
    setDraftColumnMapping(null);
    setShowColumnMapping(false);
    showToast(t.columnMappingReset, "success");
  }

  async function handleSaveColumnMapping() {
    if (!draftColumnMapping) { setShowColumnMapping(false); return; }
    if (hasDuplicateColumns) return;
    await chrome.storage.local.set({ columnMapping: draftColumnMapping });
    setColumnMapping(draftColumnMapping);
    setDraftColumnMapping(null);
    showToast(t.columnMappingSaved, "success");
    setShowColumnMapping(false);
  }

  useEffect(() => {
    const browserLang = (navigator.language || "en").toLowerCase();
    setLang(browserLang.startsWith("es") ? "es" : "en");
    void hydrate();

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local") return;
      if (changes.isConnected || changes.spreadsheetId || changes.spreadsheetName ||
        changes.spreadsheetUrl || changes.sheetName) {
        void hydrate();
    }
  };

  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
}, []);

  if (isHydrating) return <LoadingShell t={t} />;

  async function loadHeaders(sid: string, sheetName: string) {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_SHEET_HEADERS", spreadsheetId: sid, sheetName });
      if (!response?.ok) throw new Error(response?.error || "Could not load sheet headers.");
      setAvailableHeaders(Array.isArray(response.headers) ? response.headers : []);
    } catch {
      setAvailableHeaders([]);
    }
  }

  async function hydrate() {
    try {
      const data = (await chrome.storage.local.get([
        "isConnected", "spreadsheetId", "spreadsheetName", "spreadsheetUrl", "sheetName", "columnMapping",
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
      setShowFeedbackOverlay(false);
      setIsConnecting(true);
      clearFeedback();
      const response = await chrome.runtime.sendMessage({ type: "AUTH_GOOGLE" });
      if (!response?.ok) throw new Error(response?.error || t.googleAuthFailed);
      await chrome.storage.local.set({ isConnected: true });
      setConnectionStatus("connected");
      setAppState("connected");
      showToast(t.googleConnected, "success");
      await loadSpreadsheets(true);
      await loadCurrentProfile(false);
    } catch (error) {
      setAppState("error");
      showError(error instanceof Error ? error.message : t.googleAuthFailed);
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      setShowFeedbackOverlay(false);
      setIsDisconnecting(true);
      clearFeedback();
      const response = await chrome.runtime.sendMessage({ type: "DISCONNECT_GOOGLE" });
      if (!response?.ok) throw new Error(response?.error || t.couldNotDisconnectGoogle);
      setConnectionStatus("disconnected");
      setAppState("empty");
      setProfile(null);
      setSpreadsheetId(""); setSpreadsheetName(""); setSpreadsheetUrl(""); setSelectedTab("");
      setAllSpreadsheets([]); setAvailableTabs([]);
      setSheetPickerOpen(false); setTabPickerOpen(false); setSearchQuery("");
      setIsDisconnectHover(false);
      showToast(t.googleDisconnected, "success");
    } catch (error) {
      setAppState("error");
      showError(error instanceof Error ? error.message : t.couldNotDisconnectGoogle);
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function loadCurrentProfile(showLoadedMessage = true) {
    try {
      setIsRefreshingProfile(true);
      if (showLoadedMessage) clearFeedback();
      const response = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_PROFILE" });
      if (!response?.ok || !response.profile) {
        setProfile(null);
        if (appState === "error") setAppState("connected");
        return;
      }
      setProfile(response.profile as LinkedinProfile);
      if (appState === "error") setAppState("connected");
      if (showLoadedMessage) showToast(t.linkedinProfileLoaded, "success");
    } catch {
      setProfile(null);
      if (appState === "error") setAppState("connected");
    } finally {
      setIsRefreshingProfile(false);
    }
  }

  async function loadSpreadsheets(forceRefresh: boolean) {
    try {
      setIsLoadingSpreadsheets(true);
      const response = await chrome.runtime.sendMessage({ type: "LIST_SPREADSHEETS", forceRefresh });
      if (!response?.ok) throw new Error(response?.error || t.couldNotLoadSpreadsheets);
      setAllSpreadsheets(Array.isArray(response.spreadsheets) ? response.spreadsheets : []);
      setSearchQuery("");
    } catch (error) {
      setAllSpreadsheets([]);
      setAppState("error");
      showError(error instanceof Error ? error.message : t.couldNotLoadSpreadsheets);
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  }

  async function loadTabs(id: string, preferredTab?: string) {
    try {
      setIsLoadingTabs(true);
      const response = await chrome.runtime.sendMessage({ type: "GET_SHEET_TABS", spreadsheetId: id });
      if (!response?.ok) throw new Error(response?.error || t.couldNotLoadTabs);
      const tabs = Array.isArray(response.tabs) ? response.tabs : [];
      setAvailableTabs(tabs);
      if (preferredTab && tabs.includes(preferredTab)) setSelectedTab(preferredTab);
    } catch (error) {
      setAvailableTabs([]);
      setAppState("error");
      showError(error instanceof Error ? error.message : t.couldNotLoadTabs);
    } finally {
      setIsLoadingTabs(false);
    }
  }

  async function handleSelectSpreadsheet(sheet: SpreadsheetItem) {
    setShowFeedbackOverlay(false);
    clearFeedback();
    setSpreadsheetId(sheet.id); setSpreadsheetName(sheet.name); setSpreadsheetUrl(sheet.url);
    setSelectedTab(""); setAvailableHeaders([]);
    setSheetPickerOpen(false); setTabPickerOpen(false); setSearchQuery("");
    await chrome.storage.local.set({
      spreadsheetId: sheet.id, spreadsheetName: sheet.name, spreadsheetUrl: sheet.url, sheetName: "",
    });
    await loadTabs(sheet.id);
    showToast(t.destinationSpreadsheetSaved, "success");
    setAppState("connected");
  }

  async function handleSelectTab(tab: string) {
    setShowFeedbackOverlay(false);
    clearFeedback();
    setSelectedTab(tab); setTabPickerOpen(false);
    await chrome.storage.local.set({ sheetName: tab });
    if (spreadsheetId) await loadHeaders(spreadsheetId, tab);
    else setAvailableHeaders([]);
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
        setAppState("connected");
        return;
      }

      if (!spreadsheetId) {
        throw new Error(t.chooseSpreadsheetFirst);
      }

      if (!selectedTab) {
        throw new Error(t.chooseTabFirst);
      }

      const response = await chrome.runtime.sendMessage({
        type: "APPEND_PROFILE",
        spreadsheetId,
        sheetName: selectedTab,
        profile,
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
          })
          );
        setToastType("warning");
        return;
      }

      const stored = await chrome.storage.local.get([
        "pasteCount",
        "feedbackSuppressUntil",
        "feedbackHasShownOnce",
      ]);

      const newCount = ((stored.pasteCount as number) ?? 0) + 1;
      const suppressUntil = (stored.feedbackSuppressUntil as number) ?? 0;
      const hasShownOnce = Boolean(stored.feedbackHasShownOnce);

      const shouldPromptFeedback = hasShownOnce
      ? newCount > suppressUntil
      : newCount >= FEEDBACK_FIRST_PROMPT_AT;

      await chrome.storage.local.set({
        pasteCount: newCount,
        ...(shouldPromptFeedback ? { feedbackHasShownOnce: true } : {}),
      });

      if (shouldPromptFeedback) {
        setShowSuccessAfterFeedback(true);
        setAppState("connected");
        setShowFeedbackOverlay(true);
      } else {
        setAppState("success");

        setTimeout(() => {
          setAppState("connected");
        }, 2200);
      }
    } catch (error) {
      setAppState("error");
      showError(
        error instanceof Error ? error.message : t.couldNotPasteProfile
        );
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-[380px] h-[600px] bg-background text-foreground overflow-hidden font-sans">
      <div className="relative h-full overflow-hidden flex flex-col">

        {/* ── Header (always visible) ── */}
        <PopupHeader t={t} />

        {/* ── Panel stack ── */}
        <div className="relative flex-1 overflow-hidden">

          {/* ────────────────── Main panel ────────────────── */}
          <div
            className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out ${
              showColumnMapping
              ? "-translate-x-1/3 pointer-events-none"
              : appState === "success"
              ? "-translate-y-full pointer-events-none"
              : "translate-x-0 translate-y-0 pointer-events-auto"
            }`}
          >
            {/* ── Login panel ── */}
            <div
              className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out ${
                isConnected ? "-translate-y-full pointer-events-none" : "translate-y-0 pointer-events-auto"
              }`}
            >
              <div className="px-4 py-4 h-full flex flex-col">
                <div className="flex-1 space-y-4">
                  {/* Google Account row */}
                  <div className="flex items-center justify-between">
                    <SectionLabel>{t.googleAccount}</SectionLabel>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                      style={{
                        color: "oklch(0.50 0.02 260)",
                        borderColor: "oklch(0.92 0.008 255)",
                      }}
                    >
                      <CircleDot className="w-2.5 h-2.5" />
                      {t.notConnected}
                    </span>
                  </div>

                  {/* Connect button */}
                  <div className="pt-6">
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, oklch(0.50 0.15 245), oklch(0.55 0.16 245))" }}
                    >
                      {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isConnecting ? t.connecting : t.connectGoogle}
                    </button>
                  </div>
                </div>

                <PopupFooter t={t} version={version} />
              </div>
            </div>

            {/* ── Connected panel ── */}
            <div
              className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out ${
                isConnected ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
              }`}
            >
              <div className="px-4 py-3 h-full flex flex-col gap-3 pb-12">

                {/* Google Account status */}
                <div className="flex items-center justify-between">
                  <SectionLabel>{t.googleAccount}</SectionLabel>
                  <button
                    type="button"
                    onClick={() => void handleDisconnect()}
                    onMouseEnter={() => setIsDisconnectHover(true)}
                    onMouseLeave={() => setIsDisconnectHover(false)}
                    disabled={isDisconnecting}
                    className="transition-all"
                  >
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all cursor-pointer"
                      style={
                        isDisconnectHover
                        ? { background: "oklch(0.62 0.22 27 / 0.12)", color: "oklch(0.62 0.22 27)", border: "1px solid oklch(0.62 0.22 27 / 0.30)" }
                        : { background: "oklch(0.66 0.19 145 / 0.12)", color: "oklch(0.50 0.18 145)", border: "1px solid oklch(0.66 0.19 145 / 0.25)" }
                      }
                    >
                      <CircleDot className="w-2.5 h-2.5" />
                      {isDisconnecting ? t.disconnecting : isDisconnectHover ? t.disconnectGoogle : t.connected}
                    </span>
                  </button>
                </div>

                {/* ── Destination section ── */}
                <div className="rounded-xl border border-border bg-card/60 p-3 space-y-3">
                  {/* Section header with action buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <SectionLabel>{t.destination}</SectionLabel>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => window.open("https://docs.google.com/spreadsheets/d/1w7nUnxSllVPVc7t1OhE-M6hN3zbeYIGK0jMf2SBsE60/copy", "_blank")}
                        className="h-6 px-2 text-[10px] font-medium rounded-lg border border-border bg-background hover:bg-accent/50 text-muted-foreground transition-colors"
                      >
                        {t.googleSheetTemplate}
                      </button>
                      <button
                        onClick={() => {
                          setDraftColumnMapping(JSON.parse(JSON.stringify(columnMapping)) as ColumnMapping);
                          setShowColumnMapping(true);
                        }}
                        className="h-6 px-2 text-[10px] font-medium rounded-lg border border-border bg-background hover:bg-accent/50 text-muted-foreground transition-colors flex items-center gap-1"
                      >
                        <SlidersHorizontal className="w-2.5 h-2.5" />
                        {t.configColumns}
                      </button>
                    </div>
                  </div>

                  {/* Spreadsheet picker */}
                  <div className="space-y-1">
                    <div className="relative">
                      <Label className="text-[10px] text-muted-foreground font-medium">{t.spreadsheet}</Label>
                      <button
                        type="button"
                        onClick={async () => {
                          const next = !sheetPickerOpen;
                          setSheetPickerOpen(next);
                          setTabPickerOpen(false);
                          setSearchQuery("");
                          if (next) await loadSpreadsheets(true);
                        }}
                        className={[
                          "mt-1 w-full h-8 flex items-center justify-between gap-2 rounded-lg px-2.5 text-xs transition-all",
                          shouldHighlightSpreadsheet
                          ? "border border-amber-400/60 bg-amber-50/60 dark:bg-amber-500/10 animate-pulse"
                          : "border border-border bg-background hover:border-primary/30",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <FileSpreadsheet className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className={spreadsheetName ? "text-foreground" : "text-muted-foreground"}>
                              {spreadsheetName || t.chooseSpreadsheet}
                            </span>
                          </span>
                          {isLoadingSpreadsheets
                          ? <Loader2 className="w-3 h-3 animate-spin shrink-0 text-muted-foreground" />
                          : <ChevronDown className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${sheetPickerOpen ? "rotate-180" : ""}`} />
                        }
                      </button>

                      {sheetPickerOpen && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                          <div className="p-1.5 border-b border-border/60">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder={t.searchSpreadsheets}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-7 pl-6 pr-2 rounded-lg bg-muted/50 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-[160px] overflow-y-auto">
                            {isLoadingSpreadsheets ? (
                              <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">{t.loadingSpreadsheets}</div>
                              ) : filteredSpreadsheets.length === 0 ? (
                              <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">{t.noSpreadsheetsFound}</div>
                              ) : (
                              filteredSpreadsheets.map((sheet) => (
                                <button
                                  key={sheet.id}
                                  type="button"
                                  onClick={() => void handleSelectSpreadsheet(sheet)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/40 transition-colors ${spreadsheetId === sheet.id ? "bg-accent/25" : ""}`}
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.66 0.19 145)" }} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-foreground truncate">{sheet.name}</div>
                                  </div>
                                  {spreadsheetId === sheet.id && (
                                    <Check className="w-3 h-3 shrink-0" style={{ color: "oklch(0.66 0.19 145)" }} />
                                    )}
                                </button>
                                ))
                              )}
                            </div>
                          </div>
                          )}
                    </div>

                    {/* Tab picker */}
                    <div className="relative">
                      <Label className="text-[10px] text-muted-foreground font-medium">{t.tab}</Label>
                      <button
                        type="button"
                        onClick={() => {
                          if (availableTabs.length) {
                            setTabPickerOpen(!tabPickerOpen);
                            setSheetPickerOpen(false);
                          }
                        }}
                        disabled={!spreadsheetId || isLoadingTabs}
                        className={[
                          "mt-1 w-full h-8 flex items-center justify-between gap-2 rounded-lg px-2.5 text-xs transition-all",
                          !spreadsheetId
                          ? "border border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                          : shouldHighlightTab
                          ? "border border-amber-400/60 bg-amber-50/60 dark:bg-amber-500/10 animate-pulse"
                          : "border border-border bg-background hover:border-primary/30",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <Table2 className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className={selectedTab ? "text-foreground" : "text-muted-foreground"}>
                              {isLoadingTabs ? t.loadingTabs : selectedTab || t.chooseTab}
                            </span>
                          </span>
                          {isLoadingTabs
                          ? <Loader2 className="w-3 h-3 animate-spin shrink-0 text-muted-foreground" />
                          : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                        }
                      </button>

                      {/* Tab dropdown — outside button to avoid inheriting animate-pulse */}
                      {tabPickerOpen && availableTabs.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 left-0 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                          <div className="max-h-[130px] overflow-y-auto">
                            {availableTabs.map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => void handleSelectTab(tab)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/40 transition-colors ${selectedTab === tab ? "bg-accent/25" : ""}`}
                              >
                                <Table2 className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-foreground">{tab}</span>
                                {selectedTab === tab && (
                                  <Check className="w-3 h-3 ml-auto shrink-0" style={{ color: "oklch(0.66 0.19 145)" }} />
                                  )}
                              </button>
                              ))}
                          </div>
                        </div>
                        )}
                    </div>
                  </div>

                  {/* Destination confirmation pill */}
                  {spreadsheetName && selectedTab && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "oklch(0.66 0.19 145 / 0.07)", border: "1px solid oklch(0.66 0.19 145 / 0.15)" }}>
                      <Check className="w-3 h-3 shrink-0" style={{ color: "oklch(0.66 0.19 145)" }} />
                      <span className="text-[11px] text-foreground truncate font-medium">
                        {spreadsheetName} → {selectedTab}
                      </span>
                      {hasCustomColumnMapping && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "oklch(0.66 0.19 145)" }} />
                          custom
                        </span>
                        )}
                    </div>
                    )}
                </div>

                {/* ── Current Profile section ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SectionLabel>{t.currentProfile}</SectionLabel>
                    <button
                      type="button"
                      onClick={() => void loadCurrentProfile(true)}
                      disabled={isRefreshingProfile}
                      className="flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded-lg border border-border bg-card hover:bg-accent/50 text-muted-foreground transition-colors disabled:opacity-50"
                    >
                      {isRefreshingProfile
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <><RefreshCw className="w-3 h-3" />{t.refresh}</>
                    }
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  {profile ? (
                    MAPPING_FIELDS.filter(({ key }) => columnMapping[key].enabled).map(({ key, Icon }) => {
                      const value =
                      key === "name" ? profile.name :
                      key === "company" ? profile.company :
                      key === "title" ? profile.title :
                      key === "location" ? profile.location :
                      profile.profileUrl.replace(/^https?:\/\/(www\.)?/, "");
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Icon size={12} />
                          <span className="text-xs text-foreground truncate">{value || "—"}</span>
                        </div>
                        );
                    })
                    ) : (
                    <p className="text-xs text-muted-foreground">{t.openProfileAndRefresh}</p>
                    )}
                  </div>
                </div>

                {/* ── Paste button ── */}
                <button
                  onClick={handlePasteProfile}
                  disabled={!canPaste}
                  className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, oklch(0.50 0.15 245), oklch(0.55 0.16 245))" }}
                >
                  {appState === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                  {appState === "saving" ? t.pasting : t.pasteCurrentProfile}
                </button>

                {/* Inline feedback */}



                <PopupFooter t={t} version={version} />
              </div>
            </div>
          </div>

          {/* ────────────────── Column Mapping panel ────────────────── */}
          <div
            className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out shadow-[-4px_0_16px_rgba(0,0,0,0.08)] ${
              showColumnMapping ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
            }`}
          >
            <ColumnMappingPanel
              mappingFields={MAPPING_FIELDS.map((f) => ({ ...f, label: t[f.labelKey] }))}
              columnMapping={activeColumnMapping}
              mappedColumns={mappedColumns}
              availableHeaders={availableHeaders}
              columnOptions={COLUMN_OPTIONS}
              hasDuplicateColumns={hasDuplicateColumns}
              setColumnMapping={(nextMapping) => {
                setDraftColumnMapping((prev) => {
                  const base = prev ?? columnMapping;
                  return typeof nextMapping === "function"
                  ? (nextMapping as (prev: ColumnMapping) => ColumnMapping)(base)
                  : nextMapping;
                });
              }}
              onBack={() => { setDraftColumnMapping(null); setShowColumnMapping(false); }}
              onReset={() => void handleResetColumnMapping()}
              onSave={() => void handleSaveColumnMapping()}
              t={t}
            />
          </div>

{/* ────────────────── Success panel ────────────────── */}
          <div
            className={`absolute inset-0 bg-background transition-transform duration-300 ease-in-out ${
              appState === "success" ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
            }`}
          >
            <SuccessState
              profileName={profile?.name}
              spreadsheetName={spreadsheetName}
              selectedTab={selectedTab}
              t={t}
            />
          </div>

          {showFeedbackOverlay && (
            <FeedbackPromptOverlay
              onClose={() => {
                void handleDismissFeedback();
              }}
              onSendFeedback={() => {
                void handleSendFeedback();
              }}
              t={t}
              />
              )}
        </div>
      </div>

      {/* Toast — floats above the Paste button, unified for success / warning / error */}
      {toastMessage && (
        <BrandToast
          message={toastMessage}
          type={toastType}
          onClose={dismissToast}
          />
          )}
    </div>
    );
}