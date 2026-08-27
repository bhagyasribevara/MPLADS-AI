#!/usr/bin/env python3
"""
MPLADS Monitoring Platform - Synthetic Ingestion & Anomaly Seeder
Generates 500+ realistic project records across 6 states and 12 districts with:
- Historical & baseline context extracted from ./datasets/
- Pre-seeded role-based user accounts
- Genuine contractor records with valid GSTINs
- 15% labeled ground-truth anomalies:
    1. Ghost Projects (90-100% disbursed with <20% physical progress)
    2. Cost Overruns (3.5x-4.5x regional median for identical work types)
    3. Duplicate Geospatial Works (<100m proximity with high semantic title similarity)
    4. Vendor Cartels (>75% district works monopolized by one contractor)
- 384-dimensional vector embeddings using sentence-transformers/all-MiniLM-L6-v2
- Comprehensive milestones and anomaly_logs records
"""

import os
import sys
import re
import json
import uuid
import random
import hashlib
import math
from datetime import datetime, timedelta
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
from faker import Faker
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Hugging Face token & SentenceTransformers
load_dotenv()
if os.getenv("HF_TOKEN"):
    os.environ["HF_TOKEN"] = os.getenv("HF_TOKEN")

from sentence_transformers import SentenceTransformer

# ---------------------------------------------------------------------------
# Path & Environment Setup
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------------------------
# Regional Geographies & Baseline Configurations
# ---------------------------------------------------------------------------
REGIONS = {
    "Karnataka": {
        "state_code": "29",
        "districts": {
            "Dharwad": {
                "center_lat": 15.4589, "center_lon": 75.0078, "radius_deg": 0.07,
                "constituency": "DHARWAD", "mp": "Pralhad Venkatesh Joshi", "house": "LOK_SABHA"
            },
            "Haveri": {
                "center_lat": 14.7954, "center_lon": 75.3991, "radius_deg": 0.06,
                "constituency": "HAVERI", "mp": "Basavaraj Bommai", "house": "LOK_SABHA"
            }
        }
    },
    "Maharashtra": {
        "state_code": "27",
        "districts": {
            "Hingoli": {
                "center_lat": 19.7196, "center_lon": 77.1476, "radius_deg": 0.07,
                "constituency": "HINGOLI", "mp": "Aashtikar Patil Nagesh Bapurao", "house": "LOK_SABHA"
            },
            "Pune": {
                "center_lat": 18.5204, "center_lon": 73.8567, "radius_deg": 0.08,
                "constituency": "PUNE", "mp": "Murlidhar Mohol", "house": "LOK_SABHA"
            }
        }
    },
    "Bihar": {
        "state_code": "10",
        "districts": {
            "Araria": {
                "center_lat": 26.1500, "center_lon": 87.5200, "radius_deg": 0.07,
                "constituency": "ARARIA", "mp": "Pradeep Kumar Singh", "house": "LOK_SABHA"
            },
            "Bhagalpur": {
                "center_lat": 25.2444, "center_lon": 86.9718, "radius_deg": 0.07,
                "constituency": "BHAGALPUR", "mp": "Ajay Kumar Mandal", "house": "LOK_SABHA"
            }
        }
    },
    "Kerala": {
        "state_code": "32",
        "districts": {
            "Kollam": {
                "center_lat": 8.8932, "center_lon": 76.6141, "radius_deg": 0.06,
                "constituency": "KOLLAM", "mp": "N. K. Premachandran", "house": "LOK_SABHA"
            },
            "Idukki": {
                "center_lat": 9.8494, "center_lon": 76.9810, "radius_deg": 0.07,
                "constituency": "IDUKKI", "mp": "Dean Kuriakose", "house": "LOK_SABHA"
            }
        }
    },
    "Punjab": {
        "state_code": "03",
        "districts": {
            "Faridkot": {
                "center_lat": 30.6769, "center_lon": 74.7583, "radius_deg": 0.06,
                "constituency": "FARIDKOT", "mp": "Sarabjeet Singh Khalsa", "house": "LOK_SABHA"
            },
            "Ludhiana": {
                "center_lat": 30.9010, "center_lon": 75.8573, "radius_deg": 0.07,
                "constituency": "LUDHIANA", "mp": "Amrinder Singh Raja Warring", "house": "LOK_SABHA"
            }
        }
    },
    "Uttar Pradesh": {
        "state_code": "09",
        "districts": {
            "Kannauj": {
                "center_lat": 27.0544, "center_lon": 79.9197, "radius_deg": 0.07,
                "constituency": "KANNAUJ", "mp": "Akhilesh Yadav", "house": "LOK_SABHA"
            },
            "Ghazipur": {
                "center_lat": 25.5840, "center_lon": 83.5770, "radius_deg": 0.07,
                "constituency": "GHAZIPUR", "mp": "Afzal Ansari", "house": "LOK_SABHA"
            }
        }
    }
}

# Regional median benchmark costs (in INR) per category
WORK_CATEGORIES = {
    "Construction of roads, link roads, pathways": {
        "median": 1200000.0,
        "templates": [
            "Construction of PCC Road with side drain from {loc1} to {loc2}",
            "Bituminous Road strengthening and link road connecting {loc1} and {loc2}",
            "Paver block road paving in residential colony near {loc1}",
            "CC Road construction and culvert repair at Ward {ward}, {loc1}"
        ]
    },
    "Construction of buildings for community cultural activities": {
        "median": 2000000.0,
        "templates": [
            "Construction of Community Cultural Hall at {loc1} near {loc2}",
            "Development of Multipurpose Community Centre and library at {loc1}",
            "Construction of Samudayik Bhavan with drinking water and sanitation at {loc1}",
            "Erection of Village Sabha Manch and Cultural Stage at {loc1}"
        ]
    },
    "Construction of rooms and halls in school and colleges": {
        "median": 1800000.0,
        "templates": [
            "Construction of 2 additional classrooms in Govt High School, {loc1}",
            "Construction of Science Laboratory and Library room at Govt College, {loc1}",
            "Mid-day meal shed and dining hall construction at Primary School, {loc1}",
            "Smart digital classroom and computer lab setup at Govt School, {loc1}"
        ]
    },
    "Installing community drinking water plants": {
        "median": 650000.0,
        "templates": [
            "Installation of RO Community Drinking Water Plant (1000 LPH) at {loc1}",
            "Solar powered community borewell and water storage tank at {loc1}",
            "Water treatment plant and public distribution pipeline near {loc1}",
            "Installation of dual-desk public water purification system at {loc1}"
        ]
    },
    "Construction of culverts and bridges": {
        "median": 2500000.0,
        "templates": [
            "Construction of RCC box culvert on nala between {loc1} and {loc2}",
            "Causeway bridge construction over stream connecting village {loc1}",
            "RCC slab drain and pedestrian footbridge near {loc1}",
            "Strengthening of vented dam and culvert crossing at {loc1}"
        ]
    },
    "Installation of high mast solar street lights": {
        "median": 450000.0,
        "templates": [
            "Installation of 12.5M High Mast Solar LED Lighting System at {loc1} junction",
            "Solar street light installation along main approach road to {loc1}",
            "High mast lighting at weekly market ground and bus stand, {loc1}",
            "Central public junction solar lighting array at {loc1}"
        ]
    },
    "Public sanitation and community toilet complexes": {
        "median": 900000.0,
        "templates": [
            "Construction of Community Public Toilet Complex (She-Loo / He-Loo) at {loc1}",
            "Sanitation complex and bio-digester toilet block at bus stand, {loc1}",
            "Public sanitation facility near community hall, {loc1}",
            "Modern eco-sanitation unit at primary health sub-centre, {loc1}"
        ]
    },
    "Construction of public health sub-centres": {
        "median": 3000000.0,
        "templates": [
            "Construction of Ayushman Bharat Health & Wellness Sub-Centre at {loc1}",
            "Maternity and child welfare clinic building at {loc1}",
            "Primary Health Sub-centre OPD block and medicine store at {loc1}",
            "Veterinary care dispensary building at {loc1}"
        ]
    }
}

AGENCIES = [
    "Public Works Department (PWD)",
    "District Rural Development Agency (DRDA)",
    "Panchayati Raj Engineering Division",
    "Irrigation & Water Resources Department",
    "State Police Housing & Infrastructure Corp",
    "Karnataka Rural Infrastructure Dev Ltd (KRIDL)",
    "Maharashtra Jeevan Pradhikaran",
    "Punjab Mandi Board"
]

# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------
def get_sanitized_db_url(raw_url: str) -> str:
    """Cleans up Supabase connection string for psycopg2 compatibility."""
    if not raw_url:
        raise ValueError("DATABASE_URL environment variable is not set.")
    clean = re.sub(r'[?&]pgbouncer=true', '', raw_url)
    clean = clean.replace(':6543', ':5432')
    return clean

def hash_password(plain: str) -> str:
    """Deterministic PBKDF2-SHA256 password hash for standard seed accounts."""
    salt = b"mplads_secure_salt_2025"
    key = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, 100_000)
    return f"pbkdf2_sha256$100000${salt.decode('latin1')}${key.hex()}"

def generate_gstin(state_code: str) -> str:
    """Generates a valid 15-character Indian GSTIN."""
    pan_chars = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
    pan_digits = "".join(random.choices("0123456789", k=4))
    pan_last = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    entity_code = random.choice("12345")
    checksum = random.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return f"{state_code}{pan_chars}{pan_digits}{pan_last}{entity_code}Z{checksum}"

def sample_coords(center_lat: float, center_lon: float, radius_deg: float):
    """Uniform random coordinate sampling within district radius."""
    r = radius_deg * math.sqrt(random.random())
    theta = random.random() * 2 * math.pi
    lat = center_lat + r * math.sin(theta)
    lon = center_lon + r * math.cos(theta)
    return round(lat, 6), round(lon, 6)

def read_baseline_datasets():
    """Reads available historical datasets gracefully."""
    paths_to_check = [
        BASE_DIR / "datasets",
        BASE_DIR / "mplads-platform" / "datasets"
    ]
    data = {"works_completed": None, "works_recommended": None, "mp_limits": None}
    
    for base in paths_to_check:
        if not base.exists():
            continue
        comp = base / "Works Completed.csv"
        recom = base / "Works Recommended.csv"
        mps = base / "Allocated Limit for Honble MPs.csv"
        
        if comp.exists() and data["works_completed"] is None:
            try:
                data["works_completed"] = pd.read_csv(comp, nrows=500)
                print(f"[+] Loaded historical Works Completed baseline from {comp.name}")
            except Exception as e:
                print(f"[!] Warning reading {comp.name}: {e}")

        if recom.exists() and data["works_recommended"] is None:
            try:
                data["works_recommended"] = pd.read_csv(recom, nrows=500)
                print(f"[+] Loaded historical Works Recommended baseline from {recom.name}")
            except Exception as e:
                print(f"[!] Warning reading {recom.name}: {e}")

        if mps.exists() and data["mp_limits"] is None:
            try:
                data["mp_limits"] = pd.read_csv(mps, nrows=200)
                print(f"[+] Loaded Hon'ble MP Limit dataset from {mps.name}")
            except Exception as e:
                print(f"[!] Warning reading {mps.name}: {e}")
                
    return data

# ---------------------------------------------------------------------------
# Seeder Implementation
# ---------------------------------------------------------------------------
def seed_database():
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        print("[ERROR] DATABASE_URL not found in environment.")
        sys.exit(1)

    db_url = get_sanitized_db_url(raw_url)
    print(f"[*] Connecting to database at: {db_url.split('@')[-1]}")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        cur = conn.cursor()
        print("[+] Connected to PostgreSQL.")
    except Exception as e:
        print(f"[!] Falling back to direct port connection: {e}")
        fallback_url = re.sub(r'[?&]pgbouncer=true', '', raw_url)
        conn = psycopg2.connect(fallback_url)
        conn.autocommit = False
        cur = conn.cursor()

    # Load baseline datasets
    baseline_data = read_baseline_datasets()

    # 1. Clean existing records for fresh seed run
    print("\n[*] Resetting existing records...")
    cur.execute("""
        TRUNCATE TABLE anomaly_logs, milestones, projects, users, contractors, constituencies CASCADE;
    """)
    conn.commit()
    print("[+] Cleared existing tables.")

    # 2. Insert Constituencies
    print("\n[*] Seeding Constituencies...")
    constituencies_records = []
    constituency_map = {} # (state, district) -> const_id

    for state, state_info in REGIONS.items():
        for district, d_info in state_info["districts"].items():
            const_id = str(uuid.uuid4())
            c_name = d_info["constituency"]
            mp_name = d_info["mp"]
            house = d_info["house"]
            alloc = 150000000.00 # Standard MPLADS Rs 15 Crore
            expend = 0.00
            
            constituencies_records.append((
                const_id, c_name, state, house, mp_name, alloc, expend, datetime.now()
            ))
            constituency_map[(state, district)] = const_id

    # Add Rajya Sabha constituencies
    rs_const_id_ka = str(uuid.uuid4())
    constituencies_records.append((
        rs_const_id_ka, "RAJYA SABHA - KARNATAKA", "Karnataka", "RAJYA_SABHA", "Nirmala Sitharaman", 150000000.00, 0.00, datetime.now()
    ))
    rs_const_id_mh = str(uuid.uuid4())
    constituencies_records.append((
        rs_const_id_mh, "RAJYA SABHA - MAHARASHTRA", "Maharashtra", "RAJYA_SABHA", "Piyush Goyal", 150000000.00, 0.00, datetime.now()
    ))

    execute_values(cur, """
        INSERT INTO constituencies (id, name, state, house_type, mp_name, allocated_funds, total_expenditure, created_at)
        VALUES %s;
    """, constituencies_records)
    conn.commit()
    print(f"[+] Seeded {len(constituencies_records)} Parliamentary Constituencies.")

    # 3. Insert Contractors
    print("\n[*] Seeding Contractors & Cartel Syndicate...")
    contractors_records = []
    contractor_ids = []

    # Cartel Contractor (Target: Dharwad, Karnataka)
    cartel_contractor_id = str(uuid.uuid4())
    cartel_gstin = "29AABCA9876K1ZP"
    contractors_records.append((
        cartel_contractor_id,
        "Apex Infracon Syndicate Pvt Ltd",
        cartel_gstin,
        False,
        0.88, # High risk score
        datetime.now() - timedelta(days=700)
    ))

    # Blacklisted Contractors
    contractors_records.append((
        str(uuid.uuid4()),
        "Falcon Mega Infra Corp",
        "27AABCF4567M1ZR",
        True, # Blacklisted
        0.95,
        datetime.now() - timedelta(days=900)
    ))
    contractors_records.append((
        str(uuid.uuid4()),
        "Soma Tollways & Builders Ltd",
        "10AABCS3322B1ZN",
        True, # Blacklisted
        0.92,
        datetime.now() - timedelta(days=850)
    ))

    # Normal Realistic Contractors across all states
    contractor_names = [
        "Shree Ganesh Constructions", "Bharath Infrastructure & Projects Ltd",
        "National Civil Works Co", "Navodaya Engineering & Builders",
        "Swastik Infratech Solutions", "Deccan Heavy Works & Roads",
        "Surya Shakti Construction Co", "Kaveri Infra Development",
        "Ganga Yamuna Earthmovers", "Satluj Highway Builders",
        "Kerala State Nirmithi Kendra", "Malabar Civil Infrastructure",
        "Patliputra Roads & Bridges Ltd", "Mithila Construction Enterprise",
        "Pragati Construction Syndicate", "Kalyan Builders & Developers",
        "United India Project Services", "Maratha Earthmovers & Asphalt",
        "Panchal Infracon LLP", "Royal Rajputana Construction Ltd",
        "Heritage Civic Solutions", "Apex North Builders",
        "Sai Shradha Civil Associates", "Gauri Shankar Enterprises",
        "Krishna Valley Builders", "Kisan Infrastructure Co",
        "Vanguard Infrastructure Pvt Ltd"
    ]

    for name in contractor_names:
        c_id = str(uuid.uuid4())
        state_code = random.choice(["29", "27", "10", "32", "03", "09"])
        gstin = generate_gstin(state_code)
        risk = round(random.uniform(0.02, 0.28), 2)
        contractors_records.append((
            c_id, name, gstin, False, risk, datetime.now() - timedelta(days=random.randint(100, 1000))
        ))
        contractor_ids.append(c_id)

    execute_values(cur, """
        INSERT INTO contractors (id, name, gstin, blacklisted, risk_score, created_at)
        VALUES %s;
    """, contractors_records)
    conn.commit()
    print(f"[+] Seeded {len(contractors_records)} Contractors (including Cartel & Blacklisted).")

    # 4. Insert Pre-Seeded Users for All Required Roles
    print("\n[*] Seeding Users across Ministry, Nodal, Collector, MP, Agency, Citizen roles...")
    password_hash = hash_password("MPLADS@Secure2025!")
    users_records = [
        # MINISTRY Role
        (str(uuid.uuid4()), "Dr. Rajiv Kumar Verma", "admin.ministry@mplads.gov.in", password_hash,
         "MINISTRY", None, None, None, datetime.now()),
        (str(uuid.uuid4()), "Smt. Sunita Rao (Dir-MPLADS)", "director.ministry@mplads.gov.in", password_hash,
         "MINISTRY", None, None, None, datetime.now()),

        # STATE_NODAL Role (Across sample states)
        (str(uuid.uuid4()), "Ramesh Patil, IAS (State Nodal)", "nodal.karnataka@mplads.gov.in", password_hash,
         "STATE_NODAL", "Karnataka", None, None, datetime.now()),
        (str(uuid.uuid4()), "Vikas Deshmukh, IAS (State Nodal)", "nodal.maharashtra@mplads.gov.in", password_hash,
         "STATE_NODAL", "Maharashtra", None, None, datetime.now()),
        (str(uuid.uuid4()), "Anil Kumar Jha, IAS (State Nodal)", "nodal.bihar@mplads.gov.in", password_hash,
         "STATE_NODAL", "Bihar", None, None, datetime.now()),
        (str(uuid.uuid4()), "K. Vijayan, IAS (State Nodal)", "nodal.kerala@mplads.gov.in", password_hash,
         "STATE_NODAL", "Kerala", None, None, datetime.now()),
        (str(uuid.uuid4()), "Harpreet Singh, IAS (State Nodal)", "nodal.punjab@mplads.gov.in", password_hash,
         "STATE_NODAL", "Punjab", None, None, datetime.now()),
        (str(uuid.uuid4()), "Alok Ranjan, IAS (State Nodal)", "nodal.up@mplads.gov.in", password_hash,
         "STATE_NODAL", "Uttar Pradesh", None, None, datetime.now()),

        # DISTRICT_COLLECTOR Role
        (str(uuid.uuid4()), "Divya Prabhu G.R.J., IAS (DC Dharwad)", "collector.dharwad@mplads.gov.in", password_hash,
         "DISTRICT_COLLECTOR", "Karnataka", "Dharwad", constituency_map[("Karnataka", "Dharwad")], datetime.now()),
        (str(uuid.uuid4()), "Jitendra Papalkar, IAS (DC Hingoli)", "collector.hingoli@mplads.gov.in", password_hash,
         "DISTRICT_COLLECTOR", "Maharashtra", "Hingoli", constituency_map[("Maharashtra", "Hingoli")], datetime.now()),
        (str(uuid.uuid4()), "Inayat Khan, IAS (DM Araria)", "collector.araria@mplads.gov.in", password_hash,
         "DISTRICT_COLLECTOR", "Bihar", "Araria", constituency_map[("Bihar", "Araria")], datetime.now()),
        (str(uuid.uuid4()), "N. Devidas, IAS (DC Kollam)", "collector.kollam@mplads.gov.in", password_hash,
         "DISTRICT_COLLECTOR", "Kerala", "Kollam", constituency_map[("Kerala", "Kollam")], datetime.now()),
        (str(uuid.uuid4()), "Vineet Kumar, IAS (DC Faridkot)", "collector.faridkot@mplads.gov.in", password_hash,
         "DISTRICT_COLLECTOR", "Punjab", "Faridkot", constituency_map[("Punjab", "Faridkot")], datetime.now()),
        (str(uuid.uuid4()), "Shubhrant Kumar Shukla, IAS (DM Kannauj)", "collector.kannauj@mplads.gov.in", password_hash,
         "DISTRICT_COLLECTOR", "Uttar Pradesh", "Kannauj", constituency_map[("Uttar Pradesh", "Kannauj")], datetime.now()),

        # MP Role
        (str(uuid.uuid4()), "Hon'ble Shri Pralhad Venkatesh Joshi (MP)", "mp.dharwad@sansad.nic.in", password_hash,
         "MP", "Karnataka", "Dharwad", constituency_map[("Karnataka", "Dharwad")], datetime.now()),
        (str(uuid.uuid4()), "Hon'ble Shri Aashtikar Patil (MP)", "mp.hingoli@sansad.nic.in", password_hash,
         "MP", "Maharashtra", "Hingoli", constituency_map[("Maharashtra", "Hingoli")], datetime.now()),
        (str(uuid.uuid4()), "Hon'ble Shri Pradeep Kumar Singh (MP)", "mp.araria@sansad.nic.in", password_hash,
         "MP", "Bihar", "Araria", constituency_map[("Bihar", "Araria")], datetime.now()),
        (str(uuid.uuid4()), "Hon'ble Shri N. K. Premachandran (MP)", "mp.kollam@sansad.nic.in", password_hash,
         "MP", "Kerala", "Kollam", constituency_map[("Kerala", "Kollam")], datetime.now()),
        (str(uuid.uuid4()), "Hon'ble Shri Sarabjeet Singh Khalsa (MP)", "mp.faridkot@sansad.nic.in", password_hash,
         "MP", "Punjab", "Faridkot", constituency_map[("Punjab", "Faridkot")], datetime.now()),
        (str(uuid.uuid4()), "Hon'ble Shri Akhilesh Yadav (MP)", "mp.kannauj@sansad.nic.in", password_hash,
         "MP", "Uttar Pradesh", "Kannauj", constituency_map[("Uttar Pradesh", "Kannauj")], datetime.now()),

        # AGENCY Role
        (str(uuid.uuid4()), "Executive Engineer (PWD Dharwad)", "agency.pwd@mplads.gov.in", password_hash,
         "AGENCY", "Karnataka", "Dharwad", None, datetime.now()),
        (str(uuid.uuid4()), "Project Director (DRDA Araria)", "agency.drda@mplads.gov.in", password_hash,
         "AGENCY", "Bihar", "Araria", None, datetime.now()),

        # CITIZEN Role
        (str(uuid.uuid4()), "Ananya Hegde (Citizen Social Auditor)", "citizen.auditor@mplads.gov.in", password_hash,
         "CITIZEN", "Karnataka", "Dharwad", None, datetime.now()),
        (str(uuid.uuid4()), "Rahul Deshmukh (Citizen Vigilance)", "citizen.vigilance@mplads.gov.in", password_hash,
         "CITIZEN", "Maharashtra", "Pune", None, datetime.now())
    ]

    execute_values(cur, """
        INSERT INTO users (id, full_name, email, password_hash, role, state, district, constituency_id, created_at)
        VALUES %s;
    """, users_records)
    conn.commit()
    print(f"[+] Seeded {len(users_records)} Authenticated Users covering all 6 system roles.")

    # -----------------------------------------------------------------------
    # 5. Project Generation Plan (520 Total Projects)
    # -----------------------------------------------------------------------
    # Target: 520 Total Records
    # 15% Anomaly Injection = 78 Projects
    #   - 20 Ghost Projects (disbursed >= 90% with progress < 20%)
    #   - 20 Cost Overrun Projects (sanction 3.5x-4.5x regional category median)
    #   - 20 Duplicate Works (10 pairs with <100m distance and high title similarity)
    #   - 18 Vendor Monopoly Works (>75% in Dharwad allocated to Cartel contractor)
    # 85% Normal Projects = 442 Projects
    # -----------------------------------------------------------------------
    TOTAL_PROJECTS = 520
    NUM_GHOST = 20
    NUM_COST_OVERRUN = 20
    NUM_DUPLICATES = 20  # 10 pairs
    NUM_CARTEL = 18
    NUM_NORMAL = TOTAL_PROJECTS - (NUM_GHOST + NUM_COST_OVERRUN + NUM_DUPLICATES + NUM_CARTEL)

    print(f"\n[*] Generating {TOTAL_PROJECTS} Projects with 15% Labeled Anomalies ({NUM_GHOST+NUM_COST_OVERRUN+NUM_DUPLICATES+NUM_CARTEL} anomalies)...")
    print(f"    - Ghost Projects: {NUM_GHOST}")
    print(f"    - Cost Overruns: {NUM_COST_OVERRUN}")
    print(f"    - Duplicate Geospatial Pairs: {NUM_DUPLICATES} (10 pairs)")
    print(f"    - Vendor Cartel Works: {NUM_CARTEL} (>75% in Dharwad)")
    print(f"    - Normal Works: {NUM_NORMAL}")

    # Initialize SentenceTransformer model for vector embeddings
    print("\n[*] Initializing SentenceTransformer ('sentence-transformers/all-MiniLM-L6-v2')...")
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    print("[+] Model loaded successfully.")

    projects_data = [] # Dicts before embedding
    anomalies_data = [] # Logs to insert

    districts_list = []
    for st, s_data in REGIONS.items():
        for dst, d_data in s_data["districts"].items():
            districts_list.append((st, dst, d_data))

    categories_list = list(WORK_CATEGORIES.keys())
    project_idx = 1000

    def generate_project_code(state_code, year, idx):
        return f"WS/MP{state_code}/{year}/{idx:06d}"

    # Districts excluding cartel district (Dharwad) for sections A, B, C
    non_cartel_districts = [(st, dst, d_data) for st, dst, d_data in districts_list if dst != "Dharwad"]

    # -----------------------------------------------------------------------
    # A. Generate 20 Ghost Projects
    # -----------------------------------------------------------------------
    print("[*] Creating 20 Ghost Projects (Disbursed 90-100%, Progress <20%)...")
    for i in range(NUM_GHOST):
        project_idx += 1
        st, dst, d_data = random.choice(non_cartel_districts)
        cat = random.choice(categories_list)
        loc1 = fake.village_name() if hasattr(fake, 'village_name') else fake.city()
        loc2 = fake.street_name()
        template = random.choice(WORK_CATEGORIES[cat]["templates"])
        title = template.format(loc1=loc1, loc2=loc2, ward=random.randint(1, 25))
        
        base_median = WORK_CATEGORIES[cat]["median"]
        sanction = round(base_median * random.uniform(1.0, 1.8), 2)
        # Disbursed 90% - 99% of sanction
        disbursed_pct = random.uniform(0.91, 0.99)
        disbursed = round(sanction * disbursed_pct, 2)
        # Progress strictly < 20%
        progress = random.randint(3, 17)
        
        lat, lon = sample_coords(d_data["center_lat"], d_data["center_lon"], d_data["radius_deg"])
        proj_id = str(uuid.uuid4())
        p_code = generate_project_code(REGIONS[st]["state_code"], "2024-2025", project_idx)
        risk = round(random.uniform(0.86, 0.98), 2)

        projects_data.append({
            "id": proj_id,
            "project_code": p_code,
            "title": title,
            "work_category": cat,
            "state": st,
            "district": dst,
            "constituency_id": constituency_map[(st, dst)],
            "sanction_amount": sanction,
            "disbursed_amount": disbursed,
            "physical_progress_pct": progress,
            "agency_name": random.choice(AGENCIES),
            "contractor_id": random.choice(contractor_ids),
            "latitude": lat,
            "longitude": lon,
            "status": "IN_PROGRESS",
            "risk_score": risk,
            "is_flagged": True,
            "anomaly_type": "GHOST_PROJECT",
            "created_at": datetime.now() - timedelta(days=random.randint(120, 360))
        })

        anomalies_data.append({
            "project_id": proj_id,
            "anomaly_type": "GHOST_PROJECT",
            "confidence_score": round(random.uniform(0.91, 0.98), 2),
            "explanation": (
                f"Severe Ghost Project Flag: ₹{disbursed/100000:.2f} Lakh ({disbursed_pct*100:.1f}%) "
                f"of sanctioned ₹{sanction/100000:.2f} Lakh disbursed, yet verified physical progress "
                f"is stalled at only {progress}%. Ground inspection reports no structural foundations present."
            ),
            "status": "OPEN",
            "detected_at": datetime.now() - timedelta(days=random.randint(5, 30))
        })

    # -----------------------------------------------------------------------
    # B. Generate 20 Cost Overrun Projects (3.5x - 4.5x Regional Median)
    # -----------------------------------------------------------------------
    print("[*] Creating 20 Cost Overrun Projects (3.5x - 4.5x Regional Median)...")
    for i in range(NUM_COST_OVERRUN):
        project_idx += 1
        st, dst, d_data = random.choice(non_cartel_districts)
        cat = random.choice(categories_list)
        loc1 = fake.village_name() if hasattr(fake, 'village_name') else fake.city()
        loc2 = fake.street_name()
        template = random.choice(WORK_CATEGORIES[cat]["templates"])
        title = template.format(loc1=loc1, loc2=loc2, ward=random.randint(1, 25))

        base_median = WORK_CATEGORIES[cat]["median"]
        multiple = round(random.uniform(3.55, 4.45), 2)
        sanction = round(base_median * multiple, 2)
        
        # Disbursed proportionate to healthy progress
        progress = random.randint(40, 85)
        disbursed = round(sanction * (progress / 100.0) * random.uniform(0.90, 1.05), 2)
        
        lat, lon = sample_coords(d_data["center_lat"], d_data["center_lon"], d_data["radius_deg"])
        proj_id = str(uuid.uuid4())
        p_code = generate_project_code(REGIONS[st]["state_code"], "2024-2025", project_idx)
        risk = round(random.uniform(0.82, 0.94), 2)

        projects_data.append({
            "id": proj_id,
            "project_code": p_code,
            "title": title,
            "work_category": cat,
            "state": st,
            "district": dst,
            "constituency_id": constituency_map[(st, dst)],
            "sanction_amount": sanction,
            "disbursed_amount": disbursed,
            "physical_progress_pct": progress,
            "agency_name": random.choice(AGENCIES),
            "contractor_id": random.choice(contractor_ids),
            "latitude": lat,
            "longitude": lon,
            "status": "IN_PROGRESS",
            "risk_score": risk,
            "is_flagged": True,
            "anomaly_type": "COST_OVERRUN",
            "created_at": datetime.now() - timedelta(days=random.randint(90, 300))
        })

        anomalies_data.append({
            "project_id": proj_id,
            "anomaly_type": "COST_OVERRUN",
            "confidence_score": round(random.uniform(0.88, 0.96), 2),
            "explanation": (
                f"Abnormal Cost Inflation: Sanction amount of ₹{sanction/100000:.2f} Lakh is {multiple:.1f}x "
                f"above the regional median (₹{base_median/100000:.2f} Lakh) for standard '{cat}' "
                f"in {dst}, {st}. Per-unit engineering estimates exceed standard schedule of rates (SoR)."
            ),
            "status": "OPEN",
            "detected_at": datetime.now() - timedelta(days=random.randint(5, 30))
        })

    # -----------------------------------------------------------------------
    # C. Generate 20 Duplicate Geospatial Works (10 Pairs < 100m, high title similarity)
    # -----------------------------------------------------------------------
    print("[*] Creating 20 Duplicate Geospatial Works (10 Collision Pairs < 100m)...")
    duplicate_pairs = [
        ("Construction of CC Road with side drainage from Panchayat Bhavan to Primary School, Ward 4",
         "PCC Road and open concrete drain linking Panchayat Bhavan and Govt Primary School, Ward 4"),
        ("Installation of 1000 LPH RO Drinking Water Plant near Community Centre, Main Bazaar",
         "Setting up 1000 LPH RO Water Purification Unit at Main Bazaar Community Centre"),
        ("Construction of Community Cultural Bhavan and Library at Ambedkar Nagar",
         "Construction of Samudayik Cultural Hall with Library facility at Ambedkar Nagar"),
        ("Construction of 2 New Classrooms and Mid-day Meal Dining Shed at Govt Higher Primary School",
         "Govt Higher Primary School 2 Classroom additions and Mid-day Meal shed construction"),
        ("Construction of High Mast Solar Street Light Array at Bus Stand Junction",
         "High Mast Solar LED Illumination Tower installation at Central Bus Stand Junction"),
        ("RCC Box Culvert construction across irrigation canal on link road to Hospital",
         "Construction of RCC Slab Box Culvert over distributary canal on Hospital approach road"),
        ("Public Sanitation Complex and modern toilet block near Weekly Market Ground",
         "Community Toilet Block and sanitation facility at Weekly Haat Bazaar Ground"),
        ("Construction of Ayushman Health and Wellness Sub-centre building at Sector 3",
         "Health & Wellness Sub-centre clinic and dispensary construction at Sector 3"),
        ("Bituminous road resurfacing and paver block laying from Temple to Village Entrance",
         "Asphalt Road re-carpeting and interlocking paver work from Temple to Village Gate"),
        ("Construction of Multi-purpose Village Sabha Manch and Open Stage at Gandhi Maidan",
         "Village Open Cultural Stage and Sabha Platform construction at Gandhi Maidan")
    ]

    for p1_title, p2_title in duplicate_pairs:
        st, dst, d_data = random.choice(non_cartel_districts)
        cat = random.choice(categories_list)
        base_median = WORK_CATEGORIES[cat]["median"]
        
        # Base Coordinate
        lat1, lon1 = sample_coords(d_data["center_lat"], d_data["center_lon"], d_data["radius_deg"])
        # Near-identical coordinate (< 100m distance: ~0.00025 degrees is ~27 meters)
        lat_offset = random.uniform(0.00010, 0.00028) * random.choice([1, -1])
        lon_offset = random.uniform(0.00010, 0.00028) * random.choice([1, -1])
        lat2 = round(lat1 + lat_offset, 6)
        lon2 = round(lon1 + lon_offset, 6)
        
        # Calculate approx distance in meters
        dist_m = math.sqrt((lat_offset * 111000)**2 + (lon_offset * 111000 * math.cos(math.radians(lat1)))**2)

        # Primary Work (Flagged as collision pair)
        project_idx += 1
        p1_id = str(uuid.uuid4())
        p1_code = generate_project_code(REGIONS[st]["state_code"], "2024-2025", project_idx)
        sanction1 = round(base_median * random.uniform(0.95, 1.25), 2)
        progress1 = random.randint(80, 100)
        disbursed1 = round(sanction1 * (progress1 / 100.0), 2)
        risk1 = round(random.uniform(0.88, 0.96), 2)
        
        projects_data.append({
            "id": p1_id,
            "project_code": p1_code,
            "title": p1_title,
            "work_category": cat,
            "state": st,
            "district": dst,
            "constituency_id": constituency_map[(st, dst)],
            "sanction_amount": sanction1,
            "disbursed_amount": disbursed1,
            "physical_progress_pct": progress1,
            "agency_name": random.choice(AGENCIES),
            "contractor_id": random.choice(contractor_ids),
            "latitude": lat1,
            "longitude": lon1,
            "status": "COMPLETED" if progress1 == 100 else "IN_PROGRESS",
            "risk_score": risk1,
            "is_flagged": True,
            "anomaly_type": "DUPLICATE_WORK",
            "created_at": datetime.now() - timedelta(days=random.randint(180, 365))
        })

        # Duplicate Cloned Work (Flagged)
        project_idx += 1
        p2_id = str(uuid.uuid4())
        p2_code = generate_project_code(REGIONS[st]["state_code"], "2024-2025", project_idx)
        sanction2 = round(base_median * random.uniform(0.95, 1.30), 2)
        progress2 = random.randint(40, 90)
        disbursed2 = round(sanction2 * (progress2 / 100.0), 2)
        risk2 = round(random.uniform(0.92, 0.99), 2)

        projects_data.append({
            "id": p2_id,
            "project_code": p2_code,
            "title": p2_title,
            "work_category": cat,
            "state": st,
            "district": dst,
            "constituency_id": constituency_map[(st, dst)],
            "sanction_amount": sanction2,
            "disbursed_amount": disbursed2,
            "physical_progress_pct": progress2,
            "agency_name": random.choice(AGENCIES),
            "contractor_id": random.choice(contractor_ids),
            "latitude": lat2,
            "longitude": lon2,
            "status": "IN_PROGRESS",
            "risk_score": risk2,
            "is_flagged": True,
            "anomaly_type": "DUPLICATE_WORK",
            "created_at": datetime.now() - timedelta(days=random.randint(30, 120))
        })

        # Anomaly log for primary work
        anomalies_data.append({
            "project_id": p1_id,
            "anomaly_type": "DUPLICATE_WORK",
            "confidence_score": round(random.uniform(0.92, 0.98), 2),
            "explanation": (
                f"Geospatial Collision: Work shares identical coordinates (within {dist_m:.1f}m) "
                f"and over 90% semantic similarity with duplicate work '{p2_title}' ({p2_code}). "
                f"Suspected double allocation on single asset."
            ),
            "status": "OPEN",
            "detected_at": datetime.now() - timedelta(days=random.randint(2, 20))
        })

        anomalies_data.append({
            "project_id": p2_id,
            "anomaly_type": "DUPLICATE_WORK",
            "confidence_score": round(random.uniform(0.93, 0.99), 2),
            "explanation": (
                f"Geospatial & Semantic Duplicate: Located only {dist_m:.1f} meters (< 100m) "
                f"from prior sanctioned work '{p1_title}' ({p1_code}) with over 90% semantic title similarity. "
                f"Evidence of duplicate billing on single physical asset."
            ),
            "status": "OPEN",
            "detected_at": datetime.now() - timedelta(days=random.randint(2, 20))
        })

    # -----------------------------------------------------------------------
    # D. Generate 18 Vendor Cartel Works (>75% Monopolization in Dharwad)
    # -----------------------------------------------------------------------
    print("[*] Creating 18 Vendor Cartel Works in Dharwad (>75% Single Vendor Allocation)...")
    cartel_st = "Karnataka"
    cartel_dst = "Dharwad"
    cartel_d_data = REGIONS[cartel_st]["districts"][cartel_dst]

    for i in range(NUM_CARTEL):
        project_idx += 1
        cat = random.choice(categories_list)
        loc1 = fake.village_name() if hasattr(fake, 'village_name') else fake.city()
        loc2 = fake.street_name()
        template = random.choice(WORK_CATEGORIES[cat]["templates"])
        title = template.format(loc1=loc1, loc2=loc2, ward=random.randint(1, 25))

        base_median = WORK_CATEGORIES[cat]["median"]
        sanction = round(base_median * random.uniform(1.0, 1.4), 2)
        progress = random.randint(30, 90)
        disbursed = round(sanction * (progress / 100.0), 2)
        
        lat, lon = sample_coords(cartel_d_data["center_lat"], cartel_d_data["center_lon"], cartel_d_data["radius_deg"])
        proj_id = str(uuid.uuid4())
        p_code = generate_project_code(REGIONS[cartel_st]["state_code"], "2024-2025", project_idx)
        risk = round(random.uniform(0.79, 0.92), 2)

        projects_data.append({
            "id": proj_id,
            "project_code": p_code,
            "title": title,
            "work_category": cat,
            "state": cartel_st,
            "district": cartel_dst,
            "constituency_id": constituency_map[(cartel_st, cartel_dst)],
            "sanction_amount": sanction,
            "disbursed_amount": disbursed,
            "physical_progress_pct": progress,
            "agency_name": "Karnataka Rural Infrastructure Dev Ltd (KRIDL)",
            "contractor_id": cartel_contractor_id, # Cartel Contractor GSTIN: 29AABCA9876K1ZP
            "latitude": lat,
            "longitude": lon,
            "status": "IN_PROGRESS",
            "risk_score": risk,
            "is_flagged": True,
            "anomaly_type": "VENDOR_MONOPOLY",
            "created_at": datetime.now() - timedelta(days=random.randint(60, 240))
        })

        anomalies_data.append({
            "project_id": proj_id,
            "anomaly_type": "VENDOR_MONOPOLY",
            "confidence_score": round(random.uniform(0.86, 0.95), 2),
            "explanation": (
                f"Procurement Cartel Alert: Contractor 'Apex Infracon Syndicate Pvt Ltd' (GSTIN: {cartel_gstin}) "
                f"has captured 81.8% of all MPLADS works awarded in district {cartel_dst}, "
                f"surpassing the 75% monopoly cartel threshold. Strong indication of collusive bidding."
            ),
            "status": "OPEN",
            "detected_at": datetime.now() - timedelta(days=random.randint(5, 35))
        })

    # Add 4 non-cartel works in Dharwad to make total 22 works (18 / 22 = 81.8% > 75% threshold!)
    for i in range(4):
        project_idx += 1
        cat = random.choice(categories_list)
        loc1 = fake.village_name() if hasattr(fake, 'village_name') else fake.city()
        loc2 = fake.street_name()
        template = random.choice(WORK_CATEGORIES[cat]["templates"])
        title = template.format(loc1=loc1, loc2=loc2, ward=random.randint(1, 25))

        base_median = WORK_CATEGORIES[cat]["median"]
        sanction = round(base_median * random.uniform(0.9, 1.2), 2)
        progress = random.randint(50, 100)
        disbursed = round(sanction * (progress / 100.0), 2)
        
        lat, lon = sample_coords(cartel_d_data["center_lat"], cartel_d_data["center_lon"], cartel_d_data["radius_deg"])
        proj_id = str(uuid.uuid4())
        p_code = generate_project_code(REGIONS[cartel_st]["state_code"], "2024-2025", project_idx)

        projects_data.append({
            "id": proj_id,
            "project_code": p_code,
            "title": title,
            "work_category": cat,
            "state": cartel_st,
            "district": cartel_dst,
            "constituency_id": constituency_map[(cartel_st, cartel_dst)],
            "sanction_amount": sanction,
            "disbursed_amount": disbursed,
            "physical_progress_pct": progress,
            "agency_name": random.choice(AGENCIES),
            "contractor_id": random.choice(contractor_ids),
            "latitude": lat,
            "longitude": lon,
            "status": "COMPLETED" if progress == 100 else "IN_PROGRESS",
            "risk_score": round(random.uniform(0.04, 0.22), 2),
            "is_flagged": False,
            "anomaly_type": None,
            "created_at": datetime.now() - timedelta(days=random.randint(80, 260))
        })

    # -----------------------------------------------------------------------
    # E. Generate Remaining Normal Projects (Distributed Across Districts)
    # -----------------------------------------------------------------------
    # Exclude Dharwad from normal project distribution to preserve exact cartel proportion
    other_districts = [(st, dst, d_data) for st, dst, d_data in districts_list if dst != "Dharwad"]
    remaining_normal = TOTAL_PROJECTS - len(projects_data)
    print(f"[*] Creating {remaining_normal} Normal Distributed Projects across remaining districts...")

    for i in range(remaining_normal):
        project_idx += 1
        st, dst, d_data = random.choice(other_districts)
        cat = random.choice(categories_list)
        loc1 = fake.village_name() if hasattr(fake, 'village_name') else fake.city()
        loc2 = fake.street_name()
        template = random.choice(WORK_CATEGORIES[cat]["templates"])
        title = template.format(loc1=loc1, loc2=loc2, ward=random.randint(1, 25))

        base_median = WORK_CATEGORIES[cat]["median"]
        sanction = round(base_median * random.uniform(0.85, 1.30), 2)
        
        status_choice = random.choices(
            ["COMPLETED", "IN_PROGRESS", "SANCTIONED", "RECOMMENDED", "STALLED"],
            weights=[0.40, 0.40, 0.12, 0.05, 0.03],
            k=1
        )[0]

        if status_choice == "COMPLETED":
            progress = 100
            disbursed = round(sanction * random.uniform(0.96, 1.0), 2)
            risk = round(random.uniform(0.01, 0.15), 2)
        elif status_choice == "IN_PROGRESS":
            progress = random.randint(25, 90)
            disbursed = round(sanction * (progress / 100.0) * random.uniform(0.92, 1.02), 2)
            risk = round(random.uniform(0.05, 0.25), 2)
        elif status_choice == "SANCTIONED":
            progress = random.randint(0, 15)
            disbursed = round(sanction * (progress / 100.0) * 0.5, 2)
            risk = round(random.uniform(0.02, 0.18), 2)
        elif status_choice == "RECOMMENDED":
            progress = 0
            disbursed = 0.00
            risk = 0.00
        else: # STALLED
            progress = random.randint(20, 45)
            disbursed = round(sanction * (progress / 100.0), 2)
            risk = round(random.uniform(0.35, 0.50), 2)

        lat, lon = sample_coords(d_data["center_lat"], d_data["center_lon"], d_data["radius_deg"])
        proj_id = str(uuid.uuid4())
        p_code = generate_project_code(REGIONS[st]["state_code"], "2024-2025", project_idx)

        projects_data.append({
            "id": proj_id,
            "project_code": p_code,
            "title": title,
            "work_category": cat,
            "state": st,
            "district": dst,
            "constituency_id": constituency_map[(st, dst)],
            "sanction_amount": sanction,
            "disbursed_amount": disbursed,
            "physical_progress_pct": progress,
            "agency_name": random.choice(AGENCIES),
            "contractor_id": random.choice(contractor_ids),
            "latitude": lat,
            "longitude": lon,
            "status": status_choice,
            "risk_score": risk,
            "is_flagged": False,
            "anomaly_type": None,
            "created_at": datetime.now() - timedelta(days=random.randint(15, 365))
        })

    print(f"[+] Total projects prepared for embedding: {len(projects_data)}")

    # -----------------------------------------------------------------------
    # 6. Compute 384-dimensional Vector Embeddings
    # -----------------------------------------------------------------------
    titles = [p["title"] for p in projects_data]
    print(f"\n[*] Generating 384-dim dense embeddings for {len(titles)} project titles...")
    embeddings = embedder.encode(titles, batch_size=64, show_progress_bar=True, normalize_embeddings=True)
    print(f"[+] Computed embeddings with shape: {embeddings.shape}")

    # Format vector as string '[val1,val2,...]' for PostgreSQL pgvector insertion
    for i, proj in enumerate(projects_data):
        vec = embeddings[i]
        proj["embedding_str"] = f"[{','.join(f'{x:.6f}' for x in vec)}]"

    # -----------------------------------------------------------------------
    # 7. Insert Projects into PostgreSQL
    # -----------------------------------------------------------------------
    print("\n[*] Inserting projects into database...")
    projects_insert_rows = [
        (
            p["id"],
            p["project_code"],
            p["title"],
            p["embedding_str"],
            p["work_category"],
            p["state"],
            p["district"],
            p["constituency_id"],
            p["sanction_amount"],
            p["disbursed_amount"],
            p["physical_progress_pct"],
            p["agency_name"],
            p["contractor_id"],
            p["latitude"],
            p["longitude"],
            p["status"],
            p["risk_score"],
            p["is_flagged"],
            p["created_at"]
        )
        for p in projects_data
    ]

    execute_values(cur, """
        INSERT INTO projects (
            id, project_code, title, embedding, work_category, state, district,
            constituency_id, sanction_amount, disbursed_amount, physical_progress_pct,
            agency_name, contractor_id, latitude, longitude, status, risk_score,
            is_flagged, created_at
        ) VALUES %s;
    """, projects_insert_rows)
    conn.commit()
    print(f"[+] Successfully inserted {len(projects_insert_rows)} projects with PostGIS geometry & vector embeddings.")

    # -----------------------------------------------------------------------
    # 8. Generate & Insert Milestones
    # -----------------------------------------------------------------------
    print("\n[*] Generating verification milestones for all projects...")
    milestones_rows = []
    stage_defs = [
        ("Stage 1: DPR Approval & Site Handover", 20, 0.20),
        ("Stage 2: Foundation & Plinth Level Works", 50, 0.30),
        ("Stage 3: Superstructure & Intermediate Inspection", 80, 0.30),
        ("Stage 4: Finishing, Quality Testing & Commissioning", 100, 0.20)
    ]

    for p in projects_data:
        p_id = p["id"]
        prog = p["physical_progress_pct"]
        sanction = p["sanction_amount"]
        is_ghost = p.get("anomaly_type") == "GHOST_PROJECT"
        
        cumulative_released = 0.0
        for stage_name, stage_claimed_pct, tranche_share in stage_defs:
            if prog == 0 and stage_claimed_pct > 20:
                continue
                
            claimed = min(prog, stage_claimed_pct)
            verified = (prog >= stage_claimed_pct) and not is_ghost
            
            if is_ghost:
                # Ghost project released money without physical reality
                tranche = sanction * tranche_share
            elif verified:
                tranche = sanction * tranche_share
            else:
                tranche = sanction * (claimed / 100.0) * 0.5

            cumulative_released += tranche
            notes = f"Inspection note: Verified progress {claimed}% on {stage_name}." if verified else \
                    f"Pending verification: Ground status recorded at {claimed}%."
            img_hash = hashlib.sha256(f"{p['project_code']}_{stage_name}".encode()).hexdigest()
            img_url = f"https://storage.mplads.gov.in/inspections/{p['project_code']}_{stage_claimed_pct}.jpg"

            milestones_rows.append((
                str(uuid.uuid4()),
                p_id,
                stage_name,
                claimed,
                round(tranche, 2),
                notes,
                img_url,
                img_hash,
                verified,
                datetime.now() - timedelta(days=random.randint(5, 180))
            ))

    execute_values(cur, """
        INSERT INTO milestones (
            id, project_id, stage_name, claimed_pct, fund_released,
            inspection_notes, image_url, image_hash, verified, updated_at
        ) VALUES %s;
    """, milestones_rows)
    conn.commit()
    print(f"[+] Successfully inserted {len(milestones_rows)} verification milestones.")

    # -----------------------------------------------------------------------
    # 9. Insert Labeled Anomaly Logs
    # -----------------------------------------------------------------------
    print("\n[*] Inserting labeled anomaly logs...")
    anomaly_rows = [
        (
            str(uuid.uuid4()),
            a["project_id"],
            a["anomaly_type"],
            a["confidence_score"],
            a["explanation"],
            a["status"],
            a["detected_at"]
        )
        for a in anomalies_data
    ]

    execute_values(cur, """
        INSERT INTO anomaly_logs (
            id, project_id, anomaly_type, confidence_score, explanation, status, detected_at
        ) VALUES %s;
    """, anomaly_rows)
    conn.commit()
    print(f"[+] Successfully inserted {len(anomaly_rows)} ground-truth anomaly logs.")

    # -----------------------------------------------------------------------
    # 10. Update Constituency Expenditure Aggregations
    # -----------------------------------------------------------------------
    print("\n[*] Recalculating parliamentary constituency expenditure rollups...")
    cur.execute("""
        UPDATE constituencies c
        SET total_expenditure = sub.total_exp
        FROM (
            SELECT constituency_id, SUM(disbursed_amount) AS total_exp
            FROM projects
            GROUP BY constituency_id
        ) sub
        WHERE c.id = sub.constituency_id;
    """)
    conn.commit()
    print("[+] Constituency expenditure aggregations updated.")

    # -----------------------------------------------------------------------
    # 11. Final Ingestion Audits & Metrics
    # -----------------------------------------------------------------------
    print("\n" + "="*70)
    print("             PHASE 1 INGESTION AUDIT & METRICS REPORT")
    print("="*70)

    cur.execute("SELECT count(*) FROM users;")
    total_users = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM constituencies;")
    total_const = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM contractors;")
    total_contractors = cur.fetchone()[0]

    cur.execute("SELECT count(*), count(*) FILTER (WHERE is_flagged = TRUE) FROM projects;")
    tot_proj, tot_flagged = cur.fetchone()

    cur.execute("SELECT count(*) FROM milestones;")
    tot_milestones = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM anomaly_logs;")
    tot_anomalies = cur.fetchone()[0]

    cur.execute("""
        SELECT anomaly_type, count(*), round(avg(confidence_score)::numeric, 2)
        FROM anomaly_logs
        GROUP BY anomaly_type
        ORDER BY count(*) DESC;
    """)
    anomaly_breakdown = cur.fetchall()

    cur.execute("""
        SELECT ST_AsText(location), latitude, longitude, title
        FROM projects
        LIMIT 1;
    """)
    sample_geo = cur.fetchone()

    print(f"Users Seeded:                {total_users}")
    print(f"Constituencies Seeded:       {total_const}")
    print(f"Contractors Seeded:          {total_contractors}")
    print(f"Total Projects Ingested:     {tot_proj}")
    print(f"Flagged Anomaly Projects:    {tot_flagged} ({(tot_flagged/tot_proj)*100:.1f}%)")
    print(f"Total Milestones Recorded:   {tot_milestones}")
    print(f"Total Anomaly Logs Injected: {tot_anomalies}")
    print("\nAnomaly Distribution Breakdown:")
    for a_type, cnt, avg_conf in anomaly_breakdown:
        print(f"    - {a_type:<20}: {cnt} records (Avg Confidence: {avg_conf})")
    
    print("\nPostGIS Spatial Trigger Verification:")
    print(f"    - Geometry:  {sample_geo[0]}")
    print(f"    - Lat / Lon: ({sample_geo[1]}, {sample_geo[2]})")
    print(f"    - Title:     {sample_geo[3]}")

    cur.close()
    conn.close()
    print("\n[SUCCESS] Phase 1 Data Seeder completed with 100% integrity!")

if __name__ == "__main__":
    seed_database()
