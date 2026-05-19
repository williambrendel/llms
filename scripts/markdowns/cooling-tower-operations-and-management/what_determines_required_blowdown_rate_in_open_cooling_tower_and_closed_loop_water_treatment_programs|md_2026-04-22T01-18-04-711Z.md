# What determines the required blowdown rate in open cooling tower and closed loop water systems?

## Executive Summary

Open cooling towers require blowdown to prevent dissolved solids buildup, with the rate determined by maximum allowable cycles of concentration (typically 3-8 cycles). Closed loop systems normally don't require routine blowdown since they don't evaporate water, but may need event-driven drainage when contamination or chronic leaks compromise water quality.

## Overview

A typical cooling tower can waste 30-50% more water than necessary if blowdown rates aren't optimized correctly. While most facility managers know that cooling towers lose water through evaporation, the real water efficiency gains come from understanding how dissolved solids concentrate over time and what actually limits how many times you can recycle that water before problems emerge.

## Open Cooling Towers: Cycles of Concentration Drive Everything

The controlling requirement for cooling tower blowdown is the maximum allowable cycles of concentration (COC). Blowdown exists specifically to limit the buildup of total dissolved solids (TDS) that occurs as pure water evaporates and leaves minerals behind.

Cycles of concentration gets approximated two ways in practice:
- The ratio of tower (blowdown) conductivity to makeup conductivity
- The ratio of makeup volume to blowdown volume

**What it measures:** How many times dissolved solids have concentrated compared to the original makeup water

Formula:
```
COC ≈ Tower Conductivity (µS/cm) / Makeup Conductivity (µS/cm)
COC ≈ Makeup Flow Rate / Blowdown Flow Rate
```

**Example:** If makeup water measures 400 µS/cm and tower water measures 2,000 µS/cm, you're operating at 5 cycles of concentration.

Higher cycles mean less blowdown and better water efficiency. But cycles face hard limits from scaling, corrosion, and fouling constraints based on your specific water chemistry and system materials.

Heat load drives the evaporation rate, which determines your baseline water loss. Total tower water consumption comes from evaporation plus blowdown, with the fundamental mass balance relationship:

**Makeup = Evaporation + Blowdown**

If you estimate evaporation (E) and know your target cycles, blowdown (B) gets calculated as:

**What it measures:** Required blowdown flow to maintain target concentration cycles

Formula:
```
B = E / (COC - 1)
```

**Example:** A tower evaporating 100 GPM at 4 cycles requires 100 ÷ (4-1) = 33.3 GPM blowdown, for total makeup of 133.3 GPM.

## What Actually Limits Your Cycles

The required blowdown rate gets set by whichever chemical limit you hit first:

**Calcium carbonate scaling** represents the most common constraint. High pH, alkalinity, calcium concentration, and elevated temperatures all push you toward scale formation that can clog heat exchangers and distribution systems.

**Silica and magnesium-silicate limits** become critical with certain makeup water sources. These compounds form hard, glassy deposits that resist chemical cleaning.

**Chloride and sulfate concentrations** create corrosion risks, particularly for stainless steel and galvanized components. High total salinity stresses all system materials.

**Chemical treatment program limits** apply when you use phosphate or zinc-based corrosion inhibitors. These can precipitate out at high concentration cycles.

**Suspended solids and fouling** force lower cycles when tower basins stay dirty or when biological growth gets out of control.

EPA and FEMP guidelines emphasize calculating optimal cycles and working with water treatment specialists to maximize cycles within your specific chemistry constraints.

## Monitoring Requirements for Proper Blowdown Control

Effective blowdown management requires measuring makeup and tower conductivity daily or continuously. Periodic chloride testing validates your true cycles since chloride doesn't precipitate like calcium or get consumed like treatment chemicals.

Complete water analysis should cover pH, alkalinity, calcium hardness, silica, chloride, sulfate, and phosphate levels if used in treatment programs. Turbidity and iron measurements help catch fouling problems early.

Hardware verification ensures your conductivity probes stay calibrated and blowdown valves function correctly. Many towers waste water due to failed automatic controls.

## Closed Loop Systems: Different Rules Apply

True closed loop systems normally don't require routine blowdown rates like cooling towers because they don't evaporate water and concentrate dissolved solids. Properly designed closed loops operate as isolated systems with minimal makeup, typically less than 5% of system volume per year.

In closed loops, "blowdown" means drain-and-refill or partial bleeding, which happens based on specific events rather than continuous operation:

**Contamination events** trigger drainage when process fluids leak into the loop, treatment systems break down, or debris enters the system.

**Startup and commissioning problems** require correction when poor cleaning, inadequate passivation, or high initial solids levels compromise water quality.

**Chronic makeup and leaks** force periodic drainage when the loop isn't truly closed. Continuous oxygen and salt ingress from makeup water eventually overwhelms chemical treatment programs.

**Chemistry specifications exceeded** may require partial system drainage when chlorides, sulfates, or other contaminants reach levels that can't be corrected through chemical adjustment alone.

NIH research notes that closed loops can still experience significant water loss and makeup requirements due to leaks or overflow from expansion tanks, which transforms them into semi-open systems.

## Takeaway

Measure conductivity ratios daily to optimize cooling tower cycles between 4-6 for most systems, with complete water analysis monthly to identify the limiting factor. For closed loops, track makeup rates as your primary metric—if makeup exceeds 5% of system volume annually, find and fix leaks before they force expensive water replacement and chemical rebalancing.