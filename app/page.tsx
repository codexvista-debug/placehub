import React from 'react';
import { Client } from '@notionhq/client';

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

    // @ts-ignore - Notion SDK v5 compatibility
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
    });

    if (response.results.length > 0) {
      const sampleProps = (response.results[0] as any).properties;
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

      // Sort column headers by preferred order, putting any extra columns at the end
      columnHeaders = allPropKeys.sort((a, b) => {
        const indexA = preferredOrder.indexOf(a);
        const indexB = preferredOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });

      placements = response.results.map((page: any) => {
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
    <div className="min-h-screen bg-lime-50 text-slate-900 p-4 sm:p-8 md:p-12 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-[98%] mx-auto flex flex-col gap-6 bg-white p-4 sm:p-8 rounded-xl shadow-sm border border-lime-200">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-lime-100 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-lime-900">PlaceRover Dashboard</h1>
            <p className="text-sm text-lime-700 mt-1">Live synchronized Notion Database table</p>
          </div>
          <button className="bg-lime-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-lime-700 transition-colors shadow-sm self-stretch sm:self-auto text-center">
            + Quick Add to Notion
          </button>
        </header>

        <section>
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
            <div className="w-full overflow-x-auto border border-lime-300 rounded-lg shadow-sm">
              <table className="min-w-full text-left text-xs sm:text-sm bg-white border-collapse">
                <thead className="bg-lime-100 text-lime-950 font-semibold border-b border-lime-300">
                  <tr>
                    {columnHeaders.map((header) => (
                      <th 
                        key={header} 
                        className="px-4 py-3 border-r border-lime-300 last:border-r-0 whitespace-nowrap bg-lime-100"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-lime-200">
                  {placements.map((row) => (
                    <tr key={row.id} className="hover:bg-lime-50/70 transition-colors">
                      {columnHeaders.map((header) => {
                        const val = row[header];
                        const isStatus = header.toLowerCase() === 'status';

                        return (
                          <td 
                            key={header} 
                            className="px-4 py-3 border-r border-lime-200 last:border-r-0 text-slate-700 max-w-xs truncate"
                          >
                            {isStatus && val !== '-' ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-100 text-lime-900 border border-lime-300">
                                {val}
                              </span>
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
