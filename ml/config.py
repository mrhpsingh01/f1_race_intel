from dataclasses import dataclass, field
from typing import List

@dataclass
class MLConfig:
    # Features for pre-weekend model
    pre_weekend_features: List[str] = field(default_factory=lambda: [
        'driver_avg_finish_last5',
        'driver_podium_rate_last10',
        'team_avg_finish_last5',
        'team_points_last5',
        'circuit_best_result',
        'circuit_avg_result',
        'driver_experience',
        'is_home_race',
    ])
    
    # Additional features added after qualifying
    post_qualifying_features: List[str] = field(default_factory=lambda: [
        'driver_avg_finish_last5',
        'driver_podium_rate_last10',
        'team_avg_finish_last5',
        'team_points_last5',
        'circuit_best_result',
        'circuit_avg_result',
        'driver_experience',
        'is_home_race',
        'qualifying_position',
        'grid_position',
        'gap_to_pole_ms',
        'q3_entry',
    ])
    
    target_col: str = 'target'  # 1 = podium, 0 = not
    random_state: int = 42
    n_estimators: int = 300
    max_depth: int = 4
    learning_rate: float = 0.05
    min_child_weight: int = 5
    subsample: float = 0.8
    colsample_bytree: float = 0.8

default_config = MLConfig()
