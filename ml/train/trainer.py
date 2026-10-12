import pandas as pd
import numpy as np
import json
import logging
from pathlib import Path
from datetime import datetime
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import brier_score_loss, log_loss
import xgboost as xgb
import pickle
from typing import List, Optional, Tuple
from ml.config import MLConfig, default_config

logger = logging.getLogger(__name__)

class BaselineQualifyingModel:
    '''Baseline: predict from qualifying position only'''
    # Empirical podium probability by qualifying position
    QUALI_PODIUM_PROBS = {
        1: 0.62, 2: 0.40, 3: 0.30, 4: 0.20, 5: 0.15,
        6: 0.10, 7: 0.07, 8: 0.05, 9: 0.04, 10: 0.03,
    }
    DEFAULT_PROB = 0.01
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        probs = []
        for _, row in X.iterrows():
            pos = int(row.get('qualifying_position', 20))
            prob = self.QUALI_PODIUM_PROBS.get(pos, self.DEFAULT_PROB)
            probs.append([1 - prob, prob])
        return np.array(probs)

class BaselineRecentFormModel:
    '''Baseline: predict from recent average finishing position'''
    def fit(self, X: pd.DataFrame, y: pd.Series):
        # Calibrate thresholds from training data
        self.min_avg = X['driver_avg_finish_last5'].min()
        self.max_avg = X['driver_avg_finish_last5'].max()
        return self
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        probs = []
        for _, row in X.iterrows():
            avg = row.get('driver_avg_finish_last5', 10)
            if pd.isna(avg):
                avg = 10
            # Invert: lower avg position = better
            prob = max(0.01, min(0.70, (20 - avg) / 20 * 0.5))
            probs.append([1 - prob, prob])
        return np.array(probs)

def train_logistic_regression(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    feature_cols: List[str]
) -> Pipeline:
    '''Train calibrated logistic regression'''
    X = X_train[feature_cols].fillna(X_train[feature_cols].median())
    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', CalibratedClassifierCV(
            LogisticRegression(max_iter=1000, C=0.1, random_state=42),
            cv=3, method='isotonic'
        ))
    ])
    pipe.fit(X, y_train)
    return pipe

def train_xgboost(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    feature_cols: List[str],
    config: MLConfig = default_config
) -> xgb.XGBClassifier:
    '''Train calibrated XGBoost model'''
    X = X_train[feature_cols].fillna(-1)
    
    # Handle class imbalance
    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    
    model = xgb.XGBClassifier(
        n_estimators=config.n_estimators,
        max_depth=config.max_depth,
        learning_rate=config.learning_rate,
        min_child_weight=config.min_child_weight,
        subsample=config.subsample,
        colsample_bytree=config.colsample_bytree,
        scale_pos_weight=scale_pos_weight,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=config.random_state,
        verbosity=0,
    )
    calibrated = CalibratedClassifierCV(model, cv=3, method='isotonic')
    calibrated.fit(X, y_train)
    return calibrated

def evaluate_model(
    model,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    feature_cols: List[str],
    model_name: str
) -> dict:
    '''Compute evaluation metrics'''
    X = X_test[feature_cols].fillna(-1 if 'xgb' in model_name.lower() else X_test[feature_cols].median())
    y_proba = model.predict_proba(X)[:, 1]
    
    bs = brier_score_loss(y_test, y_proba)
    ll = log_loss(y_test, y_proba, labels=[0, 1])
    
    # Top-3 recall per race
    test_df = X_test.copy()
    test_df['y_true'] = y_test.values
    test_df['y_pred'] = y_proba
    
    # Calibration note
    proba_bins = pd.cut(y_proba, bins=[0, 0.1, 0.2, 0.3, 0.5, 1.0])
    calibration_note = f'Brier score: {bs:.4f} (lower = better). Log loss: {ll:.4f}.'
    
    logger.info(f'{model_name}: Brier={bs:.4f}, LogLoss={ll:.4f}')
    
    return {
        'model_name': model_name,
        'brier_score': round(bs, 4),
        'log_loss': round(ll, 4),
        'calibration_note': calibration_note,
        'n_test_samples': len(y_test),
        'n_positives': int(y_test.sum()),
    }

def get_feature_importance(model, feature_cols: List[str]) -> List[dict]:
    '''Extract feature importances from XGBoost or logistic regression'''
    try:
        # Try XGBoost
        xgb_model = model
        if hasattr(model, 'calibrated_classifiers_'):
            xgb_model = model.calibrated_classifiers_[0].estimator
        if hasattr(xgb_model, 'feature_importances_'):
            importances = xgb_model.feature_importances_
            return sorted(
                [{'feature': f, 'importance': round(float(i), 4)} for f, i in zip(feature_cols, importances)],
                key=lambda x: -x['importance']
            )
        # Logistic regression
        if hasattr(model, 'named_steps') and hasattr(model.named_steps.get('clf'), 'calibrated_classifiers_'):
            lr = model.named_steps['clf'].calibrated_classifiers_[0].estimator
            coefs = np.abs(lr.coef_[0])
            return sorted(
                [{'feature': f, 'importance': round(float(c), 4)} for f, c in zip(feature_cols, coefs)],
                key=lambda x: -x['importance']
            )
    except Exception:
        pass
    return [{'feature': f, 'importance': 0.0} for f in feature_cols]

def save_model(model, model_version: str, model_dir: str = 'ml/models'):
    path = Path(model_dir)
    path.mkdir(parents=True, exist_ok=True)
    model_path = path / f'{model_version}.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    logger.info(f'Model saved to {model_path}')
    return str(model_path)

def load_model(model_version: str, model_dir: str = 'ml/models'):
    path = Path(model_dir) / f'{model_version}.pkl'
    if not path.exists():
        raise FileNotFoundError(f'Model not found: {path}')
    with open(path, 'rb') as f:
        return pickle.load(f)
