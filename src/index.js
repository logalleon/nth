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
  $goal;

/**
 * Wrapper
 */
function dg (el) {
  return document.getElementById(el);
}

/**
 * Changes the body font
 */
function changeFont () {
  if (stretch) {
    document.body.style['font-family'] = "Nu";
    stretch = !stretch;
  } else {
    document.body.style['font-family'] = "NK";
    stretch = !stretch;
  }
  $message.innerHTML = "font changed";
}

/**
 * P5 setup
 */
function setup () {

  game = new Nth();
  game.init();

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

  // Handlers
  $title.onclick = changeFont;
  $nth.onclick = game.addCount.bind(game);
  $names.forEach(function (name) {
    name.onclick = function () {
      game.purchase(name.parentElement.id);
    };
  });
  $showUpgrades.onclick = game.showUpgrades.bind(game);
  $goal.innerHTML = "goal: " + game.goal;
  game.runTimer();
}

/**
 * P5 draw
 */
function draw () {
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
}

/**
 * Game class
 */
function Nth () {
  return;
}

/**
 * Updates the internal state of calculating and the DOM
 */
Nth.prototype.toggleCalculating = function () {
  if (!this.calculating) {
    $message.innerHTML = "calculating . . .";
    $count.innerHTML = "~~~ " + floor(this.count) + " ~~~";
    this.calculating = true;
  } else {
    $message.innerHTML = "finished calculation";
    $count.innerHTML = this.count;
    this.calculating = false;
  }
};

/**
 * Attempts to purchase an adder
 * @param {String} id - id of the adder
 */
Nth.prototype.purchase = function (id) {
  var adder = this.adders[id];
  // You can only attempt to purchase unlocked adders
  if (adder.unlocked) {
    var cost = adder.cost();
    if (this.count >= cost) {
      // Purchase from the total count
      this.count -= cost;
      // Increment the number of owned adders of that type
      adder.count++;
      this.addersChanged = true;
      $message.innerHTML = "purchased " + id + ".";
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
          $message.innerHTML += " unlocked " + next.id + ".";
        }
      }
    } else {
      $message.innerHTML = "cannot afford to purchase " + id;
    }
  } else {
    $message.innerHTML = id + " has not been unlocked yet.";
  }
};

/**
 * Shows the upgrades table
 *
 */
Nth.prototype.showUpgrades = function () {
  $intro.remove();
  $showUpgrades.remove();
  var which = this;
  this.upgrades.forEach(function (upgrade) {
    var div = document.createElement('div');
    div.classList += "upgrade " + upgrade.class;
    div.innerHTML = upgrade.desc + "\t[" + upgrade.cost + "]";
    div.onclick = function () {
      which.purchaseUpgrade(upgrade.id);
      if (upgrade.enabled) {
        this.classList += " enabled";
      }
    };
    $upgrades.appendChild(div);
  });
};

/**
 * Adds click value when nth button is pressed
 */
Nth.prototype.addCount = function () {
  this.count += this.clickValue;
  $message.innerHTML = ". . .";
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
      $cost.innerHTML = a.costHTML();
      var $count = document.querySelectorAll('#' + adder + ' .count')[0];
      var str = "";
      for (var i = 0; i < a.count; i++) {
        str += "&" + adder + ";";
      }
      $count.innerHTML = str || "-";
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

Nth.prototype.init = function () {
  var which = this;
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
  this.adders = {};
  this.adders.delta = {
    count : 0,
    rate : 0.001,
    unlocked : true,
    cost : function () {
      return (this.count * 10) + 10;
    },
    costHTML : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  };
  this.adders.Sigma = {
    count : 0,
    rate : 0.005,
    unlocked : false,
    r : floor(random(5,10)),
    update : function () {
      this.r = floor(random(this.count * 10, this.count * 20));
    },
    cost : function (c) {
      return ((this.count + 1) * 25) + this.r;
    },
    costHTML : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  };
  this.adders.Delta = {
    count : 0,
    unlocked : false,
    rate : 0.01,
    r : floor(random(50,150)),
    update : function () {
      this.r = floor(random(50,150)) * this.count;
    },
    cost : function () {
      return ((this.count + 1) * 100) + this.r;
    },
    costHTML : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  };
  this.adders.rho = {
    count : 0,
    unlocked : false,
    rate : 0.08,
    r : floor(random(50,150)),
    update : function () {
      this.r = this.count * floor(random(50,150));
    },
    calculate : function (next) {
      setTimeout(next, floor(random(500,3000)));
    },
    cost : function () {
      return ((this.count + 1) * 225) + this.r;
    },
    costHTML : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  };
  this.adders.lambda = {
    count : 0,
    unlocked : false,
    rate : 0.14,
    cost : function () {
      return (this.count * this.count * 1500);
    },
    costHTML : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  };
  this.adders.pi = {
    count : 0,
    unlocked : false,
    rate : 0.8,
    r : Math.PI * this.count * 10000,
    cost : function () {
      return (this.count + 1 * 12000) + this.r + floor(random(1,20000));
    },
    calculate : function (next) {
      setTimeout(next, floor(random(1500,5000)));
    },
    costHTML : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  };
  this.adders.alpha = {
    count : 0,
    unlocked : false,
    rate : 1.77,
    r : floor(random(2000,3000)),
    update : function () {
      this.r = floor(random(2000,3000)) * this.count;
    },
    cost : function () {
      return (this.count * 40000) + this.r;
    },
    costHTML : function () {
      return "\t[" + this.cost().toFixed(3)  + "]";
    }
  };
  this.adders.sigma = {
    count : 0,
    unlocked : false,
    rate : 3.5,
    cost : function () {

    },
    costHTML : function () {
      return "";
    }
  };
  this.adders.Lambda = {
    count : 0,
    unlocked : false,
    cost : function () {

    },
    costHTML : function () {
      return "";
    }
  };
  this.adders.omega = {
    count : 0,
    unlocked : false,
    cost : function () {

    },
    costHTML : function () {
      return "";
    }
  };
  this.adders.epsilon = {
    count : 0,
    unlocked : false,
    cost : function () {

    },
    costHTML : function () {
      return "";
    }
  };
  this.adders.Psi = {
    count : 0,
    unlocked : false,
    cost : function () {

    },
    costHTML : function () {
      return "";
    }
  };
  this.upgrades = [{
    id : 0,
    class : "nth",
    cost : 450,
    desc : "increases nth value to 2",
    enable : function () {
      which.clickValue = 2;
    }
  },
  {
    id : 1,
    class : "delta",
    cost : 6500,
    desc : "increases delta rate to 0.03",
    enable : function () {
      which.adders.delta.rate = 0.03;
    }
  },
  {
    id : 2,
    class :"Sigma",
    cost : 25000,
    desc : "increases Sigma rate to 0.14",
    enable : function () {
      which.adders.Sigma.rate = 0.14;
    }
  }];
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
      $message.innerHTML = "cannot afford upgrade for " + upgrade.class + ".";
    }
  } else {
    $message.innerHTML = "cannot rebuy upgrade.";
  }
};

Nth.prototype.runTimer = function () {
  this.gameTime++;
  $timer.innerHTML = this.gameTime + "s";
  setTimeout(this.runTimer.bind(this), 1000);
};