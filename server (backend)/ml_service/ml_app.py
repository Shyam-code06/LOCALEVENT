import os
import pickle
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler

app = FastAPI(title="Event Recommendation ML Service")

# Canonical categories used by backend and ML pipeline
KNOWN_CATEGORIES = ['Tech', 'Food', 'Music', 'Sports', 'Workshop', 'Meetup', 'Art', 'Other']

def normalize_category(raw):
    if raw is None:
        return 'Other'
    s = str(raw).strip().lower()
    if not s:
        return 'Other'
    for c in KNOWN_CATEGORIES:
        if c.lower() == s:
            return c
    if 'tech' in s:
        return 'Tech'
    if 'food' in s:
        return 'Food'
    if 'music' in s:
        return 'Music'
    if 'sport' in s:
        return 'Sports'
    if 'workshop' in s:
        return 'Workshop'
    if 'meetup' in s:
        return 'Meetup'
    if 'art' in s:
        return 'Art'
    return 'Other'

MODEL_PATH = "model.pkl"
SCALER_PATH = "scaler.pkl"
DATA_DIR = os.path.join("..", "data_mirrors")

class TrainingData(BaseModel):
    features: List[Dict[str, float]]
    labels: List[float]

class PredictionRequest(BaseModel):
    user_features: Dict[str, float]
    # Event features may contain both numeric and string fields (e.g., 'category'),
    # accept Any so Pydantic won't reject valid mixed payloads.
    event_features: List[Dict[str, Any]]

def load_model():
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    return None

def load_scaler():
    if os.path.exists(SCALER_PATH):
        with open(SCALER_PATH, "rb") as f:
            return pickle.load(f)
    return None


@app.on_event("startup")
async def startup_event():
    try:
        routes = [(route.path, getattr(route, 'methods', None)) for route in app.routes]
        print("[ML_SERVICE] Registered routes:", routes)
    except Exception as e:
        print("[ML_SERVICE] Error listing routes:", e)


@app.middleware("http")
async def log_requests(request, call_next):
    print(f"[ML_SERVICE] Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[ML_SERVICE] Response status: {response.status_code} for {request.method} {request.url.path}")
    return response

@app.post("/train")
async def train_model():
    users_csv = os.path.join(DATA_DIR, "users.csv")
    events_csv = os.path.join(DATA_DIR, "events.csv")
    feedbacks_csv = os.path.join(DATA_DIR, "feedbacks.csv")

    if not all(os.path.exists(f) for f in [users_csv, events_csv, feedbacks_csv]):
        raise HTTPException(status_code=404, detail="One or more CSV files missing in data_mirrors")

    try:
        users_df = pd.read_csv(users_csv)
        events_df = pd.read_csv(events_csv)
        feedbacks_df = pd.read_csv(feedbacks_csv)

        if feedbacks_df.empty:
            return {"message": "No feedback data yet, skipping training"}

        # Data Cleaning & Merging
        import json

        def parse_json_col(val):
            if pd.isna(val):
                return {}
            if isinstance(val, str):
                s = val.strip()
                # Remove surrounding quotes added by CSV quoting
                if s.startswith('"') and s.endswith('"'):
                    s = s[1:-1]
                # Replace double-double-quotes with single quotes
                s = s.replace('""', '"')
                try:
                    return json.loads(s)
                except Exception:
                    try:
                        import ast
                        return ast.literal_eval(s)
                    except Exception:
                        return {}
            return {}

        # Extract interest weights from users and normalize keys
        users_df['weights'] = users_df['interestWeights'].apply(parse_json_col)
        # Normalize weight keys per-row to canonical categories
        users_df['weights_norm'] = users_df['weights'].apply(lambda d: {normalize_category(k): v for k, v in (d or {}).items()})
        weights_expanded = pd.json_normalize(users_df['weights_norm'])
        # Ensure all expected interest categories exist
        categories = KNOWN_CATEGORIES
        for c in categories:
            if c not in weights_expanded.columns:
                weights_expanded[c] = 0.5
        weights_expanded = weights_expanded.fillna(0.5)
        # Add 'u_' prefix to distinguish from event features
        weights_expanded.columns = [f"u_{c}" for c in weights_expanded.columns]
        users_clean = pd.concat([users_df[['_id']], weights_expanded.reset_index(drop=True)], axis=1)

        # Normalize event categories then expand into dummies
        events_df['category'] = events_df['category'].apply(normalize_category)
        events_clean = pd.get_dummies(events_df[['_id', 'category', 'popularityScore', 'organizerRating']], columns=['category'], prefix='e_is')
        
        # Merge all into a training set
        train_df = feedbacks_df.merge(users_clean, left_on='user', right_on='_id')
        train_df = train_df.merge(events_clean, left_on='event', right_on='_id')

        # Select feature columns (u_* and e_is_*, popularity, etc.)
        feature_cols = [c for c in train_df.columns if c.startswith('u_') or c.startswith('e_is_') or c in ['popularityScore', 'organizerRating']]
        
        X = train_df[feature_cols].fillna(0)
        y = train_df['rating']

        if len(y) < 2:
            return {"message": "Insufficient data points for training (minimum 2 required)", "data_points": len(y)}

        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_scaled, y)
        
        # Save model, scaler and feature column names for prediction consistency
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({"model": model, "feature_cols": feature_cols}, f)
        with open(SCALER_PATH, "wb") as f:
            pickle.dump(scaler, f)
        
        return {"message": "Model trained successfully from CSV", "data_points": len(y), "features": feature_cols}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/predict")
async def predict(request: PredictionRequest):
    model_data = load_model()
    scaler = load_scaler()
    
    if model_data is None or scaler is None:
        # Fallback to neutral scores if model isn't trained
        return {"scores": [0.5 for _ in request.event_features], "note": "Model not trained yet, returning neutral scores"}
    
    model = model_data["model"]
    feature_cols = model_data["feature_cols"]

    predictions = []
    for event in request.event_features:
        # Construct the same feature vector as used in training
        row = {f"u_{k}": v for k, v in request.user_features.items()}
        # Map event features
        row['popularityScore'] = event.get('popularity', 0)
        row['organizerRating'] = event.get('organizerRating', 0)
        
        # Category dummies (ensure we compare using normalized names)
        for col in feature_cols:
            if col.startswith('e_is_'):
                cat_name = col.replace('e_is_', '')
                row[col] = 1 if normalize_category(event.get('category')) == cat_name else 0
        
        # Ensure all feature_cols are present in the correct order
        feat_vector = [row.get(c, 0) for c in feature_cols]
        feat_df = pd.DataFrame([feat_vector], columns=feature_cols)
        
        feat_scaled = scaler.transform(feat_df)
        score = model.predict(feat_scaled)[0]
        predictions.append(float(score))
    
    return {"scores": predictions}

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": os.path.exists(MODEL_PATH)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
