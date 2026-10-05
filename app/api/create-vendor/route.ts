import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';

const DESI_DB_ID = '3edc477f-bdd8-808c-821a-eae3cd6c37c4';
const PV_DB_ID = '3edc477f-bdd8-8068-be4d-e18986b17634';

export async function POST(request: Request) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
      return NextResponse.json({ error: 'Missing NOTION_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { targetTab, name, company, email, phone, comments } = body;

    if (!name && !company) {
      return NextResponse.json({ error: 'Please enter at least a Contact Name or Company' }, { status: 400 });
    }

    const parentDbId = targetTab === 'pv' ? PV_DB_ID : DESI_DB_ID;
    const notion = new Client({ auth: notionApiKey });

    const properties: Record<string, any> = {
      Name: {
        title: name ? [{ text: { content: name.trim() } }] : [{ text: { content: 'New Contact' } }],
      },
    };

    if (company && company.trim()) {
      properties['Company'] = {
        rich_text: [{ text: { content: company.trim() } }],
      };
    }

    if (email && email.trim()) {
      properties['Contact'] = {
        email: email.trim(),
      };
    }

    if (phone && phone.trim()) {
      properties['Phone'] = {
        phone_number: phone.trim(),
      };
    }

    if (comments && comments.trim()) {
      properties['Comments'] = {
        rich_text: [{ text: { content: comments.trim() } }],
      };
    }

    const newPage = await notion.pages.create({
      parent: { database_id: parentDbId },
      properties,
    });

    return NextResponse.json({
      success: true,
      vendor: {
        id: newPage.id,
        name: name?.trim() || 'New Contact',
        company: company?.trim() || '-',
        email: email?.trim() || '-',
        phone: phone?.trim() || '-',
        comments: comments?.trim() || '-',
        lastEdited: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating vendor in Notion:', error);
    return NextResponse.json({ error: error.message || 'Failed to create vendor' }, { status: 500 });
  }
}
