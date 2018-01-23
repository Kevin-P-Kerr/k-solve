var fs = require('fs');
var plato = fs.readFileSync("./lsa.txt").toString();

var encode = function (str, key) {
    var ce = "base64";
    if (str.length < key.length) {
        throw new Error();
    }
    var i = 0;
    key = new Buffer(key,"base64").toString();
    while (str.length > key.length) {
        //console.error(i);
        key = key + key[i];
        i++;
    }
    key = new Buffer(key).toString(ce);
    // convert to buffer
    var buf = Buffer.from(str,ce);
    var keybuf = new Buffer(key,ce);
    var retbuf = Buffer.alloc(buf.length);
    var i = 0;
    var ii = buf.length;
    console.error(plato.length);
    for (;i<ii;i++) {
        console.error(i);
        retbuf[i] =(buf[i]^keybuf[i]);
    }
    return retbuf.toString(ce);
};

var decode = function (encoded,key) {
    return encode(encoded,key);
};

//var morty = new Buffer("Arrays start at 1").toString("base64");
//var rick = new Buffer("Oh no").toString("base64");
//console.error(plato.length);

var morty = new Buffer(plato).toString("base64");
var rick = new Buffer("kkerr").toString("base64");
//console.log(new Buffer(rick,"base64").toString());
//var s = encode(morty,rick);
//console.log(s);
//console.log(new Buffer(decode(s,rick),"base64").toString("utf8"));
/*
var henry = new Buffer("hcohen").toString("base64");
var message = new Buffer("eq7}dW#6h|Vwe}i2","base64").toString("base64");
console.log(new Buffer(decode(message,henry),"base64").toString());
*/
var s = fs.readFileSync("./secret.txt").toString();
console.log(s);
var ss = new Buffer(s,"base64").toString("base64");
console.log(new Buffer(decode(ss,rick),"base64").toString("utf8"));
