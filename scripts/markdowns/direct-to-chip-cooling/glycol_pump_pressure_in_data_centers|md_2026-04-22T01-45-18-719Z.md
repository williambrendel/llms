# How Much Extra Pump Pressure Do AI Data Centers Need When Using Glycol Coolants?

## Executive Summary

Data center cooling loops using glycol antifreeze require 20% to 270% more pump pressure than water-only systems, with propylene glycol demanding significantly higher pressure increases than ethylene glycol at the same concentrations.

## Overview

A single AI data center campus now consumes 200 to 1000 megawatts and houses thousands of cooling loops. Each loop circulates hundreds of gallons per minute through chips that generate more heat than a stovetop burner. When these systems switch from water to glycol-based coolants for freeze protection, the pumps suddenly face a much tougher job pushing fluid through the same pipes.

## Data Center Cooling Loop Scale and Demand

Modern AI data centers operate massive secondary cooling loops that dwarf traditional server cooling systems. The scale reveals the infrastructure challenge ahead.

| **Secondary loop volume** | **Estimated loop class** | **Estimated recirculation rate** | **Estimated information-technology load served** | **Estimated racks in loop** | **Estimated chips in loop** |
| --- | --- | --- | --- | --- | --- |
| **250 gallons** | Small pod or zone | **238 gallons per minute** | **600 kilowatts** | **4 to 5 racks** | **288 to 360 chips** |
| **500 gallons** | Medium pod or zone | **320 gallons per minute** | **1,368 kilowatts** | **about 10 racks** | **about 720 chips** |
| **1000 gallons** | Large pod or zone | **640 gallons per minute** | **2,736 kilowatts** | **about 20 racks** | **about 1,440 chips** |

![Each loop will need a system as shown on the left](data:image/png;base64...)

The industry pipeline shows thousands of these loops coming online rapidly. Campus-scale deployments create enormous demand for properly sized pumping systems.

| **Time horizon** | **Planning size for a large new AI-heavy campus** | **Estimated new U.S. large campuses coming online** |
| --- | --- | --- | --- |
| Now | 200 to 300 megawatts information-technology load | already underway; not a forecast row |
| Within 2 years | 300 to 500 megawatts | about 70 to 120 |
| Within 4 years | 500 to 750 megawatts | about 150 to 275 |
| Within 6 years | 750 megawatts to 1 gigawatt | about 265 to 475 |

Each campus requires hundreds to thousands of individual cooling loops. A 1000-megawatt facility needs approximately 2000 loops based on current direct-to-chip cooling adoption rates.

| **Year** | **DTC Cooling** | **Center Size** | **DTC Load** | **Loops Needed / Data Center** | **Nereus Systems** |
| --- | --- | --- | --- | --- | --- |
| **2026** | 30% DTC | **300 MW** | **100** | **333** |     |
| **2028** | 40% DTC | **500 MW** | **200** | **666** |     |
| **2030** | 60% DTC | **1000 MW** | **600** | **2000** |     |

## Viscosity Impact of Glycol Concentration

Glycol concentration directly drives viscosity increases, with propylene glycol creating much higher resistance than ethylene glycol. The viscosity differences compound dramatically as concentration rises.

| **Glycol (Conc. ) by vol.** | **H20 Vis. 40F** | **H20 Vis. 45F** | **H2O Vis 50F** | **Prop glycol Vis 40F** | **Prop glycol increase vs water 40F** | **Prop glycol vis. 45F** | **Prop glycol increase vs water 45F** | **Prop glycol vis 50F** | **Prop glycol increase vs water 50F** | **Ethyl glycol vis 40F** | **Ethyl glycol increase vs water 40F** | **Ethyl glycol vis 45F** | **Ethyl glycol increase vs water 45F** | **Ethyl glycol vis 50F** | **Ethyl glycol increase vs water 50F** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0%  | 1.54 | 1.42 | 1.31 | 1.54 | 0.0% | 1.42 | 0.0% | 1.31 | 0.0% | 1.54 | 0.0% | 1.42 | 0.0% | 1.31 | 0.0% |
| 5%  | 1.54 | 1.42 | 1.31 | 2.12 | 37.5% | 1.92 | 34.6% | 1.73 | 32.3% | 1.83 | 18.8% | 1.70 | 19.4% | 1.57 | 20.1% |
| 10% | 1.54 | 1.42 | 1.31 | 2.70 | 75.0% | 2.41 | 69.2% | 2.15 | 64.6% | 2.12 | 37.6% | 1.98 | 38.8% | 1.83 | 40.2% |
| 15% | 1.54 | 1.42 | 1.31 | 3.28 | 112.5% | 2.91 | 103.8% | 2.57 | 96.8% | 2.41 | 56.4% | 2.25 | 58.2% | 2.09 | 60.2% |
| 20% | 1.54 | 1.42 | 1.31 | 3.86 | 150.0% | 3.40 | 138.4% | 3.00 | 129.1% | 2.70 | 75.2% | 2.53 | 77.6% | 2.36 | 80.3% |
| 25% | 1.54 | 1.42 | 1.31 | 4.44 | 187.5% | 3.89 | 173.0% | 3.42 | 161.4% | 3.00 | 94.0% | 2.81 | 97.0% | 2.62 | 100.4% |
| 30% | 1.54 | 1.42 | 1.31 | 5.68 | 267.8% | 5.00 | 250.2% | 4.40 | 236.2% | 3.50 | 126.4% | 3.27 | 129.3% | 3.05 | 132.8% |

At 30% concentration, propylene glycol increases viscosity by 268% while ethylene glycol increases it by 126%. Temperature changes provide some relief, but the concentration effect dominates pump sizing decisions.

## Required Pump Pressure by Fluid Type

The viscosity increases translate directly into pump pressure requirements. Systems designed for water-only operation face substantial pressure shortfalls when glycol enters the loop.

| **Fluid** | **Conc** | **40F visc** | **40F required PSI** | **45F visc** | **45F required PSI** | **50F visc** | **50F required PSI** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Water | 0%  | 1.546 | 20.0 | 1.428 | 20.0 | 1.310 | 20.0 |
| Ethylene glycol | 5%  | 1.837 | 23.8 | 1.705 | 23.9 | 1.573 | 24.0 |
| Ethylene glycol | 10% | 2.128 | 27.5 | 1.982 | 27.8 | 1.836 | 28.0 |
| Ethylene glycol | 15% | 2.418 | 31.3 | 2.259 | 31.6 | 2.099 | 32.0 |
| Ethylene glycol | 20% | 2.709 | 35.0 | 2.536 | 35.5 | 2.362 | 36.1 |
| Ethylene glycol | 25% | 3.000 | 38.8 | 2.812 | 39.4 | 2.625 | 40.1 |
| Ethylene glycol | 30% | 3.500 | 45.3 | 3.275 | 45.9 | 3.050 | 46.6 |
| Propylene glycol | 5%  | 2.126 | 27.5 | 1.922 | 26.9 | 1.733 | 26.5 |
| Propylene glycol | 10% | 2.706 | 35.0 | 2.416 | 33.8 | 2.156 | 32.9 |
| Propylene glycol | 15% | 3.285 | 42.5 | 2.910 | 40.8 | 2.579 | 39.4 |
| Propylene glycol | 20% | 3.865 | 50.0 | 3.404 | 47.7 | 3.002 | 45.8 |
| Propylene glycol | 25% | 4.445 | 57.5 | 3.898 | 54.6 | 3.424 | 52.3 |
| Propylene glycol | 30% | 5.686 | 73.6 | 5.001 | 70.0 | 4.404 | 67.2 |

A 20% ethylene glycol system requires 35 PSI compared to water's 20 PSI baseline. A 20% propylene glycol system demands 50 PSI. At 30% concentrations, propylene glycol systems need 73.6 PSI—nearly four times the water baseline.

## Pump Sizing and Energy Implications

Data center operators face three critical decisions when implementing glycol cooling. First, specify pumps with adequate pressure capacity from initial installation rather than retrofitting undersized water-only pumps. Second, choose ethylene glycol over propylene glycol where toxicity concerns allow, since it requires 30-40% less pump pressure at equivalent freeze protection levels. Third, monitor pump energy consumption closely, as the pressure increases translate directly into higher electrical demand across hundreds of loops per facility.

The energy impact scales with facility size. A 1000-megawatt campus with 2000 cooling loops using 20% propylene glycol consumes 150% more pump energy than the same facility using water. This additional load compounds the already substantial power requirements of AI data center operations.