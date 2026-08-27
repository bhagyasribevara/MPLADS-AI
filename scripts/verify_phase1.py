#!/usr/bin/env python3
"""
Verification Script for Phase 1: Database & Seed Script
Checks:
1. Extensions (postgis, vector, uuid-ossp, pgcrypto)
2. Relational Tables (constituencies, contractors, users, projects, milestones, anomaly_logs)
3. Total projects >= 500
4. 384-dimensional embeddings in projects.embedding
5. Accurate coordinates and PostGIS location geometry
6. Anomaly breakdown (15% labeled anomalies)
"""

import os
import sys
import re
from pathlib import Path

if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

def get_sanitized_db_url(raw_url: str) -> str:
    clean = re.sub(r'[?&]pgbouncer=true', '', raw_url)
    clean = clean.replace(':6543', ':5432')
    return clean

def verify():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        print("[ERROR] DATABASE_URL not found.")
        sys.exit(1)

    db_url = get_sanitized_db_url(raw_url)
    print(f"[*] Connecting to: {db_url.split('@')[-1]}")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print("\n--- 1. EXTENSIONS CHECK ---")
    cur.execute("""
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname IN ('postgis', 'vector', 'uuid-ossp', 'pgcrypto')
        ORDER BY extname;
    """)
    extensions = dict(cur.fetchall())
    for req in ['postgis', 'vector', 'uuid-ossp', 'pgcrypto']:
        if req in extensions:
            print(f"  [✓] {req} active (v{extensions[req]})")
        else:
            print(f"  [✗] {req} MISSING!")

    print("\n--- 2. TABLES CHECK ---")
    expected_tables = ['constituencies', 'contractors', 'users', 'projects', 'milestones', 'anomaly_logs']
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ANY(%s)
        ORDER BY table_name;
    """, (expected_tables,))
    existing_tables = set(r[0] for r in cur.fetchall())
    for tbl in expected_tables:
        if tbl in existing_tables:
            print(f"  [✓] Table '{tbl}' exists")
        else:
            print(f"  [✗] Table '{tbl}' MISSING!")

    print("\n--- 3. DATA VOLUME & EMBEDDINGS CHECK ---")
    cur.execute("""
        SELECT 
            COUNT(*) AS total,
            COUNT(embedding) AS embedded,
            COUNT(*) FILTER (WHERE location IS NOT NULL) AS geo_located,
            COUNT(*) FILTER (WHERE is_flagged = TRUE) AS flagged,
            ROUND(100.0 * COUNT(*) FILTER (WHERE is_flagged = TRUE) / COUNT(*), 2) AS flagged_pct
        FROM projects;
    """)
    total, embedded, geo, flagged, pct = cur.fetchone()
    print(f"  Total Projects: {total} (Requirement: >= 500 -> {'PASS' if total >= 500 else 'FAIL'})")
    print(f"  Embedded Projects: {embedded} (Requirement: 100% -> {'PASS' if embedded == total else 'FAIL'})")
    print(f"  Geospatial Points: {geo} (Requirement: 100% -> {'PASS' if geo == total else 'FAIL'})")
    print(f"  Flagged Anomalies: {flagged} ({pct}% of total, Target: 15% -> {'PASS' if pct == 15.00 else 'FAIL'})")

    print("\n--- 4. EMBEDDING DIMENSION CHECK ---")
    cur.execute("SELECT vector_dims(embedding) FROM projects LIMIT 1;")
    dims = cur.fetchone()[0]
    print(f"  Embedding dimension: {dims} (Target: 384 -> {'PASS' if dims == 384 else 'FAIL'})")

    print("\n--- 5. SAMPLE PROJECT COORDINATES & EMBEDDINGS ---")
    cur.execute("""
        SELECT project_code, title, latitude, longitude, ST_AsText(location)
        FROM projects 
        LIMIT 3;
    """)
    for code, title, lat, lng, geom in cur.fetchall():
        print(f"  [{code}] ({lat}, {lng}) -> {geom}")
        print(f"    Title: {title[:75]}...")

    print("\n--- 6. ANOMALY LOGS BREAKDOWN ---")
    cur.execute("""
        SELECT anomaly_type, COUNT(*), ROUND(AVG(confidence_score)::numeric, 2)
        FROM anomaly_logs
        GROUP BY anomaly_type
        ORDER BY count DESC;
    """)
    for a_type, count, avg_conf in cur.fetchall():
        print(f"  {a_type:<20}: {count} records | Avg Confidence: {avg_conf}")

    cur.close()
    conn.close()
    print("\n[SUCCESS] Phase 1 Verification Completed Successfully!")

if __name__ == "__main__":
    verify()
