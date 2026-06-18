import * as XLSX from "xlsx";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JSZip = require("jszip") as { loadAsync: (data: Buffer | ArrayBuffer | Uint8Array | string) => Promise<any> };
import { uploadToCloudinary } from "../cloudinary";
import {
  cleanKey,
  stripLaoVowels,
  CLEANED_ALIASES,
  STRIPPED_ALIASES,
  suggestColumn,
  parseRow,
} from "./importParser";

/* ── Extract embedded cell images from XLSX → Map<dataRowIndex, CloudinaryUrl> ──
   sheetHeaderRow / sheetPhotoCol are the ACTUAL 0-based sheet coordinates
   (not array indices), so they match the values in drawing XML. ── */
export async function extractCellImages(
  buffer: Buffer,
  sheetHeaderRow: number,   // actual 0-based sheet row of the header (-1 if none)
  sheetPhotoCol: number     // actual 0-based sheet column of the photo column
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const allFiles = Object.keys(zip.files);

    /* Build relMap for a drawing: rId → media zip path */
    const buildRelMap = async (drawingPath: string): Promise<Map<string, string>> => {
      /* rels file is always in _rels/ sub-folder beside the drawing */
      const base     = drawingPath.replace(/\/([^/]+)$/, "/_rels/$1");
      const relsPath = base + ".rels";
      const relsEntry = zip.file(relsPath);
      if (!relsEntry) return new Map();
      const xml = await relsEntry.async("text");
      const map = new Map<string, string>();
      for (const m of xml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
        let t = m[2];
        if (t.startsWith("../")) {
          /* ../media/image1.png → xl/media/image1.png */
          const base2 = drawingPath.replace(/\/[^/]+$/, "");  // xl/drawings
          t = base2 + "/" + t;                                 // xl/drawings/../media/image1.png
          /* collapse ./ and ../ segments */
          const parts = t.split("/");
          const out: string[] = [];
          for (const p of parts) {
            if (p === "..") out.pop(); else if (p !== ".") out.push(p);
          }
          t = out.join("/");
        } else if (!t.startsWith("xl/") && !t.startsWith("http")) {
          t = "xl/drawings/" + t;
        }
        map.set(m[1], t);
      }
      return map;
    };

    /* Upload one image buffer to Cloudinary, return URL */
    const uploadImg = async (embedId: string, relMap: Map<string, string>): Promise<string | null> => {
      const p = relMap.get(embedId);
      if (!p) return null;
      /* try exact path, then case-insensitive search */
      const f = zip.file(p) || zip.file(allFiles.find(a => a.toLowerCase() === p.toLowerCase()) || "");
      if (!f) return null;
      return uploadToCloudinary(await f.async("nodebuffer"));
    };

    /* Case-insensitive drawing path search */
    const drawingPaths = allFiles.filter(f => /xl\/drawings\/drawing\d+\.xml$/i.test(f));

    for (const drawingPath of drawingPaths) {
      const drawingEntry = zip.file(drawingPath);
      if (!drawingEntry) continue;
      const xml = await drawingEntry.async("text");
      const relMap = await buildRelMap(drawingPath);

      /* ── 1. twoCellAnchor / oneCellAnchor (Excel, LibreOffice, most Google Sheets) ──
         Collect ALL images per row, then pick the one closest to sheetPhotoCol.
         This removes the strict ±1 column filter that could miss offset images. ── */
      const rowCandidates = new Map<number, Array<{col: number, embedId: string}>>();

      const anchorRe = /<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/g;
      for (const m of xml.matchAll(anchorRe)) {
        const body = m[1];
        const colM  = body.match(/<(?:xdr:)?col>(\d+)<\/(?:xdr:)?col>/);
        const rowM  = body.match(/<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/);
        /* accept both r:embed and xdr:blip r:embed */
        const embM  = body.match(/r:embed="([^"]+)"/);
        if (!rowM || !embM) continue;

        const col = colM ? parseInt(colM[1]) : sheetPhotoCol;
        const row = parseInt(rowM[1]);

        if (row <= sheetHeaderRow) continue;

        if (!rowCandidates.has(row)) rowCandidates.set(row, []);
        rowCandidates.get(row)!.push({ col, embedId: embM[1] });
      }

      /* For each data row, upload the image closest to the photo column */
      for (const [row, candidates] of rowCandidates) {
        const best = candidates.slice().sort(
          (a, b) => Math.abs(a.col - sheetPhotoCol) - Math.abs(b.col - sheetPhotoCol)
        )[0];
        const url = await uploadImg(best.embedId, relMap);
        if (!url) continue;
        const dataRowIdx = row - sheetHeaderRow - 1;
        if (dataRowIdx >= 0) result.set(dataRowIdx, url);
      }

      /* ── 2. absoluteAnchor (Google Sheets in-cell / absolute-positioned images) ──
         No col/row tags; images appear in order top-to-bottom.
         Map each absolute anchor to data rows sequentially. ── */
      if (result.size === 0) {
        const absRe = /<(?:xdr:)?absoluteAnchor[^>]*>([\s\S]*?)<\/(?:xdr:)?absoluteAnchor>/g;
        const absAnchors: string[] = [];
        for (const m of xml.matchAll(absRe)) absAnchors.push(m[1]);

        if (absAnchors.length > 0) {
          /* Sort by top (y) position so we can assign to rows in order */
          const withPos = absAnchors
            .map(body => {
              const yM = body.match(/<(?:xdr:)?y>(\d+)<\/(?:xdr:)?y>/);
              const eM = body.match(/r:embed="([^"]+)"/);
              return { body, y: yM ? parseInt(yM[1]) : 0, embedId: eM?.[1] };
            })
            .filter(a => a.embedId)
            .sort((a, b) => a.y - b.y);

          for (let i = 0; i < withPos.length; i++) {
            const url = await uploadImg(withPos[i].embedId!, relMap);
            if (url) result.set(i, url);
          }
        }
      }
    }
  } catch (err) {
    console.error("[IMG] extractCellImages error:", err);
  }
  return result;
}

/* ── Shared: parse an XLSX/CSV buffer → preview payload ── */
export async function processXlsxPreview(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const allArrays = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  if (allArrays.length === 0) throw new Error("ໄຟລ໌ຫວ່າງ — ບໍ່ມີຂໍ້ມູນ");

  let headerRowIdx = -1, bestCount = 0;
  for (let i = 0; i < Math.min(15, allArrays.length); i++) {
    const count = (allArrays[i] as any[]).filter((c: any) => {
      const ck = cleanKey(String(c));
      return (ck in CLEANED_ALIASES) || (stripLaoVowels(ck) in STRIPPED_ALIASES);
    }).length;
    if (count > bestCount) { bestCount = count; headerRowIdx = i; }
  }

  const headerFound = headerRowIdx >= 0 && bestCount >= 2;
  let rawHeaders: string[], dataRows: Record<string, any>[], noHeader = false;

  if (headerFound) {
    rawHeaders = (allArrays[headerRowIdx] as any[]).map((c: any) => String(c));
    const arrays = allArrays.slice(headerRowIdx + 1)
      .filter((row: any[]) => row.some((c: any) => String(c ?? "").trim() !== ""));
    dataRows = arrays.map((rowArr: any[]) => {
      const obj: Record<string, any> = {};
      rawHeaders.forEach((h, i) => { obj[h] = rowArr[i] ?? ""; });
      return obj;
    });
  } else {
    noHeader = true;
    rawHeaders = (allArrays[0] as any[]).map((c: any) => String(c));
    const arrays = allArrays.filter((row: any[]) =>
      row.some((c: any) => String(c ?? "").trim() !== "")
    );
    dataRows = arrays.map((rowArr: any[]) => {
      const obj: Record<string, any> = {};
      rawHeaders.forEach((h, i) => { obj[h] = rowArr[i] ?? ""; });
      return obj;
    });
  }

  if (dataRows.length === 0) throw new Error("ໄຟລ໌ຫວ່າງ — ບໍ່ມີຂໍ້ມູນ");

  const detectedMap: Record<string, string> = {};
  for (const h of rawHeaders) {
    const ck = cleanKey(h);
    if (ck in CLEANED_ALIASES) detectedMap[h] = CLEANED_ALIASES[ck];
    else { const sk = stripLaoVowels(ck); if (sk in STRIPPED_ALIASES) detectedMap[h] = STRIPPED_ALIASES[sk]; }
  }

  const columnSuggestions: Record<string, string> = {};
  for (const h of rawHeaders) {
    if (!(h in detectedMap)) { const s = suggestColumn(h); if (s) columnSuggestions[h] = s; }
  }

  const parsed = dataRows.map((r, i) => parseRow(r, i));

  /* ── Extract embedded cell images from XLSX → override photo field ── */
  const photoHeader = rawHeaders.find(h => {
    const ck = cleanKey(h);
    return CLEANED_ALIASES[ck] === "photo" || STRIPPED_ALIASES[stripLaoVowels(ck)] === "photo";
  });
  if (photoHeader) {
    /* Convert array indices → actual 0-based SHEET coordinates so they
       match the col/row values inside drawing XML. */
    const sheetRange  = XLSX.utils.decode_range(ws["!ref"] || "A1");
    const sheetStartC = sheetRange.s.c;  // e.g. 0 for col A, 1 for col B
    const sheetStartR = sheetRange.s.r;  // e.g. 0 if sheet starts at row 1

    const photoColIdx     = rawHeaders.indexOf(photoHeader);
    const sheetPhotoCol   = sheetStartC + photoColIdx;
    const sheetHeaderRow  = headerFound ? sheetStartR + headerRowIdx : -1;

    const cellImages = await extractCellImages(buffer, sheetHeaderRow, sheetPhotoCol);
    cellImages.forEach((url, dataRowIdx) => {
      if (parsed[dataRowIdx]) parsed[dataRowIdx].photo = url;
    });
  }

  const valid   = parsed.filter(r => !r.error).length;
  const invalid = parsed.filter(r => r.error).length;

  return {
    total: parsed.length, valid, invalid, rows: parsed,
    columns_found:      rawHeaders,
    columns_mapped:     detectedMap,
    column_suggestions: columnSuggestions,
    has_firstname:      Object.values(detectedMap).includes("firstname"),
    no_header:          noHeader,
    header_row_at:      headerFound ? headerRowIdx + 1 : null,
  };
}
