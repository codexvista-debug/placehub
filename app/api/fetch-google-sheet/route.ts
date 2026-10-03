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
    const sheetCsvUrl =
      process.env.GOOGLE_SHEET_CSV_URL ||
      'https://docs.google.com/spreadsheets/d/1nn7IPlRBzfsATildxJggKUcfuMMWcKTTW0UMPct7_-w/edit?usp=sharing';

    if (!sheetCsvUrl || !sheetCsvUrl.trim()) {
      return NextResponse.json(
        {
          configured: false,
          rows: [],
          columnHeaders: [],
          message: 'GOOGLE_SHEET_CSV_URL environment variable is not set in Vercel.',
        },
        { status: 200 }
      );
    }

    let rawUrl = sheetCsvUrl.trim();
    let gvizUrl = rawUrl;
    let exportUrl = rawUrl;

    if (rawUrl.includes('docs.google.com/spreadsheets')) {
      const match = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        const gidMatch = rawUrl.match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';

        // GViz endpoint works reliably across sharing settings
        gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }
    }

    // Try GViz endpoint first, fallback to standard export
    let res = await fetch(gvizUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!res.ok) {
      res = await fetch(exportUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          configured: true,
          error: `Google Sheets returned HTTP status ${res.status}. Please ensure the sheet sharing is set to "Anyone with the link can view".`,
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

    // Identify last non-empty header index to clean up trailing blank spreadsheet columns
    const rawHeaders = parsedData[0];
    let lastValidHeaderIndex = rawHeaders.length - 1;
    while (lastValidHeaderIndex >= 0 && (!rawHeaders[lastValidHeaderIndex] || rawHeaders[lastValidHeaderIndex].trim() === '')) {
      lastValidHeaderIndex--;
    }

    if (lastValidHeaderIndex < 0) {
      lastValidHeaderIndex = rawHeaders.length - 1;
    }

    // Clean headers up to the last non-empty column
    const columnHeaders = rawHeaders.slice(0, lastValidHeaderIndex + 1).map((h, index) => {
      const headerName = h.trim();
      // If the first header is an email or date/timestamp from form submission
      if (index === 0 && (headerName.includes('@') || !headerName)) {
        return 'Date / Email';
      }
      return headerName || `Column ${index + 1}`;
    });

    // Clean and filter rows
    const rows = parsedData.slice(1).map((rowValues, rowIndex) => {
      const rowObj: Record<string, string> = { id: `sheet-row-${rowIndex + 1}` };
      columnHeaders.forEach((header, colIndex) => {
        rowObj[header] = (rowValues[colIndex] || '').trim() || '-';
      });
      return rowObj;
    }).filter((row) => {
      // Exclude completely empty rows
      return columnHeaders.some((header) => row[header] && row[header] !== '-');
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
