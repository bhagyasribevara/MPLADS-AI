/**
 * Project Controller
 * Manages project recommendations, scoped listings by RBAC, detailed ledger views,
 * and automated ML screening (duplicate check, cost anomaly score, and audit logs).
 */

const db = require('../config/db');
const mlClient = require('../services/mlClient');

const projectController = {
  /**
   * GET /api/projects
   * Scoped by user role jurisdiction, with filters for status, state, district, risk, category, search.
   */
  async getProjects(req, res) {
    try {
      const {
        state,
        district,
        constituency_id,
        status,
        is_flagged,
        risk_level,
        work_category,
        search,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        order = 'DESC',
      } = req.query;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      // 1. Role Jurisdiction Enforcement
      const user = req.user;
      if (user) {
        if (user.role === 'STATE_NODAL' && user.state) {
          conditions.push(`p.state = $${paramIndex++}`);
          params.push(user.state);
        } else if (user.role === 'DISTRICT_COLLECTOR' && user.district) {
          conditions.push(`p.district = $${paramIndex++}`);
          params.push(user.district);
        } else if (user.role === 'MP' && user.constituency_id) {
          conditions.push(`p.constituency_id = $${paramIndex++}`);
          params.push(user.constituency_id);
        }
      }

      // 2. Query Filters
      if (state) {
        conditions.push(`p.state ILIKE $${paramIndex++}`);
        params.push(state);
      }
      if (district) {
        conditions.push(`p.district ILIKE $${paramIndex++}`);
        params.push(district);
      }
      if (constituency_id) {
        conditions.push(`p.constituency_id = $${paramIndex++}`);
        params.push(constituency_id);
      }
      if (status) {
        conditions.push(`p.status = $${paramIndex++}`);
        params.push(status.toUpperCase());
      }
      if (is_flagged !== undefined) {
        conditions.push(`p.is_flagged = $${paramIndex++}`);
        params.push(is_flagged === 'true' || is_flagged === true);
      }
      if (work_category) {
        conditions.push(`p.work_category ILIKE $${paramIndex++}`);
        params.push(`%${work_category}%`);
      }
      if (risk_level) {
        if (risk_level.toLowerCase() === 'high' || risk_level.toLowerCase() === 'critical') {
          conditions.push(`p.risk_score >= 0.70`);
        } else if (risk_level.toLowerCase() === 'moderate') {
          conditions.push(`p.risk_score >= 0.35 AND p.risk_score < 0.70`);
        } else if (risk_level.toLowerCase() === 'low') {
          conditions.push(`p.risk_score < 0.35`);
        }
      }
      if (search) {
        conditions.push(`(p.title ILIKE $${paramIndex} OR p.project_code ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Validate sort column
      const allowedSortCols = ['created_at', 'sanction_amount', 'disbursed_amount', 'physical_progress_pct', 'risk_score', 'title'];
      const sortCol = allowedSortCols.includes(sort_by) ? `p.${sort_by}` : 'p.created_at';
      const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Count query
      const countQuery = `SELECT COUNT(*) AS total FROM projects p ${whereClause};`;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Data query
      const dataQuery = `
        SELECT 
          p.id, p.project_code, p.title, p.work_category, p.state, p.district,
          p.constituency_id, c.name AS constituency_name, c.mp_name,
          p.sanction_amount, p.disbursed_amount, p.physical_progress_pct,
          p.agency_name, p.contractor_id, ct.name AS contractor_name, ct.gstin AS contractor_gstin,
          p.latitude, p.longitude, ST_AsText(p.location) AS location_wkt,
          p.status, p.risk_score, p.is_flagged, p.created_at
        FROM projects p
        LEFT JOIN constituencies c ON p.constituency_id = c.id
        LEFT JOIN contractors ct ON p.contractor_id = ct.id
        ${whereClause}
        ORDER BY ${sortCol} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
      `;

      const dataResult = await db.query(dataQuery, [...params, parseInt(limit, 10), offset]);

      return res.status(200).json({
        success: true,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
        projects: dataResult.rows,
      });
    } catch (err) {
      console.error('[GetProjects Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve projects.',
        details: err.message,
      });
    }
  },

  /**
   * POST /api/projects
   * Creates a new recommendation with automatic ML screening (duplicate check, anomaly scoring).
   */
  async createProject(req, res) {
    try {
      const {
        title,
        work_category,
        state,
        district,
        constituency_id,
        sanction_amount,
        latitude,
        longitude,
        agency_name,
        contractor_id,
      } = req.body;

      if (!title || !work_category || !state || !district || !constituency_id || !sanction_amount || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, work_category, state, district, constituency_id, sanction_amount, latitude, longitude.',
        });
      }

      // Step 1: Automatic ML Duplicate Screening
      const duplicateScreening = await mlClient.detectDuplicate({
        title,
        lat: latitude,
        lng: longitude,
        constituencyId: constituency_id,
      });

      // Step 2: Automatic ML Cost & Financial Anomaly Scoring
      const anomalyScreening = await mlClient.scoreAnomaly({
        sanctionAmount: sanction_amount,
        disbursedAmount: 0.0,
        physicalProgress: 0,
        workCategory: work_category,
      });

      // Calculate composite risk
      let riskScore = 0.05;
      let isFlagged = false;
      const detectedAnomalies = [];

      if (duplicateScreening.is_duplicate) {
        isFlagged = true;
        riskScore = Math.max(riskScore, duplicateScreening.duplicate_risk_score || 0.90);
        detectedAnomalies.push({
          type: 'DUPLICATE_WORK',
          confidence: duplicateScreening.duplicate_risk_score || 0.95,
          explanation: duplicateScreening.explanation,
        });
      }

      if (anomalyScreening.is_anomalous) {
        isFlagged = true;
        riskScore = Math.max(riskScore, anomalyScreening.risk_score || 0.85);
        detectedAnomalies.push({
          type: anomalyScreening.anomaly_type === 'GHOST_PROJECT' ? 'GHOST_PROJECT' : 'COST_OVERRUN',
          confidence: anomalyScreening.confidence_score || 0.88,
          explanation: anomalyScreening.explanation,
        });
      }

      // Step 3: Generate Unique Project Code
      const codeSeqResult = await db.query("SELECT nextval('project_code_seq') AS seq;").catch(async () => {
        // Create sequence if not exists
        await db.query("CREATE SEQUENCE IF NOT EXISTS project_code_seq START 100000;");
        return db.query("SELECT nextval('project_code_seq') AS seq;");
      });
      const seq = codeSeqResult.rows[0].seq;
      const stateCode = state.slice(0, 2).toUpperCase();
      const projectCode = `WS/MP${stateCode}/2025-2026/${String(seq).padStart(6, '0')}`;

      // Step 4: Insert Project into Database
      const insertProjectQuery = `
        INSERT INTO projects (
          project_code, title, work_category, state, district, constituency_id,
          sanction_amount, disbursed_amount, physical_progress_pct, agency_name,
          contractor_id, latitude, longitude, status, risk_score, is_flagged
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING id, project_code, title, sanction_amount, status, risk_score, is_flagged, created_at;
      `;

      const projectResult = await db.query(insertProjectQuery, [
        projectCode,
        title.trim(),
        work_category,
        state,
        district,
        constituency_id,
        parseFloat(sanction_amount),
        0.00,
        0,
        agency_name || 'Public Works Department (PWD)',
        contractor_id || null,
        parseFloat(latitude),
        parseFloat(longitude),
        'RECOMMENDED',
        riskScore,
        isFlagged,
      ]);

      const createdProject = projectResult.rows[0];

      // Step 5: Automatically Insert Anomaly Logs if Flagged
      for (const anomaly of detectedAnomalies) {
        await db.query(
          `INSERT INTO anomaly_logs (project_id, anomaly_type, confidence_score, explanation, status)
           VALUES ($1, $2, $3, $4, $5);`,
          [createdProject.id, anomaly.type, anomaly.confidence, anomaly.explanation, 'OPEN']
        );
      }

      return res.status(201).json({
        success: true,
        message: isFlagged
          ? 'Project recommended with automated vigilance flags (anomalies detected).'
          : 'Project recommended successfully.',
        project: createdProject,
        ml_screening: {
          duplicate_analysis: duplicateScreening,
          anomaly_analysis: anomalyScreening,
          detected_anomalies: detectedAnomalies,
        },
      });
    } catch (err) {
      console.error('[CreateProject Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to create project recommendation.',
        details: err.message,
      });
    }
  },

  /**
   * GET /api/projects/:id
   * Detailed view including milestone ledger, contractor info, and anomaly logs.
   */
  async getProjectById(req, res) {
    try {
      const { id } = req.params;

      const projectQuery = `
        SELECT 
          p.id, p.project_code, p.title, p.work_category, p.state, p.district,
          p.constituency_id, c.name AS constituency_name, c.mp_name, c.house_type,
          p.sanction_amount, p.disbursed_amount, p.physical_progress_pct,
          p.agency_name, p.contractor_id, ct.name AS contractor_name, ct.gstin AS contractor_gstin,
          ct.blacklisted AS contractor_blacklisted, ct.risk_score AS contractor_risk_score,
          p.latitude, p.longitude, ST_AsText(p.location) AS location_wkt,
          p.status, p.risk_score, p.is_flagged, p.created_at
        FROM projects p
        LEFT JOIN constituencies c ON p.constituency_id = c.id
        LEFT JOIN contractors ct ON p.contractor_id = ct.id
        WHERE p.id = $1::uuid;
      `;

      const projectResult = await db.query(projectQuery, [id]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found.',
        });
      }

      const project = projectResult.rows[0];

      // Fetch milestones ledger
      const milestonesResult = await db.query(
        `SELECT id, stage_name, claimed_pct, fund_released, inspection_notes, image_url, image_hash, verified, updated_at
         FROM milestones
         WHERE project_id = $1::uuid
         ORDER BY claimed_pct ASC, updated_at ASC;`,
        [id]
      );

      // Fetch anomaly logs
      const anomaliesResult = await db.query(
        `SELECT id, anomaly_type, confidence_score, explanation, status, detected_at
         FROM anomaly_logs
         WHERE project_id = $1::uuid
         ORDER BY detected_at DESC;`,
        [id]
      );

      return res.status(200).json({
        success: true,
        project: {
          ...project,
          milestones: milestonesResult.rows,
          anomaly_logs: anomaliesResult.rows,
        },
      });
    } catch (err) {
      console.error('[GetProjectById Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve project details.',
        details: err.message,
      });
    }
  },
};

module.exports = projectController;
