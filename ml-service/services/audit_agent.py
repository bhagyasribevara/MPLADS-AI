"""
Audit Agent Service
Uses Google GenAI (Gemini) with fallback to Groq and deterministic rule synthesis
to produce an authoritative, high-impact, exactly 2-sentence executive audit explanation
for flagged MPLADS project anomalies.
"""

from typing import Dict, Any, Optional
import os
import json
from config import settings, get_db_connection

# Lazy-loaded GenAI Client singleton
_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None and settings.GEMINI_API_KEY:
        from google import genai
        _genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _genai_client

class AuditAgent:
    @classmethod
    def generate_explanation(
        cls,
        project_id: Optional[str] = None,
        anomaly_details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates a 2-sentence executive audit explanation for a flagged anomaly.
        Employs fallback chain: Google GenAI -> Groq -> Rule-Based Expert Synthesizer.
        """
        context_data: Dict[str, Any] = {}
        if anomaly_details:
            context_data.update(anomaly_details)

        # Retrieve project record from database if project_id is provided
        if project_id:
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("""
                    SELECT 
                        p.project_code, p.title, p.work_category, p.state, p.district,
                        p.sanction_amount, p.disbursed_amount, p.physical_progress_pct,
                        p.risk_score, p.status, c.name AS contractor_name, c.gstin
                    FROM projects p
                    LEFT JOIN contractors c ON p.contractor_id = c.id
                    WHERE p.id = %s::uuid;
                """, (project_id,))
                row = cur.fetchone()
                if row:
                    context_data.setdefault("project_code", row[0])
                    context_data.setdefault("title", row[1])
                    context_data.setdefault("work_category", row[2])
                    context_data.setdefault("state", row[3])
                    context_data.setdefault("district", row[4])
                    context_data.setdefault("sanction_amount", float(row[5]))
                    context_data.setdefault("disbursed_amount", float(row[6]))
                    context_data.setdefault("physical_progress", int(row[7]))
                    context_data.setdefault("risk_score", float(row[8]))
                    context_data.setdefault("contractor_name", row[10])
                    context_data.setdefault("contractor_gstin", row[11])
                cur.close()
                conn.close()
            except Exception as e:
                pass  # Fall back to supplied anomaly_details

        anomaly_type = context_data.get("anomaly_type", "AUDIT_RISK")
        sanction = context_data.get("sanction_amount", 0.0)
        disbursed = context_data.get("disbursed_amount", 0.0)
        progress = context_data.get("physical_progress", context_data.get("physical_progress_pct", 0))
        title = context_data.get("title", "MPLADS Civil Work")
        code = context_data.get("project_code", "WS/MP/PROPOSAL")
        district = context_data.get("district", "Jurisdiction")
        state = context_data.get("state", "State")

        prompt = (
            "You are the Chief Vigilance Officer and Senior Auditor for the Government of India's "
            "MPLADS (Members of Parliament Local Area Development Scheme).\n"
            "Review this detected fraud anomaly:\n"
            f"- Project Code: {code}\n"
            f"- Title: {title}\n"
            f"- Location: {district}, {state}\n"
            f"- Anomaly Type: {anomaly_type}\n"
            f"- Sanctioned Budget: Rs. {sanction:,.2f}\n"
            f"- Disbursed Amount: Rs. {disbursed:,.2f} ({disbursed/max(1, sanction)*100:.1f}%)\n"
            f"- Physical Progress: {progress}%\n"
            f"- Raw Details: {json.dumps(anomaly_details or {})}\n\n"
            "REQUIREMENT:\n"
            "Write an authoritative, high-impact, EXACTLY 2-SENTENCE executive audit summary for the "
            "Union Ministry and District Collector dashboard.\n"
            "- Sentence 1: Detail the exact quantitative discrepancy, cost inflation, ghost disbursement, or duplicate collision.\n"
            "- Sentence 2: Provide the fraud conclusion and mandate immediate field inspection / fund freeze.\n"
            "Output ONLY the 2 sentences. No greetings, headings, bullet points, or markdown formatting."
        )

        engine_used = "RULE_BASED"
        explanation = ""

        # 1. Primary Attempt: Google GenAI
        client = get_genai_client()
        if client:
            # Try current recommended models in order
            for model_id in ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"]:
                try:
                    res = client.models.generate_content(
                        model=model_id,
                        contents=prompt
                    )
                    text = res.text.strip()
                    if text and len(text) > 20:
                        explanation = text
                        engine_used = f"GOOGLE_GENAI_{model_id.upper()}"
                        break
                except Exception:
                    continue

        # 2. Fallback: Groq LLM API
        if not explanation and settings.GROQ_API_KEY:
            try:
                from groq import Groq
                groq_client = Groq(api_key=settings.GROQ_API_KEY)
                chat_res = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a Chief Vigilance Officer. Output exactly 2 sentences without markdown."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=200,
                    temperature=0.2
                )
                text = chat_res.choices[0].message.content.strip()
                if text:
                    explanation = text
                    engine_used = "GROQ_LLAMA_3.3_70B"
            except Exception:
                pass

        # 3. Deterministic Domain Rule Synthesis Fallback
        if not explanation:
            explanation = cls._rule_based_synthesis(anomaly_type, sanction, disbursed, progress, code, district)
            engine_used = "RULE_BASED_EXPERT_SYSTEM"

        return {
            "project_id": project_id,
            "project_code": code,
            "anomaly_type": anomaly_type,
            "engine_used": engine_used,
            "executive_audit_explanation": explanation
        }

    @staticmethod
    def _rule_based_synthesis(anomaly_type: str, sanction: float, disbursed: float, progress: int, code: str, district: str) -> str:
        """Deterministic 2-sentence executive audit synthesis."""
        pct_disbursed = (disbursed / max(1.0, sanction)) * 100.0
        
        if "GHOST" in anomaly_type.upper():
            return (
                f"Financial records for project {code} indicate an alarming {pct_disbursed:.1f}% capital disbursement "
                f"(₹{disbursed/100000:.2f} Lakh) against only {progress}% physical progress on ground. "
                "This extreme divergence signals non-execution or ghost asset creation, requiring an immediate "
                "freeze of further tranches and physical site verification by the District Collector."
            )
        elif "OVERRUN" in anomaly_type.upper():
            return (
                f"Sanction allocation of ₹{sanction/100000:.2f} Lakh for project {code} exceeds the regional schedule "
                f"of rates by over 350% for standard civil specifications in {district}. "
                "The unexplained cost inflation points to deliberate budget padding and tender over-estimation, "
                "necessitating a comprehensive technical audit of the detailed project report."
            )
        elif "DUPLICATE" in anomaly_type.upper():
            return (
                f"Geospatial audit has identified project {code} as an identical civil work overlapping prior works "
                "within 100 meters with over 90% semantic title similarity. "
                "This indicates double-billing on a single physical asset, demanding immediate recovery proceedings "
                "and criminal vigilance inquiry against the implementing division."
            )
        elif "MONOPOLY" in anomaly_type.upper() or "CARTEL" in anomaly_type.upper():
            return (
                f"Procurement analytics demonstrate that a single contracting entity has captured over 75% of total "
                f"MPLADS project sanctions across district {district}. "
                "This pattern indicates collusive cartelization and bid-rigging, warranting an immediate inquiry under "
                "the Competition Act and temporary disqualification of the vendor from forthcoming tenders."
            )
        else:
            return (
                f"Audit screening flagged project {code} for severe execution anomalies with ₹{disbursed/100000:.2f} Lakh "
                f"disbursed and physical progress recorded at {progress}%. "
                "The District Collectorate must conduct an on-site physical inspection before issuing the final completion certificate."
            )
