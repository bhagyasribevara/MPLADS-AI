/**
 * Analytics Controller
 * Computes national and state macro metrics, utilization rates, anomaly distributions,
 * and formats projects as GeoJSON FeatureCollection for Leaflet GIS mapping.
 */

const db = require('../config/db');

const analyticsController = {
  /**
   * GET /api/analytics
   * Macro metrics, fund utilization rate, red-flag count, state/district rankings.
   */
  async getMacroMetrics(req, res) {
    try {
      const { state, district } = req.query;
      const conditions = [];
      const params = [];
      let idx = 1;

      if (state) {
        conditions.push(`state ILIKE $${idx++}`);
        params.push(state);
      }
      if (district) {
        conditions.push(`district ILIKE $${idx++}`);
        params.push(district);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 1. Overall Financial & Project Totals
      const totalsQuery = `
        SELECT 
          COUNT(*) AS total_projects,
          COALESCE(SUM(sanction_amount), 0) AS total_sanctioned,
          COALESCE(SUM(disbursed_amount), 0) AS total_disbursed,
          COUNT(*) FILTER (WHERE is_flagged = TRUE) AS red_flag_count,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
          COUNT(*) FILTER (WHERE status = 'STALLED') AS stalled_count,
          ROUND(AVG(risk_score)::numeric, 2) AS average_risk_score
        FROM projects
        ${whereClause};
      `;
      const totalsRes = await db.query(totalsQuery, params);
      const totals = totalsRes.rows[0];

      const totalSanctioned = parseFloat(totals.total_sanctioned);
      const totalDisbursed = parseFloat(totals.total_disbursed);
      const utilizationRate = totalSanctioned > 0 ? roundNumber((totalDisbursed / totalSanctioned) * 100, 1) : 0.0;

      // 2. Anomaly Breakdown
      const anomalyQuery = `
        SELECT a.anomaly_type, COUNT(*) AS count, ROUND(AVG(a.confidence_score)::numeric, 2) AS avg_confidence
        FROM anomaly_logs a
        JOIN projects p ON a.project_id = p.id
        ${whereClause}
        GROUP BY a.anomaly_type
        ORDER BY count DESC;
      `;
      const anomalyRes = await db.query(anomalyQuery, params);

      // 3. State-Level Breakdown & Rankings
      const stateQuery = `
        SELECT 
          p.state,
          COUNT(*) AS project_count,
          SUM(p.sanction_amount) AS sanctioned,
          SUM(p.disbursed_amount) AS disbursed,
          COUNT(*) FILTER (WHERE p.is_flagged = TRUE) AS flagged_count,
          ROUND((SUM(p.disbursed_amount) / NULLIF(SUM(p.sanction_amount), 0) * 100)::numeric, 1) AS utilization_rate
        FROM projects p
        GROUP BY p.state
        ORDER BY sanctioned DESC;
      `;
      const stateRes = await db.query(stateQuery);

      // 4. District-Level Highlights (Top 10 by Red Flags)
      const districtQuery = `
        SELECT 
          p.state,
          p.district,
          COUNT(*) AS project_count,
          COUNT(*) FILTER (WHERE p.is_flagged = TRUE) AS flagged_count,
          ROUND((COUNT(*) FILTER (WHERE p.is_flagged = TRUE)::numeric / COUNT(*) * 100), 1) AS flagged_rate,
          SUM(p.sanction_amount) AS total_sanctioned
        FROM projects p
        GROUP BY p.state, p.district
        ORDER BY flagged_count DESC, project_count DESC
        LIMIT 10;
      `;
      const districtRes = await db.query(districtQuery);

      return res.status(200).json({
        success: true,
        metrics: {
          total_projects: parseInt(totals.total_projects, 10),
          total_sanctioned_inr: totalSanctioned,
          total_disbursed_inr: totalDisbursed,
          fund_utilization_pct: utilizationRate,
          red_flag_count: parseInt(totals.red_flag_count, 10),
          red_flag_rate_pct: totals.total_projects > 0 ? roundNumber((totals.red_flag_count / totals.total_projects) * 100, 1) : 0,
          completed_projects: parseInt(totals.completed_count, 10),
          in_progress_projects: parseInt(totals.in_progress_count, 10),
          stalled_projects: parseInt(totals.stalled_count, 10),
          average_risk_score: parseFloat(totals.average_risk_score || 0),
        },
        anomaly_distribution: anomalyRes.rows,
        state_rankings: stateRes.rows,
        district_hotspots: districtRes.rows,
      });
    } catch (err) {
      console.error('[GetMacroMetrics Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to compute analytics.',
        details: err.message,
      });
    }
  },

  /**
   * GET /api/analytics/geojson
   * Returns a GeoJSON FeatureCollection of all projects with coordinates, risk score,
   * status, and flag status for Leaflet map rendering.
   */
  async getProjectsGeoJSON(req, res) {
    try {
      const { state, district, is_flagged, status } = req.query;
      const conditions = ['p.latitude IS NOT NULL', 'p.longitude IS NOT NULL'];
      const params = [];
      let idx = 1;

      if (state) {
        conditions.push(`p.state ILIKE $${idx++}`);
        params.push(state);
      }
      if (district) {
        conditions.push(`p.district ILIKE $${idx++}`);
        params.push(district);
      }
      if (is_flagged !== undefined) {
        conditions.push(`p.is_flagged = $${idx++}`);
        params.push(is_flagged === 'true' || is_flagged === true);
      }
      if (status) {
        conditions.push(`p.status = $${idx++}`);
        params.push(status.toUpperCase());
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const geoQuery = `
        SELECT 
          p.id, p.project_code, p.title, p.work_category, p.state, p.district,
          p.sanction_amount, p.disbursed_amount, p.physical_progress_pct,
          p.agency_name, ct.name AS contractor_name,
          p.latitude, p.longitude, p.status, p.risk_score, p.is_flagged
        FROM projects p
        LEFT JOIN contractors ct ON p.contractor_id = ct.id
        ${whereClause}
        ORDER BY p.risk_score DESC;
      `;

      const geoResult = await db.query(geoQuery, params);

      const features = geoResult.rows.map((row) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.longitude, row.latitude], // GeoJSON standard: [lon, lat]
        },
        properties: {
          id: row.id,
          project_code: row.project_code,
          title: row.title,
          work_category: row.work_category,
          state: row.state,
          district: row.district,
          sanction_amount: parseFloat(row.sanction_amount),
          disbursed_amount: parseFloat(row.disbursed_amount),
          physical_progress_pct: row.physical_progress_pct,
          agency_name: row.agency_name,
          contractor_name: row.contractor_name || 'Unassigned',
          status: row.status,
          risk_score: parseFloat(row.risk_score),
          is_flagged: row.is_flagged,
        },
      }));

      const featureCollection = {
        type: 'FeatureCollection',
        count: features.length,
        features,
      };

      return res.status(200).json(featureCollection);
    } catch (err) {
      console.error('[GetProjectsGeoJSON Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to construct GeoJSON dataset.',
        details: err.message,
      });
    }
  },
};

function roundNumber(value, decimals = 2) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

module.exports = analyticsController;
