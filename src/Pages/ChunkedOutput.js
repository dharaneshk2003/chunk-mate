import React, { useEffect, useState } from "react";

function parseMarkdownContent(markdown) {
  const lines = markdown.split(/\r?\n/);
  const chunks = [];
  const references = [];
  let headings = Array(10).fill(null);
  let chunkId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,10})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      headings[level - 1] = `${headingMatch[1]} ${headingMatch[2]}`;
      for (let j = level; j < 10; j++) headings[j] = null;
      continue;
    }
    if (line.trim() !== "") {
      const chunkLines = headings.filter(Boolean).concat(line.trim());
      chunks.push({ chunkId, content: chunkLines });

      const linkMatches = [
        ...line.matchAll(/\[.*?\]\((.*?)\)/g),
        ...line.matchAll(/https?:\/\/[^\s)]+/g),
      ];
      linkMatches.forEach(match => {
        references.push({
          chunkId,
          url: match[1] || match[0],
        });
      });

      chunkId++;
    }
  }

  return { type: "chunks", chunks, references };
}

function ChunkedOutput({ markdown, fileName }) {
  const [tables, setTables] = useState(null);
  const [fallbackChunks, setFallbackChunks] = useState(null);
  const [hoveredChunkId, setHoveredChunkId] = useState(null);

  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch(`http://localhost:3000/files/${fileName}/table`);
        const data = await res.json();
        if (data.tables && data.tables.length > 0) {
          setTables(data.tables);
        } else {
          const parsed = parseMarkdownContent(markdown);
          setFallbackChunks(parsed);
        }
      } catch (err) {
        console.error("Failed to fetch tables:", err);
        const parsed = parseMarkdownContent(markdown);
        setFallbackChunks(parsed);
      }
    }

    fetchTables();
  }, [fileName, markdown]);

  if (tables) {
    return (
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12 }}>Extracted Tables</h2>
        {tables.map((table, tIdx) => (
          <div key={tIdx} style={{ marginBottom: 32 }}>
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

  if (fallbackChunks) {
    return (
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 12 }}>Chunked Output</h2>
        <div>
          <h3 style={{ fontWeight: 500, fontSize: 18 }}>Chunks:</h3>
          {fallbackChunks.chunks.map(chunk => (
            <div
              key={chunk.chunkId}
              style={{
                background: hoveredChunkId === chunk.chunkId ? "#fff176" : "#f9f9f9", // yellow on hover
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "12px 18px",
                marginBottom: 16,
                transition: "background 0.2s ease-in-out",
              }}
              // onMouseEnter={() => setHoveredChunkId(chunk.chunkId)}
              onClick={() => setHoveredChunkId(null)}
            >
              <div style={{ fontSize: 13, color: "#888", marginBottom: 4,marginLeft: 10 }}>
                {chunk.chunkId}
              </div>
              {chunk.content.map((line, idx) => {
                const headingMatch = line.match(/^(#{1,10})\s+(.*)/);
                if (headingMatch) {
                  const level = headingMatch[1].length;
                  const Tag = `h${level}`;
                  return (
                    <Tag key={idx} style={{ margin: 0, fontWeight: 600 }}>
                      {headingMatch[2]}
                    </Tag>
                  );
                }
                return <p key={idx} style={{ margin: 0 }}>{line}</p>;
              })}
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontWeight: 500, fontSize: 18, marginTop: 24 }}>References:</h3>
          {fallbackChunks.references.length > 0 ? (
            <ul>
              {fallbackChunks.references.map((ref, idx) => (
                <li key={idx}>
                  Chunk {ref.chunkId}:{" "}
                  <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.url}</a>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "#888" }}>No references found.</div>
          )}
        </div>
      </div>
    );
  }

  return <p>Loading...</p>;
}

export default ChunkedOutput;
