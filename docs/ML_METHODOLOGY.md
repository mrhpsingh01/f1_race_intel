# Machine Learning Methodology & Evaluation

## 1. Temporal Cutoff Definitions

To prevent lookahead leakage, predictions are strictly segmented into two discrete cutoff events:

### Pre-Weekend Cutoff
- **Timestamp**: Locked prior to Free Practice 1 of the Grand Prix weekend.
- **Allowed Features**:
  - `driver_avg_finish_last5`: Rolling average finishing position over prior 5 starts.
  - `driver_podium_rate_last10`: Ratio of podium finishes over prior 10 starts.
  - `team_avg_finish_last5`: Team-level finishing position form.
  - `team_points_last5`: Cumulative constructor championship points across prior 5 events.
  - `circuit_best_result`: Historical best finish at this specific venue in previous seasons.
  - `circuit_avg_result`: Venue-specific historical average.
  - `driver_experience`: Total Grand Prix starts.
  - `is_home_race`: Binary indicator matching driver nationality to host nation.

### Post-Qualifying Cutoff
- **Timestamp**: Locked following the publication of the official starting grid.
- **Added Features**:
  - `qualifying_position`: Saturday qualifying classification (1–20).
  - `grid_position`: Starting grid position after application of grid penalties.
  - `gap_to_pole_ms`: Milliseconds delta to pole lap time.
  - `q3_entry`: Binary indicator for advancing to the top-10 Q3 shootout.

## 2. Baselines & Benchmarks

1. **Qualifying Baseline**: Empirical historical podium probability based strictly on qualifying grid slot ($P(\text{Podium} \mid \text{Grid}=1) \approx 62\%$, $P(\text{Podium} \mid \text{Grid}=2) \approx 40\%$).
2. **Recent Form Baseline**: Inverse linear mapping of rolling average finishing position.
3. **Calibrated Logistic Regression**: Linear baseline with isotonic probability calibration.
4. **Calibrated XGBoost**: Tree-based gradient boosted classifier evaluated with class reweighting and isotonic calibration.

## 3. Chronological Backtesting & Calibration

- Data is partitioned **chronologically by season**, never by random driver instances.
- Random row splits corrupt temporal ordering and cause within-race leakage.
- Metrics reported:
  - **Brier Score Loss**: $\frac{1}{N}\sum_{i=1}^N (p_i - y_i)^2$ (mean squared error of predicted probabilities).
  - **Log Loss**: Binary cross-entropy assessing probability confidence.
