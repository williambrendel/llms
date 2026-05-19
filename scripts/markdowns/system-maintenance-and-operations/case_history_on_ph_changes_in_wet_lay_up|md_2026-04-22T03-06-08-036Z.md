# Why Does Water pH Change During System Layup?

## Executive Summary

Water pH shifts during 1-4 day layups due to CO₂ degassing when cold water warms (raising pH) or atmospheric CO₂ absorption in stagnant systems (lowering pH). These changes directly affect acid dosing requirements when systems return to service.

## Overview

A cooling tower that ran perfectly stable for months can suddenly demand twice the normal acid dose after a long weekend shutdown. In some cases, operators find they need no acid at all. The culprit isn't equipment failure — it's basic water chemistry responding to temperature changes and atmospheric exposure during the layup period.

## Case 1: pH Increases During Layup

Spring conditions often trigger pH increases during layups, with the effect disappearing in summer. Two primary mechanisms drive this change.

### Loss of CO₂ via Aeration

Cold water holds more dissolved CO₂ due to higher gas solubility. This dissolved CO₂ forms carbonic acid through the reaction:

**What it measures:** The equilibrium between dissolved CO₂ and carbonic acid formation

Formula:
```
CO₂ + H₂O ↔ H₂CO₃ ↔ H⁺ + HCO₃⁻
```

**Example:** Cold water at 5°C can hold 1.45 g/L of CO₂, while water at 40°C holds only 0.6 g/L — a 58% reduction in solubility.

When water temperature increases from 10°C to 35°C during layup, excess CO₂ degasses into the atmosphere. This removes protons (H⁺) from solution, causing pH to rise.

**What it measures:** The reverse reaction as CO₂ leaves solution

Formula:
```
H⁺ + HCO₃⁻ → CO₂(gas) + H₂O
```

**Example:** A system warming from 10°C to 30°C can experience a pH increase of 0.4 to 0.8 units in low-alkalinity water.

### Temperature-Driven pH Changes

The magnitude of pH shift depends on both temperature change and water alkalinity:

| Temperature Shift | Alkalinity Range | Typical pH Increase |
|------------------|------------------|-------------------|
| 10°C → 25°C | 0-10 ppm | +0.4 to +0.8 units |
| 10°C → 35°C | 80-200 ppm | +0.2 to +0.6 units |
| 5°C → 30°C | 20-60 ppm | Up to +1.0 units |

![Estimated pH Increase with Warming (Low Alkalinity Water)](data:image/png;base64...)

These graphs demonstrate the relationship between temperature and CO₂ behavior. The left chart shows CO₂ solubility dropping from 1.45 g/L at 0°C to below 0.6 g/L at 40°C. The right chart illustrates the resulting pH increase, particularly pronounced in low-alkalinity water where buffering capacity is limited.

This phenomenon typically disappears in summer when tower water enters the building already warm, eliminating the temperature differential that drives CO₂ degassing.

### Inhibitor Overdosing

Excess sodium nitrite, borate, or phosphate raises pH if the system was incorrectly dosed. Check for operator error or failed dosing pumps when pH increases exceed temperature-driven expectations.

## Case 2: pH Drops During Layup

Stagnant systems often experience pH decreases through multiple mechanisms operating simultaneously.

### Primary Causes of pH Reduction

| Cause | Mechanism | Severity | Key Factors |
|-------|-----------|----------|-------------|
| Atmospheric CO₂ absorption | CO₂ dissolves forming carbonic acid | High | Vented systems with stopped circulation |
| Biological activity | Bacteria generate organic acids | High | Absence of biocide residual |
| Nitrite oxidation | NaNO₂ oxidizes releasing protons | Moderate | Dissolved oxygen and iron present |
| Evaporation effects | Concentrates ions, destabilizes buffering | Moderate | Open systems in dry conditions |
| Buffer degradation | Borates and phosphates precipitate or degrade | Moderate | Temperature fluctuations |

### Contributing Factors

Stagnation allows oxygen to remain in water, promoting corrosion and bacterial growth. Open exposure permits atmospheric CO₂ entry and bacterial contamination. Pre-existing biofilm colonies activate quickly without flow or residual biocide to suppress them.

**What it measures:** CO₂ absorption from atmosphere forming acid

Formula:
```
CO₂ + H₂O → H₂CO₃ → H⁺ + HCO₃⁻
```

**Example:** Stagnant water exposed to atmospheric CO₂ (400 ppm) can drop 0.3-0.5 pH units within 24-48 hours, depending on alkalinity and surface area exposure.

## Preventing pH Shifts During Layup

Successful layup management requires addressing both biological and chemical factors before shutdown.

| Strategy | Specific Action |
|----------|----------------|
| Biocide application | Maintain slug dose of NaOCl or non-oxidizing biocide before and during layup |
| System isolation | Minimize atmospheric exposure through proper venting control |
| Temperature management | Gradual temperature changes reduce CO₂ shock degassing |
| Monitoring frequency | Check pH within 4-6 hours of restart, adjust acid feed accordingly |

## Key Takeaway

Monitor pH within 4-6 hours of system restart after any layup exceeding 24 hours. Expect pH increases of 0.4-0.8 units during spring startups and pH decreases of 0.3-0.5 units in summer stagnant conditions. Apply biocide slugs before shutdown and maintain 0.5-1.0 ppm residual to prevent biological acid generation during layup periods.