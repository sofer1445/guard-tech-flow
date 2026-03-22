import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const MOCK_CATEGORIES = ['מכשיר קשר', 'סלולר', 'טאבלט', 'מחשב נייד'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch existing categories
    const categories = await base44.asServiceRole.entities.DeviceCategory.list();
    
    // If empty, seed with mock data
    if (categories.length === 0) {
      const seedData = MOCK_CATEGORIES.map(name => ({ name }));
      await base44.asServiceRole.entities.DeviceCategory.bulkCreate(seedData);
      return Response.json({ data: seedData });
    }
    
    return Response.json({ data: categories });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});