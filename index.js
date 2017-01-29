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

/* global floor, random, FRAMERATE */
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
  this.$wrap = options.$wrap;

  /**
   * An array of durations and callbacks to be updated each tick
   */
  this.upgradesWithDuration = [];

  /**
   * An array of random spawn events to be updated each tick
   */
  this.randomSpawnEvents = [];

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
  // Update upgrades with fixed duration
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
  // Update random the spawners
  // These don't need cleanup since the array should only grow
  for (var i = 0; i < this.randomSpawnEvents.length; i++) {
    if (!this.randomSpawnEvents[i].nextEventSpawnTimer--) {
      var event = this.randomSpawnEvents[i];
      // Pass game object reference
      event.spawn(this);
    }
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

/**
 * Enables one of the random spawn events
 * @param {String} randomSpawnerName - the name of the upgrade
 */
Nth.prototype.enableRandomSpawner = function (randomSpawnerName) {
  if (randomSpawnerName === 'squares') {
    this.randomSpawnEvents.push({
      nextEventSpawnTimer: floor(random(1, 1.5)) * FRAMERATE,
      spawn: function (nth) {
        var span = document.createElement('span');
        span.classList = 'randomEventSquare';
        span.style.animation = this.duration + 's randomEventSquare 1';
        span.style.top = floor(random(50, 300)) + 'px';
        span.style.left = floor(random(50, 400)) + 'px';
        span.onclick = function () {
          nth.count += 10;
          this.remove();
        };
        nth.$wrap.appendChild(span);
        nth.upgradesWithDuration.push({
          duration: this.duration * FRAMERATE,
          cb: this.cb.bind(this, span)
        });
        this.nextEventSpawnTimer = floor(random(100, 200));
      },
      duration: 2.5,
      cb: function (el) {
        el.remove();
      }
    });
  }
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
      nth.enableRandomSpawner('squares');
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

window.FRAMERATE = 30;

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
  $wrap = dg('wrap');

  game = new Nth({
    $count: $count,
    $message: $message,
    $upgrades: $upgrades,
    $showUpgrades: $showUpgrades,
    $timer: $timer,
    $intro: $intro,
    $totalRate: $totalRate,
    $nth: $nth,
    $wrap: $wrap
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
  frameRate(FRAMERATE);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcbG9nYW5cXERvY3VtZW50c1xccGVyc29uYWxfcHJvamVjdHNcXG50aFxcbm9kZV9tb2R1bGVzXFxndWxwLWJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2NsYXNzZXMvQWRkZXIuanMiLCJDOi9Vc2Vycy9sb2dhbi9Eb2N1bWVudHMvcGVyc29uYWxfcHJvamVjdHMvbnRoL3NyYy9jbGFzc2VzL050aC5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2RhdGEvQWRkZXJzLmpzIiwiQzovVXNlcnMvbG9nYW4vRG9jdW1lbnRzL3BlcnNvbmFsX3Byb2plY3RzL250aC9zcmMvZGF0YS9VcGdyYWRlcy5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2Zha2VfYzcwMzJjMjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG4vKiBnbG9iYWwgZmxvb3IgKi9cclxuLyoqXHJcbiAqIEFkZGVycyBpbmNyZWFzZSB0aGUgcmF0ZSBhdCB3aGljaCB0aGUgTnRoIGNvdW50IGdyb3dzXHJcbiAqL1xyXG52YXIgQWRkZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gIHRoaXMucmF0ZSA9IG9wdGlvbnMucmF0ZTtcclxuICB0aGlzLnVwZGF0ZSA9IG9wdGlvbnMudXBkYXRlRm47XHJcbiAgdGhpcy5nZW5lcmF0ZVIgPSBvcHRpb25zLnJGbjtcclxuICB0aGlzLmNvc3QgPSBvcHRpb25zLmNvc3RGbjtcclxuICB0aGlzLm5hbWUgPSBvcHRpb25zLm5hbWU7XHJcblxyXG4gIC8vIEF1ZGlvIGFzc2V0c1xyXG4gIHRoaXMuYXVkaW8gPSBvcHRpb25zLmF1ZGlvIHx8IGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgdXAgdGhlIGFkZGVyXHJcbiAqL1xyXG5BZGRlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmNvdW50ID0gMDtcclxuICB0aGlzLnVubG9ja2VkID0gZmFsc2U7XHJcbiAgdGhpcy5yID0gdGhpcy5nZW5lcmF0ZVIoKTtcclxuICBpZiAodGhpcy5hdWRpbykge1xyXG4gICAgZm9yICh2YXIgYWN0aW9uTmFtZSBpbiB0aGlzLmF1ZGlvKSB7XHJcbiAgICAgIHZhciBmaWxlbmFtZSA9IHRoaXMuYXVkaW9bYWN0aW9uTmFtZV07XHJcbiAgICAgIHZhciBhdWRpbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XHJcbiAgICAgIGF1ZGlvLmlkID0gdGhpcy5uYW1lICsgJy0nICsgYWN0aW9uTmFtZTtcclxuICAgICAgYXVkaW8uc3JjID0gZmlsZW5hbWU7XHJcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYXVkaW8pO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSBIVE1MIHN0cmluZyBvZiB0aGUgY29zdFxyXG4gKi9cclxuQWRkZXIucHJvdG90eXBlLmdldENvc3RIdG1sID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiAnWycgKyBmbG9vcih0aGlzLmNvc3QoKSkudG9TdHJpbmcoKS5yZXBsYWNlKC9cXEIoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCAnLicpICsgJ10nO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBsYXlzIHRoZSBidWlsZCBzb3VuZFxyXG4gKi9cclxuQWRkZXIucHJvdG90eXBlLnBsYXlCdWlsZFNvdW5kID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBhdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMubmFtZSArICctYnVpbGQnKTtcclxuICBhdWRpby5jdXJyZW50VGltZSA9IDA7XHJcbiAgYXVkaW8ucGxheSgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBsYXlzIHRoZSB1cGdyYWRlIHNvdW5kXHJcbiAqL1xyXG5BZGRlci5wcm90b3R5cGUucGxheVVwZ3JhZGVTb3VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgYXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLm5hbWUgKyAnLXVwZ3JhZGUnKTtcclxuICBhdWRpby5jdXJyZW50VGltZSA9IDA7XHJcbiAgYXVkaW8ucGxheSgpO1xyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFkZGVyO1xyXG4iLCJcclxuLyogZ2xvYmFsIGZsb29yLCByYW5kb20sIEZSQU1FUkFURSAqL1xyXG52YXIgQWRkZXJzID0gcmVxdWlyZSgnLi4vZGF0YS9BZGRlcnMnKTtcclxudmFyIEFkZGVyID0gcmVxdWlyZSgnLi9BZGRlcicpO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBnYW1lIGNsYXNzXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkbWVzc2FnZVxyXG4gKiBAcGFyYW0ge09iamVjdH0gJGNvdW50XHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkdXBncmFkZXNcclxuICogQHBhcmFtIHtPYmplY3R9ICR0aW1lclxyXG4gKiBAcGFyYW0ge09iamVjdH0gJHNob3dVcGdyYWRlc1xyXG4gKiBAcGFyYW0ge09iamVjdH0gJGludHJvXHJcbiAqL1xyXG52YXIgTnRoID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICB0aGlzLiRtZXNzYWdlID0gb3B0aW9ucy4kbWVzc2FnZTtcclxuICB0aGlzLiRjb3VudCA9IG9wdGlvbnMuJGNvdW50O1xyXG4gIHRoaXMuJHVwZ3JhZGVzID0gb3B0aW9ucy4kdXBncmFkZXM7XHJcbiAgdGhpcy4kdGltZXIgPSBvcHRpb25zLiR0aW1lcjtcclxuICB0aGlzLiRzaG93VXBncmFkZXMgPSBvcHRpb25zLiRzaG93VXBncmFkZXM7XHJcbiAgdGhpcy4kaW50cm8gPSBvcHRpb25zLiRpbnRybztcclxuICB0aGlzLiR0b3RhbFJhdGUgPSBvcHRpb25zLiR0b3RhbFJhdGU7XHJcbiAgdGhpcy4kbnRoID0gb3B0aW9ucy4kbnRoO1xyXG4gIHRoaXMuJHdyYXAgPSBvcHRpb25zLiR3cmFwO1xyXG5cclxuICAvKipcclxuICAgKiBBbiBhcnJheSBvZiBkdXJhdGlvbnMgYW5kIGNhbGxiYWNrcyB0byBiZSB1cGRhdGVkIGVhY2ggdGlja1xyXG4gICAqL1xyXG4gIHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb24gPSBbXTtcclxuXHJcbiAgLyoqXHJcbiAgICogQW4gYXJyYXkgb2YgcmFuZG9tIHNwYXduIGV2ZW50cyB0byBiZSB1cGRhdGVkIGVhY2ggdGlja1xyXG4gICAqL1xyXG4gIHRoaXMucmFuZG9tU3Bhd25FdmVudHMgPSBbXTtcclxuXHJcbiAgLyoqXHJcbiAgICogRmxhZ3MgdGhlIHVwZ3JhZGVzIGFycmF5IGZvciBhIHNsaWNlIG9wZXJhdGlvblxyXG4gICAqL1xyXG4gIHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb25BcnJheU5lZWRzQ2xlYW51cCA9IGZhbHNlO1xyXG59O1xyXG5cclxuTnRoLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIExvYWQgYWRkZXJzXHJcbiAgdGhpcy5hZGRlcnMgPSB7fTtcclxuICBmb3IgKHZhciBhZGRlciBpbiBBZGRlcnMpIHtcclxuICAgIHRoaXMuYWRkZXJzW2FkZGVyXSA9IG5ldyBBZGRlcihBZGRlcnNbYWRkZXJdKTtcclxuICAgIHRoaXMuYWRkZXJzW2FkZGVyXS5pbml0aWFsaXplKCk7XHJcbiAgfVxyXG5cclxuICAvLyBAVE9ETyBtYWtlIHZvbHVtZSBjb250cm9sc1xyXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2F1ZGlvJykuZm9yRWFjaChmdW5jdGlvbiAoYXVkaW8pIHtcclxuICAgIGF1ZGlvLnZvbHVtZSA9IDAuMTtcclxuICB9KTtcclxuXHJcbiAgLy8gVW5sb2NrIGxpdHRsZSBkZWx0YSBieSBkZWZhdWx0XHJcbiAgdGhpcy5hZGRlcnMuZGVsdGEudW5sb2NrZWQgPSB0cnVlO1xyXG4gIC8vIFRoZSB0b3RhbCBjb3VudCB1c2VkIGZvciBwdXJjaGFzaW5nIGFkZGVyc1xyXG4gIHRoaXMuY291bnQgPSAxMDAwMDA7XHJcbiAgLy8gTnVtYmVyIHRvIGluY3JlYWVzIGNvdW50IGJ5IGZvciBlYWNoIGNsaWNrXHJcbiAgdGhpcy5jbGlja1ZhbHVlID0gMTtcclxuICAvLyBUaW1lIGluIHNlY29uZHNcclxuICB0aGlzLmdhbWVUaW1lID0gMDtcclxuICAvLyBHb2FsIHRvIGdldCB0b1xyXG4gIHRoaXMuZ29hbCA9IDEwMDAwMDA7XHJcbiAgdGhpcy5ncm93dGhSYXRlID0gMDtcclxuICB0aGlzLmFkZGVyc0hhdmVDaGFuZ2VkID0gdHJ1ZTtcclxuICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xyXG4gIC8vIFRoZXNlIHVwZ3JhZGVzIHNob3VsZCBiZSBjbGFzc2VzIGFuZCB0aGV5IHNob3VsZCBtb2RpZnkgYWRkZXJzXHJcbiAgLy8gdGhyb3VnaCBhIG1ldGhvZCBvZiB0aGUgYWRkZXJzIHRoZW1zZWx2ZXNcclxuICB0aGlzLnVwZ3JhZGVzID0gcmVxdWlyZSgnLi4vZGF0YS9VcGdyYWRlcycpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEF0dGVtcHRzIHRvIHB1cmNoYXNlIGFuIGFkZGVyXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgYWRkZXJcclxuICovXHJcbk50aC5wcm90b3R5cGUucHVyY2hhc2UgPSBmdW5jdGlvbiAobmFtZSkge1xyXG4gIHZhciBhZGRlciA9IHRoaXMuYWRkZXJzW25hbWVdO1xyXG4gIC8vIFlvdSBjYW4gb25seSBhdHRlbXB0IHRvIHB1cmNoYXNlIHVubG9ja2VkIGFkZGVyc1xyXG4gIGlmIChhZGRlci51bmxvY2tlZCkge1xyXG4gICAgdmFyIGNvc3QgPSBhZGRlci5jb3N0KCk7XHJcbiAgICBpZiAodGhpcy5jb3VudCA+PSBjb3N0KSB7XHJcbiAgICAgIC8vIFB1cmNoYXNlIGZyb20gdGhlIHRvdGFsIGNvdW50XHJcbiAgICAgIHRoaXMuY291bnQgLT0gY29zdDtcclxuICAgICAgLy8gSW5jcmVtZW50IHRoZSBudW1iZXIgb2Ygb3duZWQgYWRkZXJzIG9mIHRoYXQgdHlwZVxyXG4gICAgICBhZGRlci5jb3VudCsrO1xyXG4gICAgICB0aGlzLmFkZGVyc0hhdmVDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgLy8gVXBkYXRlIERPTVxyXG4gICAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICdwdXJjaGFzZWQgJyArIG5hbWUgKyAnLic7XHJcbiAgICAgIC8vIFBsYXkgYXVkaW9cclxuICAgICAgYWRkZXIucGxheUJ1aWxkU291bmQoKTtcclxuICAgICAgLy8gSWYgdGhlcmUncyBhbiB1cGRhdGUgZnVuY3Rpb24gb24gdGhlIGFkZGVyLCB1cGRhdGVcclxuICAgICAgaWYgKGFkZGVyLnVwZGF0ZSkge1xyXG4gICAgICAgIGFkZGVyLnVwZGF0ZSgpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIFRoZSBmaXJzdCB0aW1lIHNvbWV0aGluZyBpcyBwdXJjaGFzZWQsIHVubG9jayB0aGUgbmV4dFxyXG4gICAgICBpZiAoYWRkZXIuY291bnQgPT09IDEpIHtcclxuICAgICAgICB2YXIgbmV4dCA9IHdpbmRvdy5kZyhuYW1lKS5uZXh0U2libGluZy5uZXh0U2libGluZztcclxuICAgICAgICBpZiAobmV4dCkge1xyXG4gICAgICAgICAgdGhpcy5hZGRlcnNbbmV4dC5pZF0udW5sb2NrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgKz0gJyB1bmxvY2tlZCAnICsgbmV4dC5pZCArICcuJztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuJG1lc3NhZ2UuaW5uZXJIVE1MID0gJ2Nhbm5vdCBhZmZvcmQgdG8gcHVyY2hhc2UgJyArIG5hbWU7XHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMuJG1lc3NhZ2UuaW5uZXJIVE1MID0gbmFtZSArICcgaGFzIG5vdCBiZWVuIHVubG9ja2VkIHlldC4nO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBTaG93cyB0aGUgdXBncmFkZXMgdGFibGVcclxuICpcclxuICovXHJcbk50aC5wcm90b3R5cGUuc2hvd1VwZ3JhZGVzID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuJGludHJvLnJlbW92ZSgpO1xyXG4gIHRoaXMuJHNob3dVcGdyYWRlcy5yZW1vdmUoKTtcclxuICB0aGlzLnVwZ3JhZGVzLmZvckVhY2goZnVuY3Rpb24gKHVwZ3JhZGUpIHtcclxuICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIGRpdi5jbGFzc0xpc3QgKz0gJ3VwZ3JhZGUgJyArIHVwZ3JhZGUudGFyZ2V0O1xyXG4gICAgZGl2LmlubmVySFRNTCA9IHVwZ3JhZGUuZGVzYyArICdcXHRbJyArIHVwZ3JhZGUuY29zdCArICddJztcclxuICAgIGRpdi5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcclxuICAgICAgdGhpcy5wdXJjaGFzZVVwZ3JhZGUodXBncmFkZS5pZCk7XHJcbiAgICAgIGlmICh1cGdyYWRlLmVuYWJsZWQpIHtcclxuICAgICAgICBlLnRhcmdldC5jbGFzc0xpc3QgKz0gJyBlbmFibGVkJztcclxuICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdGhpcy4kdXBncmFkZXMuYXBwZW5kQ2hpbGQoZGl2KTtcclxuICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgY2xpY2sgdmFsdWUgd2hlbiBudGggYnV0dG9uIGlzIHByZXNzZWRcclxuICovXHJcbk50aC5wcm90b3R5cGUuYWRkQ291bnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5wbGF5TnRoU291bmQoKTtcclxuICB0aGlzLmNvdW50ICs9IHRoaXMuY2xpY2tWYWx1ZTtcclxuICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICcuIC4gLic7XHJcbn07XHJcblxyXG4vKipcclxuICogR3Jvd3MgdGhlIGNvdW50XHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLmdyb3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKHRoaXMuY291bnQgKyB0aGlzLmdyb3d0aFJhdGUgPj0gdGhpcy5nb2FsKSB7XHJcbiAgICB0aGlzLmNvdW50ID0gdGhpcy5nb2FsO1xyXG4gICAgdGhpcy5zdG9wVGltZXIoKTtcclxuICAgIHRoaXMuJG50aC5vbmNsaWNrID0gZnVuY3Rpb24gKCkge307XHJcbiAgICB0aGlzLiRudGguaW5uZXJUZXh0ID0gJ1lvdSBXaW4nO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmNvdW50ICs9IHRoaXMuZ3Jvd3RoUmF0ZTtcclxuICB9XHJcbn07XHJcblxyXG5OdGgucHJvdG90eXBlLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmVzZXQgZ3Jvd3RoUmF0ZVxyXG4gIHRoaXMuZ3Jvd3RoUmF0ZSA9IDA7XHJcbiAgZm9yICh2YXIgYWRkZXIgaW4gdGhpcy5hZGRlcnMpIHtcclxuICAgIHZhciBhID0gdGhpcy5hZGRlcnNbYWRkZXJdO1xyXG4gICAgLy8gT25seSBzaG93IGNvc3QsIGNvdW50LCBhbmQgcmF0ZSBpZiB1bmxvY2tlZFxyXG4gICAgaWYgKGEudW5sb2NrZWQpIHtcclxuICAgICAgdmFyICRjb3N0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLmNvc3QnKVswXTtcclxuICAgICAgJGNvc3QuaW5uZXJIVE1MID0gYS5nZXRDb3N0SHRtbCgpO1xyXG4gICAgICB2YXIgJGNvdW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLmNvdW50JylbMF07XHJcbiAgICAgIHZhciBzdHIgPSAnJztcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmNvdW50OyBpKyspIHtcclxuICAgICAgICBzdHIgKz0gJyYnICsgYWRkZXIgKyAnOyc7XHJcbiAgICAgIH1cclxuICAgICAgJGNvdW50LmlubmVySFRNTCA9IHN0ciB8fCAnLSc7XHJcbiAgICAgIHZhciAkdG90YWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcjJyArIGFkZGVyICsgJyAudG90YWwnKVswXTtcclxuICAgICAgJHRvdGFsLmlubmVySFRNTCA9IGFkZGVyICsgJyB0b3RhbCAnICsgYS5jb3VudDtcclxuICAgICAgdmFyICRyYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLnJhdGUnKVswXTtcclxuICAgICAgaWYgKGEuY291bnQpIHtcclxuICAgICAgICAkcmF0ZS5pbm5lckhUTUwgPSAncmF0ZTogJyArIChhLmNvdW50ICogYS5yYXRlKS50b0ZpeGVkKDMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgICRyYXRlLmlubmVySFRNTCA9ICdyYXRlOiB7eycgKyBhLnJhdGUudG9GaXhlZCgzKSArICd9fSc7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIElmIHRoZXJlJ3MgYXQgbGVhc3Qgb25lIGFkZGVyLCB1cGRhdGUgdGhlIGdyb3d0aFJhdGVcclxuICAgIGlmIChhLmNvdW50KSB7XHJcbiAgICAgIHRoaXMuZ3Jvd3RoUmF0ZSArPSBhLmNvdW50ICogYS5yYXRlO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBVcGRhdGUgdGhlIHRvdGFsIGdyb3d0aCByYXRlXHJcbiAgdGhpcy4kdG90YWxSYXRlLmlubmVySFRNTCA9ICdyYXRlOiAnICsgdGhpcy5ncm93dGhSYXRlLnRvRml4ZWQoMyk7XHJcbiAgdGhpcy5hZGRlcnNIYXZlQ2hhbmdlZCA9IGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFB1cmNoYXNlcyB0aGUgdXBncmFkZSBvciByZXNwb25kcyB0aGF0IHRoZSB1cGdyYWRlIGNhbid0IGJlIHB1cmNoc2VkXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCAtIHRoZSBpZCBvZiB0aGUgdXBncmFkZVxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5wdXJjaGFzZVVwZ3JhZGUgPSBmdW5jdGlvbiAoaWQpIHtcclxuICB2YXIgdXBncmFkZTtcclxuICAvLyBHZXRzIHRoZSB1cGdyYWRlIHdpdGggdGhlIGlkIHByb3ZpZGVkXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnVwZ3JhZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodGhpcy51cGdyYWRlc1tpXS5pZCA9PSBpZCkge1xyXG4gICAgICB1cGdyYWRlID0gdGhpcy51cGdyYWRlc1tpXTtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIENhbid0IHJlYnV5IHB1cmNoYXNlZCB1cGdyYWRlc1xyXG4gIGlmICghdXBncmFkZS5lbmFibGVkKSB7XHJcbiAgICAvLyBPbmx5IGJ1eSBpZiBhZmZvcmRhYmxlXHJcbiAgICBpZiAodGhpcy5jb3VudCA+PSB1cGdyYWRlLmNvc3QpIHtcclxuICAgICAgdGhpcy5jb3VudCAtPSB1cGdyYWRlLmNvc3Q7XHJcbiAgICAgIHVwZ3JhZGUuZW5hYmxlKHRoaXMpO1xyXG4gICAgICB1cGdyYWRlLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAvLyBQbGF5IHRoZSB1cGdyYWRlIHNvdW5kIGZvciB0aGUgdGFyZ2V0XHJcbiAgICAgIGlmICh1cGdyYWRlLnRhcmdldCA9PT0gJ250aCcpIHtcclxuICAgICAgICB0aGlzLnBsYXlVcGdyYWRlU291bmQodXBncmFkZS5pZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5hZGRlcnNbdXBncmFkZS50YXJnZXRdLnBsYXlVcGdyYWRlU291bmQoKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBBZGQgdGhlIHVwZ3JhZGUgdG8gdGhlIHVwZ3JhZGVzV2l0aER1cmF0aW9uIGFycmF5IGlmIGFwcGxpY2FibGVcclxuICAgICAgaWYgKHVwZ3JhZGUuZHVyYXRpb24pIHtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uLnB1c2goe1xyXG4gICAgICAgICAgZHVyYXRpb246IHVwZ3JhZGUuZHVyYXRpb24sXHJcbiAgICAgICAgICBjYjogdXBncmFkZS5jYlxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIFRlbGwgUDUgdGhpbmdzIGhhdmUgY2hhbmdlZFxyXG4gICAgICB0aGlzLmFkZGVyc0hhdmVDaGFuZ2VkID0gdHJ1ZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuJG1lc3NhZ2UuaW5uZXJIVE1MID0gJ2Nhbm5vdCBhZmZvcmQgdXBncmFkZSBmb3IgJyArIHVwZ3JhZGUudGFyZ2V0ICsgJy4nO1xyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICdjYW5ub3QgcmVidXkgdXBncmFkZS4nO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSdW5zIHRoZSBnYW1lIHRpbWVyLCB1cGRhdGluZyB0aGUgZ2FtZSBhbmQgdGhlIERPTSBzaW11bHRhbmVvdXNseVxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5ydW5UaW1lciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmdhbWVUaW1lKys7XHJcbiAgdGhpcy4kdGltZXIuaW5uZXJIVE1MID0gdGhpcy5nYW1lVGltZSArICdzJztcclxuICB0aGlzLnRpbWVySWQgPSBzZXRUaW1lb3V0KHRoaXMucnVuVGltZXIuYmluZCh0aGlzKSwgMTAwMCk7XHJcbn07XHJcblxyXG5OdGgucHJvdG90eXBlLnN0b3BUaW1lciA9IGZ1bmN0aW9uICgpIHtcclxuICBjbGVhclRpbWVvdXQodGhpcy50aW1lcklkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgLSB0aGUgdXBncmFkZSBpZFxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5wbGF5VXBncmFkZVNvdW5kID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgdmFyIGF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ250aF91cGdyYWRlX2lkXycgKyBpZCk7XHJcbiAgYXVkaW8uY3VycmVudFRpbWUgPSAwO1xyXG4gIGF1ZGlvLnBsYXkoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSBmb3JtYXR0ZWQgY291bnQgaHRtbFxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5nZXRDb3VudEh0bWwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIGZsb29yKHRoaXMuY291bnQpLnRvU3RyaW5nKCkucmVwbGFjZSgvXFxCKD89KFxcZHszfSkrKD8hXFxkKSkvZywgJy4nKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBVcGdyYWRlcyBhbGwgdXBncmFkZXMgdGhhdCBoYXZlIGEgc2V0IGR1cmF0aW9uLCBjYWxsaW5nIHRoZWlyXHJcbiAqIGNiIGZ1bmN0aW9uIG9uY2UgdGhlIGR1cmF0aW9uIGhhcyBleHBpcmVkXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLnVwZGF0ZVVwZ3JhZGVzV2l0aER1cmF0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIFVwZGF0ZSB1cGdyYWRlcyB3aXRoIGZpeGVkIGR1cmF0aW9uXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoIXRoaXMudXBncmFkZXNXaXRoRHVyYXRpb25baV0uZHVyYXRpb24tLSkge1xyXG4gICAgICB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uW2ldLmNiKCk7XHJcbiAgICAgIGRlbGV0ZSB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uW2ldO1xyXG4gICAgICB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uQXJyYXlOZWVkc0NsZWFudXAgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAodGhpcy51cGdyYWRlc1dpdGhEdXJhdGlvbkFycmF5TmVlZHNDbGVhbnVwKSB7XHJcbiAgICB0aGlzLnVwZ3JhZGVzV2l0aER1cmF0aW9uID0gdGhpcy51cGdyYWRlc1dpdGhEdXJhdGlvbi5maWx0ZXIoZnVuY3Rpb24gKHVwZ3JhZGUpIHtcclxuICAgICAgcmV0dXJuIEJvb2xlYW4odXBncmFkZSk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMudXBncmFkZXNXaXRoRHVyYXRpb25BcnJheU5lZWRzQ2xlYW51cCA9IGZhbHNlO1xyXG4gIH1cclxuICAvLyBVcGRhdGUgcmFuZG9tIHRoZSBzcGF3bmVyc1xyXG4gIC8vIFRoZXNlIGRvbid0IG5lZWQgY2xlYW51cCBzaW5jZSB0aGUgYXJyYXkgc2hvdWxkIG9ubHkgZ3Jvd1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYW5kb21TcGF3bkV2ZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKCF0aGlzLnJhbmRvbVNwYXduRXZlbnRzW2ldLm5leHRFdmVudFNwYXduVGltZXItLSkge1xyXG4gICAgICB2YXIgZXZlbnQgPSB0aGlzLnJhbmRvbVNwYXduRXZlbnRzW2ldO1xyXG4gICAgICAvLyBQYXNzIGdhbWUgb2JqZWN0IHJlZmVyZW5jZVxyXG4gICAgICBldmVudC5zcGF3bih0aGlzKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogUGxheXMgdGhlIGNsaWNrIHNvdW5kXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLnBsYXlOdGhTb3VuZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgYXVkaW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbnRoX2NsaWNrX3NvdW5kJyk7XHJcbiAgYXVkaW8uY3VycmVudFRpbWUgPSAwO1xyXG4gIGF1ZGlvLnBsYXkoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmFibGVzIG9uZSBvZiB0aGUgcmFuZG9tIHNwYXduIGV2ZW50c1xyXG4gKiBAcGFyYW0ge1N0cmluZ30gcmFuZG9tU3Bhd25lck5hbWUgLSB0aGUgbmFtZSBvZiB0aGUgdXBncmFkZVxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5lbmFibGVSYW5kb21TcGF3bmVyID0gZnVuY3Rpb24gKHJhbmRvbVNwYXduZXJOYW1lKSB7XHJcbiAgaWYgKHJhbmRvbVNwYXduZXJOYW1lID09PSAnc3F1YXJlcycpIHtcclxuICAgIHRoaXMucmFuZG9tU3Bhd25FdmVudHMucHVzaCh7XHJcbiAgICAgIG5leHRFdmVudFNwYXduVGltZXI6IGZsb29yKHJhbmRvbSgxLCAxLjUpKSAqIEZSQU1FUkFURSxcclxuICAgICAgc3Bhd246IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgICB2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgICAgICBzcGFuLmNsYXNzTGlzdCA9ICdyYW5kb21FdmVudFNxdWFyZSc7XHJcbiAgICAgICAgc3Bhbi5zdHlsZS5hbmltYXRpb24gPSB0aGlzLmR1cmF0aW9uICsgJ3MgcmFuZG9tRXZlbnRTcXVhcmUgMSc7XHJcbiAgICAgICAgc3Bhbi5zdHlsZS50b3AgPSBmbG9vcihyYW5kb20oNTAsIDMwMCkpICsgJ3B4JztcclxuICAgICAgICBzcGFuLnN0eWxlLmxlZnQgPSBmbG9vcihyYW5kb20oNTAsIDQwMCkpICsgJ3B4JztcclxuICAgICAgICBzcGFuLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBudGguY291bnQgKz0gMTA7XHJcbiAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgbnRoLiR3cmFwLmFwcGVuZENoaWxkKHNwYW4pO1xyXG4gICAgICAgIG50aC51cGdyYWRlc1dpdGhEdXJhdGlvbi5wdXNoKHtcclxuICAgICAgICAgIGR1cmF0aW9uOiB0aGlzLmR1cmF0aW9uICogRlJBTUVSQVRFLFxyXG4gICAgICAgICAgY2I6IHRoaXMuY2IuYmluZCh0aGlzLCBzcGFuKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMubmV4dEV2ZW50U3Bhd25UaW1lciA9IGZsb29yKHJhbmRvbSgxMDAsIDIwMCkpO1xyXG4gICAgICB9LFxyXG4gICAgICBkdXJhdGlvbjogMi41LFxyXG4gICAgICBjYjogZnVuY3Rpb24gKGVsKSB7XHJcbiAgICAgICAgZWwucmVtb3ZlKCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTnRoO1xyXG4iLCJcclxuLyogZ2xvYmFsIGZsb29yLCByYW5kb20gKi9cclxuLyoqXHJcbiAqIEBzY2hlbWFcclxuICogcmF0ZSBAdHlwZSB7TnVtYmVyfSAtIHRoZSBwZXIgYWRkZXIgZ3Jvd3RoIHJhdGVcclxuICogdXBkYXRlRm4gQHR5cGUge0Z1bmN0aW9ufSAtIHRoZSB1cGRhdGUgZnVuY3Rpb25cclxuICogckZuIEB0eXBlIHtGdW5jdGlvbn0gLSB0aGUgZnVuY3Rpb24gdG8gY3JlYXRlIHRoZSBpbml0aWFsIGNvc3QgcmF0ZSBhZGp1c3RtZW50XHJcbiAqIGNvc3RGbiBAdHlwZSB7RnVuY3Rpb259IC0gdGhlIGZ1bmN0aW9uIHRvIGRldGVybWluZSB0aGUgY29zdCBvZiB0aGUgbmV4dCBwdXJjaGFzZVxyXG4gKiBjb3N0SHRtbEZuIEB0eXBlIHtGdW5jdGlvbn0gLSB0aGUgZnVuY3Rpb24gdG8gcmV0dXJuIHRoZSBtYXJrdXAgZm9yIHRoZSBuZXh0IGNvc3RcclxuICovXHJcbnZhciBBZGRlcnMgPSB7XHJcbiAgZGVsdGE6IHtcclxuICAgIG5hbWU6ICdkZWx0YScsXHJcbiAgICByYXRlIDogMC4wMDEsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAodGhpcy5jb3VudCAqIDEwKSArIDEwO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9kZWx0YV9idWlsZC53YXYnLFxyXG4gICAgICAvLyBUaGlzIG5lZWRzIHRvIGJlIGNoYW5nZWQgLSBzYW1lIGFzIGFscGhhIHVwZ3JhZGVcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvZGVsdGFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBTaWdtYToge1xyXG4gICAgbmFtZTogJ1NpZ21hJyxcclxuICAgIHJhdGUgOiAwLjAwNSxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gZmxvb3IocmFuZG9tKDUsMTApKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGUgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuciA9IGZsb29yKHJhbmRvbSh0aGlzLmNvdW50ICogMTAsIHRoaXMuY291bnQgKiAyMCkpO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKGMpIHtcclxuICAgICAgcmV0dXJuICgodGhpcy5jb3VudCArIDEpICogMjUpICsgdGhpcy5yO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9iaWdfc2lnbWFfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvYmlnX3NpZ21hX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgRGVsdGE6IHtcclxuICAgIG5hbWU6ICdEZWx0YScsXHJcbiAgICByYXRlIDogMC4wMSxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gZmxvb3IocmFuZG9tKDUwLDE1MCkpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5yID0gZmxvb3IocmFuZG9tKDUwLDE1MCkpICogdGhpcy5jb3VudDtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICgodGhpcy5jb3VudCArIDEpICogMTAwKSArIHRoaXMucjtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvYmlnX2RlbHRhX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2JpZ19kZWx0YV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIHJobzoge1xyXG4gICAgbmFtZTogJ3JobycsXHJcbiAgICByYXRlIDogMC4wOCxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gZmxvb3IocmFuZG9tKDUwLDE1MCkpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5yID0gdGhpcy5jb3VudCAqIGZsb29yKHJhbmRvbSg1MCwxNTApKTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICgodGhpcy5jb3VudCArIDEpICogMjI1KSArIHRoaXMucjtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvcmhvX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL3Job191cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIGxhbWJkYToge1xyXG4gICAgbmFtZTogJ2xhbWJkYScsXHJcbiAgICByYXRlIDogMC4xNCxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gZmxvb3IocmFuZG9tKDE1MCwgMjAwKSk7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAodGhpcy5jb3VudCArIDEpICogdGhpcy5yO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9sYW1iZGFfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvbGFtYmRhX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgcGk6IHtcclxuICAgIG5hbWU6ICdwaScsXHJcbiAgICByYXRlIDogMC44LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBNYXRoLlBJICogdGhpcy5jb3VudCAqIDEwMDAwO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKHRoaXMuY291bnQgKyAxICogMTIwMDApICsgdGhpcy5yICsgZmxvb3IocmFuZG9tKDEsMjAwMDApKTtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvcGlfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvcGlfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBhbHBoYToge1xyXG4gICAgbmFtZTogJ2FscGhhJyxcclxuICAgIHJhdGUgOiAxLjc3LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBmbG9vcihyYW5kb20oMjAwMCwzMDAwKSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnIgPSBmbG9vcihyYW5kb20oMjAwMCwzMDAwKSkgKiB0aGlzLmNvdW50O1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKHRoaXMuY291bnQgKiA0MDAwMCkgKyB0aGlzLnI7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2FscGhhX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2FscGhhX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgc2lnbWE6IHtcclxuICAgIG5hbWU6ICdzaWdtYScsXHJcbiAgICByYXRlIDogMy41LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5jb3VudCAqIDIwMDAwO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9zaWdtYV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9zaWdtYV91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIExhbWJkYToge1xyXG4gICAgbmFtZTogJ0xhbWJkYScsXHJcbiAgICByYXRlOiAxMCxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuY291bnQgKiAyMzAwMDtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvYmlnX2xhbWJkYV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9iaWdfbGFtYmRhX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgb21lZ2E6IHtcclxuICAgIG5hbWU6ICdvbWVnYScsXHJcbiAgICByYXRlOiAyMCxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDIwMDAwICogdGhpcy5yICogdGhpcy5jb3VudDtcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvb21lZ2FfYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvb21lZ2FfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBlcHNpbG9uOiB7XHJcbiAgICBuYW1lOiAnZXBzaWxvbicsXHJcbiAgICByYXRlOiA3NSxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDEyNTAwMCAqIHRoaXMuY291bnQgKyBmbG9vcihyYW5kb20oMTAwMDAsIDI1MDAwKSk7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2Vwc2lsb25fYnVpbGQud2F2JyxcclxuICAgICAgdXBncmFkZTogJy9zb3VuZHMvZXBzaWxvbl91cGdyYWRlLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIFBzaToge1xyXG4gICAgbmFtZTogJ1BzaScsXHJcbiAgICByYXRlOiAyNTAsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiA2MDAwMDAgKiB0aGlzLmNvdW50O1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9iaWdfcHNpX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2JpZ19wc2lfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFkZGVycztcclxuIiwiXHJcbi8qKlxyXG4gKiBAc2NoZW1hXHJcbiAqIEB0eXBlIHtOdW1iZXJ9IGlkIC0gdGhlIHVwZ3JhZGUgaWRcclxuICogQHR5cGUge1N0cmluZ30gdGFyZ2V0IC0gdGhlIHRhcmdldCBvZiB0aGUgdXBncmFkZVxyXG4gKiB0aGlzIGNhbiBiZSBudGggKHRoZSBnYW1lIGl0c2VsZikgb3IgYW4gYWRkZXJcclxuICogQHR5cGUge051bWJlcn0gY29zdCAtIHRoZSBjb3N0IG9mIHRoZSB1cGdyYWRlXHJcbiAqIEB0eXBlIHtTdHJpbmd9IGRlc2NyaXB0aW9uIC0gdGhlIGRlc2NyaXB0aW9uIG9mIHRoZSB1cGdyYWRlXHJcbiAqIEB0eXBlIHtGdW5jdGlvbn0gZW5hYmxlIC0gd2hhdCBoYXBwZW5zIHdoZW4gdGhlIHVwZ3JhZGUgaXMgZW5hYmxlZFxyXG4gKiBpbiBzb21lIGNhc2VzLCB0aGlzIGNoYW5nZXMgdGhlIHJhdGUgb2YgdGhlIHRhcmdldCwgaW4gb3RoZXJzLCBpdFxyXG4gKiBtb2RpZmllcyB0aGUgZ2FtZSBpdHNlbGYgdG8gcHJvdmlkZSBwaWNrdXBzLCBldGMuXHJcbiAqIGluIHRoZSBsYXR0ZXIgY2FzZSwgdGhlIHRhcmdldCBtdXN0IGJlIG50aCBhbmQgbXVzdFxyXG4gKiBjYWxsIGEgZnVuY3Rpb24gd2hpY2ggZW5iYWxlcyBudGhcclxuICogICAgQHBhcmFtIHtPYmplY3Q8TnRoPn0gbnRoIC0gdGhlIGdhbWUgb2JqZWN0IGlzIEFMV0FZU1xyXG4gKiAgICBwYXNzZWQgdG8gdGhlIGVuYWJsZSBmdW5jdGlvblxyXG4gKi9cclxudmFyIFVwZ3JhZGVzID0gW1xyXG4gIHtcclxuICAgIGlkIDogMCxcclxuICAgIHRhcmdldCA6ICdudGgnLFxyXG4gICAgY29zdCA6IDQ1MCxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIG50aCB2YWx1ZSB0byAyJyxcclxuICAgIC8qKlxyXG4gICAgICogQGRlc2NyaXB0aW9uIC0gbW9kaWZpZXMgdGhlIGNsaWNrIHZhbHVlIG9mIHRoZSBnYW1lXHJcbiAgICAgKi9cclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmNsaWNrVmFsdWUgPSAyO1xyXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd3JhcCcpLnN0eWxlLmFuaW1hdGlvbiA9ICdudGhfdXBncmFkZV9pZF8wICcgKyB0aGlzLmR1cmF0aW9uIC8gMzAgKyAncyAxJztcclxuICAgIH0sXHJcbiAgICBkdXJhdGlvbjogMzAwLFxyXG4gICAgY2I6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dyYXAnKS5zdHlsZS5hbmltYXRpb24gPSAnJztcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogMSxcclxuICAgIHRhcmdldCA6ICdkZWx0YScsXHJcbiAgICBjb3N0IDogNjUwMCxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIGRlbHRhIHJhdGUgdG8gMC4wMDMnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguZW5hYmxlUmFuZG9tU3Bhd25lcignc3F1YXJlcycpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiAyLFxyXG4gICAgdGFyZ2V0IDonU2lnbWEnLFxyXG4gICAgY29zdCA6IDEyMDAwLFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgU2lnbWEgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5TaWdtYS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogMTMsXHJcbiAgICB0YXJnZXQgOiAnbnRoJyxcclxuICAgIGNvc3QgOiAyMDAwLFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgbnRoIHZhbHVlIHRvIDMnLFxyXG4gICAgLyoqXHJcbiAgICAgKiBAZGVzY3JpcHRpb24gLSBtb2RpZmllcyB0aGUgY2xpY2sgdmFsdWUgb2YgdGhlIGdhbWVcclxuICAgICAqL1xyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguY2xpY2tWYWx1ZSA9IDM7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDMsXHJcbiAgICB0YXJnZXQgOidEZWx0YScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBEZWx0YSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLkRlbHRhLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiA0LFxyXG4gICAgdGFyZ2V0IDoncmhvJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIHJobyByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLnJoby5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogNSxcclxuICAgIHRhcmdldCA6J2xhbWJkYScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBsYW1iZGEgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5sYW1iZGEucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDYsXHJcbiAgICB0YXJnZXQgOidwaScsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBwaSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLnBpLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiA3LFxyXG4gICAgdGFyZ2V0IDonYWxwaGEnLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgYWxwaGEgcmF0ZSB0byAwLjE0JyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5hbHBoYS5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogOCxcclxuICAgIHRhcmdldCA6J3NpZ21hJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIHNpZ21hIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMuc2lnbWEucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDksXHJcbiAgICB0YXJnZXQgOidMYW1iZGEnLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgTGFtYmRhIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMuTGFtYmRhLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH0sXHJcbiAge1xyXG4gICAgaWQgOiAxMCxcclxuICAgIHRhcmdldCA6J29tZWdhJyxcclxuICAgIGNvc3QgOiAyNSxcclxuICAgIGRlc2MgOiAnaW5jcmVhc2VzIG9tZWdhIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMub21lZ2EucmF0ZSA9IDAuMTQ7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDExLFxyXG4gICAgdGFyZ2V0IDonZXBzaWxvbicsXHJcbiAgICBjb3N0IDogMjUsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBlcHNpbG9uIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMuZXBzaWxvbi5yYXRlID0gMC4xNDtcclxuICAgIH1cclxuICB9LFxyXG4gIHtcclxuICAgIGlkIDogMTIsXHJcbiAgICB0YXJnZXQgOidQc2knLFxyXG4gICAgY29zdCA6IDI1LFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgUHNpIHJhdGUgdG8gMC4xNCcsXHJcbiAgICBlbmFibGUgOiBmdW5jdGlvbiAobnRoKSB7XHJcbiAgICAgIG50aC5hZGRlcnMuUHNpLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH1cclxuXTtcclxubW9kdWxlLmV4cG9ydHMgPSBVcGdyYWRlcztcclxuIiwiLyogZ2xvYmFsIGZyYW1lUmF0ZSAqL1xyXG52YXIgTnRoID0gcmVxdWlyZSgnLi9jbGFzc2VzL050aCcpO1xyXG5cclxud2luZG93LkZSQU1FUkFURSA9IDMwO1xyXG5cclxuLy8gR2xvYmFsc1xyXG52YXIgZm9udHMgPSBbJ051JywgJ05LJywgJ1ZUMzIzJywgJ1NwYWNlIE1vbm8nXSxcclxuICBmb250SW5kZXggPSAwLFxyXG4gIGdhbWUsXHJcbiAgJGNvdW50LFxyXG4gICRudGgsXHJcbiAgJHRpdGxlLFxyXG4gICRtZXNzYWdlLFxyXG4gICRzaG93VXBncmFkZXMsXHJcbiAgJHVwZ3JhZGVzLFxyXG4gICRpbnRybyxcclxuICAkdGltZXIsXHJcbiAgJGdvYWwsXHJcbiAgJG5hbWVzLFxyXG4gICR0b3RhbFJhdGU7XHJcbi8qKlxyXG4gKiBXcmFwcGVyXHJcbiAqL1xyXG53aW5kb3cuZGcgPSBmdW5jdGlvbiAoZWwpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoYW5nZXMgdGhlIGJvZHkgZm9udFxyXG4gKi9cclxuZnVuY3Rpb24gY2hhbmdlRm9udCAoKSB7XHJcbiAgZG9jdW1lbnQuYm9keS5zdHlsZVsnZm9udC1mYW1pbHknXSA9IGZvbnRzW2ZvbnRJbmRleCsrICUgZm9udHMubGVuZ3RoXTtcclxuICAkbWVzc2FnZS5pbm5lckhUTUwgPSAnZm9udCBjaGFuZ2VkJztcclxufVxyXG5cclxuLyoqXHJcbiAqIFA1IHNldHVwXHJcbiAqL1xyXG53aW5kb3cuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIC8vIEVsZW1lbnRzXHJcbiAgJGNvdW50ID0gZGcoJ2NvdW50Jyk7XHJcbiAgJG50aCA9IGRnKCdudGgnKTtcclxuICAkdGl0bGUgPSBkZygndGl0bGUnKTtcclxuICAkbWVzc2FnZSA9IGRnKCdtZXNzYWdlJyk7XHJcbiAgJHNob3dVcGdyYWRlcyA9IGRnKCdzaG93VXBncmFkZXMnKTtcclxuICAkdXBncmFkZXMgPSBkZygndXBncmFkZXMnKTtcclxuICAkaW50cm8gPSBkZygnaW50cm8nKTtcclxuICAkdGltZXIgPSBkZygndGltZXInKTtcclxuICAkZ29hbCA9IGRnKCdnb2FsJyk7XHJcbiAgJHRvdGFsUmF0ZSA9IGRnKCd0b3RhbFJhdGUnKTtcclxuICAkbmFtZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubmFtZScpO1xyXG4gICR3cmFwID0gZGcoJ3dyYXAnKTtcclxuXHJcbiAgZ2FtZSA9IG5ldyBOdGgoe1xyXG4gICAgJGNvdW50OiAkY291bnQsXHJcbiAgICAkbWVzc2FnZTogJG1lc3NhZ2UsXHJcbiAgICAkdXBncmFkZXM6ICR1cGdyYWRlcyxcclxuICAgICRzaG93VXBncmFkZXM6ICRzaG93VXBncmFkZXMsXHJcbiAgICAkdGltZXI6ICR0aW1lcixcclxuICAgICRpbnRybzogJGludHJvLFxyXG4gICAgJHRvdGFsUmF0ZTogJHRvdGFsUmF0ZSxcclxuICAgICRudGg6ICRudGgsXHJcbiAgICAkd3JhcDogJHdyYXBcclxuICB9KTtcclxuICBnYW1lLmluaXRpYWxpemUoKTtcclxuXHJcbiAgLy8gSGFuZGxlcnNcclxuICAkdGl0bGUub25jbGljayA9IGNoYW5nZUZvbnQ7XHJcbiAgJG50aC5vbmNsaWNrID0gZ2FtZS5hZGRDb3VudC5iaW5kKGdhbWUpO1xyXG4gICRuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICBuYW1lLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGdhbWUucHVyY2hhc2UobmFtZS5wYXJlbnRFbGVtZW50LmlkKTtcclxuICAgIH07XHJcbiAgfSk7XHJcbiAgJHNob3dVcGdyYWRlcy5vbmNsaWNrID0gZ2FtZS5zaG93VXBncmFkZXMuYmluZChnYW1lKTtcclxuICAkZ29hbC5pbm5lckhUTUwgPSAnZ29hbDogJyArIGdhbWUuZ29hbDtcclxuICBnYW1lLnJ1blRpbWVyKCk7XHJcbiAgLy8gTG9jayBGUFMgdG8gMzBcclxuICBmcmFtZVJhdGUoRlJBTUVSQVRFKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQNSBkcmF3XHJcbiAqL1xyXG53aW5kb3cuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBVcGRhdGUgdGhlIGRvbSwgaW50ZXJuYWwgYWRkZXJzLCBhbmQgZ3Jvd3RoUmF0ZVxyXG4gIGlmIChnYW1lLmFkZGVyc0hhdmVDaGFuZ2VkKSB7XHJcbiAgICBnYW1lLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUoKTtcclxuICB9XHJcbiAgLy8gSW5jcmVhc2VkIHRoZSBnYW1lIGNvdW50IGlmIG5vdCBwYXVzZWRcclxuICBpZiAoZ2FtZS5wYXVzZWQpIHtcclxuICB9IGVsc2Uge1xyXG4gICAgZ2FtZS5ncm93KCk7XHJcbiAgICBnYW1lLnVwZGF0ZVVwZ3JhZGVzV2l0aER1cmF0aW9uKCk7XHJcbiAgICAvLyBTaG93IHRoaXMgaW5jcmVhc2VcclxuICAgICRjb3VudC5pbm5lckhUTUwgPSBnYW1lLmdldENvdW50SHRtbCgpO1xyXG4gIH1cclxufTtcclxuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgZnJhbWVSYXRlICovXHJcbnZhciBOdGggPSByZXF1aXJlKCcuL2NsYXNzZXMvTnRoJyk7XHJcblxyXG53aW5kb3cuRlJBTUVSQVRFID0gMzA7XHJcblxyXG4vLyBHbG9iYWxzXHJcbnZhciBmb250cyA9IFsnTnUnLCAnTksnLCAnVlQzMjMnLCAnU3BhY2UgTW9ubyddLFxyXG4gIGZvbnRJbmRleCA9IDAsXHJcbiAgZ2FtZSxcclxuICAkY291bnQsXHJcbiAgJG50aCxcclxuICAkdGl0bGUsXHJcbiAgJG1lc3NhZ2UsXHJcbiAgJHNob3dVcGdyYWRlcyxcclxuICAkdXBncmFkZXMsXHJcbiAgJGludHJvLFxyXG4gICR0aW1lcixcclxuICAkZ29hbCxcclxuICAkbmFtZXMsXHJcbiAgJHRvdGFsUmF0ZTtcclxuLyoqXHJcbiAqIFdyYXBwZXJcclxuICovXHJcbndpbmRvdy5kZyA9IGZ1bmN0aW9uIChlbCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hhbmdlcyB0aGUgYm9keSBmb250XHJcbiAqL1xyXG5mdW5jdGlvbiBjaGFuZ2VGb250ICgpIHtcclxuICBkb2N1bWVudC5ib2R5LnN0eWxlWydmb250LWZhbWlseSddID0gZm9udHNbZm9udEluZGV4KysgJSBmb250cy5sZW5ndGhdO1xyXG4gICRtZXNzYWdlLmlubmVySFRNTCA9ICdmb250IGNoYW5nZWQnO1xyXG59XHJcblxyXG4vKipcclxuICogUDUgc2V0dXBcclxuICovXHJcbndpbmRvdy5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgLy8gRWxlbWVudHNcclxuICAkY291bnQgPSBkZygnY291bnQnKTtcclxuICAkbnRoID0gZGcoJ250aCcpO1xyXG4gICR0aXRsZSA9IGRnKCd0aXRsZScpO1xyXG4gICRtZXNzYWdlID0gZGcoJ21lc3NhZ2UnKTtcclxuICAkc2hvd1VwZ3JhZGVzID0gZGcoJ3Nob3dVcGdyYWRlcycpO1xyXG4gICR1cGdyYWRlcyA9IGRnKCd1cGdyYWRlcycpO1xyXG4gICRpbnRybyA9IGRnKCdpbnRybycpO1xyXG4gICR0aW1lciA9IGRnKCd0aW1lcicpO1xyXG4gICRnb2FsID0gZGcoJ2dvYWwnKTtcclxuICAkdG90YWxSYXRlID0gZGcoJ3RvdGFsUmF0ZScpO1xyXG4gICRuYW1lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYW1lJyk7XHJcbiAgJHdyYXAgPSBkZygnd3JhcCcpO1xyXG5cclxuICBnYW1lID0gbmV3IE50aCh7XHJcbiAgICAkY291bnQ6ICRjb3VudCxcclxuICAgICRtZXNzYWdlOiAkbWVzc2FnZSxcclxuICAgICR1cGdyYWRlczogJHVwZ3JhZGVzLFxyXG4gICAgJHNob3dVcGdyYWRlczogJHNob3dVcGdyYWRlcyxcclxuICAgICR0aW1lcjogJHRpbWVyLFxyXG4gICAgJGludHJvOiAkaW50cm8sXHJcbiAgICAkdG90YWxSYXRlOiAkdG90YWxSYXRlLFxyXG4gICAgJG50aDogJG50aCxcclxuICAgICR3cmFwOiAkd3JhcFxyXG4gIH0pO1xyXG4gIGdhbWUuaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAvLyBIYW5kbGVyc1xyXG4gICR0aXRsZS5vbmNsaWNrID0gY2hhbmdlRm9udDtcclxuICAkbnRoLm9uY2xpY2sgPSBnYW1lLmFkZENvdW50LmJpbmQoZ2FtZSk7XHJcbiAgJG5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgIG5hbWUub25jbGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgZ2FtZS5wdXJjaGFzZShuYW1lLnBhcmVudEVsZW1lbnQuaWQpO1xyXG4gICAgfTtcclxuICB9KTtcclxuICAkc2hvd1VwZ3JhZGVzLm9uY2xpY2sgPSBnYW1lLnNob3dVcGdyYWRlcy5iaW5kKGdhbWUpO1xyXG4gICRnb2FsLmlubmVySFRNTCA9ICdnb2FsOiAnICsgZ2FtZS5nb2FsO1xyXG4gIGdhbWUucnVuVGltZXIoKTtcclxuICAvLyBMb2NrIEZQUyB0byAzMFxyXG4gIGZyYW1lUmF0ZShGUkFNRVJBVEUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFA1IGRyYXdcclxuICovXHJcbndpbmRvdy5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIFVwZGF0ZSB0aGUgZG9tLCBpbnRlcm5hbCBhZGRlcnMsIGFuZCBncm93dGhSYXRlXHJcbiAgaWYgKGdhbWUuYWRkZXJzSGF2ZUNoYW5nZWQpIHtcclxuICAgIGdhbWUudXBkYXRlQWRkZXJzQW5kR3Jvd3RoUmF0ZSgpO1xyXG4gIH1cclxuICAvLyBJbmNyZWFzZWQgdGhlIGdhbWUgY291bnQgaWYgbm90IHBhdXNlZFxyXG4gIGlmIChnYW1lLnBhdXNlZCkge1xyXG4gIH0gZWxzZSB7XHJcbiAgICBnYW1lLmdyb3coKTtcclxuICAgIGdhbWUudXBkYXRlVXBncmFkZXNXaXRoRHVyYXRpb24oKTtcclxuICAgIC8vIFNob3cgdGhpcyBpbmNyZWFzZVxyXG4gICAgJGNvdW50LmlubmVySFRNTCA9IGdhbWUuZ2V0Q291bnRIdG1sKCk7XHJcbiAgfVxyXG59O1xyXG4iXSwiZmlsZSI6ImluZGV4LmpzIn0=
