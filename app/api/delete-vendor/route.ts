import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
      return NextResponse.json({ error: 'Missing NOTION_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing vendor id to delete' }, { status: 400 });
    }

    const notion = new Client({ auth: notionApiKey });

    // In Notion, deleting a page is done by setting archived to true
    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete vendor' }, { status: 500 });
  }
}
