# Should I soften the makeup water for my cooling tower, and what does softening actually do for me?

## Executive Summary

A conventional sodium-cycle softener removes calcium and magnesium hardness (and limited iron and manganese) by exchanging them for sodium, which lets you push higher cycles of concentration when hardness is the limiting factor. It does not remove alkalinity, chloride, sulfate, silica, total dissolved solids, suspended solids, organics, or microorganisms — so after softening, the tower usually becomes limited by something else, and the softener itself can become a Legionella reservoir if oversized, stagnant, or poorly maintained.

## Overview

Softening solves the hardness problem and immediately hands you a new one: once calcium and magnesium are out of the way, the next bottleneck is whatever was in second place — typically silica, alkalinity, chloride, sulfate, or sheer conductivity — and corrosion rate tracks conductivity, so pushing cycles after softening turns a scaling system into a corrosion or salinity system if the program isn't redesigned. Worse, ion exchange resin beds are high-surface-area media that have been documented as Legionella pneumophila reservoirs, which means a softener installed for water efficiency can quietly become part of the microbial risk it was supposed to indirectly reduce.

## What a conventional softener removes

A standard sodium-cycle softener removes positive ions, mainly calcium and magnesium. The core reaction is simple: the resin holds sodium, captures calcium or magnesium, and releases sodium into the softened water. Veolia describes sodium zeolite softening as producing water nearly free of detectable hardness, with calcium and magnesium exchanged for sodium.

| Ion or constituent | Removed by conventional softener? | Cooling tower significance |
| --- | --- | --- |
| Calcium | Yes | Major driver of calcium carbonate and calcium sulfate scale. |
| Magnesium | Yes | Contributes to hardness, magnesium silicate deposits, and some fouling. |
| Dissolved iron | Sometimes, limited | Can foul resin and contribute to deposits if not controlled. |
| Dissolved manganese | Sometimes, limited | Can foul resin and contribute to deposits. |
| Sodium | No; sodium increases | Sodium replaces calcium and magnesium. It can raise salinity and conductivity. |
| Potassium | No meaningful removal | Usually not a scale driver. |
| Barium or strontium | Possible, site-specific | Can form low-solubility sulfate or carbonate scales, but requires analysis. |

## What a conventional softener does not remove

A conventional sodium-cycle softener does not remove the major negative ions and non-hardness constituents that often limit cooling tower cycles. Sodium softening leaves remaining impurities including alkalinity, chloride, sulfate, and silica.

| Constituent | Removed by softener? | Why it matters |
| --- | --- | --- |
| M alkalinity / total alkalinity | No | Drives calcium carbonate scaling tendency when calcium is present; affects pH buffering. |
| Bicarbonate / carbonate | No | Main alkalinity species in many makeup waters. |
| Chloride | No | Major corrosion and pitting concern, especially for stainless steel, galvanized steel, and some alloys. |
| Sulfate | No | Can contribute to corrosion and calcium sulfate scale if calcium remains or hardness breaks through. |
| Silica | No | Often becomes the next cycle-limiting scale constituent after hardness is removed. |
| Nitrate / phosphate | No, unless special ion exchange is used | Can affect nutrient loading, corrosion programs, or discharge. |
| Total dissolved solids | Usually not materially reduced | Ions are exchanged, not removed as a complete salt load. |
| Conductivity | Usually not materially reduced | Conductivity may remain similar or increase depending on sodium addition. |
| Suspended solids | No | Requires filtration or clarification. |
| Organics | No | Can increase biocide demand and biofouling potential. |
| Bacteria / biofilm | No | Requires a microbiological control program. |

## How softening shifts the cycle-limiting constituent

Cooling towers concentrate dissolved material because water evaporates and dissolved constituents remain behind. Cycles of concentration is the ratio of dissolved solids or conductivity in blowdown water to makeup water. The ability to maximize cycles depends on both tower water chemistry and makeup water chemistry.

**What it measures:** The maximum number of cycles a tower can run before a given parameter hits its allowable tower-water limit.

Formula:
```
Maximum cycles = Allowable tower concentration ÷ Makeup water concentration
```

**Example:** With 100 mg/L chloride in makeup water and a 300 mg/L tower limit, the chloride limit caps the tower at 3 cycles regardless of what hardness, alkalinity, or silica would otherwise allow.

After softening, the limiting constituent often changes:

| Makeup condition | Likely limiting factor before softening | Likely limiting factor after softening |
| --- | --- | --- |
| High calcium, moderate alkalinity | Calcium carbonate scale | Alkalinity, silica, conductivity, chloride, or sulfate |
| High calcium, high sulfate | Calcium sulfate scale | Sulfate, conductivity, or residual hardness leakage |
| High silica | Silica | Silica remains limiting |
| High chloride | Chloride corrosion | Chloride remains limiting |
| High sodium / high total dissolved solids | Salinity and conductivity | Salinity and conductivity remain limiting |
| High organic or nutrient load | Biofouling and biocide demand | Biofouling and biocide demand remain limiting |

## The softening approach

**Advantages.** Softening is strongest when hardness is the primary cycle limit. It can allow higher cycles by reducing calcium and magnesium scale risk, and it can improve heat-transfer reliability by reducing mineral deposition potential.

**Disadvantages.** Softening does not reduce alkalinity, silica, chloride, sulfate, or total dissolved solids, and it increases sodium. If cycles are increased after softening, all non-removed constituents concentrate more. That can shift the system from a scaling problem to a corrosion, silica, salinity, or microbiological control problem. Corrosion rate increases with conductivity in aqueous systems, so if softening enables higher cycles and higher conductivity, corrosion control must be reviewed rather than assumed safe.

**Best use case.** Softening fits when calcium hardness is high, alkalinity is manageable, silica is not already limiting, chloride and sulfate are moderate, brine discharge is acceptable, the treatment program includes corrosion inhibition, and microbiological control is actively managed.

## The sulfuric acid approach

Sulfuric acid does not remove hardness. It controls scale mainly by lowering pH and neutralizing alkalinity, reducing calcium carbonate saturation. Sulfuric acid reacts with carbonate alkalinity to form carbon dioxide and sulfate.

**Advantages.** Useful when alkalinity and high pH are the main cycle limits. It can permit higher cycles without adding sodium and without removing calcium.

**Disadvantages.** Sulfuric acid adds sulfate. If calcium remains high, added sulfate can increase calcium sulfate scaling risk. Overfeed can cause low pH, increased corrosion, safety hazards, and chemical handling risk. It requires tight pH control, feed equipment, containment, and operator training.

**Best use case.** Sulfuric acid fits when alkalinity is the primary limiting factor, calcium sulfate saturation is controlled, sulfate discharge is acceptable, pH control is reliable, corrosion inhibition is robust, and chemical safety controls are in place.

## The carbon dioxide approach

Carbon dioxide dissolves into water and forms carbonic acid, which lowers pH and reduces carbonate scaling tendency. Unlike sulfuric acid, it does not add sulfate or chloride. Linde describes carbon dioxide pH control as self-buffering, reducing the risk of over-correcting pH.

An important distinction: carbon dioxide mainly controls pH and carbonate equilibrium. It does not remove calcium, magnesium, silica, chloride, sulfate, sodium, or total dissolved solids. In an open cooling tower, carbon dioxide can also be stripped by aeration, so feed control must be designed carefully.

**Advantages.** Generally safer to handle than strong mineral acid and less likely to create a severe low-pH excursion. It does not increase sulfate.

**Disadvantages.** May be less direct than sulfuric acid for alkalinity destruction in an open tower. It can require continuous feed, effective dissolution, pH control, and assessment of carbonic acid corrosion risk. It does not solve high hardness, high silica, high chloride, or high total dissolved solids.

**Best use case.** Carbon dioxide fits when pH suppression is needed, strong acid handling is undesirable, sulfate addition is undesirable, hardness is not excessive or is controlled separately, and pH can be continuously monitored.

## The no-modification approach

This approach uses the raw makeup water with conventional tower controls: conductivity-controlled blowdown, scale inhibitor, dispersant, corrosion inhibitor, oxidizing and non-oxidizing biocide, side-stream filtration, basin cleaning, and monitoring.

**Advantages.** Simpler. It avoids softener brine waste, sodium increase, acid hazards, and acid overfeed. It also preserves the natural calcium and alkalinity balance, which can sometimes help maintain protective calcium carbonate film formation when controlled properly.

**Disadvantages.** Water use efficiency is limited by the raw makeup water. If hardness and alkalinity are high, cycles must remain lower to avoid scale. Pushing cycles without pretreatment can produce condenser fouling, tower fill scaling, under-deposit corrosion, microbiological sheltering, and higher energy use.

**Best use case.** No modification fits when makeup water is already low to moderate hardness, silica, chloride, and sulfate are not limiting, water cost and sewer cost do not justify pretreatment, and operational simplicity matters more than maximum cycles.

## Comparing the four strategies

| Strategy | Primary benefit | Main risk | Best fit |
| --- | --- | --- | --- |
| **Softening** | Removes calcium and magnesium hardness, allowing higher cycles when hardness is limiting. | Sodium, conductivity, silica, chloride, sulfate, microbiological risk, brine waste. | Hard, scale-forming makeup water. |
| **Sulfuric acid** | Reduces alkalinity and pH-driven calcium carbonate scaling. | Corrosion, low-pH excursion, sulfate addition, chemical safety. | High alkalinity water where calcium sulfate risk is controlled. |
| **Carbon dioxide** | Lowers pH without adding sulfate or chloride; self-buffering. | Does not remove minerals; open towers strip carbon dioxide; possible carbonic acid corrosion if misapplied. | pH control where strong acid is undesirable. |
| **No hardness or alkalinity modification** | Simpler and lower pretreatment complexity. | Lower cycles if hardness or alkalinity limits the tower. | Favorable makeup water or conservative operation. |

The water-efficiency decision should not start with the treatment method. It should start with the makeup water analysis, then the cycle-limiting constituent calculation.

## Microbiological impact of softeners

Softening is not a disinfectant and should not be credited as microbial control.

**Potential microbiological benefits.** Softening can reduce hardness scale. Less scale can mean fewer protected surfaces where sediment, biofilm, and microorganisms can shelter. This can indirectly support microbiological control.

**Potential microbiological risks.** Softener resin beds are high-surface-area media. If oversized, stagnant, intermittently used, or poorly maintained, they can support biofilm. Ion exchange resins and water softener bulk water have been documented as colonized with Legionella pneumophila, and water softeners have been described as an underexplored reservoir of pathogens.

**Practical control measures for data center cooling makeup softeners:** avoid oversizing softeners; use demand-based regeneration; avoid long standby periods with stagnant resin beds; monitor hardness leakage; monitor free and total disinfectant residual before and after softening; include softener vessels in the water management plan; sanitize resin vessels when indicated by procedure, manufacturer guidance, or microbiological findings; do not increase cycles unless the microbiological control program is also adjusted.

## Glossary

| Term | Definition | Synonyms / related terms |
| --- | --- | --- |
| **Water softener** | Ion exchange equipment that removes hardness ions, mainly calcium and magnesium. | Softener; sodium-cycle softener; zeolite softener |
| **Ion exchange** | Process where ions attached to a resin are exchanged for ions in water. | Resin exchange; cation exchange |
| **Sodium-cycle softening** | Softening process where calcium and magnesium are exchanged for sodium. | Sodium zeolite softening; sodium softening |
| **Hardness** | Calcium and magnesium concentration, commonly expressed as calcium carbonate. | Total hardness; water hardness |
| **Calcium hardness** | Calcium portion of total hardness. | Calcium as calcium carbonate; calcium hardness as calcium carbonate |
| **Magnesium hardness** | Magnesium portion of total hardness. | Magnesium as calcium carbonate |
| **Hardness leakage** | Small amount of hardness passing through a softener, especially near exhaustion or after poor regeneration. | Breakthrough; leakage |
| **Regeneration** | Process of restoring resin exchange capacity using brine. | Recharge; brining |
| **Brine** | High-salt solution used to regenerate softener resin. | Sodium chloride regenerant; salt solution |
| **Alkalinity** | Water's acid-neutralizing capacity, mainly from bicarbonate, carbonate, and hydroxide. | M alkalinity; total alkalinity; buffering capacity |
| **Bicarbonate** | Common alkalinity species in natural water. | Hydrogen carbonate |
| **Carbonate** | Alkalinity species that contributes strongly to calcium carbonate scale at higher pH. | Carbonate ion |
| **Silica** | Dissolved silicon species that can form hard, difficult-to-remove scale. | Silicon dioxide; reactive silica |
| **Chloride** | Anion that can increase pitting and corrosion risk. | Chloride ion |
| **Sulfate** | Anion that can contribute to corrosion and calcium sulfate scale. | Sulfate ion |
| **Sodium** | Cation added by sodium-cycle softening. | Sodium ion |
| **Total dissolved solids** | Total dissolved mineral and ionic material in water. | Dissolved solids; salinity; TDS |
| **Conductivity** | Electrical conductance of water, used as an indirect measure of dissolved ions. | Specific conductance |
| **Cycles of concentration** | Ratio of dissolved solids in tower water or blowdown to dissolved solids in makeup water. | Cycles; concentration ratio |
| **Blowdown** | Intentional discharge of tower water to control dissolved solids. | Bleed-off; bleed; tower discharge |
| **Scale** | Mineral deposit on heat-transfer or tower surfaces. | Mineral scale; deposit; fouling |
| **Fouling** | Accumulation of deposits, biological growth, or debris that reduces performance. | Depositing; plugging; surface contamination |
| **Corrosion** | Chemical or electrochemical attack on metal. | Metal loss; pitting; attack |
| **Sulfuric acid feed** | Addition of sulfuric acid to reduce alkalinity and pH. | Acid feed; mineral acid feed |
| **Carbon dioxide feed** | Addition of carbon dioxide to lower pH by forming carbonic acid. | Carbon dioxide pH control; carbonic acid treatment |
| **pH control** | Adjustment of acidity or basicity to manage scale, corrosion, and disinfectant performance. | Acid-base control; pH adjustment |
| **Langelier Saturation Index** | Index estimating calcium carbonate scaling or dissolving tendency. | Saturation index; LSI |
| **Biofilm** | Attached microbial growth on surfaces. | Slime; biological film |
| **Disinfectant residual** | Remaining active disinfectant in water. | Biocide residual; oxidant residual |
| **Microbiological control** | Program to control bacteria, biofilm, algae, and pathogens. | Biological control; biocontrol; microbial control |
| **Legionella** | Bacteria that can grow in building water systems and cooling towers and cause Legionnaires' disease when aerosolized and inhaled. | Legionella pneumophila; Legionella species |

## Key words

Water softener; sodium-cycle softening; ion exchange; calcium hardness; magnesium hardness; sodium; alkalinity; bicarbonate; carbonate; chloride; sulfate; silica; conductivity; total dissolved solids; cycles of concentration; blowdown; water use efficiency; scale control; fouling control; corrosion control; acid feed; sulfuric acid; carbon dioxide; pH control; Langelier Saturation Index; microbiological control; biofilm; Legionella; disinfectant residual.

## Takeaway

Before installing a softener, run a full makeup water analysis and calculate the cycle-limiting constituent — if silica, chloride, sulfate, or conductivity is going to limit cycles after hardness is removed, softening alone won't deliver the water savings it promises, and adding reverse osmosis or blending may be the better path. If you do soften, size the unit for demand-based regeneration rather than oversizing, monitor free and total disinfectant residual before and after the softener weekly, include softener vessels in the Legionella water management plan, and don't push cycles upward until corrosion control and microbiological control programs have been redesigned for the higher conductivity and sodium load.
