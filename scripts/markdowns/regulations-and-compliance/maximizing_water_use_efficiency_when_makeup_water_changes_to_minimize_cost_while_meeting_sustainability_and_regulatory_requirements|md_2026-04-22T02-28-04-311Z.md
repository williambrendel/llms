# How to maximize water use efficiency when makeup water conductivity changes?

## Executive Summary

When makeup water conductivity varies, you cannot rely on fixed setpoints or single conductivity values. Instead, continuously measure both makeup flow and conductivity, then use mass-balance calculations to optimize blowdown while detecting hidden losses like leaks and overflow.

## Overview

A cooling tower operating at 4 cycles of concentration uses 75% less makeup water than one at 2 cycles — but only if you actually achieve those cycles consistently. Most facilities lose this efficiency when makeup conductivity changes seasonally or daily, because their control systems assume constant water chemistry. The dissolved solids that concentrate in your system follow the makeup water's changing chemistry, not your static setpoints.

## Understanding Variable Makeup Conductivity Impact

When makeup conductivity changes, the fundamental water balance equation remains valid: **Makeup = Evaporation + Drift + Blowdown + Leaks/Overflow**. However, the dissolved-solids balance becomes dynamic.

**What it measures:** The relationship between dissolved solids entering and leaving your cooling system

Formula:
```
Cycles(t) = Conductivity(circulating, t) ÷ Conductivity(makeup, t)
```

**Example:** If makeup conductivity drops from 800 to 400 µS/cm overnight, maintaining the same 3,200 µS/cm circulating setpoint means your cycles jumped from 4.0 to 8.0 — potentially triggering scaling without any alarm.

EPA guidance defines cycles as the ratio of blowdown conductivity to makeup conductivity, noting that cycles also approximate makeup volume divided by blowdown volume under ideal conditions. With variable makeup, you must calculate cycles as a time-varying parameter rather than assuming a constant value.

## Minimum Instrumentation Requirements

**Makeup Measurement**
Makeup flow meters must totalize volume hourly or daily. Makeup conductivity sensors should log readings every 1-15 minutes, matching your flow measurement intervals. Online conductivity measurement prevents the errors that occur when grab samples miss conductivity swings.

**Blowdown Measurement**
Blowdown flow meters provide the primary control feedback for automated systems. Blowdown or recirculating conductivity sensors generate the control signal that triggers blowdown events. This conductivity measurement becomes your cycles calculation denominator.

**High-Value Optional Equipment**
Basin level sensors with high-level alarms catch overflow events and stuck valves. These "hidden losses" often explain mysterious makeup increases that mass-balance calculations reveal but flow meters cannot locate.

## Mass-Balance Calculations for Variable Conductivity

**Conductivity-Based Cycles**
Calculate instantaneous cycles using real-time measurements, then compute time-weighted averages for reporting. Daily or weekly average cycles should derive from logged data, not single grab samples that miss conductivity variations.

**Flow-Based Cycles Verification**
The ratio of makeup volume to blowdown volume approximates cycles only when no unmetered losses occur. Persistent differences between flow-based and conductivity-based cycles indicate leaks, overflow, or measurement errors.

**Dissolved-Solids Mass Balance**
This diagnostic treats conductivity as proportional to dissolved-solids concentration. Calculate mass-in as the sum of makeup volume times makeup conductivity over each time interval. Calculate mass-out as the sum of blowdown volume times blowdown conductivity. When mass-in materially exceeds mass-out, suspect unmetered blowdown, overflow, or system leaks.

**What it measures:** Total dissolved solids entering versus leaving your system over time

Formula:
```
Mass_in = Σ[Makeup_volume_i × Conductivity_makeup_i]
Mass_out = Σ[Blowdown_volume_i × Conductivity_blowdown_i]
```

**Example:** Over 24 hours, if mass-in totals 12,000 volume-conductivity units but mass-out totals only 8,000 units, approximately 33% of your dissolved solids disappeared through unmeasured pathways.

## Optimizing Blowdown Control Strategy

**Dynamic Setpoint Management**
Fixed conductivity setpoints become ineffective when makeup conductivity varies. When makeup conductivity rises, the same circulating conductivity represents fewer cycles, potentially wasting water. When makeup conductivity falls, the same setpoint represents more cycles, potentially increasing scaling risk.

Control to maximum allowable circulating conductivity based on scaling limits, adjusting targets based on makeup trends. Advanced systems control to target cycles values using real-time makeup conductivity measurements.

**Performance Verification**
Monitor heat exchanger approach temperatures and differential pressures to detect fouling early. If these indicators worsen as cycles increase, the system exceeds safe limits regardless of conductivity calculations. Reduce cycles and strengthen deposit control programs when performance degrades.

## Eliminating Hidden Water Losses

**Drift Reduction**
Well-maintained cooling towers should exhibit very low drift rates. If makeup increases without corresponding blowdown or load changes, inspect drift eliminators and investigate visible mist carryover. Drift represents direct loss of both water and chemicals.

**Leak and Overflow Detection**
Properly operated systems should not experience leaks or overflow. Basin level alarm events provide immediate notification of overflow conditions. Persistent mismatches between flow-based and conductivity-based cycles indicate unmeasured losses. Mass-balance calculations quantify these losses even when their physical location remains unknown.

## Actionable Efficiency Strategies

Monitor makeup flow and conductivity continuously, logging data every 5-15 minutes to capture daily variations. Set blowdown control to maintain cycles between 4-6 for most systems, adjusting the upper conductivity limit seasonally based on makeup water trends. Investigate immediately when dissolved-solids mass balance shows more than 10% discrepancy between input and measured output, as this indicates significant unmeasured losses that increase both water and chemical costs.