import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { z } from 'npm:zod@3.24.2';

const addCategorySchema = z.object({
  name: z.string().trim().min(1, 'שם המכשיר חובה')
});

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Only admins can add categories
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const validated = addCategorySchema.parse(body);

    // Check if category already exists
    const existing = await base44.asServiceRole.entities.DeviceCategory.filter({ name: validated.name });
    if (existing.length > 0) {
      return Response.json({ error: 'קטגוריה זו כבר קיימת' }, { status: 400 });
    }

    // Create new category
    const newCategory = await base44.asServiceRole.entities.DeviceCategory.create({ name: validated.name });
    
    return Response.json({ data: newCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});