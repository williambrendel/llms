# How is conductivity used to control blowdown in open cooling tower and closed loop water systems?

## Executive Summary

Conductivity serves as a real-time proxy for dissolved solids concentration, automatically triggering blowdown valves in open cooling towers when mineral buildup exceeds target levels. Closed-loop systems use conductivity for monitoring rather than routine blowdown control, since they should require minimal makeup water.

## Overview

A single conductivity probe can automatically manage water quality in a cooling tower that processes millions of gallons per day. When that probe reads 2400 µS/cm instead of the target 2000 µS/cm, it triggers a cascade of water management decisions that prevent scaling, optimize chemical use, and maintain system efficiency. The difference between open and closed systems lies not just in their design, but in how conductivity measurements translate to control actions.

## Open Cooling Towers: Conductivity-Driven Blowdown Control

### Real-Time Dissolved Solids Management

Conductivity functions as a continuous proxy for total dissolved solids (TDS) in open tower systems. As pure water evaporates from the tower, dissolved minerals remain behind and concentrate in the circulating water. This concentration process drives conductivity readings higher until the system takes corrective action.

### Automatic Blowdown Control Loop

The standard control system operates through a straightforward feedback loop. A conductivity probe continuously measures the circulating basin water and sends readings to a controller. The controller compares these readings to a predetermined setpoint value in µS/cm. When measured conductivity exceeds the setpoint, the controller opens a blowdown valve to discharge concentrated water from the system.

Fresh makeup water enters to replace the discharged water, diluting the dissolved solids concentration and bringing conductivity back toward the target setpoint. This approach represents the standard method recommended in water-efficiency and tower management guidance.

### Setting Conductivity Targets Using Cycles of Concentration

Operators commonly establish conductivity setpoints by selecting target cycles of concentration (COC) and converting this target to a specific conductivity value.

**What it measures:** The relationship between makeup water conductivity and target operating cycles to determine the blowdown trigger point.

Formula:
```
Target Conductivity Setpoint = Makeup Conductivity × Target COC
```

**Example:** Makeup water conductivity of 400 µS/cm with target cycles of 6 produces a setpoint of 400 × 6 = 2400 µS/cm.

### Control System Configurations

**Single-probe control** uses only tower basin conductivity measurements. This simpler approach works effectively when makeup water quality remains stable, but assumes consistent baseline conductivity.

**Cycles control with dual probes** measures both makeup and tower conductivity simultaneously. The controller calculates actual cycles of concentration and maintains the target ratio. This configuration provides superior control when makeup water conductivity varies seasonally or due to source changes.

### Troubleshooting Control System Failures

Unstable conductivity control typically stems from four primary causes. Conductivity probe issues include fouling, scaling, dirty sample lines, or calibration drift. Leaking blowdown valves create persistent low conductivity readings, wasting water and chemicals while potentially increasing corrosion risk.

Makeup water quality changes from seasonal blending or different source water can disrupt established setpoints. Operating condition changes including cooling load variations, temperature fluctuations, drift rate changes, or basin volume modifications also affect control stability.

## Closed-Loop Systems: Monitoring Rather Than Control

### Minimal Makeup Requirements

Properly operating closed-loop systems require minimal makeup water—typically less than 5% of system volume per year. This low makeup requirement eliminates the need for continuous blowdown that characterizes open tower operation.

### Conductivity Applications in Closed Systems

**Condition monitoring** uses conductivity trending to detect makeup water addition, system leaks, contamination events, or chemical treatment additions. Rising conductivity often indicates water loss and makeup addition, while sudden changes can signal contamination.

**Event-driven dump-and-fill** operations sometimes use conductivity readings during system cleaning, commissioning corrections, or contamination response. These represent corrective actions rather than routine operational control.

### Critical Control Limitations

Using conductivity as a surrogate for critical inhibitor residuals proves unreliable in closed systems. Nitrite concentrations, essential for preventing pitting corrosion, can decline due to consumption or system losses while conductivity remains stable. Nitrite loss commonly occurs with system water loss and requires direct measurement rather than conductivity inference.

## Key Takeaways

Monitor cooling tower conductivity continuously with automatic blowdown control set to maintain target cycles of concentration. Check conductivity probe calibration monthly and inspect blowdown valve operation weekly to prevent control failures. For closed-loop systems, track conductivity trends for leak detection but measure critical inhibitors like nitrite directly rather than relying on conductivity as a proxy.