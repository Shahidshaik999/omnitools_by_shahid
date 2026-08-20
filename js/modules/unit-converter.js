/**
 * OmniTools — Unit & Measurement Converter Module
 * High-precision conversions across Length, Weight, Temperature, Digital Data, Area, and Time.
 */

const UnitConverter = {
  units: {
    length: {
      base: 'meter',
      conversions: {
        meter: 1,
        kilometer: 1000,
        centimeter: 0.01,
        millimeter: 0.001,
        mile: 1609.344,
        yard: 0.9144,
        foot: 0.3048,
        inch: 0.0254
      },
      labels: {
        meter: 'Meters (m)',
        kilometer: 'Kilometers (km)',
        centimeter: 'Centimeters (cm)',
        millimeter: 'Millimeters (mm)',
        mile: 'Miles (mi)',
        yard: 'Yards (yd)',
        foot: 'Feet (ft)',
        inch: 'Inches (in)'
      }
    },
    weight: {
      base: 'kilogram',
      conversions: {
        kilogram: 1,
        gram: 0.001,
        milligram: 0.000001,
        ton: 1000,
        pound: 0.45359237,
        ounce: 0.02834952,
        stone: 6.35029
      },
      labels: {
        kilogram: 'Kilograms (kg)',
        gram: 'Grams (g)',
        milligram: 'Milligrams (mg)',
        ton: 'Metric Tons (t)',
        pound: 'Pounds (lbs)',
        ounce: 'Ounces (oz)',
        stone: 'Stones (st)'
      }
    },
    temperature: {
      isTemp: true,
      labels: {
        celsius: 'Celsius (°C)',
        fahrenheit: 'Fahrenheit (°F)',
        kelvin: 'Kelvin (K)'
      }
    },
    data: {
      base: 'byte',
      conversions: {
        byte: 1,
        kilobyte: 1024,
        megabyte: 1024 ** 2,
        gigabyte: 1024 ** 3,
        terabyte: 1024 ** 4,
        petabyte: 1024 ** 5
      },
      labels: {
        byte: 'Bytes (B)',
        kilobyte: 'Kilobytes (KB)',
        megabyte: 'Megabytes (MB)',
        gigabyte: 'Gigabytes (GB)',
        terabyte: 'Terabytes (TB)',
        petabyte: 'Petabytes (PB)'
      }
    },
    area: {
      base: 'sq_meter',
      conversions: {
        sq_meter: 1,
        sq_kilometer: 1000000,
        sq_mile: 2589988.11,
        acre: 4046.86,
        hectare: 10000,
        sq_foot: 0.092903
      },
      labels: {
        sq_meter: 'Square Meters (m²)',
        sq_kilometer: 'Square Kilometers (km²)',
        sq_mile: 'Square Miles (mi²)',
        acre: 'Acres (ac)',
        hectare: 'Hectares (ha)',
        sq_foot: 'Square Feet (ft²)'
      }
    },
    time: {
      base: 'second',
      conversions: {
        second: 1,
        minute: 60,
        hour: 3600,
        day: 86400,
        week: 604800,
        month: 2592000,
        year: 31536000
      },
      labels: {
        second: 'Seconds (s)',
        minute: 'Minutes (min)',
        hour: 'Hours (h)',
        day: 'Days (d)',
        week: 'Weeks (wk)',
        month: 'Months (~30d)',
        year: 'Years (365d)'
      }
    }
  },

  currentCategory: 'length',

  init() {
    // Category Tabs
    document.querySelectorAll('.unit-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.unit-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.dataset.unit;
        this.populateDropdowns();
        this.calculate();
      });
    });

    const fromVal = document.getElementById('unitFromValue');
    const fromSelect = document.getElementById('unitFromSelect');
    const toSelect = document.getElementById('unitToSelect');
    const swapBtn = document.getElementById('swapUnitsBtn');

    if (!fromVal) return;

    fromVal.addEventListener('input', () => this.calculate());
    fromSelect.addEventListener('change', () => this.calculate());
    toSelect.addEventListener('change', () => this.calculate());

    swapBtn.addEventListener('click', () => {
      const temp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = temp;
      this.calculate();
    });

    // Populate default
    this.populateDropdowns();
    this.calculate();
  },

  populateDropdowns() {
    const cat = this.units[this.currentCategory];
    const fromSelect = document.getElementById('unitFromSelect');
    const toSelect = document.getElementById('unitToSelect');

    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';

    const keys = Object.keys(cat.labels);
    keys.forEach((key, idx) => {
      const opt1 = new Option(cat.labels[key], key);
      const opt2 = new Option(cat.labels[key], key);
      fromSelect.add(opt1);
      toSelect.add(opt2);
    });

    // Set default selections
    fromSelect.selectedIndex = 0;
    toSelect.selectedIndex = keys.length > 1 ? 1 : 0;
  },

  calculate() {
    const val = parseFloat(document.getElementById('unitFromValue').value);
    const fromUnit = document.getElementById('unitFromSelect').value;
    const toUnit = document.getElementById('unitToSelect').value;
    const toInput = document.getElementById('unitToValue');

    if (isNaN(val)) {
      toInput.value = '';
      return;
    }

    let result = 0;
    const cat = this.units[this.currentCategory];

    if (cat.isTemp) {
      result = this.convertTemperature(val, fromUnit, toUnit);
    } else {
      const inBase = val * cat.conversions[fromUnit];
      result = inBase / cat.conversions[toUnit];
    }

    // Format output
    toInput.value = this.formatResult(result);
    this.renderQuickTable(val, fromUnit);
  },

  convertTemperature(val, from, to) {
    if (from === to) return val;
    // Normalize to Celsius
    let c = val;
    if (from === 'fahrenheit') c = (val - 32) * (5 / 9);
    if (from === 'kelvin') c = val - 273.15;

    // Convert from Celsius to Target
    if (to === 'celsius') return c;
    if (to === 'fahrenheit') return (c * (9 / 5)) + 32;
    if (to === 'kelvin') return c + 273.15;
    return val;
  },

  formatResult(num) {
    if (Math.abs(num) < 0.000001 && num !== 0) return num.toExponential(4);
    if (Math.abs(num) >= 1e9) return num.toExponential(4);
    return parseFloat(num.toFixed(6));
  },

  renderQuickTable(val, fromUnit) {
    const table = document.getElementById('quickUnitTable');
    table.innerHTML = '';
    const cat = this.units[this.currentCategory];

    Object.keys(cat.labels).forEach(key => {
      let res;
      if (cat.isTemp) {
        res = this.convertTemperature(val, fromUnit, key);
      } else {
        const inBase = val * cat.conversions[fromUnit];
        res = inBase / cat.conversions[key];
      }

      const pill = document.createElement('div');
      pill.className = 'quick-unit-pill';
      pill.innerHTML = `
        <span>${cat.labels[key].split(' (')[0]}</span>
        <span class="val">${this.formatResult(res)}</span>
      `;
      table.appendChild(pill);
    });
  }
};

window.UnitConverter = UnitConverter;
