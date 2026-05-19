# What's the difference between CRAC, CRAH and direct liquid cooling in data centers?

## Executive Summary

CRAC and CRAH units cool data center air using refrigerant or chilled water systems, while direct liquid cooling (DLC) brings liquid directly to server chips for dramatically more efficient heat removal.

## Overview

A single high-density server rack can now generate over 100 kW of heat — far beyond what traditional air cooling can handle. This shift has forced data center operators to choose between room-level air systems that have dominated for decades and emerging liquid cooling technologies that touch the processors directly.

## Air-Based Cooling: CRAC and CRAH Systems

CRAC (Computer Room Air Conditioner) and CRAH (Computer Room Air Handler) units represent the traditional approach to data center cooling. Both systems cool room air and circulate it across IT equipment, but they differ in their cooling source.

A CRAC unit operates as a self-contained system with its own compressor, using refrigerant coils to cool air directly. CRAH units connect to a building's chilled water system, using water-cooled coils instead of refrigerant. Both systems distribute cooled air through raised floors or ceiling plenums, creating the hot and cold aisle configurations familiar in most data centers.

| **Component** | **Description** |
| --- | --- |
| CRAC | A self-contained unit with a compressor that cools air using refrigerant coils. |
| CRAH | A chilled water-based unit using coils fed by a building chilled water system. |
| Cooling Method | Cools the room air and circulates it across IT equipment via raised floors or ceiling plenum. |
| Cooling Fluid Contact | Indirect – air contacts equipment; chilled water or refrigerant cools the air, not the electronics. |

## Direct Liquid Cooling Systems

Direct liquid cooling takes a fundamentally different approach by bringing liquid — typically a water-glycol mixture — directly to the heat source inside servers. The cooling fluid flows through cold plates mounted on processors or other heat-generating components.

Heat transfers from the chips to the liquid, which then carries that thermal energy to a cooling distribution unit (CDU) or heat exchanger outside the server. This direct contact eliminates the thermal resistance that air creates between the cooling medium and the heat source.

| **Component** | **Description** |
| --- | --- |
| Cooling Method | Liquid (often water-based) is brought directly to the chip or cold plate inside the server. |
| Heat Transfer | Heat from processors is removed by the fluid and carried to a CDU (cooling distribution unit) or heat exchanger. |
| Cooling Fluid Contact | Direct (to the hardware interface) – not open to the environment, but thermally in contact with chips. |

## Performance and Design Differences

The choice between air and liquid cooling affects every aspect of data center design and operation. Air-based systems require extensive infrastructure for airflow management but present minimal leak risks. Liquid cooling systems demand much less space and power but require stringent fluid quality controls.

| Feature | CRAC/CRAH | DLC |
| --- | --- | --- |
| Cooling Medium | Air | Liquid (usually water/glycol) |
| Efficiency | Lower (air has poor heat capacity) | Higher (direct contact, better thermal transfer) |
| Space Use | Requires hot/cold aisles and raised floors | Reduces space footprint |
| Heat Density Support | Moderate (< 10 kW/rack typical) | Very high (up to 100 kW/rack or more) |
| Maintenance Risk | Lower for leaks (air cooled) | Higher if leaks occur in server |
| Filtration Need | Basic air filters | Micron-level filtration and purity critical |

![Generated image](data:image/png;base64...)

## Water Quality Requirements

Direct liquid cooling systems place extreme demands on water quality that CRAC and CRAH systems never encounter. The cooling fluid must meet semiconductor-grade purity standards to prevent corrosion, fouling, or electrical conductivity issues when circulating near sensitive electronics.

Micron-level filtration removes particles that could clog narrow cooling channels, while chemical treatment maintains precise pH levels and prevents microbial growth. CRAC and CRAH systems require only basic air filtration since the cooling medium never contacts server components directly.

## Key Takeaways

Monitor server rack power density monthly — anything approaching 10 kW per rack signals the practical limit for air cooling systems. Consider direct liquid cooling for new deployments exceeding 15 kW per rack, and implement closed-loop systems with deionized water, micron filtration, and corrosion inhibitors to protect the substantial hardware investment.