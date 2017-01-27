(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * Adders increase the rate at which the Nth count grows
 */
var Adder = function (options) {
  this.rate = options.rate;
  this.update = options.updateFn;
  this.generateR = options.rFn;
  this.cost = options.costFn;
  this.costHtml = options.costHtmlFn;
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
  this.calculating = false;
  // These upgrades should be classes and they should modify adders
  // through a method of the adders themselves
  this.upgrades = require('../data/Upgrades');
};

/**
 * Updates the internal state of calculating and the DOM
 */
Nth.prototype.toggleCalculating = function () {
  if (!this.calculating) {
    this.$message.innerHTML = 'calculating . . .';
    this.$count.innerHTML = '~~~ ' + floor(this.count) + ' ~~~';
    this.calculating = true;
  } else {
    this.$message.innerHTML = 'finished calculation';
    this.$count.innerHTML = this.count;
    this.calculating = false;
  }
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
      $cost.innerHTML = a.costHtml();
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
    cost : 25000,
    desc : 'increases Sigma rate to 0.14',
    enable : function (nth) {
      nth.adders.Sigma.rate = 0.14;
    }
  }
];
module.exports = Upgrades;

},{}],5:[function(require,module,exports){
/* global floor */
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
  $names;
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
  $names = document.querySelectorAll('.name');

  game = new Nth({
    $count: $count,
    $message: $message,
    $upgrades: $upgrades,
    $showUpgrades: $showUpgrades,
    $timer: $timer,
    $intro: $intro,
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
};

/**
 * P5 draw
 */
window.draw = function () {
  // Update the dom, internal adders, and growthRate
  if (game.addersHaveChanged) {
    game.updateAddersAndGrowthRate();
  }
  // Increased the game count if not paused or calculating
  if (game.calculating) {
  } else if (game.paused) {
  } else {
    game.grow();
    // Show this increase
    $count.innerHTML = floor(game.count);
  }
};

},{"./classes/Nth":2}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcbG9nYW5cXERvY3VtZW50c1xccGVyc29uYWxfcHJvamVjdHNcXG50aFxcbm9kZV9tb2R1bGVzXFxndWxwLWJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2NsYXNzZXMvQWRkZXIuanMiLCJDOi9Vc2Vycy9sb2dhbi9Eb2N1bWVudHMvcGVyc29uYWxfcHJvamVjdHMvbnRoL3NyYy9jbGFzc2VzL050aC5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2RhdGEvQWRkZXJzLmpzIiwiQzovVXNlcnMvbG9nYW4vRG9jdW1lbnRzL3BlcnNvbmFsX3Byb2plY3RzL250aC9zcmMvZGF0YS9VcGdyYWRlcy5qcyIsIkM6L1VzZXJzL2xvZ2FuL0RvY3VtZW50cy9wZXJzb25hbF9wcm9qZWN0cy9udGgvc3JjL2Zha2VfYThkOGIzNmIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG4vKipcclxuICogQWRkZXJzIGluY3JlYXNlIHRoZSByYXRlIGF0IHdoaWNoIHRoZSBOdGggY291bnQgZ3Jvd3NcclxuICovXHJcbnZhciBBZGRlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgdGhpcy5yYXRlID0gb3B0aW9ucy5yYXRlO1xyXG4gIHRoaXMudXBkYXRlID0gb3B0aW9ucy51cGRhdGVGbjtcclxuICB0aGlzLmdlbmVyYXRlUiA9IG9wdGlvbnMuckZuO1xyXG4gIHRoaXMuY29zdCA9IG9wdGlvbnMuY29zdEZuO1xyXG4gIHRoaXMuY29zdEh0bWwgPSBvcHRpb25zLmNvc3RIdG1sRm47XHJcbiAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xyXG5cclxuICAvLyBBdWRpbyBhc3NldHNcclxuICB0aGlzLmF1ZGlvID0gb3B0aW9ucy5hdWRpbyB8fCBmYWxzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXRzIHVwIHRoZSBhZGRlclxyXG4gKi9cclxuQWRkZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5jb3VudCA9IDA7XHJcbiAgdGhpcy51bmxvY2tlZCA9IGZhbHNlO1xyXG4gIHRoaXMuciA9IHRoaXMuZ2VuZXJhdGVSKCk7XHJcbiAgaWYgKHRoaXMuYXVkaW8pIHtcclxuICAgIGZvciAodmFyIGFjdGlvbk5hbWUgaW4gdGhpcy5hdWRpbykge1xyXG4gICAgICB2YXIgZmlsZW5hbWUgPSB0aGlzLmF1ZGlvW2FjdGlvbk5hbWVdO1xyXG4gICAgICB2YXIgYXVkaW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xyXG4gICAgICBhdWRpby5pZCA9IHRoaXMubmFtZSArICctJyArIGFjdGlvbk5hbWU7XHJcbiAgICAgIGF1ZGlvLnNyYyA9IGZpbGVuYW1lO1xyXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGF1ZGlvKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogUGxheXMgdGhlIGJ1aWxkIHNvdW5kXHJcbiAqL1xyXG5BZGRlci5wcm90b3R5cGUucGxheUJ1aWxkU291bmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGF1ZGlvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5uYW1lICsgJy1idWlsZCcpO1xyXG4gIGF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcclxuICBhdWRpby5wbGF5KCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUGxheXMgdGhlIHVwZ3JhZGUgc291bmRcclxuICovXHJcbkFkZGVyLnByb3RvdHlwZS5wbGF5VXBncmFkZVNvdW5kID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBhdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMubmFtZSArICctdXBncmFkZScpO1xyXG4gIGF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcclxuICBhdWRpby5wbGF5KCk7XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gQWRkZXI7XHJcbiIsIlxyXG4vKiBnbG9iYWwgZmxvb3IgKi9cclxudmFyIEFkZGVycyA9IHJlcXVpcmUoJy4uL2RhdGEvQWRkZXJzJyk7XHJcbnZhciBBZGRlciA9IHJlcXVpcmUoJy4vQWRkZXInKTtcclxuXHJcbi8qKlxyXG4gKiBUaGUgZ2FtZSBjbGFzc1xyXG4gKiBAcGFyYW0ge09iamVjdH0gJG1lc3NhZ2VcclxuICogQHBhcmFtIHtPYmplY3R9ICRjb3VudFxyXG4gKiBAcGFyYW0ge09iamVjdH0gJHVwZ3JhZGVzXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSAkdGltZXJcclxuICogQHBhcmFtIHtPYmplY3R9ICRzaG93VXBncmFkZXNcclxuICogQHBhcmFtIHtPYmplY3R9ICRpbnRyb1xyXG4gKi9cclxudmFyIE50aCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgdGhpcy4kbWVzc2FnZSA9IG9wdGlvbnMuJG1lc3NhZ2U7XHJcbiAgdGhpcy4kY291bnQgPSBvcHRpb25zLiRjb3VudDtcclxuICB0aGlzLiR1cGdyYWRlcyA9IG9wdGlvbnMuJHVwZ3JhZGVzO1xyXG4gIHRoaXMuJHRpbWVyID0gb3B0aW9ucy4kdGltZXI7XHJcbiAgdGhpcy4kc2hvd1VwZ3JhZGVzID0gb3B0aW9ucy4kc2hvd1VwZ3JhZGVzO1xyXG4gIHRoaXMuJGludHJvID0gb3B0aW9ucy4kaW50cm87XHJcbn07XHJcblxyXG5OdGgucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gTG9hZCBhZGRlcnNcclxuICB0aGlzLmFkZGVycyA9IHt9O1xyXG4gIGZvciAodmFyIGFkZGVyIGluIEFkZGVycykge1xyXG4gICAgdGhpcy5hZGRlcnNbYWRkZXJdID0gbmV3IEFkZGVyKEFkZGVyc1thZGRlcl0pO1xyXG4gICAgdGhpcy5hZGRlcnNbYWRkZXJdLmluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIC8vIEBUT0RPIG1ha2Ugdm9sdW1lIGNvbnRyb2xzXHJcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnYXVkaW8nKS5mb3JFYWNoKGZ1bmN0aW9uIChhdWRpbykge1xyXG4gICAgYXVkaW8udm9sdW1lID0gMC4xO1xyXG4gIH0pO1xyXG5cclxuICAvLyBVbmxvY2sgbGl0dGxlIGRlbHRhIGJ5IGRlZmF1bHRcclxuICB0aGlzLmFkZGVycy5kZWx0YS51bmxvY2tlZCA9IHRydWU7XHJcbiAgLy8gVGhlIHRvdGFsIGNvdW50IHVzZWQgZm9yIHB1cmNoYXNpbmcgYWRkZXJzXHJcbiAgdGhpcy5jb3VudCA9IDEwMDAwMDtcclxuICAvLyBOdW1iZXIgdG8gaW5jcmVhZXMgY291bnQgYnkgZm9yIGVhY2ggY2xpY2tcclxuICB0aGlzLmNsaWNrVmFsdWUgPSAxO1xyXG4gIC8vIFRpbWUgaW4gc2Vjb25kc1xyXG4gIHRoaXMuZ2FtZVRpbWUgPSAwO1xyXG4gIC8vIEdvYWwgdG8gZ2V0IHRvXHJcbiAgdGhpcy5nb2FsID0gMTAwMDAwMDtcclxuICB0aGlzLmdyb3d0aFJhdGUgPSAwO1xyXG4gIHRoaXMuYWRkZXJzSGF2ZUNoYW5nZWQgPSB0cnVlO1xyXG4gIHRoaXMucGF1c2VkID0gZmFsc2U7XHJcbiAgdGhpcy5jYWxjdWxhdGluZyA9IGZhbHNlO1xyXG4gIC8vIFRoZXNlIHVwZ3JhZGVzIHNob3VsZCBiZSBjbGFzc2VzIGFuZCB0aGV5IHNob3VsZCBtb2RpZnkgYWRkZXJzXHJcbiAgLy8gdGhyb3VnaCBhIG1ldGhvZCBvZiB0aGUgYWRkZXJzIHRoZW1zZWx2ZXNcclxuICB0aGlzLnVwZ3JhZGVzID0gcmVxdWlyZSgnLi4vZGF0YS9VcGdyYWRlcycpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZXMgdGhlIGludGVybmFsIHN0YXRlIG9mIGNhbGN1bGF0aW5nIGFuZCB0aGUgRE9NXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLnRvZ2dsZUNhbGN1bGF0aW5nID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICghdGhpcy5jYWxjdWxhdGluZykge1xyXG4gICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAnY2FsY3VsYXRpbmcgLiAuIC4nO1xyXG4gICAgdGhpcy4kY291bnQuaW5uZXJIVE1MID0gJ35+fiAnICsgZmxvb3IodGhpcy5jb3VudCkgKyAnIH5+fic7XHJcbiAgICB0aGlzLmNhbGN1bGF0aW5nID0gdHJ1ZTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAnZmluaXNoZWQgY2FsY3VsYXRpb24nO1xyXG4gICAgdGhpcy4kY291bnQuaW5uZXJIVE1MID0gdGhpcy5jb3VudDtcclxuICAgIHRoaXMuY2FsY3VsYXRpbmcgPSBmYWxzZTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQXR0ZW1wdHMgdG8gcHVyY2hhc2UgYW4gYWRkZXJcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhZGRlclxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5wdXJjaGFzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgdmFyIGFkZGVyID0gdGhpcy5hZGRlcnNbbmFtZV07XHJcbiAgLy8gWW91IGNhbiBvbmx5IGF0dGVtcHQgdG8gcHVyY2hhc2UgdW5sb2NrZWQgYWRkZXJzXHJcbiAgaWYgKGFkZGVyLnVubG9ja2VkKSB7XHJcbiAgICB2YXIgY29zdCA9IGFkZGVyLmNvc3QoKTtcclxuICAgIGlmICh0aGlzLmNvdW50ID49IGNvc3QpIHtcclxuICAgICAgLy8gUHVyY2hhc2UgZnJvbSB0aGUgdG90YWwgY291bnRcclxuICAgICAgdGhpcy5jb3VudCAtPSBjb3N0O1xyXG4gICAgICAvLyBJbmNyZW1lbnQgdGhlIG51bWJlciBvZiBvd25lZCBhZGRlcnMgb2YgdGhhdCB0eXBlXHJcbiAgICAgIGFkZGVyLmNvdW50Kys7XHJcbiAgICAgIHRoaXMuYWRkZXJzSGF2ZUNoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAvLyBVcGRhdGUgRE9NXHJcbiAgICAgIHRoaXMuJG1lc3NhZ2UuaW5uZXJIVE1MID0gJ3B1cmNoYXNlZCAnICsgbmFtZSArICcuJztcclxuICAgICAgLy8gUGxheSBhdWRpb1xyXG4gICAgICBhZGRlci5wbGF5QnVpbGRTb3VuZCgpO1xyXG4gICAgICAvLyBJZiB0aGVyZSdzIGFuIHVwZGF0ZSBmdW5jdGlvbiBvbiB0aGUgYWRkZXIsIHVwZGF0ZVxyXG4gICAgICBpZiAoYWRkZXIudXBkYXRlKSB7XHJcbiAgICAgICAgYWRkZXIudXBkYXRlKCk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gVGhlIGZpcnN0IHRpbWUgc29tZXRoaW5nIGlzIHB1cmNoYXNlZCwgdW5sb2NrIHRoZSBuZXh0XHJcbiAgICAgIGlmIChhZGRlci5jb3VudCA9PT0gMSkge1xyXG4gICAgICAgIHZhciBuZXh0ID0gd2luZG93LmRnKG5hbWUpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xyXG4gICAgICAgIGlmIChuZXh0KSB7XHJcbiAgICAgICAgICB0aGlzLmFkZGVyc1tuZXh0LmlkXS51bmxvY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCArPSAnIHVubG9ja2VkICcgKyBuZXh0LmlkICsgJy4nO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSAnY2Fubm90IGFmZm9yZCB0byBwdXJjaGFzZSAnICsgbmFtZTtcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy4kbWVzc2FnZS5pbm5lckhUTUwgPSBuYW1lICsgJyBoYXMgbm90IGJlZW4gdW5sb2NrZWQgeWV0Lic7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNob3dzIHRoZSB1cGdyYWRlcyB0YWJsZVxyXG4gKlxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5zaG93VXBncmFkZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy4kaW50cm8ucmVtb3ZlKCk7XHJcbiAgdGhpcy4kc2hvd1VwZ3JhZGVzLnJlbW92ZSgpO1xyXG4gIHRoaXMudXBncmFkZXMuZm9yRWFjaChmdW5jdGlvbiAodXBncmFkZSkge1xyXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgZGl2LmNsYXNzTGlzdCArPSAndXBncmFkZSAnICsgdXBncmFkZS50YXJnZXQ7XHJcbiAgICBkaXYuaW5uZXJIVE1MID0gdXBncmFkZS5kZXNjICsgJ1xcdFsnICsgdXBncmFkZS5jb3N0ICsgJ10nO1xyXG4gICAgZGl2Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICB0aGlzLnB1cmNoYXNlVXBncmFkZSh1cGdyYWRlLmlkKTtcclxuICAgICAgaWYgKHVwZ3JhZGUuZW5hYmxlZCkge1xyXG4gICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdCArPSAnIGVuYWJsZWQnO1xyXG4gICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB0aGlzLiR1cGdyYWRlcy5hcHBlbmRDaGlsZChkaXYpO1xyXG4gIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBjbGljayB2YWx1ZSB3aGVuIG50aCBidXR0b24gaXMgcHJlc3NlZFxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5hZGRDb3VudCA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmNvdW50ICs9IHRoaXMuY2xpY2tWYWx1ZTtcclxuICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICcuIC4gLic7XHJcbn07XHJcblxyXG4vKipcclxuICogR3Jvd3MgdGhlIGNvdW50XHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLmdyb3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5jb3VudCArPSB0aGlzLmdyb3d0aFJhdGU7XHJcbn07XHJcblxyXG5OdGgucHJvdG90eXBlLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gUmVzZXQgZ3Jvd3RoUmF0ZVxyXG4gIHRoaXMuZ3Jvd3RoUmF0ZSA9IDA7XHJcbiAgZm9yICh2YXIgYWRkZXIgaW4gdGhpcy5hZGRlcnMpIHtcclxuICAgIHZhciBhID0gdGhpcy5hZGRlcnNbYWRkZXJdO1xyXG4gICAgLy8gT25seSBzaG93IGNvc3QsIGNvdW50LCBhbmQgcmF0ZSBpZiB1bmxvY2tlZFxyXG4gICAgaWYgKGEudW5sb2NrZWQpIHtcclxuICAgICAgdmFyICRjb3N0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLmNvc3QnKVswXTtcclxuICAgICAgJGNvc3QuaW5uZXJIVE1MID0gYS5jb3N0SHRtbCgpO1xyXG4gICAgICB2YXIgJGNvdW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLmNvdW50JylbMF07XHJcbiAgICAgIHZhciBzdHIgPSAnJztcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmNvdW50OyBpKyspIHtcclxuICAgICAgICBzdHIgKz0gJyYnICsgYWRkZXIgKyAnOyc7XHJcbiAgICAgIH1cclxuICAgICAgJGNvdW50LmlubmVySFRNTCA9IHN0ciB8fCAnLSc7XHJcbiAgICAgIHZhciAkdG90YWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcjJyArIGFkZGVyICsgJyAudG90YWwnKVswXTtcclxuICAgICAgJHRvdGFsLmlubmVySFRNTCA9IGFkZGVyICsgJyB0b3RhbCAnICsgYS5jb3VudDtcclxuICAgICAgdmFyICRyYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnIycgKyBhZGRlciArICcgLnJhdGUnKVswXTtcclxuICAgICAgaWYgKGEuY291bnQpIHtcclxuICAgICAgICAkcmF0ZS5pbm5lckhUTUwgPSAncmF0ZTogJyArIChhLmNvdW50ICogYS5yYXRlKS50b0ZpeGVkKDMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgICRyYXRlLmlubmVySFRNTCA9ICdyYXRlOiB7eycgKyBhLnJhdGUudG9GaXhlZCgzKSArICd9fSc7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIElmIHRoZXJlJ3MgYXQgbGVhc3Qgb25lIGFkZGVyLCB1cGRhdGUgdGhlIGdyb3d0aFJhdGVcclxuICAgIGlmIChhLmNvdW50KSB7XHJcbiAgICAgIHRoaXMuZ3Jvd3RoUmF0ZSArPSBhLmNvdW50ICogYS5yYXRlO1xyXG4gICAgfVxyXG4gIH1cclxuICB0aGlzLmFkZGVyc0hhdmVDaGFuZ2VkID0gZmFsc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogUHVyY2hhc2VzIHRoZSB1cGdyYWRlIG9yIHJlc3BvbmRzIHRoYXQgdGhlIHVwZ3JhZGUgY2FuJ3QgYmUgcHVyY2hzZWRcclxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIC0gdGhlIGlkIG9mIHRoZSB1cGdyYWRlXHJcbiAqL1xyXG5OdGgucHJvdG90eXBlLnB1cmNoYXNlVXBncmFkZSA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHZhciB1cGdyYWRlO1xyXG4gIC8vIEdldHMgdGhlIHVwZ3JhZGUgd2l0aCB0aGUgaWQgcHJvdmlkZWRcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudXBncmFkZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh0aGlzLnVwZ3JhZGVzW2ldLmlkID09IGlkKSB7XHJcbiAgICAgIHVwZ3JhZGUgPSB0aGlzLnVwZ3JhZGVzW2ldO1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbiAgLy8gQ2FuJ3QgcmVidXkgcHVyY2hhc2VkIHVwZ3JhZGVzXHJcbiAgaWYgKCF1cGdyYWRlLmVuYWJsZWQpIHtcclxuICAgIC8vIE9ubHkgYnV5IGlmIGFmZm9yZGFibGVcclxuICAgIGlmICh0aGlzLmNvdW50ID49IHVwZ3JhZGUuY29zdCkge1xyXG4gICAgICB0aGlzLmNvdW50IC09IHVwZ3JhZGUuY29zdDtcclxuICAgICAgdXBncmFkZS5lbmFibGUodGhpcyk7XHJcbiAgICAgIHVwZ3JhZGUuZW5hYmxlZCA9IHRydWU7XHJcbiAgICAgIC8vIFBsYXkgdGhlIHVwZ3JhZGUgc291bmQgZm9yIHRoZSB0YXJnZXRcclxuICAgICAgaWYgKHVwZ3JhZGUudGFyZ2V0ID09PSAnbnRoJykge1xyXG4gICAgICAgIHRoaXMucGxheVVwZ3JhZGVTb3VuZCh1cGdyYWRlLmlkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmFkZGVyc1t1cGdyYWRlLnRhcmdldF0ucGxheVVwZ3JhZGVTb3VuZCgpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIFRlbGwgUDUgdGhpbmdzIGhhdmUgY2hhbmdlZFxyXG4gICAgICB0aGlzLmFkZGVyc0hhdmVDaGFuZ2VkID0gdHJ1ZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuJG1lc3NhZ2UuaW5uZXJIVE1MID0gJ2Nhbm5vdCBhZmZvcmQgdXBncmFkZSBmb3IgJyArIHVwZ3JhZGUudGFyZ2V0ICsgJy4nO1xyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLiRtZXNzYWdlLmlubmVySFRNTCA9ICdjYW5ub3QgcmVidXkgdXBncmFkZS4nO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSdW5zIHRoZSBnYW1lIHRpbWVyLCB1cGRhdGluZyB0aGUgZ2FtZSBhbmQgdGhlIERPTSBzaW11bHRhbmVvdXNseVxyXG4gKi9cclxuTnRoLnByb3RvdHlwZS5ydW5UaW1lciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmdhbWVUaW1lKys7XHJcbiAgdGhpcy4kdGltZXIuaW5uZXJIVE1MID0gdGhpcy5nYW1lVGltZSArICdzJztcclxuICBzZXRUaW1lb3V0KHRoaXMucnVuVGltZXIuYmluZCh0aGlzKSwgMTAwMCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIC0gdGhlIHVwZ3JhZGUgaWRcclxuICovXHJcbk50aC5wcm90b3R5cGUucGxheVVwZ3JhZGVTb3VuZCA9IGZ1bmN0aW9uIChpZCkge1xyXG4gIHZhciBhdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdudGhfdXBncmFkZV9pZF8nICsgaWQpO1xyXG4gIGF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcclxuICBhdWRpby5wbGF5KCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE50aDtcclxuIiwiXHJcbi8qIGdsb2JhbCBmbG9vciwgcmFuZG9tICovXHJcbi8qKlxyXG4gKiBAc2NoZW1hXHJcbiAqIHJhdGUgQHR5cGUge051bWJlcn0gLSB0aGUgcGVyIGFkZGVyIGdyb3d0aCByYXRlXHJcbiAqIHVwZGF0ZUZuIEB0eXBlIHtGdW5jdGlvbn0gLSB0aGUgdXBkYXRlIGZ1bmN0aW9uXHJcbiAqIHJGbiBAdHlwZSB7RnVuY3Rpb259IC0gdGhlIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgaW5pdGlhbCBjb3N0IHJhdGUgYWRqdXN0bWVudFxyXG4gKiBjb3N0Rm4gQHR5cGUge0Z1bmN0aW9ufSAtIHRoZSBmdW5jdGlvbiB0byBkZXRlcm1pbmUgdGhlIGNvc3Qgb2YgdGhlIG5leHQgcHVyY2hhc2VcclxuICogY29zdEh0bWxGbiBAdHlwZSB7RnVuY3Rpb259IC0gdGhlIGZ1bmN0aW9uIHRvIHJldHVybiB0aGUgbWFya3VwIGZvciB0aGUgbmV4dCBjb3N0XHJcbiAqL1xyXG52YXIgQWRkZXJzID0ge1xyXG4gIGRlbHRhOiB7XHJcbiAgICBuYW1lOiAnZGVsdGEnLFxyXG4gICAgcmF0ZSA6IDAuMDAxLFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAxO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKHRoaXMuY291bnQgKiAxMCkgKyAxMDtcclxuICAgIH0sXHJcbiAgICBjb3N0SHRtbEZuIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gJ1xcdFsnICsgdGhpcy5jb3N0KCkudG9GaXhlZCgzKSAgKyAnXSc7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2RlbHRhX2J1aWxkLndhdicsXHJcbiAgICAgIHVwZ3JhZGU6ICcvc291bmRzL2RlbHRhX3VwZ3JhZGUud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgU2lnbWE6IHtcclxuICAgIG5hbWU6ICdTaWdtYScsXHJcbiAgICByYXRlIDogMC4wMDUsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSg1LDEwKSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnIgPSBmbG9vcihyYW5kb20odGhpcy5jb3VudCAqIDEwLCB0aGlzLmNvdW50ICogMjApKTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgIHJldHVybiAoKHRoaXMuY291bnQgKyAxKSAqIDI1KSArIHRoaXMucjtcclxuICAgIH0sXHJcbiAgICBjb3N0SHRtbEZuIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gJ1xcdFsnICsgdGhpcy5jb3N0KCkudG9GaXhlZCgzKSAgKyAnXSc7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL2JpZ19zaWdtYV9idWlsZC53YXYnLFxyXG4gICAgICB1cGdyYWRlOiAnL3NvdW5kcy9iaWdfc2lnbWFfdXBncmFkZS53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBEZWx0YToge1xyXG4gICAgbmFtZTogJ0RlbHRhJyxcclxuICAgIHJhdGUgOiAwLjAxLFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBmbG9vcihyYW5kb20oNTAsMTUwKSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnIgPSBmbG9vcihyYW5kb20oNTAsMTUwKSkgKiB0aGlzLmNvdW50O1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKCh0aGlzLmNvdW50ICsgMSkgKiAxMDApICsgdGhpcy5yO1xyXG4gICAgfSxcclxuICAgIGNvc3RIdG1sRm4gOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAnXFx0WycgKyB0aGlzLmNvc3QoKS50b0ZpeGVkKDMpICArICddJztcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvYmlnX2RlbHRhX2J1aWxkLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIHJobzoge1xyXG4gICAgcmF0ZSA6IDAuMDgsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSg1MCwxNTApKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGUgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuciA9IHRoaXMuY291bnQgKiBmbG9vcihyYW5kb20oNTAsMTUwKSk7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAoKHRoaXMuY291bnQgKyAxKSAqIDIyNSkgKyB0aGlzLnI7XHJcbiAgICB9LFxyXG4gICAgY29zdEh0bWxGbiA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICdcXHRbJyArIHRoaXMuY29zdCgpLnRvRml4ZWQoMykgICsgJ10nO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9yaG9fYnVpbGQud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgbGFtYmRhOiB7XHJcbiAgICByYXRlIDogMC4xNCxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICh0aGlzLmNvdW50ICogdGhpcy5jb3VudCAqIDE1MDApO1xyXG4gICAgfSxcclxuICAgIGNvc3RIdG1sRm4gOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAnXFx0WycgKyB0aGlzLmNvc3QoKS50b0ZpeGVkKDMpICArICddJztcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvcmhvX2J1aWxkLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIHBpOiB7XHJcbiAgICByYXRlIDogMC44LFxyXG4gICAgckZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiBNYXRoLlBJICogdGhpcy5jb3VudCAqIDEwMDAwO1xyXG4gICAgfSxcclxuICAgIGNvc3RGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gKHRoaXMuY291bnQgKyAxICogMTIwMDApICsgdGhpcy5yICsgZmxvb3IocmFuZG9tKDEsMjAwMDApKTtcclxuICAgIH0sXHJcbiAgICBjb3N0SHRtbEZuIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gJ1xcdFsnICsgdGhpcy5jb3N0KCkudG9GaXhlZCgzKSAgKyAnXSc7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL3Job19idWlsZC53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBhbHBoYToge1xyXG4gICAgcmF0ZSA6IDEuNzcsXHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIGZsb29yKHJhbmRvbSgyMDAwLDMwMDApKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGUgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuciA9IGZsb29yKHJhbmRvbSgyMDAwLDMwMDApKSAqIHRoaXMuY291bnQ7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAodGhpcy5jb3VudCAqIDQwMDAwKSArIHRoaXMucjtcclxuICAgIH0sXHJcbiAgICBjb3N0SHRtbEZuIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gJ1xcdFsnICsgdGhpcy5jb3N0KCkudG9GaXhlZCgzKSAgKyAnXSc7XHJcbiAgICB9LFxyXG4gICAgYXVkaW86IHtcclxuICAgICAgYnVpbGQ6ICcvc291bmRzL3Job19idWlsZC53YXYnXHJcbiAgICB9XHJcbiAgfSxcclxuICBzaWdtYToge1xyXG4gICAgcmF0ZSA6IDMuNSxcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICB9LFxyXG4gICAgY29zdEh0bWxGbiA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9yaG9fYnVpbGQud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgTGFtYmRhOiB7XHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgfSxcclxuICAgIGNvc3RIdG1sRm4gOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAnJztcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvcmhvX2J1aWxkLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIG9tZWdhOiB7XHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgfSxcclxuICAgIGNvc3RIdG1sRm4gOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAnJztcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvcmhvX2J1aWxkLndhdidcclxuICAgIH1cclxuICB9LFxyXG4gIGVwc2lsb246IHtcclxuICAgIHJGbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gMTtcclxuICAgIH0sXHJcbiAgICBjb3N0Rm46IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICB9LFxyXG4gICAgY29zdEh0bWxGbiA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfSxcclxuICAgIGF1ZGlvOiB7XHJcbiAgICAgIGJ1aWxkOiAnL3NvdW5kcy9yaG9fYnVpbGQud2F2J1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgUHNpOiB7XHJcbiAgICByRm46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICB9LFxyXG4gICAgY29zdEZuOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgfSxcclxuICAgIGNvc3RIdG1sRm4gOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiAnJztcclxuICAgIH0sXHJcbiAgICBhdWRpbzoge1xyXG4gICAgICBidWlsZDogJy9zb3VuZHMvcmhvX2J1aWxkLndhdidcclxuICAgIH1cclxuICB9XHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gQWRkZXJzO1xyXG4iLCJcclxuLyoqXHJcbiAqIEBzY2hlbWFcclxuICogQHR5cGUge051bWJlcn0gaWQgLSB0aGUgdXBncmFkZSBpZFxyXG4gKiBAdHlwZSB7U3RyaW5nfSB0YXJnZXQgLSB0aGUgdGFyZ2V0IG9mIHRoZSB1cGdyYWRlXHJcbiAqIHRoaXMgY2FuIGJlIG50aCAodGhlIGdhbWUgaXRzZWxmKSBvciBhbiBhZGRlclxyXG4gKiBAdHlwZSB7TnVtYmVyfSBjb3N0IC0gdGhlIGNvc3Qgb2YgdGhlIHVwZ3JhZGVcclxuICogQHR5cGUge1N0cmluZ30gZGVzY3JpcHRpb24gLSB0aGUgZGVzY3JpcHRpb24gb2YgdGhlIHVwZ3JhZGVcclxuICogQHR5cGUge0Z1bmN0aW9ufSBlbmFibGUgLSB3aGF0IGhhcHBlbnMgd2hlbiB0aGUgdXBncmFkZSBpcyBlbmFibGVkXHJcbiAqIGluIHNvbWUgY2FzZXMsIHRoaXMgY2hhbmdlcyB0aGUgcmF0ZSBvZiB0aGUgdGFyZ2V0LCBpbiBvdGhlcnMsIGl0XHJcbiAqIG1vZGlmaWVzIHRoZSBnYW1lIGl0c2VsZiB0byBwcm92aWRlIHBpY2t1cHMsIGV0Yy5cclxuICogaW4gdGhlIGxhdHRlciBjYXNlLCB0aGUgdGFyZ2V0IG11c3QgYmUgbnRoIGFuZCBtdXN0XHJcbiAqIGNhbGwgYSBmdW5jdGlvbiB3aGljaCBlbmJhbGVzIG50aFxyXG4gKiAgICBAcGFyYW0ge09iamVjdDxOdGg+fSBudGggLSB0aGUgZ2FtZSBvYmplY3QgaXMgQUxXQVlTXHJcbiAqICAgIHBhc3NlZCB0byB0aGUgZW5hYmxlIGZ1bmN0aW9uXHJcbiAqL1xyXG52YXIgVXBncmFkZXMgPSBbe1xyXG4gICAgaWQgOiAwLFxyXG4gICAgdGFyZ2V0IDogJ250aCcsXHJcbiAgICBjb3N0IDogNDUwLFxyXG4gICAgZGVzYyA6ICdpbmNyZWFzZXMgbnRoIHZhbHVlIHRvIDInLFxyXG4gICAgLyoqXHJcbiAgICAgKiBAZGVzY3JpcHRpb24gLSBtb2RpZmllcyB0aGUgY2xpY2sgdmFsdWUgb2YgdGhlIGdhbWVcclxuICAgICAqL1xyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguY2xpY2tWYWx1ZSA9IDI7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDEsXHJcbiAgICB0YXJnZXQgOiAnZGVsdGEnLFxyXG4gICAgY29zdCA6IDY1MDAsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBkZWx0YSByYXRlIHRvIDAuMDAzJyxcclxuICAgIGVuYWJsZSA6IGZ1bmN0aW9uIChudGgpIHtcclxuICAgICAgbnRoLmFkZGVycy5kZWx0YS5yYXRlID0gMC4wMDM7XHJcbiAgICB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBpZCA6IDIsXHJcbiAgICB0YXJnZXQgOidTaWdtYScsXHJcbiAgICBjb3N0IDogMjUwMDAsXHJcbiAgICBkZXNjIDogJ2luY3JlYXNlcyBTaWdtYSByYXRlIHRvIDAuMTQnLFxyXG4gICAgZW5hYmxlIDogZnVuY3Rpb24gKG50aCkge1xyXG4gICAgICBudGguYWRkZXJzLlNpZ21hLnJhdGUgPSAwLjE0O1xyXG4gICAgfVxyXG4gIH1cclxuXTtcclxubW9kdWxlLmV4cG9ydHMgPSBVcGdyYWRlcztcclxuIiwiLyogZ2xvYmFsIGZsb29yICovXHJcbnZhciBOdGggPSByZXF1aXJlKCcuL2NsYXNzZXMvTnRoJyk7XHJcblxyXG4vLyBHbG9iYWxzXHJcbnZhciBzdHJldGNoID0gZmFsc2UsXHJcbiAgZ2FtZSxcclxuICAkY291bnQsXHJcbiAgJG50aCxcclxuICAkdGl0bGUsXHJcbiAgJG1lc3NhZ2UsXHJcbiAgJHNob3dVcGdyYWRlcyxcclxuICAkdXBncmFkZXMsXHJcbiAgJGludHJvLFxyXG4gICR0aW1lcixcclxuICAkZ29hbCxcclxuICAkbmFtZXM7XHJcbi8qKlxyXG4gKiBXcmFwcGVyXHJcbiAqL1xyXG53aW5kb3cuZGcgPSBmdW5jdGlvbiAoZWwpIHtcclxuICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoYW5nZXMgdGhlIGJvZHkgZm9udFxyXG4gKi9cclxuZnVuY3Rpb24gY2hhbmdlRm9udCAoKSB7XHJcbiAgaWYgKHN0cmV0Y2gpIHtcclxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGVbJ2ZvbnQtZmFtaWx5J10gPSAnTnUnO1xyXG4gICAgc3RyZXRjaCA9ICFzdHJldGNoO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlWydmb250LWZhbWlseSddID0gJ05LJztcclxuICAgIHN0cmV0Y2ggPSAhc3RyZXRjaDtcclxuICB9XHJcbiAgJG1lc3NhZ2UuaW5uZXJIVE1MID0gJ2ZvbnQgY2hhbmdlZCc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQNSBzZXR1cFxyXG4gKi9cclxud2luZG93LnNldHVwID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAvLyBFbGVtZW50c1xyXG4gICRjb3VudCA9IGRnKCdjb3VudCcpO1xyXG4gICRudGggPSBkZygnbnRoJyk7XHJcbiAgJHRpdGxlID0gZGcoJ3RpdGxlJyk7XHJcbiAgJG1lc3NhZ2UgPSBkZygnbWVzc2FnZScpO1xyXG4gICRzaG93VXBncmFkZXMgPSBkZygnc2hvd1VwZ3JhZGVzJyk7XHJcbiAgJHVwZ3JhZGVzID0gZGcoJ3VwZ3JhZGVzJyk7XHJcbiAgJGludHJvID0gZGcoJ2ludHJvJyk7XHJcbiAgJHRpbWVyID0gZGcoJ3RpbWVyJyk7XHJcbiAgJGdvYWwgPSBkZygnZ29hbCcpO1xyXG4gICRuYW1lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYW1lJyk7XHJcblxyXG4gIGdhbWUgPSBuZXcgTnRoKHtcclxuICAgICRjb3VudDogJGNvdW50LFxyXG4gICAgJG1lc3NhZ2U6ICRtZXNzYWdlLFxyXG4gICAgJHVwZ3JhZGVzOiAkdXBncmFkZXMsXHJcbiAgICAkc2hvd1VwZ3JhZGVzOiAkc2hvd1VwZ3JhZGVzLFxyXG4gICAgJHRpbWVyOiAkdGltZXIsXHJcbiAgICAkaW50cm86ICRpbnRybyxcclxuICB9KTtcclxuICBnYW1lLmluaXRpYWxpemUoKTtcclxuXHJcbiAgLy8gSGFuZGxlcnNcclxuICAkdGl0bGUub25jbGljayA9IGNoYW5nZUZvbnQ7XHJcbiAgJG50aC5vbmNsaWNrID0gZ2FtZS5hZGRDb3VudC5iaW5kKGdhbWUpO1xyXG4gICRuYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICBuYW1lLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGdhbWUucHVyY2hhc2UobmFtZS5wYXJlbnRFbGVtZW50LmlkKTtcclxuICAgIH07XHJcbiAgfSk7XHJcbiAgJHNob3dVcGdyYWRlcy5vbmNsaWNrID0gZ2FtZS5zaG93VXBncmFkZXMuYmluZChnYW1lKTtcclxuICAkZ29hbC5pbm5lckhUTUwgPSAnZ29hbDogJyArIGdhbWUuZ29hbDtcclxuICBnYW1lLnJ1blRpbWVyKCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUDUgZHJhd1xyXG4gKi9cclxud2luZG93LmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gVXBkYXRlIHRoZSBkb20sIGludGVybmFsIGFkZGVycywgYW5kIGdyb3d0aFJhdGVcclxuICBpZiAoZ2FtZS5hZGRlcnNIYXZlQ2hhbmdlZCkge1xyXG4gICAgZ2FtZS51cGRhdGVBZGRlcnNBbmRHcm93dGhSYXRlKCk7XHJcbiAgfVxyXG4gIC8vIEluY3JlYXNlZCB0aGUgZ2FtZSBjb3VudCBpZiBub3QgcGF1c2VkIG9yIGNhbGN1bGF0aW5nXHJcbiAgaWYgKGdhbWUuY2FsY3VsYXRpbmcpIHtcclxuICB9IGVsc2UgaWYgKGdhbWUucGF1c2VkKSB7XHJcbiAgfSBlbHNlIHtcclxuICAgIGdhbWUuZ3JvdygpO1xyXG4gICAgLy8gU2hvdyB0aGlzIGluY3JlYXNlXHJcbiAgICAkY291bnQuaW5uZXJIVE1MID0gZmxvb3IoZ2FtZS5jb3VudCk7XHJcbiAgfVxyXG59O1xyXG4iXX0=

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgZmxvb3IgKi9cclxudmFyIE50aCA9IHJlcXVpcmUoJy4vY2xhc3Nlcy9OdGgnKTtcclxuXHJcbi8vIEdsb2JhbHNcclxudmFyIHN0cmV0Y2ggPSBmYWxzZSxcclxuICBnYW1lLFxyXG4gICRjb3VudCxcclxuICAkbnRoLFxyXG4gICR0aXRsZSxcclxuICAkbWVzc2FnZSxcclxuICAkc2hvd1VwZ3JhZGVzLFxyXG4gICR1cGdyYWRlcyxcclxuICAkaW50cm8sXHJcbiAgJHRpbWVyLFxyXG4gICRnb2FsLFxyXG4gICRuYW1lcztcclxuLyoqXHJcbiAqIFdyYXBwZXJcclxuICovXHJcbndpbmRvdy5kZyA9IGZ1bmN0aW9uIChlbCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hhbmdlcyB0aGUgYm9keSBmb250XHJcbiAqL1xyXG5mdW5jdGlvbiBjaGFuZ2VGb250ICgpIHtcclxuICBpZiAoc3RyZXRjaCkge1xyXG4gICAgZG9jdW1lbnQuYm9keS5zdHlsZVsnZm9udC1mYW1pbHknXSA9ICdOdSc7XHJcbiAgICBzdHJldGNoID0gIXN0cmV0Y2g7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGVbJ2ZvbnQtZmFtaWx5J10gPSAnTksnO1xyXG4gICAgc3RyZXRjaCA9ICFzdHJldGNoO1xyXG4gIH1cclxuICAkbWVzc2FnZS5pbm5lckhUTUwgPSAnZm9udCBjaGFuZ2VkJztcclxufVxyXG5cclxuLyoqXHJcbiAqIFA1IHNldHVwXHJcbiAqL1xyXG53aW5kb3cuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIC8vIEVsZW1lbnRzXHJcbiAgJGNvdW50ID0gZGcoJ2NvdW50Jyk7XHJcbiAgJG50aCA9IGRnKCdudGgnKTtcclxuICAkdGl0bGUgPSBkZygndGl0bGUnKTtcclxuICAkbWVzc2FnZSA9IGRnKCdtZXNzYWdlJyk7XHJcbiAgJHNob3dVcGdyYWRlcyA9IGRnKCdzaG93VXBncmFkZXMnKTtcclxuICAkdXBncmFkZXMgPSBkZygndXBncmFkZXMnKTtcclxuICAkaW50cm8gPSBkZygnaW50cm8nKTtcclxuICAkdGltZXIgPSBkZygndGltZXInKTtcclxuICAkZ29hbCA9IGRnKCdnb2FsJyk7XHJcbiAgJG5hbWVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLm5hbWUnKTtcclxuXHJcbiAgZ2FtZSA9IG5ldyBOdGgoe1xyXG4gICAgJGNvdW50OiAkY291bnQsXHJcbiAgICAkbWVzc2FnZTogJG1lc3NhZ2UsXHJcbiAgICAkdXBncmFkZXM6ICR1cGdyYWRlcyxcclxuICAgICRzaG93VXBncmFkZXM6ICRzaG93VXBncmFkZXMsXHJcbiAgICAkdGltZXI6ICR0aW1lcixcclxuICAgICRpbnRybzogJGludHJvLFxyXG4gIH0pO1xyXG4gIGdhbWUuaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAvLyBIYW5kbGVyc1xyXG4gICR0aXRsZS5vbmNsaWNrID0gY2hhbmdlRm9udDtcclxuICAkbnRoLm9uY2xpY2sgPSBnYW1lLmFkZENvdW50LmJpbmQoZ2FtZSk7XHJcbiAgJG5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgIG5hbWUub25jbGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgZ2FtZS5wdXJjaGFzZShuYW1lLnBhcmVudEVsZW1lbnQuaWQpO1xyXG4gICAgfTtcclxuICB9KTtcclxuICAkc2hvd1VwZ3JhZGVzLm9uY2xpY2sgPSBnYW1lLnNob3dVcGdyYWRlcy5iaW5kKGdhbWUpO1xyXG4gICRnb2FsLmlubmVySFRNTCA9ICdnb2FsOiAnICsgZ2FtZS5nb2FsO1xyXG4gIGdhbWUucnVuVGltZXIoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQNSBkcmF3XHJcbiAqL1xyXG53aW5kb3cuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBVcGRhdGUgdGhlIGRvbSwgaW50ZXJuYWwgYWRkZXJzLCBhbmQgZ3Jvd3RoUmF0ZVxyXG4gIGlmIChnYW1lLmFkZGVyc0hhdmVDaGFuZ2VkKSB7XHJcbiAgICBnYW1lLnVwZGF0ZUFkZGVyc0FuZEdyb3d0aFJhdGUoKTtcclxuICB9XHJcbiAgLy8gSW5jcmVhc2VkIHRoZSBnYW1lIGNvdW50IGlmIG5vdCBwYXVzZWQgb3IgY2FsY3VsYXRpbmdcclxuICBpZiAoZ2FtZS5jYWxjdWxhdGluZykge1xyXG4gIH0gZWxzZSBpZiAoZ2FtZS5wYXVzZWQpIHtcclxuICB9IGVsc2Uge1xyXG4gICAgZ2FtZS5ncm93KCk7XHJcbiAgICAvLyBTaG93IHRoaXMgaW5jcmVhc2VcclxuICAgICRjb3VudC5pbm5lckhUTUwgPSBmbG9vcihnYW1lLmNvdW50KTtcclxuICB9XHJcbn07XHJcbiJdLCJmaWxlIjoiaW5kZXguanMifQ==
