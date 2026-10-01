import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export async function POST(request: Request) {
  try {
    const { pageId, propertyName, propertyType, value } = await request.json();

    if (!pageId || !propertyName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    let propertyPayload: any = {};

    switch (propertyType) {
      case 'title':
        propertyPayload = { title: [{ text: { content: value } }] };
        break;
      case 'rich_text':
        propertyPayload = { rich_text: [{ text: { content: value } }] };
        break;
      case 'select':
        propertyPayload = value ? { select: { name: value } } : { select: null };
        break;
      case 'status':
        propertyPayload = { status: { name: value } };
        break;
      case 'date':
        propertyPayload = value ? { date: { start: value } } : { date: null };
        break;
      case 'email':
        propertyPayload = { email: value || null };
        break;
      case 'phone_number':
        propertyPayload = { phone_number: value || null };
        break;
      default:
        // Default fallback as rich_text if unknown
        propertyPayload = { rich_text: [{ text: { content: value } }] };
        break;
    }

    await notion.pages.update({
      page_id: pageId,
      properties: {
        [propertyName]: propertyPayload,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating Notion page:', error);
    return NextResponse.json({ error: error.message || 'Failed to update Notion' }, { status: 500 });
  }
}
