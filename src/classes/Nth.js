
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
  // Unlock little delta by default
  this.adders.delta.unlocked = true;
  // The total count used for purchasing adders
  this.count = 0;
  // Number to increaes count by for each click
  this.clickValue = 1;
  // Time in seconds
  this.gameTime = 0;
  // Goal to get to
  this.goal = 1000000;
  this.growthRate = 0;
  this.addersChanged = true;
  this.paused = false;
  this.calculating = false;
  // These upgrades should be classes and they should modify adders
  // through a method of the adders themselves
  this.upgrades = [{
    id : 0,
    class : "nth",
    cost : 450,
    desc : "increases nth value to 2",
    enable : function () {
      this.clickValue = 2;
    }
  },
  {
    id : 1,
    class : "delta",
    cost : 6500,
    desc : "increases delta rate to 0.03",
    enable : function () {
      this.adders.delta.rate = 0.03;
    }
  },
  {
    id : 2,
    class :"Sigma",
    cost : 25000,
    desc : "increases Sigma rate to 0.14",
    enable : function () {
      this.adders.Sigma.rate = 0.14;
    }
  }];
};

/**
 * Updates the internal state of calculating and the DOM
 */
Nth.prototype.toggleCalculating = function () {
  if (!this.calculating) {
    this.$message.innerHTML = "calculating . . .";
    this.$count.innerHTML = "~~~ " + floor(this.count) + " ~~~";
    this.calculating = true;
  } else {
    this.$message.innerHTML = "finished calculation";
    this.$count.innerHTML = this.count;
    this.calculating = false;
  }
};

/**
 * Attempts to purchase an adder
 * @param {String} id - id of the adder
 */
Nth.prototype.purchase = function (id) {
  console.log(this);
  var adder = this.adders[id];
  console.log(this.adders)
  // You can only attempt to purchase unlocked adders
  if (adder.unlocked) {
    var cost = adder.cost();
    if (this.count >= cost) {
      // Purchase from the total count
      this.count -= cost;
      // Increment the number of owned adders of that type
      adder.count++;
      this.addersChanged = true;
      this.$message.innerHTML = "purchased " + id + ".";
      // If there's an update function on the adder, update
      if (adder.update) {
        adder.update();
      }
      // If there's a calculate function, run it only
      // if another calculator isn't running
      if (!this.calculating && adder.calculate) {
        this.toggleCalculating();
        // Calculate takes and amount of time depending on
        // the adder's calculate function
        var which = this;
        adder.calculate(function () {
          which.toggleCalculating();
        });
      }
      // The first time something is purchased, unlock the next
      if (adder.count === 1) {
        var next = dg(id).nextSibling.nextSibling;
        if (next) {
          this.adders[next.id].unlocked = true;
          this.$message.innerHTML += " unlocked " + next.id + ".";
        }
      }
    } else {
      this.$message.innerHTML = "cannot afford to purchase " + id;
    }
  } else {
    this.$message.innerHTML = id + " has not been unlocked yet.";
  }
};

/**
 * Shows the upgrades table
 *
 */
Nth.prototype.showUpgrades = function () {
  this.$intro.remove();
  this.$showUpgrades.remove();
  console.log(this);
  this.upgrades.forEach(function (upgrade) {
    var div = document.createElement('div');
    div.classList += 'upgrade ' + upgrade.class;
    div.innerHTML = upgrade.desc + '\t[' + upgrade.cost + ']';
    div.onclick = function () {
      this.purchaseUpgrade(upgrade.id);
      if (upgrade.enabled) {
        this.classList += ' enabled';
      }
    };
    this.$upgrades.appendChild(div);
  }.bind(this));
};

/**
 * Adds click value when nth button is pressed
 */
Nth.prototype.addCount = function () {
  this.count += this.clickValue;
  this.$message.innerHTML = ". . .";
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
      var str = "";
      for (var i = 0; i < a.count; i++) {
        str += "&" + adder + ";";
      }
      this.$count.innerHTML = str || "-";
      var $total = document.querySelectorAll('#' + adder + ' .total')[0];
      $total.innerHTML = adder + " total " + a.count;
      var $rate = document.querySelectorAll('#' + adder + ' .rate')[0];
      if (a.count) {
        $rate.innerHTML = "rate: " + a.count * a.rate.toFixed(3);
      } else {
        $rate.innerHTML = "rate: {" + a.rate.toFixed(3) + "}";
      }
    }
    // If there's at least one adder, update the growthRate
    if (a.count) {
      this.growthRate += a.count * a.rate;
    }
  }
  this.addersChanged = false;
};

Nth.prototype.purchaseUpgrade = function (id) {
  var upgrade = this.upgrades[id];
  // Can't rebuy
  if (!upgrade.enabled) {
    // Only buy if affordable
    if (this.count >= upgrade.cost) {
      this.count -= upgrade.cost;
      upgrade.enable();
      upgrade.enabled = true;
      this.addersChanged = true;
    } else {
      this.$message.innerHTML = "cannot afford upgrade for " + upgrade.class + ".";
    }
  } else {
    this.$message.innerHTML = "cannot rebuy upgrade.";
  }
};

Nth.prototype.runTimer = function () {
  this.gameTime++;
  this.$timer.innerHTML = this.gameTime + "s";
  setTimeout(this.runTimer.bind(this), 1000);
};

module.exports = Nth;
