import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Client } from '@notionhq/client';

export async function POST(request: Request) {
  try {
    const formData = await request.json();
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!databaseId) {
      return NextResponse.json({ error: 'Missing NOTION_DATABASE_ID in environment' }, { status: 500 });
    }

    // Resolve the actual database_id and schema properties
    let targetDatabaseId = databaseId;
    let schemaProps: Record<string, any> = {};

    try {
      // Query 1 page from data source to accurately discover target database_id and property types
      // @ts-ignore
      const pageRes = await notion.dataSources.query({ data_source_id: databaseId, page_size: 1 });
      const sample = pageRes.results[0] as any;
      if (sample) {
        if (sample.parent?.database_id) {
          targetDatabaseId = sample.parent.database_id;
        }
        if (sample.properties) {
          schemaProps = sample.properties;
        }
      }
    } catch (queryErr) {
      console.warn('Could not query sample page for database_id:', queryErr);
    }

    // Fallback schema retrieval if needed
    if (Object.keys(schemaProps).length === 0) {
      try {
        // @ts-ignore
        const ds = (await notion.dataSources.retrieve({ data_source_id: databaseId })) as any;
        if (ds?.parent?.database_id) {
          targetDatabaseId = ds.parent.database_id;
        }
        schemaProps = (ds as any).properties || {};
      } catch (dsErr) {
        console.warn('Could not retrieve data source:', dsErr);
      }
    }

    // Helper to format a property payload based on target schema
    const formatValue = (propName: string, val: string, schemaProp: any) => {
      const type = schemaProp?.type || 'rich_text';
      const cleanVal = val.trim();

      switch (type) {
        case 'title':
          return { title: [{ text: { content: cleanVal.slice(0, 2000) } }] };

        case 'rich_text':
          return { rich_text: [{ text: { content: cleanVal.slice(0, 2000) } }] };

        case 'select':
          // Notion select option names cannot contain commas and must be <= 100 chars
          return { select: { name: cleanVal.replace(/,/g, ' -').slice(0, 100) } };

        case 'multi_select':
          // Status can have multiple comma-separated stages e.g. "Interview, Screening"
          if (propName.toLowerCase().includes('status')) {
            const items = cleanVal
              .split(',')
              .map((s) => s.trim().replace(/,/g, ''))
              .filter(Boolean)
              .map((name) => ({ name: name.slice(0, 100) }));
            return { multi_select: items.length > 0 ? items : [{ name: cleanVal.slice(0, 100) }] };
          }
          // Position or other multi_select options cannot have commas in Notion option names
          return {
            multi_select: [{ name: cleanVal.replace(/,/g, ' /').slice(0, 100) }],
          };

        case 'status':
          return { status: { name: cleanVal.replace(/,/g, ' -').slice(0, 100) } };

        case 'date': {
          // If valid ISO date YYYY-MM-DD
          const isoMatch = cleanVal.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
          if (isoMatch) {
            const y = isoMatch[1];
            const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
            const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
            return { date: { start: `${y}-${m}-${d}` } };
          }
          return { date: { start: cleanVal } };
        }

        case 'email':
          return { email: cleanVal || null };

        case 'phone_number':
          return { phone_number: cleanVal || null };

        default:
          return { rich_text: [{ text: { content: cleanVal.slice(0, 2000) } }] };
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
        properties[matchedPropName] = formatValue(matchedPropName, val, schemaProp);
      }
    });

    // Ensure title property is never missing (Notion requires the title property)
    const titlePropKey = Object.keys(schemaProps).find((k) => schemaProps[k].type === 'title') || 'Date';
    if (!properties[titlePropKey]) {
      const defaultTitle = formData.date || formData.consultantName || 'New Placement';
      properties[titlePropKey] = { title: [{ text: { content: String(defaultTitle).trim().slice(0, 2000) } }] };
    }

    // Create the page inside target database
    const newPage = await notion.pages.create({
      parent: { database_id: targetDatabaseId },
      properties,
    });

    // Purge cache so the newly created placement immediately displays on the table & docket
    try {
      revalidatePath('/', 'page');
      revalidatePath('/api/fetch-placements');
    } catch (revalErr) {
      console.warn('Revalidation warning:', revalErr);
    }

    return NextResponse.json({ success: true, pageId: newPage.id });
  } catch (error: any) {
    console.error('Error creating placement in Notion:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create placement in Notion' },
      { status: 500 }
    );
  }
}
