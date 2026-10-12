# F1 Data Assistant — Function Calling & Safety Design

## 1. Safety Principles

1. **Controlled Function Execution Only**: The assistant is given a strict set of domain-specific data functions. It is never given raw SQL execution capabilities or open shell access.
2. **Citation Requirement**: Every claim must link to a verified session, chart, or prediction model version.
3. **No Hallucination of Telemetry**: If telemetry records or lap assets do not exist for a requested session, the assistant explicitly states the data is unavailable rather than improvising traces.

## 2. Controlled Function Manifest

| Function Name | Description | Key Parameters |
|---|---|---|
| `get_race_summary` | Retrieves race results, grid, classification, and gaps | `race_id` |
| `get_driver_form` | Rolling finishes and podium rates before a race cutoff | `driver_id`, `before_race_id`, `n_races` |
| `get_prediction` | Model probability and feature importance factors | `race_id`, `driver_id`, `cutoff_type` |
| `compare_laps` | Distance-aligned telemetry comparison and time delta | `session_id`, `driver_a`, `lap_a`, `driver_b`, `lap_b` |
| `get_tyre_analysis` | Clean pace by compound and estimated degradation slope | `race_id`, `driver_id`, `compound` |
| `get_chart_link` | Deep-link to the relevant app chart | `chart_type`, `race_id`, `session_id` |

## 3. Fixed Benchmark Questions

The assistant has been verified against the 6 core benchmark scenarios:

1. **Prediction Comparison**: *"Why does Driver A have a higher podium probability than Driver B?"*
   - Returns calibrated probabilities and cites relative grid positions, team form, and rolling averages.
2. **Telemetry Duel Analysis**: *"Where did Driver A gain time in these two laps?"*
   - Cites corner braking zones, apex speeds, and exit throttle pickup.
3. **Stint & Tyre Evaluation**: *"Which driver had better pace on medium tyres after lap 20?"*
   - Reports empirical lap times and estimated degradation per lap.
4. **Race Strategy Shift**: *"What happened to the order around the first pit window?"*
   - Explains pit stop timing, in/out lap delta, and undercut/overcut positions.
5. **Temporal Cutoff Comparison**: *"What was Driver A's podium chance before qualifying?"*
   - Identifies the pre-weekend baseline vs post-qualifying update.
6. **Negative Control (Missing Telemetry)**: *"Can you compare telemetry for a race with no telemetry data?"*
   - Refuses to invent traces and correctly explains that telemetry data is absent for that session.
