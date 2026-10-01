import React from 'react';
import { Client } from '@notionhq/client';

export const revalidate = 0; // Disable caching so it always shows fresh Notion data

export default async function Home() {
  let placements: any[] = [];
  let errorMsg = null;

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) throw new Error("Missing Database ID");

    const response = await notion.databases.query({
      database_id: databaseId,
    });

    placements = response.results.map((page: any) => {
      const props = page.properties;
      
      // The Title property in your DB is named "Date"
      const titlePropKey = Object.keys(props).find(k => props[k].type === 'title');
      const dateTitle = titlePropKey && props[titlePropKey].title?.[0] ? props[titlePropKey].title[0].plain_text : '-';

      // Helper to safely extract select/multi-select values
      const getSelect = (prop: any) => prop?.select?.name || (prop?.multi_select?.[0]?.name) || '-';

      return {
        id: page.id,
        date: dateTitle,
        consultant: getSelect(props['Consultant Name']),
        position: getSelect(props['Position']),
        client: getSelect(props['Vendor / Client']),
        status: getSelect(props['Status']),
      };
    });

  } catch (error: any) {
    console.error("Notion API Error:", error);
    errorMsg = error.message;
  }

  return (
    <div className="min-h-screen bg-lime-50 text-slate-900 p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-5xl mx-auto flex flex-col gap-8 bg-white p-8 rounded-xl shadow-sm border border-lime-200">
        
        <header className="flex justify-between items-center border-b border-lime-100 pb-4">
          <h1 className="text-3xl font-bold text-lime-900">PlaceRover Dashboard</h1>
          <button className="bg-lime-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-lime-700 transition-colors shadow-sm">
            + Quick Add to Notion
          </button>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-lime-800">Live Interview Placements</h2>
          
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
            <div className="overflow-hidden border border-lime-200 rounded-lg shadow-sm">
              <table className="min-w-full text-left text-sm bg-white">
                <thead className="border-b border-lime-200 bg-lime-100 text-lime-900">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Consultant</th>
                    <th className="px-6 py-4 font-semibold">Position</th>
                    <th className="px-6 py-4 font-semibold">Vendor / Client</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lime-100">
                  {placements.map((row) => (
                    <tr key={row.id} className="hover:bg-lime-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{row.date}</td>
                      <td className="px-6 py-4 text-slate-700">{row.consultant}</td>
                      <td className="px-6 py-4 text-slate-700">{row.position}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{row.client}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-800 border border-lime-200">
                          {row.status}
                        </span>
                      </td>
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
