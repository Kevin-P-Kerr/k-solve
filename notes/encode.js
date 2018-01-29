var READFLAG = false;
var fs = require('fs');
var notes;

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

if (READFLAG) {
    notes = fs.readFileSync("./encrypted.txt").toString();
    notes = new Buffer(notes,"base64").toString("base64");
    notes = new Buffer(decode(notes,key),"base64").toString("utf8");
    fs.writeFileSync("./notes.txt",notes);
}
else {
    notes = fs.readFileSync("./notes.txt").toString();
    notes = encode(notes,key);
    fs.writeFileSync("./encrypted.txt", notes);
}

