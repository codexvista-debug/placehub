import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';

const DESI_DB_ID = process.env.NOTION_DESI_VENDOR_DATABASE_PARENT_ID || '345c477f-bdd8-81e4-ab05-dcab933f178e';
const PV_DB_ID = process.env.NOTION_PV_VENDOR_DATABASE_PARENT_ID || '345c477f-bdd8-8189-a855-c9b96f250add';

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

    let newPageId = '';

    try {
      const newPage = await notion.pages.create({
        parent: { database_id: parentDbId },
        properties,
      });
      newPageId = newPage.id;
    } catch (createErr: any) {
      // If validation failed on Contact (email) or Phone (phone_number), retry with fallback to Comments
      console.warn('Initial vendor create failed, attempting resilient fallback:', createErr?.message);
      const fallbackProperties: Record<string, any> = {
        Name: properties.Name,
      };
      if (properties.Company) fallbackProperties.Company = properties.Company;

      const extraNotes = [
        email ? `Email: ${email.trim()}` : null,
        phone ? `Phone: ${phone.trim()}` : null,
        comments ? comments.trim() : null,
      ].filter(Boolean).join('\n');

      if (extraNotes) {
        fallbackProperties['Comments'] = {
          rich_text: [{ text: { content: extraNotes } }],
        };
      }

      const fallbackPage = await notion.pages.create({
        parent: { database_id: parentDbId },
        properties: fallbackProperties,
      });
      newPageId = fallbackPage.id;
    }

    return NextResponse.json({
      success: true,
      vendor: {
        id: newPageId,
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
