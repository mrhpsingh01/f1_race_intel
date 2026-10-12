# Telemetry Processing & Lap Alignment Specification

## 1. Challenge: Asynchronous GPS Sampling

Telemetry samples captured on car A and car B occur at distinct timestamps and variable physical locations:
- Car A might sample at GPS offset $d = 120.4\text{ m}$ at timestamp $t = 1.42\text{ s}$.
- Car B might sample at GPS offset $d = 124.8\text{ m}$ at timestamp $t = 1.39\text{ s}$.

Direct timestamp-to-timestamp comparison fails because cars are at different points on the circuit.

## 2. Solution: Distance-Axis Linear Interpolation

To enable true spatial comparisons:
1. Extract cumulative circuit distance $d$ (metres) from raw telemetry channels.
2. Define a uniform distance grid:
   $$\mathbf{D} = [0, \Delta d, 2\Delta d, \dots, D_{\max}], \quad \text{where } \Delta d = 20\text{ m}$$
3. Linearly interpolate speed $v$, throttle $T$, brake $B$, and gear $G$ onto $\mathbf{D}$:
   $$v_{\text{grid}} = \text{interp}(\mathbf{D}, d_{\text{raw}}, v_{\text{raw}})$$

## 3. Cumulative Lap Time Delta ($\Delta t$)

To measure exactly where driver A gains or loses time relative to driver B:
$$\Delta t_i = \sum_{k=1}^i \left( \frac{\Delta d}{v_A[k] / 3.6} - \frac{\Delta d}{v_B[k] / 3.6} \right) \times 1000 \quad (\text{ms})$$

- $\Delta t < 0$: Driver A is taking less time (ahead).
- $\Delta t > 0$: Driver B is taking less time (ahead).
- The cumulative sum at $D_{\max}$ converges to the official timing difference measured at the timing beam.

## 4. Lap Quality Safeguards

Laps are flagged if:
- Sample density falls below 10 samples per kilometre.
- Inter-sample gap exceeds 500 metres.
- Lap is flagged as in-lap, out-lap, pit lap, or affected by safety car conditions.
