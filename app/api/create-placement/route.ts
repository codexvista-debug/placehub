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
      try {
        const db = await notion.databases.retrieve({ database_id: databaseId });
        schemaProps = (db as any).properties || {};
      } catch (e) {
        console.warn('Could not retrieve DB schema:', e);
      }
    }

    // Helper to format a property payload based on target schema
    const formatValue = (val: string, schemaProp: any) => {
      const type = schemaProp?.type || 'rich_text';

      switch (type) {
        case 'title':
          return { title: [{ text: { content: val } }] };
        case 'rich_text':
          return { rich_text: [{ text: { content: val } }] };
        case 'select':
          return { select: { name: val } };
        case 'multi_select':
          // Notion multi_select takes an array of option objects
          return { multi_select: [{ name: val }] };
        case 'status':
          return { status: { name: val } };
        case 'date':
          return { date: { start: val } };
        case 'email':
          return { email: val };
        case 'phone_number':
          return { phone_number: val };
        default:
          return { rich_text: [{ text: { content: val } }] };
      }
    };

    // Mapping between formData keys and candidate Notion DB property names
    const fieldMapping: Record<string, string[]> = {
      date: ['Date', 'Interview Date', 'date'],
      interviewTime: ['Interview Time', 'Time', 'interviewTime'],
      consultantName: ['Consultant Name', 'Consultant', 'Candidate Name', 'Candidate', 'Name'],
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

    const properties: Record<string, any> = {};

    // Match formData fields to existing database schema properties
    Object.entries(fieldMapping).forEach(([formKey, candidateNames]) => {
      const rawVal = formData[formKey];
      if (rawVal === undefined || rawVal === null) return;
      const val = String(rawVal).trim();
      if (!val) return;

      const matchedPropName = candidateNames.find((name) => schemaProps[name]);
      if (matchedPropName) {
        const schemaProp = schemaProps[matchedPropName];
        properties[matchedPropName] = formatValue(val, schemaProp);
      }
    });

    // Ensure title property is never missing (Notion requires the title property)
    const titlePropKey = Object.keys(schemaProps).find((k) => schemaProps[k].type === 'title') || 'Date';
    if (!properties[titlePropKey]) {
      const defaultTitle = formData.date || formData.consultantName || 'New Placement';
      properties[titlePropKey] = { title: [{ text: { content: defaultTitle } }] };
    }

    // Try creating page via data_source_id first, then fallback to database_id
    let newPage: any;
    try {
      // @ts-ignore
      newPage = await notion.pages.create({
        parent: { data_source_id: databaseId },
        properties,
      });
    } catch (createErr: any) {
      // @ts-ignore
      newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });
    }

    return NextResponse.json({ success: true, pageId: newPage.id });
  } catch (error: any) {
    console.error('Error creating placement in Notion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create placement in Notion' },
      { status: 500 }
    );
  }
}
