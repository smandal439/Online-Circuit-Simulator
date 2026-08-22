// Base Logic States
export const LogicState = {
  LOW: 0,
  HIGH: 1,
  FLOATING: null
};

export class DigitalIC {
  constructor(name, pinCount = 14) {
    this.name = name;
    this.pinCount = pinCount;
    // 1-indexed pin map: pins[1] to pins[pinCount]
    this.pins = Array.from({ length: pinCount + 1 }, () => ({
      mode: 'INPUT', // 'INPUT', 'OUTPUT', 'VCC', 'GND', 'NC'
      state: LogicState.LOW,
      prevClockState: LogicState.LOW
    }));
  }

  setPinMode(pin, mode) {
    this.pins[pin].mode = mode;
  }

  setPinState(pin, state) {
    if (this.pins[pin].mode === 'INPUT') {
      this.pins[pin].state = state;
    }
  }

  getPinState(pin) {
    return this.pins[pin].state;
  }

  // Helper for rising-edge clock detection
  isRisingEdge(pin) {
    const current = this.pins[pin].state;
    const prev = this.pins[pin].prevClockState;
    this.pins[pin].prevClockState = current;
    return prev === LogicState.LOW && current === LogicState.HIGH;
  }

  // Override in sub-classes
  evaluate() {
    throw new Error('evaluate() must be implemented by IC subclass');
  }
}

export class IC7408 extends DigitalIC {
  constructor() {
    super('7408 Quad 2-Input AND', 14);
    
    // Gate 1: 1, 2 -> 3
    // Gate 2: 4, 5 -> 6
    // Gate 3: 9, 10 -> 8
    // Gate 4: 12, 13 -> 11
    [1, 2, 4, 5, 9, 10, 12, 13].forEach(p => this.setPinMode(p, 'INPUT'));
    [3, 6, 8, 11].forEach(p => this.setPinMode(p, 'OUTPUT'));
    this.setPinMode(7, 'GND');
    this.setPinMode(14, 'VCC');
  }

  evaluate() {
    const andLogic = (in1, in2) => (in1 === LogicState.HIGH && in2 === LogicState.HIGH) ? LogicState.HIGH : LogicState.LOW;

    this.pins[3].state = andLogic(this.pins[1].state, this.pins[2].state);
    this.pins[6].state = andLogic(this.pins[4].state, this.pins[5].state);
    this.pins[8].state = andLogic(this.pins[9].state, this.pins[10].state);
    this.pins[11].state = andLogic(this.pins[12].state, this.pins[13].state);
  }
}

export class IC7400 extends DigitalIC {
  constructor() {
    super('7400 Quad 2-Input NAND', 14);
    [1, 2, 4, 5, 9, 10, 12, 13].forEach(p => this.setPinMode(p, 'INPUT'));
    [3, 6, 8, 11].forEach(p => this.setPinMode(p, 'OUTPUT'));
    this.setPinMode(7, 'GND');
    this.setPinMode(14, 'VCC');
  }

  evaluate() {
    const nandLogic = (in1, in2) => (in1 === LogicState.HIGH && in2 === LogicState.HIGH) ? LogicState.LOW : LogicState.HIGH;

    this.pins[3].state = nandLogic(this.pins[1].state, this.pins[2].state);
    this.pins[6].state = nandLogic(this.pins[4].state, this.pins[5].state);
    this.pins[8].state = nandLogic(this.pins[9].state, this.pins[10].state);
    this.pins[11].state = nandLogic(this.pins[12].state, this.pins[13].state);
  }
}



export class IC7474 extends DigitalIC {
  constructor() {
    super('7474 Dual D Flip-Flop', 14);

    // FF 1: CLR=1, D=2, CLK=3, PRE=4, Q=5, /Q=6
    // FF 2: /Q=8, Q=9, PRE=10, CLK=11, D=12, CLR=13
    [1, 2, 3, 4, 10, 11, 12, 13].forEach(p => this.setPinMode(p, 'INPUT'));
    [5, 6, 8, 9].forEach(p => this.setPinMode(p, 'OUTPUT'));
    this.setPinMode(7, 'GND');
    this.setPinMode(14, 'VCC');

    this.q1 = LogicState.LOW;
    this.q2 = LogicState.LOW;
  }

  evaluate() {
    // --- Flip-Flop 1 ---
    const clr1 = this.pins[1].state;
    const pre1 = this.pins[4].state;
    const clk1 = 3;
    const d1 = this.pins[2].state;

    if (clr1 === LogicState.LOW && pre1 === LogicState.HIGH) {
      this.q1 = LogicState.LOW;
    } else if (pre1 === LogicState.LOW && clr1 === LogicState.HIGH) {
      this.q1 = LogicState.HIGH;
    } else if (clr1 === LogicState.LOW && pre1 === LogicState.LOW) {
      this.q1 = LogicState.HIGH; // Unstable state
    } else if (this.isRisingEdge(clk1)) {
      this.q1 = d1;
    }

    this.pins[5].state = this.q1;
    this.pins[6].state = this.q1 === LogicState.HIGH ? LogicState.LOW : LogicState.HIGH;

    // --- Flip-Flop 2 ---
    const clr2 = this.pins[13].state;
    const pre2 = this.pins[10].state;
    const clk2 = 11;
    const d2 = this.pins[12].state;

    if (clr2 === LogicState.LOW && pre2 === LogicState.HIGH) {
      this.q2 = LogicState.LOW;
    } else if (pre2 === LogicState.LOW && clr2 === LogicState.HIGH) {
      this.q2 = LogicState.HIGH;
    } else if (clr2 === LogicState.LOW && pre2 === LogicState.LOW) {
      this.q2 = LogicState.HIGH;
    } else if (this.isRisingEdge(clk2)) {
      this.q2 = d2;
    }

    this.pins[9].state = this.q2;
    this.pins[8].state = this.q2 === LogicState.HIGH ? LogicState.LOW : LogicState.HIGH;
  }
}

export class IC74138 extends DigitalIC {
  constructor() {
    super('74138 3-to-8 Decoder', 16);

    // Select: A=1, B=2, C=3
    // Enables: /G2A=4, /G2B=5, G1=6
    // Outputs (Active-Low): Y0=15, Y1=14, Y2=13, Y3=12, Y4=11, Y5=10, Y6=9, Y7=7
    [1, 2, 3, 4, 5, 6].forEach(p => this.setPinMode(p, 'INPUT'));
    [7, 9, 10, 11, 12, 13, 14, 15].forEach(p => this.setPinMode(p, 'OUTPUT'));
    this.setPinMode(8, 'GND');
    this.setPinMode(16, 'VCC');
  }

  evaluate() {
    const a = this.pins[1].state;
    const b = this.pins[2].state;
    const c = this.pins[3].state;
    const g2a = this.pins[4].state;
    const g2b = this.pins[5].state;
    const g1 = this.pins[6].state;

    // Enabled when G1=HIGH, /G2A=LOW, /G2B=LOW
    const isEnabled = (g1 === LogicState.HIGH && g2a === LogicState.LOW && g2b === LogicState.LOW);

    const outputPins = [15, 14, 13, 12, 11, 10, 9, 7]; // Y0 to Y7

    // Default all active-low outputs to HIGH
    outputPins.forEach(pin => (this.pins[pin].state = LogicState.HIGH));

    if (isEnabled) {
      const address = (c << 2) | (b << 1) | a;
      this.pins[outputPins[address]].state = LogicState.LOW;
    }
  }
}

export class DigitalSimulator {
  constructor() {
    this.ics = [];
    this.nets = []; // Array of { connections: [{ ic, pin }] }
  }

  addIC(ic) {
    this.ics.push(ic);
  }

  step(maxIterations = 5) {
    let stable = false;
    let iteration = 0;

    while (!stable && iteration < maxIterations) {
      stable = true;

      // 1. Evaluate logic inside each IC
      for (const ic of this.ics) {
        ic.evaluate();
      }

      // 2. Propagate output pin states to connected input pins across wires/nets
      for (const net of this.nets) {
        const driver = net.connections.find(c => c.ic.pins[c.pin].mode === 'OUTPUT');
        if (driver) {
          const signal = driver.ic.getPinState(driver.pin);
          for (const conn of net.connections) {
            if (conn.ic.pins[conn.pin].mode === 'INPUT') {
              if (conn.ic.pins[conn.pin].state !== signal) {
                conn.ic.setPinState(conn.pin, signal);
                stable = false; // State changed; run another iteration
              }
            }
          }
        }
      }
      iteration++;
    }
  }
}

// Add to DigitalIC base class
isFallingEdge(pin) {
  const current = this.pins[pin].state;
  const prev = this.pins[pin].prevClockState ?? current;
  this.pins[pin].prevClockState = current;
  return prev === LogicState.HIGH && current === LogicState.LOW;
}