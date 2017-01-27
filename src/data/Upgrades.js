
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
