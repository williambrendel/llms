# What are the water quality requirements for direct-to-chip cooling systems?

## Executive Summary

Direct-to-chip (D2C) cooling systems require water quality standards that are significantly more stringent than building water systems, with ASHRAE guidelines specifying chloride levels below 5 ppm, sulfate under 10 ppm, and total hardness less than 20 ppm as CaCO₃.

## Overview

A single speck of debris in a cold plate's microchannel can cripple an entire server rack. D2C cooling systems push coolant through passages so narrow that contaminants measuring just 5 microns—invisible to the naked eye—can cause catastrophic blockages. This explains why ASHRAE's thermal control system (TCS) guidelines demand ion concentrations 5-10 times lower than typical building water standards.

## ASHRAE TCS Water Quality Guidelines

ASHRAE Technical Committee 9.9 establishes specific water quality parameters for thermal control systems that directly contact IT equipment. These requirements reflect the vulnerability of cold plates and microchannels to corrosion, scaling, and fouling.

| **Parameter** | **ASHRAE example TCS guideline** | **Notes** |
| --- | --- | --- |
| pH  | **8.0–9.5** | Alkaline range to reduce corrosion risk in sensitive IT-side hardware. |
| Chloride (ppm) | **< 5 ppm** | Tight ionic limit to reduce pitting/crevice corrosion risk. |
| Sulfate (ppm) | **< 10 ppm** | Tight ionic limit to reduce corrosion/scale risk. |
| Total hardness (as CaCO₃, ppm) | **< 20 ppm** | Minimizes scaling/fouling risk in cold plates / small passages. |
| Bacteria | **< 100 CFU/mL** | Tighter than facility loop; implies ongoing microbial control + monitoring. |
| Total suspended solids (TSS, ppm) | **< 3 ppm** | Particulate control to protect small channels/heat exchangers. |
| Conductivity (micromho/cm) | **0.2–20 micromho/cm** | Very low-ion guideline range (ASHRAE notes this can be challenging to maintain). |
| Turbidity (NTU) | **< 20 NTU** | Broad clarity limit (many operators target much lower in practice, but ASHRAE's example is as shown). |
| Corrosion inhibitor(s) | **Required** | ASHRAE does **not** specify a chemistry in this table—only that inhibitors are required. |
| Biocide | **Required** | ASHRAE does **not** specify a chemistry in this table—only that a biocide is required. |

The conductivity range of 0.2–20 micromho/cm proves particularly challenging to maintain in practice, as ASHRAE acknowledges in their documentation.

## Chemical Treatment Requirements

### Corrosion Inhibitors

ASHRAE mandates corrosion inhibitors without specifying exact chemistries. Common inhibitor types used in closed recirculating cooling loops include:

- **Nitrite**
- **Molybdate** 
- **Silicate**
- **Borate**
- **Aromatic triazoles (azoles)** such as benzotriazole (BZT) and tolyltriazole (TTA) for copper and copper alloys

### Biocides

Despite the closed-loop design, ASHRAE requires biocide treatment for TCS systems. Common non-oxidizing biocide chemistries include:

- **Isothiazolinone-based biocides**
- **DBNPA (2,2-dibromo-3-nitrilopropionamide)**
- **Glutaraldehyde**

The specific biocide selection must account for materials compatibility with copper alloys, aluminum, and elastomers, plus any OEM restrictions.

## Glycol-Based Systems

### Standard Concentrations and Products

Most D2C deployments use **pre-inhibited propylene glycol blends** at approximately 25% concentration (PG25). This concentration balances freeze protection, viscosity, pump power requirements, and compatibility with quick connects and cold-plate designs.

Manufacturers supply products like Dow's DOWFROST™ LC 25, specifically optimized for D2C applications with customized inhibitor packages.

### Glycol Degradation

Propylene glycol degrades over time when exposed to heat and oxygen ingress. The degradation process forms small organic acids including **formic, acetic, glycolic, glyoxylic, and oxalic acids**. These acids depress pH and increase corrosion risk, making inhibitor monitoring essential.

Glycol itself provides no reliable biocidal effect, despite the closed-loop design reducing biological risk through low nutrients and limited contamination.

## Filtration and Particulate Control

### Micron-Level Requirements

The Open Compute Project (OCP) glycol guidelines specify rigorous filtration standards:

- **Side-stream filtration below 5 µm** to prevent particulate trapping in cold-plate microchannels
- **Filter sizing at ~10% of loop flow rate**
- **Inline coarser filters (50 µm)** to protect heat exchangers and connectors
- **Progressive filtration** starting with higher micron sizes during commissioning, then reducing to the 5 µm target

### Monitoring Approach

Rather than formal TSS lab testing, practitioners typically monitor **turbidity and particle load** along with filter differential pressure. OCP recommends continuous turbidity monitoring for larger or critical systems.

## System Commissioning and Maintenance

### Fill Procedures

OCP guidelines establish specific commissioning sequences to maintain cleanliness:

**New systems:**
1. Install new filter
2. Fill with selected propylene-glycol fluid
3. Circulate ~30 minutes to suspend manufacturing debris
4. Drain completely
5. Replace filters
6. Final fill

**Existing systems:**
1. Drain old fluid
2. Rinse/flush with DI/distilled water meeting low-ion limits
3. Replace filters
4. Circulate and drain
5. Replace filters again
6. Final fill

### Water Quality for Flushing

OCP specifies pre-fill rinse water limits:
- Chloride < 25 ppm
- Sulfate < 25 ppm  
- Calcium (as CaCO₃) < 25 ppm
- Magnesium (as CaCO₃) < 25 ppm
- Total hardness (as CaCO₃) < 50 ppm

### Ongoing Monitoring

Effective D2C water quality management requires:

- **Certificate of Analysis (COA)** retention from fluid suppliers
- **Continuous monitoring** of fluid chemistry, pH, corrosion rate, and turbidity for large/critical loops
- **Cleanliness controls** including factory-sealed components and elimination of flux residues
- **Inhibitor residual testing** based on specific coolant specifications rather than universal standards

## Implementation Guidelines

Monitor your D2C cooling system's water quality monthly using ASHRAE's TCS parameters, maintain side-stream filtration below 5 microns, and use pre-inhibited PG25 glycol blends with supplier-certified chemistry analysis to prevent the microchannel blockages that can disable entire server racks.