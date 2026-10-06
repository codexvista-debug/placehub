import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const maxLimit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : 500;

    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) throw new Error("Missing Database ID");

    let hasMore = true;
    let cursor: string | undefined = undefined;
    let allResults: any[] = [];

    while (hasMore && allResults.length < maxLimit) {
      const pageSize = Math.min(maxLimit - allResults.length, 100);
      // @ts-ignore - Notion SDK v5 compatibility
      const response = await notion.dataSources.query({
        data_source_id: databaseId,
        start_cursor: cursor,
        page_size: pageSize,
      });

      allResults.push(...response.results);
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }

    let columnHeaders: string[] = [];
    let placements: any[] = [];

    if (allResults.length > 0) {
      const sampleProps = (allResults[0] as any).properties;
      const allPropKeys = Object.keys(sampleProps);

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

    return NextResponse.json(
      { placements, columnHeaders },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
