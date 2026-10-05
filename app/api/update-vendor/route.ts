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
    const { id, field, value } = body;

    if (!id || !field) {
      return NextResponse.json({ error: 'Missing required parameters (id, field)' }, { status: 400 });
    }

    const notion = new Client({ auth: notionApiKey });
    const propertiesToUpdate: Record<string, any> = {};

    const cleanVal = (value ?? '').trim();

    switch (field.toLowerCase()) {
      case 'name':
        propertiesToUpdate['Name'] = {
          title: cleanVal ? [{ text: { content: cleanVal } }] : [],
        };
        break;
      case 'company':
        propertiesToUpdate['Company'] = {
          rich_text: cleanVal ? [{ text: { content: cleanVal } }] : [],
        };
        break;
      case 'email':
      case 'contact':
        propertiesToUpdate['Contact'] = {
          email: cleanVal && cleanVal !== '-' ? cleanVal : null,
        };
        break;
      case 'phone':
        propertiesToUpdate['Phone'] = {
          phone_number: cleanVal && cleanVal !== '-' ? cleanVal : null,
        };
        break;
      case 'comments':
        propertiesToUpdate['Comments'] = {
          rich_text: cleanVal && cleanVal !== '-' ? [{ text: { content: cleanVal } }] : [],
        };
        break;
      default:
        return NextResponse.json({ error: `Unsupported vendor field: ${field}` }, { status: 400 });
    }

    const response = await notion.pages.update({
      page_id: id,
      properties: propertiesToUpdate,
    });

    return NextResponse.json({ success: true, updatedId: response.id });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return NextResponse.json({ error: error.message || 'Failed to update vendor' }, { status: 500 });
  }
}
