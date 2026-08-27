#!/usr/bin/env python3
"""
MPLADS Monitoring Platform - Database Migration Runner
Executes scripts/schema.sql against Supabase PostgreSQL.
Handles connection parameters, PostGIS, pgvector, and table verifications.
"""

import os
import sys
import re
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

def get_sanitized_db_url(raw_url: str) -> str:
    """
    Cleans up Supabase connection string for psycopg2 compatibility.
    Removes pgbouncer query parameter and defaults to session port 5432 for DDL.
    """
    if not raw_url:
        raise ValueError("DATABASE_URL environment variable is not set.")
    
    clean_url = re.sub(r'[?&]pgbouncer=true', '', raw_url)
    clean_url = clean_url.replace(':6543', ':5432')
    return clean_url

def run_migrations():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        print("[ERROR] DATABASE_URL not found in .env or backend/.env.")
        sys.exit(1)

    db_url = get_sanitized_db_url(raw_url)
    schema_path = BASE_DIR / "scripts" / "schema.sql"

    if not schema_path.exists():
        print(f"[ERROR] Schema file not found at: {schema_path}")
        sys.exit(1)

    print(f"[*] Connecting to database at: {db_url.split('@')[-1]}")
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        print("[+] Connected successfully to PostgreSQL!")
    except Exception as e:
        print(f"[!] Notice: Port 5432 attempt: {e}")
        fallback_url = re.sub(r'[?&]pgbouncer=true', '', raw_url)
        try:
            print(f"[*] Retrying with pooler port (6543): {fallback_url.split('@')[-1]}")
            conn = psycopg2.connect(fallback_url)
            conn.autocommit = True
            cur = conn.cursor()
            print("[+] Connected successfully via pooler!")
        except Exception as e2:
            print(f"[FATAL] Connection failed: {e2}")
            sys.exit(1)

    print(f"[*] Reading schema from {schema_path.name}...")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    print("[*] Executing migration statements...")
    try:
        cur.execute(schema_sql)
        print("[+] schema.sql executed successfully!")
    except Exception as e:
        print(f"[ERROR] Failed executing schema.sql: {e}")
        cur.close()
        conn.close()
        sys.exit(1)

    # Verification of created extensions
    print("\n[*] Verifying installed extensions...")
    cur.execute("""
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname IN ('postgis', 'vector', 'uuid-ossp', 'pgcrypto')
        ORDER BY extname;
    """)
    for ext, ver in cur.fetchall():
        print(f"    - Extension: {ext} (v{ver})")

    # Verification of created tables
    print("\n[*] Verifying created tables...")
    expected_tables = ['constituencies', 'contractors', 'users', 'projects', 'milestones', 'anomaly_logs']
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ANY(%s)
        ORDER BY table_name;
    """, (expected_tables,))
    created_tables = [row[0] for row in cur.fetchall()]
    all_ok = True
    for tbl in expected_tables:
        if tbl in created_tables:
            print(f"    - Table '{tbl}': [OK]")
        else:
            print(f"    - Table '{tbl}': [MISSING!]")
            all_ok = False

    # Verification of indexes
    print("\n[*] Verifying spatial & vector indexes...")
    cur.execute("""
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND indexname IN ('idx_projects_location', 'idx_projects_embedding_hnsw');
    """)
    indexes = cur.fetchall()
    for idx, tbl in indexes:
        print(f"    - Index '{idx}' on table '{tbl}': [OK]")

    # Verification of spatial sync trigger
    print("\n[*] Verifying triggers...")
    cur.execute("""
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table = 'projects' AND trigger_name = 'trg_sync_project_location';
    """)
    triggers = cur.fetchall()
    for trg, event, tbl in triggers:
        print(f"    - Trigger '{trg}' ({event}) on table '{tbl}': [OK]")

    cur.close()
    conn.close()

    if all_ok:
        print("\n[SUCCESS] Database Migration verified and ready for data seeding!")
    else:
        print("\n[WARNING] Some tables were not created.")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations()
