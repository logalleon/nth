(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/* global floor */
/**
 * Adders increase the rate at which the Nth count grows
 */
var Adder = function (options) {
  this.rate = options.rate;
  this.update = options.updateFn;
  this.generateR = options.rFn;
  this.cost = options.costFn;
  this.name = options.name;

  // Audio assets
  this.audio = options.audio || false;
};

/**
 * Sets up the adder
 */
Adder.prototype.initialize = function () {
  this.count = 0;
  this.unlocked = false;
  this.r = this.generateR();
  if (this.audio) {
    for (var actionName in this.audio) {
      var filename = this.audio[actionName];
      var audio = document.createElement('audio');
      audio.id = this.name + '-' + actionName;
      audio.src = filename;
      document.body.appendChild(audio);
    }
  }
};

/**
 * Gets the HTML string of the cost
 */
Adder.prototype.getCostHtml = function () {
  return '[' + floor(this.cost()).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ']';
};

/**
 * Plays the build sound
 */
Adder.prototype.playBuildSound = function () {
  var audio = document.getElementById(this.name + '-build');
  audio.currentTime = 0;
  audio.play();
};

/**
 * Plays the upgrade sound
 */
Adder.prototype.playUpgradeSound = function () {
  var audio = document.getElementById(this.name + '-upgrade');
  audio.currentTime = 0;
  audio.play();
};
module.exports = Adder;

},{}],2:[function(require,module,exports){

/* global floor */
var Adders = require('../data/Adders');
var Adder = require('./Adder');

/**
 * The game class
 * @param {Object} $message
 * @param {Object} $count
 * @param {Object} $upgrades
 * @param {Object} $timer
 * @param {Object} $showUpgrades
 * @param {Object} $intro
 */
var Nth = function (options) {
  this.$message = options.$message;
  this.$count = options.$count;
  this.$upgrades = options.$upgrades;
  this.$timer = options.$timer;
  this.$showUpgrades = options.$showUpgrades;
  this.$intro = options.$intro;
  this.$totalRate = options.$totalRate;
};

Nth.prototype.initialize = function () {
  // Load adders
  this.adders = {};
  for (var adder in Adders) {
    this.adders[adder] = new Adder(Adders[adder]);
    this.adders[adder].initialize();
  }

  // @TODO make volume controls
  document.querySelectorAll('audio').forEach(function (audio) {
    audio.volume = 0.1;
  });

  // Unlock little delta by default
  this.adders.delta.unlocked = true;
  // The total count used for purchasing adders
  this.count = 100000;
  // Number to increaes count by for each click
  this.clickValue = 1;
  // Time in seconds
  this.gameTime = 0;
  // Goal to get to
  this.goal = 1000000;
  this.growthRate = 0;
  this.addersHaveChanged = true;
  this.paused = false;
  // These upgrades should be classes and they should modify adders
  // through a method of the adders themselves
  this.upgrades = require('../data/Upgrades');
};

/**
 * Attempts to purchase an adder
 * @param {String} name - name of the adder
 */
Nth.prototype.purchase = function (name) {
  var adder = this.adders[name];
  // You can only attempt to purchase unlocked adders
  if (adder.unlocked) {
    var cost = adder.cost();
    if (this.count >= cost) {
      // Purchase from the total count
      this.count -= cost;
      // Increment the number of owned adders of that type
      adder.count++;
      this.addersHaveChanged = true;
      // Update DOM
      this.$message.innerHTML = 'purchased ' + name + '.';
      // Play audio
      adder.playBuildSound();
      // If there's an update function on the adder, update
      if (adder.update) {
        adder.update();
      }
      // The first time something is purchased, unlock the next
      if (adder.count === 1) {
        var next = window.dg(name).nextSibling.nextSibling;
        if (next) {
          this.adders[next.id].unlocked = true;
          this.$message.innerHTML += ' unlocked ' + next.id + '.';
        }
      }
    } else {
      this.$message.innerHTML = 'cannot afford to purchase ' + name;
    }
  } else {
    this.$message.innerHTML = name + ' has not been unlocked yet.';
  }
};

/**
 * Shows the upgrades table
 *
 */
Nth.prototype.showUpgrades = function () {
  this.$intro.remove();
  this.$showUpgrades.remove();
  this.upgrades.forEach(function (upgrade) {
    var div = document.createElement('div');
    div.classList += 'upgrade ' + upgrade.target;
    div.innerHTML = upgrade.desc + '\t[' + upgrade.cost + ']';
    div.onclick = function (e) {
      this.purchaseUpgrade(upgrade.id);
      if (upgrade.enabled) {
        e.target.classList += ' enabled';
      }
    }.bind(this);
    this.$upgrades.appendChild(div);
  }.bind(this));
};

/**
 * Adds click value when nth button is pressed
 */
Nth.prototype.addCount = function () {
  this.count += this.clickValue;
  this.$message.innerHTML = '. . .';
};

/**
 * Grows the count
 */
Nth.prototype.grow = function () {
  this.count += this.growthRate;
};

Nth.prototype.updateAddersAndGrowthRate = function () {
  // Reset growthRate
  this.growthRate = 0;
  for (var adder in this.adders) {
    var a = this.adders[adder];
    // Only show cost, count, and rate if unlocked
    if (a.unlocked) {
      var $cost = document.querySelectorAll('#' + adder + ' .cost')[0];
      $cost.innerHTML = a.getCostHtml();
      var $count = document.querySelectorAll('#' + adder + ' .count')[0];
      var str = '';
      for (var i = 0; i < a.count; i++) {
        str += '&' + adder + ';';
      }
      $count.innerHTML = str || '-';
      var $total = document.querySelectorAll('#' + adder + ' .total')[0];
      $total.innerHTML = adder + ' total ' + a.count;
      var $rate = document.querySelectorAll('#' + adder + ' .rate')[0];
      if (a.count) {
        $rate.innerHTML = 'rate: ' + (a.count * a.rate).toFixed(3);
      } else {
        $rate.innerHTML = 'rate: {{' + a.rate.toFixed(3) + '}}';
      }
    }
    // If there's at least one adder, update the growthRate
    if (a.count) {
      this.growthRate += a.count * a.rate;
    }
  }
  // Update the total growth rate
  this.$totalRate.innerHTML = 'rate: ' + this.growthRate.toFixed(3);
  this.addersHaveChanged = false;
};

/**
 * Purchases the upgrade or responds that the upgrade can't be purchsed
 * @param {Number} id - the id of the upgrade
 */
Nth.prototype.purchaseUpgrade = function (id) {
  var upgrade;
  // Gets the upgrade with the id provided
  for (var i = 0; i < this.upgrades.length; i++) {
    if (this.upgrades[i].id == id) {
      upgrade = this.upgrades[i];
      break;
    }
  }
  // Can't rebuy purchased upgrades
  if (!upgrade.enabled) {
    // Only buy if affordable
    if (this.count >= upgrade.cost) {
      this.count -= upgrade.cost;
      upgrade.enable(this);
      upgrade.enabled = true;
      // Play the upgrade sound for the target
      if (upgrade.target === 'nth') {
        this.playUpgradeSound(upgrade.id);
      } else {
        this.adders[upgrade.target].playUpgradeSound();
      }
      // Tell P5 things have changed
      this.addersHaveChanged = true;
    } else {
      this.$message.innerHTML = 'cannot afford upgrade for ' + upgrade.target + '.';
    }
  } else {
    this.$message.innerHTML = 'cannot rebuy upgrade.';
  }
};

/**
 * Runs the game timer, updating the game and the DOM simultaneously
 */
Nth.prototype.runTimer = function () {
  this.gameTime++;
  this.$timer.innerHTML = this.gameTime + 's';
  setTimeout(this.runTimer.bind(this), 1000);
};

/**
 * @param {Number} id - the upgrade id
 */
Nth.prototype.playUpgradeSound = function (id) {
  var audio = document.getElementById('nth_upgrade_id_' + id);
  audio.currentTime = 0;
  audio.play();
};

/**
 * Gets the formatted count html
 */
Nth.prototype.getCountHtml = function () {
  return floor(this.count).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

module.exports = Nth;

},{"../data/Adders":3,"../data/Upgrades":4,"./Adder":1}],3:[function(require,module,exports){

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

},{}],4:[function(require,module,exports){

/**
 * @schema
 * @type {Number} id - the upgrade id
 * @type {String} target - the target of the upgrade
 * this can be nth (the game itself) or an adder
 * @type {Number} cost - the cost of the upgrade
 * @type {String} description - the description of the upgrade
 * @type {Function} enable - what happens when the upgrade is enabled
 * in some cases, this changes the rate of the target, in others, it
 * modifies the game itself to provide pickups, etc.
 * in the latter case, the target must be nth and must
 * call a function which enbales nth
 *    @param {Object<Nth>} nth - the game object is ALWAYS
 *    passed to the enable function
 */
var Upgrades = [{
    id : 0,
    target : 'nth',
    cost : 450,
    desc : 'increases nth value to 2',
    /**
     * @description - modifies the click value of the game
     */
    enable : function (nth) {
      nth.clickValue = 2;
    }
  },
  {
    id : 1,
    target : 'delta',
    cost : 6500,
    desc : 'increases delta rate to 0.003',
    enable : function (nth) {
      nth.adders.delta.rate = 0.003;
    }
  },
  {
    id : 2,
    target :'Sigma',
    cost : 25,
    desc : 'increases Sigma rate to 0.14',
    enable : function (nth) {
      nth.adders.Sigma.rate = 0.14;
    }
  },
  {
    id : 3,
    target :'Delta',
    cost : 25,
    desc : 'increases Delta rate to 0.14',
    enable : function (nth) {
      nth.adders.Delta.rate = 0.14;
    }
  },
  {
    id : 4,
    target :'rho',
    cost : 25,
    desc : 'increases rho rate to 0.14',
    enable : function (nth) {
      nth.adders.rho.rate = 0.14;
    }
  },
  {
    id : 5,
    target :'lambda',
    cost : 25,
    desc : 'increases lambda rate to 0.14',
    enable : function (nth) {
      nth.adders.lambda.rate = 0.14;
    }
  },
  {
    id : 6,
    target :'pi',
    cost : 25,
    desc : 'increases pi rate to 0.14',
    enable : function (nth) {
      nth.adders.pi.rate = 0.14;
    }
  },
  {
    id : 7,
    target :'alpha',
    cost : 25,
    desc : 'increases alpha rate to 0.14',
    enable : function (nth) {
      nth.adders.alpha.rate = 0.14;
    }
  },
  {
    id : 8,
    target :'sigma',
    cost : 25,
    desc : 'increases sigma rate to 0.14',
    enable : function (nth) {
      nth.adders.sigma.rate = 0.14;
    }
  },
  {
    id : 9,
    target :'Lambda',
    cost : 25,
    desc : 'increases Lambda rate to 0.14',
    enable : function (nth) {
      nth.adders.Lambda.rate = 0.14;
    }
  },
  {
    id : 10,
    target :'omega',
    cost : 25,
    desc : 'increases omega rate to 0.14',
    enable : function (nth) {
      nth.adders.omega.rate = 0.14;
    }
  },
  {
    id : 11,
    target :'epsilon',
    cost : 25,
    desc : 'increases epsilon rate to 0.14',
    enable : function (nth) {
      nth.adders.epsilon.rate = 0.14;
    }
  },
  {
    id : 12,
    target :'Psi',
    cost : 25,
    desc : 'increases Psi rate to 0.14',
    enable : function (nth) {
      nth.adders.Psi.rate = 0.14;
    }
  }
];
module.exports = Upgrades;

},{}],5:[function(require,module,exports){
/* global frameRate */
var Nth = require('./classes/Nth');

// Globals
var stretch = false,
  game,
  $count,
  $nth,
  $title,
  $message,
  $showUpgrades,
  $upgrades,
  $intro,
  $timer,
  $goal,
  $names,
  $totalRate;
/**
 * Wrapper
 */
window.dg = function (el) {
  return document.getElementById(el);
};

/**
 * Changes the body font
 */
function changeFont () {
  if (stretch) {
    document.body.style['font-family'] = 'Nu';
    stretch = !stretch;
  } else {
    document.body.style['font-family'] = 'NK';
    stretch = !stretch;
  }
  $message.innerHTML = 'font changed';
}

/**
 * P5 setup
 */
window.setup = function () {

  // Elements
  $count = dg('count');
  $nth = dg('nth');
  $title = dg('title');
  $message = dg('message');
  $showUpgrades = dg('showUpgrades');
  $upgrades = dg('upgrades');
  $intro = dg('intro');
  $timer = dg('timer');
  $goal = dg('goal');
  $totalRate = dg('totalRate');
  $names = document.querySelectorAll('.name');

  game = new Nth({
    $count: $count,
    $message: $message,
    $upgrades: $upgrades,
    $showUpgrades: $showUpgrades,
    $timer: $timer,
    $intro: $intro,
    $totalRate: $totalRate
  });
  game.initialize();

  // Handlers
  $title.onclick = changeFont;
  $nth.onclick = game.addCount.bind(game);
  $names.forEach(function (name) {
    name.onclick = function () {
      game.purchase(name.parentElement.id);
    };
  });
  $showUpgrades.onclick = game.showUpgrades.bind(game);
  $goal.innerHTML = 'goal: ' + game.goal;
  game.runTimer();
  // Lock FPS to 30
  frameRate(30);
};

/**
 * P5 draw
 */
window.draw = function () {
  // Update the dom, internal adders, and growthRate
  if (game.addersHaveChanged) {
    game.updateAddersAndGrowthRate();
  }
  // Increased the game count if not paused
  if (game.paused) {
  } else {
    game.grow();
    // Show this increase
    $count.innerHTML = game.getCountHtml();
  }
};

},{"./classes/Nth":2}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcbG9nYW5cXERvY3VtZW50c1xccGVyc29uYWxfcHJvamVjdHNcXG50aFxcbm9kZV9tb2R1bGVzXFxndWxwLWJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2NsYXNzZXMvQWRkZXIuanMiLCJDOi9Vc2Vycy9sb2dhbi9Eb2N1bWVudHMvcGVyc29uYWxfcHJvamVjdHMvbnRoL3NyYy9jbGFzc2VzL050aC5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2RhdGEvQWRkZXJzLmpzIiwiQzovVXNlcnMvbG9nYW4vRG9jdW1lbnRzL3BlcnNvbmFsX3Byb2plY3RzL250aC9zcmMvZGF0YS9VcGdyYWRlcy5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2Zha2VfOThhOTQ1NWIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcclxuLyogZ2xvYmFsIGZsb29yICovXHJcbi8qKlxyXG4gKiBBZGRlcnMgaW5jcmVhc2UgdGhlIHJhdGUgYXQgd2hpY2ggdGhlIE50aCBjb3VudCBncm93c1xyXG4gKi9cclxudmFyIEFkZGVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICB0aGlzLnJhdGUgPSBvcHRpb25zLnJhdGU7XHJcbiAgdGhpcy51cGRhdGUgPSBvcHRpb25zLnVwZGF0ZUZuO1xyXG4gIHRoaXMuZ2VuZXJhdGVSID0gb3B0aW9ucy5yRm47XHJcbiAgdGhpcy5jb3N0ID0gb3B0aW9ucy5jb3N0Rm47XHJcbiAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xyXG5cclxuICAvLyBBdWRpbyBhc3NldHNcclxuICB0aGlzLmF1ZGlvID0gb3B0aW9ucy5hdWRpbyB8fCBmYWxzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXRzIHVwIHRoZSBhZGRlclxyXG4gKi9cclxuQWRkZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5jb3VudCA9IDA7XHJcbiAgdGhpcy51bmxvY2tlZCA9IGZhbHNlO1xyXG4gIHRoaXMuciA9IHRoaXMuZ2VuZXJhdGVSKCk7XHJcbiAgaWYgKHRoaXMuYXVkaW8pIHtcclxuICAgIGZvciAodmFyIGFjdGlvbk5hbWUgaW4gdGhpcy5hdWRpbykge1xyXG4gICAgICB2YXIgZmlsZW5hbWUgPSB0aGlzLmF1ZGlvW2FjdGlvbk5hbWVdO1xyXG4gICAgICB2YXIgYXVkaW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xyXG4gICAgICBhdWRpby5pZCA9IHRoaXMubmFtZSArICctJyArIGFjdGlvbk5hbWU7XHJcbiAgICAgIGF1ZGlvLnNyYyA9IGZpbGVuYW1lO1xyXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGF1ZGlvKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgSFRNTCBzdHJpbmcgb2YgdGhlIGNvc3RcclxuICovXHJcbkFkZGVyLnByb3RvdHlwZS5nZXRDb3N0SHRtbCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gJ1snICsgZmxvb3IodGhpcy5jb3N0KCkpLnRvU3RyaW5nKCkucmVwbGFjZSgvXFxCKD89KFxcZHszfSkrKD8hXFxkKSkvZywgJy4nKSArICddJztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQbGF5cyB0aGUgYnVpbGQgc291bmRcclxuICovXHJcbkFkZGVyLnByb3RvdHlwZS5wbGF5QnVpbGRTb3VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgYXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLm5hbWUgKyAnLWJ1aWxkJyk7XHJcbiAgYXVkaW8uY3VycmVudFRpbWUgPSAwO1xyXG4gIGF1ZGlvLnBsYXkoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQbGF5cyB0aGUgdXBncmFkZSBzb3VuZFxyXG4gKi9cclxuQWRkZXIucHJvdG90eXBlLnBsYXlVcGdyYWRlU291bmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5uYW1lICsgJy11cGdyYWRlJyk7XHJcbiAgYXVkaW8uY3VycmVudFRpbWUgPSAwO1xyXG4gIGF1ZGlvLnBsYXkoKTtcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBBZGRlcjtcclxuIiwiXHJcbi8qIGdsb2JhbCBmbG9vciAqL1xyXG52YXIgQWRkZXJzID0gcmVxdWlyZSgnLi4vZGF0YS9BZGRlcnMnKTtcclxudmFyIEFkZGVyID0gcmVxdWlyZSgnLi9BZGRlcicpO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBnYW1lIGNsYXNzXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkbWVzc2FnZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gJGNvdW50XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkdXBncmFkZXNcclxuICogQHBhcmFtIHtPYmplY3R9ICR0aW1lclxyXG4gKiBAcGFyYW0ge09iamVjdH0gJHNob3dVcGdyYWRlc1xyXG4gKiBAcGFyYW0ge09iamVjdH0gJGludHJvXHJcbiAqL1xyXG52YXIgTnRoID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICB0aGlzLiRtZXNzYWdlID0gb3B0aW9ucy4kbWVzc2FnZTtcclxuICB0aGlzLiRjb3VudCA9IG9wdGlvbnMuJGNvdW50O1xyXG4gIHRoaXMuJHVwZ3JhZGVzID0gb3B0aW9ucy4kdXBncmFkZXM7XHJcbiAgdGhpcy4kdGltZXIgPSBvcHRpb25zLiR0aW1lcjtcclxuICB0aGlzLiRzaG93VXBncmFkZXMgPSBvcHRpb25zLiRzaG93VXBncmFkZXM7XHJcbiAgdGhpcy4kaW50cm8gPSBvcHRpb25zLiRpbnRybztcclxuICB0aGlzLiR0b3RhbFJhdGUgPSBvcHRpb25zLiR0b3RhbFJhdGU7XHJcbn07XHJcblxyXG5OdGgucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gTG9hZCBhZGRlcnNcclxuICB0aGlzLmFkZGVycyA9IHt9O1xyXG4gIGZvciAodmFyIGFkZGVyIGluIEFkZGVycykge1xyXG4gICAgdGhpcy5hZGRlcnNbYWRkZXJdID0gbmV3IEFkZGVyKEFkZGVyc1thZGRlcl0pO1xyXG4gICAgdGhpcy5hZGRlcnNbYWRkZXJdLmluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIC8vIEBUT0RPIG1ha2Ugdm9sdW1lIGNvbnRyb2xzXHJcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnYXVkaW8nKS5mb3JFYWNoKGZ1bmN0aW9uIChhdWRpbykge1xyXG4gICAgYXVkaW8udm9sdW1lID0gMC4xO1xyXG4gIH0pO1xyXG5cclxuICAvLyBVbmxvY2sgbGl0dGxlIGRlbHRhIGJ5IGRlZmF1bHRcclxuICB0aGlzLmFkZGVycy5kZWx0YS51bmxvY2tlZCA9IHRydWU7XHJcbiAgLy8gVGhlIHRvdGFsIGNvdW50IHVzZWQgZm9yIHB1cmNoYXNpbmcgYWRkZXJzXHJcbiAgdGhpcy5jb3VudCA9IDEwMDAwMDtcclxuICAvLyBOdW1iZXIgdG8gaW5jcmVhZXMgY291bnQgYnkgZm9yIGVhY2ggY2xpY2tcclxuICB0aGlzLmNsaWNrVmFsdWUgPSAxO1xyXG4gIC8vIFRpbWUgaW4gc2Vjb25kc1xyXG4gIHRoaXMuZ2FtZVRpbWUgPSAwO1xyXG4gIC8vIEdvYWwgdG8gZ2V0IHRvXHJcbiAgdGhpcy5nb2FsID0gMTAwMDAwMDtcclxuICB0aGlzLmdyb3d0aFJhdGUgPSAwO1xyXG4gIHRoaXMuYWRkZXJzSGF2ZUNoYW5nZWQgPSB0cnVlO1xyXG4gIHRoaXMucGF1c2VkID0gZmFsc2U7XHJcbiAgLy8gVGhlc2UgdXBncmFkZXMgc2hvdWxkIGJlIGNsYXNzZXMgYW5kIHRoZXkgc2hvdWxkIG1vZGlmeSBhZGRlcnNcclxuICAvLyB0aHJvdWdoIGEgbWV0aG9kIG9mIHRoZSBhZGRlcnMgdGhlbXNlbHZlc1xyXG4gIHRoaXMudXBncmFkZXMgPSByZXF1aXJlKCcuLi9kYXRhL1VwZ3JhZGVzJyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQXR0ZW1wdHMgdG8gcHVyY2hhc2UgYW4gYWRkZXJcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhZGRlclxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5wdXJjaGFzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgdmFyIGFkZGVyID0gdGhpcy5hZGRlcnNbbmFtZV07XHJcbiAgLy8gWW91IGNhbiBvbmx5IGF0dGVtcHQgdG8gcHVyY2hhc2UgdW5sb2NrZWQgYWRkZXJzXHJcbiAgaWYgKGFkZGVyLnVubG9ja2VkKSB7XHJcbiAgICB2YXIgY29zdCA9IGFkZGVyLmNvc3QoKTtcclxuICAgIGlmICh0aGlzLmNvdW50ID49IGNvc3QpIHtcclxuICAgICAgLy8gUHVyY2hhc2UgZnJvbSB0aGUgdG90YWwgY291bnRcclxuICAgICAgdGhpcy5jb3VudCAtPSBjb3N0O1xyXG4gICAgICAvLyBJbmNyZW1lbnQgdGhlIG51bWJlciBvZiBvd25lZCBhZGRlcnMgb2YgdGhhdCB0eXBlXHJcbiAgICAgIGFkZGVyLmNvdW50Kys7XHJcbiAgICAgIHRoaXMuYWRkZXJzSGF2ZUNoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAvLyBVcGRhdGUgRE9NXHJcbiAgICAgIHRoaXMuJG1lc3NhZ2UuaW5uZXJIVE1MID0gJ3B1cmNoYXNlZCAnICsgbmFtZSArICcuJztcclxuICAgICAgLy8gUGxheSBhdWRpb1xyXG4gICAgICBhZGRlci5wbGF5QnVpbGRTb3VuZCgpO1xyXG4gICAgICAvLyBJZiB0aGVyZSdzIGFuIHVwZGF0ZSBmdW5jdGlvbiBvbiB0aGUgYWRkZXIsIHVwZGF0ZVxyXG4gICAgICBpZiAoYWRkZXIudXBkYXRlKSB7XHJcbiAgICAgICAgYWRkZXIudXBkYXRlKCk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gVGhlIGZpcnN0IHRpbWUgc29tZXRoaW5nIGlzIHB1cmNoYXNlZCwgdW5sb2NrIHRoZSBuZXh0XHJcbiAgICAgIGlmIChhZGRlci5jb3VudCA9PT0gMSkge1xyXG4gICAgICAgIHZhciBuZXh0ID0gd2luZG93LmRnKG5hbWUpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xyXG4gICAgICAgIGlmIChuZXh0KSB7XHJcbiAgICAgICAgICB0aGlzLmFkZGVyc1tuZXh0LmlkXS51bmxvY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCArPSAnIHVubG9ja2VkICcgKyBuZXh0LmlkICsgJy4nO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAnY2Fubm90IGFmZm9yZCB0byBwdXJjaGFzZSAnICsgbmFtZTtcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSBuYW1lICsgJyBoYXMgbm90IGJlZW4gdW5sb2NrZWQgeWV0Lic7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNob3dzIHRoZSB1cGdyYWRlcyB0YWJsZVxyXG4gKlxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5zaG93VXBncmFkZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy4kaW50cm8ucmVtb3ZlKCk7XHJcbiAgdGhpcy4kc2hvd1VwZ3JhZGVzLnJlbW92ZSgpO1xyXG4gIHRoaXMudXBncmFkZXMuZm9yRWFjaChmdW5jdGlvbiAodXBncmFkZSkge1xyXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgZGl2LmNsYXNzTGlzdCArPSAndXBncmFkZSAnICsgdXBncmFkZS50YXJnZXQ7XHJcbiAgICBkaXYuaW5uZXJIVE1MID0gdXBncmFkZS5kZXNjICsgJ1xcdFsnICsgdXBncmFkZS5jb3N0ICsgJ10nO1xyXG4gICAgZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICB0aGlzLnB1cmNoYXNlVXBncmFkZSh1cGdyYWRlLmlkKTtcclxuICAgICAgaWYgKHVwZ3JhZGUuZW5hYmxlZCkge1xyXG4gICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdCArPSAnIGVuYWJsZWQnO1xyXG4gICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB0aGlzLiR1cGdyYWRlcy5hcHBlbmRDaGlsZChkaXYpO1xyXG4gIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBjbGljayB2YWx1ZSB3aGVuIG50aCBidXR0b24gaXMgcHJlc3NlZFxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5hZGRDb3VudCA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmNvdW50ICs9IHRoaXMuY2xpY2tWYWx1ZTtcclxuICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICcuIC4gLic7XHJcbn07XHJcblxyXG4vKipcclxuICogR3Jvd3MgdGhlIGNvdW50XHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLmdyb3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5jb3VudCArPSB0aGlzLmdyb3d0aFJhdGU7XHJcbn07XHJcblxyXG5OdGgucHJvdG90eXBlLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmVzZXQgZ3Jvd3RoUmF0ZVxyXG4gIHRoaXMuZ3Jvd3RoUmF0ZSA9IDA7XHJcbiAgZm9yICh2YXIgYWRkZXIgaW4gdGhpcy5hZGRlcnMpIHtcclxuICAgIHZhciBhID0gdGhpcy5hZGRlcnNbYWRkZXJdO1xyXG4gICAgLy8gT25seSBzaG93IGNvc3QsIGNvdW50LCBhbmQgcmF0ZSBpZiB1bmxvY2tlZFxyXG4gICAgaWYgKGEudW5sb2NrZWQpIHtcclxuICAgICAgdmFyICRjb3N0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLmNvc3QnKVswXTtcclxuICAgICAgJGNvc3QuaW5uZXJIVE1MID0gYS5nZXRDb3N0SHRtbCgpO1xyXG4gICAgICB2YXIgJGNvdW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLmNvdW50JylbMF07XHJcbiAgICAgIHZhciBzdHIgPSAnJztcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmNvdW50OyBpKyspIHtcclxuICAgICAgICBzdHIgKz0gJyYnICsgYWRkZXIgKyAnOyc7XHJcbiAgICAgIH1cclxuICAgICAgJGNvdW50LmlubmVySFRNTCA9IHN0ciB8fCAnLSc7XHJcbiAgICAgIHZhciAkdG90YWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcjJyArIGFkZGVyICsgJyAudG90YWwnKVswXTtcclxuICAgICAgJHRvdGFsLmlubmVySFRNTCA9IGFkZGVyICsgJyB0b3RhbCAnICsgYS5jb3VudDtcclxuICAgICAgdmFyICRyYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLnJhdGUnKVswXTtcclxuICAgICAgaWYgKGEuY291bnQpIHtcclxuICAgICAgICAkcmF0ZS5pbm5lckhUTUwgPSAncmF0ZTogJyArIChhLmNvdW50ICogYS5yYXRlKS50b0ZpeGVkKDMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgICRyYXRlLmlubmVySFRNTCA9ICdyYXRlOiB7eycgKyBhLnJhdGUudG9GaXhlZCgzKSArICd9fSc7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIElmIHRoZXJlJ3MgYXQgbGVhc3Qgb25lIGFkZGVyLCB1cGRhdGUgdGhlIGdyb3d0aFJhdGVcclxuICAgIGlmIChhLmNvdW50KSB7XHJcbiAgICAgIHRoaXMuZ3Jvd3RoUmF0ZSArPSBhLmNvdW50ICogYS5yYXRlO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBVcGRhdGUgdGhlIHRvdGFsIGdyb3d0aCByYXRlXHJcbiAgdGhpcy4kdG90YWxSYXRlLmlubmVySFRNTCA9ICdyYXRlOiAnICsgdGhpcy5ncm93dGhSYXRlLnRvRml4ZWQoMyk7XHJcbiAgdGhpcy5hZGRlcnNIYXZlQ2hhbmdlZCA9IGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFB1cmNoYXNlcyB0aGUgdXBncmFkZSBvciByZXNwb25kcyB0aGF0IHRoZSB1cGdyYWRlIGNhbid0IGJlIHB1cmNoc2VkXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCAtIHRoZSBpZCBvZiB0aGUgdXBncmFkZVxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5wdXJjaGFzZVVwZ3JhZGUgPSBmdW5jdGlvbiAoaWQpIHtcclxuICB2YXIgdXBncmFkZTtcclxuICAvLyBHZXRzIHRoZSB1cGdyYWRlIHdpdGggdGhlIGlkIHByb3ZpZGVkXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnVwZ3JhZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodGhpcy51cGdyYWRlc1tpXS5pZCA9PSBpZCkge1xyXG4gICAgICB1cGdyYWRlID0gdGhpcy51cGdyYWRlc1tpXTtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIENhbid0IHJlYnV5IHB1cmNoYXNlZCB1cGdyYWRlc1xyXG4gIGlmICghdXBncmFkZS5lbmFibGVkKSB7XHJcbiAgICAvLyBPbmx5IGJ1eSBpZiBhZmZvcmRhYmxlXHJcbiAgICBpZiAodGhpcy5jb3VudCA+PSB1cGdyYWRlLmNvc3QpIHtcclxuICAgICAgdGhpcy5jb3VudCAtPSB1cGdyYWRlLmNvc3Q7XHJcbiAgICAgIHVwZ3JhZGUuZW5hYmxlKHRoaXMpO1xyXG4gICAgICB1cGdyYWRlLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAvLyBQbGF5IHRoZSB1cGdyYWRlIHNvdW5kIGZvciB0aGUgdGFyZ2V0XHJcbiAgICAgIGlmICh1cGdyYWRlLnRhcmdldCA9PT0gJ250aCcpIHtcclxuICAgICAgICB0aGlzLnBsYXlVcGdyYWRlU291bmQodXBncmFkZS5pZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5hZGRlcnNbdXBncmFkZS50YXJnZXRdLnBsYXlVcGdyYWRlU291bmQoKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBUZWxsIFA1IHRoaW5ncyBoYXZlIGNoYW5nZWRcclxuICAgICAgdGhpcy5hZGRlcnNIYXZlQ2hhbmdlZCA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICdjYW5ub3QgYWZmb3JkIHVwZ3JhZGUgZm9yICcgKyB1cGdyYWRlLnRhcmdldCArICcuJztcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAnY2Fubm90IHJlYnV5IHVwZ3JhZGUuJztcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogUnVucyB0aGUgZ2FtZSB0aW1lciwgdXBkYXRpbmcgdGhlIGdhbWUgYW5kIHRoZSBET00gc2ltdWx0YW5lb3VzbHlcclxuICovXHJcbk50aC5wcm90b3R5cGUucnVuVGltZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5nYW1lVGltZSsrO1xyXG4gIHRoaXMuJHRpbWVyLmlubmVySFRNTCA9IHRoaXMuZ2FtZVRpbWUgKyAncyc7XHJcbiAgc2V0VGltZW91dCh0aGlzLnJ1blRpbWVyLmJpbmQodGhpcyksIDEwMDApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCAtIHRoZSB1cGdyYWRlIGlkXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLnBsYXlVcGdyYWRlU291bmQgPSBmdW5jdGlvbiAoaWQpIHtcclxuICB2YXIgYXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbnRoX3VwZ3JhZGVfaWRfJyArIGlkKTtcclxuICBhdWRpby5jdXJyZW50VGltZSA9IDA7XHJcbiAgYXVkaW8ucGxheSgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIGZvcm1hdHRlZCBjb3VudCBodG1sXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLmdldENvdW50SHRtbCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gZmxvb3IodGhpcy5jb3VudCkudG9TdHJpbmcoKS5yZXBsYWNlKC9cXEIoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCAnLicpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOdGg7XHJcbiIsIlxyXG4vKiBnbG9iYWwgZmxvb3IsIHJhbmRvbSAqL1xyXG4vKipcclxuICogQHNjaGVtYVxyXG4gKiByYXRlIEB0eXBlIHtOdW1iZXJ9IC0gdGhlIHBlciBhZGRlciBncm93dGggcmF0ZVxyXG4gKiB1cGRhdGVGbiBAdHlwZSB7RnVuY3Rpb259IC0gdGhlIHVwZGF0ZSBmdW5jdGlvblxyXG4gKiByRm4gQHR5cGUge0Z1bmN0aW9ufSAtIHRoZSBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGluaXRpYWwgY29zdCByYXRlIGFkanVzdG1lbnRcclxuICogY29zdEZuIEB0eXBlIHtGdW5jdGlvbn0gLSB0aGUgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIHRoZSBjb3N0IG9mIHRoZSBuZXh0IHB1cmNoYXNlXHJcbiAqIGNvc3RIdG1sRm4gQHR5cGUge0Z1bmN0aW9ufSAtIHRoZSBmdW5jdGlvbiB0byByZXR1cm4gdGhlIG1hcmt1cCBmb3IgdGhlIG5leHQgY29zdFxyXG4gKi9cclxudmFyIEFkZGVycyA9IHtcclxuICBkZWx0YToge1xyXG4gICAgbmFtZTogJ2RlbHRhJyxcclxuICAgIHJhdGUgOiAwLjAwMSxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICh0aGlzLmNvdW50ICogMTApICsgMTA7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2RlbHRhX2J1aWxkLndhdicsXHJcbiAgICAgIC8vIFRoaXMgbmVlZHMgdG8gYmUgY2hhbmdlZCAtIHNhbWUgYXMgYWxwaGEgdXBncmFkZVxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9kZWx0YV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIFNpZ21hOiB7XHJcbiAgICBuYW1lOiAnU2lnbWEnLFxyXG4gICAgcmF0ZSA6IDAuMDA1LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBmbG9vcihyYW5kb20oNSwxMCkpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5yID0gZmxvb3IocmFuZG9tKHRoaXMuY291bnQgKiAxMCwgdGhpcy5jb3VudCAqIDIwKSk7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoYykge1xyXG4gICAgICByZXR1cm4gKCh0aGlzLmNvdW50ICsgMSkgKiAyNSkgKyB0aGlzLnI7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2JpZ19zaWdtYV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9iaWdfc2lnbWFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBEZWx0YToge1xyXG4gICAgbmFtZTogJ0RlbHRhJyxcclxuICAgIHJhdGUgOiAwLjAxLFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBmbG9vcihyYW5kb20oNTAsMTUwKSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnIgPSBmbG9vcihyYW5kb20oNTAsMTUwKSkgKiB0aGlzLmNvdW50O1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKCh0aGlzLmNvdW50ICsgMSkgKiAxMDApICsgdGhpcy5yO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9iaWdfZGVsdGFfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvYmlnX2RlbHRhX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgcmhvOiB7XHJcbiAgICBuYW1lOiAncmhvJyxcclxuICAgIHJhdGUgOiAwLjA4LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBmbG9vcihyYW5kb20oNTAsMTUwKSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnIgPSB0aGlzLmNvdW50ICogZmxvb3IocmFuZG9tKDUwLDE1MCkpO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKCh0aGlzLmNvdW50ICsgMSkgKiAyMjUpICsgdGhpcy5yO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9yaG9fYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvcmhvX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgbGFtYmRhOiB7XHJcbiAgICBuYW1lOiAnbGFtYmRhJyxcclxuICAgIHJhdGUgOiAwLjE0LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBmbG9vcihyYW5kb20oMTUwLCAyMDApKTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICh0aGlzLmNvdW50ICsgMSkgKiB0aGlzLnI7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2xhbWJkYV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9sYW1iZGFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBwaToge1xyXG4gICAgbmFtZTogJ3BpJyxcclxuICAgIHJhdGUgOiAwLjgsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIE1hdGguUEkgKiB0aGlzLmNvdW50ICogMTAwMDA7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAodGhpcy5jb3VudCArIDEgKiAxMjAwMCkgKyB0aGlzLnIgKyBmbG9vcihyYW5kb20oMSwyMDAwMCkpO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9waV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9waV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIGFscGhhOiB7XHJcbiAgICBuYW1lOiAnYWxwaGEnLFxyXG4gICAgcmF0ZSA6IDEuNzcsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSgyMDAwLDMwMDApKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGUgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuciA9IGZsb29yKHJhbmRvbSgyMDAwLDMwMDApKSAqIHRoaXMuY291bnQ7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAodGhpcy5jb3VudCAqIDQwMDAwKSArIHRoaXMucjtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvYWxwaGFfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvYWxwaGFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBzaWdtYToge1xyXG4gICAgbmFtZTogJ3NpZ21hJyxcclxuICAgIHJhdGUgOiAzLjUsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNvdW50ICogMjAwMDA7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL3NpZ21hX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL3NpZ21hX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgTGFtYmRhOiB7XHJcbiAgICBuYW1lOiAnTGFtYmRhJyxcclxuICAgIHJhdGU6IDEwLFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5jb3VudCAqIDIzMDAwO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9iaWdfbGFtYmRhX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2JpZ19sYW1iZGFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBvbWVnYToge1xyXG4gICAgbmFtZTogJ29tZWdhJyxcclxuICAgIHJhdGU6IDIwLFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMjAwMDAgKiB0aGlzLnIgKiB0aGlzLmNvdW50O1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9vbWVnYV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9vbWVnYV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIGVwc2lsb246IHtcclxuICAgIG5hbWU6ICdlcHNpbG9uJyxcclxuICAgIHJhdGU6IDc1LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTI1MDAwICogdGhpcy5jb3VudCArIGZsb29yKHJhbmRvbSgxMDAwMCwgMjUwMDApKTtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvZXBzaWxvbl9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9lcHNpbG9uX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgUHNpOiB7XHJcbiAgICBuYW1lOiAnUHNpJyxcclxuICAgIHJhdGU6IDI1MCxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDYwMDAwMCAqIHRoaXMuY291bnQ7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2JpZ19wc2lfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvYmlnX3BzaV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gQWRkZXJzO1xyXG4iLCJcclxuLyoqXHJcbiAqIEBzY2hlbWFcclxuICogQHR5cGUge051bWJlcn0gaWQgLSB0aGUgdXBncmFkZSBpZFxyXG4gKiBAdHlwZSB7U3RyaW5nfSB0YXJnZXQgLSB0aGUgdGFyZ2V0IG9mIHRoZSB1cGdyYWRlXHJcbiAqIHRoaXMgY2FuIGJlIG50aCAodGhlIGdhbWUgaXRzZWxmKSBvciBhbiBhZGRlclxyXG4gKiBAdHlwZSB7TnVtYmVyfSBjb3N0IC0gdGhlIGNvc3Qgb2YgdGhlIHVwZ3JhZGVcclxuICogQHR5cGUge1N0cmluZ30gZGVzY3JpcHRpb24gLSB0aGUgZGVzY3JpcHRpb24gb2YgdGhlIHVwZ3JhZGVcclxuICogQHR5cGUge0Z1bmN0aW9ufSBlbmFibGUgLSB3aGF0IGhhcHBlbnMgd2hlbiB0aGUgdXBncmFkZSBpcyBlbmFibGVkXHJcbiAqIGluIHNvbWUgY2FzZXMsIHRoaXMgY2hhbmdlcyB0aGUgcmF0ZSBvZiB0aGUgdGFyZ2V0LCBpbiBvdGhlcnMsIGl0XHJcbiAqIG1vZGlmaWVzIHRoZSBnYW1lIGl0c2VsZiB0byBwcm92aWRlIHBpY2t1cHMsIGV0Yy5cclxuICogaW4gdGhlIGxhdHRlciBjYXNlLCB0aGUgdGFyZ2V0IG11c3QgYmUgbnRoIGFuZCBtdXN0XHJcbiAqIGNhbGwgYSBmdW5jdGlvbiB3aGljaCBlbmJhbGVzIG50aFxyXG4gKiAgICBAcGFyYW0ge09iamVjdDxOdGg+fSBudGggLSB0aGUgZ2FtZSBvYmplY3QgaXMgQUxXQVlTXHJcbiAqICAgIHBhc3NlZCB0byB0aGUgZW5hYmxlIGZ1bmN0aW9uXHJcbiAqL1xyXG52YXIgVXBncmFkZXMgPSBbe1xyXG4gICAgaWQgOiAwLFxyXG4gICAgdGFyZ2V0IDogJ250aCcsXHJcbiAgICBjb3N0IDogNDUwLFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgbnRoIHZhbHVlIHRvIDInLFxyXG4gICAgLyoqXHJcbiAgICAgKiBAZGVzY3JpcHRpb24gLSBtb2RpZmllcyB0aGUgY2xpY2sgdmFsdWUgb2YgdGhlIGdhbWVcclxuICAgICAqL1xyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguY2xpY2tWYWx1ZSA9IDI7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDEsXHJcbiAgICB0YXJnZXQgOiAnZGVsdGEnLFxyXG4gICAgY29zdCA6IDY1MDAsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBkZWx0YSByYXRlIHRvIDAuMDAzJyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5kZWx0YS5yYXRlID0gMC4wMDM7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDIsXHJcbiAgICB0YXJnZXQgOidTaWdtYScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBTaWdtYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLlNpZ21hLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiAzLFxyXG4gICAgdGFyZ2V0IDonRGVsdGEnLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgRGVsdGEgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5EZWx0YS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogNCxcclxuICAgIHRhcmdldCA6J3JobycsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyByaG8gcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5yaG8ucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDUsXHJcbiAgICB0YXJnZXQgOidsYW1iZGEnLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgbGFtYmRhIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMubGFtYmRhLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiA2LFxyXG4gICAgdGFyZ2V0IDoncGknLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgcGkgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5waS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogNyxcclxuICAgIHRhcmdldCA6J2FscGhhJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIGFscGhhIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMuYWxwaGEucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDgsXHJcbiAgICB0YXJnZXQgOidzaWdtYScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBzaWdtYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLnNpZ21hLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiA5LFxyXG4gICAgdGFyZ2V0IDonTGFtYmRhJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIExhbWJkYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLkxhbWJkYS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogMTAsXHJcbiAgICB0YXJnZXQgOidvbWVnYScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBvbWVnYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLm9tZWdhLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiAxMSxcclxuICAgIHRhcmdldCA6J2Vwc2lsb24nLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgZXBzaWxvbiByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLmVwc2lsb24ucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDEyLFxyXG4gICAgdGFyZ2V0IDonUHNpJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIFBzaSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLlBzaS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9XHJcbl07XHJcbm1vZHVsZS5leHBvcnRzID0gVXBncmFkZXM7XHJcbiIsIi8qIGdsb2JhbCBmcmFtZVJhdGUgKi9cclxudmFyIE50aCA9IHJlcXVpcmUoJy4vY2xhc3Nlcy9OdGgnKTtcclxuXHJcbi8vIEdsb2JhbHNcclxudmFyIHN0cmV0Y2ggPSBmYWxzZSxcclxuICBnYW1lLFxyXG4gICRjb3VudCxcclxuICAkbnRoLFxyXG4gICR0aXRsZSxcclxuICAkbWVzc2FnZSxcclxuICAkc2hvd1VwZ3JhZGVzLFxyXG4gICR1cGdyYWRlcyxcclxuICAkaW50cm8sXHJcbiAgJHRpbWVyLFxyXG4gICRnb2FsLFxyXG4gICRuYW1lcyxcclxuICAkdG90YWxSYXRlO1xyXG4vKipcclxuICogV3JhcHBlclxyXG4gKi9cclxud2luZG93LmRnID0gZnVuY3Rpb24gKGVsKSB7XHJcbiAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGFuZ2VzIHRoZSBib2R5IGZvbnRcclxuICovXHJcbmZ1bmN0aW9uIGNoYW5nZUZvbnQgKCkge1xyXG4gIGlmIChzdHJldGNoKSB7XHJcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlWydmb250LWZhbWlseSddID0gJ051JztcclxuICAgIHN0cmV0Y2ggPSAhc3RyZXRjaDtcclxuICB9IGVsc2Uge1xyXG4gICAgZG9jdW1lbnQuYm9keS5zdHlsZVsnZm9udC1mYW1pbHknXSA9ICdOSyc7XHJcbiAgICBzdHJldGNoID0gIXN0cmV0Y2g7XHJcbiAgfVxyXG4gICRtZXNzYWdlLmlubmVySFRNTCA9ICdmb250IGNoYW5nZWQnO1xyXG59XHJcblxyXG4vKipcclxuICogUDUgc2V0dXBcclxuICovXHJcbndpbmRvdy5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgLy8gRWxlbWVudHNcclxuICAkY291bnQgPSBkZygnY291bnQnKTtcclxuICAkbnRoID0gZGcoJ250aCcpO1xyXG4gICR0aXRsZSA9IGRnKCd0aXRsZScpO1xyXG4gICRtZXNzYWdlID0gZGcoJ21lc3NhZ2UnKTtcclxuICAkc2hvd1VwZ3JhZGVzID0gZGcoJ3Nob3dVcGdyYWRlcycpO1xyXG4gICR1cGdyYWRlcyA9IGRnKCd1cGdyYWRlcycpO1xyXG4gICRpbnRybyA9IGRnKCdpbnRybycpO1xyXG4gICR0aW1lciA9IGRnKCd0aW1lcicpO1xyXG4gICRnb2FsID0gZGcoJ2dvYWwnKTtcclxuICAkdG90YWxSYXRlID0gZGcoJ3RvdGFsUmF0ZScpO1xyXG4gICRuYW1lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYW1lJyk7XHJcblxyXG4gIGdhbWUgPSBuZXcgTnRoKHtcclxuICAgICRjb3VudDogJGNvdW50LFxyXG4gICAgJG1lc3NhZ2U6ICRtZXNzYWdlLFxyXG4gICAgJHVwZ3JhZGVzOiAkdXBncmFkZXMsXHJcbiAgICAkc2hvd1VwZ3JhZGVzOiAkc2hvd1VwZ3JhZGVzLFxyXG4gICAgJHRpbWVyOiAkdGltZXIsXHJcbiAgICAkaW50cm86ICRpbnRybyxcclxuICAgICR0b3RhbFJhdGU6ICR0b3RhbFJhdGVcclxuICB9KTtcclxuICBnYW1lLmluaXRpYWxpemUoKTtcclxuXHJcbiAgLy8gSGFuZGxlcnNcclxuICAkdGl0bGUub25jbGljayA9IGNoYW5nZUZvbnQ7XHJcbiAgJG50aC5vbmNsaWNrID0gZ2FtZS5hZGRDb3VudC5iaW5kKGdhbWUpO1xyXG4gICRuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICBuYW1lLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGdhbWUucHVyY2hhc2UobmFtZS5wYXJlbnRFbGVtZW50LmlkKTtcclxuICAgIH07XHJcbiAgfSk7XHJcbiAgJHNob3dVcGdyYWRlcy5vbmNsaWNrID0gZ2FtZS5zaG93VXBncmFkZXMuYmluZChnYW1lKTtcclxuICAkZ29hbC5pbm5lckhUTUwgPSAnZ29hbDogJyArIGdhbWUuZ29hbDtcclxuICBnYW1lLnJ1blRpbWVyKCk7XHJcbiAgLy8gTG9jayBGUFMgdG8gMzBcclxuICBmcmFtZVJhdGUoMzApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFA1IGRyYXdcclxuICovXHJcbndpbmRvdy5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIFVwZGF0ZSB0aGUgZG9tLCBpbnRlcm5hbCBhZGRlcnMsIGFuZCBncm93dGhSYXRlXHJcbiAgaWYgKGdhbWUuYWRkZXJzSGF2ZUNoYW5nZWQpIHtcclxuICAgIGdhbWUudXBkYXRlQWRkZXJzQW5kR3Jvd3RoUmF0ZSgpO1xyXG4gIH1cclxuICAvLyBJbmNyZWFzZWQgdGhlIGdhbWUgY291bnQgaWYgbm90IHBhdXNlZFxyXG4gIGlmIChnYW1lLnBhdXNlZCkge1xyXG4gIH0gZWxzZSB7XHJcbiAgICBnYW1lLmdyb3coKTtcclxuICAgIC8vIFNob3cgdGhpcyBpbmNyZWFzZVxyXG4gICAgJGNvdW50LmlubmVySFRNTCA9IGdhbWUuZ2V0Q291bnRIdG1sKCk7XHJcbiAgfVxyXG59O1xyXG4iXX0=

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgZnJhbWVSYXRlICovXHJcbnZhciBOdGggPSByZXF1aXJlKCcuL2NsYXNzZXMvTnRoJyk7XHJcblxyXG4vLyBHbG9iYWxzXHJcbnZhciBzdHJldGNoID0gZmFsc2UsXHJcbiAgZ2FtZSxcclxuICAkY291bnQsXHJcbiAgJG50aCxcclxuICAkdGl0bGUsXHJcbiAgJG1lc3NhZ2UsXHJcbiAgJHNob3dVcGdyYWRlcyxcclxuICAkdXBncmFkZXMsXHJcbiAgJGludHJvLFxyXG4gICR0aW1lcixcclxuICAkZ29hbCxcclxuICAkbmFtZXMsXHJcbiAgJHRvdGFsUmF0ZTtcclxuLyoqXHJcbiAqIFdyYXBwZXJcclxuICovXHJcbndpbmRvdy5kZyA9IGZ1bmN0aW9uIChlbCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hhbmdlcyB0aGUgYm9keSBmb250XHJcbiAqL1xyXG5mdW5jdGlvbiBjaGFuZ2VGb250ICgpIHtcclxuICBpZiAoc3RyZXRjaCkge1xyXG4gICAgZG9jdW1lbnQuYm9keS5zdHlsZVsnZm9udC1mYW1pbHknXSA9ICdOdSc7XHJcbiAgICBzdHJldGNoID0gIXN0cmV0Y2g7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGVbJ2ZvbnQtZmFtaWx5J10gPSAnTksnO1xyXG4gICAgc3RyZXRjaCA9ICFzdHJldGNoO1xyXG4gIH1cclxuICAkbWVzc2FnZS5pbm5lckhUTUwgPSAnZm9udCBjaGFuZ2VkJztcclxufVxyXG5cclxuLyoqXHJcbiAqIFA1IHNldHVwXHJcbiAqL1xyXG53aW5kb3cuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIC8vIEVsZW1lbnRzXHJcbiAgJGNvdW50ID0gZGcoJ2NvdW50Jyk7XHJcbiAgJG50aCA9IGRnKCdudGgnKTtcclxuICAkdGl0bGUgPSBkZygndGl0bGUnKTtcclxuICAkbWVzc2FnZSA9IGRnKCdtZXNzYWdlJyk7XHJcbiAgJHNob3dVcGdyYWRlcyA9IGRnKCdzaG93VXBncmFkZXMnKTtcclxuICAkdXBncmFkZXMgPSBkZygndXBncmFkZXMnKTtcclxuICAkaW50cm8gPSBkZygnaW50cm8nKTtcclxuICAkdGltZXIgPSBkZygndGltZXInKTtcclxuICAkZ29hbCA9IGRnKCdnb2FsJyk7XHJcbiAgJHRvdGFsUmF0ZSA9IGRnKCd0b3RhbFJhdGUnKTtcclxuICAkbmFtZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubmFtZScpO1xyXG5cclxuICBnYW1lID0gbmV3IE50aCh7XHJcbiAgICAkY291bnQ6ICRjb3VudCxcclxuICAgICRtZXNzYWdlOiAkbWVzc2FnZSxcclxuICAgICR1cGdyYWRlczogJHVwZ3JhZGVzLFxyXG4gICAgJHNob3dVcGdyYWRlczogJHNob3dVcGdyYWRlcyxcclxuICAgICR0aW1lcjogJHRpbWVyLFxyXG4gICAgJGludHJvOiAkaW50cm8sXHJcbiAgICAkdG90YWxSYXRlOiAkdG90YWxSYXRlXHJcbiAgfSk7XHJcbiAgZ2FtZS5pbml0aWFsaXplKCk7XHJcblxyXG4gIC8vIEhhbmRsZXJzXHJcbiAgJHRpdGxlLm9uY2xpY2sgPSBjaGFuZ2VGb250O1xyXG4gICRudGgub25jbGljayA9IGdhbWUuYWRkQ291bnQuYmluZChnYW1lKTtcclxuICAkbmFtZXMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgbmFtZS5vbmNsaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICBnYW1lLnB1cmNoYXNlKG5hbWUucGFyZW50RWxlbWVudC5pZCk7XHJcbiAgICB9O1xyXG4gIH0pO1xyXG4gICRzaG93VXBncmFkZXMub25jbGljayA9IGdhbWUuc2hvd1VwZ3JhZGVzLmJpbmQoZ2FtZSk7XHJcbiAgJGdvYWwuaW5uZXJIVE1MID0gJ2dvYWw6ICcgKyBnYW1lLmdvYWw7XHJcbiAgZ2FtZS5ydW5UaW1lcigpO1xyXG4gIC8vIExvY2sgRlBTIHRvIDMwXHJcbiAgZnJhbWVSYXRlKDMwKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQNSBkcmF3XHJcbiAqL1xyXG53aW5kb3cuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBVcGRhdGUgdGhlIGRvbSwgaW50ZXJuYWwgYWRkZXJzLCBhbmQgZ3Jvd3RoUmF0ZVxyXG4gIGlmIChnYW1lLmFkZGVyc0hhdmVDaGFuZ2VkKSB7XHJcbiAgICBnYW1lLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUoKTtcclxuICB9XHJcbiAgLy8gSW5jcmVhc2VkIHRoZSBnYW1lIGNvdW50IGlmIG5vdCBwYXVzZWRcclxuICBpZiAoZ2FtZS5wYXVzZWQpIHtcclxuICB9IGVsc2Uge1xyXG4gICAgZ2FtZS5ncm93KCk7XHJcbiAgICAvLyBTaG93IHRoaXMgaW5jcmVhc2VcclxuICAgICRjb3VudC5pbm5lckhUTUwgPSBnYW1lLmdldENvdW50SHRtbCgpO1xyXG4gIH1cclxufTtcclxuIl0sImZpbGUiOiJpbmRleC5qcyJ9
