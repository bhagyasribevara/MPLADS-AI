"""
Cost Anomaly Service
Integrates an Isolation Forest model and a statistical standard-deviation / z-score outlier
engine to detect ghost projects (fund-to-progress mismatches) and abnormal cost overruns.
"""

from typing import Dict, Any, Optional
import numpy as np
from config import get_db_connection

# Category standard median benchmarks and standard deviations (INR)
BENCHMARKS = {
    "Construction of roads, link roads, pathways": {"median": 1200000.0, "std": 350000.0},
    "Construction of buildings for community cultural activities": {"median": 2000000.0, "std": 500000.0},
    "Construction of rooms and halls in school and colleges": {"median": 1800000.0, "std": 450000.0},
    "Installing community drinking water plants": {"median": 650000.0, "std": 150000.0},
    "Construction of culverts and bridges": {"median": 2500000.0, "std": 600000.0},
    "Installation of high mast solar street lights": {"median": 450000.0, "std": 100000.0},
    "Public sanitation and community toilet complexes": {"median": 900000.0, "std": 200000.0},
    "Construction of public health sub-centres": {"median": 3000000.0, "std": 700000.0},
}

_DEFAULT_MEDIAN = 1500000.0
_DEFAULT_STD = 400000.0

# Singleton IsolationForest model
_isolation_forest_model: Optional[Any] = None

def get_isolation_forest():
    global _isolation_forest_model
    if _isolation_forest_model is None:
        from sklearn.ensemble import IsolationForest
        # Fit on synthetic normal distribution feature vectors:
        # [sanction_amount, disbursed_ratio, progress_ratio, gap (disbursed_ratio - progress_ratio)]
        np.random.seed(42)
        n_samples = 1000
        sanctions = np.random.uniform(500000, 3500000, n_samples)
        progress = np.random.uniform(0.1, 1.0, n_samples)
        # In normal projects, disbursed ratio tightly tracks physical progress
        disbursed_ratio = np.clip(progress + np.random.normal(0, 0.05, n_samples), 0.0, 1.0)
        gap = disbursed_ratio - progress
        
        X_train = np.column_stack([sanctions, disbursed_ratio, progress, gap])
        
        clf = IsolationForest(contamination=0.10, random_state=42)
        clf.fit(X_train)
        _isolation_forest = clf
    return _isolation_forest

class CostAnomalyEngine:
    @classmethod
    def score_anomaly(
        cls,
        sanction_amount: float,
        disbursed_amount: float,
        physical_progress: int,
        work_category: str
    ) -> Dict[str, Any]:
        """
        Evaluates project financial health using dual-engine analysis:
        1. Isolation Forest on multi-dimensional fund vs progress ratios.
        2. Statistical schedule of rates (SoR) outlier z-score analysis.
        """
        disbursed_amount = max(0.0, float(disbursed_amount))
        sanction_amount = max(1.0, float(sanction_amount))
        physical_progress = max(0, min(100, int(physical_progress)))

        disbursed_ratio = min(1.0, disbursed_amount / sanction_amount)
        progress_ratio = physical_progress / 100.0
        gap = disbursed_ratio - progress_ratio

        # 1. Isolation Forest Evaluation
        clf = get_isolation_forest()
        sample = np.array([[sanction_amount, disbursed_ratio, progress_ratio, gap]])
        iso_pred = clf.predict(sample)[0] # -1 for anomaly, +1 for normal
        iso_score = float(clf.decision_function(sample)[0]) # Lower is more anomalous
        iso_anomaly = (iso_pred == -1)

        # 2. Benchmark Statistical Analysis
        bench = BENCHMARKS.get(work_category, {"median": _DEFAULT_MEDIAN, "std": _DEFAULT_STD})
        median_cost = bench["median"]
        std_cost = bench["std"]
        cost_multiplier = round(sanction_amount / median_cost, 2)
        z_score = round((sanction_amount - median_cost) / std_cost, 2)

        # 3. Anomaly Classification Logic
        is_ghost = (disbursed_ratio >= 0.85 and physical_progress < 25)
        is_overrun = (cost_multiplier >= 3.2 or z_score >= 3.5)

        anomaly_type = "NORMAL"
        confidence_score = 0.0
        explanation_parts = []

        if is_ghost:
            anomaly_type = "GHOST_PROJECT"
            confidence_score = round(min(0.99, 0.88 + (disbursed_ratio * 0.08) + ((25 - physical_progress) / 100.0)), 2)
            explanation_parts.append(
                f"Ghost Project Risk: Disbursed ₹{disbursed_amount/100000:.2f}L ({disbursed_ratio*100:.1f}%), "
                f"while physical progress is only {physical_progress}%. Severe fund leakage indicator."
            )

        if is_overrun:
            if not is_ghost:
                anomaly_type = "COST_OVERRUN"
            overrun_conf = round(min(0.98, 0.82 + min(0.16, (cost_multiplier - 3.0) * 0.1)), 2)
            confidence_score = max(confidence_score, overrun_conf)
            explanation_parts.append(
                f"Cost Inflation Risk: Sanction amount of ₹{sanction_amount/100000:.2f}L is {cost_multiplier:.1f}x "
                f"higher than regional median (₹{median_cost/100000:.2f}L, z-score: {z_score})."
            )

        if not is_ghost and not is_overrun and iso_anomaly and gap > 0.40:
            anomaly_type = "DISBURSEMENT_MISMATCH"
            confidence_score = round(0.70 + min(0.20, gap * 0.3), 2)
            explanation_parts.append(
                f"Irregular Disbursement Velocity: Disbursed ratio ({disbursed_ratio*100:.1f}%) "
                f"exceeds physical progress ({physical_progress}%) by {gap*100:.1f} percentage points."
            )

        is_anomalous = (anomaly_type != "NORMAL")
        
        if not is_anomalous:
            risk_score = round(max(0.02, min(0.25, 0.10 + (cost_multiplier - 1.0) * 0.05)), 2)
            risk_level = "LOW"
            explanation = "Project financials and progress parameters are within expected empirical limits."
        else:
            risk_score = confidence_score
            risk_level = "CRITICAL" if risk_score >= 0.85 else "HIGH" if risk_score >= 0.70 else "MODERATE"
            explanation = " | ".join(explanation_parts)

        return {
            "is_anomalous": is_anomalous,
            "anomaly_type": anomaly_type,
            "is_ghost_project": is_ghost,
            "is_cost_overrun": is_overrun,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "disbursed_pct": round(disbursed_ratio * 100, 1),
            "progress_pct": physical_progress,
            "category_median_inr": median_cost,
            "cost_multiplier": cost_multiplier,
            "z_score": z_score,
            "isolation_forest_score": round(iso_score, 4),
            "explanation": explanation
        }
