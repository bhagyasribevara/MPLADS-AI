"""
Comprehensive Test Suite for ML Microservice Endpoints
Tests all 5 required API routes using FastAPI TestClient:
1. POST /api/ml/detect-duplicate
2. POST /api/ml/score-anomaly
3. POST /api/ml/predict-delay
4. POST /api/ml/verify-milestone
5. POST /api/ml/explain-risk
"""

import sys
import io
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add ml-service to Python path
CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from main import app

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("      RUNNING ML ANOMALY & DETECTION MICROSERVICE TEST SUITE")
    print("=" * 70)

    # 1. Health Check
    print("\n[TEST 1] Testing GET /api/ml/health...")
    res = client.get("/api/ml/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    health_data = res.json()
    print(f"  [✓] Health Status: {health_data['status']}")
    print(f"  [✓] Database Connected: {health_data['database_connected']}")
    print(f"  [✓] Total Projects in DB: {health_data['total_projects_in_db']}")

    # 2. Duplicate Detection
    print("\n[TEST 2] Testing POST /api/ml/detect-duplicate...")
    dup_payload = {
        "title": "Construction of CC Road with side drainage from Panchayat Bhavan to Primary School, Ward 4",
        "lat": 18.574709,
        "lng": 73.855343,
        "max_cosine_distance": 0.25,
        "max_distance_meters": 200.0
    }
    res = client.post("/api/ml/detect-duplicate", json=dup_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    dup_data = res.json()
    print(f"  [✓] Duplicate Detected: {dup_data['is_duplicate']}")
    print(f"  [✓] Risk Score: {dup_data['duplicate_risk_score']}")
    print(f"  [✓] Total Matches: {dup_data['total_matches']}")
    print(f"  [✓] Explanation: {dup_data['explanation'][:90]}...")
    if dup_data["matches"]:
        top = dup_data["matches"][0]
        print(f"      Top Match: {top['title'][:55]}... ({top['distance_meters']}m, Sim: {top['cosine_similarity']*100:.1f}%)")
    assert dup_data["is_duplicate"] is True

    # 3. Anomaly Scoring (Ghost Project & Cost Overrun & Normal)
    print("\n[TEST 3] Testing POST /api/ml/score-anomaly...")
    
    # 3a. Ghost project test
    ghost_payload = {
        "sanction_amount": 5000000.0,
        "disbursed_amount": 4800000.0,  # 96% disbursed
        "physical_progress": 8,         # 8% progress
        "work_category": "Construction of roads, link roads, pathways"
    }
    res_ghost = client.post("/api/ml/score-anomaly", json=ghost_payload)
    assert res_ghost.status_code == 200
    ghost_data = res_ghost.json()
    print(f"  [✓] Ghost Project Anomaly Type: {ghost_data['anomaly_type']}")
    print(f"      Risk Level: {ghost_data['risk_level']} | Confidence: {ghost_data['confidence_score']}")
    print(f"      Explanation: {ghost_data['explanation'][:85]}...")
    assert ghost_data["is_anomalous"] is True
    assert ghost_data["anomaly_type"] == "GHOST_PROJECT"

    # 3b. Cost overrun test
    overrun_payload = {
        "sanction_amount": 8500000.0,  # 4.25x of 20L median
        "disbursed_amount": 4250000.0,
        "physical_progress": 50,
        "work_category": "Construction of buildings for community cultural activities"
    }
    res_overrun = client.post("/api/ml/score-anomaly", json=overrun_payload)
    assert res_overrun.status_code == 200
    overrun_data = res_overrun.json()
    print(f"  [✓] Cost Overrun Anomaly Type: {overrun_data['anomaly_type']}")
    print(f"      Multiplier: {overrun_data['cost_multiplier']}x | Z-Score: {overrun_data['z_score']}")
    assert overrun_data["is_anomalous"] is True

    # 3c. Normal work test
    normal_payload = {
        "sanction_amount": 1200000.0,
        "disbursed_amount": 600000.0,
        "physical_progress": 50,
        "work_category": "Construction of roads, link roads, pathways"
    }
    res_normal = client.post("/api/ml/score-anomaly", json=normal_payload)
    assert res_normal.status_code == 200
    normal_data = res_normal.json()
    print(f"  [✓] Normal Project Anomaly Type: {normal_data['anomaly_type']} (is_anomalous={normal_data['is_anomalous']})")
    assert normal_data["is_anomalous"] is False

    # 4. Timeline Delay Prediction
    print("\n[TEST 4] Testing POST /api/ml/predict-delay...")
    delay_payload = {
        "sanction_amount": 7500000.0,
        "agency_name": "Public Works Department (PWD)",
        "work_category": "Construction of culverts and bridges",
        "season": "MONSOON"
    }
    res_delay = client.post("/api/ml/predict-delay", json=delay_payload)
    assert res_delay.status_code == 200
    delay_data = res_delay.json()
    print(f"  [✓] Predicted Delay: {delay_data['predicted_delay_days']} days ({delay_data['predicted_delay_months']} months)")
    print(f"  [✓] Projected Duration: {delay_data['projected_total_duration_months']} months")
    print(f"  [✓] Risk Level: {delay_data['delay_risk_level']}")
    print(f"  [✓] Contributing Factors: {delay_data['driving_risk_factors']}")

    # 5. Milestone Image Verification
    print("\n[TEST 5] Testing POST /api/ml/verify-milestone...")
    # Create test image in memory
    img = Image.new("RGB", (300, 300), color=(73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    files = {"image_file": ("test_site_inspection.jpg", img_bytes, "image/jpeg")}
    form_data = {"project_id": "00000000-0000-0000-0000-000000000000"}

    res_img = client.post("/api/ml/verify-milestone", files=files, data=form_data)
    assert res_img.status_code == 200, f"Error: {res_img.text}"
    img_data = res_img.json()
    print(f"  [✓] Image pHash: {img_data['image_phash']}")
    print(f"  [✓] Verdict: {img_data['verdict']}")
    print(f"  [✓] Min Hamming Distance: {img_data['min_hamming_distance']} bits")
    print(f"  [✓] Explanation: {img_data['explanation'][:80]}...")

    # 6. Audit Explanation Generation
    print("\n[TEST 6] Testing POST /api/ml/explain-risk...")
    audit_payload = {
        "project_id": None,
        "anomaly_details": {
            "project_code": "WS/MP29/2024-2025/001001",
            "title": "Water treatment plant and public distribution pipeline near Nagpur",
            "anomaly_type": "GHOST_PROJECT",
            "sanction_amount": 5000000.0,
            "disbursed_amount": 4800000.0,
            "physical_progress": 8,
            "district": "Dharwad",
            "state": "Karnataka"
        }
    }
    res_audit = client.post("/api/ml/explain-risk", json=audit_payload)
    assert res_audit.status_code == 200, f"Error: {res_audit.text}"
    audit_data = res_audit.json()
    print(f"  [✓] Engine Used: {audit_data['engine_used']}")
    print(f"  [✓] Executive Audit Explanation:")
    print(f"      \"{audit_data['executive_audit_explanation']}\"")

    print("\n" + "=" * 70)
    print("   [SUCCESS] ALL 5 ML MICROSERVICE ROUTES PASSED AUTOMATED AUDIT!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
