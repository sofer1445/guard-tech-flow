import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { z } from 'npm:zod@3.24.2';

const updateCategorySchema = z.object({
  categoryId: z.string().min(1, 'categoryId is required'),
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

    // RBAC: Only admins can update categories
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateCategorySchema.parse(body);

    // Check if new name already exists (excluding current category)
    const existing = await base44.asServiceRole.entities.DeviceCategory.filter({ name: validated.name });
    if (existing.length > 0 && existing[0].id !== validated.categoryId) {
      return Response.json({ error: 'קטגוריה זו כבר קיימת' }, { status: 400 });
    }

    // Update category
    const updated = await base44.asServiceRole.entities.DeviceCategory.update(validated.categoryId, { name: validated.name });
    
    return Response.json({ data: updated, message: 'קטגוריה עודכנה בהצלחה' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});