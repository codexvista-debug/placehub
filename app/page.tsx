import React from 'react';
import { Client } from '@notionhq/client';
import TableClient from './components/TableClient';

export const revalidate = 0; // Disable caching so it always shows fresh Notion data

function extractPropValue(prop: any) {
  if (!prop) return '-';
  switch (prop.type) {
    case 'title':
      return prop.title?.map((t: any) => t.plain_text).join('') || '-';
    case 'rich_text':
      return prop.rich_text?.map((t: any) => t.plain_text).join('') || '-';
    case 'select':
      return prop.select?.name || '-';
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name).join(', ') || '-';
    case 'status':
      return prop.status?.name || '-';
    case 'date':
      if (!prop.date) return '-';
      return prop.date.end ? `${prop.date.start} → ${prop.date.end}` : prop.date.start;
    case 'email':
      return prop.email || '-';
    case 'phone_number':
      return prop.phone_number || '-';
    case 'number':
      return prop.number !== null && prop.number !== undefined ? String(prop.number) : '-';
    case 'url':
      return prop.url || '-';
    case 'checkbox':
      return prop.checkbox ? 'Yes' : 'No';
    default:
      return '-';
  }
}

export default async function Home() {
  let placements: any[] = [];
  let columnHeaders: string[] = [];
  let errorMsg = null;

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) throw new Error("Missing Database ID");

    // Retrieve all results using Notion pagination (up to 500 rows)
    let hasMore = true;
    let cursor: string | undefined = undefined;
    let allResults: any[] = [];

    while (hasMore && allResults.length < 500) {
      // @ts-ignore - Notion SDK v5 compatibility
      const response = await notion.dataSources.query({
        data_source_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      });

      allResults.push(...response.results);
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }

    if (allResults.length > 0) {
      const sampleProps = (allResults[0] as any).properties;
      const allPropKeys = Object.keys(sampleProps);

      // Define logical preferred column order
      const preferredOrder = [
        'Date',
        'Interview Time',
        'Consultant Name',
        'Position',
        'Vendor / Client',
        'Status',
        'Marketer',
        'Support',
        'Recruiter',
        'Recruiter Email',
        'Recruiter Phone',
        'Update'
      ];

      // Sort column headers by preferred order
      columnHeaders = allPropKeys.sort((a, b) => {
        const indexA = preferredOrder.indexOf(a);
        const indexB = preferredOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });

      placements = allResults.map((page: any) => {
        const rowData: Record<string, string> = { id: page.id };
        columnHeaders.forEach((key) => {
          rowData[key] = extractPropValue(page.properties[key]);
        });
        return rowData;
      });
    }

  } catch (error: any) {
    console.error("Notion API Error:", error);
    errorMsg = error.message;
  }

  return (
    <div className="min-h-screen bg-lime-50 text-slate-900 p-3 sm:p-6 md:p-10 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full max-w-full mx-auto flex flex-col gap-6 bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm border border-lime-200 overflow-hidden">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-lime-100 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-lime-900">PlaceRover Dashboard</h1>
            <p className="text-sm text-lime-700 mt-1">Live synchronized Notion Database table</p>
          </div>
          <button className="bg-lime-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-lime-700 transition-colors shadow-sm self-stretch sm:self-auto text-center">
            + Quick Add to Notion
          </button>
        </header>

        <section className="w-full overflow-hidden">
          {errorMsg ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
              <p className="font-bold">Error connecting to Notion:</p>
              <p>{errorMsg}</p>
            </div>
          ) : placements.length === 0 ? (
            <div className="bg-amber-50 text-amber-700 p-4 rounded-md border border-amber-200">
              Your Notion database is connected, but no rows were found.
            </div>
          ) : (
            <TableClient placements={placements} columnHeaders={columnHeaders} />
          )}
        </section>

      </main>
    </div>
  );
}
