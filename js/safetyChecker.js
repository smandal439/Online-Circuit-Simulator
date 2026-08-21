/**
 * Component Safety Inspector
 * Runs validation during circuit simulation.
 */

export class SafetyChecker {
  /**
   * Checks LED status against voltage and limiting resistance
   * @param {number} supplyVoltage - Input voltage across branch (e.g. 5V)
   * @param {number} seriesResistance - Calculated resistance in series (Ohms)
   * @param {number} maxCurrent - Max LED current in Amperes (default 0.03A = 30mA)
   */
  static checkLedHealth(supplyVoltage, seriesResistance, maxCurrent = 0.03) {
    const ledForwardVoltage = 2.0; // Typical red LED Vf
    
    if (supplyVoltage <= ledForwardVoltage) {
      return { status: 'OFF', currentmA: 0 };
    }

    const netVoltage = supplyVoltage - ledForwardVoltage;
    const current = seriesResistance > 0 ? (netVoltage / seriesResistance) : 0.5; // Max surge if 0 ohms

    if (current > maxCurrent) {
      return {
        status: 'BLOWN',
        currentmA: (current * 1000).toFixed(1),
        message: `💥 LED Burned Out! Current is ${(current * 1000).toFixed(1)}mA (Max: ${maxCurrent * 1000}mA). Add a resistor (e.g., 220Ω)!`
      };
    }

    return {
      status: 'OK',
      currentmA: (current * 1000).toFixed(1)
    };
  }
}