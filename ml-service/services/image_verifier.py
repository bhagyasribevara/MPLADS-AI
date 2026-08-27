"""
Image Verifier Service
Uses perceptual hashing (imagehash.phash) to detect duplicate, manipulated,
or re-uploaded milestone inspection photos across different works and projects.
"""

from typing import Dict, Any, List, Optional
import io
from config import get_db_connection

class ImageVerifier:
    HAMMING_THRESHOLD = 8  # 8 bits difference out of 64 bits indicates visual duplicate

    @classmethod
    def compute_hash(cls, file_bytes: bytes) -> str:
        """
        Computes 64-bit perceptual hash (pHash) from image bytes.
        """
        try:
            from PIL import Image
            import imagehash
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            h = imagehash.phash(image)
            return str(h)
        except Exception as e:
            raise ValueError(f"Invalid image format or corrupted file: {e}")

    @classmethod
    def verify_milestone_image(
        cls,
        file_bytes: bytes,
        project_id: str
    ) -> Dict[str, Any]:
        """
        Computes perceptual hash of uploaded inspection image, queries existing milestone
        hashes from database, and computes pairwise Hamming distance.
        """
        current_hash_str = cls.compute_hash(file_bytes)
        current_hash = imagehash.hex_to_hash(current_hash_str)

        conn = get_db_connection()
        cur = conn.cursor()

        # Query all existing milestone hashes
        cur.execute("""
            SELECT 
                m.id,
                m.project_id,
                m.stage_name,
                m.image_hash,
                m.image_url,
                p.project_code,
                p.title
            FROM milestones m
            JOIN projects p ON m.project_id = p.id
            WHERE m.image_hash IS NOT NULL;
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        collisions: List[Dict[str, Any]] = []
        is_duplicate = False
        min_distance = 64

        for r in rows:
            m_id, p_id, stage, existing_hash_str, img_url, p_code, p_title = r
            
            # Check if valid 16-hex char pHash
            if not existing_hash_str or len(existing_hash_str) != 16:
                continue

            try:
                existing_hash = imagehash.hex_to_hash(existing_hash_str)
                dist = int(current_hash - existing_hash)
            except Exception:
                continue

            if dist < min_distance:
                min_distance = dist

            if dist <= cls.HAMMING_THRESHOLD:
                is_duplicate = True
                similarity_pct = round(((64 - dist) / 64.0) * 100.0, 1)
                is_cross_project = (str(p_id) != str(project_id))
                
                collisions.append({
                    "milestone_id": str(m_id),
                    "matched_project_id": str(p_id),
                    "matched_project_code": p_code,
                    "matched_project_title": p_title,
                    "matched_stage_name": stage,
                    "matched_image_url": img_url,
                    "hamming_distance": dist,
                    "similarity_pct": similarity_pct,
                    "is_cross_project_fraud": is_cross_project
                })

        # Sort collisions by nearest Hamming distance
        collisions.sort(key=lambda x: x["hamming_distance"])

        if is_duplicate and collisions:
            top = collisions[0]
            verdict = "FLAGGED_DUPLICATE_IMAGE"
            explanation = (
                f"Fraud Warning: Uploaded milestone photo has {top['similarity_pct']}% visual match "
                f"(Hamming distance: {top['hamming_distance']} bits) with milestone '{top['matched_stage_name']}' "
                f"from project '{top['matched_project_title']}' ({top['matched_project_code']}). "
                "Evidence of recycled photographic proof."
            )
        else:
            verdict = "VERIFIED_AUTHENTIC"
            similarity_pct = round(((64 - min_distance) / 64.0) * 100.0, 1) if rows else 0.0
            explanation = (
                f"Verification Passed: Photo is perceptually unique across system records "
                f"(Minimum Hamming distance: {min_distance} bits, max similarity: {similarity_pct}%)."
            )

        return {
            "verdict": verdict,
            "is_duplicate_image": is_duplicate,
            "image_phash": current_hash_str,
            "min_hamming_distance": min_distance,
            "total_collisions": len(collisions),
            "explanation": explanation,
            "matched_milestones": collisions[:5]
        }
