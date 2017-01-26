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
};

/**
 * Sets up the adder
 */
Adder.prototype.initialize = function () {
  this.count = 0;
  this.unlocked = false;
  this.r = this.generateR();
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

},{"../data/Adders":3,"./Adder":1}],3:[function(require,module,exports){

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
    count : 0,
    rate : 0.001,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return (this.count * 10) + 10;
    },
    costHtmlFn : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  },
  Sigma: {
    count : 0,
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
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  },
  Delta: {
    count : 0,
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
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  },
  rho: {
    count : 0,
    rate : 0.08,
    rFn: function () {
      return floor(random(50,150));
    },
    update : function () {
      this.r = this.count * floor(random(50,150));
    },
    calculate : function (next) {
      setTimeout(next, floor(random(500,3000)));
    },
    costFn: function () {
      return ((this.count + 1) * 225) + this.r;
    },
    costHtmlFn : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  },
  lambda: {
    count : 0,
    rate : 0.14,
    rFn: function () {
      return 1;
    },
    costFn: function () {
      return (this.count * this.count * 1500);
    },
    costHtmlFn : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  },
  pi: {
    count : 0,
    rate : 0.8,
    rFn: function () {
      return Math.PI * this.count * 10000;
    },
    costFn: function () {
      return (this.count + 1 * 12000) + this.r + floor(random(1,20000));
    },
    calculate : function (next) {
      setTimeout(next, floor(random(1500,5000)));
    },
    costHtmlFn : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  },
  alpha: {
    count : 0,
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
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  },
  sigma: {
    count : 0,
    rate : 3.5,
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return "";
    }
  },
  Lambda: {
    count : 0,
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return "";
    }
  },
  omega: {
    count : 0,
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return "";
    }
  },
  epsilon: {
    count : 0,
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return "";
    }
  },
  Psi: {
    count : 0,
    rFn: function () {
      return 1;
    },
    costFn: function () {

    },
    costHtmlFn : function () {
      return "";
    }
  }
};
module.exports = Adders;

},{}],4:[function(require,module,exports){
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
  if (game.addersChanged) {
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

},{"./classes/Nth":2}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgZmxvb3IgKi9cclxudmFyIE50aCA9IHJlcXVpcmUoJy4vY2xhc3Nlcy9OdGgnKTtcclxuXHJcbi8vIEdsb2JhbHNcclxudmFyIHN0cmV0Y2ggPSBmYWxzZSxcclxuICBnYW1lLFxyXG4gICRjb3VudCxcclxuICAkbnRoLFxyXG4gICR0aXRsZSxcclxuICAkbWVzc2FnZSxcclxuICAkc2hvd1VwZ3JhZGVzLFxyXG4gICR1cGdyYWRlcyxcclxuICAkaW50cm8sXHJcbiAgJHRpbWVyLFxyXG4gICRnb2FsLFxyXG4gICRuYW1lcztcclxuLyoqXHJcbiAqIFdyYXBwZXJcclxuICovXHJcbndpbmRvdy5kZyA9IGZ1bmN0aW9uIChlbCkge1xyXG4gIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hhbmdlcyB0aGUgYm9keSBmb250XHJcbiAqL1xyXG5mdW5jdGlvbiBjaGFuZ2VGb250ICgpIHtcclxuICBpZiAoc3RyZXRjaCkge1xyXG4gICAgZG9jdW1lbnQuYm9keS5zdHlsZVsnZm9udC1mYW1pbHknXSA9ICdOdSc7XHJcbiAgICBzdHJldGNoID0gIXN0cmV0Y2g7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGVbJ2ZvbnQtZmFtaWx5J10gPSAnTksnO1xyXG4gICAgc3RyZXRjaCA9ICFzdHJldGNoO1xyXG4gIH1cclxuICAkbWVzc2FnZS5pbm5lckhUTUwgPSAnZm9udCBjaGFuZ2VkJztcclxufVxyXG5cclxuLyoqXHJcbiAqIFA1IHNldHVwXHJcbiAqL1xyXG53aW5kb3cuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIC8vIEVsZW1lbnRzXHJcbiAgJGNvdW50ID0gZGcoJ2NvdW50Jyk7XHJcbiAgJG50aCA9IGRnKCdudGgnKTtcclxuICAkdGl0bGUgPSBkZygndGl0bGUnKTtcclxuICAkbWVzc2FnZSA9IGRnKCdtZXNzYWdlJyk7XHJcbiAgJHNob3dVcGdyYWRlcyA9IGRnKCdzaG93VXBncmFkZXMnKTtcclxuICAkdXBncmFkZXMgPSBkZygndXBncmFkZXMnKTtcclxuICAkaW50cm8gPSBkZygnaW50cm8nKTtcclxuICAkdGltZXIgPSBkZygndGltZXInKTtcclxuICAkZ29hbCA9IGRnKCdnb2FsJyk7XHJcbiAgJG5hbWVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLm5hbWUnKTtcclxuXHJcbiAgZ2FtZSA9IG5ldyBOdGgoe1xyXG4gICAgJGNvdW50OiAkY291bnQsXHJcbiAgICAkbWVzc2FnZTogJG1lc3NhZ2UsXHJcbiAgICAkdXBncmFkZXM6ICR1cGdyYWRlcyxcclxuICAgICRzaG93VXBncmFkZXM6ICRzaG93VXBncmFkZXMsXHJcbiAgICAkdGltZXI6ICR0aW1lcixcclxuICAgICRpbnRybzogJGludHJvLFxyXG4gIH0pO1xyXG4gIGdhbWUuaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAvLyBIYW5kbGVyc1xyXG4gICR0aXRsZS5vbmNsaWNrID0gY2hhbmdlRm9udDtcclxuICAkbnRoLm9uY2xpY2sgPSBnYW1lLmFkZENvdW50LmJpbmQoZ2FtZSk7XHJcbiAgJG5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgIG5hbWUub25jbGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgZ2FtZS5wdXJjaGFzZShuYW1lLnBhcmVudEVsZW1lbnQuaWQpO1xyXG4gICAgfTtcclxuICB9KTtcclxuICAkc2hvd1VwZ3JhZGVzLm9uY2xpY2sgPSBnYW1lLnNob3dVcGdyYWRlcy5iaW5kKGdhbWUpO1xyXG4gICRnb2FsLmlubmVySFRNTCA9ICdnb2FsOiAnICsgZ2FtZS5nb2FsO1xyXG4gIGdhbWUucnVuVGltZXIoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQNSBkcmF3XHJcbiAqL1xyXG53aW5kb3cuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyBVcGRhdGUgdGhlIGRvbSwgaW50ZXJuYWwgYWRkZXJzLCBhbmQgZ3Jvd3RoUmF0ZVxyXG4gIGlmIChnYW1lLmFkZGVyc0NoYW5nZWQpIHtcclxuICAgIGdhbWUudXBkYXRlQWRkZXJzQW5kR3Jvd3RoUmF0ZSgpO1xyXG4gIH1cclxuICAvLyBJbmNyZWFzZWQgdGhlIGdhbWUgY291bnQgaWYgbm90IHBhdXNlZCBvciBjYWxjdWxhdGluZ1xyXG4gIGlmIChnYW1lLmNhbGN1bGF0aW5nKSB7XHJcbiAgfSBlbHNlIGlmIChnYW1lLnBhdXNlZCkge1xyXG4gIH0gZWxzZSB7XHJcbiAgICBnYW1lLmdyb3coKTtcclxuICAgIC8vIFNob3cgdGhpcyBpbmNyZWFzZVxyXG4gICAgJGNvdW50LmlubmVySFRNTCA9IGZsb29yKGdhbWUuY291bnQpO1xyXG4gIH1cclxufTtcclxuIl0sImZpbGUiOiJpbmRleC5qcyJ9
