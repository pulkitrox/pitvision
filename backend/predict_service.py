"""PitVision AI — pit-stop prediction service.

Loads the trained stacking ensemble + ordinal encoder once at startup and
serves /api/predict for the static frontend.
"""
from __future__ import annotations

import logging
import os
import warnings
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

warnings.filterwarnings("ignore")  # silence sklearn version-mismatch noise

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).parent / "models"
_MODEL = None
_ENCODER = None
_FEATURES = None  # ordered feature names the model expects

# Map from frontend race labels to the encoder's known names.
RACE_ALIAS = {
    "Italian GP (Monza)": "Italian Grand Prix",
    "São Paulo GP": "São Paulo Grand Prix",
    "Sao Paulo GP": "São Paulo Grand Prix",
    "United States GP": "United States Grand Prix",
    "Mexico City GP": "Mexico City Grand Prix",
    "Las Vegas GP": "Las Vegas Grand Prix",
    "Abu Dhabi GP": "Abu Dhabi Grand Prix",
    "Qatar GP": "Qatar Grand Prix",
    "Bahrain GP": "Bahrain Grand Prix",
    "Saudi Arabian GP": "Saudi Arabian Grand Prix",
    "Australian GP": "Australian Grand Prix",
    "Japanese GP": "Japanese Grand Prix",
    "Chinese GP": "Chinese Grand Prix",
    "Miami GP": "Miami Grand Prix",
    "Emilia Romagna GP": "Emilia Romagna Grand Prix",
    "Monaco GP": "Monaco Grand Prix",
    "Canadian GP": "Canadian Grand Prix",
    "Spanish GP": "Spanish Grand Prix",
    "Austrian GP": "Austrian Grand Prix",
    "British GP": "British Grand Prix",
    "Hungarian GP": "Hungarian Grand Prix",
    "Belgian GP": "Belgian Grand Prix",
    "Dutch GP": "Dutch Grand Prix",
    "Azerbaijan GP": "Azerbaijan Grand Prix",
    "Singapore GP": "Singapore Grand Prix",
}


def load_model() -> None:
    global _MODEL, _ENCODER, _FEATURES
    if _MODEL is not None:
        return
    logger.info("Loading PitVision AI model from %s", MODEL_DIR)
    _ENCODER = joblib.load(MODEL_DIR / "ordinal_encoder.pkl")
    _MODEL = joblib.load(MODEL_DIR / "stack_model.pkl")
    _FEATURES = list(_MODEL.feature_names_in_)
    logger.info("Model loaded — %d features, classes=%s", len(_FEATURES), _MODEL.classes_)


class PredictRequest(BaseModel):
    driver: str
    race: str
    compound: str
    lapNumber: int = Field(..., ge=1, le=120)
    position: int = Field(..., ge=1, le=22)
    stint: int = Field(..., ge=1, le=8)
    tyreLife: float = Field(..., ge=0, le=80)
    lapTime: float
    lapDelta: float
    cumDeg: float
    raceProgress: float = Field(..., ge=0, le=100)
    posChange: int

    lapTimeLag1: Optional[float] = None
    lapTimeLag2: Optional[float] = None
    lapTimeLag3: Optional[float] = None
    lapDeltaLag1: Optional[float] = None
    lapDeltaLag2: Optional[float] = None
    lapDeltaLag3: Optional[float] = None
    positionLag1: Optional[float] = None
    positionLag2: Optional[float] = None

    rollAvgLT3: Optional[float] = None
    rollAvgLT5: Optional[float] = None
    rollStdLT3: Optional[float] = None
    rollStdLT5: Optional[float] = None
    rollAvgLD3: Optional[float] = None
    rollAvgLD5: Optional[float] = None

    degSlope: Optional[float] = None
    deltaAccel: Optional[float] = None
    posTrend: Optional[float] = None
    relLapTime: Optional[float] = None


def _encode_categoricals(driver: str, race: str, compound: str) -> tuple[float, float, float]:
    """Encode the three categorical inputs with the saved OrdinalEncoder."""
    race_resolved = RACE_ALIAS.get(race, race)

    # Replace unknown categories with the most common known category to avoid
    # encoder errors for 2025-grid drivers (ANT, BEA, DOO) that pre-date the encoder.
    known_drivers = set(_ENCODER.categories_[1])
    known_races = set(_ENCODER.categories_[0])
    known_compounds = set(_ENCODER.categories_[2])

    if driver not in known_drivers:
        driver = "VER"  # safe fallback
    if race_resolved not in known_races:
        race_resolved = "Italian Grand Prix"
    if compound not in known_compounds:
        compound = "MEDIUM"

    df = pd.DataFrame([[race_resolved, driver, compound]], columns=["Race", "Driver", "Compound"])
    encoded = _ENCODER.transform(df)[0]
    # encoder feature_names_in_ = ['Race','Driver','Compound']
    race_enc, driver_enc, compound_enc = float(encoded[0]), float(encoded[1]), float(encoded[2])
    return driver_enc, race_enc, compound_enc


def _build_feature_row(req: PredictRequest) -> pd.DataFrame:
    driver_enc, race_enc, compound_enc = _encode_categoricals(req.driver, req.race, req.compound)

    # Sensible default fallbacks for engineered features when the caller omits them.
    lt = req.lapTime
    ld = req.lapDelta

    values = {
        "Driver": driver_enc,
        "Race": race_enc,
        "Compound": compound_enc,
        "LapNumber": req.lapNumber,
        "Stint": req.stint,
        "TyreLife": req.tyreLife,
        "Position": req.position,
        "LapTime_(s)": lt,
        "LapTime_Delta": ld,
        "Cumulative_Degradation": req.cumDeg,
        "RaceProgress": req.raceProgress / 100.0,
        "Position_Change": req.posChange,
        "LapTime_Lag1": req.lapTimeLag1 if req.lapTimeLag1 is not None else lt,
        "LapTime_Lag2": req.lapTimeLag2 if req.lapTimeLag2 is not None else lt,
        "LapTime_Lag3": req.lapTimeLag3 if req.lapTimeLag3 is not None else lt,
        "LapDelta_Lag1": req.lapDeltaLag1 if req.lapDeltaLag1 is not None else ld,
        "LapDelta_Lag2": req.lapDeltaLag2 if req.lapDeltaLag2 is not None else ld,
        "LapDelta_Lag3": req.lapDeltaLag3 if req.lapDeltaLag3 is not None else ld,
        "Position_Lag1": req.positionLag1 if req.positionLag1 is not None else req.position,
        "Position_Lag2": req.positionLag2 if req.positionLag2 is not None else req.position,
        "RollingAvgLapTime_3": req.rollAvgLT3 if req.rollAvgLT3 is not None else lt,
        "RollingAvgLapTime_5": req.rollAvgLT5 if req.rollAvgLT5 is not None else lt,
        "RollingStdLapTime_3": req.rollStdLT3 if req.rollStdLT3 is not None else 0.2,
        "RollingStdLapTime_5": req.rollStdLT5 if req.rollStdLT5 is not None else 0.2,
        "RollingAvgLapDelta_3": req.rollAvgLD3 if req.rollAvgLD3 is not None else ld,
        "RollingAvgLapDelta_5": req.rollAvgLD5 if req.rollAvgLD5 is not None else ld,
        "DegradationSlope_3": req.degSlope if req.degSlope is not None else 0.0,
        "DeltaAcceleration": req.deltaAccel if req.deltaAccel is not None else 0.0,
        "PositionTrend_3": req.posTrend if req.posTrend is not None else 0.0,
        "RelativeLapTime": req.relLapTime if req.relLapTime is not None else 0.0,
    }
    df = pd.DataFrame([[values[c] for c in _FEATURES]], columns=_FEATURES)
    # XGBoost base learner was trained with 'LapTime (s)' (space) while the
    # StackingClassifier records 'LapTime_(s)' (underscore). Rename to satisfy XGB
    # while keeping the original order.
    if "LapTime_(s)" in df.columns:
        df = df.rename(columns={"LapTime_(s)": "LapTime (s)"})
    return df


router = APIRouter()


@router.get("/predict/health")
def health():
    load_model()
    return {
        "ok": True,
        "model": type(_MODEL).__name__,
        "n_features": len(_FEATURES),
        "drivers": list(_ENCODER.categories_[1]),
        "races": list(_ENCODER.categories_[0]),
        "compounds": list(_ENCODER.categories_[2]),
    }


@router.post("/predict")
def predict(req: PredictRequest):
    load_model()
    try:
        row = _build_feature_row(req)
        # Suppress sklearn's feature-name mismatch warning at the stacking level —
        # the base XGB learner uses a slightly different column name; values are
        # passed in the correct order.
        proba = _MODEL.predict_proba(row.values)[0]
        pit_prob = float(proba[list(_MODEL.classes_).index(1.0)])
        prediction = "Pit Next Lap" if pit_prob >= 0.5 else "Stay Out"
        confidence = round(max(pit_prob, 1 - pit_prob) * 100.0, 1)
        return {
            "prediction": prediction,
            "probability": round(pit_prob, 4),
            "confidence": confidence,
        }
    except Exception as exc:  # surface model errors as 400
        logger.exception("predict failed")
        raise HTTPException(status_code=400, detail=str(exc))
