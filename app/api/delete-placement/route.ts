import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';

export async function POST(request: Request) {
  try {
    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'Missing required parameter: pageId' }, { status: 400 });
    }

    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    // In Notion, archiving a page deletes/removes it from the database
    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });

    // Revalidate paths so the deletion is immediately reflected across all views
    try {
      revalidatePath('/', 'page');
      revalidatePath('/api/fetch-placements');
    } catch (e) {
      console.warn('Revalidation warning:', e);
    }

    return NextResponse.json({ success: true, pageId });
  } catch (error: any) {
    console.error('Error deleting Notion page:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete placement in Notion' },
      { status: 500 }
    );
  }
}
