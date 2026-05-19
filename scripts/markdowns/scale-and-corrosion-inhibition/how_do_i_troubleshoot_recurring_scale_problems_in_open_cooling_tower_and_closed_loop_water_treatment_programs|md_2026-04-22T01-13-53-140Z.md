# How do I troubleshoot recurring scale problems in open cooling tower and closed loop water systems?

## Executive Summary

Recurring scale problems stem from misidentified deposits (often corrosion products or biofilm, not mineral scale), uncontrolled concentration cycles in open towers, or excessive makeup water in supposedly closed loops. The fix depends entirely on correctly identifying what you're actually dealing with and where the deposits form.

## Overview

Most "scale" complaints turn out to be something else entirely. Black magnetic sludge in closed loops is usually iron corrosion products, while slimy deposits in cooling tower basins are typically biofilm mixed with trapped solids. Even when you do have true mineral scale, the root cause often traces back to a single control failure — like a stuck blowdown valve or a closed loop that isn't actually closed.

## Confirm you are dealing with "scale" (not corrosion products or biofilm)

Recurring "scale" complaints are often **misidentified deposits**. Start by identifying the deposit because the fix depends on it.

**Field ID**
- **White/tan, hard, crystalline:** usually CaCO₃ / CaPO₄ / CaSO₄ / silica
- **Black magnetic sludge:** magnetite/iron corrosion products (closed loops commonly) rather than mineral scale
- **Brown/red, rust-like:** iron oxides/hydroxides
- **Slimy/gelatinous:** biofilm + trapped solids

**Required verification**

Send deposit to lab for **XRD/SEM-EDS** (best) or at least acid solubility + metals/mineral profile.

## Open cooling tower troubleshooting (open recirculating CW)

### Check whether concentration (cycles/blowdown) is the driver

Towers concentrate minerals by evaporation. **Cycles of concentration (COC)** governs how fast scaling ions accumulate. Many towers operate around **3–10 cycles** (site dependent).

**What to do**

Measure (same day): makeup and circulating conductivity, Ca hardness, alkalinity, pH, silica, phosphate (if used), sulfate, chloride. Calculate **actual cycles** using chloride or conductivity ratio (best: chloride). Confirm blowdown equipment is functioning (valves, controllers, sensors, sample lines, scaling on probes).

**Red flags**
- Cycles drift upward vs setpoint
- Blowdown valve stuck / fouled conductivity probe  
- Makeup chemistry changed (seasonal switch, new well, blending)

**Impact**

If cycles can't be controlled, no inhibitor program will be stable.

### Check "where" scale forms (this locates root cause)

**Only on hottest surfaces (condenser/plate HX):** classic supersaturation at the heat-transfer surface.

**Fill and basin surfaces:** usually a combination of high cycles + poor solids control + biofilm. Deposits range from tightly adherent films to gelatinous masses and can combine with corrosion/biofouling.

### Check pH control and chemistry interactions

Common recurring causes:
- pH higher than intended (acid feed failure/overfeed of caustic/CO₂ stripping changes)
- Phosphate/zinc programs: poor control can increase deposition risk if solids and pH are not managed (site-specific; verify with actual chemistry trends)

### Confirm dispersant/inhibitor performance and feed reliability

Verify chemical feed rates vs flow, make-up, and seasonal load. Confirm injection location/mixing. Check for "event-driven scaling" (weekends, shutdowns, low-flow).

### Check solids management (scaling often needs solids to plate out)

If you have persistent turbidity/TSS and dirty basins, add/optimize **side-stream filtration** and basin cleaning frequency. Solids increase nucleation sites and increase deposit formation risk (practical and widely documented).

### Cooling tower scale troubleshooting outcome

If cycles/pH are stable and scale persists, the deposit analysis usually points to **silica/silicate**, **phosphate**, or **calcium sulfate** constraints (each has different control limits and treatment options).

## Closed-loop troubleshooting (CHW/HW closed recirculating)

### Confirm it's closed

Closed loops are intended to have **minimal makeup** (NIH guidance describes makeup typically <5% of total system volume per year). If scale is recurring, the loop is often not "closed," or the deposit isn't mineral scale.

### Quantify makeup water

This is the highest-yield diagnostic. Track makeup volume/day or % of system volume/month.

**If makeup is not near-zero**

You are continually importing hardness/alkalinity/silica and oxygen. Expect more deposits (mineral + corrosion products).

### Determine if the "scale" is actually iron deposition

If you see black sludge or frequent strainer plugging, treat it primarily as **corrosion/deposit transport**, not a scaling index problem.

Actions:
- Fix oxygen ingress/air control
- Improve filtration (side-stream, magnetic separation if magnetite is dominant)
- Clean/flush low points
- Verify inhibitor control is by **true concentration**, not surrogate signals

### If mineral scale is confirmed, identify the driver

Common drivers in closed loops:
- Hard fill water + frequent makeup
- High-temperature zones (hot water / heat recovery) where precipitation is more likely
- Localized high pH at chemical injection points
- Treatment degradation products and solids acting as nucleation sites

### Reset if startup cleaning was poor

A poor initial clean/passivation often creates early deposits that become permanent nucleation sites.

Best-practice corrective approach:
- Mechanical cleanup (strain filters, flush low points)
- Chemical cleaning (matched to deposit type)
- Re-passivation (matched to metallurgy/inhibitor program)
- Add filtration and stabilize makeup rate

## Recommended testing package (to stop guessing)

### Open cooling tower (weekly to daily trends)

- Conductivity + calculated cycles (using chloride monthly for validation)
- pH, alkalinity, Ca hardness, silica
- Orthophosphate (if used), turbidity/TSS
- Visual inspections: basin, fill, HX approach (heat transfer)

### Closed loop (monthly; more often during correction)

- Makeup volume, pH, conductivity
- Nitrite/molybdate (actual ppm), inhibitor residuals
- Total iron (and dissolved if possible)
- Filter/strainer solids characterization
- Deposit analysis (one-time per recurring event)

## Key Takeaways

**Open towers:** scale quickly drives energy loss and can force reduced cycles (water waste). Deposits accelerate under-deposit corrosion. Monitor conductivity daily and verify blowdown control weekly — most recurring scale problems trace to cycles that drift above setpoint.

**Closed loops:** recurring deposits usually indicate chronic makeup/oxygen ingress or failed startup cleaning. Track makeup volume monthly as your primary diagnostic. Slow response increases the probability of persistent sludge, differential cell corrosion under deposits, and more aggressive future cleaning requirements.