
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
    costHtmlFn : function () {
      return '\t[' + this.cost().toFixed(3)  + ']';
    },
    audio: {
      build: '/sounds/delta_build.wav',
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
    costHtmlFn : function () {
      return '\t[' + this.cost().toFixed(3)  + ']';
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
    costHtmlFn : function () {
      return '\t[' + this.cost().toFixed(3)  + ']';
    },
    audio: {
      build: '/sounds/big_delta_build.wav'
    }
  },
  rho: {
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
    costHtmlFn : function () {
      return '\t[' + this.cost().toFixed(3)  + ']';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  lambda: {
    rate : 0.14,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return (this.count * this.count * 1500);
    },
    costHtmlFn : function () {
      return '\t[' + this.cost().toFixed(3)  + ']';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  pi: {
    rate : 0.8,
    rFn: function () {
      return Math.PI * this.count * 10000;
    },
    costFn: function () {
      return (this.count + 1 * 12000) + this.r + floor(random(1,20000));
    },
    costHtmlFn : function () {
      return '\t[' + this.cost().toFixed(3)  + ']';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  alpha: {
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
    costHtmlFn : function () {
      return '\t[' + this.cost().toFixed(3)  + ']';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  sigma: {
    rate : 3.5,
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return '';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  Lambda: {
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return '';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  omega: {
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return '';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  epsilon: {
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return '';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  },
  Psi: {
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return '';
    },
    audio: {
      build: '/sounds/rho_build.wav'
    }
  }
};
module.exports = Adders;
