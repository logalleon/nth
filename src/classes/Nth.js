
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
