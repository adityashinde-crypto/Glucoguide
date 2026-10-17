# GlucoGuide — Random Forest Diabetes Classification Demo

A responsive HTML/CSS/JavaScript frontend and FastAPI backend using the supplied trained Random Forest pipeline at `backend/glucoguide_random_forest.joblib`.

## Model input features and units shown in the form

The API expects these eight columns, in this exact order:

1. `Pregnancies` — count
2. `Glucose` — mg/dL
3. `BloodPressure` — mmHg (diastolic/lower number)
4. `SkinThickness` — mm
5. `Insulin` — µU/mL (micro-units per millilitre)
6. `BMI` — kg/m²
7. `DiabetesPedigreeFunction` — dataset-derived score, unitless
8. `Age` — years

These labels correspond to the commonly used Pima Indians Diabetes dataset schema. Verify against the precise source and documentation used to train the model before interpreting any values. Do not substitute family-history yes/no or physical-activity choices for `DiabetesPedigreeFunction`: they are different features.

The BMI calculator computes `weight_kg / (height_m ** 2)` and fills the BMI field.

## Run on Windows

1. Install a Python version compatible with the saved scikit-learn artifact. The model was serialized with scikit-learn 1.6.1; use the pinned dependency below.
2. Open PowerShell in this folder (the folder containing `requirements.txt`).
3. Create a virtual environment using an installed Python version, for example:

   ```powershell
   py -0p
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```

   If Python 3.12 is not installed, install it or try the installed Python version and check that all dependencies install and the saved model loads correctly.
4. Start the application from the project root:

   ```powershell
   python -m uvicorn backend.main:app --reload
   ```
5. Open `http://127.0.0.1:8000`. API documentation is at `http://127.0.0.1:8000/docs`.

The frontend is served by FastAPI at the same origin. Do not double-click `index.html` or use a separate Live Server URL for the integrated app.

## API

- `GET /api/health`
- `POST /api/predict`

## Important limitations

This is an educational project, not a clinically validated diagnostic system. Model probability is not necessarily calibrated personal risk. The app does not store submissions and has no database. The saved model is loaded from a joblib file; only load model files from trusted sources.
