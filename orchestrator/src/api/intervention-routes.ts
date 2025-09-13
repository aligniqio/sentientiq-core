/**
 * Intervention Management API Routes
 * 
 * RESTful API for tenant-aware intervention customization
 */

import { Router, Request, Response } from 'express';
import { tenantInterventionService } from '../services/tenant-interventions.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const requireTenantAdmin = requireAdmin; // Alias for now

const router = Router();

/**
 * Get available intervention templates for tenant
 */
router.get('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const templates = await tenantInterventionService.getAvailableTemplates(tenantId);
    
    res.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tenant's custom interventions
 */
router.get('/interventions', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const interventions = await tenantInterventionService.getTenantConfigurations(tenantId);
    
    res.json({
      success: true,
      interventions,
      count: interventions.length
    });
  } catch (error: any) {
    console.error('Error fetching interventions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get specific intervention configuration
 */
router.get('/interventions/:ruleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const intervention = await tenantInterventionService.getConfiguration(tenantId, ruleId);
    
    if (!intervention) {
      return res.status(404).json({ error: 'Intervention not found' });
    }
    
    res.json({
      success: true,
      intervention
    });
  } catch (error: any) {
    console.error('Error fetching intervention:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create custom intervention from template
 */
router.post('/interventions', requireTenantAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, customization } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID required' });
    }
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID required' });
    }
    
    const intervention = await tenantInterventionService.createCustomIntervention(
      tenantId,
      templateId,
      customization || {},
      userId
    );
    
    res.status(201).json({
      success: true,
      intervention,
      message: 'Intervention created successfully'
    });
  } catch (error: any) {
    console.error('Error creating intervention:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update intervention configuration
 */
router.put('/interventions/:ruleId', requireTenantAdmin, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { customization } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID required' });
    }
    
    const intervention = await tenantInterventionService.updateIntervention(
      tenantId,
      ruleId,
      customization,
      userId
    );
    
    res.json({
      success: true,
      intervention,
      message: 'Intervention updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating intervention:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test intervention with sample data
 */
router.post('/interventions/:ruleId/test', requireTenantAdmin, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { testData } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID required' });
    }
    
    if (!testData) {
      return res.status(400).json({ error: 'Test data required' });
    }
    
    const result = await tenantInterventionService.testIntervention(
      tenantId,
      ruleId,
      testData,
      userId
    );
    
    res.json({
      success: true,
      result,
      message: 'Test executed successfully'
    });
  } catch (error: any) {
    console.error('Error testing intervention:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete intervention
 */
router.delete('/interventions/:ruleId', requireTenantAdmin, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID required' });
    }
    
    await tenantInterventionService.deleteIntervention(tenantId, ruleId, userId);
    
    res.json({
      success: true,
      message: 'Intervention deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting intervention:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get intervention analytics
 */
router.get('/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { startDate, endDate } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const dateRange = startDate && endDate ? {
      start: new Date(startDate as string),
      end: new Date(endDate as string)
    } : undefined;
    
    const analytics = await tenantInterventionService.getAnalytics(tenantId, dateRange);
    
    res.json({
      success: true,
      analytics
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Bulk import interventions from JSON
 */
router.post('/import', requireTenantAdmin, async (req: Request, res: Response) => {
  try {
    const { interventions } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID required' });
    }
    
    if (!Array.isArray(interventions)) {
      return res.status(400).json({ error: 'Interventions array required' });
    }
    
    const results = [];
    for (const intervention of interventions) {
      try {
        const created = await tenantInterventionService.createCustomIntervention(
          tenantId,
          intervention.templateId,
          intervention.customization,
          userId
        );
        results.push({ success: true, intervention: created });
      } catch (error: any) {
        results.push({ success: false, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error: any) {
    console.error('Error importing interventions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export interventions as JSON
 */
router.get('/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const interventions = await tenantInterventionService.getTenantConfigurations(tenantId);
    
    res.json({
      success: true,
      export: {
        tenantId,
        exportDate: new Date().toISOString(),
        interventions: interventions.map(i => ({
          templateId: i.ruleId.split('_')[1],
          customization: i.customizations,
          branding: i.branding,
          permissions: i.permissions
        }))
      }
    });
  } catch (error: any) {
    console.error('Error exporting interventions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;