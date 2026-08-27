/**
 * Alert Controller
 * Manages fraud vigilance alerts (anomaly_logs), status transitions (OPEN -> INVESTIGATING -> RESOLVED),
 * and audit investigation notes.
 */

const db = require('../config/db');

const alertController = {
  /**
   * GET /api/alerts
   * Lists all detected fraud alerts with associated project and contractor details.
   */
  async getAlerts(req, res) {
    try {
      const {
        status,
        anomaly_type,
        state,
        district,
        page = 1,
        limit = 25,
      } = req.query;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const conditions = [];
      const params = [];
      let idx = 1;

      // Role-based jurisdiction scoping
      const user = req.user;
      if (user) {
        if (user.role === 'STATE_NODAL' && user.state) {
          conditions.push(`p.state = $${idx++}`);
          params.push(user.state);
        } else if (user.role === 'DISTRICT_COLLECTOR' && user.district) {
          conditions.push(`p.district = $${idx++}`);
          params.push(user.district);
        } else if (user.role === 'MP' && user.constituency_id) {
          conditions.push(`p.constituency_id = $${idx++}`);
          params.push(user.constituency_id);
        }
      }

      if (status) {
        conditions.push(`a.status = $${idx++}`);
        params.push(status.toUpperCase());
      }
      if (anomaly_type) {
        conditions.push(`a.anomaly_type = $${idx++}`);
        params.push(anomaly_type.toUpperCase());
      }
      if (state) {
        conditions.push(`p.state ILIKE $${idx++}`);
        params.push(state);
      }
      if (district) {
        conditions.push(`p.district ILIKE $${idx++}`);
        params.push(district);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM anomaly_logs a
        JOIN projects p ON a.project_id = p.id
        ${whereClause};
      `;
      const countRes = await db.query(countQuery, params);
      const total = parseInt(countRes.rows[0].total, 10);

      // Data query
      const dataQuery = `
        SELECT 
          a.id AS alert_id,
          a.project_id,
          a.anomaly_type,
          a.confidence_score,
          a.explanation,
          a.status AS alert_status,
          a.detected_at,
          p.project_code,
          p.title AS project_title,
          p.work_category,
          p.state,
          p.district,
          p.sanction_amount,
          p.disbursed_amount,
          p.physical_progress_pct,
          p.status AS project_status,
          p.risk_score AS project_risk_score,
          ct.name AS contractor_name,
          ct.gstin AS contractor_gstin
        FROM anomaly_logs a
        JOIN projects p ON a.project_id = p.id
        LEFT JOIN contractors ct ON p.contractor_id = ct.id
        ${whereClause}
        ORDER BY a.confidence_score DESC, a.detected_at DESC
        LIMIT $${idx++} OFFSET $${idx++};
      `;

      const dataRes = await db.query(dataQuery, [...params, parseInt(limit, 10), offset]);

      return res.status(200).json({
        success: true,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
        alerts: dataRes.rows,
      });
    } catch (err) {
      console.error('[GetAlerts Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve fraud alerts.',
        details: err.message,
      });
    }
  },

  /**
   * PUT /api/alerts/:id/status
   * Updates anomaly status (OPEN -> INVESTIGATING -> RESOLVED).
   * Restricted to DISTRICT_COLLECTOR, STATE_NODAL, and MINISTRY roles.
   */
  async updateAlertStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED'];
      if (!status || !validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const updatedStatus = status.toUpperCase();

      // Check existing alert
      const alertCheck = await db.query(
        `SELECT a.id, a.project_id, a.status, p.project_code
         FROM anomaly_logs a
         JOIN projects p ON a.project_id = p.id
         WHERE a.id = $1::uuid;`,
        [id]
      );

      if (alertCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found.',
        });
      }

      const alert = alertCheck.rows[0];

      // Update status and append audit note if provided
      let updateQuery;
      let params;

      if (notes) {
        const auditNote = `\n[${new Date().toISOString()} - ${req.user.role} (${req.user.email})]: ${notes.trim()}`;
        updateQuery = `
          UPDATE anomaly_logs
          SET status = $1,
              explanation = explanation || $2
          WHERE id = $3::uuid
          RETURNING *;
        `;
        params = [updatedStatus, auditNote, id];
      } else {
        updateQuery = `
          UPDATE anomaly_logs
          SET status = $1
          WHERE id = $2::uuid
          RETURNING *;
        `;
        params = [updatedStatus, id];
      }

      const updateResult = await db.query(updateQuery, params);

      // If marked as RESOLVED, check if all anomalies on this project are now resolved
      if (updatedStatus === 'RESOLVED') {
        const openCheck = await db.query(
          `SELECT COUNT(*) AS open_count
           FROM anomaly_logs
           WHERE project_id = $1::uuid AND status IN ('OPEN', 'INVESTIGATING');`,
          [alert.project_id]
        );

        if (parseInt(openCheck.rows[0].open_count, 10) === 0) {
          // Clear project red flag
          await db.query(
            `UPDATE projects
             SET is_flagged = FALSE, risk_score = LEAST(risk_score, 0.20)
             WHERE id = $1::uuid;`,
            [alert.project_id]
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Alert status updated to '${updatedStatus}'.`,
        alert: updateResult.rows[0],
      });
    } catch (err) {
      console.error('[UpdateAlertStatus Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update alert status.',
        details: err.message,
      });
    }
  },
};

module.exports = alertController;
