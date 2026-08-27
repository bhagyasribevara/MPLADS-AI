# Phase 2: Python FastAPI ML Anomaly & Detection Microservice

The **MPLADS ML Microservice** provides real-time fraud analytics, semantic vector duplicate search, geospatial collision screening, timeline delay forecasting, perceptual image hashing verification, and LLM-powered executive audit summaries.

---

## 1. Directory Structure

```
ml-service/
├── main.py                     # FastAPI application entrypoint with CORS & health check
├── config.py                   # Environment settings & resilient PostgreSQL connection helper
├── requirements.txt            # Python dependencies
├── routes/
│   ├── __init__.py             # Router aggregator mounting endpoints under /api/ml
│   ├── duplicate.py            # POST /api/ml/detect-duplicate
│   ├── anomaly.py              # POST /api/ml/score-anomaly
│   ├── timeline.py             # POST /api/ml/predict-delay
│   ├── milestone.py            # POST /api/ml/verify-milestone
│   └── audit.py                # POST /api/ml/explain-risk
├── services/
│   ├── duplicate_engine.py     # SentenceTransformers + pgvector (<0.15) & PostGIS (<200m)
│   ├── cost_anomaly.py         # Isolation Forest & statistical z-score outlier analysis
│   ├── timeline_predictor.py   # XGBoost delay regressor (budget, agency, season)
│   ├── image_verifier.py       # Perceptual hashing (imagehash.phash) & Hamming distance
│   └── audit_agent.py          # Google GenAI (Gemini) + Groq fallback + rule synthesis
└── test_api.py                 # Automated integration test suite for all 5 endpoints
```

---

## 2. ML Services & Models Reference

| Service | Model / Algorithm | Threshold / Parameters | Purpose |
|---------|-------------------|------------------------|---------|
| **Duplicate Engine** | `sentence-transformers/all-MiniLM-L6-v2` + PostGIS | Cosine dist $< 0.15$, Distance $< 200\text{m}$ | Identifies identical/overlapping civil works |
| **Cost Anomaly** | `IsolationForest` + Statistical Z-Score / IQR | Ratio gap $> 0.40$, Cost multiplier $\ge 3.2\times$ | Flags Ghost projects and severe budget padding |
| **Timeline Predictor** | `XGBoostRegressor` | 100 estimators, max depth 4 | Forecasts execution delays in days/months |
| **Image Verifier** | `imagehash.phash` (64-bit) | Hamming distance $\le 8$ bits | Detects recycled inspection site photos |
| **Audit Agent** | Google GenAI (`gemini-3.6-flash`/`gemini-2.5-flash`) | Fallback: Groq $\to$ Rule synthesis | Generates authoritative 2-sentence executive briefs |

---

## 3. How to Run the ML Microservice

### Start the Microservice
From the repository root:
```bash
python ml-service/main.py
```
Or with Uvicorn:
```bash
uvicorn main:app --app-dir ml-service --host 0.0.0.0 --port 8001 --reload
```
Interactive Swagger API documentation is available at:
`http://127.0.0.1:8001/docs`

---

## 4. API Endpoints & Sample Payloads

### 1. Health Check
```bash
curl -X GET http://127.0.0.1:8001/api/ml/health
```

### 2. Duplicate Detection
`POST /api/ml/detect-duplicate`
```bash
curl -X POST http://127.0.0.1:8001/api/ml/detect-duplicate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Construction of CC Road with side drainage from Panchayat Bhavan to Primary School, Ward 4",
    "lat": 18.574709,
    "lng": 73.855343,
    "max_cosine_distance": 0.15,
    "max_distance_meters": 200.0
  }'
```

### 3. Financial Anomaly Scoring
`POST /api/ml/score-anomaly`
```bash
curl -X POST http://127.0.0.1:8001/api/ml/score-anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "sanction_amount": 5000000.0,
    "disbursed_amount": 4800000.0,
    "physical_progress": 8,
    "work_category": "Construction of roads, link roads, pathways"
  }'
```

### 4. Timeline Delay Prediction
`POST /api/ml/predict-delay`
```bash
curl -X POST http://127.0.0.1:8001/api/ml/predict-delay \
  -H "Content-Type: application/json" \
  -d '{
    "sanction_amount": 7500000.0,
    "agency_name": "Public Works Department (PWD)",
    "work_category": "Construction of culverts and bridges",
    "season": "MONSOON"
  }'
```

### 5. Milestone Image Verification
`POST /api/ml/verify-milestone`
```bash
curl -X POST http://127.0.0.1:8001/api/ml/verify-milestone \
  -F "image_file=@site_inspection.jpg" \
  -F "project_id=c144e5d8-323f-42e1-a083-d510258169fe"
```

### 6. Executive Audit Explanation
`POST /api/ml/explain-risk`
```bash
curl -X POST http://127.0.0.1:8001/api/ml/explain-risk \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": null,
    "anomaly_details": {
      "project_code": "WS/MP29/2024-2025/001001",
      "title": "Water treatment plant near Nagpur",
      "anomaly_type": "GHOST_PROJECT",
      "sanction_amount": 5000000.0,
      "disbursed_amount": 4800000.0,
      "physical_progress": 8,
      "district": "Dharwad",
      "state": "Karnataka"
    }
  }'
```

---

## 5. Automated Verification Test Suite

Run the automated integration tests across all 5 endpoints:
```bash
python ml-service/test_api.py
```
Expected output:
```
======================================================================
   [SUCCESS] ALL 5 ML MICROSERVICE ROUTES PASSED AUTOMATED AUDIT!
======================================================================
```
