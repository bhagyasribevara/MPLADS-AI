"""
Duplicate Engine Service
Computes semantic embeddings for project proposals and executes multi-criteria
PostGIS spatial distance (<200m) and pgvector cosine distance (<0.15) queries
to detect duplicate or overlapping works.
"""

from typing import Optional, List, Dict, Any
import numpy as np
from config import get_db_connection

# Lazy-loaded singleton embedder
_embedder: Optional[Any] = None

def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _embedder

class DuplicateEngine:
    @classmethod
    def check_duplicate(
        cls,
        title: str,
        lat: float,
        lng: float,
        constituency_id: Optional[str] = None,
        max_cosine_distance: float = 0.15,
        max_distance_meters: float = 200.0,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Computes 384-dim embedding for title, queries PostgreSQL with pgvector and PostGIS.
        Identifies spatial proximity (<200m) and semantic title similarity (cosine distance < 0.15).
        """
        embedder = get_embedder()
        # Compute normalized 384-dim embedding
        vector = embedder.encode(title, normalize_embeddings=True).tolist()
        vector_str = f"[{','.join(f'{x:.6f}' for x in vector)}]"

        conn = get_db_connection()
        cur = conn.cursor()

        query = """
            SELECT 
                id,
                project_code,
                title,
                work_category,
                state,
                district,
                sanction_amount,
                status,
                latitude,
                longitude,
                ROUND(ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)::numeric, 1) AS distance_meters,
                ROUND((embedding <=> %s::vector)::numeric, 4) AS cosine_distance,
                ROUND((1 - (embedding <=> %s::vector))::numeric, 4) AS cosine_similarity
            FROM projects
            WHERE 
                (embedding <=> %s::vector) < %s
                OR ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
        """
        params = [lng, lat, vector_str, vector_str, vector_str, max_cosine_distance, lng, lat, max_distance_meters]

        if constituency_id:
            query += " AND constituency_id = %s"
            params.append(constituency_id)

        query += " ORDER BY cosine_distance ASC, distance_meters ASC LIMIT %s;"
        params.append(limit)

        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        matches = []
        is_duplicate = False
        highest_risk = 0.0

        for r in rows:
            dist_m = float(r[10]) if r[10] is not None else 99999.0
            cos_dist = float(r[11]) if r[11] is not None else 1.0
            cos_sim = float(r[12]) if r[12] is not None else 0.0

            # Multi-criteria collision scoring
            is_spatial_collision = dist_m <= max_distance_meters
            is_semantic_collision = cos_dist <= max_cosine_distance

            # Combined risk metric
            if is_spatial_collision and is_semantic_collision:
                collision_type = "DUPLICATE_WORK_EXACT_COLLISION"
                risk_score = round(min(1.0, (1.0 - cos_dist) * 0.6 + max(0.0, 1.0 - (dist_m / max_distance_meters)) * 0.4), 2)
                is_duplicate = True
            elif is_spatial_collision:
                collision_type = "ADJACENT_SPATIAL_WORK"
                risk_score = round(0.40 + max(0.0, 1.0 - (dist_m / max_distance_meters)) * 0.30, 2)
            else:
                collision_type = "SEMANTIC_TITLE_SIMILARITY"
                risk_score = round(max(0.0, (1.0 - cos_dist) * 0.75), 2)

            if risk_score > highest_risk:
                highest_risk = risk_score

            matches.append({
                "project_id": str(r[0]),
                "project_code": r[1],
                "title": r[2],
                "work_category": r[3],
                "state": r[4],
                "district": r[5],
                "sanction_amount": float(r[6]),
                "status": r[7],
                "latitude": float(r[8]),
                "longitude": float(r[9]),
                "distance_meters": dist_m,
                "cosine_distance": cos_dist,
                "cosine_similarity": cos_sim,
                "collision_type": collision_type,
                "risk_score": risk_score
            })

        explanation = ""
        if is_duplicate and matches:
            top = matches[0]
            explanation = (
                f"Critical Collision: Proposed work '{title}' is located within {top['distance_meters']}m "
                f"(< {max_distance_meters}m) of prior work '{top['title']}' ({top['project_code']}) "
                f"with {top['cosine_similarity']*100:.1f}% semantic title similarity. Highly likely duplicate billing."
            )
        elif matches:
            top = matches[0]
            explanation = (
                f"Notice: Detected potential overlapping work '{top['title']}' ({top['project_code']}) "
                f"at {top['distance_meters']}m distance with similarity {top['cosine_similarity']*100:.1f}%."
            )
        else:
            explanation = "Clear: No geospatial or semantic duplicates found within specified safety thresholds."

        return {
            "is_duplicate": is_duplicate,
            "duplicate_risk_score": highest_risk,
            "total_matches": len(matches),
            "explanation": explanation,
            "matches": matches
        }
