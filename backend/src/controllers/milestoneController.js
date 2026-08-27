/**
 * Milestone Controller
 * Handles agency milestone progress & photo uploads (with ML perceptual hash verification)
 * and District Collector verification & fund release approvals.
 */

const db = require('../config/db');
const mlClient = require('../services/mlClient');

const milestoneController = {
  /**
   * POST /api/milestones
   * Agency uploads progress proof photo and milestone claims.
   * Invokes ML perceptual image hashing to detect recycled site photos.
   */
  async createMilestone(req, res) {
    try {
      const { project_id, stage_name, claimed_pct, fund_released, inspection_notes } = req.body;
      const file = req.file;

      if (!project_id || !stage_name || claimed_pct === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: project_id, stage_name, claimed_pct.',
        });
      }

      // Check that project exists
      const projCheck = await db.query('SELECT id, project_code, is_flagged, sanction_amount FROM projects WHERE id = $1::uuid;', [project_id]);
      if (projCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specified project does not exist.',
        });
      }
      const project = projCheck.rows[0];

      let imageHash = null;
      let imageUrl = null;
      let mlImageVerification = null;
      let isDuplicateImage = false;

      // Invoke ML Image Verification if file is attached
      if (file && file.buffer) {
        mlImageVerification = await mlClient.verifyMilestoneImage({
          imageBuffer: file.buffer,
          filename: file.originalname,
          mimetype: file.mimetype,
          projectId: project_id,
        });

        imageHash = mlImageVerification.image_phash || null;
        imageUrl = `/uploads/milestones/${Date.now()}_${file.originalname}`;
        isDuplicateImage = mlImageVerification.is_duplicate_image;

        // If duplicate photo detected, flag the project and log anomaly
        if (isDuplicateImage) {
          await db.query('UPDATE projects SET is_flagged = TRUE, risk_score = GREATEST(risk_score, 0.92) WHERE id = $1::uuid;', [project_id]);
          await db.query(
            `INSERT INTO anomaly_logs (project_id, anomaly_type, confidence_score, explanation, status)
             VALUES ($1, $2, $3, $4, $5);`,
            [
              project_id,
              'GHOST_PROJECT',
              0.95,
              `Milestone Photo Fraud: Uploaded proof photo matched prior milestone with ${mlImageVerification.matched_milestones?.[0]?.similarity_pct || 90}% visual similarity. ${mlImageVerification.explanation}`,
              'OPEN',
            ]
          );
        }
      }

      // Insert milestone record
      const insertQuery = `
        INSERT INTO milestones (
          project_id, stage_name, claimed_pct, fund_released,
          inspection_notes, image_url, image_hash, verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, project_id, stage_name, claimed_pct, fund_released, image_url, image_hash, verified, updated_at;
      `;

      const milestoneResult = await db.query(insertQuery, [
        project_id,
        stage_name.trim(),
        parseInt(claimed_pct, 10),
        parseFloat(fund_released || 0),
        inspection_notes || '',
        imageUrl,
        imageHash,
        false, // Needs collector verification
      ]);

      return res.status(201).json({
        success: true,
        message: isDuplicateImage
          ? 'Milestone submitted with alert: Recycled photographic proof detected.'
          : 'Milestone submitted successfully. Pending District Collector verification.',
        milestone: milestoneResult.rows[0],
        ml_verification: mlImageVerification,
      });
    } catch (err) {
      console.error('[CreateMilestone Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload milestone.',
        details: err.message,
      });
    }
  },

  /**
   * PUT /api/milestones/:id/verify
   * Only DISTRICT_COLLECTOR and MINISTRY can verify/reject milestones and release funds.
   */
  async verifyMilestone(req, res) {
    try {
      const { id } = req.params;
      const { verified, inspection_notes, fund_released } = req.body;

      if (verified === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Verification decision (verified: boolean) is required.',
        });
      }

      // Fetch existing milestone and project
      const milestoneQuery = `
        SELECT m.id, m.project_id, m.claimed_pct, m.fund_released, p.sanction_amount, p.constituency_id
        FROM milestones m
        JOIN projects p ON m.project_id = p.id
        WHERE m.id = $1::uuid;
      `;
      const mResult = await db.query(milestoneQuery, [id]);

      if (mResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Milestone not found.',
        });
      }

      const milestone = mResult.rows[0];
      const releasedAmount = fund_released !== undefined ? parseFloat(fund_released) : parseFloat(milestone.fund_released);

      // Update milestone
      const updateMilestoneQuery = `
        UPDATE milestones
        SET verified = $1,
            inspection_notes = COALESCE($2, inspection_notes),
            fund_released = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4::uuid
        RETURNING *;
      `;
      const updatedMilestone = await db.query(updateMilestoneQuery, [
        Boolean(verified),
        inspection_notes || null,
        releasedAmount,
        id,
      ]);

      // If approved, update project progress & disbursed amount
      if (Boolean(verified)) {
        await db.query(
          `UPDATE projects
           SET physical_progress_pct = GREATEST(physical_progress_pct, $1),
               disbursed_amount = disbursed_amount + $2,
               status = CASE 
                 WHEN GREATEST(physical_progress_pct, $1) >= 100 THEN 'COMPLETED'
                 ELSE 'IN_PROGRESS'
               END
           WHERE id = $3::uuid;`,
          [milestone.claimed_pct, releasedAmount, milestone.project_id]
        );

        // Update constituency total expenditure rollup
        await db.query(
          `UPDATE constituencies
           SET total_expenditure = total_expenditure + $1
           WHERE id = $2::uuid;`,
          [releasedAmount, milestone.constituency_id]
        );
      }

      return res.status(200).json({
        success: true,
        message: Boolean(verified) ? 'Milestone successfully verified and funds disbursed.' : 'Milestone inspection rejected.',
        milestone: updatedMilestone.rows[0],
      });
    } catch (err) {
      console.error('[VerifyMilestone Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify milestone.',
        details: err.message,
      });
    }
  },
};

module.exports = milestoneController;
