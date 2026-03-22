import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { z } from 'npm:zod@3.24.2';

const deleteCategorySchema = z.object({
  categoryId: z.string().min(1, 'categoryId is required')
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

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const validated = deleteCategorySchema.parse(body);

    // Fetch the category to get its name
    const categories = await base44.asServiceRole.entities.DeviceCategory.filter({ id: validated.categoryId });
    if (!categories || categories.length === 0) {
      return Response.json({ error: 'קטגוריה לא נמצאה' }, { status: 404 });
    }
    const categoryName = categories[0].name;

    // Integrity check: reject if any DamageReport references this deviceType
    const linkedReports = await base44.asServiceRole.entities.DamageReport.filter({ deviceType: categoryName });
    if (linkedReports && linkedReports.length > 0) {
      return Response.json(
        { error: 'לא ניתן למחוק סוג מכשיר שיש לו דוחות מקושרים' },
        { status: 409 }
      );
    }

    await base44.asServiceRole.entities.DeviceCategory.delete(validated.categoryId);

    return Response.json({ success: true, message: 'קטגוריה נמחקה בהצלחה' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});