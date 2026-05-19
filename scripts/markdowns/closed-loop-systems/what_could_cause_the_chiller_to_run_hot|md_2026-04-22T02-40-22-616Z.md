# What Could Cause a Chiller to Run Hot in a Data Center with Winter Economizer?

## Executive Summary

Chillers run hot when they can't reject heat effectively or absorb heat properly, showing up as high condenser temperatures, elevated pressures, or warm chilled water supply. In data centers with winter-only plate-and-frame heat exchangers, the most frequent culprits are fouled heat transfer surfaces, insufficient water flow, economizer control sequence errors, cooling tower performance issues, and sensor calibration problems.

## Overview

A single degree of condenser temperature rise can cut chiller efficiency by 2-3%, turning what should be peak winter performance into an expensive struggle. Data centers with plate-and-frame economizers face a unique challenge: they operate two distinct cooling modes with different flow paths, valve positions, and control sequences. When something goes wrong during the transition between modes or within the economizer operation itself, the symptoms often masquerade as chiller problems when the real issue lies elsewhere in the system.

## Defining "Running Hot" - What to Measure First

Chillers don't actually run hot - they reveal that something else in the system can't transfer heat effectively. The key is identifying which side of the thermal equation has failed.

**Condenser side symptoms** point to heat rejection problems. High condensing pressure, elevated condenser leaving water temperature, and cooling tower fans running at maximum speed while temperatures remain stubborn all indicate the chiller can't dump heat to the outside world.

**Evaporator side symptoms** suggest heat absorption issues. Chilled water supply temperature creeping above setpoint, unusual temperature differences between supply and return, or rising evaporator approach temperatures mean the chiller struggles to pull heat from the building loads.

The diagnostic power comes from simultaneous measurements across the entire system. Condenser-water temperatures entering and leaving both the cooling tower and chiller condenser, chilled-water supply and return temperatures, flow rates on both sides, and - critically in economizer systems - temperatures and pressures across the plate-and-frame heat exchanger reveal the thermal story.

## Condenser Side Causes

### Cooling Tower Performance Degradation

Cooling towers fail gradually, then suddenly. Tower approach temperature - the difference between tower leaving water temperature and outdoor wet-bulb temperature - provides the clearest indicator of tower health. Normal approach ranges from 5-10°F; anything above 12°F signals trouble.

Tower fill fouling creates the most common performance loss. Scale, biofilm, and accumulated solids reduce the surface area where water and air exchange heat and mass. Poor water distribution compounds the problem - plugged spray nozzles create dry spots on the fill, forcing the remaining water to carry the full thermal load.

Fan performance issues often hide behind seemingly normal operation. Variable speed drives may limit maximum fan speed due to electrical constraints, worn belts slip under load, and damaged or incorrectly rotating blades move air without creating effective heat transfer.

### Condenser-Water Flow Restrictions

Low condenser-water flow forces the available water to carry more heat per gallon, driving up temperatures throughout the rejection circuit. Pump impeller wear reduces flow capacity while increasing energy consumption. Plugged strainers create invisible restrictions - the system appears to operate normally until the blockage reaches a critical threshold.

Valve positioning errors multiply during economizer season. Three-way valves may stick partially closed, isolation valves get left in intermediate positions after maintenance, and control valves respond to incorrect signals from miscalibrated sensors.

Air binding represents a particularly insidious flow problem. Air trapped at high points reduces the effective cross-sectional area for water flow while creating turbulence that further degrades heat transfer. The symptoms - erratic temperatures, unusual noises, sudden performance losses - often point operators toward more complex explanations.

### Condenser Fouling

Heat transfer surfaces accumulate resistance over time through mineral scale, biological growth, and corrosion products. Calcium carbonate and calcium phosphate form the most common scale types, precipitating when water temperature, pH, or concentration changes exceed saturation limits.

Biological fouling accelerates in warm water conditions typical of summer operation or when biocide programs lose effectiveness. The biofilm acts as both a thermal barrier and a foundation for additional scale formation.

**Condenser approach temperature** provides the clearest fouling indicator. Rising approach at constant flow rates signals increasing thermal resistance, while rising differential pressure across the condenser water side confirms flow restriction.

## Evaporator Side Causes

### Chilled-Water Flow and Distribution Issues

Insufficient chilled-water flow creates unstable control and poor heat pickup from building loads. Computer room air conditioning and air handling unit control valves may throttle excessively due to poor reset strategies, creating artificial flow restrictions while other zones receive inadequate cooling.

Unintended bypass flows around the evaporator or through mixing headers reduce effective temperature control. The chiller works harder to achieve setpoint while the building loads receive inconsistent cooling.

### Evaporator Fouling

Chilled-water loops typically stay cleaner than condenser-water circuits, but fouling still occurs. Biofilm formation increases when oxygen enters the system or when side-stream filtration proves inadequate. Construction debris, gasket fragments, and corrosion products accumulate over time.

Excessive glycol concentration for freeze protection increases fluid viscosity and reduces heat transfer coefficients. The evaporator approach temperature rises while pressure drop across the water side increases.

### Load-Side Heat Exchange Problems

Heat transfer effectiveness from data halls to chilled water depends on clean coils and proper airflow. Air-side fouling through bypassed filters or accumulated dust reduces sensible cooling capacity. Water-side fouling in computer room air conditioning coils creates thermal resistance.

Control setpoint conflicts compound the problem. Chilled water supply temperature reset too high for coil selection, especially during peak loads, forces the chiller into high-lift operation. Fan control limitations reduce airflow across coils, increasing return air temperatures and driving up cooling loads.

Hot aisle and cold aisle mixing defeats containment strategies, increasing required cooling capacity and pushing chillers toward their performance limits.

## Plate-and-Frame Heat Exchanger Issues

Winter economizers introduce a parallel heat rejection path that must integrate seamlessly with chiller operation. The plate-and-frame heat exchanger operates with two distinct water circuits, each subject to different fouling mechanisms and control requirements.

### Tower-Side Problems

The tower-side circuit carries the same water quality challenges as the condenser-water loop but operates under different temperature and flow conditions. Biological growth accelerates when oxidizer residual drops during winter operation or when tower cycles increase to conserve water.

Scale formation occurs when temperature changes precipitate dissolved minerals onto plate surfaces. Suspended solids and silt plug the narrow channels between plates, creating high differential pressure and reduced heat transfer.

**Rising differential pressure** across the tower side of the plate-and-frame provides the earliest fouling indicator. Reduced temperature change across the heat exchanger at constant flow confirms declining thermal performance.

### Load-Side Control Sequences

The load-side circuit requires precise valve sequencing during economizer operation. Three-way valve leakage allows unintended mixing between economizer supply and chiller supply, warming the delivered chilled water. Isolation valves left partially open create parallel flow paths that defeat temperature control.

Control logic conflicts arise when economizer and chiller modes overlap. The economizer may enable when tower conditions cannot support required leaving water temperatures, forcing both systems to operate simultaneously with poor results.

**Plate-and-frame approach temperature** - the difference between hot side outlet and cold side inlet temperatures - indicates heat exchanger effectiveness. Increasing approach suggests fouling, air binding, or flow distribution problems.

## Air Binding and Venting

Plate-and-frame heat exchangers create natural air collection points due to their internal geometry and piping configuration. Air reduces effective plate area while creating turbulent flow that further degrades heat transfer.

Seasonal startup after winter shutdown often leaves air pockets throughout the system. Inadequate high-point vents or isolated automatic air vents prevent proper system filling and operation.

The symptoms - noisy flow, erratic temperatures, sudden performance losses - often suggest more complex problems when the solution involves systematic air removal.

## Control and Instrumentation Faults

### Mode Changeover Problems

Economizer-to-chiller transitions require coordinated valve movements, pump staging, and setpoint adjustments. Incorrect switchover thresholds enable economizer operation when outdoor conditions cannot support required performance, forcing the chiller to make up the difference under poor operating conditions.

Valve command versus position mismatches create invisible control problems. Valves commanded to 100% open may achieve only partial travel due to actuator limitations, linkage slippage, or mechanical binding.

### Sensor Calibration Drift

Temperature sensor errors propagate throughout the control system. A biased condenser entering water sensor drives cooling tower operation incorrectly, while a drifting chilled water supply sensor causes the chiller to overwork or underdeliver relative to actual building needs.

Flow measurement errors cause control loops to miscalculate heat loads and equipment staging requirements. The result appears as poor chiller performance when the real problem lies in instrumentation accuracy.

## Practical Troubleshooting Approach

**What it measures:** Systematic fault isolation using approach temperatures and differential pressures to distinguish between fouling, flow, and control problems.

**Example:** A chiller showing high condensing pressure with normal condenser-water flow but rising condenser approach temperature (from 3°F to 8°F over several months) indicates condenser fouling rather than tower or flow problems. Conversely, high condensing pressure with low condenser-water flow and normal approach temperature points to pump, valve, or strainer issues.

Start by determining whether the limitation occurs on the condenser side or evaporator side. High condensing pressure and condenser leaving water temperature prioritize cooling tower, condenser-water flow, condenser fouling, and economizer tower-side restrictions. High chilled water supply temperature with normal condenser conditions focuses attention on chilled-water flow, evaporator fouling, coil performance, and economizer load-side control.

Use approach temperatures as the fastest fouling indicator. Rising approach with normal flow suggests heat transfer surface fouling. Low temperature change with low differential pressure indicates bypassing or valve leakage. High differential pressure with reduced flow points to plugging or restrictions.

## Key Takeaways

Monitor condenser and evaporator approach temperatures monthly to catch fouling before it impacts performance significantly. Maintain cooling tower approach below 10°F through quarterly fill inspection and annual cleaning. Verify plate-and-frame differential pressure stays below manufacturer specifications through seasonal measurements on both sides. Calibrate temperature sensors annually and flow measurement devices every two years to ensure control system accuracy.