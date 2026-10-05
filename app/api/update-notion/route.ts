import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export async function POST(request: Request) {
  try {
    const { pageId, propertyName, propertyType, value } = await request.json();

    if (!pageId || !propertyName) {
      return NextResponse.json({ error: 'Missing required parameters: pageId and propertyName are required' }, { status: 400 });
    }

    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    // Step 1: Retrieve live page to accurately determine the exact property type in Notion
    let resolvedType = propertyType;
    try {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const targetProp = (page as any).properties?.[propertyName];
      if (targetProp?.type) {
        resolvedType = targetProp.type;
      }
    } catch (retrieveErr) {
      console.warn(`Could not retrieve page ${pageId} schema directly, falling back to ${propertyType || 'rich_text'}:`, retrieveErr);
    }

    const cleanVal = value === '-' || value === null || value === undefined ? '' : String(value).trim();
    let propertyPayload: any = {};

    switch (resolvedType) {
      case 'title':
        propertyPayload = {
          title: cleanVal ? [{ text: { content: cleanVal } }] : [],
        };
        break;

      case 'rich_text':
        propertyPayload = {
          rich_text: cleanVal ? [{ text: { content: cleanVal } }] : [],
        };
        break;

      case 'select':
        propertyPayload = {
          select: cleanVal ? { name: cleanVal } : null,
        };
        break;

      case 'multi_select':
        if (!cleanVal) {
          propertyPayload = { multi_select: [] };
        } else {
          // If value is comma-separated (e.g. "Interview, Screening" or "2nd Round"), split into items
          const items = cleanVal
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name }));
          propertyPayload = { multi_select: items.length > 0 ? items : [{ name: cleanVal }] };
        }
        break;

      case 'status':
        propertyPayload = {
          status: cleanVal ? { name: cleanVal } : null,
        };
        break;

      case 'date':
        propertyPayload = {
          date: cleanVal ? { start: cleanVal } : null,
        };
        break;

      case 'email':
        propertyPayload = {
          email: cleanVal || null,
        };
        break;

      case 'phone_number':
        propertyPayload = {
          phone_number: cleanVal || null,
        };
        break;

      case 'url':
        propertyPayload = {
          url: cleanVal || null,
        };
        break;

      case 'number':
        propertyPayload = {
          number: cleanVal && !isNaN(Number(cleanVal)) ? Number(cleanVal) : null,
        };
        break;

      case 'checkbox':
        propertyPayload = {
          checkbox: cleanVal.toLowerCase() === 'yes' || cleanVal.toLowerCase() === 'true',
        };
        break;

      default:
        propertyPayload = {
          rich_text: cleanVal ? [{ text: { content: cleanVal } }] : [],
        };
        break;
    }

    await notion.pages.update({
      page_id: pageId,
      properties: {
        [propertyName]: propertyPayload,
      },
    });

    return NextResponse.json({ success: true, resolvedType });
  } catch (error: any) {
    console.error('Error updating Notion page:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update Notion database' },
      { status: 500 }
    );
  }
}
