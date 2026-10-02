import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export async function POST(request: Request) {
  try {
    const formData = await request.json();
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) {
      return NextResponse.json({ error: 'Missing NOTION_DATABASE_ID' }, { status: 500 });
    }

    // Retrieve database schema to match property names and types precisely
    let schemaProps: Record<string, any> = {};
    try {
      // @ts-ignore
      const dbInfo = await notion.dataSources.retrieve({ data_source_id: databaseId });
      schemaProps = (dbInfo as any).properties || {};
    } catch {
      // If dataSources retrieve fails, fallback to databases retrieve or direct build
      try {
        const db = await notion.databases.retrieve({ database_id: databaseId });
        schemaProps = (db as any).properties || {};
      } catch (e) {
        console.warn('Could not retrieve DB schema:', e);
      }
    }

    const properties: Record<string, any> = {};

    // Helper to format a property payload based on target schema
    const formatValue = (propName: string, value: string, schemaProp: any) => {
      if (!value && schemaProp?.type !== 'title') return null;
      const val = value || '';
      const type = schemaProp?.type || 'rich_text';

      switch (type) {
        case 'title':
          return { title: [{ text: { content: val } }] };
        case 'rich_text':
          return { rich_text: [{ text: { content: val } }] };
        case 'select':
          return val ? { select: { name: val } } : null;
        case 'status':
          return val ? { status: { name: val } } : null;
        case 'date':
          return val ? { date: { start: val } } : null;
        case 'email':
          return val ? { email: val } : null;
        case 'phone_number':
          return val ? { phone_number: val } : null;
        default:
          return { rich_text: [{ text: { content: val } }] };
      }
    };

    // Mapping between formData keys and possible Notion DB property names
    const fieldMapping: Record<string, string[]> = {
      date: ['Date', 'date', 'Interview Date'],
      interviewTime: ['Interview Time', 'Time', 'interviewTime'],
      consultantName: ['Consultant Name', 'Consultant', 'Candidate Name', 'Name', 'Title'],
      position: ['Position', 'Job Title', 'Role', 'position'],
      client: ['Vendor / Client', 'Vendor', 'Client', 'Company', 'client'],
      status: ['Status', 'status'],
      marketer: ['Marketer', 'Marketer Name', 'Marketing'],
      support: ['Support', 'Support Person', 'support'],
      recruiter: ['Recruiter', 'Recruiter Name'],
      recruiterEmail: ['Recruiter Email', 'Email', 'recruiterEmail'],
      recruiterPhone: ['Recruiter Phone', 'Phone', 'Phone Number', 'recruiterPhone'],
      update: ['Update', 'Notes', 'Job Description', 'update'],
    };

    // Match formData fields to existing database schema properties
    Object.entries(fieldMapping).forEach(([formKey, candidateNames]) => {
      const val = (formData[formKey] || '').trim();
      if (!val) return;

      const matchedPropName = candidateNames.find((name) => schemaProps[name]);
      if (matchedPropName) {
        const schemaProp = schemaProps[matchedPropName];
        const payload = formatValue(matchedPropName, val, schemaProp);
        if (payload) properties[matchedPropName] = payload;
      } else {
        // Fallback: Use standard candidate name if schema wasn't fully resolved
        const fallbackName = candidateNames[0];
        properties[fallbackName] = { rich_text: [{ text: { content: val } }] };
      }
    });

    // Make sure title property is set if required by Notion
    const titlePropKey = Object.keys(schemaProps).find((k) => schemaProps[k].type === 'title');
    if (titlePropKey && !properties[titlePropKey]) {
      const titleVal = formData.consultantName || formData.position || 'New Placement';
      properties[titlePropKey] = { title: [{ text: { content: titleVal } }] };
    }

    // Create page in Notion
    // @ts-ignore
    const newPage = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });

    return NextResponse.json({ success: true, pageId: newPage.id });
  } catch (error: any) {
    console.error('Error creating placement in Notion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create placement in Notion' },
      { status: 500 }
    );
  }
}
