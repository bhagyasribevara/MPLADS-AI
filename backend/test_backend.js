/**
 * Comprehensive Automated Test Suite for Node.js / Express Backend & RBAC Gateway
 * Tests all core routes, authentication, role-based access control (RBAC),
 * ML service integration, analytics, and alert updates.
 */

const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');

let server;
let port;
let baseUrl;

const tokens = {
  ministry: null,
  collector: null,
  mp: null,
  agency: null,
  citizen: null,
};

// Helper function to send HTTP requests using Node built-in http
function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    };

    let postData = null;
    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        postData = body;
      } else {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      }
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log('    RUNNING BACKEND GATEWAY & RBAC INTEGRATION TEST SUITE');
  console.log('======================================================================\n');

  // Start test server on random available port
  server = app.listen(0);
  port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[+] Test server listening on ${baseUrl}\n`);

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Health Check
    // -----------------------------------------------------------------------
    console.log('[TEST 1] Testing GET /health...');
    const healthRes = await request('GET', '/health');
    console.log(`  [✓] Health Status: ${healthRes.status} | Service: ${healthRes.data.service}`);
    if (healthRes.status !== 200) throw new Error('Health check failed');

    // -----------------------------------------------------------------------
    // TEST 2: Authentication across Roles
    // -----------------------------------------------------------------------
    console.log('\n[TEST 2] Testing POST /api/auth/login across 5 role tiers...');
    const userCredentials = [
      { role: 'ministry', email: 'admin.ministry@mplads.gov.in' },
      { role: 'collector', email: 'collector.dharwad@mplads.gov.in' },
      { role: 'mp', email: 'mp.dharwad@sansad.nic.in' },
      { role: 'agency', email: 'agency.pwd@mplads.gov.in' },
      { role: 'citizen', email: 'citizen.auditor@mplads.gov.in' },
    ];

    for (const cred of userCredentials) {
      const loginRes = await request('POST', '/api/auth/login', {}, {
        email: cred.email,
        password: 'MPLADS@Secure2025!',
      });
      if (loginRes.status !== 200 || !loginRes.data.token) {
        throw new Error(`Login failed for ${cred.email}: ${JSON.stringify(loginRes.data)}`);
      }
      tokens[cred.role] = loginRes.data.token;
      console.log(`  [✓] Authenticated ${cred.role.toUpperCase()} (${cred.email}) -> Role: ${loginRes.data.user.role}`);
    }

    // -----------------------------------------------------------------------
    // TEST 3: User Profile Lookup (GET /api/auth/me)
    // -----------------------------------------------------------------------
    console.log('\n[TEST 3] Testing GET /api/auth/me...');
    const meRes = await request('GET', '/api/auth/me', {
      Authorization: `Bearer ${tokens.collector}`,
    });
    console.log(`  [✓] Profile verified: ${meRes.data.user.full_name} | Role: ${meRes.data.user.role} | District: ${meRes.data.user.district}`);
    if (meRes.status !== 200) throw new Error('Profile lookup failed');

    // -----------------------------------------------------------------------
    // TEST 4: RBAC Security Guard Enforcement (Forbidden 403 Tests)
    // -----------------------------------------------------------------------
    console.log('\n[TEST 4] Testing RBAC Security Guard (Permission Boundaries)...');
    
    // 4a. Citizen attempting to submit project recommendation (Forbidden)
    const citizenProjRes = await request('POST', '/api/projects', {
      Authorization: `Bearer ${tokens.citizen}`,
    }, { title: 'Unauthorized Citizen Proposal' });
    console.log(`  [✓] Citizen POST /api/projects blocked with: ${citizenProjRes.status} (Expected: 403)`);
    if (citizenProjRes.status !== 403) throw new Error('RBAC failed: Citizen was not blocked from submitting project');

    // 4b. MP attempting to verify milestone (Forbidden - Collector only)
    const mpVerifyRes = await request('PUT', '/api/milestones/00000000-0000-0000-0000-000000000000/verify', {
      Authorization: `Bearer ${tokens.mp}`,
    }, { verified: true });
    console.log(`  [✓] MP PUT /api/milestones/:id/verify blocked with: ${mpVerifyRes.status} (Expected: 403)`);
    if (mpVerifyRes.status !== 403) throw new Error('RBAC failed: MP was not blocked from verifying milestone');

    // -----------------------------------------------------------------------
    // TEST 5: Project Scoped Listing (GET /api/projects)
    // -----------------------------------------------------------------------
    console.log('\n[TEST 5] Testing GET /api/projects with RBAC scoping...');
    
    // Collector scoping (Dharwad district)
    const collectorProjRes = await request('GET', '/api/projects?limit=5', {
      Authorization: `Bearer ${tokens.collector}`,
    });
    console.log(`  [✓] Collector projects returned: ${collectorProjRes.data.projects.length} / ${collectorProjRes.data.pagination.total} total`);
    if (collectorProjRes.status !== 200) throw new Error('Get projects failed');

    // National scoping (Ministry)
    const ministryProjRes = await request('GET', '/api/projects?status=IN_PROGRESS&limit=5', {
      Authorization: `Bearer ${tokens.ministry}`,
    });
    console.log(`  [✓] Ministry national in-progress count: ${ministryProjRes.data.pagination.total}`);

    // -----------------------------------------------------------------------
    // TEST 6: Project Recommendation & ML Screening (POST /api/projects)
    // -----------------------------------------------------------------------
    console.log('\n[TEST 6] Testing POST /api/projects with automated ML duplicate & anomaly screening...');
    
    // Fetch a sample constituency ID from database
    const constRes = await db.query("SELECT id, state, name FROM constituencies WHERE state = 'Karnataka' LIMIT 1;");
    const constId = constRes.rows[0].id;

    const newProjectPayload = {
      title: 'Construction of Multi-utility Community Training Hall and RO unit at Hebbal Ward 3',
      work_category: 'Construction of buildings for community cultural activities',
      state: 'Karnataka',
      district: 'Dharwad',
      constituency_id: constId,
      sanction_amount: 2200000.0,
      latitude: 15.4600,
      longitude: 75.0100,
      agency_name: 'Karnataka Rural Infrastructure Dev Ltd (KRIDL)',
    };

    const createProjRes = await request('POST', '/api/projects', {
      Authorization: `Bearer ${tokens.mp}`,
    }, newProjectPayload);

    console.log(`  [✓] Recommendation Response: ${createProjRes.status} | Code: ${createProjRes.data.project.project_code}`);
    console.log(`  [✓] ML Duplicate Screened: is_duplicate=${createProjRes.data.ml_screening?.duplicate_analysis?.is_duplicate}`);
    console.log(`  [✓] ML Anomaly Screened: anomaly_type=${createProjRes.data.ml_screening?.anomaly_analysis?.anomaly_type}`);
    if (createProjRes.status !== 201) throw new Error('Project creation failed');

    const createdProjectId = createProjRes.data.project.id;

    // -----------------------------------------------------------------------
    // TEST 7: Detailed Project Ledger View (GET /api/projects/:id)
    // -----------------------------------------------------------------------
    console.log('\n[TEST 7] Testing GET /api/projects/:id (ledger view)...');
    const detailRes = await request('GET', `/api/projects/${createdProjectId}`, {
      Authorization: `Bearer ${tokens.citizen}`,
    });
    console.log(`  [✓] Project Details: ${detailRes.data.project.title}`);
    console.log(`  [✓] Milestones Ledger count: ${detailRes.data.project.milestones.length}`);
    console.log(`  [✓] Anomaly Logs count: ${detailRes.data.project.anomaly_logs.length}`);
    if (detailRes.status !== 200) throw new Error('Get project details failed');

    // -----------------------------------------------------------------------
    // TEST 8: Milestone Creation & Verification Flow
    // -----------------------------------------------------------------------
    console.log('\n[TEST 8] Testing Milestone upload (Agency) and approval (District Collector)...');
    
    // 8a. Agency creates milestone
    const milestonePayload = {
      project_id: createdProjectId,
      stage_name: 'Stage 1: DPR Approval & Site Handover',
      claimed_pct: 20,
      fund_released: 440000.0,
      inspection_notes: 'Site surveyed, boundary cleared, soil test certified.',
    };

    const createMileRes = await request('POST', '/api/milestones', {
      Authorization: `Bearer ${tokens.agency}`,
    }, milestonePayload);

    console.log(`  [✓] Agency Milestone Upload: ${createMileRes.status} | Stage: ${createMileRes.data.milestone.stage_name}`);
    if (createMileRes.status !== 201) throw new Error('Milestone creation failed');

    const createdMilestoneId = createMileRes.data.milestone.id;

    // 8b. Collector verifies milestone
    const verifyMileRes = await request('PUT', `/api/milestones/${createdMilestoneId}/verify`, {
      Authorization: `Bearer ${tokens.collector}`,
    }, {
      verified: true,
      inspection_notes: 'Collector on-site physical verification completed. Work certified.',
      fund_released: 440000.0,
    });

    console.log(`  [✓] Collector Milestone Approval: ${verifyMileRes.status} | Verified: ${verifyMileRes.data.milestone.verified}`);
    if (verifyMileRes.status !== 200 || !verifyMileRes.data.milestone.verified) {
      throw new Error('Milestone verification failed');
    }

    // -----------------------------------------------------------------------
    // TEST 9: Macro Analytics & GeoJSON
    // -----------------------------------------------------------------------
    console.log('\n[TEST 9] Testing Analytics & GeoJSON endpoints...');
    
    // 9a. Macro Analytics
    const analyticsRes = await request('GET', '/api/analytics');
    const metrics = analyticsRes.data.metrics;
    console.log(`  [✓] Macro KPIs:`);
    console.log(`      Total Projects:    ${metrics.total_projects}`);
    console.log(`      Total Sanctioned:  ₹${(metrics.total_sanctioned_inr/10000000).toFixed(2)} Cr`);
    console.log(`      Fund Utilization:  ${metrics.fund_utilization_pct}%`);
    console.log(`      Red Flag Count:    ${metrics.red_flag_count} (${metrics.red_flag_rate_pct}%)`);
    console.log(`      Top States:        ${analyticsRes.data.state_rankings.map(s => s.state).slice(0, 3).join(', ')}`);
    if (analyticsRes.status !== 200) throw new Error('Analytics failed');

    // 9b. GeoJSON FeatureCollection
    const geojsonRes = await request('GET', '/api/analytics/geojson');
    console.log(`  [✓] GeoJSON Type: ${geojsonRes.data.type} | Total Features: ${geojsonRes.data.count}`);
    if (geojsonRes.data.features.length > 0) {
      const sample = geojsonRes.data.features[0];
      console.log(`      Sample Feature: ${sample.properties.project_code} at [${sample.geometry.coordinates.join(', ')}]`);
    }
    if (geojsonRes.status !== 200 || geojsonRes.data.type !== 'FeatureCollection') {
      throw new Error('GeoJSON failed');
    }

    // -----------------------------------------------------------------------
    // TEST 10: Vigilance Alerts & Status Transition
    // -----------------------------------------------------------------------
    console.log('\n[TEST 10] Testing Vigilance Alerts (GET /api/alerts & PUT /api/alerts/:id/status)...');
    
    // 10a. List Alerts
    const alertsRes = await request('GET', '/api/alerts?status=OPEN&limit=5', {
      Authorization: `Bearer ${tokens.ministry}`,
    });
    console.log(`  [✓] Open Alerts Count: ${alertsRes.data.pagination.total}`);
    if (alertsRes.status !== 200 || alertsRes.data.alerts.length === 0) {
      throw new Error('Alerts listing failed');
    }

    const testAlert = alertsRes.data.alerts[0];
    console.log(`      Testing Alert ID: ${testAlert.alert_id} | Type: ${testAlert.anomaly_type}`);

    // 10b. Update Alert Status to INVESTIGATING
    const updateAlertRes = await request('PUT', `/api/alerts/${testAlert.alert_id}/status`, {
      Authorization: `Bearer ${tokens.collector}`,
    }, {
      status: 'INVESTIGATING',
      notes: 'Collectorate Vigilance Taskforce dispatched to site for boundary audit.',
    });

    console.log(`  [✓] Alert Status Updated: ${updateAlertRes.status} | New Status: ${updateAlertRes.data.alert.status}`);
    if (updateAlertRes.status !== 200 || updateAlertRes.data.alert.status !== 'INVESTIGATING') {
      throw new Error('Alert status update failed');
    }

    console.log('\n' + '='.repeat(70));
    console.log('   [SUCCESS] ALL 10 BACKEND & RBAC INTEGRATION TESTS PASSED!');
    console.log('='.repeat(70));
  } finally {
    if (server) {
      server.close();
    }
    await db.pool.end();
  }
}

runTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  if (server) server.close();
  process.exit(1);
});
