
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
