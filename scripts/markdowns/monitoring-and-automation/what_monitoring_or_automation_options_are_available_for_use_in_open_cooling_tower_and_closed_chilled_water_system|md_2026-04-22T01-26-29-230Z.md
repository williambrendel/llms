# What monitoring or automation options are available for open cooling tower and closed chilled water systems?

## Executive Summary

Open cooling towers typically use continuous online sensors for conductivity, pH, and oxidant residual with automated chemical feed and blowdown, while closed chilled-water systems focus on periodic monitoring of pH, conductivity, and inhibitor levels with less automation due to lower risk profiles.

## Overview

A single conductivity sensor can prevent millions in equipment damage by automatically controlling scaling in cooling towers. Open cooling towers demand far more intensive monitoring than closed systems because they constantly interact with outdoor air, concentrating contaminants and supporting biological growth that can harbor dangerous pathogens like Legionella.

## Open Cooling Tower Systems: Monitoring and Automation Options

### Continuous Online Sensors and Controllers

The most common automation approach feeds data to local controllers or building automation systems (BAS) to drive chemical feed and blowdown operations.

**Conductivity monitoring with automated blowdown valve** serves as the primary automation for controlling concentration and scaling tendency. This system prevents mineral buildup by automatically releasing concentrated water when conductivity exceeds set limits.

**pH monitoring and control** manages scaling and corrosion risk while keeping biocide chemistry effective. Many systems monitor pH continuously, with some installations adding automated pH adjustment.

**ORP or oxidant residual monitoring with automated oxidant feed** controls oxidizing biocide dose. CDC guidance specifically notes that disinfectant residual should be monitored and adjusted by automated systems in cooling towers due to Legionella risk.

Additional sensor options include:
- **Corrosion monitoring** for iron and copper levels
- **Water hardness monitoring** to track mineral content
- **Fluorescence tracking** to monitor chemical levels in the water
- **Tank level monitoring** for automated ordering and inventory control

### Temperature and Performance Monitoring

**Fan RPM monitoring** ensures water supplied to the process maintains optimal temperature without wasting energy. **Supply and return water temperature sensors** support operational control and help flag conditions that support biological growth.

**Wet bulb monitoring** measures the coldest temperature your tower can achieve through evaporation. **Tower approach to wet bulb monitoring** measures cooling tower efficiency in producing cold water.

**Makeup water meters with totalizers** track abnormal makeup indicating leaks or valve failures, support chemical inventory management, and allow calculation of evaporative tons online. These systems often include alarms for high makeup conditions.

### Flow and Filtration Monitoring

**Side-stream filtration differential pressure (DP) and particle monitoring** provides automated indication of solids loading and fouling through DP trending.

**Flow monitoring, pump status, and cell status** systems alarm for loss of circulation, which commonly precedes biofilm growth. These ensure adequate water supply to support processes without excess energy waste.

### Biological Monitoring

While most biological monitoring requires field or lab work rather than true real-time automation, several rapid field options exist.

**ATP (Adenosine Triphosphate) testing** provides rapid field results for trending total biological activity and biomass. This proves useful for catching loss of control between culture results.

**Dip slides and culture-based field tests** offer semi-quantitative trend indicators of general bacterial load.

**BART (Biological Activity Reaction Test)** represents a field incubation test that indicates the presence and relative activity of specific bacterial groups by observing reactions over time. Faster reactions generally indicate higher activity and population levels.

**HAB-BART (Heterotrophic Aerobic Bacteria)** operates on the principle that aerobic bacteria consume oxygen, and when oxygen becomes depleted, they reduce methylene blue dye causing it to bleach colorless. Faster bleaching indicates higher respiration and activity.

Other BART tests include **SLYM-BART** for slime-forming bacteria, **IRB-BART** for iron bacteria, and **SRB-BART** for sulfate-reducing bacteria. SRB-BART screens for activity associated with H₂S production, blackening, slime, and corrosion processes, particularly useful since SRB often reside deep in biofilms where bulk water testing may miss them.

**Periodic lab testing** follows site water management plans, with CDC emphasis on controlling conditions that drive growth including biofilm, sediment, temperature, water age, and disinfectant residual.

### Smart and Remote Monitoring

**Cloud dashboards with SMS, email, and app alerts** pull controller and sensor data for remote review, trend reports, and alarm management. Systems like Nereus provide this capability.

**Automated compliance reporting and logbooks** auto-capture sensor readings, alarms, corrective actions, and maintenance events. This proves particularly useful where cooling tower regulations require documented process control measures.

## Closed Chilled-Water Systems: Monitoring and Automation Options

Closed loops focus primarily on corrosion and scale control plus cleanliness, with microbial monitoring used when risk factors exist such as warm zones, stagnation, contamination, or glycol issues.

### Routine Monitoring

NIH guidance for closed loops highlights routine analysis of pH, conductivity, alkalinity, hardness, dissolved oxygen (DO), and inhibitor levels to assess stability and treatment effectiveness.

**pH and conductivity** serve as core indicators for chemistry stability and intrusion or makeup events. These parameters can be monitored online or periodically depending on system criticality.

**Inhibitor residual monitoring** varies by treatment program, with examples including nitrite, molybdate, or azole programs. Most facilities use periodic lab or field kit testing for these measurements.

**Dissolved oxygen (DO) monitoring** helps detect oxygen ingress from makeup or leaks that drives corrosion and can support biological growth.

**Glycol concentration and condition monitoring** applies where glycol is used. Concentration affects freeze protection while degradation can increase organic load and corrosion risk.

**Side-stream filtration differential pressure and particle monitoring** uses DP trending as an automated indicator of solids loading and fouling.

### Automation Options

While less common than tower automation, several options exist for closed systems.

**Online pH and conductivity skids with data logging and alarms** alert operators to drift outside control limits or sudden conductivity spikes indicating makeup intrusion.

**Automated chemical feed systems** for inhibitor dosing can be triggered by conductivity, makeup volume, or scheduled dosing, often paired with makeup meter totalizers.

**Remote monitoring** offers similar capabilities to tower systems, including cloud dashboards and alarms for pH, conductivity, DO, and DP trends, especially useful for distributed campuses.

### Biological Monitoring for Closed Systems

**ATP field testing** provides fast screening after outages, drain and refill events, or when fouling is suspected.

**HPC, dip slides, and BART testing** can be performed in field or lab settings depending on requirements. These methods trend general bacterial activity where biology is suspected, though interpretation must consider biofilm versus bulk water conditions.

The same BART test principles apply to closed systems, with HAB-BART using methylene blue bleaching to indicate bacterial activity levels, and specialized tests like SLYM-BART, IRB-BART, and SRB-BART targeting specific bacterial groups associated with slime formation, iron metabolism, and sulfate reduction respectively.

## Implementation Priorities

### Open Cooling Towers (Highest ROI and Risk)

Start with conductivity plus blowdown automation, followed by pH monitoring and control if needed. Add oxidant control via ORP or residual monitoring with automated feed, makeup meters with alarms, and remote dashboards with automated logs.

### Closed Chilled-Water Loops

Begin with pH and conductivity trending, either online or periodic. Add makeup metering and totalizing with alarms for abnormal makeup, periodic inhibitor residual checks with automation for critical systems, DO monitoring where oxygen ingress is suspected, and filtration DP trending with remote alerts.

## Key Takeaways

Implement conductivity-based blowdown automation first for cooling towers, checking conductivity levels daily and maintaining cycles of concentration between 3-6 depending on water quality. For closed systems, monitor pH and conductivity monthly at minimum, with immediate investigation of any conductivity spikes above 10% of baseline that could indicate system leaks or contamination. Consider automated monitoring platforms like Nereus for facilities managing multiple systems or requiring regulatory compliance documentation.