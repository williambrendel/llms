# What is approach temperature, and what is a good value in cooling towers and chillers?

## Executive Summary

Approach temperature is the gap between the fluid a heat exchanger is delivering and the thermal limit on the other side — wet-bulb air for a cooling tower, saturated refrigerant for a chiller evaporator or condenser. A good value tracks the equipment's clean-design number: roughly 5 to 7 degrees Fahrenheit for cooling towers, and 1 to 2 degrees Fahrenheit for evaporator and condenser approach in clean, non-glycol water-cooled chillers.

## Overview

Every degree of approach is a degree the equipment failed to extract from the load — and on a chiller, every degree of evaporator and condenser approach adds directly to compressor lift, where small fouling-driven creep above 5 degrees Fahrenheit becomes the cue to schedule tube cleaning. The cooling tower, the chiller condenser, and the chiller evaporator form a temperature chain, so an approach value drifting upward in any one of them ripples through the others. Read the value as "distance from ideal": zero is the theoretical limit, never a normal operating point.

## How approach temperature works in general

Approach is the temperature gap between the fluid being delivered and the thermal limit of the other side of the heat exchanger. It functions as a practical measure of heat-transfer effectiveness — the smaller the gap, the closer the exchanger gets to its theoretical limit.

A plain-language version: approach is the *distance from ideal*. In a cooling tower, ideal means dropping the cold water all the way to the entering wet-bulb temperature. In a chiller evaporator, ideal means dropping leaving chilled water all the way to the saturated refrigerant temperature. In a chiller condenser, ideal means lifting leaving condenser water all the way to the saturated condensing refrigerant temperature. Real equipment always needs some positive gap.

Lower approach means better heat transfer. Higher approach means worse heat transfer or worse operating conditions. Zero approach is the theoretical limit, not a normal operating condition.

## Cooling tower approach to wet bulb

Cooling-tower approach is the difference between the cold water leaving the tower and the ambient wet-bulb temperature of the air.

**What it measures:** How close the tower gets the leaving water to the lowest temperature evaporative cooling could theoretically deliver at the current air condition.

Formula:
```
Tower approach = Tower leaving cold-water temperature − Ambient wet-bulb temperature
```

**Example:** 85 degrees Fahrenheit leaving tower water minus 78 degrees Fahrenheit entering wet bulb = 7 degrees Fahrenheit approach.

Cooling-tower approach is not the same as cooling-tower range. Range captures the temperature drop of the water across the tower:

**What it measures:** How much heat the process is dumping into the tower water, expressed as a temperature drop.

Formula:
```
Tower range = Hot water to tower − Cold water from tower
```

For a given short-term load and flow, the process largely sets the range, while the tower's performance is judged by the leaving cold-water temperature — the approach to wet bulb.

## Chiller approach: evaporator and condenser

Chiller approach is the temperature difference between the leaving water and the saturated refrigerant temperature on that side of the machine. There are two of them, and they sit on opposite sides of the refrigeration cycle.

### Evaporator approach

Evaporator approach is the gap between leaving chilled water and saturated evaporating refrigerant temperature.

**What it measures:** How effectively the chiller pulls heat from the chilled-water loop into the refrigerant.

Formula:
```
Evaporator approach = Leaving chilled-water temperature − Saturated evaporating refrigerant temperature
```

**Example:** Water leaves the evaporator at 40 degrees Fahrenheit and refrigerant saturation temperature is 38 degrees Fahrenheit, giving a 2 degrees Fahrenheit evaporator approach.

### Condenser approach

Condenser approach is the gap between saturated condensing refrigerant temperature and leaving condenser water temperature.

**What it measures:** How effectively the chiller pushes heat from the refrigerant into the condenser water.

Formula:
```
Condenser approach = Saturated condensing refrigerant temperature − Leaving condenser-water temperature
```

**Example:** Leaving condenser water at 99 degrees Fahrenheit and saturated refrigerant temperature at 100.5 degrees Fahrenheit gives a condenser approach of 1.5 degrees Fahrenheit.

### Why evaporator approach differs from condenser approach

They live on opposite sides of the refrigeration cycle and they hit different parts of compressor lift. In the evaporator, the refrigerant is colder than the water and absorbs heat. In the condenser, the refrigerant is hotter than the water and rejects heat.

A rising evaporator approach means it is getting harder to pull heat from the chilled-water loop into the refrigerant. A rising condenser approach means it is getting harder to push heat from the refrigerant into the condenser water. Both add to compressor lift — the difference between saturated condensing temperature and saturated suction temperature — so both directly affect chiller efficiency.

## Calculating all of the approaches

Use one temperature scale consistently. Temperature differences are the same size in degrees Celsius and kelvin, and the same size in degrees Fahrenheit as differences in Fahrenheit.

**Cooling tower approach to wet bulb**

Formula:
```
Tower approach = Leaving tower water − Ambient wet-bulb air temperature
```

**Cooling tower range**

Formula:
```
Tower range = Entering tower water − Leaving tower water
```

**Evaporator approach**

Formula:
```
Evaporator approach = Leaving chilled-water temperature − Saturated evaporating refrigerant temperature
```

**Condenser approach**

Formula:
```
Condenser approach = Saturated condensing refrigerant temperature − Leaving condenser-water temperature
```

Some controls platforms display the same quantity with the opposite sign convention or as an absolute value. The safe practice is to confirm the point definition in the controller or manufacturer documentation and work with the magnitude of the difference. Trane's examples show the positive physical gap.

**Compressor lift**

**What it measures:** The temperature span the compressor must bridge between the cold side and the hot side of the refrigeration cycle. Higher lift means more compressor work.

Formula:
```
Lift = Saturated condensing temperature − Saturated evaporating temperature
```

Combining the definitions above produces a useful inferred relationship:

Formula:
```
Lift ≈ (Leaving condenser-water temperature − Leaving chilled-water temperature) + Condenser approach + Evaporator approach
```

That is why even small increases in evaporator or condenser approach hurt chiller efficiency.

## How the approaches connect

They link in a chain. The cooling tower sets the water going into the chiller condenser:

Formula:
```
Entering condenser-water temperature = Ambient wet bulb + Tower approach
```

The water leaving the tower is the water entering the chiller condenser — Trane states the tower leaving-water temperature is the same as the chiller entering condenser-water temperature.

The condenser side of the chiller adds water temperature rise and condenser approach:

Formula:
```
Saturated condensing temperature = Leaving condenser-water temperature + Condenser approach
```

The evaporator side subtracts evaporator approach from leaving chilled water:

Formula:
```
Saturated evaporating temperature = Leaving chilled-water temperature − Evaporator approach
```

Putting it together: tower approach affects condenser-water entering temperature; condenser approach and evaporator approach add directly to compressor lift; higher lift usually means higher chiller power. Trane also notes that lower tower approach means colder leaving tower water, but the overall plant optimum balances chiller, tower fan, and pump energy rather than making tower water as cold as physically possible all the time.

## What counts as a good approach value

### Cooling tower approach to wet bulb

There is no single universal "good" number for every cooling tower. The correct answer depends on tower selection, site wet-bulb, heat load, fan energy strategy, and whether the tower handles comfort cooling or process duty.

A common nominal HVAC selection point is 85 degrees Fahrenheit leaving water at 78 degrees Fahrenheit ambient wet bulb — a 7 degrees Fahrenheit approach. Many towers are effectively selected in the 5 to 7 degrees Fahrenheit range. For towers, "good" usually means at or near the selected design approach, often around 5 to 7 degrees Fahrenheit — not "as low as physically possible." Approaches below 5 degrees Fahrenheit are possible but usually require much larger tower capacity and are harder to guarantee economically.

### Evaporator approach

For many clean water-cooled chillers without glycol, expected evaporator approach is 1 to 2 degrees Fahrenheit. Glycol and some other configurations increase the expected approach — a rough direct-expansion rule of thumb runs around 5 degrees Fahrenheit and increases with glycol concentration.

A good evaporator approach is usually 1 to 2 degrees Fahrenheit for clean water-cooled shell-and-tube chillers in non-glycol comfort-cooling service. Higher may still be normal for glycol systems, plate heat exchangers, or DX arrangements.

### Condenser approach

For many clean water-cooled chillers without glycol, expected condenser approach is 1 to 2 degrees Fahrenheit. Trane recommends investigation and tube cleaning when approach exceeds 5 degrees Fahrenheit. Carrier likewise notes that high condenser approach compared with the clean baseline indicates poor heat transfer, commonly from fouling.

A good condenser approach is usually 1 to 2 degrees Fahrenheit for clean water-cooled chillers. Anything trending well above the clean baseline is not good, even if the machine still runs.

## What to do when approach is rising

### Only the cooling tower approach is rising

Focus on the tower, not the chiller barrel.

Start by verifying the calculation and the sensors — confirm you are using tower leaving cold-water temperature and entering wet-bulb temperature. Measurement error matters, especially at very low approaches. Check airflow next, since tower approach is strongly affected by it: low fan speed, failed fan, belt problems, drive problems, blade issues, or blocked air paths all raise approach.

Look for recirculation and air restriction. Recirculation raises ambient bulb and can raise cold-water temperature by 1 to 5 degrees Fahrenheit or more. Wind effects, bad enclosure geometry, and nearby obstructions are common causes. Inspect fill and water distribution — fill fouling reduces cooling efficiency by interfering with air and water flow through the fill, and broken or clogged nozzles cause uneven distribution, scale buildup, and decreased capacity.

Finally, check whether the heat load has increased or available tower cells have decreased. Approach rises directly with heat load and falls with larger tower size. The practical response: restore airflow, eliminate recirculation, clean or replace fouled fill, fix nozzles, confirm cell staging and fan control, and confirm the tower is not simply overloaded.

### Only the evaporator approach is rising

Focus on the evaporator water side first, then the refrigerant and oil side.

Verify chilled-water flow is at design — water flow influences approach, and inadequate water flow is a known cause of high evaporator approach. Inspect strainers, bypasses, and fouling: fouled evaporator surfaces, broken or bypassed strainers, and fouled tubes all show up as common causes. Check glycol concentration, since glycol increases the expected evaporator approach; if concentration changed, the higher approach may be real rather than a fault.

If one refrigerant circuit is bad and the other is normal, inspect the oil strainer on the oil return line and other circuit-specific issues. After water-side checks come refrigerant-side diagnostics: sensor problems, expansion-valve issues, undercharge, and oil overcharge can all contribute. The practical response: confirm flow, clean the evaporator or plates, inspect strainers and valves, confirm glycol concentration, then move to circuit-specific refrigerant and oil diagnostics if the water side is sound.

### Only the condenser approach is rising

Focus mainly on the condenser bundle and condenser-water flow.

Compare against the clean baseline, not just an abstract target — Carrier notes that a high condenser approach compared with the clean value indicates poor heat transfer across condenser tubes, commonly from fouling. Verify condenser-water flow is at design; Trane says water flow can influence approach, and lower condenser-water flow raises leaving condenser-water temperature and chiller power.

Inspect for scale, sludge, and tube fouling — Carrier explicitly ties high condenser approach to fouling, reduced chiller efficiency, increased pump power, and higher blockage risk. Clean tubes when the trend warrants it: Trane recommends scheduling tube cleaning when evaporator or condenser approach exceeds 5 degrees Fahrenheit as a precautionary measure. Review water treatment, since both Trane and Carrier tie elevated approach to fouling risk and recommend controlling fouling rather than waiting for major performance loss.

If only condenser approach is rising while tower approach is stable, the first suspects are condenser fouling and condenser-water flow — not tower wet-bulb performance.

## Glossary

**Approach temperature** — The temperature gap between the leaving controlled fluid and the limiting temperature on the other side of the heat exchanger. Smaller is better.
*Synonyms:* terminal difference, leaving temperature difference, close approach.

**Cooling-tower approach** — The difference between leaving tower water and entering wet-bulb temperature.
*Synonyms:* approach to wet bulb, tower wet-bulb approach.

**Wet-bulb temperature** — The effective low-temperature limit for evaporative cooling at the current air condition.
*Synonyms:* ambient wet bulb, entering wet bulb, design wet bulb.

**Range** — The temperature change of the water across a device. In a tower, it is hot water in minus cold water out.
*Synonyms:* water delta T, water temperature drop, water temperature rise or fall.

**Evaporator approach** — Leaving chilled-water temperature minus saturated evaporating refrigerant temperature.
*Synonyms:* evaporator leaving temperature difference, evaporator terminal difference.

**Condenser approach** — Saturated condensing refrigerant temperature minus leaving condenser-water temperature.
*Synonyms:* condenser leaving temperature difference, condenser terminal difference.

**Saturated evaporating temperature** — The refrigerant saturation temperature in the evaporator.
*Synonyms:* saturated suction temperature, evaporator saturation temperature.

**Saturated condensing temperature** — The refrigerant saturation temperature in the condenser.
*Synonyms:* condenser saturation temperature, saturated condenser temperature.

**Compressor lift** — The temperature difference between saturated condensing temperature and saturated evaporating temperature. Higher lift usually means more compressor work.
*Synonyms:* lift, refrigeration lift, compression lift.

**Fouling** — Unwanted deposit buildup that adds thermal resistance or blocks flow.
*Synonyms:* scaling, sludge buildup, deposit formation.

**Recirculation** — Warm saturated discharge air from a cooling tower being drawn back into the tower air inlet.
*Synonyms:* self-recirculation, plume recirculation.

## One-page field reference

### General definition

Approach temperature = delivered-fluid temperature minus the limiting temperature on the other side of the heat exchanger.

Lower approach means better heat transfer. Higher approach means worse heat transfer or worse conditions. Zero approach is the theoretical limit, not a normal operating condition.

### Cooling tower approach to wet bulb

Cooling tower approach is the difference between leaving cold tower water and entering wet-bulb temperature.

Formula:
```
Tower approach = Leaving tower water temperature − Entering wet-bulb temperature
```

**Example:** 85 degrees Fahrenheit leaving tower water − 78 degrees Fahrenheit entering wet bulb = 7 degrees Fahrenheit approach.

Good value: usually near the tower's design selection. In many comfort-cooling applications, often about 5 to 7 degrees Fahrenheit. Approaches below 5 degrees Fahrenheit are possible but usually require much larger tower capacity.

If tower approach is rising, check in order: tower leaving-water and wet-bulb sensors; fan speed, fan rotation, belts, drives, air blockage; discharge-air recirculation or wind effects; fill and spray nozzles for fouling or bad distribution; whether the tower is overloaded or running with too few cells. A rising tower approach usually points to airflow problems, fill fouling, poor water distribution, recirculation, or excess heat load.

### Chiller approach in the evaporator

Evaporator approach is the difference between leaving chilled-water temperature and saturated evaporating refrigerant temperature.

Formula:
```
Evaporator approach = Leaving chilled-water temperature − Saturated evaporating temperature
```

**Example:** 40 degrees Fahrenheit leaving chilled water − 38 degrees Fahrenheit saturated evaporating temperature = 2 degrees Fahrenheit evaporator approach.

Good value: 1 to 2 degrees Fahrenheit for many clean water-cooled chillers without glycol. With glycol or some direct-expansion arrangements, expected approach can be higher — a rough direct-expansion rule of thumb runs around 5 degrees Fahrenheit and increases with glycol concentration.

If evaporator approach is rising, check in order: leaving chilled-water and refrigerant temperature sensors; evaporator water flow at design; strainers, valves, and bypasses; evaporator surfaces or tubes for fouling; glycol concentration; and if one refrigerant circuit is abnormal, oil return and circuit-specific issues. A rising evaporator approach usually points to low water flow, fouling, glycol effects, or circuit-side problems.

### Chiller approach in the condenser

Condenser approach is the difference between saturated condensing refrigerant temperature and leaving condenser-water temperature.

Formula:
```
Condenser approach = Saturated condensing temperature − Leaving condenser-water temperature
```

Good value: 1 to 2 degrees Fahrenheit for many clean water-cooled chillers without glycol. If it rises above the machine's clean baseline, heat transfer is worsening. If approach exceeds 5 degrees Fahrenheit, tube cleaning should be considered.

If condenser approach is rising, check in order: condenser-water and refrigerant temperature sensors; condenser-water flow at design; condenser tubes for scale, biofilm, or sludge; water treatment performance; and clean tubes if approach is materially above the clean baseline. A rising condenser approach usually points to tube fouling or reduced condenser-water flow.

### Evaporator versus condenser approach

They measure different things. Evaporator approach measures how well the chiller absorbs heat from chilled water into the refrigerant. Condenser approach measures how well the chiller rejects heat from the refrigerant into condenser water. High evaporator approach hurts the cold side; high condenser approach hurts the hot side; either one raises compressor lift and tends to increase energy use.

### How the approaches connect

Tower approach affects how cold the condenser water can get. Condenser approach affects the refrigerant condensing temperature. Evaporator approach affects the refrigerant evaporating temperature. Together, they affect compressor lift.

Formula:
```
Lift = Saturated condensing temperature − Saturated evaporating temperature
```

Higher tower approach can raise condenser-water temperature. Higher condenser approach raises condensing temperature. Higher evaporator approach lowers evaporating temperature relative to leaving chilled water. All three make the chiller work harder.

## Key words

Approach temperature, wet-bulb approach, cooling tower approach, evaporator approach, condenser approach, saturated refrigerant temperature, saturated evaporating temperature, saturated condensing temperature, compressor lift, condenser water, chilled water, heat transfer effectiveness, range, fouling, recirculation, flow, glycol.

## Takeaway

Trend evaporator and condenser approach against each chiller's clean-baseline value at least weekly, and schedule condenser tube cleaning the moment either approach crosses 5 degrees Fahrenheit — don't wait for it to creep further. For the tower, log leaving cold-water temperature against entering wet-bulb continuously: when the gap drifts above the design 5 to 7 degrees Fahrenheit, work the checklist in order (sensors, fan and airflow, recirculation, fill and nozzles, load and cell count) rather than reaching for the chiller barrel first.
