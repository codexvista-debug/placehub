import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DESI_DATA_SOURCE_ID = process.env.NOTION_DESI_VENDOR_DATABASE_ID || 'a93c477f-bdd8-8317-8801-0778a70d9199';
const PV_DATA_SOURCE_ID = process.env.NOTION_PV_VENDOR_DATABASE_ID || '314c477f-bdd8-82d2-9052-07b5410c4f98';

function extractPropValue(prop: any): string {
  if (!prop) return '-';
  switch (prop.type) {
    case 'title':
      return prop.title?.map((t: any) => t.plain_text).join('') || '-';
    case 'rich_text':
      return prop.rich_text?.map((t: any) => t.plain_text).join('') || '-';
    case 'email':
      return prop.email || '-';
    case 'phone_number':
      return prop.phone_number || '-';
    case 'url':
      return prop.url || '-';
    case 'select':
      return prop.select?.name || '-';
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name).join(', ') || '-';
    case 'number':
      return prop.number !== null && prop.number !== undefined ? String(prop.number) : '-';
    default:
      return '-';
  }
}

async function fetchFromDataSource(notion: Client, dataSourceId: string) {
  let hasMore = true;
  let cursor: string | undefined = undefined;
  const results: any[] = [];

  while (hasMore && results.length < 500) {
    // @ts-ignore - Notion SDK v5 compatibility
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });

    results.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return results.map((page: any) => {
    const props = page.properties || {};
    return {
      id: page.id,
      name: extractPropValue(props.Name),
      company: extractPropValue(props.Company),
      email: extractPropValue(props.Contact),
      phone: extractPropValue(props.Phone),
      comments: extractPropValue(props.Comments),
      lastEdited: page.last_edited_time,
    };
  });
}

export async function GET(request: Request) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
      return NextResponse.json({ error: 'Missing NOTION_API_KEY environment variable' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab'); // 'desi' | 'pv' | null (both)

    const notion = new Client({ auth: notionApiKey });

    if (tab === 'desi') {
      const desiVendors = await fetchFromDataSource(notion, DESI_DATA_SOURCE_ID);
      return NextResponse.json({
        success: true,
        desiVendors,
        total: desiVendors.length,
        timestamp: new Date().toISOString(),
      });
    }

    if (tab === 'pv') {
      const pvVendors = await fetchFromDataSource(notion, PV_DATA_SOURCE_ID);
      return NextResponse.json({
        success: true,
        pvVendors,
        total: pvVendors.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Default: fetch both concurrently for optimal performance
    const [desiVendors, pvVendors] = await Promise.all([
      fetchFromDataSource(notion, DESI_DATA_SOURCE_ID).catch((err) => {
        console.error('Error fetching Desi vendors:', err);
        return [];
      }),
      fetchFromDataSource(notion, PV_DATA_SOURCE_ID).catch((err) => {
        console.error('Error fetching PV vendors:', err);
        return [];
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        desiVendors,
        pvVendors,
        desiCount: desiVendors.length,
        pvCount: pvVendors.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/fetch-vendors:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch vendor data' }, { status: 500 });
  }
}
