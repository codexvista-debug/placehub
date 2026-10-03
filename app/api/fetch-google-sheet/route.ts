import { NextResponse } from 'next/server';

// Robust CSV Line Parser that handles quoted commas, newlines, and escaped quotes
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \r\n
      }
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

export async function GET() {
  try {
    const sheetCsvUrl = process.env.GOOGLE_SHEET_CSV_URL;

    if (!sheetCsvUrl || !sheetCsvUrl.trim()) {
      return NextResponse.json(
        {
          configured: false,
          rows: [],
          columnHeaders: [],
          message:
            'GOOGLE_SHEET_CSV_URL environment variable is not set in Vercel.',
        },
        { status: 200 }
      );
    }

    // Convert standard Google Sheet sharing links to export=csv link if necessary
    let exportUrl = sheetCsvUrl.trim();
    if (exportUrl.includes('docs.google.com/spreadsheets')) {
      const match = exportUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        const gidMatch = exportUrl.match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }
    }

    // Fetch live CSV data from Google Sheets
    const res = await fetch(exportUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          configured: true,
          error: `Google Sheets returned HTTP status ${res.status}. If the sheet is restricted, ensure your Google Sheet or Google Service Account permissions allow access.`,
          rows: [],
          columnHeaders: [],
        },
        { status: 200 }
      );
    }

    const csvText = await res.text();
    const parsedData = parseCSV(csvText);

    if (parsedData.length === 0) {
      return NextResponse.json({
        configured: true,
        rows: [],
        columnHeaders: [],
        message: 'The Google Sheet appears to be empty.',
      });
    }

    const columnHeaders = parsedData[0].map((h, index) => h || `Column ${index + 1}`);
    const rows = parsedData.slice(1).map((rowValues, rowIndex) => {
      const rowObj: Record<string, string> = { id: `sheet-row-${rowIndex + 1}` };
      columnHeaders.forEach((header, colIndex) => {
        rowObj[header] = rowValues[colIndex] || '-';
      });
      return rowObj;
    });

    return NextResponse.json({
      configured: true,
      columnHeaders,
      rows,
      totalRows: rows.length,
      lastSynced: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching Google Sheets submissions:', error);
    return NextResponse.json(
      {
        configured: true,
        error: error.message || 'Failed to fetch Google Sheet data',
        rows: [],
        columnHeaders: [],
      },
      { status: 500 }
    );
  }
}
