import { useEffect, useState } from "react";
import { fetchSpreadsheets, fetchSheets, Spreadsheet } from "../lib/google";
import { saveSelection } from "../lib/storage";

interface Props {
  onDone: () => void;
}

export default function SpreadsheetSelector({ onDone }: Props) {
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [filtered, setFiltered] = useState<Spreadsheet[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<Spreadsheet | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSpreadsheets();
  }, []);

  async function loadSpreadsheets() {
    setLoading(true);
    const files = await fetchSpreadsheets();
    setSpreadsheets(files);
    setFiltered(files);
    setLoading(false);
  }

  function handleSearch(value: string) {
    setSearch(value);
    const f = spreadsheets.filter((s) =>
      s.name.toLowerCase().includes(value.toLowerCase())
    );
    setFiltered(f);
  }

  async function handleSelectFile(file: Spreadsheet) {
    setSelectedFile(file);
    const sheetNames = await fetchSheets(file.id);
    setSheets(sheetNames);
  }

  async function handleSelectSheet(sheetName: string) {
    if (!selectedFile) return;

    await saveSelection({
      id: selectedFile.id,
      name: selectedFile.name,
      sheetName,
    });

    onDone();
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Cargando spreadsheets...</div>;
  }

  if (!selectedFile) {
    return (
      <div style={{ padding: 16 }}>
        <h3>Selecciona un spreadsheet</h3>

        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {filtered.map((file) => (
            <div
              key={file.id}
              onClick={() => handleSelectFile(file)}
              style={{
                padding: 8,
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {file.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>{selectedFile.name}</h3>
      <p>Selecciona una hoja</p>

      {sheets.map((sheet) => (
        <div
          key={sheet}
          onClick={() => handleSelectSheet(sheet)}
          style={{
            padding: 8,
            cursor: "pointer",
            borderBottom: "1px solid #eee",
          }}
        >
          {sheet}
        </div>
      ))}
    </div>
  );
}