const crypto = require('crypto');
const db = require('../config/db');
const { generateQRCodeDataUrl } = require('../utils/qrGenerator');
const { recordAuditLog } = require('../utils/auditLogger');

/**
 * List all assets with optional filtering and user eligibility status
 */
async function listAssets(req, res) {
  try {
    const { category, status, search } = req.query;
    let query = `
      SELECT 
        a.id, a.asset_tag, a.name, a.category, a.description, a.location, 
        a.status, a.qr_code_payload, a.qr_code_image_url, a.priority_tier, a.specs,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'code', p.code,
              'name', p.name
            )
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as prerequisites
      FROM assets a
      LEFT JOIN asset_prerequisites ap ON a.id = ap.asset_id
      LEFT JOIN prerequisites p ON ap.prerequisite_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND a.category = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.name ILIKE $${params.length} OR a.asset_tag ILIKE $${params.length} OR a.location ILIKE $${params.length})`;
    }

    query += ` GROUP BY a.id ORDER BY a.created_at DESC`;

    const result = await db.query(query, params);
    let assets = result.rows;

    // If an authenticated user is requesting, check their eligibility per asset
    if (req.user) {
      const userCertsRes = await db.query(
        `SELECT prerequisite_id FROM user_certifications 
         WHERE user_id = $1 AND is_valid = true AND expires_at > NOW()`,
        [req.user.id]
      );
      const userCertIds = new Set(userCertsRes.rows.map(r => r.prerequisite_id));

      assets = assets.map(asset => {
        const requiredPrereqs = asset.prerequisites || [];
        const missingPrereqs = requiredPrereqs.filter(p => !userCertIds.has(p.id));
        const isEligible = missingPrereqs.length === 0;

        return {
          ...asset,
          isEligible,
          missingPrereqs,
        };
      });
    }

    return res.json({ assets });
  } catch (error) {
    console.error('List assets error:', error);
    return res.status(500).json({ error: 'Failed to retrieve assets.' });
  }
}

/**
 * Get single asset by ID or QR Payload, including smart eligibility calculation for the requester
 */
async function getAsset(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'code', p.code,
              'name', p.name
            )
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as prerequisites
       FROM assets a
       LEFT JOIN asset_prerequisites ap ON a.id = ap.asset_id
       LEFT JOIN prerequisites p ON ap.prerequisite_id = p.id
       WHERE a.id::text = $1 OR a.qr_code_payload = $1
       GROUP BY a.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    let asset = result.rows[0];

    // Check user eligibility if authenticated
    if (req.user) {
      const userCertsRes = await db.query(
        `SELECT prerequisite_id FROM user_certifications 
         WHERE user_id = $1 AND is_valid = true AND expires_at > NOW()`,
        [req.user.id]
      );
      const userCertIds = new Set(userCertsRes.rows.map(r => r.prerequisite_id));
      const requiredPrereqs = asset.prerequisites || [];
      const missingPrereqs = requiredPrereqs.filter(p => !userCertIds.has(p.id));
      const isEligible = missingPrereqs.length === 0;

      asset = {
        ...asset,
        isEligible,
        missingPrereqs,
      };
    }

    return res.json({ asset });
  } catch (error) {
    console.error('Get asset error:', error);
    return res.status(500).json({ error: 'Failed to retrieve asset details.' });
  }
}

/**
 * Create a new Asset (Manager/Admin)
 * Generates unique QR Code and registers audit block
 */
async function createAsset(req, res) {
  const client = await db.pool.connect();
  try {
    const { assetTag, name, category, description, location, specs = {}, priorityTier = 1, prerequisiteIds = [] } = req.body;

    if (!assetTag || !name || !category || !location) {
      return res.status(400).json({ error: 'assetTag, name, category, and location are required.' });
    }

    await client.query('BEGIN');

    // 1. Generate unique QR Code token & Data URL
    const qrToken = `SHAREHUB-ASSET:${crypto.randomUUID()}`;
    const qrCodeImageUrl = await generateQRCodeDataUrl(qrToken);

    // 2. Insert Asset
    const insertAssetQuery = `
      INSERT INTO assets (
        asset_tag, name, category, description, location, qr_code_payload, qr_code_image_url, specs, priority_tier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const assetRes = await client.query(insertAssetQuery, [
      assetTag,
      name,
      category,
      description || '',
      location,
      qrToken,
      qrCodeImageUrl,
      specs,
      priorityTier,
    ]);

    const createdAsset = assetRes.rows[0];

    // 3. Attach Prerequisites if any
    if (Array.isArray(prerequisiteIds) && prerequisiteIds.length > 0) {
      for (const pId of prerequisiteIds) {
        await client.query(
          'INSERT INTO asset_prerequisites (asset_id, prerequisite_id) VALUES ($1, $2)',
          [createdAsset.id, pId]
        );
      }
    }

    await client.query('COMMIT');

    // 4. Log to Hash-Chained Audit Trail
    await recordAuditLog({
      eventType: 'ASSET_CREATED',
      actorId: req.user ? req.user.id : null,
      entityName: 'assets',
      entityId: createdAsset.id,
      payload: {
        assetTag: createdAsset.asset_tag,
        name: createdAsset.name,
        category: createdAsset.category,
        location: createdAsset.location,
        priorityTier: createdAsset.priority_tier,
      },
    });

    return res.status(201).json({
      message: 'Asset registered successfully with generated QR code.',
      asset: createdAsset,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create asset error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An asset with this asset tag already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create asset.' });
  } finally {
    client.release();
  }
}

/**
 * Update Asset Status / Maintenance
 */
async function updateAsset(req, res) {
  try {
    const { id } = req.params;
    const { status, location, specs, priorityTier } = req.body;

    const existingRes = await db.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const currentAsset = existingRes.rows[0];

    const result = await db.query(
      `UPDATE assets
       SET status = COALESCE($1, status),
           location = COALESCE($2, location),
           specs = COALESCE($3, specs),
           priority_tier = COALESCE($4, priority_tier),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, location, specs, priorityTier, id]
    );

    const updatedAsset = result.rows[0];

    // Log update
    await recordAuditLog({
      eventType: 'ASSET_UPDATED',
      actorId: req.user ? req.user.id : null,
      entityName: 'assets',
      entityId: updatedAsset.id,
      payload: {
        previousStatus: currentAsset.status,
        newStatus: updatedAsset.status,
        location: updatedAsset.location,
      },
    });

    return res.json({
      message: 'Asset updated successfully.',
      asset: updatedAsset,
    });
  } catch (error) {
    console.error('Update asset error:', error);
    return res.status(500).json({ error: 'Failed to update asset.' });
  }
}

/**
 * Dedicated Smart Eligibility Validation Controller Endpoint
 */
async function checkAssetEligibility(req, res) {
  try {
    const { id } = req.params; // asset id
    const userId = req.user ? req.user.id : req.body.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to check eligibility.' });
    }

    // 1. Fetch asset prerequisites
    const assetRes = await db.query(
      `SELECT 
        a.id, a.name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'code', p.code,
              'name', p.name
            )
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as prerequisites
       FROM assets a
       LEFT JOIN asset_prerequisites ap ON a.id = ap.asset_id
       LEFT JOIN prerequisites p ON ap.prerequisite_id = p.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [id]
    );

    if (assetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const asset = assetRes.rows[0];
    const requiredPrereqs = asset.prerequisites || [];

    // 2. Fetch user valid certifications
    const userCertsRes = await db.query(
      `SELECT prerequisite_id FROM user_certifications 
       WHERE user_id = $1 AND is_valid = true AND expires_at > NOW()`,
      [userId]
    );
    const userCertIds = new Set(userCertsRes.rows.map(r => r.prerequisite_id));

    // 3. Compute eligibility gaps
    const missingPrereqs = requiredPrereqs.filter(p => !userCertIds.has(p.id));
    const isEligible = missingPrereqs.length === 0;

    return res.json({
      success: true,
      assetId: asset.id,
      assetName: asset.name,
      isEligible,
      missingPrereqs,
      totalRequired: requiredPrereqs.length,
      totalMissing: missingPrereqs.length,
    });
  } catch (error) {
    console.error('Check eligibility error:', error);
    return res.status(500).json({ error: 'Failed to evaluate asset eligibility.' });
  }
}
module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  checkAssetEligibility,
};