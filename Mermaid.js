flowchart TD

subgraph group_group_linkedin["LinkedIn page"]
  node_node_content["Content script<br/>[content.ts]"]
  node_node_profile_data["Profile data<br/>extracted model"]
end

subgraph group_group_extension["Extension runtime"]
  node_node_popup_app["Popup app<br/>React entry<br/>[App.tsx]"]
  node_node_main["UI mount<br/>React bootstrap<br/>[main.tsx]"]
  node_node_popup["Extension popup<br/>UI panel<br/>[ExtensionPopup.tsx]"]
  node_node_selector["Spreadsheet selector<br/>UI component"]
  node_node_background{{"Background worker<br/>service worker<br/>[background.ts]"}}
  node_node_storage[("Local storage<br/>persistence<br/>[storage.ts]")]
  node_node_utils["UI utils<br/>helpers<br/>[utils.ts]"]
end

subgraph group_group_google["Google services"]
  node_node_google["Google client<br/>api adapter<br/>[google.ts]"]
  node_node_sheets[("Sheets write<br/>api boundary")]
  node_node_drive[("Drive lookup<br/>api boundary")]
  node_node_oauth(("Google OAuth<br/>auth flow"))
end

subgraph group_group_build["Build & docs"]
  node_node_manifest["Manifest<br/>mv3 config<br/>[manifest.json]"]
  node_node_vite["Vite config<br/>build config<br/>[vite.config.ts]"]
  node_node_styles["Tailwind styles<br/>style config<br/>[tailwind.config.ts]"]
  node_node_docs["Docs pages<br/>static pages<br/>[privacy.html]"]
end

node_node_main -->|"mounts"| node_node_popup
node_node_popup_app -->|"uses"| node_node_selector
node_node_popup -->|"sends actions"| node_node_background
node_node_content -->|"extracts"| node_node_profile_data
node_node_content -->|"posts data"| node_node_background
node_node_background -->|"reads/writes"| node_node_storage
node_node_background -->|"delegates"| node_node_google
node_node_google -->|"authenticates"| node_node_oauth
node_node_google -->|"lists"| node_node_drive
node_node_google -->|"writes"| node_node_sheets
node_node_selector -->|"persists choice"| node_node_storage
node_node_background -->|"dedupes before write"| node_node_sheets
node_node_manifest -->|"registers"| node_node_content
node_node_manifest -->|"registers"| node_node_background
node_node_manifest -->|"registers"| node_node_main
node_node_vite -->|"bundles"| node_node_popup_app
node_node_styles -->|"styles"| node_node_popup
node_node_docs -.->|"separate surface"| node_node_manifest

click node_node_content "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/content.ts"
click node_node_popup_app "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/App.tsx"
click node_node_main "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/main.tsx"
click node_node_popup "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/components/ExtensionPopup.tsx"
click node_node_selector "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/components/SpreadsheetSelector.tsx"
click node_node_background "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/background.ts"
click node_node_storage "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/lib/storage.ts"
click node_node_utils "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/lib/utils.ts"
click node_node_google "https://github.com/josueluna/linkedin_to_sheets/blob/main/src/lib/google.ts"
click node_node_manifest "https://github.com/josueluna/linkedin_to_sheets/blob/main/public/manifest.json"
click node_node_vite "https://github.com/josueluna/linkedin_to_sheets/blob/main/vite.config.ts"
click node_node_styles "https://github.com/josueluna/linkedin_to_sheets/blob/main/tailwind.config.ts"
click node_node_docs "https://github.com/josueluna/linkedin_to_sheets/blob/main/privacy.html"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_node_content,node_node_profile_data toneBlue
class node_node_popup_app,node_node_main,node_node_popup,node_node_selector,node_node_background,node_node_storage,node_node_utils toneAmber
class node_node_google,node_node_sheets,node_node_drive,node_node_oauth toneMint
class node_node_manifest,node_node_vite,node_node_styles,node_node_docs toneRose
