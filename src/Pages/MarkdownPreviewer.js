import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./github-markdown.css";

const API = "http://localhost:3000";

export default function MarkdownPreviewer() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [markdown, setMarkdown] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const res = await fetch(`${API}/files`);
    const data = await res.json();
    setFiles(data);
    if (data.length && !selectedFile) selectFile(data[0].name);
  };

  const selectFile = async (name) => {
    setSelectedFile(name);
    const res = await fetch(`${API}/files/${name}`);
    const text = await res.text();
    setMarkdown(text);
  };

  const deleteFile = async (name) => {
    await fetch(`${API}/files/${name}`, { method: "DELETE" });
    setSelectedFile(null);
    setMarkdown("");
    fetchFiles();
  };

  const onFileChange = (e) => {
    setError("");
    const f = e.target.files[0];
    if (!f || !f.name.endsWith(".md")) {
      setError("Only .md files are accepted.");
      return;
    }
    setFileToUpload(f);
  };

  const uploadFile = async () => {
    if (!fileToUpload) {
      setError("Please select a .md file to upload.");
      return;
    }
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", fileToUpload);
    const res = await fetch(`${API}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      setError("Upload failed.");
      setUploading(false);
      return;
    }
    setFileToUpload(null);
    await fetchFiles();
    setUploading(false);
  };

  function parseMarkdownToChunks(markdown) {
    const lines = markdown.split(/\r?\n/);
    const chunks = [];
    const references = [];
    let headings = Array(10).fill(null);
    let docId = 1;
    let chunkId = 1;
    let inTable = false;
    let tableHeaders = [];
    let tableContext = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,10})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        headings[level - 1] = `${headingMatch[1]} ${headingMatch[2]}`;
        for (let j = level; j < 10; j++) headings[j] = null;
        inTable = false;
        tableHeaders = [];
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(line)) {
        const nextLine = lines[i + 1] || "";
        if (/^\s*\|?[\s:-]+\|[\s:-|]*\|?\s*$/.test(nextLine)) {
          tableHeaders = line.replace(/^\s*\||\|\s*$/g, "").split("|").map(h => h.trim());
          tableContext = headings.filter(Boolean);
          inTable = true;
          i++;
          continue;
        }
      }

      if (inTable && /^\s*\|.*\|\s*$/.test(line)) {
        const cells = line.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => c.trim());
        while (cells.length < tableHeaders.length) cells.push("");
        if (cells.length > tableHeaders.length) cells.length = tableHeaders.length;

        let chunkLines = [...tableContext];
        for (let k = 0; k < tableHeaders.length; k++) {
          chunkLines.push(`${tableHeaders[k]}: ${cells[k]}`);
        }
        chunks.push({ docId, chunkId, content: chunkLines });

        cells.forEach(cell => {
          const linkMatches = [
            ...cell.matchAll(/\[.*?\]\((.*?)\)/g),
            ...cell.matchAll(/https?:\/\/[^\s)]+/g),
          ];
          linkMatches.forEach(match => {
            references.push({
              docId,
              chunkId,
              url: match[1] || match[0],
            });
          });
        });

        chunkId++;
        continue;
      }

      if (inTable && !/^\s*\|.*\|\s*$/.test(line)) {
        inTable = false;
        tableHeaders = [];
        tableContext = [];
      }

      if (line.trim() !== "") {
        const chunkLines = headings.filter(Boolean).concat(line.trim());
        chunks.push({ docId, chunkId, content: chunkLines });

        const linkMatches = [
          ...line.matchAll(/\[.*?\]\((.*?)\)/g),
          ...line.matchAll(/https?:\/\/[^\s)]+/g),
        ];
        linkMatches.forEach(match => {
          references.push({
            docId,
            chunkId,
            url: match[1] || match[0],
          });
        });

        chunkId++;
      }
    }

    return { chunks, references };
  }

  function ChunkedOutput({ markdown, fileName }) {
    const [parsed, setParsed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredChunkId, setHoveredChunkId] = useState(null);
    const [hoveredTableIdx, setHoveredTableIdx] = useState(null);

    useEffect(() => {
      async function fetchTableOrChunk() {
        try {
          const res = await fetch(`${API}/files/${fileName}/table`);
          const data = await res.json();
          if (data.tables && data.tables.length > 0) {
            setParsed({ type: "tables", tables: data.tables });
          } else {
            const fallback = parseMarkdownToChunks(markdown);
            setParsed({ type: "chunks", ...fallback });
          }
        } catch (err) {
          const fallback = parseMarkdownToChunks(markdown);
          setParsed({ type: "chunks", ...fallback });
        } finally {
          setLoading(false);
        }
      }

      if (markdown && fileName) {
        setParsed(null);
        setLoading(true);
        fetchTableOrChunk();
      }
    }, [markdown, fileName]);

    if (loading) return <div style={{ marginTop: 20 }}>Loading...</div>;
    if (!parsed) return null;

    if (parsed.type === "tables") {
      return (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12 }}>Extracted Tables</h2>
          {parsed.tables.map((table, tIdx) => (
            <div
              key={tIdx}
              onClick={() => setHoveredTableIdx(tIdx)}
              // onMouseLeave={() => setHoveredTableIdx(null)}
              style={{
                marginBottom: 32,
                padding: 16,
                borderRadius: 8,
                backgroundColor: hoveredTableIdx === tIdx ? "#fff176" : "white",
                transition: "background 0.2s ease-in-out",
              }}
            >
              <h4>Table {tIdx + 1}</h4>
              <table style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontFamily: 'Arial, sans-serif'
              }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '8px' }}>S.NO</th>
                    <th style={{ border: '1px solid #000', padding: '8px' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'top' }}>
                        {index + 1}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '8px', whiteSpace: 'pre-line' }}>
                        {Object.entries(row).map(([key, value]) => (
                          <div key={key}><strong>{key}:</strong> {value}</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ marginTop: 20 }}>
  <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12 }}>Chunked Output</h2>
  <div>
    <h3 style={{ fontWeight: 500, fontSize: 18 }}>Chunks:</h3>
    {parsed.chunks.map(chunk => (
      <div
        key={chunk.chunkId}
        onClick={() => setHoveredChunkId(chunk.chunkId)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          background: hoveredChunkId === chunk.chunkId ? "#fff176" : "#f9f9f9",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: "12px 18px",
          marginBottom: 16,
          transition: "background 0.2s ease-in-out",
        }}
      >
        {/* Chunk Content (Left) */}
        <div style={{ flex: 1, paddingRight: 20 }}>
          {chunk.content.map((line, idx) => {
            const headingMatch = line.match(/^(#{1,10})\s+(.*)/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const Tag = `h${level}`;
              return (
                <Tag key={idx} style={{ margin: 0, fontWeight: 600 }}>{headingMatch[2]}</Tag>
              );
            }
            if (line.includes(":")) {
              const [header, ...rest] = line.split(":");
              return (
                <div key={idx}>
                  <b>{header.trim()}:</b> {rest.join(":").trim()}
                </div>
              );
            }
            return <p key={idx} style={{ margin: 0 }}>{line}</p>;
          })}
        </div>

        {/* Chunk ID (Right) */}
        <div style={{
          fontSize: 22,
          fontWeight: "bolder",
          color: "#666",
          minWidth: 60,
          paddingTop: "35px",
          textAlign: "right"
        }}>
          {chunk.chunkId}
        </div>
      </div>
    ))}
  </div>
</div>

    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f6f8fa" }}>
      <div style={{
        minWidth: 220,
        background: "#eaecef",
        borderRight: "1px solid #d1d5da",
        display: "flex",
        flexDirection: "column",
        padding: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>Markdown Files</div>
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
          {files.map(f => (
            <div
              key={f.name}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                background: f.name === selectedFile ? "#fff" : "transparent",
                fontWeight: f.name === selectedFile ? 600 : 400,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
              onClick={() => selectFile(f.name)}
            >
              <span style={{ flex: 1 }}>{f.name}</span>
              <button
                style={{
                  marginLeft: 10,
                  background: "none",
                  border: "none",
                  color: "#ff7875",
                  fontSize: 18,
                  cursor: "pointer",
                }}
                onClick={e => { e.stopPropagation(); deleteFile(f.name); }}
                title="Delete file"
              >🗑️</button>
            </div>
          ))}
        </div>
        <div>
          <input
            type="file"
            accept=".md"
            style={{ display: "none" }}
            id="md-upload"
            onChange={onFileChange}
          />
          <label htmlFor="md-upload"
            style={{
              background: "#fff",
              border: "1px solid #0366d6",
              color: "#0366d6",
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
              marginBottom: 8,
              fontSize: 14,
              display: "inline-block",
            }}>
            {fileToUpload ? fileToUpload.name : "Choose .md file"}
          </label>
          <button
            style={{
              background: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "6px 18px",
              fontSize: 15,
              cursor: "pointer",
              marginLeft: 8,
            }}
            onClick={uploadFile}
            disabled={uploading || !fileToUpload}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          {error && <div style={{ color: "red", fontSize: 13, marginTop: 4 }}>{error}</div>}
        </div>
      </div>
      <div style={{
        flex: 1,
        padding: 40,
        overflowY: "auto",
        background: "#fff",
      }}>
        <div className="markdown-body" style={{ maxWidth: 900, margin: "0 auto" }}>
          {markdown ? (
            <div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
              </ReactMarkdown>
              <ChunkedOutput markdown={markdown} fileName={selectedFile} />
            </div>
          ) : (
            <div style={{ color: "#888" }}>Select a Markdown file to preview.</div>
          )}
        </div>
      </div>
    </div>
  );
}
