/* Tiny XLSX writer (Office Open XML spreadsheet) for the exports of tab "Pflege": no dependency, ZIP without compression
   (STORE), inline strings, never formulas (so no formula injection, unlike CSV). Opens in Excel (Windows/Mac), Numbers,
   LibreOffice and Google Sheets.
   xlsx(sheets, opts) → Blob. sheets: [{ name, tab?, title?, sub?, cols: [{ head, type?, min?, max? }], rows: [[cell]] }]
     tab: "RRGGBB" sheet tab colour; title/sub: rows above the table (title bold, sub grey); the header row is frozen,
     gets an autofilter, is repeated on every printed page; col type "s" text (default; ISBN and numbers stay text,
     Excel's "number stored as text" hint is switched off), "n" number, "d" date from "YYYY-MM-DD".
     cell: value, or { v, fill: "RRGGBB", link: "<sheet name>", bold: true }.
   opts: { date: "dd.mm.yyyy", footer: "text left in the printed footer", title: document title } */

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.";
const TEXT = "333333", MUTED = "6E6967", HEAD_FILL = "DAE4E8", HEAD_LINE = "BA8EA7"; // anthracite, muted, blue tint, mauve

// XML text: escaped, without control characters XML 1.0 forbids
const esc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = i => { let s = ""; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
const quote = name => "'" + name.replace(/'/g, "''") + "'";
// Days since 1899-12-30 (Excel's date serial), null if not an ISO date
const serial = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? (Date.UTC(+m[1], m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5 : null; };

// Sheet names: at most 31 characters, none of []:*?/\, not starting or ending with ', unique regardless of case
export function sheetNames(names) {
  const seen = new Set();
  return names.map(n => {
    let base = String(n || "-").replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "") || "-";
    if (base.length > 31) { const s = base.slice(0, 30), i = s.lastIndexOf(" "); base = (i > 15 ? s.slice(0, i) : s).trim() + "…"; } // at a word end
    let name = base;
    for (let i = 2; seen.has(name.toLowerCase()); i++) name = base.slice(0, 31 - String(i).length - 1).trim() + " " + i;
    seen.add(name.toLowerCase());
    return name;
  });
}

// Cell formats, collected while writing: font (0 normal, 1 bold, 2 title, 3 grey), fill colour, border (1 = header line), number format
function Styles(dateFmt) {
  const fills = [], xfs = [[0, 0, 0, 0]], index = new Map([["0|0|0|0", 0]]);
  return {
    id(font = 0, fill = "", border = 0, fmt = 0) {
      let f = 0;
      if (fill) { f = fills.indexOf(fill); if (f < 0) f = fills.push(fill) - 1; f += 2; }
      const key = [font, f, border, fmt].join("|");
      if (!index.has(key)) index.set(key, xfs.push([font, f, border, fmt]) - 1);
      return index.get(key);
    },
    xml() {
      const font = (b, sz, color) => `<font>${b ? "<b/>" : ""}<sz val="${sz}"/><color rgb="FF${color}"/><name val="Fira Sans"/><family val="2"/></font>`;
      const fill = c => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`;
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="${MAIN}">`
        + `<numFmts count="1"><numFmt numFmtId="164" formatCode="${esc(dateFmt)}"/></numFmts>`
        + `<fonts count="4">${font(0, 11, TEXT)}${font(1, 11, TEXT)}${font(1, 14, TEXT)}${font(0, 10, MUTED)}</fonts>`
        + `<fills count="${fills.length + 2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fills.map(fill).join("")}</fills>`
        + `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>`
        + `<border><left/><right/><top/><bottom style="medium"><color rgb="FF${HEAD_LINE}"/></bottom><diagonal/></border></borders>`
        + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
        + `<cellXfs count="${xfs.length}">${xfs.map(([fo, fi, bo, fm]) => `<xf numFmtId="${fm ? 164 : 0}" fontId="${fo}" fillId="${fi}" borderId="${bo}" xfId="0"`
          + ` applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>`).join("")}</cellXfs>`
        + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0"/></styleSheet>`;
    },
  };
}

function sheetXml(sh, name, n, st, opts, defined) {
  const cols = sh.cols, last = colName(Math.max(cols.length, 1) - 1);
  const top = (sh.title ? 1 : 0) + (sh.sub ? 1 : 0), head = top + (top ? 2 : 1); // a blank row between title and table
  const lastRow = head + sh.rows.length;
  const links = [];
  const text = (ref, v, s) => {
    const str = String(v);
    return `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ""}><is><t${/^\s|\s$/.test(str) ? ' xml:space="preserve"' : ""}>${esc(str)}</t></is></c>`;
  };
  const cell = (ref, raw, type) => {
    const o = raw !== null && typeof raw === "object" ? raw : { v: raw };
    const v = o.v;
    let s = o.fill || o.bold ? st.id(o.bold ? 1 : 0, o.fill || "") : 0;
    if (o.link) links.push(`<hyperlink ref="${ref}" location="${esc(quote(o.link) + "!A1")}" display="${esc(String(v == null ? "" : v))}"/>`);
    if (v == null || v === "") return s ? `<c r="${ref}" s="${s}"/>` : "";
    if (type === "n" && typeof v !== "boolean" && String(v).trim() !== "" && isFinite(Number(v))) return `<c r="${ref}"${s ? ` s="${s}"` : ""}><v>${Number(v)}</v></c>`;
    if (type === "d" && serial(v) != null) return `<c r="${ref}" s="${st.id(o.bold ? 1 : 0, o.fill || "", 0, 1)}"><v>${serial(v)}</v></c>`;
    return text(ref, v, s);
  };
  // Column widths from the content (characters), capped
  const widths = cols.map((c, i) => {
    let w = String(c.head || "").length + 3; // room for the filter button
    for (const r of sh.rows) {
      const raw = r[i], v = raw !== null && typeof raw === "object" ? raw.v : raw;
      const len = c.type === "d" && serial(v) != null ? 10 : String(v == null ? "" : v).length;
      if (len > w) w = len;
    }
    return Math.min(c.max || 60, Math.max(c.min || 5, w + 1.5));
  });
  const rows = [];
  if (sh.title) rows.push(`<row r="1" ht="24" customHeight="1">${text("A1", sh.title, st.id(2))}</row>`);
  if (sh.sub) rows.push(`<row r="${top}">${text("A" + top, sh.sub, st.id(3))}</row>`);
  const hs = st.id(1, HEAD_FILL, 1);
  rows.push(`<row r="${head}" ht="20" customHeight="1">${cols.map((c, i) => (c.head ? text(colName(i) + head, c.head, hs) : `<c r="${colName(i) + head}" s="${hs}"/>`)).join("")}</row>`);
  sh.rows.forEach((r, j) => {
    const rn = head + 1 + j;
    rows.push(`<row r="${rn}">${cols.map((c, i) => cell(colName(i) + rn, r[i], c.type)).join("")}</row>`);
  });
  const range = `$A$${head}:$${last}$${Math.max(lastRow, head + 1)}`;
  if (sh.rows.length) defined.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${n}" hidden="1">${esc(quote(name))}!${range}</definedName>`);
  defined.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${n}">${esc(quote(name))}!$${head}:$${head}</definedName>`);
  const footer = "&L&9" + String(opts.footer || "").replace(/&/g, "&&") + "&R&9&P / &N";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="${MAIN}" xmlns:r="${REL}">`
    + `<sheetPr>${sh.tab ? `<tabColor rgb="FF${sh.tab}"/>` : ""}<pageSetUpPr fitToPage="1"/></sheetPr>`
    + `<dimension ref="A1:${last}${Math.max(lastRow, head)}"/>`
    + `<sheetViews><sheetView workbookViewId="0"${n === 0 ? ' tabSelected="1"' : ""}>`
    + `<pane ySplit="${head}" topLeftCell="A${head + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${head + 1}" sqref="A${head + 1}"/></sheetView></sheetViews>`
    + `<sheetFormatPr defaultRowHeight="15"/>`
    + `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w.toFixed(1)}" customWidth="1"/>`).join("")}</cols>`
    + `<sheetData>${rows.join("")}</sheetData>`
    + (sh.rows.length ? `<autoFilter ref="A${head}:${last}${lastRow}"/>` : "")
    + (links.length ? `<hyperlinks>${links.join("")}</hyperlinks>` : "")
    + `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.7" header="0.3" footer="0.3"/>`
    + `<pageSetup paperSize="9" orientation="${cols.length > 6 ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>`
    + `<headerFooter><oddFooter>${esc(footer)}</oddFooter></headerFooter>`
    + `<ignoredErrors><ignoredError sqref="A1:${last}${Math.max(lastRow, head)}" numberStoredAsText="1"/></ignoredErrors>`
    + `</worksheet>`;
}

export function xlsx(sheets, opts = {}) {
  const st = Styles(opts.date || "dd.mm.yyyy");
  const names = sheetNames(sheets.map(s => s.name));
  const defined = [];
  const parts = sheets.map((sh, n) => [`xl/worksheets/sheet${n + 1}.xml`, sheetXml(sh, names[n], n, st, opts, defined)]);
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const files = [
    ["[Content_Types].xml", xml + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
      + `<Override PartName="/xl/workbook.xml" ContentType="${CT}sheet.main+xml"/>`
      + sheets.map((s, n) => `<Override PartName="/xl/worksheets/sheet${n + 1}.xml" ContentType="${CT}worksheet+xml"/>`).join("")
      + `<Override PartName="/xl/styles.xml" ContentType="${CT}styles+xml"/>`
      + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
    ["_rels/.rels", xml + `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/>`
      + `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
    ["docProps/core.xml", xml + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"`
      + ` xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title || "")}</dc:title><dc:creator>Bibliothek DSM</dc:creator>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`],
    ["xl/workbook.xml", xml + `<workbook xmlns="${MAIN}" xmlns:r="${REL}"><bookViews><workbookView activeTab="0"/></bookViews>`
      + `<sheets>${names.map((nm, n) => `<sheet name="${esc(nm)}" sheetId="${n + 1}" r:id="rId${n + 1}"/>`).join("")}</sheets>`
      + (defined.length ? `<definedNames>${defined.join("")}</definedNames>` : "") + `</workbook>`],
    ["xl/_rels/workbook.xml.rels", xml + `<Relationships xmlns="${PKG}">`
      + sheets.map((s, n) => `<Relationship Id="rId${n + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${n + 1}.xml"/>`).join("")
      + `<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`],
  ].concat(parts, [["xl/styles.xml", st.xml()]]); // styles last: the sheets register their formats while being written
  return new Blob([zip(files)], { type: CT + "sheet" });
}

// ZIP without compression (STORE): local headers with sizes and CRC, central directory, end record
let table = null;
function crc32(b) {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = table[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
export function zip(files) {
  const enc = new TextEncoder(), d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const chunks = [], central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nb = enc.encode(name), data = typeof content === "string" ? enc.encode(content) : content, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true);
    c.setUint32(42, offset, true);
    chunks.push(new Uint8Array(h.buffer), nb, data);
    central.push(new Uint8Array(c.buffer), nb);
    offset += 30 + nb.length + data.length;
  }
  const size = central.reduce((s, x) => s + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, size, true); e.setUint32(16, offset, true);
  const all = chunks.concat(central, [new Uint8Array(e.buffer)]);
  const out = new Uint8Array(all.reduce((s, x) => s + x.length, 0));
  let p = 0;
  for (const x of all) { out.set(x, p); p += x.length; }
  return out;
}
