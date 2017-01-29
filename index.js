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
  this.$nth = options.$nth;

  /**
   * An array of durations and callbacks to be updated each tick
   */
  this.upgradesWithDuration = [];
  /**
   * Flags the upgrades array for a slice operation
   */
  this.upgradesWithDurationArrayNeedsCleanup = false;
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
  this.playNthSound();
  this.count += this.clickValue;
  this.$message.innerHTML = '. . .';
};

/**
 * Grows the count
 */
Nth.prototype.grow = function () {
  if (this.count + this.growthRate >= this.goal) {
    this.count = this.goal;
    this.stopTimer();
    this.$nth.onclick = function () {};
    this.$nth.innerText = 'You Win';
  } else {
    this.count += this.growthRate;
  }
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
      // Add the upgrade to the upgradesWithDuration array if applicable
      if (upgrade.duration) {
        this.upgradesWithDuration.push({
          duration: upgrade.duration,
          cb: upgrade.cb
        });
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
  this.timerId = setTimeout(this.runTimer.bind(this), 1000);
};

Nth.prototype.stopTimer = function () {
  clearTimeout(this.timerId);
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

/**
 * Upgrades all upgrades that have a set duration, calling their
 * cb function once the duration has expired
 */
Nth.prototype.updateUpgradesWithDuration = function () {
  for (var i = 0; i < this.upgradesWithDuration.length; i++) {
    if (!this.upgradesWithDuration[i].duration--) {
      this.upgradesWithDuration[i].cb();
      delete this.upgradesWithDuration[i];
      this.upgradesWithDurationArrayNeedsCleanup = true;
    }
  }
  if (this.upgradesWithDurationArrayNeedsCleanup) {
    this.upgradesWithDuration = this.upgradesWithDuration.filter(function (upgrade) {
      return Boolean(upgrade);
    });
    this.upgradesWithDurationArrayNeedsCleanup = false;
  }
};

/**
 * Plays the click sound
 */
Nth.prototype.playNthSound = function () {
  var audio = document.getElementById('nth_click_sound');
  audio.currentTime = 0;
  audio.play();
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
var Upgrades = [
  {
    id : 0,
    target : 'nth',
    cost : 450,
    desc : 'increases nth value to 2',
    /**
     * @description - modifies the click value of the game
     */
    enable : function (nth) {
      nth.clickValue = 2;
      document.getElementById('wrap').style.animation = 'nth_upgrade_id_0 ' + this.duration / 30 + 's 1';
    },
    duration: 300,
    cb: function () {
      document.getElementById('wrap').style.animation = '';
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
    cost : 12000,
    desc : 'increases Sigma rate to 0.14',
    enable : function (nth) {
      nth.adders.Sigma.rate = 0.14;
    }
  },
  {
    id : 13,
    target : 'nth',
    cost : 2000,
    desc : 'increases nth value to 3',
    /**
     * @description - modifies the click value of the game
     */
    enable : function (nth) {
      nth.clickValue = 3;
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
var fonts = ['Nu', 'NK', 'VT323', 'Space Mono'],
  fontIndex = 0,
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
  document.body.style['font-family'] = fonts[fontIndex++ % fonts.length];
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
    $totalRate: $totalRate,
    $nth: $nth
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
    game.updateUpgradesWithDuration();
    // Show this increase
    $count.innerHTML = game.getCountHtml();
  }
};

},{"./classes/Nth":2}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcbG9nYW5cXERvY3VtZW50c1xccGVyc29uYWxfcHJvamVjdHNcXG50aFxcbm9kZV9tb2R1bGVzXFxndWxwLWJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2NsYXNzZXMvQWRkZXIuanMiLCJDOi9Vc2Vycy9sb2dhbi9Eb2N1bWVudHMvcGVyc29uYWxfcHJvamVjdHMvbnRoL3NyYy9jbGFzc2VzL050aC5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2RhdGEvQWRkZXJzLmpzIiwiQzovVXNlcnMvbG9nYW4vRG9jdW1lbnRzL3BlcnNvbmFsX3Byb2plY3RzL250aC9zcmMvZGF0YS9VcGdyYWRlcy5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2Zha2VfYmRmMzU2MWQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG4vKiBnbG9iYWwgZmxvb3IgKi9cclxuLyoqXHJcbiAqIEFkZGVycyBpbmNyZWFzZSB0aGUgcmF0ZSBhdCB3aGljaCB0aGUgTnRoIGNvdW50IGdyb3dzXHJcbiAqL1xyXG52YXIgQWRkZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gIHRoaXMucmF0ZSA9IG9wdGlvbnMucmF0ZTtcclxuICB0aGlzLnVwZGF0ZSA9IG9wdGlvbnMudXBkYXRlRm47XHJcbiAgdGhpcy5nZW5lcmF0ZVIgPSBvcHRpb25zLnJGbjtcclxuICB0aGlzLmNvc3QgPSBvcHRpb25zLmNvc3RGbjtcclxuICB0aGlzLm5hbWUgPSBvcHRpb25zLm5hbWU7XHJcblxyXG4gIC8vIEF1ZGlvIGFzc2V0c1xyXG4gIHRoaXMuYXVkaW8gPSBvcHRpb25zLmF1ZGlvIHx8IGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgdXAgdGhlIGFkZGVyXHJcbiAqL1xyXG5BZGRlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmNvdW50ID0gMDtcclxuICB0aGlzLnVubG9ja2VkID0gZmFsc2U7XHJcbiAgdGhpcy5yID0gdGhpcy5nZW5lcmF0ZVIoKTtcclxuICBpZiAodGhpcy5hdWRpbykge1xyXG4gICAgZm9yICh2YXIgYWN0aW9uTmFtZSBpbiB0aGlzLmF1ZGlvKSB7XHJcbiAgICAgIHZhciBmaWxlbmFtZSA9IHRoaXMuYXVkaW9bYWN0aW9uTmFtZV07XHJcbiAgICAgIHZhciBhdWRpbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XHJcbiAgICAgIGF1ZGlvLmlkID0gdGhpcy5uYW1lICsgJy0nICsgYWN0aW9uTmFtZTtcclxuICAgICAgYXVkaW8uc3JjID0gZmlsZW5hbWU7XHJcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYXVkaW8pO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSBIVE1MIHN0cmluZyBvZiB0aGUgY29zdFxyXG4gKi9cclxuQWRkZXIucHJvdG90eXBlLmdldENvc3RIdG1sID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiAnWycgKyBmbG9vcih0aGlzLmNvc3QoKSkudG9TdHJpbmcoKS5yZXBsYWNlKC9cXEIoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCAnLicpICsgJ10nO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBsYXlzIHRoZSBidWlsZCBzb3VuZFxyXG4gKi9cclxuQWRkZXIucHJvdG90eXBlLnBsYXlCdWlsZFNvdW5kID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBhdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMubmFtZSArICctYnVpbGQnKTtcclxuICBhdWRpby5jdXJyZW50VGltZSA9IDA7XHJcbiAgYXVkaW8ucGxheSgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBsYXlzIHRoZSB1cGdyYWRlIHNvdW5kXHJcbiAqL1xyXG5BZGRlci5wcm90b3R5cGUucGxheVVwZ3JhZGVTb3VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgYXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLm5hbWUgKyAnLXVwZ3JhZGUnKTtcclxuICBhdWRpby5jdXJyZW50VGltZSA9IDA7XHJcbiAgYXVkaW8ucGxheSgpO1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFkZGVyO1xyXG4iLCJcclxuLyogZ2xvYmFsIGZsb29yICovXHJcbnZhciBBZGRlcnMgPSByZXF1aXJlKCcuLi9kYXRhL0FkZGVycycpO1xyXG52YXIgQWRkZXIgPSByZXF1aXJlKCcuL0FkZGVyJyk7XHJcblxyXG4vKipcclxuICogVGhlIGdhbWUgY2xhc3NcclxuICogQHBhcmFtIHtPYmplY3R9ICRtZXNzYWdlXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkY291bnRcclxuICogQHBhcmFtIHtPYmplY3R9ICR1cGdyYWRlc1xyXG4gKiBAcGFyYW0ge09iamVjdH0gJHRpbWVyXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkc2hvd1VwZ3JhZGVzXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkaW50cm9cclxuICovXHJcbnZhciBOdGggPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gIHRoaXMuJG1lc3NhZ2UgPSBvcHRpb25zLiRtZXNzYWdlO1xyXG4gIHRoaXMuJGNvdW50ID0gb3B0aW9ucy4kY291bnQ7XHJcbiAgdGhpcy4kdXBncmFkZXMgPSBvcHRpb25zLiR1cGdyYWRlcztcclxuICB0aGlzLiR0aW1lciA9IG9wdGlvbnMuJHRpbWVyO1xyXG4gIHRoaXMuJHNob3dVcGdyYWRlcyA9IG9wdGlvbnMuJHNob3dVcGdyYWRlcztcclxuICB0aGlzLiRpbnRybyA9IG9wdGlvbnMuJGludHJvO1xyXG4gIHRoaXMuJHRvdGFsUmF0ZSA9IG9wdGlvbnMuJHRvdGFsUmF0ZTtcclxuICB0aGlzLiRudGggPSBvcHRpb25zLiRudGg7XHJcblxyXG4gIC8qKlxyXG4gICAqIEFuIGFycmF5IG9mIGR1cmF0aW9ucyBhbmQgY2FsbGJhY2tzIHRvIGJlIHVwZGF0ZWQgZWFjaCB0aWNrXHJcbiAgICovXHJcbiAgdGhpcy51cGdyYWRlc1dpdGhEdXJhdGlvbiA9IFtdO1xyXG4gIC8qKlxyXG4gICAqIEZsYWdzIHRoZSB1cGdyYWRlcyBhcnJheSBmb3IgYSBzbGljZSBvcGVyYXRpb25cclxuICAgKi9cclxuICB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uQXJyYXlOZWVkc0NsZWFudXAgPSBmYWxzZTtcclxufTtcclxuXHJcbk50aC5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBMb2FkIGFkZGVyc1xyXG4gIHRoaXMuYWRkZXJzID0ge307XHJcbiAgZm9yICh2YXIgYWRkZXIgaW4gQWRkZXJzKSB7XHJcbiAgICB0aGlzLmFkZGVyc1thZGRlcl0gPSBuZXcgQWRkZXIoQWRkZXJzW2FkZGVyXSk7XHJcbiAgICB0aGlzLmFkZGVyc1thZGRlcl0uaW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgLy8gQFRPRE8gbWFrZSB2b2x1bWUgY29udHJvbHNcclxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdhdWRpbycpLmZvckVhY2goZnVuY3Rpb24gKGF1ZGlvKSB7XHJcbiAgICBhdWRpby52b2x1bWUgPSAwLjE7XHJcbiAgfSk7XHJcblxyXG4gIC8vIFVubG9jayBsaXR0bGUgZGVsdGEgYnkgZGVmYXVsdFxyXG4gIHRoaXMuYWRkZXJzLmRlbHRhLnVubG9ja2VkID0gdHJ1ZTtcclxuICAvLyBUaGUgdG90YWwgY291bnQgdXNlZCBmb3IgcHVyY2hhc2luZyBhZGRlcnNcclxuICB0aGlzLmNvdW50ID0gMTAwMDAwO1xyXG4gIC8vIE51bWJlciB0byBpbmNyZWFlcyBjb3VudCBieSBmb3IgZWFjaCBjbGlja1xyXG4gIHRoaXMuY2xpY2tWYWx1ZSA9IDE7XHJcbiAgLy8gVGltZSBpbiBzZWNvbmRzXHJcbiAgdGhpcy5nYW1lVGltZSA9IDA7XHJcbiAgLy8gR29hbCB0byBnZXQgdG9cclxuICB0aGlzLmdvYWwgPSAxMDAwMDAwO1xyXG4gIHRoaXMuZ3Jvd3RoUmF0ZSA9IDA7XHJcbiAgdGhpcy5hZGRlcnNIYXZlQ2hhbmdlZCA9IHRydWU7XHJcbiAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcclxuICAvLyBUaGVzZSB1cGdyYWRlcyBzaG91bGQgYmUgY2xhc3NlcyBhbmQgdGhleSBzaG91bGQgbW9kaWZ5IGFkZGVyc1xyXG4gIC8vIHRocm91Z2ggYSBtZXRob2Qgb2YgdGhlIGFkZGVycyB0aGVtc2VsdmVzXHJcbiAgdGhpcy51cGdyYWRlcyA9IHJlcXVpcmUoJy4uL2RhdGEvVXBncmFkZXMnKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBdHRlbXB0cyB0byBwdXJjaGFzZSBhbiBhZGRlclxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFkZGVyXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLnB1cmNoYXNlID0gZnVuY3Rpb24gKG5hbWUpIHtcclxuICB2YXIgYWRkZXIgPSB0aGlzLmFkZGVyc1tuYW1lXTtcclxuICAvLyBZb3UgY2FuIG9ubHkgYXR0ZW1wdCB0byBwdXJjaGFzZSB1bmxvY2tlZCBhZGRlcnNcclxuICBpZiAoYWRkZXIudW5sb2NrZWQpIHtcclxuICAgIHZhciBjb3N0ID0gYWRkZXIuY29zdCgpO1xyXG4gICAgaWYgKHRoaXMuY291bnQgPj0gY29zdCkge1xyXG4gICAgICAvLyBQdXJjaGFzZSBmcm9tIHRoZSB0b3RhbCBjb3VudFxyXG4gICAgICB0aGlzLmNvdW50IC09IGNvc3Q7XHJcbiAgICAgIC8vIEluY3JlbWVudCB0aGUgbnVtYmVyIG9mIG93bmVkIGFkZGVycyBvZiB0aGF0IHR5cGVcclxuICAgICAgYWRkZXIuY291bnQrKztcclxuICAgICAgdGhpcy5hZGRlcnNIYXZlQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgIC8vIFVwZGF0ZSBET01cclxuICAgICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAncHVyY2hhc2VkICcgKyBuYW1lICsgJy4nO1xyXG4gICAgICAvLyBQbGF5IGF1ZGlvXHJcbiAgICAgIGFkZGVyLnBsYXlCdWlsZFNvdW5kKCk7XHJcbiAgICAgIC8vIElmIHRoZXJlJ3MgYW4gdXBkYXRlIGZ1bmN0aW9uIG9uIHRoZSBhZGRlciwgdXBkYXRlXHJcbiAgICAgIGlmIChhZGRlci51cGRhdGUpIHtcclxuICAgICAgICBhZGRlci51cGRhdGUoKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBUaGUgZmlyc3QgdGltZSBzb21ldGhpbmcgaXMgcHVyY2hhc2VkLCB1bmxvY2sgdGhlIG5leHRcclxuICAgICAgaWYgKGFkZGVyLmNvdW50ID09PSAxKSB7XHJcbiAgICAgICAgdmFyIG5leHQgPSB3aW5kb3cuZGcobmFtZSkubmV4dFNpYmxpbmcubmV4dFNpYmxpbmc7XHJcbiAgICAgICAgaWYgKG5leHQpIHtcclxuICAgICAgICAgIHRoaXMuYWRkZXJzW25leHQuaWRdLnVubG9ja2VkID0gdHJ1ZTtcclxuICAgICAgICAgIHRoaXMuJG1lc3NhZ2UuaW5uZXJIVE1MICs9ICcgdW5sb2NrZWQgJyArIG5leHQuaWQgKyAnLic7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICdjYW5ub3QgYWZmb3JkIHRvIHB1cmNoYXNlICcgKyBuYW1lO1xyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9IG5hbWUgKyAnIGhhcyBub3QgYmVlbiB1bmxvY2tlZCB5ZXQuJztcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogU2hvd3MgdGhlIHVwZ3JhZGVzIHRhYmxlXHJcbiAqXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLnNob3dVcGdyYWRlcyA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLiRpbnRyby5yZW1vdmUoKTtcclxuICB0aGlzLiRzaG93VXBncmFkZXMucmVtb3ZlKCk7XHJcbiAgdGhpcy51cGdyYWRlcy5mb3JFYWNoKGZ1bmN0aW9uICh1cGdyYWRlKSB7XHJcbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICBkaXYuY2xhc3NMaXN0ICs9ICd1cGdyYWRlICcgKyB1cGdyYWRlLnRhcmdldDtcclxuICAgIGRpdi5pbm5lckhUTUwgPSB1cGdyYWRlLmRlc2MgKyAnXFx0WycgKyB1cGdyYWRlLmNvc3QgKyAnXSc7XHJcbiAgICBkaXYub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgIHRoaXMucHVyY2hhc2VVcGdyYWRlKHVwZ3JhZGUuaWQpO1xyXG4gICAgICBpZiAodXBncmFkZS5lbmFibGVkKSB7XHJcbiAgICAgICAgZS50YXJnZXQuY2xhc3NMaXN0ICs9ICcgZW5hYmxlZCc7XHJcbiAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHRoaXMuJHVwZ3JhZGVzLmFwcGVuZENoaWxkKGRpdik7XHJcbiAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGNsaWNrIHZhbHVlIHdoZW4gbnRoIGJ1dHRvbiBpcyBwcmVzc2VkXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLmFkZENvdW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMucGxheU50aFNvdW5kKCk7XHJcbiAgdGhpcy5jb3VudCArPSB0aGlzLmNsaWNrVmFsdWU7XHJcbiAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAnLiAuIC4nO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdyb3dzIHRoZSBjb3VudFxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5ncm93ID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICh0aGlzLmNvdW50ICsgdGhpcy5ncm93dGhSYXRlID49IHRoaXMuZ29hbCkge1xyXG4gICAgdGhpcy5jb3VudCA9IHRoaXMuZ29hbDtcclxuICAgIHRoaXMuc3RvcFRpbWVyKCk7XHJcbiAgICB0aGlzLiRudGgub25jbGljayA9IGZ1bmN0aW9uICgpIHt9O1xyXG4gICAgdGhpcy4kbnRoLmlubmVyVGV4dCA9ICdZb3UgV2luJztcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5jb3VudCArPSB0aGlzLmdyb3d0aFJhdGU7XHJcbiAgfVxyXG59O1xyXG5cclxuTnRoLnByb3RvdHlwZS51cGRhdGVBZGRlcnNBbmRHcm93dGhSYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIFJlc2V0IGdyb3d0aFJhdGVcclxuICB0aGlzLmdyb3d0aFJhdGUgPSAwO1xyXG4gIGZvciAodmFyIGFkZGVyIGluIHRoaXMuYWRkZXJzKSB7XHJcbiAgICB2YXIgYSA9IHRoaXMuYWRkZXJzW2FkZGVyXTtcclxuICAgIC8vIE9ubHkgc2hvdyBjb3N0LCBjb3VudCwgYW5kIHJhdGUgaWYgdW5sb2NrZWRcclxuICAgIGlmIChhLnVubG9ja2VkKSB7XHJcbiAgICAgIHZhciAkY29zdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyMnICsgYWRkZXIgKyAnIC5jb3N0JylbMF07XHJcbiAgICAgICRjb3N0LmlubmVySFRNTCA9IGEuZ2V0Q29zdEh0bWwoKTtcclxuICAgICAgdmFyICRjb3VudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyMnICsgYWRkZXIgKyAnIC5jb3VudCcpWzBdO1xyXG4gICAgICB2YXIgc3RyID0gJyc7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYS5jb3VudDsgaSsrKSB7XHJcbiAgICAgICAgc3RyICs9ICcmJyArIGFkZGVyICsgJzsnO1xyXG4gICAgICB9XHJcbiAgICAgICRjb3VudC5pbm5lckhUTUwgPSBzdHIgfHwgJy0nO1xyXG4gICAgICB2YXIgJHRvdGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLnRvdGFsJylbMF07XHJcbiAgICAgICR0b3RhbC5pbm5lckhUTUwgPSBhZGRlciArICcgdG90YWwgJyArIGEuY291bnQ7XHJcbiAgICAgIHZhciAkcmF0ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyMnICsgYWRkZXIgKyAnIC5yYXRlJylbMF07XHJcbiAgICAgIGlmIChhLmNvdW50KSB7XHJcbiAgICAgICAgJHJhdGUuaW5uZXJIVE1MID0gJ3JhdGU6ICcgKyAoYS5jb3VudCAqIGEucmF0ZSkudG9GaXhlZCgzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAkcmF0ZS5pbm5lckhUTUwgPSAncmF0ZToge3snICsgYS5yYXRlLnRvRml4ZWQoMykgKyAnfX0nO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBJZiB0aGVyZSdzIGF0IGxlYXN0IG9uZSBhZGRlciwgdXBkYXRlIHRoZSBncm93dGhSYXRlXHJcbiAgICBpZiAoYS5jb3VudCkge1xyXG4gICAgICB0aGlzLmdyb3d0aFJhdGUgKz0gYS5jb3VudCAqIGEucmF0ZTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gVXBkYXRlIHRoZSB0b3RhbCBncm93dGggcmF0ZVxyXG4gIHRoaXMuJHRvdGFsUmF0ZS5pbm5lckhUTUwgPSAncmF0ZTogJyArIHRoaXMuZ3Jvd3RoUmF0ZS50b0ZpeGVkKDMpO1xyXG4gIHRoaXMuYWRkZXJzSGF2ZUNoYW5nZWQgPSBmYWxzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQdXJjaGFzZXMgdGhlIHVwZ3JhZGUgb3IgcmVzcG9uZHMgdGhhdCB0aGUgdXBncmFkZSBjYW4ndCBiZSBwdXJjaHNlZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgLSB0aGUgaWQgb2YgdGhlIHVwZ3JhZGVcclxuICovXHJcbk50aC5wcm90b3R5cGUucHVyY2hhc2VVcGdyYWRlID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgdmFyIHVwZ3JhZGU7XHJcbiAgLy8gR2V0cyB0aGUgdXBncmFkZSB3aXRoIHRoZSBpZCBwcm92aWRlZFxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy51cGdyYWRlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHRoaXMudXBncmFkZXNbaV0uaWQgPT0gaWQpIHtcclxuICAgICAgdXBncmFkZSA9IHRoaXMudXBncmFkZXNbaV07XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBDYW4ndCByZWJ1eSBwdXJjaGFzZWQgdXBncmFkZXNcclxuICBpZiAoIXVwZ3JhZGUuZW5hYmxlZCkge1xyXG4gICAgLy8gT25seSBidXkgaWYgYWZmb3JkYWJsZVxyXG4gICAgaWYgKHRoaXMuY291bnQgPj0gdXBncmFkZS5jb3N0KSB7XHJcbiAgICAgIHRoaXMuY291bnQgLT0gdXBncmFkZS5jb3N0O1xyXG4gICAgICB1cGdyYWRlLmVuYWJsZSh0aGlzKTtcclxuICAgICAgdXBncmFkZS5lbmFibGVkID0gdHJ1ZTtcclxuICAgICAgLy8gUGxheSB0aGUgdXBncmFkZSBzb3VuZCBmb3IgdGhlIHRhcmdldFxyXG4gICAgICBpZiAodXBncmFkZS50YXJnZXQgPT09ICdudGgnKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5VXBncmFkZVNvdW5kKHVwZ3JhZGUuaWQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuYWRkZXJzW3VwZ3JhZGUudGFyZ2V0XS5wbGF5VXBncmFkZVNvdW5kKCk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gQWRkIHRoZSB1cGdyYWRlIHRvIHRoZSB1cGdyYWRlc1dpdGhEdXJhdGlvbiBhcnJheSBpZiBhcHBsaWNhYmxlXHJcbiAgICAgIGlmICh1cGdyYWRlLmR1cmF0aW9uKSB7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlc1dpdGhEdXJhdGlvbi5wdXNoKHtcclxuICAgICAgICAgIGR1cmF0aW9uOiB1cGdyYWRlLmR1cmF0aW9uLFxyXG4gICAgICAgICAgY2I6IHVwZ3JhZGUuY2JcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgICAvLyBUZWxsIFA1IHRoaW5ncyBoYXZlIGNoYW5nZWRcclxuICAgICAgdGhpcy5hZGRlcnNIYXZlQ2hhbmdlZCA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICdjYW5ub3QgYWZmb3JkIHVwZ3JhZGUgZm9yICcgKyB1cGdyYWRlLnRhcmdldCArICcuJztcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAnY2Fubm90IHJlYnV5IHVwZ3JhZGUuJztcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogUnVucyB0aGUgZ2FtZSB0aW1lciwgdXBkYXRpbmcgdGhlIGdhbWUgYW5kIHRoZSBET00gc2ltdWx0YW5lb3VzbHlcclxuICovXHJcbk50aC5wcm90b3R5cGUucnVuVGltZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5nYW1lVGltZSsrO1xyXG4gIHRoaXMuJHRpbWVyLmlubmVySFRNTCA9IHRoaXMuZ2FtZVRpbWUgKyAncyc7XHJcbiAgdGhpcy50aW1lcklkID0gc2V0VGltZW91dCh0aGlzLnJ1blRpbWVyLmJpbmQodGhpcyksIDEwMDApO1xyXG59O1xyXG5cclxuTnRoLnByb3RvdHlwZS5zdG9wVGltZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXJJZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIC0gdGhlIHVwZ3JhZGUgaWRcclxuICovXHJcbk50aC5wcm90b3R5cGUucGxheVVwZ3JhZGVTb3VuZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHZhciBhdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdudGhfdXBncmFkZV9pZF8nICsgaWQpO1xyXG4gIGF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcclxuICBhdWRpby5wbGF5KCk7XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgZm9ybWF0dGVkIGNvdW50IGh0bWxcclxuICovXHJcbk50aC5wcm90b3R5cGUuZ2V0Q291bnRIdG1sID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBmbG9vcih0aGlzLmNvdW50KS50b1N0cmluZygpLnJlcGxhY2UoL1xcQig/PShcXGR7M30pKyg/IVxcZCkpL2csICcuJyk7XHJcbn07XHJcblxyXG4vKipcclxuICogVXBncmFkZXMgYWxsIHVwZ3JhZGVzIHRoYXQgaGF2ZSBhIHNldCBkdXJhdGlvbiwgY2FsbGluZyB0aGVpclxyXG4gKiBjYiBmdW5jdGlvbiBvbmNlIHRoZSBkdXJhdGlvbiBoYXMgZXhwaXJlZFxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS51cGRhdGVVcGdyYWRlc1dpdGhEdXJhdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb24ubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICghdGhpcy51cGdyYWRlc1dpdGhEdXJhdGlvbltpXS5kdXJhdGlvbi0tKSB7XHJcbiAgICAgIHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb25baV0uY2IoKTtcclxuICAgICAgZGVsZXRlIHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb25baV07XHJcbiAgICAgIHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb25BcnJheU5lZWRzQ2xlYW51cCA9IHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmICh0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uQXJyYXlOZWVkc0NsZWFudXApIHtcclxuICAgIHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb24gPSB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uLmZpbHRlcihmdW5jdGlvbiAodXBncmFkZSkge1xyXG4gICAgICByZXR1cm4gQm9vbGVhbih1cGdyYWRlKTtcclxuICAgIH0pO1xyXG4gICAgdGhpcy51cGdyYWRlc1dpdGhEdXJhdGlvbkFycmF5TmVlZHNDbGVhbnVwID0gZmFsc2U7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBsYXlzIHRoZSBjbGljayBzb3VuZFxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5wbGF5TnRoU291bmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ250aF9jbGlja19zb3VuZCcpO1xyXG4gIGF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcclxuICBhdWRpby5wbGF5KCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE50aDtcclxuIiwiXHJcbi8qIGdsb2JhbCBmbG9vciwgcmFuZG9tICovXHJcbi8qKlxyXG4gKiBAc2NoZW1hXHJcbiAqIHJhdGUgQHR5cGUge051bWJlcn0gLSB0aGUgcGVyIGFkZGVyIGdyb3d0aCByYXRlXHJcbiAqIHVwZGF0ZUZuIEB0eXBlIHtGdW5jdGlvbn0gLSB0aGUgdXBkYXRlIGZ1bmN0aW9uXHJcbiAqIHJGbiBAdHlwZSB7RnVuY3Rpb259IC0gdGhlIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgaW5pdGlhbCBjb3N0IHJhdGUgYWRqdXN0bWVudFxyXG4gKiBjb3N0Rm4gQHR5cGUge0Z1bmN0aW9ufSAtIHRoZSBmdW5jdGlvbiB0byBkZXRlcm1pbmUgdGhlIGNvc3Qgb2YgdGhlIG5leHQgcHVyY2hhc2VcclxuICogY29zdEh0bWxGbiBAdHlwZSB7RnVuY3Rpb259IC0gdGhlIGZ1bmN0aW9uIHRvIHJldHVybiB0aGUgbWFya3VwIGZvciB0aGUgbmV4dCBjb3N0XHJcbiAqL1xyXG52YXIgQWRkZXJzID0ge1xyXG4gIGRlbHRhOiB7XHJcbiAgICBuYW1lOiAnZGVsdGEnLFxyXG4gICAgcmF0ZSA6IDAuMDAxLFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKHRoaXMuY291bnQgKiAxMCkgKyAxMDtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvZGVsdGFfYnVpbGQud2F2JyxcclxuICAgICAgLy8gVGhpcyBuZWVkcyB0byBiZSBjaGFuZ2VkIC0gc2FtZSBhcyBhbHBoYSB1cGdyYWRlXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2RlbHRhX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgU2lnbWE6IHtcclxuICAgIG5hbWU6ICdTaWdtYScsXHJcbiAgICByYXRlIDogMC4wMDUsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSg1LDEwKSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnIgPSBmbG9vcihyYW5kb20odGhpcy5jb3VudCAqIDEwLCB0aGlzLmNvdW50ICogMjApKTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgIHJldHVybiAoKHRoaXMuY291bnQgKyAxKSAqIDI1KSArIHRoaXMucjtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvYmlnX3NpZ21hX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2JpZ19zaWdtYV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIERlbHRhOiB7XHJcbiAgICBuYW1lOiAnRGVsdGEnLFxyXG4gICAgcmF0ZSA6IDAuMDEsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSg1MCwxNTApKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGUgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuciA9IGZsb29yKHJhbmRvbSg1MCwxNTApKSAqIHRoaXMuY291bnQ7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAoKHRoaXMuY291bnQgKyAxKSAqIDEwMCkgKyB0aGlzLnI7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2JpZ19kZWx0YV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9iaWdfZGVsdGFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICByaG86IHtcclxuICAgIG5hbWU6ICdyaG8nLFxyXG4gICAgcmF0ZSA6IDAuMDgsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSg1MCwxNTApKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGUgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuciA9IHRoaXMuY291bnQgKiBmbG9vcihyYW5kb20oNTAsMTUwKSk7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAoKHRoaXMuY291bnQgKyAxKSAqIDIyNSkgKyB0aGlzLnI7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL3Job19idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9yaG9fdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBsYW1iZGE6IHtcclxuICAgIG5hbWU6ICdsYW1iZGEnLFxyXG4gICAgcmF0ZSA6IDAuMTQsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSgxNTAsIDIwMCkpO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKHRoaXMuY291bnQgKyAxKSAqIHRoaXMucjtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvbGFtYmRhX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2xhbWJkYV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIHBpOiB7XHJcbiAgICBuYW1lOiAncGknLFxyXG4gICAgcmF0ZSA6IDAuOCxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gTWF0aC5QSSAqIHRoaXMuY291bnQgKiAxMDAwMDtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICh0aGlzLmNvdW50ICsgMSAqIDEyMDAwKSArIHRoaXMuciArIGZsb29yKHJhbmRvbSgxLDIwMDAwKSk7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL3BpX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL3BpX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgYWxwaGE6IHtcclxuICAgIG5hbWU6ICdhbHBoYScsXHJcbiAgICByYXRlIDogMS43NyxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gZmxvb3IocmFuZG9tKDIwMDAsMzAwMCkpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5yID0gZmxvb3IocmFuZG9tKDIwMDAsMzAwMCkpICogdGhpcy5jb3VudDtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICh0aGlzLmNvdW50ICogNDAwMDApICsgdGhpcy5yO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9hbHBoYV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9hbHBoYV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIHNpZ21hOiB7XHJcbiAgICBuYW1lOiAnc2lnbWEnLFxyXG4gICAgcmF0ZSA6IDMuNSxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuY291bnQgKiAyMDAwMDtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvc2lnbWFfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvc2lnbWFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBMYW1iZGE6IHtcclxuICAgIG5hbWU6ICdMYW1iZGEnLFxyXG4gICAgcmF0ZTogMTAsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNvdW50ICogMjMwMDA7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2JpZ19sYW1iZGFfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvYmlnX2xhbWJkYV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIG9tZWdhOiB7XHJcbiAgICBuYW1lOiAnb21lZ2EnLFxyXG4gICAgcmF0ZTogMjAsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAyMDAwMCAqIHRoaXMuciAqIHRoaXMuY291bnQ7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL29tZWdhX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL29tZWdhX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZXBzaWxvbjoge1xyXG4gICAgbmFtZTogJ2Vwc2lsb24nLFxyXG4gICAgcmF0ZTogNzUsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxMjUwMDAgKiB0aGlzLmNvdW50ICsgZmxvb3IocmFuZG9tKDEwMDAwLCAyNTAwMCkpO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9lcHNpbG9uX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2Vwc2lsb25fdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBQc2k6IHtcclxuICAgIG5hbWU6ICdQc2knLFxyXG4gICAgcmF0ZTogMjUwLFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gNjAwMDAwICogdGhpcy5jb3VudDtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvYmlnX3BzaV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9iaWdfcHNpX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBBZGRlcnM7XHJcbiIsIlxyXG4vKipcclxuICogQHNjaGVtYVxyXG4gKiBAdHlwZSB7TnVtYmVyfSBpZCAtIHRoZSB1cGdyYWRlIGlkXHJcbiAqIEB0eXBlIHtTdHJpbmd9IHRhcmdldCAtIHRoZSB0YXJnZXQgb2YgdGhlIHVwZ3JhZGVcclxuICogdGhpcyBjYW4gYmUgbnRoICh0aGUgZ2FtZSBpdHNlbGYpIG9yIGFuIGFkZGVyXHJcbiAqIEB0eXBlIHtOdW1iZXJ9IGNvc3QgLSB0aGUgY29zdCBvZiB0aGUgdXBncmFkZVxyXG4gKiBAdHlwZSB7U3RyaW5nfSBkZXNjcmlwdGlvbiAtIHRoZSBkZXNjcmlwdGlvbiBvZiB0aGUgdXBncmFkZVxyXG4gKiBAdHlwZSB7RnVuY3Rpb259IGVuYWJsZSAtIHdoYXQgaGFwcGVucyB3aGVuIHRoZSB1cGdyYWRlIGlzIGVuYWJsZWRcclxuICogaW4gc29tZSBjYXNlcywgdGhpcyBjaGFuZ2VzIHRoZSByYXRlIG9mIHRoZSB0YXJnZXQsIGluIG90aGVycywgaXRcclxuICogbW9kaWZpZXMgdGhlIGdhbWUgaXRzZWxmIHRvIHByb3ZpZGUgcGlja3VwcywgZXRjLlxyXG4gKiBpbiB0aGUgbGF0dGVyIGNhc2UsIHRoZSB0YXJnZXQgbXVzdCBiZSBudGggYW5kIG11c3RcclxuICogY2FsbCBhIGZ1bmN0aW9uIHdoaWNoIGVuYmFsZXMgbnRoXHJcbiAqICAgIEBwYXJhbSB7T2JqZWN0PE50aD59IG50aCAtIHRoZSBnYW1lIG9iamVjdCBpcyBBTFdBWVNcclxuICogICAgcGFzc2VkIHRvIHRoZSBlbmFibGUgZnVuY3Rpb25cclxuICovXHJcbnZhciBVcGdyYWRlcyA9IFtcclxuICB7XHJcbiAgICBpZCA6IDAsXHJcbiAgICB0YXJnZXQgOiAnbnRoJyxcclxuICAgIGNvc3QgOiA0NTAsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBudGggdmFsdWUgdG8gMicsXHJcbiAgICAvKipcclxuICAgICAqIEBkZXNjcmlwdGlvbiAtIG1vZGlmaWVzIHRoZSBjbGljayB2YWx1ZSBvZiB0aGUgZ2FtZVxyXG4gICAgICovXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5jbGlja1ZhbHVlID0gMjtcclxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dyYXAnKS5zdHlsZS5hbmltYXRpb24gPSAnbnRoX3VwZ3JhZGVfaWRfMCAnICsgdGhpcy5kdXJhdGlvbiAvIDMwICsgJ3MgMSc7XHJcbiAgICB9LFxyXG4gICAgZHVyYXRpb246IDMwMCxcclxuICAgIGNiOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3cmFwJykuc3R5bGUuYW5pbWF0aW9uID0gJyc7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDEsXHJcbiAgICB0YXJnZXQgOiAnZGVsdGEnLFxyXG4gICAgY29zdCA6IDY1MDAsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBkZWx0YSByYXRlIHRvIDAuMDAzJyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5kZWx0YS5yYXRlID0gMC4wMDM7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDIsXHJcbiAgICB0YXJnZXQgOidTaWdtYScsXHJcbiAgICBjb3N0IDogMTIwMDAsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBTaWdtYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLlNpZ21hLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiAxMyxcclxuICAgIHRhcmdldCA6ICdudGgnLFxyXG4gICAgY29zdCA6IDIwMDAsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBudGggdmFsdWUgdG8gMycsXHJcbiAgICAvKipcclxuICAgICAqIEBkZXNjcmlwdGlvbiAtIG1vZGlmaWVzIHRoZSBjbGljayB2YWx1ZSBvZiB0aGUgZ2FtZVxyXG4gICAgICovXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5jbGlja1ZhbHVlID0gMztcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogMyxcclxuICAgIHRhcmdldCA6J0RlbHRhJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIERlbHRhIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMuRGVsdGEucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDQsXHJcbiAgICB0YXJnZXQgOidyaG8nLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgcmhvIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMucmhvLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiA1LFxyXG4gICAgdGFyZ2V0IDonbGFtYmRhJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIGxhbWJkYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLmxhbWJkYS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogNixcclxuICAgIHRhcmdldCA6J3BpJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIHBpIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMucGkucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDcsXHJcbiAgICB0YXJnZXQgOidhbHBoYScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBhbHBoYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLmFscGhhLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiA4LFxyXG4gICAgdGFyZ2V0IDonc2lnbWEnLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgc2lnbWEgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5zaWdtYS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogOSxcclxuICAgIHRhcmdldCA6J0xhbWJkYScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBMYW1iZGEgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5MYW1iZGEucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDEwLFxyXG4gICAgdGFyZ2V0IDonb21lZ2EnLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgb21lZ2EgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5vbWVnYS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogMTEsXHJcbiAgICB0YXJnZXQgOidlcHNpbG9uJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIGVwc2lsb24gcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5lcHNpbG9uLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiAxMixcclxuICAgIHRhcmdldCA6J1BzaScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBQc2kgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5Qc2kucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfVxyXG5dO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFVwZ3JhZGVzO1xyXG4iLCIvKiBnbG9iYWwgZnJhbWVSYXRlICovXHJcbnZhciBOdGggPSByZXF1aXJlKCcuL2NsYXNzZXMvTnRoJyk7XHJcblxyXG4vLyBHbG9iYWxzXHJcbnZhciBmb250cyA9IFsnTnUnLCAnTksnLCAnVlQzMjMnLCAnU3BhY2UgTW9ubyddLFxyXG4gIGZvbnRJbmRleCA9IDAsXHJcbiAgZ2FtZSxcclxuICAkY291bnQsXHJcbiAgJG50aCxcclxuICAkdGl0bGUsXHJcbiAgJG1lc3NhZ2UsXHJcbiAgJHNob3dVcGdyYWRlcyxcclxuICAkdXBncmFkZXMsXHJcbiAgJGludHJvLFxyXG4gICR0aW1lcixcclxuICAkZ29hbCxcclxuICAkbmFtZXMsXHJcbiAgJHRvdGFsUmF0ZTtcclxuLyoqXHJcbiAqIFdyYXBwZXJcclxuICovXHJcbndpbmRvdy5kZyA9IGZ1bmN0aW9uIChlbCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hhbmdlcyB0aGUgYm9keSBmb250XHJcbiAqL1xyXG5mdW5jdGlvbiBjaGFuZ2VGb250ICgpIHtcclxuICBkb2N1bWVudC5ib2R5LnN0eWxlWydmb250LWZhbWlseSddID0gZm9udHNbZm9udEluZGV4KysgJSBmb250cy5sZW5ndGhdO1xyXG4gICRtZXNzYWdlLmlubmVySFRNTCA9ICdmb250IGNoYW5nZWQnO1xyXG59XHJcblxyXG4vKipcclxuICogUDUgc2V0dXBcclxuICovXHJcbndpbmRvdy5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgLy8gRWxlbWVudHNcclxuICAkY291bnQgPSBkZygnY291bnQnKTtcclxuICAkbnRoID0gZGcoJ250aCcpO1xyXG4gICR0aXRsZSA9IGRnKCd0aXRsZScpO1xyXG4gICRtZXNzYWdlID0gZGcoJ21lc3NhZ2UnKTtcclxuICAkc2hvd1VwZ3JhZGVzID0gZGcoJ3Nob3dVcGdyYWRlcycpO1xyXG4gICR1cGdyYWRlcyA9IGRnKCd1cGdyYWRlcycpO1xyXG4gICRpbnRybyA9IGRnKCdpbnRybycpO1xyXG4gICR0aW1lciA9IGRnKCd0aW1lcicpO1xyXG4gICRnb2FsID0gZGcoJ2dvYWwnKTtcclxuICAkdG90YWxSYXRlID0gZGcoJ3RvdGFsUmF0ZScpO1xyXG4gICRuYW1lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYW1lJyk7XHJcblxyXG4gIGdhbWUgPSBuZXcgTnRoKHtcclxuICAgICRjb3VudDogJGNvdW50LFxyXG4gICAgJG1lc3NhZ2U6ICRtZXNzYWdlLFxyXG4gICAgJHVwZ3JhZGVzOiAkdXBncmFkZXMsXHJcbiAgICAkc2hvd1VwZ3JhZGVzOiAkc2hvd1VwZ3JhZGVzLFxyXG4gICAgJHRpbWVyOiAkdGltZXIsXHJcbiAgICAkaW50cm86ICRpbnRybyxcclxuICAgICR0b3RhbFJhdGU6ICR0b3RhbFJhdGUsXHJcbiAgICAkbnRoOiAkbnRoXHJcbiAgfSk7XHJcbiAgZ2FtZS5pbml0aWFsaXplKCk7XHJcblxyXG4gIC8vIEhhbmRsZXJzXHJcbiAgJHRpdGxlLm9uY2xpY2sgPSBjaGFuZ2VGb250O1xyXG4gICRudGgub25jbGljayA9IGdhbWUuYWRkQ291bnQuYmluZChnYW1lKTtcclxuICAkbmFtZXMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgbmFtZS5vbmNsaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICBnYW1lLnB1cmNoYXNlKG5hbWUucGFyZW50RWxlbWVudC5pZCk7XHJcbiAgICB9O1xyXG4gIH0pO1xyXG4gICRzaG93VXBncmFkZXMub25jbGljayA9IGdhbWUuc2hvd1VwZ3JhZGVzLmJpbmQoZ2FtZSk7XHJcbiAgJGdvYWwuaW5uZXJIVE1MID0gJ2dvYWw6ICcgKyBnYW1lLmdvYWw7XHJcbiAgZ2FtZS5ydW5UaW1lcigpO1xyXG4gIC8vIExvY2sgRlBTIHRvIDMwXHJcbiAgZnJhbWVSYXRlKDMwKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQNSBkcmF3XHJcbiAqL1xyXG53aW5kb3cuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBVcGRhdGUgdGhlIGRvbSwgaW50ZXJuYWwgYWRkZXJzLCBhbmQgZ3Jvd3RoUmF0ZVxyXG4gIGlmIChnYW1lLmFkZGVyc0hhdmVDaGFuZ2VkKSB7XHJcbiAgICBnYW1lLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUoKTtcclxuICB9XHJcbiAgLy8gSW5jcmVhc2VkIHRoZSBnYW1lIGNvdW50IGlmIG5vdCBwYXVzZWRcclxuICBpZiAoZ2FtZS5wYXVzZWQpIHtcclxuICB9IGVsc2Uge1xyXG4gICAgZ2FtZS5ncm93KCk7XHJcbiAgICBnYW1lLnVwZGF0ZVVwZ3JhZGVzV2l0aER1cmF0aW9uKCk7XHJcbiAgICAvLyBTaG93IHRoaXMgaW5jcmVhc2VcclxuICAgICRjb3VudC5pbm5lckhUTUwgPSBnYW1lLmdldENvdW50SHRtbCgpO1xyXG4gIH1cclxufTtcclxuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgZnJhbWVSYXRlICovXHJcbnZhciBOdGggPSByZXF1aXJlKCcuL2NsYXNzZXMvTnRoJyk7XHJcblxyXG4vLyBHbG9iYWxzXHJcbnZhciBmb250cyA9IFsnTnUnLCAnTksnLCAnVlQzMjMnLCAnU3BhY2UgTW9ubyddLFxyXG4gIGZvbnRJbmRleCA9IDAsXHJcbiAgZ2FtZSxcclxuICAkY291bnQsXHJcbiAgJG50aCxcclxuICAkdGl0bGUsXHJcbiAgJG1lc3NhZ2UsXHJcbiAgJHNob3dVcGdyYWRlcyxcclxuICAkdXBncmFkZXMsXHJcbiAgJGludHJvLFxyXG4gICR0aW1lcixcclxuICAkZ29hbCxcclxuICAkbmFtZXMsXHJcbiAgJHRvdGFsUmF0ZTtcclxuLyoqXHJcbiAqIFdyYXBwZXJcclxuICovXHJcbndpbmRvdy5kZyA9IGZ1bmN0aW9uIChlbCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hhbmdlcyB0aGUgYm9keSBmb250XHJcbiAqL1xyXG5mdW5jdGlvbiBjaGFuZ2VGb250ICgpIHtcclxuICBkb2N1bWVudC5ib2R5LnN0eWxlWydmb250LWZhbWlseSddID0gZm9udHNbZm9udEluZGV4KysgJSBmb250cy5sZW5ndGhdO1xyXG4gICRtZXNzYWdlLmlubmVySFRNTCA9ICdmb250IGNoYW5nZWQnO1xyXG59XHJcblxyXG4vKipcclxuICogUDUgc2V0dXBcclxuICovXHJcbndpbmRvdy5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgLy8gRWxlbWVudHNcclxuICAkY291bnQgPSBkZygnY291bnQnKTtcclxuICAkbnRoID0gZGcoJ250aCcpO1xyXG4gICR0aXRsZSA9IGRnKCd0aXRsZScpO1xyXG4gICRtZXNzYWdlID0gZGcoJ21lc3NhZ2UnKTtcclxuICAkc2hvd1VwZ3JhZGVzID0gZGcoJ3Nob3dVcGdyYWRlcycpO1xyXG4gICR1cGdyYWRlcyA9IGRnKCd1cGdyYWRlcycpO1xyXG4gICRpbnRybyA9IGRnKCdpbnRybycpO1xyXG4gICR0aW1lciA9IGRnKCd0aW1lcicpO1xyXG4gICRnb2FsID0gZGcoJ2dvYWwnKTtcclxuICAkdG90YWxSYXRlID0gZGcoJ3RvdGFsUmF0ZScpO1xyXG4gICRuYW1lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYW1lJyk7XHJcblxyXG4gIGdhbWUgPSBuZXcgTnRoKHtcclxuICAgICRjb3VudDogJGNvdW50LFxyXG4gICAgJG1lc3NhZ2U6ICRtZXNzYWdlLFxyXG4gICAgJHVwZ3JhZGVzOiAkdXBncmFkZXMsXHJcbiAgICAkc2hvd1VwZ3JhZGVzOiAkc2hvd1VwZ3JhZGVzLFxyXG4gICAgJHRpbWVyOiAkdGltZXIsXHJcbiAgICAkaW50cm86ICRpbnRybyxcclxuICAgICR0b3RhbFJhdGU6ICR0b3RhbFJhdGUsXHJcbiAgICAkbnRoOiAkbnRoXHJcbiAgfSk7XHJcbiAgZ2FtZS5pbml0aWFsaXplKCk7XHJcblxyXG4gIC8vIEhhbmRsZXJzXHJcbiAgJHRpdGxlLm9uY2xpY2sgPSBjaGFuZ2VGb250O1xyXG4gICRudGgub25jbGljayA9IGdhbWUuYWRkQ291bnQuYmluZChnYW1lKTtcclxuICAkbmFtZXMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgbmFtZS5vbmNsaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICBnYW1lLnB1cmNoYXNlKG5hbWUucGFyZW50RWxlbWVudC5pZCk7XHJcbiAgICB9O1xyXG4gIH0pO1xyXG4gICRzaG93VXBncmFkZXMub25jbGljayA9IGdhbWUuc2hvd1VwZ3JhZGVzLmJpbmQoZ2FtZSk7XHJcbiAgJGdvYWwuaW5uZXJIVE1MID0gJ2dvYWw6ICcgKyBnYW1lLmdvYWw7XHJcbiAgZ2FtZS5ydW5UaW1lcigpO1xyXG4gIC8vIExvY2sgRlBTIHRvIDMwXHJcbiAgZnJhbWVSYXRlKDMwKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQNSBkcmF3XHJcbiAqL1xyXG53aW5kb3cuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBVcGRhdGUgdGhlIGRvbSwgaW50ZXJuYWwgYWRkZXJzLCBhbmQgZ3Jvd3RoUmF0ZVxyXG4gIGlmIChnYW1lLmFkZGVyc0hhdmVDaGFuZ2VkKSB7XHJcbiAgICBnYW1lLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUoKTtcclxuICB9XHJcbiAgLy8gSW5jcmVhc2VkIHRoZSBnYW1lIGNvdW50IGlmIG5vdCBwYXVzZWRcclxuICBpZiAoZ2FtZS5wYXVzZWQpIHtcclxuICB9IGVsc2Uge1xyXG4gICAgZ2FtZS5ncm93KCk7XHJcbiAgICBnYW1lLnVwZGF0ZVVwZ3JhZGVzV2l0aER1cmF0aW9uKCk7XHJcbiAgICAvLyBTaG93IHRoaXMgaW5jcmVhc2VcclxuICAgICRjb3VudC5pbm5lckhUTUwgPSBnYW1lLmdldENvdW50SHRtbCgpO1xyXG4gIH1cclxufTtcclxuIl0sImZpbGUiOiJpbmRleC5qcyJ9
