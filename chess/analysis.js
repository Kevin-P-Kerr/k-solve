var fs = require('fs');

var png = fs.readFileSync("./game.png").toString();

var alpha = [false,'a','b','c','d','e','f','g','h'];

var initGameState = function () {
  var order = [false,"R","N","B","Q","K","B","N","R"];
  var s =[false];
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
  for (i=17,ii=48;i<=ii;i++) {
    s.push(0);
  }
  for (i=49,ii=56;i<=ii;i++) {
    s.push({init:true,color:"black",piece:"p"});
  }
  for (i=57,ii=64;i<=ii;i++) {
    o = {};
    o.piece = order[i-56];
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
      while (s !== ' ' && s !== '\t' && s !== '\n'  && s !== '\r' && s !== '.' && s!==']' && i < ii) {
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
  return (alpha.indexOf(move[0]))+((parseInt(move[1],10)-1) *8);
};

var getLocation = function (move) {
  var offset = isCheck(move) ? 1 : 0;
  return getSimpleLocation(move[move.length-(2+offset)]+move[move.length-(1+offset)]);
};

var isCheck = function (move) {
  return move.match("#") || move.match(/\+/);
};

var isUnambiguous = function (move) {
  return move.length == 3 || (isCheck(move) && move.length == 4);
};

var totallyDetermined = function (move) {
  return move.length == 5 || (isCheck(move) && move.length == 6);
};

var getRD = function (i,up) {
  var sign = up ? 1 : -1;
  var n = i+(9*sign);
  if (n <= 64 && n>=1) {
    return n;
  }
  return false;
};

var getLD = function (i,up) {
  var sign = up ? 1 : -1;
  var n = i+(7*sign);
  if (n <= 64 && n >= 1) {
    return n;
  }
  return false;
};

var getDiagonals = function (i) {
  var d = i;
  var ret = [];
  while (d = getRD(d,true)) {
    ret.push(d);
  }
  d = i;
  while (d = getLD(d,true)) {
    ret.push(d);
  }
  d = i;
  while (d = getRD(d,false)) {
    ret.push(d);
  }
  d = i;
  while (d = getLD(d,false)) {
    ret.push(d);
  }
  return ret;
};

var getDiagonalsBlocking = function (i,gameState) {
  var d = i;
  var ret = [];
  while (d = getRD(d,true)) {
    ret.push(d);
    if (gameState[d]) { break; }
  }
  d = i;
  while (d = getLD(d,true)) {
    ret.push(d);
    if (gameState[d]) { break; }
  }
  d = i;
  while (d = getRD(d,false)) {
    ret.push(d);
    if (gameState[d]) { break; }
  }
  d = i;
  while (d = getLD(d,false)) {
    ret.push(d);
    if (gameState[d]) { break; }
  }
  return ret;
};

var getRankAndFileBlocking = function (i,gameState) {
  var ret = [];
  var ll = i%8;
  if (ll == 0) { ll = 8; }
  var rl = 8-ll;
  var n = i-1;
  while (ll>0) {
    ret.push(n);
    if (gameState[n]) {
      break;
    }
    n--;
    ll--;
  }
  n = i+1;
  while (rl>0) {
    ret.push(n);
    if (gameState[n]) {
      break;
    }
    n++;
    rl--;
  }
  n = i+8;
  while (n <= 64) {
    ret.push(n);
    if (gameState[n]) {
      break;
    }
    n+=8;
  }
  n = i-8;
  while (n >= 1) {
    ret.push(n);
    if (gameState[n]) {
      break;
    }
    n-=8;
  }
  return ret;
};

var getRankAndFile = function (i) {
  var ret = [];
  var ll = i%8;
  if (ll == 0) { ll = 8; }
  var rl = 8-ll;
  var n = i-1;
  while (ll>0) {
    ret.push(n);
    n--;
    ll--;
  }
  n = i+1;
  while (rl>0) {
    ret.push(n);
    n++;
    rl--;
  }
  n = i+8;
  while (n <= 64) {
    ret.push(n);
    n+=8;
  }
  n = i-8;
  while (n >= 1) {
    ret.push(n);
    n-=8;
  }
  return ret;
};

var getPreviousLocation = function (move,i,gameState,isWhite) {
  var loc;
  var p = move[0];
  var test = function (n) {
    return gameState[n] && ((gameState[n].color == "white") == isWhite) && gameState[n].piece == p;
  };
  if (isUnambiguous(move)) {
    var cand;
    var move
    if (p == 'B') {
      cand = getDiagonalsBlocking(i,gameState);
    }
    else if (p == 'R') {
      cand = getRankAndFileBlocking(i,gameState);
    }
    else if (p == 'Q') {
      var diag = getDiagonalsBlocking(i,gameState);
      cand = getRankAndFileBlocking(i,gameState);
      diag.forEach(function (i) { cand.push(i); });
    }
    else if (p == 'K') {
      cand = [i-1,i+1,i-8,i+8,i+9,i-9,i+7,i-7];
    }
    else if (p == 'N') {
        var cand = getNightMoves(i);
    }
    else {
      throw new Error();
    }
    var g = 0;
    var gg = cand.length;
    for (; g<gg;g++ ){
      if (test(cand[g])) {
        return cand[g];
      }
    }
    console.log(move,p,i,getCoord(i));
    cand.forEach(function (n) { console.log(getCoord(n)); });
    throw new Error();
  }
  else if (totallyDetermined(move)) {
      return getSimpleLocation(move[1]+move[2]);
  }
  else {
    var locator = move[1];
    iter = 0;
    var inc;
    var psqr;
    if (alpha.indexOf(locator) >= 1) {
      locator = alpha.indexOf(locator);
      inc = 8;
    }
    else {
      locator = parseInt(locator,10);
      inc = 1;
    }
    while (iter < 8) {
      if (test(locator+(inc*iter))) {
        return locator+(inc*iter);
      }
      iter++;
    }
  }
  throw new Error();
};

var parsePly = function (ply,gameState,isWhite) {
  var move = ply.val;
  var sqr;
  if (move === "O-O") {
    var offset = isWhite? 0:56;
    gameState[offset+6] = gameState[offset+8];
    gameState[offset+7] = gameState[offset+5];
    gameState[offset+6].init = false;
    gameState[offset+7].init =false;
    gameState[offset+5] = 0;
    gameState[offset+8] = 0;
    return;
  }
  if (move === "O-O-O") {
    var offset = isWhite? 0:56;
    gameState[offset+4] = gameState[offset+0];
    gameState[offset+3] = gameState[offset+5];
    gameState[offset+4].init=false;
    gameState[offset+3].init=false;
    gameState[offset+5] = 0;
    gameState[offset+0] = 0;
    return;
  }
  if (move.match("-")) { // game over
    return;
  }

  if (move.length == 2) { // pawn movement
    sqr = getSimpleLocation(move);
    var psqr = sqr - (8 * (isWhite? 1 : -1));
    if (!gameState[psqr]) {
      psqr = psqr - (8*(isWhite? 1:-1));
    }
    gameState[sqr] = gameState[psqr];
    gameState[psqr] = 0;
    gameState[sqr].init = false;
  }
  else if (move.match("x")) {
    move = move.split("x");
    var capture = getLocation(move[1]);
    // if this is a pawn capture, things are simpler, maybe
    var from;
    if (alpha.indexOf(move[0]) >= 1) {
      var sign = isWhite ? 1 : -1;
      var shift = alpha.indexOf(move[0]) > alpha.indexOf(move[0]) ? -1 : 1;
      from = capture-(8*sign)+shift;
      // check for en passant
      if (!gameState[capture]) {
        capture = capture+(8*sign);
      }
    }
    else {
      from = getPreviousLocation(move[0]+"aa",capture,gameState,isWhite);
    }
    gameState[capture] = gameState[from];
    gameState[capture].init = false;
    gameState[from] = 0;
  }
  else {
    var l = getLocation(move);
    var ll = getPreviousLocation(move,l,gameState,isWhite);
    gameState[l] = gameState[ll];
    gameState[l].init = false;
    gameState[ll] = 0;
  }
};

var getCoord = function (i) {
  var file = i%8;
  if (file == 0) { file = 8; }
  var rank = ((i-file)/8)+1;
  return alpha[file]+(rank+"");
};

var writePieceAnnotation = function (gameState,color) {
  var str = gameState.annotations;
  str += ("\nfor " + color + "\n\t");
  var i =0;
  var ii = gameState.length;
  var sqr,sqrNum;
  for (;i<ii;i++) {
    sqr = gameState[i];
    if (sqr && !sqr.init && sqr.color == color) {
      if (sqr.piece !== 'p') {
        str += (sqr.piece + getCoord(i));
      }
      else {
        str += (getCoord(i));
      }
      str += " ";
    }
  }
  gameState.annotations = (str);
};

var getNightMoves = function (i) {
  var ret = [];
  if (i%8 >= 2) {
    if ((i/8) <= 6) {
      ret.push(i-1+16);
    }
    if ((i/8) >= 2) {
      ret.push(i-1-16);
    }
  }
  if (i%8 >= 3) {
    if ((i/8) <= 7) {
      ret.push(i-2+8);
    }
    if ((i/8) >= 1) {
      ret.push(i-2-8);
    }
  }
  if (i%8 <= 7) {
    if ((i/8) <= 6) {
      ret.push(i+1+16);
    }
    if ((i/8) >= 2) {
      ret.push(i+1-16);
    }
  }
  if (i%8 <= 6) {
    if ((i/8) <= 7) {
      ret.push(i+2+8);
    }
    if ((i/8) >= 1) {
      ret.push(i+2-8);
    }
  }
  return ret;
};

var writeRelationAnnotation = function (gs) {
  var str = "";
  var i = 0;
  var ii = gs.length;
  var sqr,piece,adj,n;
  for (;i<ii;i++) {
    sqr = gs[i];
    if (!sqr) { continue;}
    piece = sqr.piece;
    if (piece == 'p') {
      if ((i%8) == 1) {
        adj = [i+9];
      }
      else if ((i%8) == 0) {
        adj = [i+7];
      }
      else {
        adj = [i+7,i+9];
      }
    }
    if (piece == 'R') {
      adj = getRankAndFileBlocking(i,gs);
    }
    if (piece == 'N') {
      adj = getNightMoves(i);
    }
    if (piece == 'B') {
      adj = getDiagonalsBlocking(i,gs);
    }
    if (piece == 'Q') {
      adj = getRankAndFileBlocking(i,gs);
      var dia = getDiagonalsBlocking(i,gs);
      dia.forEach(function (s) { adj.push(s); });
    }
    if (piece == 'K') {
      adj = [i-1,i+1,i-8,i+8,i+9,i-9,i+7,i-7]
    }
    adj.forEach(function (n) {
      var o_sqr = gs[n];
      if (!o_sqr) { return; }
      if (o_sqr.color == sqr.color) {
        str += "(defend ";
      }
      else {
        str += "(attack ";
      }
      str += (getCoord(i) + " " + getCoord(n));
      str += ") ";
    });
  }
  gs.annotations += str;
};

var parse = function (str) {
  var gameState = initGameState();
  gameState.annotations = "";
  var tokens = tokenize(str);
  var tok;
  var lply,rply;
  var moveNum = 1;
  try {
  while (tok = tokens()) {
    if (tok.type == TT_LBRAK) { //skip
      while (tok.type !== TT_RBRAK) {
        tok = tokens();
      }
    }
    if (tok.type == TT_SYM) {
      tok = tokens();
      if (!tok) { // game over
        return gameState.annotations;
      }
      if (tok.type !== TT_PERIOD) {
        throw new Error();
      }
      lply = tokens();
      rply = tokens();
      gameState.annotations += ("\nmove " +moveNum++ +":\n");
      gameState.annotations += (lply.val +" " +rply.val);
      parsePly(lply,gameState,true);
      parsePly(rply,gameState,false);
      writePieceAnnotation(gameState,"white");
      writePieceAnnotation(gameState,"black");
      gameState.annotations += "\n";
      writeRelationAnnotation(gameState);
    }
  } } catch(e) { console.log(gameState.annotations);  console.log(e.stack); }
  return gameState.annotations;
};

var s = parse(png);
console.log(s);
