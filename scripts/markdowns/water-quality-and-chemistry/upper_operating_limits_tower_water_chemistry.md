# What are the upper operating limits for TDS, silica, calcium, alkalinity, chloride, sulfate, and sodium in a cooling tower running on potable or reclaimed water?

## Executive Summary

There is no single universal upper limit — the correct values depend on makeup water quality, tower materials, chiller metallurgy, treatment chemistry, discharge limits, operating temperature, and owner risk tolerance. For a high-availability data center, conservative screening-level upper limits run around 5,000 mg/L TDS, 150 mg/L silica, 600 mg/L calcium hardness (as CaCO3), 500 mg/L M alkalinity, 300 mg/L chloride, 250 mg/L sulfate, 500–1,000 mg/L sodium, and an LSI below about +2.0.

## Overview

Cycles of concentration are usually picked first, and that is exactly the wrong order — the right move is to set the allowable tower water limits, test the makeup, then back-calculate the maximum cycles each constituent will permit, taking the lowest result as the actual ceiling. The math of evaporation makes this even starker: going from 7 to 10 cycles saves only about 4.8 percent of makeup water while adding meaningful scaling, corrosion, biological, chemical, and compliance risk. Above roughly 7 cycles, every additional cycle buys less water and costs more reliability.

## Recommended screening-level upper limits

The table below is a screening guide for planning, not a final operating specification. Use these as conservative starting values for a high-availability data center cooling tower until a full makeup analysis and scaling/corrosion model is complete.

| Parameter | Conservative upper planning limit in tower water | Notes |
| --- | --- | --- |
| **Total dissolved solids** | 5,000 mg/L | 5,000 ppm maximum for treated condenser/cooling tower water is a good starting point. Use a lower limit if corrosion, discharge, or conductivity control requires it. |
| **Silica, as SiO2** | 150 mg/L | Common limit — design-based guidance. |
| **Calcium hardness, as CaCO3** | 600 mg/L conservative; 1,200 mg/L upper treated-system ceiling | Use 600 as a conservative data center planning limit. Federal guide specification allows 1,200 under a phosphonate/polymer program, but that is not a default design target. |
| **M alkalinity / total alkalinity, as CaCO3** | 500 mg/L | Common limit — design-based guidance. |
| **Chloride** | 300 mg/L as chloride | Conservative for galvanized tower construction. Stainless or nonmetallic systems may tolerate more, but heat exchanger metallurgy still controls. |
| **Sulfate** | 250 mg/L conservative | Conservative galvanized tower specification. Some stainless or other tower designs tolerate higher, but this should not be assumed for a data center. |
| **Sodium** | 500 to 1,000 mg/L | Surveillance trigger, not a hard pass/fail limit. |
| **Sodium chloride equivalent** | Control by chloride limit, commonly ≤300 mg/L chloride for galvanized or bare carbon steel exposure | Better corrosion-related expression when chloride is the companion ion. |
| **Langelier Saturation Index** | Below about +2.0 for conservative operation; absolute treated-system ceiling not above +3.0 without site-specific validation | — |

The main rule: do not select cycles of concentration first. Select the allowable tower water limits, test the incoming makeup water, then calculate the maximum cycles for each limiting constituent. The lowest calculated value becomes the practical cycle limit.

## Potable water towers versus reclaimed water towers

Potable makeup water is usually more stable and lower in suspended solids, nutrients, biological loading, ammonia, phosphorus, and organic material than reclaimed water. Potable water can still be the limiting source, though, if it carries high hardness, alkalinity, silica, chloride, sulfate, or total dissolved solids.

Reclaimed water can be a good cooling tower makeup source, but it demands more analysis and control. The main issues are biological regrowth when nutrients are present and disinfectant residual is not maintained, and scaling from minerals including calcium, magnesium, sulfate, alkalinity, phosphate, silica, and fluoride.

Reclaimed water systems usually need some combination of better incoming water quality monitoring, filtration or side-stream filtration, tighter biocide control, corrosion inhibitor adjustment, antiscalant adjustment, possible softening, membrane treatment, or blending, more frequent microbiological control verification, and a review of discharge permit limits. Reuse decisions require thorough data collection and careful analysis — sampling for salinity, hardness, alkalinity, silica, cations, and anions — especially when membrane treatment is being considered.

## Tower limits are driven by incoming water quality

Cooling tower limits are not independent values. They are driven by the makeup water.

**What it measures:** How a conservative dissolved species concentrates in the tower as water evaporates and dissolved solids accumulate.

Formula:
```
Tower concentration ≈ Makeup concentration × Cycles of concentration
```

**What it measures:** The maximum number of cycles permitted by any single chemistry parameter before its tower-water limit is reached.

Formula:
```
Maximum cycles for a parameter = Maximum allowed tower concentration ÷ Makeup water concentration
```

Cycles of concentration are the ratio of dissolved solids in blowdown water to makeup water, and are approximately equal to the ratio of makeup water volume to blowdown volume. The ability to maximize cycles depends on cooling tower chemistry and makeup water chemistry.

**Example:** If makeup water has 100 mg/L chloride and the tower limit is 300 mg/L chloride, then 300 ÷ 100 = 3. The chloride limit caps the tower at about 3 cycles, even if silica, calcium, and alkalinity would allow more.

This is why a complete makeup water analysis is required before optimization. The analysis should include at least pH, conductivity, total dissolved solids, calcium hardness, magnesium hardness, total hardness, M alkalinity, chloride, sulfate, silica, sodium, iron, manganese, copper, phosphate, ammonia, total suspended solids, total organic carbon, biological indicators, and disinfectant residual.

## Why cycles above 7 usually don't make sense

Cycles of concentration have diminishing returns. Ignoring drift and leaks:

**What it measures:** The blowdown rate required to hold a target cycles of concentration, given the evaporation rate.

Formula:
```
Blowdown = Evaporation ÷ (Cycles − 1)
```

**What it measures:** Total makeup water needed to replace both evaporation and blowdown.

Formula:
```
Makeup water = Evaporation + Blowdown
```

The table below shows how quickly the returns shrink:

| Cycles | Makeup water per unit evaporation | Incremental value |
| --- | --- | --- |
| 3 | 1.500 | Baseline |
| 4 | 1.333 | Large gain |
| 5 | 1.250 | Good gain |
| 6 | 1.200 | Useful gain |
| 7 | 1.167 | Small gain |
| 8 | 1.143 | Very small gain |
| 10 | 1.111 | Usually not worth added risk |

After about 7 cycles, additional water savings become small while risk increases. From 7 to 10 cycles, makeup water drops only from 1.167 to 1.111 units per unit evaporation — a savings of about 4.8 percent of tower makeup water. In exchange, the tower may experience higher scaling risk, corrosion risk, biological control difficulty, chemical demand, discharge compliance risk, and operational instability.

General recommendation: do not exceed 7 cycles unless a site-specific analysis proves the benefit outweighs the risk. Exceptions may include very high-quality makeup water, air handler condensate recovery, softened water, reverse osmosis permeate, capacitive deionization, or carefully blended reclaimed water.

## Practical recommendation

"Cooling tower cycles of concentration should be established from the incoming makeup water quality and the maximum allowable tower water concentration for each limiting constituent. The limiting cycle is the lowest calculated value among total dissolved solids, conductivity, silica, calcium hardness, alkalinity, chloride, sulfate, and the calculated Langelier Saturation Index. Reclaimed water may be suitable for cooling tower makeup, but it generally requires more detailed chemical and biological analysis than potable water because nutrient loading, dissolved solids, suspended solids, disinfectant demand, and variability can increase scaling, corrosion, and biofouling risk. In general, cycles above approximately seven should not be assumed to provide meaningful additional water and sewer savings unless supported by detailed water quality modeling, treatment design, and life-cycle cost analysis."

## Glossary

| Term | Definition | Synonyms / related terms |
| --- | --- | --- |
| **Cooling tower** | Equipment that rejects heat by evaporating a portion of recirculating water. | Evaporative cooling tower; open recirculating cooling system |
| **Data center cooling tower** | Cooling tower serving data center heat rejection, usually with low tolerance for downtime or condenser fouling. | Mission-critical cooling tower; high-availability cooling tower |
| **Makeup water** | Water added to replace evaporation, blowdown, drift, leaks, and overflow. | Make-up water; incoming water; feedwater |
| **Potable water** | Drinking-water-quality supply used as tower makeup. | Domestic water; municipal water; city water |
| **Reclaimed water** | Treated wastewater reused for a beneficial purpose such as cooling tower makeup. | Recycled water; reuse water; nonpotable reuse water |
| **Cycles of concentration** | Ratio of dissolved solids in tower water or blowdown to dissolved solids in makeup water. | Cycles; concentration ratio; concentration factor |
| **Blowdown** | Intentional discharge of tower water to control dissolved solids and chemistry. | Bleed; bleed-off; discharge |
| **Total dissolved solids** | Sum of dissolved mineral and ionic material in water. | Dissolved solids; TDS; salt content |
| **Conductivity** | Electrical conductivity of water, commonly used as an indirect indicator of dissolved ions. | Specific conductance; microsiemens per centimeter |
| **Silica** | Silicon dioxide species in water that can form hard-to-remove scale at high concentration. | Silicon dioxide; SiO2 |
| **Calcium hardness** | Calcium concentration expressed as calcium carbonate. A major driver of calcium carbonate scale. | Calcium as calcium carbonate; Ca hardness |
| **M alkalinity** | Total alkalinity measured to the methyl orange endpoint, commonly near pH 4.5. | Total alkalinity; methyl orange alkalinity |
| **Chloride** | Corrosive anion that concentrates in cooling towers and can accelerate pitting and crevice corrosion. | Chloride ion; Cl-minus |
| **Sulfate** | Anion that can contribute to corrosion and calcium sulfate scaling at high concentration. | Sulfate ion; SO4 |
| **Sodium** | Cation commonly present with chloride, bicarbonate, and sulfate salts; usually controlled indirectly through total dissolved solids and conductivity. | Sodium ion; Na |
| **Langelier Saturation Index** | Index estimating whether water tends to dissolve or precipitate calcium carbonate. Positive values indicate scaling tendency; negative values indicate corrosive or dissolving tendency. | LSI; Saturation Index |
| **Scale** | Mineral deposit on heat transfer or tower surfaces. | Mineral scale; deposit; fouling |
| **Corrosion** | Degradation of metal surfaces by chemical or electrochemical reaction. | Metal loss; pitting; attack |
| **Biofouling** | Biological growth that impairs heat transfer, flow, or microbiological control. | Biological fouling; slime; biofilm |
| **Side-stream filtration** | Filtration of a portion of recirculating tower water to remove suspended solids. | Basin filtration; slipstream filtration |
| **Reverse osmosis** | Membrane process that removes dissolved salts and many ions from water. | RO; membrane desalination |
| **Softening** | Treatment process that removes hardness, usually calcium and magnesium. | Ion exchange softening; hardness removal |
| **Antiscalant** | Chemical used to inhibit mineral scale formation. | Scale inhibitor; deposit control chemical |
| **Corrosion inhibitor** | Chemical used to reduce metal corrosion. | Inhibitor; passivating treatment |
| **Drift** | Small droplets carried out of the tower with exhaust air. | Windage; aerosol carryover |
| **Discharge limit** | Regulatory or permit limit for blowdown sent to sewer, surface water, or reuse system. | — |

## Key words

Cooling tower; data center; condenser water; makeup water; potable water; reclaimed water; recycled water; cycles of concentration; total dissolved solids; conductivity; silica; calcium hardness; M alkalinity; total alkalinity; chloride; sulfate; sodium; Langelier Saturation Index; scale; corrosion; biofouling; blowdown; drift; side-stream filtration; water treatment optimization; water efficiency; sewer efficiency.

## Takeaway

Run a full makeup water analysis (pH, conductivity, TDS, calcium and magnesium hardness, M alkalinity, chloride, sulfate, silica, sodium, iron, manganese, copper, phosphate, ammonia, TSS, TOC, biological indicators, disinfectant residual) before fixing cycles, and recheck monthly — then divide each conservative tower-water limit by the corresponding makeup concentration and use the lowest result as your cycle ceiling. Cap cycles at 7 unless reverse osmosis permeate, softened water, condensate recovery, or carefully blended reclaimed water justifies going higher with a documented scaling and corrosion model.
