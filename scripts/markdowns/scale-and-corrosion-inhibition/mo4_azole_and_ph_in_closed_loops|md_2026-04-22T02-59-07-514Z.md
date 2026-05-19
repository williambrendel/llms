# How Do You Properly Treat a Data Center Closed-Loop Cooling System?

## Executive Summary

Data center closed-loop systems require molybdate (100-200 ppm), pH control (8.5-9.5), and azole inhibitors (2-6 ppm) to prevent corrosion that can reduce heat exchange efficiency by 20-30%. Weekly monitoring prevents costly equipment failures and maintains optimal energy performance.

## Overview

A single corroded heat exchanger can force an entire data center offline. Poor water treatment in closed-loop cooling systems creates rust, copper pitting, and fouling that blocks heat transfer surfaces. When iron levels climb above 0.1 ppm, your system signals active metal destruction that threatens both equipment and uptime.

## Chemical Treatment Components

The molybdate-pH-azole treatment program protects different metals through distinct mechanisms. Molybdate forms a passive film on carbon steel surfaces, blocking oxygen corrosion that creates rust and sludge. pH control maintains water chemistry that minimizes attack on copper, steel, and elastomers simultaneously. Azole compounds bond directly to copper and brass surfaces, forming protective molecular films that prevent galvanic corrosion and metal staining.

| **Component** | **Function** | **Mechanism** |
| --- | --- | --- |
| **Molybdate (MoO₄²⁻)** | Corrosion inhibitor for ferrous metals (carbon steel) | Forms a passive film on metal surfaces, protecting against oxygen corrosion. |
| **pH Control** | Ensures corrosion minimization and chemical stability | Maintains water chemistry in a range that minimizes attack on copper, steel, and elastomers. |
| **Azole (e.g., TTA, BTA)** | Copper and brass corrosion inhibitor | Bonds to copper surfaces forming a protective molecular film; prevents galvanic corrosion and staining. |

## Control Ranges and Monitoring

Each chemical requires precise concentration ranges to provide protection without waste or precipitation. Molybdate concentrations between 100-200 ppm protect steel without excessive chemical costs. The pH target of 9.0 balances copper protection against steel corrosion - too low accelerates metal attack, too high risks chemical precipitation.

| **Parameter** | **Lower Limit** | **Target** | **Upper Limit** |
| --- | --- | --- | --- |
| **Molybdate (as MoO₄²⁻)** | 100 ppm | 150 ppm | 200 ppm |
| **pH** | 8.5 | 9.0 | 9.5 |
| **Azole (as TTA/BTA)** | 2.0 ppm<br><br>Plus 2 ppm per ppm Fe | 4.0 ppm<br><br>Plus 2 ppm per ppm Fe | 6.0 ppm<br><br>Plus 2 ppm per ppm Fe |

Azole dosing adjusts based on iron content because dissolved iron consumes azole protection. Systems with active corrosion require additional azole to maintain copper protection.

Iron and copper measurements reveal system health. Levels above 0.1 ppm indicate active corrosion that threatens equipment integrity and heat transfer efficiency.

## Weekly Testing Protocol

Weekly testing catches problems before they damage equipment. The testing log tracks chemical levels, metal corrosion indicators, and conductivity changes that signal system drift.

|     |     | **pH** | **MoO₄ (ppm)** | **Azole (ppm)** | **Iron (ppb)** | **Copper (ppb)** | **Conductivity (µS/cm)** | **Comments / Actions** | **Additions** |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |     |     |     |
|     | LCL | 8.5 | 100 | 2   | NA  | NA  |     |     | Gallons | Gallons | Gallons | Gallons |
|     | T   | 9.0 | 150 | 4   | <.1 | <.05 | < 1500 |     | Added | Added | Added | Added |
|     | UCL | 9.5 | 200 | 6   | <.15 | <0.1 | < 2000 |     | Mo  | Azol | Caustic | Water |
| **Week** | **Date** |     |     |     |     |     |     |     |     |     |     |     |
| 1   |     |     |     |     |     |     |     |     |     |     |     |     |
| 2   |     |     |     |     |     |     |     |     |     |     |     |     |
| 3   |     |     |     |     |     |     |     |     |     |     |     |     |
| 4   |     |     |     |     |     |     |     |     |     |     |     |     |

Conductivity provides an early warning system for chemical drift. Values above 2000 µS/cm suggest excessive chemical addition or system contamination.

## Filtration Strategy

Progressive filtration removes corrosion products and prevents fouling buildup. The eight-week filtration program starts with coarse 100-micron filters and progresses to sub-micron filtration based on particle analysis results.

| **Week** | **Filter Media**<br><br>**Installed** | **Pore Size (µm)** | **Sampling & Analysis** | **Target / Milestone** | **Actions** |
| --- | --- | --- | --- | --- | --- |
| 1<br><br>Minus 1 day | None | None | Pref filtration location | Establish Baseline | Submit for PSA, TSS and NTU |
| 1   | Nominal | 100 | Testing<br><br>PreF – Pre Filtration<br><br>PostT – Post Filtration<br><br>Particle size analysis – PSA<br><br>( Count and Volume – C and V )<br><br>Turbidity - NTU<br><br>Total Suspended Solids – TSS<br><br>Test and adjust Inhibitor Value – TA - IV<br><br>Test and adjust pH – TA – pH | Reduce Visible Solids | **_Weekly actions_**<br><br>Install new and smaller µm filter;<br><br>Sample inlet and outlet<br><br>Record DP (differential pressure) initial<br><br>Record DP (differential pressure) daily<br><br>Change filters every other day or if<br><br>DP > 10 psi<br><br>Look for gel - like deposits<br><br>Photo dirty filters and save |
| 2   | 50 µm depth filter (melt-blown PP) | 50  | Testing Battery | Reduce visible solids | **_Complete Weekly Actions_** |
| 3   | 25 µm nominal cartridge | 25  | Testing Battery | 80% removal of<br><br>\>50 µm particles | **_Complete Weekly Actions_** |
| 4   | Dual-stage: 25 µm pre + 10 µm final | 10  | Testing Battery | <25 µm peak size | **_Complete Weekly Actions_** |
| 5   | 5 µm nominal pleated filter | 5   | Testing Battery | \>95% removal of<br><br>\>10 µm particles | **_Complete Weekly Actions_** |
| 6   | Dual-stage: 5 µm + 1 µm absolute | 1 (final) | Testing Battery | <5 µm peak;<br><br>dissolved iron only | **_Complete Weekly Actions_** |
| 7   | Add 0.5 µm final stage (if available) | 0.5 | Testing Battery | Peak <1 µm | **_Complete Weekly Actions_** |
| 8   | Maintain <1 µm filters | 0.5 (or 1 µm) | Confirm <1 µm peak with<br><br><5% >1 µm particles | Final validation | Lock-in final filter sizing<br><br>Monthly PSA, NTU & TSS |

Particle size analysis guides filter selection. Systems with peaks above 25 microns require aggressive initial filtration to remove corrosion debris. Differential pressure monitoring prevents filter overloading that reduces effectiveness.

## Treatment Failure Consequences

Poor treatment creates cascading problems that multiply energy costs and threaten system reliability. Low molybdate allows steel corrosion that creates rust deposits in heat exchangers, blocking flow and forcing pumps to work harder. Insufficient azole protection causes copper pitting and galvanic corrosion that leads to heat exchanger leaks and emergency shutdowns.

| **Problem** | **Impact on System** | **Energy / Cost Implications** |
| --- | --- | --- |
| **Low Molybdate** | Increased steel corrosion (rust, sludge) | Blocked exchangers, reduced flow, pump wear |
| **Low Azole** | Copper/brass pitting, galvanic corrosion | Heat exchanger leaks, system shutdowns |
| **Incorrect pH (<8.5)** | Enhanced corrosion of all metals | Shortened equipment life, higher iron/copper |
| **Neglected Monitoring** | Biofouling, under- or overfeed | Fouled coils, inefficient heat transfer, high ΔT |

pH below 8.5 accelerates corrosion of all metals simultaneously, creating mixed-metal deposits that resist cleaning. Neglected monitoring allows biofouling and chemical imbalances that reduce heat transfer efficiency.

Poor treatment causes up to 20-30% efficiency loss in heat exchange equipment due to fouling and corrosion layer buildup, increasing chiller and pump load.

## Key Takeaways

Test water chemistry weekly using the standardized log to catch problems before they damage equipment. Maintain molybdate at 150 ppm, pH at 9.0, and azole at 4 ppm as baseline targets. Install progressive filtration starting at 100 microns and advancing to 1-micron final filtration based on particle analysis results over eight weeks.