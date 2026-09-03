'use strict';
defComp({
  id: 'wifi_module',
  name: 'Wi-Fi Module',
  category: 'Communication',

  defaultProps: {
    ssid: 'Home_Network',
    password: 'MySecretPassword123'
  },

  interactive: [
    { field: 'ssid',     label: 'Wi-Fi SSID', type: 'text' },
    { field: 'password', label: 'Password',   type: 'text' }
  ],

  step(inst, sim) {
    const currentSSID = inst.props.ssid;
    const currentPass = inst.props.password;
    
    // Pass credentials to simulated networking runtime
    if (sim && sim.connectWifi) {
      sim.connectWifi(currentSSID, currentPass);
    }
  }
});