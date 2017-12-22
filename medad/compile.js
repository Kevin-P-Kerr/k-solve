var compile2viz = function (src) {
    var prelude = "digraph G { ";
    src = src.split('\n');
    var subGraphs = src[0];
    var connections = src[1];
    var currentNodeColor = "grey";
    var currentGraphColor = "white";
    subGraphs = tokenize(subGraphs);
    console.log(subGraphs);
};

// constants 
var LPAREN = 0;
var RPAREN = 1;
var VAR = 2;

var iswhite = function (c) {
    return c == ' ' || c == '\n' || c == '\t';
};

var isValidVarChar = function (c) {
    return !iswhite(c) && c != '(' && c != ')' && c != '[' && c != ']';
};
var tokenize = function (str) {
    var tokens = [];
    var i=0;
    var ii = str.length;
    for (;i<ii;i++) {
        var c = str[i];
        if (iswhite(c)) {
            continue;
        }
        if (c == '(') {
            tokens.push({type:LPAREN});
        }
        else if (c ==')') {
            tokens.push({type:RPAREN});
        }
        else if (c=='[') {
            tokens.push({type:LBRAK});
        }
        else if (c == ']') {
            tokens.push({type:RBRAK});
        }
        else {
            var name = '';
            while (isValidVarChar(str[i])) {
                name += str[i];
                i++;
            }
            i--;
            tokens.push({type:VAR,val:name});
        }
    }
    return tokens;
};

compile2viz("a b c ( d e f (f g ))")

