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
