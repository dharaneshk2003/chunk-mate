# Markdown Table & Chunk Extractor

This project is a full-stack web application that allows users to upload `.md` (Markdown) files and visually extract:

- 📋 **Tables** (in JSON-like format)
- 🧩 **Paragraph Chunks** (with heading context)
- 🔁 Interact with both using buttons to toggle visibility and highlight selection

## Features

✅ Upload `.md` files  
✅ Extract Markdown tables and display as interactive JSON tables  
✅ Parse non-table paragraphs into contextual "chunks"  
✅ Toggle visibility of each chunk or table  
✅ Highlight selected blocks on button click  
✅ Displays original Markdown content with GitHub-like styling

---

## 🏗️ Project Structure

-frontend/
-├── public/
-├── backend/
-│ ├── index.js # Node.js Express server
-│ └── uploads/ # Folder for uploaded Markdown files
-├── src/
-│ ├── App.js # Entry React component
-│ ├── Pages/
-│ │ ├── MarkdownPreviewer.jsx # Main UI and logic
-│ │ ├── ChunkedOutput.js # Chunk/table rendering logic
-│ │ └── github-markdown.css # GitHub-style markdown styling
-└── README.md


---

## 🔧 Technologies Used

- ⚛️ React
- 🖋️ React-Markdown + remark-gfm
- 🗂️ Express.js (Node.js)
- 📄 Multer for file upload
- 🎨 CSS-in-JS styling
- 🔄 RESTful API integration

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/dharaneshk2003/chunk-mate/
cd chunk-mate

cd backend
npm install
node server.js

Server runs at: http://localhost:3000


npm install
npm start

Client runs at: http://localhost:3001 or similar

## Example Table

| Name     | Age | City         |
|----------|-----|--------------|
| Alice    | 30  | New York     |
| Bob      | 25  | San Francisco |

## Features

Feature: Login  
Description: Auth with UI  
Status: Done




