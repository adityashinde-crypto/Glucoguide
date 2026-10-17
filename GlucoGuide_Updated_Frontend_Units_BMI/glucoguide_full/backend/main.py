from pathlib import Path
from typing import Optional
import warnings

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
MODEL_PATH = Path(__file__).resolve().parent / "glucoguide_random_forest.joblib"
FEATURES = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
]

if not MODEL_PATH.exists():
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

# This is the user's trained pipeline, including median imputation and Random Forest.
model = joblib.load(MODEL_PATH)
model_features = list(getattr(model, "feature_names_in_", FEATURES))
if model_features != FEATURES:
    raise RuntimeError(f"Model feature mismatch. Expected {FEATURES}, found {model_features}")

app = FastAPI(
    title="GlucoGuide API",
    description="Educational diabetes-risk classification demo using a trained Random Forest pipeline.",
    version="1.0.0",
)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

class HealthInput(BaseModel):
    Pregnancies: int = Field(ge=0, le=30, description="Number of pregnancies")
    Glucose: float = Field(gt=0, le=500, description="Glucose measurement")
    BloodPressure: float = Field(gt=0, le=300, description="Diastolic blood pressure measurement")
    SkinThickness: float = Field(ge=0, le=150, description="Skin thickness measurement")
    Insulin: float = Field(ge=0, le=3000, description="Insulin measurement")
    BMI: float = Field(gt=0, le=100, description="Body mass index")
    DiabetesPedigreeFunction: float = Field(ge=0, le=10, description="Dataset's diabetes pedigree function")
    Age: int = Field(ge=1, le=120, description="Age in years")

@app.get("/", include_in_schema=False)
def index():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/api/health")
def health():
    return {"status": "ok", "model": "Random Forest", "features": FEATURES}

@app.post("/api/predict")
def predict(data: HealthInput):
    try:
        row = pd.DataFrame([data.model_dump()], columns=FEATURES)
        # Apply the saved SimpleImputer's learned medians explicitly, then call
        # the saved forest. This is equivalent to the fitted pipeline's steps
        # and avoids relying on version-specific SimpleImputer.transform internals.
        imputer = model.named_steps["imputer"]
        classifier = model.named_steps["classifier"]
        values = row.to_numpy(dtype=float)
        medians = np.asarray(imputer.statistics_, dtype=float)
        missing = np.isnan(values)
        if missing.any():
            values[missing] = np.broadcast_to(medians, values.shape)[missing]
        prediction = int(classifier.predict(values)[0])
        probability: Optional[float] = None
        if hasattr(classifier, "predict_proba"):
            classes = list(classifier.classes_)
            if 1 in classes:
                probability = float(classifier.predict_proba(values)[0][classes.index(1)])
        return {
            "prediction": prediction,
            "label": "Positive model classification" if prediction == 1 else "Negative model classification",
            "probability": probability,
            "model": "Random Forest",
            "disclaimer": "Educational estimate only. This is not a diagnosis or a substitute for professional medical advice."
        }
    except Exception as exc:
        # Avoid exposing internal paths or model details to the browser.
        raise HTTPException(status_code=500, detail="Prediction failed. Check the backend console for details.") from exc
