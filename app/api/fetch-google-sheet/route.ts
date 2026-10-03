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
    while (
      lastValidHeaderIndex >= 0 &&
      (!rawHeaders[lastValidHeaderIndex] || rawHeaders[lastValidHeaderIndex].trim() === '')
    ) {
      lastValidHeaderIndex--;
    }

    if (lastValidHeaderIndex < 0) {
      lastValidHeaderIndex = rawHeaders.length - 1;
    }

    // Clean headers: Column 1 is named "Date", others keep their clean names
    const columnHeaders = rawHeaders.slice(0, lastValidHeaderIndex + 1).map((h, index) => {
      if (index === 0) return 'Date';
      return h.trim() || `Column ${index + 1}`;
    });

    // Clean, validate, and filter out empty rows & day/date divider rows
    const validRows: Record<string, string>[] = [];

    parsedData.slice(1).forEach((rowValues) => {
      const rowObj: Record<string, string> = {};
      columnHeaders.forEach((header, colIndex) => {
        rowObj[header] = (rowValues[colIndex] || '').trim();
      });

      const marketer = rowObj['Marketer Name'] || '';
      const consultant = rowObj['Consultant Name'] || '';
      const position = rowObj['Position'] || '';
      const client = rowObj['Client'] || '';
      const date = rowObj['Date'] || '';

      // Ignore if all main submission data fields are empty (blank rows or divider rows)
      if (!marketer && !consultant && !position && !client) {
        return;
      }

      // Ignore day/date divider rows (e.g. "Thu, 16 July 2026", "Fri, 17 July 2026", "Mon, 20 July 2026")
      if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(date) && (!consultant || !position)) {
        return;
      }

      // Format empty cells as '-' for clean table presentation
      columnHeaders.forEach((header) => {
        if (!rowObj[header]) {
          rowObj[header] = '-';
        }
      });

      rowObj.id = `sheet-row-${validRows.length + 1}`;
      validRows.push(rowObj);
    });

    return NextResponse.json({
      configured: true,
      columnHeaders,
      rows: validRows,
      totalRows: validRows.length,
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
