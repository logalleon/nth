
/* global floor, random */
/**
 * @schema
 * rate @type {Number} - the per adder growth rate
 * updateFn @type {Function} - the update function
 * rFn @type {Function} - the function to create the initial cost rate adjustment
 * costFn @type {Function} - the function to determine the cost of the next purchase
 * costHtmlFn @type {Function} - the function to return the markup for the next cost
 */
var Adders = {
  delta: {
    name: 'delta',
    rate : 0.001,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return (this.count * 10) + 10;
    },
    audio: {
      build: '/sounds/delta_build.wav',
      // This needs to be changed - same as alpha upgrade
      upgrade: '/sounds/delta_upgrade.wav'
    }
  },
  Sigma: {
    name: 'Sigma',
    rate : 0.005,
    rFn: function () {
      return floor(random(5,10));
    },
    update : function () {
      this.r = floor(random(this.count * 10, this.count * 20));
    },
    costFn: function (c) {
      return ((this.count + 1) * 25) + this.r;
    },
    audio: {
      build: '/sounds/big_sigma_build.wav',
      upgrade: '/sounds/big_sigma_upgrade.wav'
    }
  },
  Delta: {
    name: 'Delta',
    rate : 0.01,
    rFn: function () {
      return floor(random(50,150));
    },
    update : function () {
      this.r = floor(random(50,150)) * this.count;
    },
    costFn: function () {
      return ((this.count + 1) * 100) + this.r;
    },
    audio: {
      build: '/sounds/big_delta_build.wav',
      upgrade: '/sounds/big_delta_upgrade.wav'
    }
  },
  rho: {
    name: 'rho',
    rate : 0.08,
    rFn: function () {
      return floor(random(50,150));
    },
    update : function () {
      this.r = this.count * floor(random(50,150));
    },
    costFn: function () {
      return ((this.count + 1) * 225) + this.r;
    },
    audio: {
      build: '/sounds/rho_build.wav',
      upgrade: '/sounds/rho_upgrade.wav'
    }
  },
  lambda: {
    name: 'lambda',
    rate : 0.14,
    rFn: function () {
      return floor(random(150, 200));
    },
    costFn: function () {
      return (this.count + 1) * this.r;
    },
    audio: {
      build: '/sounds/lambda_build.wav',
      upgrade: '/sounds/lambda_upgrade.wav'
    }
  },
  pi: {
    name: 'pi',
    rate : 0.8,
    rFn: function () {
      return Math.PI * this.count * 10000;
    },
    costFn: function () {
      return (this.count + 1 * 12000) + this.r + floor(random(1,20000));
    },
    audio: {
      build: '/sounds/pi_build.wav',
      upgrade: '/sounds/pi_upgrade.wav'
    }
  },
  alpha: {
    name: 'alpha',
    rate : 1.77,
    rFn: function () {
      return floor(random(2000,3000));
    },
    update : function () {
      this.r = floor(random(2000,3000)) * this.count;
    },
    costFn: function () {
      return (this.count * 40000) + this.r;
    },
    audio: {
      build: '/sounds/alpha_build.wav',
      upgrade: '/sounds/alpha_upgrade.wav'
    }
  },
  sigma: {
    name: 'sigma',
    rate : 3.5,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return this.count * 20000;
    },
    audio: {
      build: '/sounds/sigma_build.wav',
      upgrade: '/sounds/sigma_upgrade.wav'
    }
  },
  Lambda: {
    name: 'Lambda',
    rate: 10,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return this.count * 23000;
    },
    audio: {
      build: '/sounds/big_lambda_build.wav',
      upgrade: '/sounds/big_lambda_upgrade.wav'
    }
  },
  omega: {
    name: 'omega',
    rate: 20,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return 20000 * this.r * this.count;
    },
    audio: {
      build: '/sounds/omega_build.wav',
      upgrade: '/sounds/omega_upgrade.wav'
    }
  },
  epsilon: {
    name: 'epsilon',
    rate: 75,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return 125000 * this.count + floor(random(10000, 25000));
    },
    audio: {
      build: '/sounds/epsilon_build.wav',
      upgrade: '/sounds/epsilon_upgrade.wav'
    }
  },
  Psi: {
    name: 'Psi',
    rate: 250,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return 600000 * this.count;
    },
    audio: {
      build: '/sounds/big_psi_build.wav',
      upgrade: '/sounds/big_psi_upgrade.wav'
    }
  }
};
module.exports = Adders;
