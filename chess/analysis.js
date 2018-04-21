var fs = require('fs');

var png = fs.readFileSync("./game.png").toString();

var alpha = ['a','b','c','d','e','f','g','h'];

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

var killwhite = function (str,i) {
  while (str[i] == '\n' || str[i] == " " || str[i] == '\t' || str[i] == '\r') {
    i++;
  }
  return i;
};

var TT_LBRAK = 0;
var TT_RBRAK = 1;
var TT_SYM = 2;
var TT_PERIOD = 3;


var tokenize = function (str) {
  var i = 0;
  var ii = str.length;
  var tokens = [];
  var tok;
  var s,ss;
  for(;i<ii;i++) {
    tok = {};
    i = killwhite(str,i);
    s = str[i];
    if (s == '[') {
      tokens.push({type:TT_LBRAK});
      continue;
    }
    if (s == ']') {
      tokens.push({type:TT_RBRAK});
      continue;
    }
    if (s == '.') {
      tokens.push({type:TT_PERIOD});
      continue;
    }
    else {
      ss = "";
      while (s !== ' ' && s !== '\t' && s !== '\n'  && s !== '\r' && s !== '.' && i < ii) {
        ss += s;
        i++;
        s = str[i];
      }
      i--;
      tok = {type:TT_SYM,val:ss};
      tokens.push(tok);
    }
  }
  return makeTokens(tokens);
}; 

var makeTokens = function(tokens) {
  var i = 0;
  return function () {
    var t = tokens[i];
    i++;
    return t;
  }
};

var getSimpleLocation = function(move) {
  return (alpha.indexOf(move[0])*8)+parseInt(move[1],10)
};

var getLocation = function (move) {
  return getSimpleLocation(move[move.length-2]+move[move.length-1]);
};

var getPreviousLocation = function (move,i,gameState,isWhite) {
  var loc;
  if (move.length == 3) {
    var p = move[0];
    var test = function (n) {
      return gameState[n] && (gameState[n].color == "white" && isWhite) && gameState[n].piece == p;
    };
    var testTwoDirections = function (n) {
      if (test(n)) {
        return n;
      }
      if (test(n*-1)) {
        return n*-1;
      }
      return false;
    };
    var move
    if (p == 'b') {
      var iter = 1;
      while (iter < 8) {
        loc = testTwoDirections(7*iter);
        if (loc) {
          return loc;
        }
        loc = testTwoDirections(9*iter);
        if (loc) {
          return loc;
        }
        iter++;
      }
    }
    if (p == 'r') {
      var iter = 1;
      while (iter < 8) {
        loc = testTwoDirections(8*iter);
        if (loc) {
          return loc;
        }
        loc = testTwoDirections(1*iter);
        if (loc) {
          return loc;
        }
        iter++;
      }
    }
    if (p == 'q') {
      var iter = 1;
      while (iter < 8) {
        loc = testTwoDirections(8*iter);
        if (loc) {
          return loc;
        }
        loc = testTwoDirections(1*iter);
        if (loc) {
          return loc;
        }
        loc = testTwoDirections(9*iter);
        if (loc) {
          return loc;
        }
        loc = testTwoDirections(7*iter);
        if (loc) {
          return loc;
        }
        iter++;
      }
    }
    if (p == 'n') {
        var cand = [i-2-8,i-2+8,i+2-8,i+2+8,i-16-1,i-16+1,i+16-1,1+16+1];
        var g = 0;
        var gg = cand.length;
        for (; g<gg;g++ ){
          if (test(cand[g])) {
            return cand[g];
          }
        }
        throw new Error();
    }
    throw new Error();
  }

};

var parsePly = function (ply,gameState,isWhite) {
  var move = ply.val;
  var sqr;
  if (playVal.match("-")) { // game over
    return;
  }
  if (move === "O-O") {
    var offset = isWhite? 0:56;
    gameState[offset+6] = gameState[offset+8];
    gameState[offset+7] = gameState[offset+5];
    gameState[offset+5] = 0;
    gameState[offset+8] = 0;
    return;
  }
  if (move === "O-O-O") {
    var offset = isWhite? 0:56;
    gameState[offset+4] = gameState[offset+0];
    gameState[offset+3] = gameState[offset+5];
    gameState[offset+5] = 0;
    gameState[offset+0] = 0;
    return;
  }

  if (move.length == 2) { // pawn movement
    sqr = getSimpleLocation(move);
    var psqr = sqr - (8 * (isWhite? 1 : -1));
    gameState[sqr] = gameState[psqr];
    gameState[psqr] = 0;
  }
  else if (move.match("x")) {
    move = match.split("x");
    var capture = getSimpleLocation(move[1]);
    var from = getLocation(move[0]);
    gameState[capture] = gameState[from];
    fameState[from] = 0;
  }
  else {
    var l = getLocation(move);
    var ll = getPreviousLocation(move,l,gameState,isWhite);
    gameState[l] = gameState[ll];
    gameState[ll] = 0;
  }
};

var parse = function (str) {
  var gameState = initGameState();
  gameState.annotations = "";
  var tokens = tokenize(str);
  var tok;
  var lply,rply;
  while (tok = tokens()) {
    if (tok.type == TT_LBRAK) { //skip
      while (tok.type !== TT_RBRAK) {
        tok = tokens();
      }
    }
    if (tok.type == TT_SYM) {
      tok = tokens();
      if (tok.type !== TT_PERIOD) {
        throw new Error();
      }
      lply = tokens();
      rply = tokens();
      parsePly(lply,gameState,true);
      parsePly(rply,gameState,false);
      writePieceAnnotation(gameState);
      writeRelationAnnotation(gameState);
    }
  }
  return gameState.annotations;
};

var s = parse(png);
