# What are the key formulas and holding time considerations for open cooling tower water systems?

## Executive Summary

Open cooling tower systems rely on six fundamental formulas to calculate makeup water, cycles of concentration, evaporation rates, and system capacity, while holding time—the duration water stays in the system—directly impacts water conservation, chemical efficiency, and biological risk management.

## Overview

A single cooling tower formula can tell you whether you're wasting thousands of gallons per day or risking catastrophic biological fouling. Most facilities operate in a 48-120 hour holding time sweet spot, but systems running beyond 5 days face serious chemical degradation and biofilm formation that standard inhibitors weren't designed to handle.

## Essential Cooling Tower Formulas

### Water Balance Calculations

The foundation of cooling tower management starts with understanding water flow relationships. These formulas help operators track exactly how much water enters and leaves their system.

**What it measures:** The total fresh water needed to replace water lost through evaporation and intentional blowdown

Formula:
```
Make Up = Bleed + Evaporation
```

**Example:** If your tower loses 50 GPM to evaporation and you bleed 25 GPM for water quality control, you need 75 GPM of makeup water.

### Cycles of Concentration

Cycles of concentration indicate how many times dissolved solids have concentrated compared to makeup water. Three equivalent formulas give you this critical number:

**What it measures:** How concentrated your cooling water has become relative to fresh makeup water

Formula:
```
Cycles = Make Up / Bleed
Cycles = (Bleed + Evaporation) / Bleed  
Cycles = 1 / (Evaporation / Bleed)
```

**Example:** With 75 GPM makeup and 25 GPM bleed, you're running at 3 cycles of concentration—meaning dissolved solids are three times more concentrated than in your source water.

### Evaporation Rate Calculation

**What it measures:** Water lost to evaporation based on circulation rate and temperature difference across the tower

Formula:
```
Evaporation (GPM) = (GPM recirculation rate × Delta T) / 1250
Evaporation (GPM) = 0.008 × Recirculation Rate × Delta T
```

**Example:** A system circulating 2,000 GPM with a 10°F temperature drop loses 16 GPM to evaporation (2,000 × 10 ÷ 1,250 = 16 GPM).

### System Capacity Calculations

**What it measures:** The actual cooling capacity your tower is handling, measured in refrigeration tons

Formula:
```
Tons (with compressor heat) = (GPM Recirculation × Tower Delta T) / 30
Tons (without compressor heat) = (GPM Recirculation × Tower Delta T) / 24
```

**Example:** That same 2,000 GPM system with 10°F delta T handles 667 tons including compressor heat (2,000 × 10 ÷ 30 = 667 tons).

**What it measures:** Converting evaporation rate to cooling capacity in tons per hour

Formula:
```
Evaporative Tons/Hr = Evaporation in GPM × 1.48 × 60
```

**Example:** 16 GPM evaporation equals 1,421 tons per hour of cooling capacity (16 × 1.48 × 60 = 1,421 tons/hr).

## Holding Time Index and System Risk

**What it measures:** How long water remains in your system before being replaced through blowdown

Formula:
```
Holding Time Index = System Volume / Bleed (in GPH)
```

**Example:** A 50,000-gallon system bleeding 25 GPM (1,500 GPH) has a holding time of 33 hours (50,000 ÷ 1,500 = 33 hours).

### Short Holding Time: 24-48 Hours

Systems with high water turnover and aggressive blowdown rates keep water "fresh" with minimal time for biological growth or scale formation. However, this approach proves expensive through constant water consumption and chemical waste, as treatment chemicals get washed down the drain before providing full value.

### Typical Holding Time: 48-120 Hours (2-5 Days)

This range represents the standard sweet spot for most commercial and industrial cooling towers. The system balances water conservation with chemical efficiency, since most scale and corrosion inhibitors are formulated to remain stable within this window. Operators must maintain consistent biocide monitoring, as bacteria have sufficient time to begin colonizing surfaces.

### Long Holding Time: 120+ Hours (>5 Days)

Systems with very low blowdown rates or large volumes relative to tower size achieve exceptional water conservation and low chemical replacement costs. However, this creates high-risk conditions where chemical degradation accelerates and biological fouling becomes difficult to control.

## Chemical and Biological Risks in Extended Systems

Many non-oxidizing biocides lose half their effectiveness after 48-72 hours in cooling tower conditions. Extended holding times give bacteria ample opportunity to create biofilms—protective matrices that resist treatment and cause under-deposit corrosion on metal surfaces.

Heat and aeration stress also breaks down polymers used to prevent scale formation. These polymers can "shear" or fragment over several days of continuous circulation, reducing their ability to keep dissolved solids in suspension.

## Key Takeaways

Monitor holding time weekly using system volume divided by bleed rate in gallons per hour. Keep holding times between 48-120 hours for optimal chemical performance, and increase biocide dosing frequency to every 48 hours if your system exceeds 5-day holding times. Consider switching to more stable oxidizing biocides like chlorine dioxide for systems that consistently run above 120-hour holding times.