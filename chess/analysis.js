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
      parsePly(lply,gameState,0);
      parsePly(rply,gameState,1);
      writePieceAnnotation(gameState);
      writeRelationAnnotation(gameState);
  }
    return gameState.annotations;
};

var s = parse(png);
