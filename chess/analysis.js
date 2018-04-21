var fs = require('fs');

var png = fs.readFileSync("./game.png").toString();

var updateGameState = function (ln,gameState) {
  gameState.annotations += ln;
};

var parse = function (lines) {
  var gameState = [];
  gameState.annotations = "";
  lines.forEach(function (ln) {updateGameState(ln,gameState) });
  return gameState.annotations;
};

var s = parse(png.split("\n"));
console.log(s);
