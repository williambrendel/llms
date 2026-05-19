# How do you design a statistically representative Legionella sampling plan for cooling systems?

## Executive Summary

A statistically representative Legionella sampling plan requires defining a specific statistical objective (detection vs estimation), stratifying locations by risk and hydraulic zones, and calculating sample size based on your confidence level and acceptable error rate. The math changes dramatically between open cooling towers (where you sample location×time combinations) and closed loops (where you sample a finite set of locations).

## Overview

Most Legionella sampling plans fail because they skip the statistics entirely — grabbing a few samples from convenient spots and hoping for the best. This approach misses a fundamental reality: Legionella colonies cluster in biofilms, sediment, and low-flow zones, making single grab samples nearly worthless for system-wide conclusions. A single positive result from a cooling tower basin tells you almost nothing about the other 47 sampling points you didn't test.

## Statistical Foundation

A "statistically representative" Legionella sampling plan starts with an explicit statistical question. Legionella distribution is patchy due to biofilm formation, sediment accumulation, temperature variations, flow patterns, and disinfectant penetration. Representativeness comes from design — risk-stratified locations plus time coverage — not from random sampling.

ISO sampling guidance emphasizes choosing sampling points that account for vertical, horizontal, and temporal variation, particularly considering hydraulic heterogeneity like dead ends and low-flow zones. CDC routine-testing guidance similarly requires sampling plans that represent the entire system based on environmental assessment.

## Define Your Statistical Objective

Choose one objective because each requires different math:

**Detection objective** answers: "With 95% confidence, we would detect at least one positive if ≥p% of locations/times are truly positive." This is the most common approach for operational programs.

**Estimation objective** answers: "Estimate the percent positive within ±E at 95% confidence." This requires larger sample sizes but provides more precise information.

**Concentration objective** answers: "Estimate average concentration (often on a log scale) within ±E log units at 95% confidence." This requires assumptions about variability and handling of non-detects.

## Define Your Sampling Population

**Open cooling systems** (cooling towers, evaporative condensers) require sampling across location×time combinations because conditions change rapidly. Key locations include basin/return areas, make-up/blowdown zones, low-flow areas, sidestream filter returns, representative tower cells, and biofilm where accessible. Time strata should cover startup/seasonal layup return, peak summer load, low load periods, and post-upset events.

**Closed loops** (closed cooling, chilled water, closed condenser loops) have smaller populations with risk concentrated at warmest points, lowest-flow legs, air separator/expansion tank areas, makeup water introduction points, strainers, plate heat exchanger approach areas, and intermittently opened sections. You need fewer locations but must justify them with hydraulics and risk factors.

## Build Location Sets Using Risk Stratification

Use stratified sampling with defined risk categories. High-risk strata include low-flow/dead legs, warm zones, visible sediment/biofilm areas, and locations with loss-of-control history. Typical strata cover main circulation zones. Low-risk strata include well-controlled, high-flow, stable zones.

Randomize within strata when you have many similar outlets or segments. For example, randomly select 10 of 80 similar fan-coil branches in a closed loop, plus all "must-sample" sentinel points. This aligns with ISO requirements to account for heterogeneity and temporal variation.

## Calculate Sample Size

**Detection design** uses binomial probability. If prevalence of positives is at least p, the probability of missing all positives in n independent samples is (1-p)^n. To achieve confidence level CL of detecting ≥1 positive:

**What it measures:** Sample size needed to detect Legionella presence above a threshold prevalence

Formula:
```
n = ln(1 - CL) / ln(1 - p)
```

**Example:** For 95% confidence to detect if ≥10% of location×time points are positive: n = ln(0.05) / ln(0.90) = 29 samples across cells/locations and sampling dates.

**Estimation design** calculates sample size for proportion confidence intervals. For an estimated proportion with margin of error E at confidence level with z-score:

**What it measures:** Sample size needed to estimate positivity rate within a specific margin of error

Formula:
```
n = (z² × p × (1-p)) / E²
```

**Example:** For 95% confidence (z = 1.96), margin ±10% (E = 0.10), worst-case p = 0.5: n = (1.96² × 0.5 × 0.5) / 0.10² = 97 samples.

For finite populations (common in closed loops), apply finite population correction:

**What it measures:** Adjusted sample size for small, finite populations

Formula:
```
n_adjusted = n / (1 + (n-1)/N)
```

**Concentration targets** for CFU/L or gene copies usually follow lognormal distributions. Sample size depends on observed standard deviation of log concentrations:

**What it measures:** Sample size needed to estimate mean concentration on log scale

Formula:
```
n = (z × σ_log / E_log)²
```

Where E_log = desired half-width in log10 units (e.g., ±0.5 log).

## Convert Sample Size to Operational Plans

**Open cooling system example:** For 95% confidence to detect if ≥10% positives exist over a month (n = 29), allocate 3-4 distinct locations per tower (basin return, low-flow zone, near makeup, sidestream return) across 6-8 dates/events (routine plus after upset plus post-clean). Total = 29 samples distributed across location and time, not clustered.

**Closed loop example:** For a closed loop with 40 eligible sampling points wanting to detect if ≥15% are positive with 95% confidence: n = ln(0.05) / ln(0.85) = 18. Apply finite population correction: n_adjusted = 18 / (1 + 17/40) = 13. So ~14 well-distributed samples meet the detection objective if sampling points are reasonably independent and stratified.

## Documentation Requirements

Document these assumptions for auditability: objective type (detection vs estimation), confidence level (e.g., 95%), error statement (e.g., "≤5% probability of failing to detect if ≥10% of the population is positive"), defined population (which locations and time window), stratification and randomization method, laboratory method and QA/QC, and how you handle correlated points.

## Key Takeaway

Start every Legionella sampling program by writing down your statistical question in plain English, then calculate the minimum sample size needed to answer it reliably. For most cooling system minimization programs, aim for detection objectives with 95% confidence to detect ≥10-15% prevalence, sampling every 2-4 weeks during operating season, with stratified location selection that includes all high-risk hydraulic zones plus representative points from typical areas.