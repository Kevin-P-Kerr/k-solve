var fs = require('fs');

var png = fs.readFileSync("./game.png").toString();

var alpha = ['a','b','c','d','e','f','g','h'];
var updateGameState = function (ln,gameState) {
  gameState.annotations += ln;
  if (ln.match("[")) { return; }
  ln =ln.split(/\d\./);
  ln.forEach(function (ln) {
    if (ln.length < 5) { return; }
    ln = ln.split(' ');
    var moveWhite = {};
    if (ln[0].length == 2) {
      moveWhite.moveto = (alpha.indexOf(ln[0][0])*8)+parseInt(ln[0]ln[1],2);
    }
    else if (ln[0].length == 3) {
      moveWhite.moveto = (alpha.indexOf(ln[0][1])*8)+parseInt(ln[0]ln[2],2);
    }
    else {
      moveWhite.moveto = (alpha.indexOf(ln[0][1])*8)+parseInt(ln[0]ln[2],2);
    }
  });
};

var initGameState = function () {
  var order = ["r","n","b","k","q","b","k","r"];
  var s =[];
  var i,ii,o;
  for (i=1,ii=8;i<=ii;i++){
    o = {};
    o.piece = order[i];
    o.init = true;
    o.color = "white";
    s.push(o);
  }
  for (i=9,ii=16;i<=ii;i++) {
    s.push({init:true,color:"white",piece:"p"});
  }
  for (i=17,ii=32;i<ii;i++) {
    s.push(0);
  }
  for (i=33,ii=40;i<=ii;i++) {
    s.push({init:true,color:"black",piece:"p"});
  }
  for (i=41,ii=48;i<ii;i++) {
    o = {};
    o.piece = order[i-40];
    o.init = true;
    o.color = "black";
    s.push(o);
  }
  return s;
};
  


var parse = function (lines) {
  var gameState = initGameState();
  console.log(gameState);
  gameState.annotations = "";
  lines.forEach(function (ln) {updateGameState(ln,gameState) });
  return gameState.annotations;
};

var s = parse(png.split("\n"));
console.log(s);
