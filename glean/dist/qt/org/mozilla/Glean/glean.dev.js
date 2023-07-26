var Glean;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/fflate/esm/browser.js":
/*!********************************************!*\
  !*** ./node_modules/fflate/esm/browser.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AsyncCompress": () => (/* binding */ AsyncGzip),
/* harmony export */   "AsyncDecompress": () => (/* binding */ AsyncDecompress),
/* harmony export */   "AsyncDeflate": () => (/* binding */ AsyncDeflate),
/* harmony export */   "AsyncGunzip": () => (/* binding */ AsyncGunzip),
/* harmony export */   "AsyncGzip": () => (/* binding */ AsyncGzip),
/* harmony export */   "AsyncInflate": () => (/* binding */ AsyncInflate),
/* harmony export */   "AsyncUnzipInflate": () => (/* binding */ AsyncUnzipInflate),
/* harmony export */   "AsyncUnzlib": () => (/* binding */ AsyncUnzlib),
/* harmony export */   "AsyncZipDeflate": () => (/* binding */ AsyncZipDeflate),
/* harmony export */   "AsyncZlib": () => (/* binding */ AsyncZlib),
/* harmony export */   "Compress": () => (/* binding */ Gzip),
/* harmony export */   "DecodeUTF8": () => (/* binding */ DecodeUTF8),
/* harmony export */   "Decompress": () => (/* binding */ Decompress),
/* harmony export */   "Deflate": () => (/* binding */ Deflate),
/* harmony export */   "EncodeUTF8": () => (/* binding */ EncodeUTF8),
/* harmony export */   "FlateErrorCode": () => (/* binding */ FlateErrorCode),
/* harmony export */   "Gunzip": () => (/* binding */ Gunzip),
/* harmony export */   "Gzip": () => (/* binding */ Gzip),
/* harmony export */   "Inflate": () => (/* binding */ Inflate),
/* harmony export */   "Unzip": () => (/* binding */ Unzip),
/* harmony export */   "UnzipInflate": () => (/* binding */ UnzipInflate),
/* harmony export */   "UnzipPassThrough": () => (/* binding */ UnzipPassThrough),
/* harmony export */   "Unzlib": () => (/* binding */ Unzlib),
/* harmony export */   "Zip": () => (/* binding */ Zip),
/* harmony export */   "ZipDeflate": () => (/* binding */ ZipDeflate),
/* harmony export */   "ZipPassThrough": () => (/* binding */ ZipPassThrough),
/* harmony export */   "Zlib": () => (/* binding */ Zlib),
/* harmony export */   "compress": () => (/* binding */ gzip),
/* harmony export */   "compressSync": () => (/* binding */ gzipSync),
/* harmony export */   "decompress": () => (/* binding */ decompress),
/* harmony export */   "decompressSync": () => (/* binding */ decompressSync),
/* harmony export */   "deflate": () => (/* binding */ deflate),
/* harmony export */   "deflateSync": () => (/* binding */ deflateSync),
/* harmony export */   "gunzip": () => (/* binding */ gunzip),
/* harmony export */   "gunzipSync": () => (/* binding */ gunzipSync),
/* harmony export */   "gzip": () => (/* binding */ gzip),
/* harmony export */   "gzipSync": () => (/* binding */ gzipSync),
/* harmony export */   "inflate": () => (/* binding */ inflate),
/* harmony export */   "inflateSync": () => (/* binding */ inflateSync),
/* harmony export */   "strFromU8": () => (/* binding */ strFromU8),
/* harmony export */   "strToU8": () => (/* binding */ strToU8),
/* harmony export */   "unzip": () => (/* binding */ unzip),
/* harmony export */   "unzipSync": () => (/* binding */ unzipSync),
/* harmony export */   "unzlib": () => (/* binding */ unzlib),
/* harmony export */   "unzlibSync": () => (/* binding */ unzlibSync),
/* harmony export */   "zip": () => (/* binding */ zip),
/* harmony export */   "zipSync": () => (/* binding */ zipSync),
/* harmony export */   "zlib": () => (/* binding */ zlib),
/* harmony export */   "zlibSync": () => (/* binding */ zlibSync)
/* harmony export */ });
// DEFLATE is a complex format; to read this code, you should probably check the RFC first:
// https://tools.ietf.org/html/rfc1951
// You may also wish to take a look at the guide I made about this program:
// https://gist.github.com/101arrowz/253f31eb5abc3d9275ab943003ffecad
// Some of the following code is similar to that of UZIP.js:
// https://github.com/photopea/UZIP.js
// However, the vast majority of the codebase has diverged from UZIP.js to increase performance and reduce bundle size.
// Sometimes 0 will appear where -1 would be more appropriate. This is because using a uint
// is better for memory in most engines (I *think*).
var ch2 = {};
var wk = (function (c, id, msg, transfer, cb) {
    var w = new Worker(ch2[id] || (ch2[id] = URL.createObjectURL(new Blob([
        c + ';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'
    ], { type: 'text/javascript' }))));
    w.onmessage = function (e) {
        var d = e.data, ed = d.$e$;
        if (ed) {
            var err = new Error(ed[0]);
            err['code'] = ed[1];
            err.stack = ed[2];
            cb(err, null);
        }
        else
            cb(null, d);
    };
    w.postMessage(msg, transfer);
    return w;
});

// aliases for shorter compressed code (most minifers don't do this)
var u8 = Uint8Array, u16 = Uint16Array, u32 = Uint32Array;
// fixed length extra bits
var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
// fixed distance extra bits
// see fleb note
var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
// code length index map
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
// get base, reverse index map from extra bits
var freb = function (eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
        b[i] = start += 1 << eb[i - 1];
    }
    // numbers here are at max 18 bits
    var r = new u32(b[30]);
    for (var i = 1; i < 30; ++i) {
        for (var j = b[i]; j < b[i + 1]; ++j) {
            r[j] = ((j - b[i]) << 5) | i;
        }
    }
    return [b, r];
};
var _a = freb(fleb, 2), fl = _a[0], revfl = _a[1];
// we can ignore the fact that the other numbers are wrong; they never happen anyway
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b[0], revfd = _b[1];
// map of value to reverse (assuming 16 bits)
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
    // reverse table algorithm from SO
    var x = ((i & 0xAAAA) >>> 1) | ((i & 0x5555) << 1);
    x = ((x & 0xCCCC) >>> 2) | ((x & 0x3333) << 2);
    x = ((x & 0xF0F0) >>> 4) | ((x & 0x0F0F) << 4);
    rev[i] = (((x & 0xFF00) >>> 8) | ((x & 0x00FF) << 8)) >>> 1;
}
// create huffman tree from u8 "map": index -> code length for code index
// mb (max bits) must be at most 15
// TODO: optimize/split up?
var hMap = (function (cd, mb, r) {
    var s = cd.length;
    // index
    var i = 0;
    // u16 "map": index -> # of codes with bit length = index
    var l = new u16(mb);
    // length of cd must be 288 (total # of codes)
    for (; i < s; ++i) {
        if (cd[i])
            ++l[cd[i] - 1];
    }
    // u16 "map": index -> minimum code for bit length = index
    var le = new u16(mb);
    for (i = 0; i < mb; ++i) {
        le[i] = (le[i - 1] + l[i - 1]) << 1;
    }
    var co;
    if (r) {
        // u16 "map": index -> number of actual bits, symbol for code
        co = new u16(1 << mb);
        // bits to remove for reverser
        var rvb = 15 - mb;
        for (i = 0; i < s; ++i) {
            // ignore 0 lengths
            if (cd[i]) {
                // num encoding both symbol and bits read
                var sv = (i << 4) | cd[i];
                // free bits
                var r_1 = mb - cd[i];
                // start value
                var v = le[cd[i] - 1]++ << r_1;
                // m is end value
                for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
                    // every 16 bit value starting with the code yields the same result
                    co[rev[v] >>> rvb] = sv;
                }
            }
        }
    }
    else {
        co = new u16(s);
        for (i = 0; i < s; ++i) {
            if (cd[i]) {
                co[i] = rev[le[cd[i] - 1]++] >>> (15 - cd[i]);
            }
        }
    }
    return co;
});
// fixed length tree
var flt = new u8(288);
for (var i = 0; i < 144; ++i)
    flt[i] = 8;
for (var i = 144; i < 256; ++i)
    flt[i] = 9;
for (var i = 256; i < 280; ++i)
    flt[i] = 7;
for (var i = 280; i < 288; ++i)
    flt[i] = 8;
// fixed distance tree
var fdt = new u8(32);
for (var i = 0; i < 32; ++i)
    fdt[i] = 5;
// fixed length map
var flm = /*#__PURE__*/ hMap(flt, 9, 0), flrm = /*#__PURE__*/ hMap(flt, 9, 1);
// fixed distance map
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0), fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
// find max of array
var max = function (a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
        if (a[i] > m)
            m = a[i];
    }
    return m;
};
// read d, starting at bit p and mask with m
var bits = function (d, p, m) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
};
// read d, starting at bit p continuing for at least 16 bits
var bits16 = function (d, p) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
};
// get end of byte
var shft = function (p) { return ((p + 7) / 8) | 0; };
// typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice
var slc = function (v, s, e) {
    if (s == null || s < 0)
        s = 0;
    if (e == null || e > v.length)
        e = v.length;
    // can't use .constructor in case user-supplied
    var n = new (v.BYTES_PER_ELEMENT == 2 ? u16 : v.BYTES_PER_ELEMENT == 4 ? u32 : u8)(e - s);
    n.set(v.subarray(s, e));
    return n;
};
/**
 * Codes for errors generated within this library
 */
var FlateErrorCode = {
    UnexpectedEOF: 0,
    InvalidBlockType: 1,
    InvalidLengthLiteral: 2,
    InvalidDistance: 3,
    StreamFinished: 4,
    NoStreamHandler: 5,
    InvalidHeader: 6,
    NoCallback: 7,
    InvalidUTF8: 8,
    ExtraFieldTooLong: 9,
    InvalidDate: 10,
    FilenameTooLong: 11,
    StreamFinishing: 12,
    InvalidZipData: 13,
    UnknownCompressionMethod: 14
};
// error codes
var ec = [
    'unexpected EOF',
    'invalid block type',
    'invalid length/literal',
    'invalid distance',
    'stream finished',
    'no stream handler',
    ,
    'no callback',
    'invalid UTF-8 data',
    'extra field too long',
    'date not in range 1980-2099',
    'filename too long',
    'stream finishing',
    'invalid zip data'
    // determined by unknown compression method
];
;
var err = function (ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
        Error.captureStackTrace(e, err);
    if (!nt)
        throw e;
    return e;
};
// expands raw DEFLATE data
var inflt = function (dat, buf, st) {
    // source length
    var sl = dat.length;
    if (!sl || (st && st.f && !st.l))
        return buf || new u8(0);
    // have to estimate size
    var noBuf = !buf || st;
    // no state
    var noSt = !st || st.i;
    if (!st)
        st = {};
    // Assumes roughly 33% compression ratio average
    if (!buf)
        buf = new u8(sl * 3);
    // ensure buffer can fit at least l elements
    var cbuf = function (l) {
        var bl = buf.length;
        // need to increase size to fit
        if (l > bl) {
            // Double or set to necessary, whichever is greater
            var nbuf = new u8(Math.max(bl * 2, l));
            nbuf.set(buf);
            buf = nbuf;
        }
    };
    //  last chunk         bitpos           bytes
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    // total bits
    var tbts = sl * 8;
    do {
        if (!lm) {
            // BFINAL - this is only 1 when last chunk is next
            final = bits(dat, pos, 1);
            // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
            var type = bits(dat, pos + 1, 3);
            pos += 3;
            if (!type) {
                // go to end of byte boundary
                var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
                if (t > sl) {
                    if (noSt)
                        err(0);
                    break;
                }
                // ensure size
                if (noBuf)
                    cbuf(bt + l);
                // Copy over uncompressed data
                buf.set(dat.subarray(s, t), bt);
                // Get new bitpos, update byte count
                st.b = bt += l, st.p = pos = t * 8, st.f = final;
                continue;
            }
            else if (type == 1)
                lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
            else if (type == 2) {
                //  literal                            lengths
                var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
                var tl = hLit + bits(dat, pos + 5, 31) + 1;
                pos += 14;
                // length+distance tree
                var ldt = new u8(tl);
                // code length tree
                var clt = new u8(19);
                for (var i = 0; i < hcLen; ++i) {
                    // use index map to get real code
                    clt[clim[i]] = bits(dat, pos + i * 3, 7);
                }
                pos += hcLen * 3;
                // code lengths bits
                var clb = max(clt), clbmsk = (1 << clb) - 1;
                // code lengths map
                var clm = hMap(clt, clb, 1);
                for (var i = 0; i < tl;) {
                    var r = clm[bits(dat, pos, clbmsk)];
                    // bits read
                    pos += r & 15;
                    // symbol
                    var s = r >>> 4;
                    // code length to copy
                    if (s < 16) {
                        ldt[i++] = s;
                    }
                    else {
                        //  copy   count
                        var c = 0, n = 0;
                        if (s == 16)
                            n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
                        else if (s == 17)
                            n = 3 + bits(dat, pos, 7), pos += 3;
                        else if (s == 18)
                            n = 11 + bits(dat, pos, 127), pos += 7;
                        while (n--)
                            ldt[i++] = c;
                    }
                }
                //    length tree                 distance tree
                var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
                // max length bits
                lbt = max(lt);
                // max dist bits
                dbt = max(dt);
                lm = hMap(lt, lbt, 1);
                dm = hMap(dt, dbt, 1);
            }
            else
                err(1);
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
        }
        // Make sure the buffer can hold this + the largest possible addition
        // Maximum chunk size (practically, theoretically infinite) is 2^17;
        if (noBuf)
            cbuf(bt + 131072);
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (;; lpos = pos) {
            // bits read, code
            var c = lm[bits16(dat, pos) & lms], sym = c >>> 4;
            pos += c & 15;
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
            if (!c)
                err(2);
            if (sym < 256)
                buf[bt++] = sym;
            else if (sym == 256) {
                lpos = pos, lm = null;
                break;
            }
            else {
                var add = sym - 254;
                // no extra bits needed if less
                if (sym > 264) {
                    // index
                    var i = sym - 257, b = fleb[i];
                    add = bits(dat, pos, (1 << b) - 1) + fl[i];
                    pos += b;
                }
                // dist
                var d = dm[bits16(dat, pos) & dms], dsym = d >>> 4;
                if (!d)
                    err(3);
                pos += d & 15;
                var dt = fd[dsym];
                if (dsym > 3) {
                    var b = fdeb[dsym];
                    dt += bits16(dat, pos) & ((1 << b) - 1), pos += b;
                }
                if (pos > tbts) {
                    if (noSt)
                        err(0);
                    break;
                }
                if (noBuf)
                    cbuf(bt + 131072);
                var end = bt + add;
                for (; bt < end; bt += 4) {
                    buf[bt] = buf[bt - dt];
                    buf[bt + 1] = buf[bt + 1 - dt];
                    buf[bt + 2] = buf[bt + 2 - dt];
                    buf[bt + 3] = buf[bt + 3 - dt];
                }
                bt = end;
            }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
            final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    return bt == buf.length ? buf : slc(buf, 0, bt);
};
// starting at p, write the minimum number of bits that can hold v to d
var wbits = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >>> 8;
};
// starting at p, write the minimum number of bits (>8) that can hold v to d
var wbits16 = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >>> 8;
    d[o + 2] |= v >>> 16;
};
// creates code lengths from a frequency table
var hTree = function (d, mb) {
    // Need extra info to make a tree
    var t = [];
    for (var i = 0; i < d.length; ++i) {
        if (d[i])
            t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
        return [et, 0];
    if (s == 1) {
        var v = new u8(t[0].s + 1);
        v[t[0].s] = 1;
        return [v, 1];
    }
    t.sort(function (a, b) { return a.f - b.f; });
    // after i2 reaches last ind, will be stopped
    // freq must be greater than largest possible number of symbols
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l: l, r: r };
    // efficient algorithm from UZIP.js
    // i0 is lookbehind, i2 is lookahead - after processing two low-freq
    // symbols that combined have high freq, will start processing i2 (high-freq,
    // non-composite) symbols instead
    // see https://reddit.com/r/photopea/comments/ikekht/uzipjs_questions/
    while (i1 != s - 1) {
        l = t[t[i0].f < t[i2].f ? i0++ : i2++];
        r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
        t[i1++] = { s: -1, f: l.f + r.f, l: l, r: r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
        if (t2[i].s > maxSym)
            maxSym = t2[i].s;
    }
    // code lengths
    var tr = new u16(maxSym + 1);
    // max bits in tree
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
        // more algorithms from UZIP.js
        // TODO: find out how this code works (debt)
        //  ind    debt
        var i = 0, dt = 0;
        //    left            cost
        var lft = mbt - mb, cst = 1 << lft;
        t2.sort(function (a, b) { return tr[b.s] - tr[a.s] || a.f - b.f; });
        for (; i < s; ++i) {
            var i2_1 = t2[i].s;
            if (tr[i2_1] > mb) {
                dt += cst - (1 << (mbt - tr[i2_1]));
                tr[i2_1] = mb;
            }
            else
                break;
        }
        dt >>>= lft;
        while (dt > 0) {
            var i2_2 = t2[i].s;
            if (tr[i2_2] < mb)
                dt -= 1 << (mb - tr[i2_2]++ - 1);
            else
                ++i;
        }
        for (; i >= 0 && dt; --i) {
            var i2_3 = t2[i].s;
            if (tr[i2_3] == mb) {
                --tr[i2_3];
                ++dt;
            }
        }
        mbt = mb;
    }
    return [new u8(tr), mbt];
};
// get the max length and assign length codes
var ln = function (n, l, d) {
    return n.s == -1
        ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1))
        : (l[n.s] = d);
};
// length codes generation
var lc = function (c) {
    var s = c.length;
    // Note that the semicolon was intentional
    while (s && !c[--s])
        ;
    var cl = new u16(++s);
    //  ind      num         streak
    var cli = 0, cln = c[0], cls = 1;
    var w = function (v) { cl[cli++] = v; };
    for (var i = 1; i <= s; ++i) {
        if (c[i] == cln && i != s)
            ++cls;
        else {
            if (!cln && cls > 2) {
                for (; cls > 138; cls -= 138)
                    w(32754);
                if (cls > 2) {
                    w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
                    cls = 0;
                }
            }
            else if (cls > 3) {
                w(cln), --cls;
                for (; cls > 6; cls -= 6)
                    w(8304);
                if (cls > 2)
                    w(((cls - 3) << 5) | 8208), cls = 0;
            }
            while (cls--)
                w(cln);
            cls = 1;
            cln = c[i];
        }
    }
    return [cl.subarray(0, cli), s];
};
// calculate the length of output from tree, code lengths
var clen = function (cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
        l += cf[i] * cl[i];
    return l;
};
// writes a fixed block
// returns the new bit pos
var wfblk = function (out, pos, dat) {
    // no need to write 00 as type: TypedArray defaults to 0
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >>> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
        out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
};
// writes a block
var wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a = hTree(lf, 15), dlt = _a[0], mlb = _a[1];
    var _b = hTree(df, 15), ddt = _b[0], mdb = _b[1];
    var _c = lc(dlt), lclt = _c[0], nlc = _c[1];
    var _d = lc(ddt), lcdt = _d[0], ndc = _d[1];
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
        lcfreq[lclt[i] & 31]++;
    for (var i = 0; i < lcdt.length; ++i)
        lcfreq[lcdt[i] & 31]++;
    var _e = hTree(lcfreq, 7), lct = _e[0], mlcb = _e[1];
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
        ;
    var flen = (bl + 5) << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + (2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18]);
    if (flen <= ftlen && flen <= dtlen)
        return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
        lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
        var llm = hMap(lct, mlcb, 0);
        wbits(out, p, nlc - 257);
        wbits(out, p + 5, ndc - 1);
        wbits(out, p + 10, nlcc - 4);
        p += 14;
        for (var i = 0; i < nlcc; ++i)
            wbits(out, p + 3 * i, lct[clim[i]]);
        p += 3 * nlcc;
        var lcts = [lclt, lcdt];
        for (var it = 0; it < 2; ++it) {
            var clct = lcts[it];
            for (var i = 0; i < clct.length; ++i) {
                var len = clct[i] & 31;
                wbits(out, p, llm[len]), p += lct[len];
                if (len > 15)
                    wbits(out, p, (clct[i] >>> 5) & 127), p += clct[i] >>> 12;
            }
        }
    }
    else {
        lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
        if (syms[i] > 255) {
            var len = (syms[i] >>> 18) & 31;
            wbits16(out, p, lm[len + 257]), p += ll[len + 257];
            if (len > 7)
                wbits(out, p, (syms[i] >>> 23) & 31), p += fleb[len];
            var dst = syms[i] & 31;
            wbits16(out, p, dm[dst]), p += dl[dst];
            if (dst > 3)
                wbits16(out, p, (syms[i] >>> 5) & 8191), p += fdeb[dst];
        }
        else {
            wbits16(out, p, lm[syms[i]]), p += ll[syms[i]];
        }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
};
// deflate options (nice << 13) | chain
var deo = /*#__PURE__*/ new u32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
// empty
var et = /*#__PURE__*/ new u8(0);
// compresses data into a raw DEFLATE buffer
var dflt = function (dat, lvl, plvl, pre, post, lst) {
    var s = dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
    // writing to this writes to the output buffer
    var w = o.subarray(pre, o.length - post);
    var pos = 0;
    if (!lvl || s < 8) {
        for (var i = 0; i <= s; i += 65535) {
            // end
            var e = i + 65535;
            if (e >= s) {
                // write final block
                w[pos >> 3] = lst;
            }
            pos = wfblk(w, pos + 1, dat.subarray(i, e));
        }
    }
    else {
        var opt = deo[lvl - 1];
        var n = opt >>> 13, c = opt & 8191;
        var msk_1 = (1 << plvl) - 1;
        //    prev 2-byte val map    curr 2-byte val map
        var prev = new u16(32768), head = new u16(msk_1 + 1);
        var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
        var hsh = function (i) { return (dat[i] ^ (dat[i + 1] << bs1_1) ^ (dat[i + 2] << bs2_1)) & msk_1; };
        // 24576 is an arbitrary number of maximum symbols per block
        // 424 buffer for last block
        var syms = new u32(25000);
        // length/literal freq   distance freq
        var lf = new u16(288), df = new u16(32);
        //  l/lcnt  exbits  index  l/lind  waitdx  bitpos
        var lc_1 = 0, eb = 0, i = 0, li = 0, wi = 0, bs = 0;
        for (; i < s; ++i) {
            // hash value
            // deopt when i > s - 3 - at end, deopt acceptable
            var hv = hsh(i);
            // index mod 32768    previous index mod
            var imod = i & 32767, pimod = head[hv];
            prev[imod] = pimod;
            head[hv] = imod;
            // We always should modify head and prev, but only add symbols if
            // this data is not yet processed ("wait" for wait index)
            if (wi <= i) {
                // bytes remaining
                var rem = s - i;
                if ((lc_1 > 7000 || li > 24576) && rem > 423) {
                    pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
                    li = lc_1 = eb = 0, bs = i;
                    for (var j = 0; j < 286; ++j)
                        lf[j] = 0;
                    for (var j = 0; j < 30; ++j)
                        df[j] = 0;
                }
                //  len    dist   chain
                var l = 2, d = 0, ch_1 = c, dif = (imod - pimod) & 32767;
                if (rem > 2 && hv == hsh(i - dif)) {
                    var maxn = Math.min(n, rem) - 1;
                    var maxd = Math.min(32767, i);
                    // max possible length
                    // not capped at dif because decompressors implement "rolling" index population
                    var ml = Math.min(258, rem);
                    while (dif <= maxd && --ch_1 && imod != pimod) {
                        if (dat[i + l] == dat[i + l - dif]) {
                            var nl = 0;
                            for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                                ;
                            if (nl > l) {
                                l = nl, d = dif;
                                // break out early when we reach "nice" (we are satisfied enough)
                                if (nl > maxn)
                                    break;
                                // now, find the rarest 2-byte sequence within this
                                // length of literals and search for that instead.
                                // Much faster than just using the start
                                var mmd = Math.min(dif, nl - 2);
                                var md = 0;
                                for (var j = 0; j < mmd; ++j) {
                                    var ti = (i - dif + j + 32768) & 32767;
                                    var pti = prev[ti];
                                    var cd = (ti - pti + 32768) & 32767;
                                    if (cd > md)
                                        md = cd, pimod = ti;
                                }
                            }
                        }
                        // check the previous match
                        imod = pimod, pimod = prev[imod];
                        dif += (imod - pimod + 32768) & 32767;
                    }
                }
                // d will be nonzero only when a match was found
                if (d) {
                    // store both dist and len data in one Uint32
                    // Make sure this is recognized as a len/dist with 28th bit (2^28)
                    syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
                    var lin = revfl[l] & 31, din = revfd[d] & 31;
                    eb += fleb[lin] + fdeb[din];
                    ++lf[257 + lin];
                    ++df[din];
                    wi = i + l;
                    ++lc_1;
                }
                else {
                    syms[li++] = dat[i];
                    ++lf[dat[i]];
                }
            }
        }
        pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
        // this is the easiest way to avoid needing to maintain state
        if (!lst && pos & 7)
            pos = wfblk(w, pos + 1, et);
    }
    return slc(o, 0, pre + shft(pos) + post);
};
// CRC32 table
var crct = /*#__PURE__*/ (function () {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
        var c = i, k = 9;
        while (--k)
            c = ((c & 1) && -306674912) ^ (c >>> 1);
        t[i] = c;
    }
    return t;
})();
// CRC32
var crc = function () {
    var c = -1;
    return {
        p: function (d) {
            // closures have awful performance
            var cr = c;
            for (var i = 0; i < d.length; ++i)
                cr = crct[(cr & 255) ^ d[i]] ^ (cr >>> 8);
            c = cr;
        },
        d: function () { return ~c; }
    };
};
// Alder32
var adler = function () {
    var a = 1, b = 0;
    return {
        p: function (d) {
            // closures have awful performance
            var n = a, m = b;
            var l = d.length | 0;
            for (var i = 0; i != l;) {
                var e = Math.min(i + 2655, l);
                for (; i < e; ++i)
                    m += n += d[i];
                n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
            }
            a = n, b = m;
        },
        d: function () {
            a %= 65521, b %= 65521;
            return (a & 255) << 24 | (a >>> 8) << 16 | (b & 255) << 8 | (b >>> 8);
        }
    };
};
;
// deflate with opts
var dopt = function (dat, opt, pre, post, st) {
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : (12 + opt.mem), pre, post, !st);
};
// Walmart object spread
var mrg = function (a, b) {
    var o = {};
    for (var k in a)
        o[k] = a[k];
    for (var k in b)
        o[k] = b[k];
    return o;
};
// worker clone
// This is possibly the craziest part of the entire codebase, despite how simple it may seem.
// The only parameter to this function is a closure that returns an array of variables outside of the function scope.
// We're going to try to figure out the variable names used in the closure as strings because that is crucial for workerization.
// We will return an object mapping of true variable name to value (basically, the current scope as a JS object).
// The reason we can't just use the original variable names is minifiers mangling the toplevel scope.
// This took me three weeks to figure out how to do.
var wcln = function (fn, fnStr, td) {
    var dt = fn();
    var st = fn.toString();
    var ks = st.slice(st.indexOf('[') + 1, st.lastIndexOf(']')).replace(/\s+/g, '').split(',');
    for (var i = 0; i < dt.length; ++i) {
        var v = dt[i], k = ks[i];
        if (typeof v == 'function') {
            fnStr += ';' + k + '=';
            var st_1 = v.toString();
            if (v.prototype) {
                // for global objects
                if (st_1.indexOf('[native code]') != -1) {
                    var spInd = st_1.indexOf(' ', 8) + 1;
                    fnStr += st_1.slice(spInd, st_1.indexOf('(', spInd));
                }
                else {
                    fnStr += st_1;
                    for (var t in v.prototype)
                        fnStr += ';' + k + '.prototype.' + t + '=' + v.prototype[t].toString();
                }
            }
            else
                fnStr += st_1;
        }
        else
            td[k] = v;
    }
    return [fnStr, td];
};
var ch = [];
// clone bufs
var cbfs = function (v) {
    var tl = [];
    for (var k in v) {
        if (v[k].buffer) {
            tl.push((v[k] = new v[k].constructor(v[k])).buffer);
        }
    }
    return tl;
};
// use a worker to execute code
var wrkr = function (fns, init, id, cb) {
    var _a;
    if (!ch[id]) {
        var fnStr = '', td_1 = {}, m = fns.length - 1;
        for (var i = 0; i < m; ++i)
            _a = wcln(fns[i], fnStr, td_1), fnStr = _a[0], td_1 = _a[1];
        ch[id] = wcln(fns[m], fnStr, td_1);
    }
    var td = mrg({}, ch[id][1]);
    return wk(ch[id][0] + ';onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=' + init.toString() + '}', id, td, cbfs(td), cb);
};
// base async inflate fn
var bInflt = function () { return [u8, u16, u32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gu8]; };
var bDflt = function () { return [u8, u16, u32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf]; };
// gzip extra
var gze = function () { return [gzh, gzhl, wbytes, crc, crct]; };
// gunzip extra
var guze = function () { return [gzs, gzl]; };
// zlib extra
var zle = function () { return [zlh, wbytes, adler]; };
// unzlib extra
var zule = function () { return [zlv]; };
// post buf
var pbf = function (msg) { return postMessage(msg, [msg.buffer]); };
// get u8
var gu8 = function (o) { return o && o.size && new u8(o.size); };
// async helper
var cbify = function (dat, opts, fns, init, id, cb) {
    var w = wrkr(fns, init, id, function (err, dat) {
        w.terminate();
        cb(err, dat);
    });
    w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
    return function () { w.terminate(); };
};
// auto stream
var astrm = function (strm) {
    strm.ondata = function (dat, final) { return postMessage([dat, final], [dat.buffer]); };
    return function (ev) { return strm.push(ev.data[0], ev.data[1]); };
};
// async stream attach
var astrmify = function (fns, strm, opts, init, id) {
    var t;
    var w = wrkr(fns, init, id, function (err, dat) {
        if (err)
            w.terminate(), strm.ondata.call(strm, err);
        else {
            if (dat[1])
                w.terminate();
            strm.ondata.call(strm, err, dat[0], dat[1]);
        }
    });
    w.postMessage(opts);
    strm.push = function (d, f) {
        if (!strm.ondata)
            err(5);
        if (t)
            strm.ondata(err(4, 0, 1), null, !!f);
        w.postMessage([d, t = f], [d.buffer]);
    };
    strm.terminate = function () { w.terminate(); };
};
// read 2 bytes
var b2 = function (d, b) { return d[b] | (d[b + 1] << 8); };
// read 4 bytes
var b4 = function (d, b) { return (d[b] | (d[b + 1] << 8) | (d[b + 2] << 16) | (d[b + 3] << 24)) >>> 0; };
var b8 = function (d, b) { return b4(d, b) + (b4(d, b + 4) * 4294967296); };
// write bytes
var wbytes = function (d, b, v) {
    for (; v; ++b)
        d[b] = v, v >>>= 8;
};
// gzip header
var gzh = function (c, o) {
    var fn = o.filename;
    c[0] = 31, c[1] = 139, c[2] = 8, c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0, c[9] = 3; // assume Unix
    if (o.mtime != 0)
        wbytes(c, 4, Math.floor(new Date(o.mtime || Date.now()) / 1000));
    if (fn) {
        c[3] = 8;
        for (var i = 0; i <= fn.length; ++i)
            c[i + 10] = fn.charCodeAt(i);
    }
};
// gzip footer: -8 to -4 = CRC, -4 to -0 is length
// gzip start
var gzs = function (d) {
    if (d[0] != 31 || d[1] != 139 || d[2] != 8)
        err(6, 'invalid gzip data');
    var flg = d[3];
    var st = 10;
    if (flg & 4)
        st += d[10] | (d[11] << 8) + 2;
    for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
        ;
    return st + (flg & 2);
};
// gzip length
var gzl = function (d) {
    var l = d.length;
    return ((d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16) | (d[l - 1] << 24)) >>> 0;
};
// gzip header length
var gzhl = function (o) { return 10 + ((o.filename && (o.filename.length + 1)) || 0); };
// zlib header
var zlh = function (c, o) {
    var lv = o.level, fl = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
    c[0] = 120, c[1] = (fl << 6) | (fl ? (32 - 2 * fl) : 1);
};
// zlib valid
var zlv = function (d) {
    if ((d[0] & 15) != 8 || (d[0] >>> 4) > 7 || ((d[0] << 8 | d[1]) % 31))
        err(6, 'invalid zlib data');
    if (d[1] & 32)
        err(6, 'invalid zlib data: preset dictionaries not supported');
};
function AsyncCmpStrm(opts, cb) {
    if (!cb && typeof opts == 'function')
        cb = opts, opts = {};
    this.ondata = cb;
    return opts;
}
// zlib footer: -4 to -0 is Adler32
/**
 * Streaming DEFLATE compression
 */
var Deflate = /*#__PURE__*/ (function () {
    function Deflate(opts, cb) {
        if (!cb && typeof opts == 'function')
            cb = opts, opts = {};
        this.ondata = cb;
        this.o = opts || {};
    }
    Deflate.prototype.p = function (c, f) {
        this.ondata(dopt(c, this.o, 0, 0, !f), f);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Deflate.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        this.d = final;
        this.p(chunk, final || false);
    };
    return Deflate;
}());

/**
 * Asynchronous streaming DEFLATE compression
 */
var AsyncDeflate = /*#__PURE__*/ (function () {
    function AsyncDeflate(opts, cb) {
        astrmify([
            bDflt,
            function () { return [astrm, Deflate]; }
        ], this, AsyncCmpStrm.call(this, opts, cb), function (ev) {
            var strm = new Deflate(ev.data);
            onmessage = astrm(strm);
        }, 6);
    }
    return AsyncDeflate;
}());

function deflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
    ], function (ev) { return pbf(deflateSync(ev.data[0], ev.data[1])); }, 0, cb);
}
/**
 * Compresses data with DEFLATE without any wrapper
 * @param data The data to compress
 * @param opts The compression options
 * @returns The deflated version of the data
 */
function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
}
/**
 * Streaming DEFLATE decompression
 */
var Inflate = /*#__PURE__*/ (function () {
    /**
     * Creates an inflation stream
     * @param cb The callback to call whenever data is inflated
     */
    function Inflate(cb) {
        this.s = {};
        this.p = new u8(0);
        this.ondata = cb;
    }
    Inflate.prototype.e = function (c) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        var l = this.p.length;
        var n = new u8(l + c.length);
        n.set(this.p), n.set(c, l), this.p = n;
    };
    Inflate.prototype.c = function (final) {
        this.d = this.s.i = final || false;
        var bts = this.s.b;
        var dt = inflt(this.p, this.o, this.s);
        this.ondata(slc(dt, bts, this.s.b), this.d);
        this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
        this.p = slc(this.p, (this.s.p / 8) | 0), this.s.p &= 7;
    };
    /**
     * Pushes a chunk to be inflated
     * @param chunk The chunk to push
     * @param final Whether this is the final chunk
     */
    Inflate.prototype.push = function (chunk, final) {
        this.e(chunk), this.c(final);
    };
    return Inflate;
}());

/**
 * Asynchronous streaming DEFLATE decompression
 */
var AsyncInflate = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous inflation stream
     * @param cb The callback to call whenever data is deflated
     */
    function AsyncInflate(cb) {
        this.ondata = cb;
        astrmify([
            bInflt,
            function () { return [astrm, Inflate]; }
        ], this, 0, function () {
            var strm = new Inflate();
            onmessage = astrm(strm);
        }, 7);
    }
    return AsyncInflate;
}());

function inflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt
    ], function (ev) { return pbf(inflateSync(ev.data[0], gu8(ev.data[1]))); }, 1, cb);
}
/**
 * Expands DEFLATE data with no wrapper
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */
function inflateSync(data, out) {
    return inflt(data, out);
}
// before you yell at me for not just using extends, my reason is that TS inheritance is hard to workerize.
/**
 * Streaming GZIP compression
 */
var Gzip = /*#__PURE__*/ (function () {
    function Gzip(opts, cb) {
        this.c = crc();
        this.l = 0;
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be GZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gzip.prototype.push = function (chunk, final) {
        Deflate.prototype.push.call(this, chunk, final);
    };
    Gzip.prototype.p = function (c, f) {
        this.c.p(c);
        this.l += c.length;
        var raw = dopt(c, this.o, this.v && gzhl(this.o), f && 8, !f);
        if (this.v)
            gzh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 8, this.c.d()), wbytes(raw, raw.length - 4, this.l);
        this.ondata(raw, f);
    };
    return Gzip;
}());

/**
 * Asynchronous streaming GZIP compression
 */
var AsyncGzip = /*#__PURE__*/ (function () {
    function AsyncGzip(opts, cb) {
        astrmify([
            bDflt,
            gze,
            function () { return [astrm, Deflate, Gzip]; }
        ], this, AsyncCmpStrm.call(this, opts, cb), function (ev) {
            var strm = new Gzip(ev.data);
            onmessage = astrm(strm);
        }, 8);
    }
    return AsyncGzip;
}());

function gzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        gze,
        function () { return [gzipSync]; }
    ], function (ev) { return pbf(gzipSync(ev.data[0], ev.data[1])); }, 2, cb);
}
/**
 * Compresses data with GZIP
 * @param data The data to compress
 * @param opts The compression options
 * @returns The gzipped version of the data
 */
function gzipSync(data, opts) {
    if (!opts)
        opts = {};
    var c = crc(), l = data.length;
    c.p(data);
    var d = dopt(data, opts, gzhl(opts), 8), s = d.length;
    return gzh(d, opts), wbytes(d, s - 8, c.d()), wbytes(d, s - 4, l), d;
}
/**
 * Streaming GZIP decompression
 */
var Gunzip = /*#__PURE__*/ (function () {
    /**
     * Creates a GUNZIP stream
     * @param cb The callback to call whenever data is inflated
     */
    function Gunzip(cb) {
        this.v = 1;
        Inflate.call(this, cb);
    }
    /**
     * Pushes a chunk to be GUNZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gunzip.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
            var s = this.p.length > 3 ? gzs(this.p) : 4;
            if (s >= this.p.length && !final)
                return;
            this.p = this.p.subarray(s), this.v = 0;
        }
        if (final) {
            if (this.p.length < 8)
                err(6, 'invalid gzip data');
            this.p = this.p.subarray(0, -8);
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
    };
    return Gunzip;
}());

/**
 * Asynchronous streaming GZIP decompression
 */
var AsyncGunzip = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous GUNZIP stream
     * @param cb The callback to call whenever data is deflated
     */
    function AsyncGunzip(cb) {
        this.ondata = cb;
        astrmify([
            bInflt,
            guze,
            function () { return [astrm, Inflate, Gunzip]; }
        ], this, 0, function () {
            var strm = new Gunzip();
            onmessage = astrm(strm);
        }, 9);
    }
    return AsyncGunzip;
}());

function gunzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        guze,
        function () { return [gunzipSync]; }
    ], function (ev) { return pbf(gunzipSync(ev.data[0])); }, 3, cb);
}
/**
 * Expands GZIP data
 * @param data The data to decompress
 * @param out Where to write the data. GZIP already encodes the output size, so providing this doesn't save memory.
 * @returns The decompressed version of the data
 */
function gunzipSync(data, out) {
    return inflt(data.subarray(gzs(data), -8), out || new u8(gzl(data)));
}
/**
 * Streaming Zlib compression
 */
var Zlib = /*#__PURE__*/ (function () {
    function Zlib(opts, cb) {
        this.c = adler();
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be zlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Zlib.prototype.push = function (chunk, final) {
        Deflate.prototype.push.call(this, chunk, final);
    };
    Zlib.prototype.p = function (c, f) {
        this.c.p(c);
        var raw = dopt(c, this.o, this.v && 2, f && 4, !f);
        if (this.v)
            zlh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 4, this.c.d());
        this.ondata(raw, f);
    };
    return Zlib;
}());

/**
 * Asynchronous streaming Zlib compression
 */
var AsyncZlib = /*#__PURE__*/ (function () {
    function AsyncZlib(opts, cb) {
        astrmify([
            bDflt,
            zle,
            function () { return [astrm, Deflate, Zlib]; }
        ], this, AsyncCmpStrm.call(this, opts, cb), function (ev) {
            var strm = new Zlib(ev.data);
            onmessage = astrm(strm);
        }, 10);
    }
    return AsyncZlib;
}());

function zlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        zle,
        function () { return [zlibSync]; }
    ], function (ev) { return pbf(zlibSync(ev.data[0], ev.data[1])); }, 4, cb);
}
/**
 * Compress data with Zlib
 * @param data The data to compress
 * @param opts The compression options
 * @returns The zlib-compressed version of the data
 */
function zlibSync(data, opts) {
    if (!opts)
        opts = {};
    var a = adler();
    a.p(data);
    var d = dopt(data, opts, 2, 4);
    return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
/**
 * Streaming Zlib decompression
 */
var Unzlib = /*#__PURE__*/ (function () {
    /**
     * Creates a Zlib decompression stream
     * @param cb The callback to call whenever data is inflated
     */
    function Unzlib(cb) {
        this.v = 1;
        Inflate.call(this, cb);
    }
    /**
     * Pushes a chunk to be unzlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzlib.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
            if (this.p.length < 2 && !final)
                return;
            this.p = this.p.subarray(2), this.v = 0;
        }
        if (final) {
            if (this.p.length < 4)
                err(6, 'invalid zlib data');
            this.p = this.p.subarray(0, -4);
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
    };
    return Unzlib;
}());

/**
 * Asynchronous streaming Zlib decompression
 */
var AsyncUnzlib = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous Zlib decompression stream
     * @param cb The callback to call whenever data is deflated
     */
    function AsyncUnzlib(cb) {
        this.ondata = cb;
        astrmify([
            bInflt,
            zule,
            function () { return [astrm, Inflate, Unzlib]; }
        ], this, 0, function () {
            var strm = new Unzlib();
            onmessage = astrm(strm);
        }, 11);
    }
    return AsyncUnzlib;
}());

function unzlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        zule,
        function () { return [unzlibSync]; }
    ], function (ev) { return pbf(unzlibSync(ev.data[0], gu8(ev.data[1]))); }, 5, cb);
}
/**
 * Expands Zlib data
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */
function unzlibSync(data, out) {
    return inflt((zlv(data), data.subarray(2, -4)), out);
}
// Default algorithm for compression (used because having a known output size allows faster decompression)

// Default algorithm for compression (used because having a known output size allows faster decompression)

/**
 * Streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var Decompress = /*#__PURE__*/ (function () {
    /**
     * Creates a decompression stream
     * @param cb The callback to call whenever data is decompressed
     */
    function Decompress(cb) {
        this.G = Gunzip;
        this.I = Inflate;
        this.Z = Unzlib;
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Decompress.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (!this.s) {
            if (this.p && this.p.length) {
                var n = new u8(this.p.length + chunk.length);
                n.set(this.p), n.set(chunk, this.p.length);
            }
            else
                this.p = chunk;
            if (this.p.length > 2) {
                var _this_1 = this;
                var cb = function () { _this_1.ondata.apply(_this_1, arguments); };
                this.s = (this.p[0] == 31 && this.p[1] == 139 && this.p[2] == 8)
                    ? new this.G(cb)
                    : ((this.p[0] & 15) != 8 || (this.p[0] >> 4) > 7 || ((this.p[0] << 8 | this.p[1]) % 31))
                        ? new this.I(cb)
                        : new this.Z(cb);
                this.s.push(this.p, final);
                this.p = null;
            }
        }
        else
            this.s.push(chunk, final);
    };
    return Decompress;
}());

/**
 * Asynchronous streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var AsyncDecompress = /*#__PURE__*/ (function () {
    /**
   * Creates an asynchronous decompression stream
   * @param cb The callback to call whenever data is decompressed
   */
    function AsyncDecompress(cb) {
        this.G = AsyncGunzip;
        this.I = AsyncInflate;
        this.Z = AsyncUnzlib;
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncDecompress.prototype.push = function (chunk, final) {
        Decompress.prototype.push.call(this, chunk, final);
    };
    return AsyncDecompress;
}());

function decompress(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzip(data, opts, cb)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflate(data, opts, cb)
            : unzlib(data, opts, cb);
}
/**
 * Expands compressed GZIP, Zlib, or raw DEFLATE data, automatically detecting the format
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */
function decompressSync(data, out) {
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzipSync(data, out)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflateSync(data, out)
            : unzlibSync(data, out);
}
// flatten a directory structure
var fltn = function (d, p, t, o) {
    for (var k in d) {
        var val = d[k], n = p + k, op = o;
        if (Array.isArray(val))
            op = mrg(o, val[1]), val = val[0];
        if (val instanceof u8)
            t[n] = [val, op];
        else {
            t[n += '/'] = [new u8(0), op];
            fltn(val, n, t, o);
        }
    }
};
// text encoder
var te = typeof TextEncoder != 'undefined' && /*#__PURE__*/ new TextEncoder();
// text decoder
var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
// text decoder stream
var tds = 0;
try {
    td.decode(et, { stream: true });
    tds = 1;
}
catch (e) { }
// decode UTF8
var dutf8 = function (d) {
    for (var r = '', i = 0;;) {
        var c = d[i++];
        var eb = (c > 127) + (c > 223) + (c > 239);
        if (i + eb > d.length)
            return [r, slc(d, i - 1)];
        if (!eb)
            r += String.fromCharCode(c);
        else if (eb == 3) {
            c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63)) - 65536,
                r += String.fromCharCode(55296 | (c >> 10), 56320 | (c & 1023));
        }
        else if (eb & 1)
            r += String.fromCharCode((c & 31) << 6 | (d[i++] & 63));
        else
            r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63));
    }
};
/**
 * Streaming UTF-8 decoding
 */
var DecodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is decoded
     */
    function DecodeUTF8(cb) {
        this.ondata = cb;
        if (tds)
            this.t = new TextDecoder();
        else
            this.p = et;
    }
    /**
     * Pushes a chunk to be decoded from UTF-8 binary
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    DecodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        final = !!final;
        if (this.t) {
            this.ondata(this.t.decode(chunk, { stream: true }), final);
            if (final) {
                if (this.t.decode().length)
                    err(8);
                this.t = null;
            }
            return;
        }
        if (!this.p)
            err(4);
        var dat = new u8(this.p.length + chunk.length);
        dat.set(this.p);
        dat.set(chunk, this.p.length);
        var _a = dutf8(dat), ch = _a[0], np = _a[1];
        if (final) {
            if (np.length)
                err(8);
            this.p = null;
        }
        else
            this.p = np;
        this.ondata(ch, final);
    };
    return DecodeUTF8;
}());

/**
 * Streaming UTF-8 encoding
 */
var EncodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is encoded
     */
    function EncodeUTF8(cb) {
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be encoded to UTF-8
     * @param chunk The string data to push
     * @param final Whether this is the last chunk
     */
    EncodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        this.ondata(strToU8(chunk), this.d = final || false);
    };
    return EncodeUTF8;
}());

/**
 * Converts a string into a Uint8Array for use with compression/decompression methods
 * @param str The string to encode
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless decoding a binary string.
 * @returns The string encoded in UTF-8/Latin-1 binary
 */
function strToU8(str, latin1) {
    if (latin1) {
        var ar_1 = new u8(str.length);
        for (var i = 0; i < str.length; ++i)
            ar_1[i] = str.charCodeAt(i);
        return ar_1;
    }
    if (te)
        return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function (v) { ar[ai++] = v; };
    for (var i = 0; i < l; ++i) {
        if (ai + 5 > ar.length) {
            var n = new u8(ai + 8 + ((l - i) << 1));
            n.set(ar);
            ar = n;
        }
        var c = str.charCodeAt(i);
        if (c < 128 || latin1)
            w(c);
        else if (c < 2048)
            w(192 | (c >> 6)), w(128 | (c & 63));
        else if (c > 55295 && c < 57344)
            c = 65536 + (c & 1023 << 10) | (str.charCodeAt(++i) & 1023),
                w(240 | (c >> 18)), w(128 | ((c >> 12) & 63)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
        else
            w(224 | (c >> 12)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
    }
    return slc(ar, 0, ai);
}
/**
 * Converts a Uint8Array to a string
 * @param dat The data to decode to string
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless encoding to binary string.
 * @returns The original UTF-8/Latin-1 string
 */
function strFromU8(dat, latin1) {
    if (latin1) {
        var r = '';
        for (var i = 0; i < dat.length; i += 16384)
            r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
        return r;
    }
    else if (td)
        return td.decode(dat);
    else {
        var _a = dutf8(dat), out = _a[0], ext = _a[1];
        if (ext.length)
            err(8);
        return out;
    }
}
;
// deflate bit flag
var dbf = function (l) { return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0; };
// skip local zip header
var slzh = function (d, b) { return b + 30 + b2(d, b + 26) + b2(d, b + 28); };
// read zip header
var zh = function (d, b, z) {
    var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
    var _a = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a[0], su = _a[1], off = _a[2];
    return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
};
// read zip64 extra field
var z64e = function (d, b) {
    for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
        ;
    return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
};
// extra field length
var exfl = function (ex) {
    var le = 0;
    if (ex) {
        for (var k in ex) {
            var l = ex[k].length;
            if (l > 65535)
                err(9);
            le += l + 4;
        }
    }
    return le;
};
// write zip header
var wzh = function (d, b, f, fn, u, c, ce, co) {
    var fl = fn.length, ex = f.extra, col = co && co.length;
    var exl = exfl(ex);
    wbytes(d, b, ce != null ? 0x2014B50 : 0x4034B50), b += 4;
    if (ce != null)
        d[b++] = 20, d[b++] = f.os;
    d[b] = 20, b += 2; // spec compliance? what's that?
    d[b++] = (f.flag << 1) | (c < 0 && 8), d[b++] = u && 8;
    d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
    var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
    if (y < 0 || y > 119)
        err(10);
    wbytes(d, b, (y << 25) | ((dt.getMonth() + 1) << 21) | (dt.getDate() << 16) | (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >>> 1)), b += 4;
    if (c != -1) {
        wbytes(d, b, f.crc);
        wbytes(d, b + 4, c < 0 ? -c - 2 : c);
        wbytes(d, b + 8, f.size);
    }
    wbytes(d, b + 12, fl);
    wbytes(d, b + 14, exl), b += 16;
    if (ce != null) {
        wbytes(d, b, col);
        wbytes(d, b + 6, f.attrs);
        wbytes(d, b + 10, ce), b += 14;
    }
    d.set(fn, b);
    b += fl;
    if (exl) {
        for (var k in ex) {
            var exf = ex[k], l = exf.length;
            wbytes(d, b, +k);
            wbytes(d, b + 2, l);
            d.set(exf, b + 4), b += 4 + l;
        }
    }
    if (col)
        d.set(co, b), b += col;
    return b;
};
// write zip footer (end of central directory)
var wzf = function (o, b, c, d, e) {
    wbytes(o, b, 0x6054B50); // skip disk
    wbytes(o, b + 8, c);
    wbytes(o, b + 10, c);
    wbytes(o, b + 12, d);
    wbytes(o, b + 16, e);
};
/**
 * A pass-through stream to keep data uncompressed in a ZIP archive.
 */
var ZipPassThrough = /*#__PURE__*/ (function () {
    /**
     * Creates a pass-through stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     */
    function ZipPassThrough(filename) {
        this.filename = filename;
        this.c = crc();
        this.size = 0;
        this.compression = 0;
    }
    /**
     * Processes a chunk and pushes to the output stream. You can override this
     * method in a subclass for custom behavior, but by default this passes
     * the data through. You must call this.ondata(err, chunk, final) at some
     * point in this method.
     * @param chunk The chunk to process
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.process = function (chunk, final) {
        this.ondata(null, chunk, final);
    };
    /**
     * Pushes a chunk to be added. If you are subclassing this with a custom
     * compression algorithm, note that you must push data from the source
     * file only, pre-compression.
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        this.c.p(chunk);
        this.size += chunk.length;
        if (final)
            this.crc = this.c.d();
        this.process(chunk, final || false);
    };
    return ZipPassThrough;
}());

// I don't extend because TypeScript extension adds 1kB of runtime bloat
/**
 * Streaming DEFLATE compression for ZIP archives. Prefer using AsyncZipDeflate
 * for better performance
 */
var ZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function ZipDeflate(filename, opts) {
        var _this_1 = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new Deflate(opts, function (dat, final) {
            _this_1.ondata(null, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
    }
    ZipDeflate.prototype.process = function (chunk, final) {
        try {
            this.d.push(chunk, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return ZipDeflate;
}());

/**
 * Asynchronous streaming DEFLATE compression for ZIP archives
 */
var AsyncZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function AsyncZipDeflate(filename, opts) {
        var _this_1 = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new AsyncDeflate(opts, function (err, dat, final) {
            _this_1.ondata(err, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
        this.terminate = this.d.terminate;
    }
    AsyncZipDeflate.prototype.process = function (chunk, final) {
        this.d.push(chunk, final);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return AsyncZipDeflate;
}());

// TODO: Better tree shaking
/**
 * A zippable archive to which files can incrementally be added
 */
var Zip = /*#__PURE__*/ (function () {
    /**
     * Creates an empty ZIP archive to which files can be added
     * @param cb The callback to call whenever data for the generated ZIP archive
     *           is available
     */
    function Zip(cb) {
        this.ondata = cb;
        this.u = [];
        this.d = 1;
    }
    /**
     * Adds a file to the ZIP archive
     * @param file The file stream to add
     */
    Zip.prototype.add = function (file) {
        var _this_1 = this;
        if (!this.ondata)
            err(5);
        // finishing or finished
        if (this.d & 2)
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
        else {
            var f = strToU8(file.filename), fl_1 = f.length;
            var com = file.comment, o = com && strToU8(com);
            var u = fl_1 != file.filename.length || (o && (com.length != o.length));
            var hl_1 = fl_1 + exfl(file.extra) + 30;
            if (fl_1 > 65535)
                this.ondata(err(11, 0, 1), null, false);
            var header = new u8(hl_1);
            wzh(header, 0, file, f, u, -1);
            var chks_1 = [header];
            var pAll_1 = function () {
                for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
                    var chk = chks_2[_i];
                    _this_1.ondata(null, chk, false);
                }
                chks_1 = [];
            };
            var tr_1 = this.d;
            this.d = 0;
            var ind_1 = this.u.length;
            var uf_1 = mrg(file, {
                f: f,
                u: u,
                o: o,
                t: function () {
                    if (file.terminate)
                        file.terminate();
                },
                r: function () {
                    pAll_1();
                    if (tr_1) {
                        var nxt = _this_1.u[ind_1 + 1];
                        if (nxt)
                            nxt.r();
                        else
                            _this_1.d = 1;
                    }
                    tr_1 = 1;
                }
            });
            var cl_1 = 0;
            file.ondata = function (err, dat, final) {
                if (err) {
                    _this_1.ondata(err, dat, final);
                    _this_1.terminate();
                }
                else {
                    cl_1 += dat.length;
                    chks_1.push(dat);
                    if (final) {
                        var dd = new u8(16);
                        wbytes(dd, 0, 0x8074B50);
                        wbytes(dd, 4, file.crc);
                        wbytes(dd, 8, cl_1);
                        wbytes(dd, 12, file.size);
                        chks_1.push(dd);
                        uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
                        if (tr_1)
                            uf_1.r();
                        tr_1 = 1;
                    }
                    else if (tr_1)
                        pAll_1();
                }
            };
            this.u.push(uf_1);
        }
    };
    /**
     * Ends the process of adding files and prepares to emit the final chunks.
     * This *must* be called after adding all desired files for the resulting
     * ZIP file to work properly.
     */
    Zip.prototype.end = function () {
        var _this_1 = this;
        if (this.d & 2) {
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
            return;
        }
        if (this.d)
            this.e();
        else
            this.u.push({
                r: function () {
                    if (!(_this_1.d & 1))
                        return;
                    _this_1.u.splice(-1, 1);
                    _this_1.e();
                },
                t: function () { }
            });
        this.d = 3;
    };
    Zip.prototype.e = function () {
        var bt = 0, l = 0, tl = 0;
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
        }
        var out = new u8(tl + 22);
        for (var _b = 0, _c = this.u; _b < _c.length; _b++) {
            var f = _c[_b];
            wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
            bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
        }
        wzf(out, bt, this.u.length, tl, l);
        this.ondata(null, out, true);
        this.d = 2;
    };
    /**
     * A method to terminate any internal workers used by the stream. Subsequent
     * calls to add() will fail.
     */
    Zip.prototype.terminate = function () {
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            f.t();
        }
        this.d = 2;
    };
    return Zip;
}());

function zip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var r = {};
    fltn(data, '', r, opts);
    var k = Object.keys(r);
    var lft = k.length, o = 0, tot = 0;
    var slft = lft, files = new Array(lft);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var cbf = function () {
        var out = new u8(tot + 22), oe = o, cdl = tot - o;
        tot = 0;
        for (var i = 0; i < slft; ++i) {
            var f = files[i];
            try {
                var l = f.c.length;
                wzh(out, tot, f, f.f, f.u, l);
                var badd = 30 + f.f.length + exfl(f.extra);
                var loc = tot + badd;
                out.set(f.c, loc);
                wzh(out, o, f, f.f, f.u, l, tot, f.m), o += 16 + badd + (f.m ? f.m.length : 0), tot = loc + l;
            }
            catch (e) {
                return cbd(e, null);
            }
        }
        wzf(out, o, files.length, cdl, oe);
        cbd(null, out);
    };
    if (!lft)
        cbf();
    var _loop_1 = function (i) {
        var fn = k[i];
        var _a = r[fn], file = _a[0], p = _a[1];
        var c = crc(), size = file.length;
        c.p(file);
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        var compression = p.level == 0 ? 0 : 8;
        var cbl = function (e, d) {
            if (e) {
                tAll();
                cbd(e, null);
            }
            else {
                var l = d.length;
                files[i] = mrg(p, {
                    size: size,
                    crc: c.d(),
                    c: d,
                    f: f,
                    m: m,
                    u: s != fn.length || (m && (com.length != ms)),
                    compression: compression
                });
                o += 30 + s + exl + l;
                tot += 76 + 2 * (s + exl) + (ms || 0) + l;
                if (!--lft)
                    cbf();
            }
        };
        if (s > 65535)
            cbl(err(11, 0, 1), null);
        if (!compression)
            cbl(null, file);
        else if (size < 160000) {
            try {
                cbl(null, deflateSync(file, p));
            }
            catch (e) {
                cbl(e, null);
            }
        }
        else
            term.push(deflate(file, p, cbl));
    };
    // Cannot use lft because it can decrease
    for (var i = 0; i < slft; ++i) {
        _loop_1(i);
    }
    return tAll;
}
/**
 * Synchronously creates a ZIP file. Prefer using `zip` for better performance
 * with more than one file.
 * @param data The directory structure for the ZIP archive
 * @param opts The main options, merged with per-file options
 * @returns The generated ZIP archive
 */
function zipSync(data, opts) {
    if (!opts)
        opts = {};
    var r = {};
    var files = [];
    fltn(data, '', r, opts);
    var o = 0;
    var tot = 0;
    for (var fn in r) {
        var _a = r[fn], file = _a[0], p = _a[1];
        var compression = p.level == 0 ? 0 : 8;
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        if (s > 65535)
            err(11);
        var d = compression ? deflateSync(file, p) : file, l = d.length;
        var c = crc();
        c.p(file);
        files.push(mrg(p, {
            size: file.length,
            crc: c.d(),
            c: d,
            f: f,
            m: m,
            u: s != fn.length || (m && (com.length != ms)),
            o: o,
            compression: compression
        }));
        o += 30 + s + exl + l;
        tot += 76 + 2 * (s + exl) + (ms || 0) + l;
    }
    var out = new u8(tot + 22), oe = o, cdl = tot - o;
    for (var i = 0; i < files.length; ++i) {
        var f = files[i];
        wzh(out, f.o, f, f.f, f.u, f.c.length);
        var badd = 30 + f.f.length + exfl(f.extra);
        out.set(f.c, f.o + badd);
        wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
    }
    wzf(out, o, files.length, cdl, oe);
    return out;
}
/**
 * Streaming pass-through decompression for ZIP archives
 */
var UnzipPassThrough = /*#__PURE__*/ (function () {
    function UnzipPassThrough() {
    }
    UnzipPassThrough.prototype.push = function (data, final) {
        this.ondata(null, data, final);
    };
    UnzipPassThrough.compression = 0;
    return UnzipPassThrough;
}());

/**
 * Streaming DEFLATE decompression for ZIP archives. Prefer AsyncZipInflate for
 * better performance.
 */
var UnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function UnzipInflate() {
        var _this_1 = this;
        this.i = new Inflate(function (dat, final) {
            _this_1.ondata(null, dat, final);
        });
    }
    UnzipInflate.prototype.push = function (data, final) {
        try {
            this.i.push(data, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    UnzipInflate.compression = 8;
    return UnzipInflate;
}());

/**
 * Asynchronous streaming DEFLATE decompression for ZIP archives
 */
var AsyncUnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function AsyncUnzipInflate(_, sz) {
        var _this_1 = this;
        if (sz < 320000) {
            this.i = new Inflate(function (dat, final) {
                _this_1.ondata(null, dat, final);
            });
        }
        else {
            this.i = new AsyncInflate(function (err, dat, final) {
                _this_1.ondata(err, dat, final);
            });
            this.terminate = this.i.terminate;
        }
    }
    AsyncUnzipInflate.prototype.push = function (data, final) {
        if (this.i.terminate)
            data = slc(data, 0);
        this.i.push(data, final);
    };
    AsyncUnzipInflate.compression = 8;
    return AsyncUnzipInflate;
}());

/**
 * A ZIP archive decompression stream that emits files as they are discovered
 */
var Unzip = /*#__PURE__*/ (function () {
    /**
     * Creates a ZIP decompression stream
     * @param cb The callback to call whenever a file in the ZIP archive is found
     */
    function Unzip(cb) {
        this.onfile = cb;
        this.k = [];
        this.o = {
            0: UnzipPassThrough
        };
        this.p = et;
    }
    /**
     * Pushes a chunk to be unzipped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzip.prototype.push = function (chunk, final) {
        var _this_1 = this;
        if (!this.onfile)
            err(5);
        if (!this.p)
            err(4);
        if (this.c > 0) {
            var len = Math.min(this.c, chunk.length);
            var toAdd = chunk.subarray(0, len);
            this.c -= len;
            if (this.d)
                this.d.push(toAdd, !this.c);
            else
                this.k[0].push(toAdd);
            chunk = chunk.subarray(len);
            if (chunk.length)
                return this.push(chunk, final);
        }
        else {
            var f = 0, i = 0, is = void 0, buf = void 0;
            if (!this.p.length)
                buf = chunk;
            else if (!chunk.length)
                buf = this.p;
            else {
                buf = new u8(this.p.length + chunk.length);
                buf.set(this.p), buf.set(chunk, this.p.length);
            }
            var l = buf.length, oc = this.c, add = oc && this.d;
            var _loop_2 = function () {
                var _a;
                var sig = b4(buf, i);
                if (sig == 0x4034B50) {
                    f = 1, is = i;
                    this_1.d = null;
                    this_1.c = 0;
                    var bf = b2(buf, i + 6), cmp_1 = b2(buf, i + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i + 26), es = b2(buf, i + 28);
                    if (l > i + 30 + fnl + es) {
                        var chks_3 = [];
                        this_1.k.unshift(chks_3);
                        f = 2;
                        var sc_1 = b4(buf, i + 18), su_1 = b4(buf, i + 22);
                        var fn_1 = strFromU8(buf.subarray(i + 30, i += 30 + fnl), !u);
                        if (sc_1 == 4294967295) {
                            _a = dd ? [-2] : z64e(buf, i), sc_1 = _a[0], su_1 = _a[1];
                        }
                        else if (dd)
                            sc_1 = -1;
                        i += es;
                        this_1.c = sc_1;
                        var d_1;
                        var file_1 = {
                            name: fn_1,
                            compression: cmp_1,
                            start: function () {
                                if (!file_1.ondata)
                                    err(5);
                                if (!sc_1)
                                    file_1.ondata(null, et, true);
                                else {
                                    var ctr = _this_1.o[cmp_1];
                                    if (!ctr)
                                        file_1.ondata(err(14, 'unknown compression type ' + cmp_1, 1), null, false);
                                    d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                                    d_1.ondata = function (err, dat, final) { file_1.ondata(err, dat, final); };
                                    for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                                        var dat = chks_4[_i];
                                        d_1.push(dat, false);
                                    }
                                    if (_this_1.k[0] == chks_3 && _this_1.c)
                                        _this_1.d = d_1;
                                    else
                                        d_1.push(et, true);
                                }
                            },
                            terminate: function () {
                                if (d_1 && d_1.terminate)
                                    d_1.terminate();
                            }
                        };
                        if (sc_1 >= 0)
                            file_1.size = sc_1, file_1.originalSize = su_1;
                        this_1.onfile(file_1);
                    }
                    return "break";
                }
                else if (oc) {
                    if (sig == 0x8074B50) {
                        is = i += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
                        return "break";
                    }
                    else if (sig == 0x2014B50) {
                        is = i -= 4, f = 3, this_1.c = 0;
                        return "break";
                    }
                }
            };
            var this_1 = this;
            for (; i < l - 4; ++i) {
                var state_1 = _loop_2();
                if (state_1 === "break")
                    break;
            }
            this.p = et;
            if (oc < 0) {
                var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 0x8074B50 && 4)) : buf.subarray(0, i);
                if (add)
                    add.push(dat, !!f);
                else
                    this.k[+(f == 2)].push(dat);
            }
            if (f & 2)
                return this.push(buf.subarray(i), final);
            this.p = buf.subarray(i);
        }
        if (final) {
            if (this.c)
                err(13);
            this.p = null;
        }
    };
    /**
     * Registers a decoder with the stream, allowing for files compressed with
     * the compression type provided to be expanded correctly
     * @param decoder The decoder constructor
     */
    Unzip.prototype.register = function (decoder) {
        this.o[decoder.compression] = decoder;
    };
    return Unzip;
}());

var mt = typeof queueMicrotask == 'function' ? queueMicrotask : typeof setTimeout == 'function' ? setTimeout : function (fn) { fn(); };
function unzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var files = {};
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558) {
            cbd(err(13, 0, 1), null);
            return tAll;
        }
    }
    ;
    var lft = b2(data, e + 8);
    if (lft) {
        var c = lft;
        var o = b4(data, e + 16);
        var z = o == 4294967295 || c == 65535;
        if (z) {
            var ze = b4(data, e - 12);
            z = b4(data, ze) == 0x6064B50;
            if (z) {
                c = lft = b4(data, ze + 32);
                o = b4(data, ze + 48);
            }
        }
        var fltr = opts && opts.filter;
        var _loop_3 = function (i) {
            var _a = zh(data, o, z), c_1 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
            o = no;
            var cbl = function (e, d) {
                if (e) {
                    tAll();
                    cbd(e, null);
                }
                else {
                    if (d)
                        files[fn] = d;
                    if (!--lft)
                        cbd(null, files);
                }
            };
            if (!fltr || fltr({
                name: fn,
                size: sc,
                originalSize: su,
                compression: c_1
            })) {
                if (!c_1)
                    cbl(null, slc(data, b, b + sc));
                else if (c_1 == 8) {
                    var infl = data.subarray(b, b + sc);
                    if (sc < 320000) {
                        try {
                            cbl(null, inflateSync(infl, new u8(su)));
                        }
                        catch (e) {
                            cbl(e, null);
                        }
                    }
                    else
                        term.push(inflate(infl, { size: su }, cbl));
                }
                else
                    cbl(err(14, 'unknown compression type ' + c_1, 1), null);
            }
            else
                cbl(null, null);
        };
        for (var i = 0; i < c; ++i) {
            _loop_3(i);
        }
    }
    else
        cbd(null, {});
    return tAll;
}
/**
 * Synchronously decompresses a ZIP archive. Prefer using `unzip` for better
 * performance with more than one file.
 * @param data The raw compressed ZIP file
 * @param opts The ZIP extraction options
 * @returns The decompressed files
 */
function unzipSync(data, opts) {
    var files = {};
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558)
            err(13);
    }
    ;
    var c = b2(data, e + 8);
    if (!c)
        return {};
    var o = b4(data, e + 16);
    var z = o == 4294967295 || c == 65535;
    if (z) {
        var ze = b4(data, e - 12);
        z = b4(data, ze) == 0x6064B50;
        if (z) {
            c = b4(data, ze + 32);
            o = b4(data, ze + 48);
        }
    }
    var fltr = opts && opts.filter;
    for (var i = 0; i < c; ++i) {
        var _a = zh(data, o, z), c_2 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
        o = no;
        if (!fltr || fltr({
            name: fn,
            size: sc,
            originalSize: su,
            compression: c_2
        })) {
            if (!c_2)
                files[fn] = slc(data, b, b + sc);
            else if (c_2 == 8)
                files[fn] = inflateSync(data.subarray(b, b + sc), new u8(su));
            else
                err(14, 'unknown compression type ' + c_2);
        }
    }
    return files;
}


/***/ }),

/***/ "./src/core/config.ts":
/*!****************************!*\
  !*** ./src/core/config.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Configuration": () => (/* binding */ Configuration)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./constants.js */ "./src/core/constants.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/core/utils.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./log.js */ "./src/core/log.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./context.js */ "./src/core/context.ts");




const LOG_TAG = "core.Config";
const DEFAULT_MAX_EVENTS = 500;
class Configuration {
    constructor(config) {
        var _a;
        this.channel = config === null || config === void 0 ? void 0 : config.channel;
        this.appBuild = config === null || config === void 0 ? void 0 : config.appBuild;
        this.appDisplayVersion = config === null || config === void 0 ? void 0 : config.appDisplayVersion;
        this.architecture = config === null || config === void 0 ? void 0 : config.architecture;
        this.osVersion = config === null || config === void 0 ? void 0 : config.osVersion;
        this.buildDate = config === null || config === void 0 ? void 0 : config.buildDate;
        this.maxEvents = (config === null || config === void 0 ? void 0 : config.maxEvents) || DEFAULT_MAX_EVENTS;
        this.debug = {};
        if ((config === null || config === void 0 ? void 0 : config.serverEndpoint) && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.validateURL)(config.serverEndpoint)) {
            throw new Error(`Unable to initialize Glean, serverEndpoint ${config.serverEndpoint} is an invalid URL.`);
        }
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.testing && ((_a = config === null || config === void 0 ? void 0 : config.serverEndpoint) === null || _a === void 0 ? void 0 : _a.startsWith("http:"))) {
            throw new Error(`Unable to initialize Glean, serverEndpoint ${config.serverEndpoint} must use the HTTPS protocol.`);
        }
        this.serverEndpoint = (config && config.serverEndpoint)
            ? config.serverEndpoint : _constants_js__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_TELEMETRY_ENDPOINT;
        this.httpClient = config === null || config === void 0 ? void 0 : config.httpClient;
    }
    get logPings() {
        return this.debug.logPings || false;
    }
    set logPings(flag) {
        this.debug.logPings = flag;
    }
    get debugViewTag() {
        return this.debug.debugViewTag;
    }
    set debugViewTag(tag) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.validateHeader)(tag || "")) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_3__["default"])(LOG_TAG, [
                `"${tag || ""}" is not a valid \`debugViewTag\` value.`,
                "Please make sure the value passed satisfies the regex `^[a-zA-Z0-9-]{1,20}$`."
            ], _log_js__WEBPACK_IMPORTED_MODULE_3__.LoggingLevel.Error);
            return;
        }
        this.debug.debugViewTag = tag;
    }
    get sourceTags() {
        return this.debug.sourceTags;
    }
    set sourceTags(tags) {
        if (!tags || tags.length < 1 || tags.length > _constants_js__WEBPACK_IMPORTED_MODULE_2__.GLEAN_MAX_SOURCE_TAGS) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_3__["default"])(LOG_TAG, `A list of tags cannot contain more than ${_constants_js__WEBPACK_IMPORTED_MODULE_2__.GLEAN_MAX_SOURCE_TAGS} elements or less than one.`, _log_js__WEBPACK_IMPORTED_MODULE_3__.LoggingLevel.Error);
            return;
        }
        for (const tag of tags) {
            if (tag.startsWith("glean")) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_3__["default"])(LOG_TAG, "Tags starting with `glean` are reserved and must not be used.", _log_js__WEBPACK_IMPORTED_MODULE_3__.LoggingLevel.Error);
                return;
            }
            if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.validateHeader)(tag)) {
                return;
            }
        }
        this.debug.sourceTags = tags;
    }
}


/***/ }),

/***/ "./src/core/constants.ts":
/*!*******************************!*\
  !*** ./src/core/constants.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CLIENT_INFO_STORAGE": () => (/* binding */ CLIENT_INFO_STORAGE),
/* harmony export */   "DEFAULT_TELEMETRY_ENDPOINT": () => (/* binding */ DEFAULT_TELEMETRY_ENDPOINT),
/* harmony export */   "DELETION_REQUEST_PING_NAME": () => (/* binding */ DELETION_REQUEST_PING_NAME),
/* harmony export */   "EVENTS_PING_NAME": () => (/* binding */ EVENTS_PING_NAME),
/* harmony export */   "GLEAN_EXECUTION_COUNTER_EXTRA_KEY": () => (/* binding */ GLEAN_EXECUTION_COUNTER_EXTRA_KEY),
/* harmony export */   "GLEAN_MAX_SOURCE_TAGS": () => (/* binding */ GLEAN_MAX_SOURCE_TAGS),
/* harmony export */   "GLEAN_REFERENCE_TIME_EXTRA_KEY": () => (/* binding */ GLEAN_REFERENCE_TIME_EXTRA_KEY),
/* harmony export */   "GLEAN_RESERVED_EXTRA_KEYS": () => (/* binding */ GLEAN_RESERVED_EXTRA_KEYS),
/* harmony export */   "GLEAN_SCHEMA_VERSION": () => (/* binding */ GLEAN_SCHEMA_VERSION),
/* harmony export */   "GLEAN_VERSION": () => (/* binding */ GLEAN_VERSION),
/* harmony export */   "KNOWN_CLIENT_ID": () => (/* binding */ KNOWN_CLIENT_ID),
/* harmony export */   "PING_INFO_STORAGE": () => (/* binding */ PING_INFO_STORAGE)
/* harmony export */ });
const GLEAN_SCHEMA_VERSION = 1;
const GLEAN_VERSION = "2.0.0-alpha.1";
const PING_INFO_STORAGE = "glean_ping_info";
const CLIENT_INFO_STORAGE = "glean_client_info";
const KNOWN_CLIENT_ID = "c0ffeec0-ffee-c0ff-eec0-ffeec0ffeec0";
const DEFAULT_TELEMETRY_ENDPOINT = "https://incoming.telemetry.mozilla.org";
const DELETION_REQUEST_PING_NAME = "deletion-request";
const EVENTS_PING_NAME = "events";
const GLEAN_MAX_SOURCE_TAGS = 5;
const GLEAN_REFERENCE_TIME_EXTRA_KEY = "#glean_reference_time";
const GLEAN_EXECUTION_COUNTER_EXTRA_KEY = "#glean_execution_counter";
const GLEAN_RESERVED_EXTRA_KEYS = [
    GLEAN_EXECUTION_COUNTER_EXTRA_KEY,
    GLEAN_REFERENCE_TIME_EXTRA_KEY
];


/***/ }),

/***/ "./src/core/context.ts":
/*!*****************************!*\
  !*** ./src/core/context.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Context": () => (/* binding */ Context)
/* harmony export */ });
/* harmony import */ var _dispatcher_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./dispatcher.js */ "./src/core/dispatcher.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./log.js */ "./src/core/log.ts");


const LOG_TAG = "core.Context";
class Context {
    constructor() {
        this.initialized = false;
        this.testing = false;
        this.supportedMetrics = {};
        this.startTime = new Date();
        this.dispatcher = new _dispatcher_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
    }
    static get instance() {
        if (!Context._instance) {
            Context._instance = new Context();
        }
        return Context._instance;
    }
    static testUninitialize() {
        Context._instance = undefined;
    }
    static get dispatcher() {
        return Context.instance.dispatcher;
    }
    static get uploadEnabled() {
        if (typeof Context.instance.uploadEnabled === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.uploadEnabled before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.uploadEnabled;
    }
    static set uploadEnabled(upload) {
        Context.instance.uploadEnabled = upload;
    }
    static get metricsDatabase() {
        if (typeof Context.instance.metricsDatabase === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.metricsDatabase before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.metricsDatabase;
    }
    static set metricsDatabase(db) {
        Context.instance.metricsDatabase = db;
    }
    static get eventsDatabase() {
        if (typeof Context.instance.eventsDatabase === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.eventsDatabase before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.eventsDatabase;
    }
    static set eventsDatabase(db) {
        Context.instance.eventsDatabase = db;
    }
    static get pingsDatabase() {
        if (typeof Context.instance.pingsDatabase === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.pingsDatabase before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.pingsDatabase;
    }
    static set pingsDatabase(db) {
        Context.instance.pingsDatabase = db;
    }
    static get errorManager() {
        if (typeof Context.instance.errorManager === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.errorManager before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.errorManager;
    }
    static set errorManager(db) {
        Context.instance.errorManager = db;
    }
    static get applicationId() {
        if (typeof Context.instance.applicationId === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.applicationId before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.applicationId;
    }
    static set applicationId(id) {
        Context.instance.applicationId = id;
    }
    static get initialized() {
        return Context.instance.initialized;
    }
    static set initialized(init) {
        Context.instance.initialized = init;
    }
    static get config() {
        if (typeof Context.instance.config === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.config before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.config;
    }
    static set config(config) {
        Context.instance.config = config;
    }
    static get startTime() {
        return Context.instance.startTime;
    }
    static get testing() {
        return Context.instance.testing;
    }
    static set testing(flag) {
        Context.instance.testing = flag;
    }
    static get corePings() {
        return Context.instance.corePings;
    }
    static set corePings(pings) {
        Context.instance.corePings = pings;
    }
    static get coreMetrics() {
        return Context.instance.coreMetrics;
    }
    static set coreMetrics(metrics) {
        Context.instance.coreMetrics = metrics;
    }
    static set platform(platform) {
        Context.instance.platform = platform;
    }
    static get platform() {
        if (typeof Context.instance.platform === "undefined") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
                "Attempted to access Context.platform before it was set. This may cause unexpected behaviour."
            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Trace);
        }
        return Context.instance.platform;
    }
    static isPlatformSet() {
        return !!Context.instance.platform;
    }
    static isPlatformSync() {
        var _a;
        return ((_a = Context.instance.platform) === null || _a === void 0 ? void 0 : _a.name) === "web";
    }
    static getSupportedMetric(type) {
        return Context.instance.supportedMetrics[type];
    }
    static addSupportedMetric(type, ctor) {
        if (type in Context.instance.supportedMetrics) {
            return;
        }
        Context.instance.supportedMetrics[type] = ctor;
    }
}


/***/ }),

/***/ "./src/core/dispatcher.ts":
/*!********************************!*\
  !*** ./src/core/dispatcher.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DispatcherState": () => (/* binding */ DispatcherState),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./log.js */ "./src/core/log.ts");


const LOG_TAG = "core.Dispatcher";
var DispatcherState;
(function (DispatcherState) {
    DispatcherState["Uninitialized"] = "Uninitialized";
    DispatcherState["Idle"] = "Idle";
    DispatcherState["Processing"] = "Processing";
    DispatcherState["Stopped"] = "Stopped";
    DispatcherState["Shutdown"] = "Shutdown";
})(DispatcherState || (DispatcherState = {}));
var Commands;
(function (Commands) {
    Commands["Task"] = "Task";
    Commands["PersistentTask"] = "PersistentTask";
    Commands["InitTask"] = "InitTask";
    Commands["Stop"] = "Stop";
    Commands["Clear"] = "Clear";
    Commands["Shutdown"] = "Shutdown";
    Commands["TestTask"] = "TestTask";
})(Commands || (Commands = {}));
class Dispatcher {
    constructor(maxPreInitQueueSize = 100, logTag = LOG_TAG) {
        this.maxPreInitQueueSize = maxPreInitQueueSize;
        this.logTag = logTag;
        this.shuttingDown = false;
        this.currentJob = Promise.resolve();
        this.queue = [];
        this.state = "Uninitialized";
    }
    getNextCommand() {
        return this.queue.shift();
    }
    executeTask(task) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            try {
                yield task();
                return true;
            }
            catch (e) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.logTag, `Error executing Glean task${e ? `: ${e}` : ". There might be more error logs above."}`, _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Error);
                return false;
            }
        });
    }
    unblockTestResolvers() {
        this.queue.forEach(c => {
            if (c.command === "TestTask") {
                c.resolver();
            }
        });
    }
    execute() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            let nextCommand = this.getNextCommand();
            while (nextCommand) {
                switch (nextCommand.command) {
                    case ("Stop"):
                        this.state = "Stopped";
                        return;
                    case ("Shutdown"):
                        this.unblockTestResolvers();
                        this.queue = [];
                        this.state = "Shutdown";
                        this.shuttingDown = false;
                        return;
                    case ("Clear"):
                        this.unblockTestResolvers();
                        this.queue = this.queue.filter(c => ["PersistentTask", "Shutdown"].includes(c.command));
                        break;
                    case ("TestTask"):
                        yield this.executeTask(nextCommand.task);
                        nextCommand.resolver();
                        break;
                    case ("InitTask"):
                        const result = yield this.executeTask(nextCommand.task);
                        if (!result) {
                            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.logTag, [
                                "Error initializing dispatcher, won't execute anything further.",
                                "There might be more error logs above."
                            ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Error);
                            this.clear();
                            void this.shutdown();
                        }
                        break;
                    case ("PersistentTask"):
                    case ("Task"):
                        yield this.executeTask(nextCommand.task);
                        break;
                }
                nextCommand = this.getNextCommand();
            }
        });
    }
    triggerExecution() {
        if (this.state === "Idle" && this.queue.length > 0) {
            this.state = "Processing";
            this.currentJob = this.execute();
            this.currentJob
                .then(() => {
                const that = this;
                if (this.state === "Processing") {
                    that.state = "Idle";
                }
            })
                .catch(error => {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.logTag, [
                    "IMPOSSIBLE: Something went wrong while the dispatcher was executing the tasks queue.",
                    error
                ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Error);
            });
        }
    }
    launchInternal(command, priorityTask = false) {
        if (this.state === "Shutdown") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.logTag, "Attempted to enqueue a new task but the dispatcher is shutdown. Ignoring.", _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Warn);
            return false;
        }
        if (!priorityTask && this.state === "Uninitialized") {
            if (this.queue.length >= this.maxPreInitQueueSize) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.logTag, "Unable to enqueue task, pre init queue is full.", _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Warn);
                return false;
            }
        }
        if (priorityTask) {
            this.queue.unshift(command);
        }
        else {
            this.queue.push(command);
        }
        this.triggerExecution();
        return true;
    }
    launch(task) {
        this.launchInternal({
            task,
            command: "Task"
        });
    }
    launchPersistent(task) {
        this.launchInternal({
            task,
            command: "PersistentTask"
        });
    }
    flushInit(task) {
        if (this.state !== "Uninitialized") {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.logTag, "Attempted to initialize the Dispatcher, but it is already initialized. Ignoring.", _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Warn);
            return;
        }
        if (task) {
            this.launchInternal({
                task,
                command: "InitTask"
            }, true);
        }
        this.state = "Idle";
        this.triggerExecution();
    }
    clear(priorityTask = true) {
        this.launchInternal({ command: "Clear" }, priorityTask);
        this.resume();
    }
    stop(priorityTask = true) {
        if (this.shuttingDown) {
            this.clear(priorityTask);
        }
        else {
            this.launchInternal({ command: "Stop" }, priorityTask);
        }
    }
    resume() {
        if (this.state === "Stopped") {
            this.state = "Idle";
            this.triggerExecution();
        }
    }
    shutdown() {
        this.shuttingDown = true;
        this.launchInternal({ command: "Shutdown" });
        this.resume();
        return this.currentJob;
    }
    testBlockOnQueue() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            return yield this.currentJob;
        });
    }
    testUninitialize() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            if (this.state === "Uninitialized") {
                return;
            }
            this.clear();
            yield this.shutdown();
            this.state = "Uninitialized";
        });
    }
    testLaunch(task) {
        return new Promise((resolver, reject) => {
            this.resume();
            const wasLaunched = this.launchInternal({
                resolver,
                task,
                command: "TestTask"
            });
            if (!wasLaunched) {
                reject();
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Dispatcher);


/***/ }),

/***/ "./src/core/error/async.ts":
/*!*********************************!*\
  !*** ./src/core/error/async.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ErrorManager)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../log.js */ "./src/core/log.ts");
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./shared.js */ "./src/core/error/shared.ts");



class ErrorManager {
    record(metric, error, message, numErrors = 1) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            const errorMetric = (0,_shared_js__WEBPACK_IMPORTED_MODULE_1__.getErrorMetricForMetric)(metric, error);
            (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])((0,_shared_js__WEBPACK_IMPORTED_MODULE_1__.createLogTag)(metric), [`${metric.baseIdentifier()}:`, message]);
            if (numErrors > 0) {
                yield errorMetric.addUndispatched(numErrors);
            }
        });
    }
    testGetNumRecordedErrors(metric, error, ping) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            const errorMetric = (0,_shared_js__WEBPACK_IMPORTED_MODULE_1__.getErrorMetricForMetric)(metric, error);
            const numErrors = yield errorMetric.testGetValue(ping);
            return numErrors || 0;
        });
    }
}


/***/ }),

/***/ "./src/core/error/error_type.ts":
/*!**************************************!*\
  !*** ./src/core/error/error_type.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ErrorType": () => (/* binding */ ErrorType)
/* harmony export */ });
var ErrorType;
(function (ErrorType) {
    ErrorType["InvalidValue"] = "invalid_value";
    ErrorType["InvalidLabel"] = "invalid_label";
    ErrorType["InvalidState"] = "invalid_state";
    ErrorType["InvalidOverflow"] = "invalid_overflow";
    ErrorType["InvalidType"] = "invalid_type";
})(ErrorType || (ErrorType = {}));


/***/ }),

/***/ "./src/core/error/shared.ts":
/*!**********************************!*\
  !*** ./src/core/error/shared.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createLogTag": () => (/* binding */ createLogTag),
/* harmony export */   "getErrorMetricForMetric": () => (/* binding */ getErrorMetricForMetric)
/* harmony export */ });
/* harmony import */ var _metrics_types_labeled_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metrics/types/labeled.js */ "./src/core/metrics/types/labeled.ts");
/* harmony import */ var _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../metrics/types/counter.js */ "./src/core/metrics/types/counter.ts");


function createLogTag(metric) {
    const capitalizedType = metric.type.charAt(0).toUpperCase() + metric.type.slice(1);
    return `core.metrics.${capitalizedType}`;
}
function getErrorMetricForMetric(metric, error) {
    const identifier = metric.baseIdentifier();
    const name = (0,_metrics_types_labeled_js__WEBPACK_IMPORTED_MODULE_0__.stripLabel)(identifier);
    return new _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_1__.InternalCounterMetricType({
        name: (0,_metrics_types_labeled_js__WEBPACK_IMPORTED_MODULE_0__.combineIdentifierAndLabel)(error, name),
        category: "glean.error",
        lifetime: "ping",
        sendInPings: metric.sendInPings,
        disabled: false
    });
}


/***/ }),

/***/ "./src/core/events/async.ts":
/*!**********************************!*\
  !*** ./src/core/events/async.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./shared.js */ "./src/core/events/shared.ts");

const CoreEvents = {
    afterPingCollection: new _shared_js__WEBPACK_IMPORTED_MODULE_0__.CoreEvent("afterPingCollection")
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (CoreEvents);


/***/ }),

/***/ "./src/core/events/shared.ts":
/*!***********************************!*\
  !*** ./src/core/events/shared.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CoreEvent": () => (/* binding */ CoreEvent)
/* harmony export */ });
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../log.js */ "./src/core/log.ts");

const LOG_TAG = "core.Events";
class CoreEvent {
    constructor(name) {
        this.name = name;
    }
    get registeredPluginIdentifier() {
        var _a;
        return (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.name;
    }
    registerPlugin(plugin) {
        if (this.plugin) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_0__["default"])(LOG_TAG, [
                `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
                `That event is already watched by plugin '${this.plugin.name}'`,
                `Plugin '${plugin.name}' will be ignored.`
            ], _log_js__WEBPACK_IMPORTED_MODULE_0__.LoggingLevel.Error);
            return;
        }
        this.plugin = plugin;
    }
    deregisterPlugin() {
        this.plugin = undefined;
    }
    trigger(...args) {
        if (this.plugin) {
            return this.plugin.action(...args);
        }
    }
}


/***/ }),

/***/ "./src/core/events/sync.ts":
/*!*********************************!*\
  !*** ./src/core/events/sync.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./shared.js */ "./src/core/events/shared.ts");

const CoreEventsSync = {
    afterPingCollection: new _shared_js__WEBPACK_IMPORTED_MODULE_0__.CoreEvent("afterPingCollection")
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (CoreEventsSync);


/***/ }),

/***/ "./src/core/events/utils/async.ts":
/*!****************************************!*\
  !*** ./src/core/events/utils/async.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "registerPluginToEvent": () => (/* binding */ registerPluginToEvent),
/* harmony export */   "testResetEvents": () => (/* binding */ testResetEvents)
/* harmony export */ });
/* harmony import */ var _async_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../async.js */ "./src/core/events/async.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");


const LOG_TAG = "core.Events.Utils";
function registerPluginToEvent(plugin) {
    const eventName = plugin.event;
    if (eventName in _async_js__WEBPACK_IMPORTED_MODULE_0__["default"]) {
        const event = _async_js__WEBPACK_IMPORTED_MODULE_0__["default"][eventName];
        event.registerPlugin(plugin);
        return;
    }
    (0,_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [
        `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
        "That is not a valid Glean event. Ignoring"
    ], _log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Error);
}
function testResetEvents() {
    for (const event in _async_js__WEBPACK_IMPORTED_MODULE_0__["default"]) {
        _async_js__WEBPACK_IMPORTED_MODULE_0__["default"][event].deregisterPlugin();
    }
}


/***/ }),

/***/ "./src/core/glean/async.ts":
/*!*********************************!*\
  !*** ./src/core/glean/async.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../config.js */ "./src/core/config.ts");
/* harmony import */ var _metrics_database_async_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../metrics/database/async.js */ "./src/core/metrics/database/async.ts");
/* harmony import */ var _pings_database_async_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../pings/database/async.js */ "./src/core/pings/database/async.ts");
/* harmony import */ var _upload_manager_async_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../upload/manager/async.js */ "./src/core/upload/manager/async.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _internal_metrics_async_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../internal_metrics/async.js */ "./src/core/internal_metrics/async.ts");
/* harmony import */ var _metrics_events_database_async_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../metrics/events_database/async.js */ "./src/core/metrics/events_database/async.ts");
/* harmony import */ var _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../metrics/types/datetime.js */ "./src/core/metrics/types/datetime.ts");
/* harmony import */ var _internal_pings_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../internal_pings.js */ "./src/core/internal_pings.ts");
/* harmony import */ var _events_utils_async_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../events/utils/async.js */ "./src/core/events/utils/async.ts");
/* harmony import */ var _error_async_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../error/async.js */ "./src/core/error/async.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../log.js */ "./src/core/log.ts");















const LOG_TAG = "core.Glean";
var Glean;
(function (Glean) {
    function onUploadEnabled() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled = true;
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.coreMetrics.initialize();
        });
    }
    function onUploadDisabled(at_init) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            let reason;
            if (at_init) {
                reason = "at_init";
            }
            else {
                reason = "set_upload_enabled";
            }
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled = false;
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.corePings.deletionRequest.submitUndispatched(reason);
            yield clearMetrics();
        });
    }
    function clearMetrics() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            yield Glean.pingUploader.clearPendingPingsQueue();
            let firstRunDate;
            try {
                firstRunDate = new _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_2__.DatetimeMetric(yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_3__.CLIENT_INFO_STORAGE, _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.coreMetrics.firstRunDate)).date;
            }
            catch (_a) {
                firstRunDate = new Date();
            }
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.eventsDatabase.clearAll();
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.metricsDatabase.clearAll();
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.pingsDatabase.clearAll();
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled = true;
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.coreMetrics.clientId.setUndispatched(_constants_js__WEBPACK_IMPORTED_MODULE_3__.KNOWN_CLIENT_ID);
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.coreMetrics.firstRunDate.setUndispatched(firstRunDate);
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled = false;
        });
    }
    function initialize(applicationId, uploadEnabled, config) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, "Attempted to initialize Glean, but it has already been initialized. Ignoring.", _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Warn);
            return;
        }
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.isString)(applicationId)) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, "Unable to initialize Glean, applicationId must be a string.", _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
            return;
        }
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.isBoolean)(uploadEnabled)) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, "Unable to initialize Glean, uploadEnabled must be a boolean.", _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
            return;
        }
        if (applicationId.length === 0) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, "Unable to initialize Glean, applicationId cannot be an empty string.", _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
            return;
        }
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.platform) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, "Unable to initialize Glean, platform has not been set.", _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
            return;
        }
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.coreMetrics = new _internal_metrics_async_js__WEBPACK_IMPORTED_MODULE_6__.CoreMetrics();
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.corePings = new _internal_pings_js__WEBPACK_IMPORTED_MODULE_7__["default"]();
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.applicationId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.sanitizeApplicationId)(applicationId);
        const correctConfig = new _config_js__WEBPACK_IMPORTED_MODULE_8__.Configuration(config);
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.config = correctConfig;
        if (Glean.preInitLogPings)
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.config.logPings = Glean.preInitLogPings;
        if (Glean.preInitDebugViewTag)
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.config.debugViewTag = Glean.preInitDebugViewTag;
        if (Glean.preInitSourceTags)
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.config.sourceTags = Glean.preInitSourceTags;
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.metricsDatabase = new _metrics_database_async_js__WEBPACK_IMPORTED_MODULE_9__["default"]();
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.eventsDatabase = new _metrics_events_database_async_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.pingsDatabase = new _pings_database_async_js__WEBPACK_IMPORTED_MODULE_11__["default"]();
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.errorManager = new _error_async_js__WEBPACK_IMPORTED_MODULE_12__["default"]();
        Glean.pingUploader = new _upload_manager_async_js__WEBPACK_IMPORTED_MODULE_13__["default"](correctConfig, _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.pingsDatabase);
        if (config === null || config === void 0 ? void 0 : config.plugins) {
            for (const plugin of config.plugins) {
                (0,_events_utils_async_js__WEBPACK_IMPORTED_MODULE_14__.registerPluginToEvent)(plugin);
            }
        }
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.flushInit(() => (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized = true;
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled = uploadEnabled;
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.eventsDatabase.initialize();
            if (uploadEnabled) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.metricsDatabase.clear("application");
                yield onUploadEnabled();
            }
            else {
                const clientId = yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_3__.CLIENT_INFO_STORAGE, _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.coreMetrics.clientId);
                if (clientId) {
                    if (clientId !== _constants_js__WEBPACK_IMPORTED_MODULE_3__.KNOWN_CLIENT_ID) {
                        yield onUploadDisabled(true);
                    }
                }
                else {
                    yield clearMetrics();
                }
            }
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.pingsDatabase.scanPendingPings();
        }));
    }
    Glean.initialize = initialize;
    function setUploadEnabled(flag) {
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, [
                "Changing upload enabled before Glean is initialized is not supported.\n",
                "Pass the correct state into `initialize`.\n",
                "See documentation at https://mozilla.github.io/glean/book/user/general-api.html#initializing-the-glean-sdk`"
            ], _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
            return;
        }
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.isBoolean)(flag)) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, "Unable to change upload state, new value must be a boolean. Ignoring.", _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
            return;
        }
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            if (_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled !== flag) {
                if (flag) {
                    yield onUploadEnabled();
                }
                else {
                    yield onUploadDisabled(false);
                }
            }
        }));
    }
    Glean.setUploadEnabled = setUploadEnabled;
    function setLogPings(flag) {
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            Glean.preInitLogPings = flag;
        }
        else {
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.launch(() => {
                _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.config.logPings = flag;
                return Promise.resolve();
            });
        }
    }
    Glean.setLogPings = setLogPings;
    function setDebugViewTag(value) {
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            Glean.preInitDebugViewTag = value;
        }
        else {
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.launch(() => {
                _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.config.debugViewTag = value;
                return Promise.resolve();
            });
        }
    }
    Glean.setDebugViewTag = setDebugViewTag;
    function setSourceTags(value) {
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            Glean.preInitSourceTags = value;
        }
        else {
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.launch(() => {
                _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.config.sourceTags = value;
                return Promise.resolve();
            });
        }
    }
    Glean.setSourceTags = setSourceTags;
    function shutdown() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, "Attempted to shutdown Glean, but Glean is not initialized. Ignoring.");
                return;
            }
            yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.shutdown();
            yield Glean.pingUploader.blockOnOngoingUploads();
        });
    }
    Glean.shutdown = shutdown;
    function setPlatform(platform) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            return;
        }
        if (_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.isPlatformSet() && _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.platform.name !== platform.name && !_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.testing) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(LOG_TAG, [
                `IMPOSSIBLE: Attempted to change Glean's targeted platform",
           "from "${_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.platform.name}" to "${platform.name}". Ignoring.`
            ], _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
        }
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.platform = platform;
    }
    Glean.setPlatform = setPlatform;
})(Glean || (Glean = {}));
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Glean);


/***/ }),

/***/ "./src/core/internal_metrics/async.ts":
/*!********************************************!*\
  !*** ./src/core/internal_metrics/async.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CoreMetrics": () => (/* binding */ CoreMetrics)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _metrics_types_uuid_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metrics/types/uuid.js */ "./src/core/metrics/types/uuid.ts");
/* harmony import */ var _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../metrics/types/datetime.js */ "./src/core/metrics/types/datetime.ts");
/* harmony import */ var _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../metrics/types/string.js */ "./src/core/metrics/types/string.ts");
/* harmony import */ var _metrics_utils_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../metrics/utils.js */ "./src/core/metrics/utils.ts");
/* harmony import */ var _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../metrics/time_unit.js */ "./src/core/metrics/time_unit.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../log.js */ "./src/core/log.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");










const LOG_TAG = "core.InternalMetrics";
class CoreMetrics {
    constructor() {
        this.clientId = new _metrics_types_uuid_js__WEBPACK_IMPORTED_MODULE_0__.InternalUUIDMetricType({
            name: "client_id",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "user",
            disabled: false
        });
        this.firstRunDate = new _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__.InternalDatetimeMetricType({
            name: "first_run_date",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "user",
            disabled: false
        }, _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Day);
        this.os = new _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__.InternalStringMetricType({
            name: "os",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.osVersion = new _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__.InternalStringMetricType({
            name: "os_version",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.architecture = new _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__.InternalStringMetricType({
            name: "architecture",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.locale = new _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__.InternalStringMetricType({
            name: "locale",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.appChannel = new _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__.InternalStringMetricType({
            name: "app_channel",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.appBuild = new _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__.InternalStringMetricType({
            name: "app_build",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.appDisplayVersion = new _metrics_types_string_js__WEBPACK_IMPORTED_MODULE_3__.InternalStringMetricType({
            name: "app_display_version",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.buildDate = new _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__.InternalDatetimeMetricType({
            name: "build_date",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        }, "second");
    }
    initialize() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            yield this.initializeClientId();
            yield this.initializeFirstRunDate();
            yield this.os.setUndispatched(yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.platform.info.os());
            yield this.osVersion.setUndispatched(yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.platform.info.osVersion(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.config.osVersion));
            yield this.architecture.setUndispatched(yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.platform.info.arch(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.config.architecture));
            yield this.locale.setUndispatched(yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.platform.info.locale());
            yield this.appBuild.setUndispatched(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.config.appBuild || "Unknown");
            yield this.appDisplayVersion.setUndispatched(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.config.appDisplayVersion || "Unknown");
            if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.config.channel) {
                yield this.appChannel.setUndispatched(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.config.channel);
            }
            if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.config.buildDate) {
                yield this.buildDate.setUndispatched();
            }
        });
    }
    initializeClientId() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            let needNewClientId = false;
            const clientIdData = yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_6__.CLIENT_INFO_STORAGE, this.clientId);
            if (clientIdData) {
                try {
                    const currentClientId = (0,_metrics_utils_js__WEBPACK_IMPORTED_MODULE_7__.createMetric)("uuid", clientIdData);
                    if (currentClientId.payload() === _constants_js__WEBPACK_IMPORTED_MODULE_6__.KNOWN_CLIENT_ID) {
                        needNewClientId = true;
                    }
                }
                catch (_a) {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_8__["default"])(LOG_TAG, "Unexpected value found for Glean clientId. Ignoring.", _log_js__WEBPACK_IMPORTED_MODULE_8__.LoggingLevel.Warn);
                    needNewClientId = true;
                }
            }
            else {
                needNewClientId = true;
            }
            if (needNewClientId) {
                yield this.clientId.setUndispatched((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.generateUUIDv4)());
            }
        });
    }
    initializeFirstRunDate() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            const firstRunDate = yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_6__.CLIENT_INFO_STORAGE, this.firstRunDate);
            if (!firstRunDate) {
                yield this.firstRunDate.setUndispatched();
            }
        });
    }
}


/***/ }),

/***/ "./src/core/internal_pings.ts":
/*!************************************!*\
  !*** ./src/core/internal_pings.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants.js */ "./src/core/constants.ts");
/* harmony import */ var _pings_ping_type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./pings/ping_type.js */ "./src/core/pings/ping_type.ts");


class CorePings {
    constructor() {
        this.deletionRequest = new _pings_ping_type_js__WEBPACK_IMPORTED_MODULE_0__.InternalPingType({
            name: _constants_js__WEBPACK_IMPORTED_MODULE_1__.DELETION_REQUEST_PING_NAME,
            includeClientId: true,
            sendIfEmpty: true,
            reasonCodes: ["at_init", "set_upload_enabled"],
        });
        this.events = new _pings_ping_type_js__WEBPACK_IMPORTED_MODULE_0__.InternalPingType({
            name: _constants_js__WEBPACK_IMPORTED_MODULE_1__.EVENTS_PING_NAME,
            includeClientId: true,
            sendIfEmpty: false,
            reasonCodes: ["startup", "max_capacity"]
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (CorePings);


/***/ }),

/***/ "./src/core/log.ts":
/*!*************************!*\
  !*** ./src/core/log.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LoggingLevel": () => (/* binding */ LoggingLevel),
/* harmony export */   "default": () => (/* binding */ log)
/* harmony export */ });
var LoggingLevel;
(function (LoggingLevel) {
    LoggingLevel["Debug"] = "debug";
    LoggingLevel["Info"] = "info";
    LoggingLevel["Warn"] = "warn";
    LoggingLevel["Error"] = "error";
    LoggingLevel["Trace"] = "trace";
})(LoggingLevel || (LoggingLevel = {}));
function log(modulePath, message, level = LoggingLevel.Debug) {
    const prefix = `(Glean.${modulePath})`;
    if (Array.isArray(message)) {
        console[level](prefix, ...message);
    }
    else {
        console[level](prefix, message);
    }
}


/***/ }),

/***/ "./src/core/metrics/database/async.ts":
/*!********************************************!*\
  !*** ./src/core/metrics/database/async.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./shared.js */ "./src/core/metrics/database/shared.ts");






class MetricsDatabase {
    constructor() {
        this.userStore = new _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.platform.Storage("userLifetimeMetrics");
        this.pingStore = new _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.platform.Storage("pingLifetimeMetrics");
        this.appStore = new _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.platform.Storage("appLifetimeMetrics");
    }
    record(metric, value) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            yield this.transform(metric, () => value);
        });
    }
    transform(metric, transformFn) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            if (metric.disabled) {
                return;
            }
            const store = this.chooseStore(metric.lifetime);
            const storageKey = yield metric.identifier();
            for (const ping of metric.sendInPings) {
                const finalTransformFn = (v) => transformFn(v).get();
                yield store.update([ping, metric.type, storageKey], finalTransformFn);
            }
        });
    }
    hasMetric(lifetime, ping, metricType, metricIdentifier) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const store = this.chooseStore(lifetime);
            const value = yield store.get([ping, metricType, metricIdentifier]);
            return !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(value);
        });
    }
    countByBaseIdentifier(lifetime, ping, metricType, metricIdentifier) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const store = this.chooseStore(lifetime);
            const pingStorage = yield store.get([ping, metricType]);
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(pingStorage)) {
                return 0;
            }
            return Object.keys(pingStorage).filter((n) => n.startsWith(metricIdentifier)).length;
        });
    }
    getMetric(ping, metric) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const store = this.chooseStore(metric.lifetime);
            const storageKey = yield metric.identifier();
            const value = yield store.get([ping, metric.type, storageKey]);
            if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(value) && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.validateMetricInternalRepresentation)(metric.type, value)) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_5__.METRICS_DATABASE_LOG_TAG, `Unexpected value found for metric ${storageKey}: ${JSON.stringify(value)}. Clearing.`, _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Error);
                yield store.delete([ping, metric.type, storageKey]);
                return;
            }
            else {
                return value;
            }
        });
    }
    getPingMetrics(ping, clearPingLifetimeData) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const userData = yield this.getCorrectedPingData(ping, "user");
            const pingData = yield this.getCorrectedPingData(ping, "ping");
            const appData = yield this.getCorrectedPingData(ping, "application");
            if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
                yield this.clear("ping", ping);
            }
            const response = {};
            for (const data of [userData, pingData, appData]) {
                for (const metricType in data) {
                    for (const metricId in data[metricType]) {
                        if (!metricId.startsWith(_shared_js__WEBPACK_IMPORTED_MODULE_5__.RESERVED_METRIC_IDENTIFIER_PREFIX)) {
                            if (metricId.includes("/")) {
                                this.processLabeledMetric(response, metricType, metricId, data[metricType][metricId]);
                            }
                            else {
                                response[metricType] = Object.assign(Object.assign({}, response[metricType]), { [metricId]: data[metricType][metricId] });
                            }
                        }
                    }
                }
            }
            if (Object.keys(response).length === 0) {
                return;
            }
            else {
                return (0,_shared_js__WEBPACK_IMPORTED_MODULE_5__.createMetricsPayload)(response);
            }
        });
    }
    clear(lifetime, ping) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const store = this.chooseStore(lifetime);
            const storageIndex = ping ? [ping] : [];
            yield store.delete(storageIndex);
        });
    }
    clearAll() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            yield this.userStore.delete([]);
            yield this.pingStore.delete([]);
            yield this.appStore.delete([]);
        });
    }
    chooseStore(lifetime) {
        switch (lifetime) {
            case "user":
                return this.userStore;
            case "ping":
                return this.pingStore;
            case "application":
                return this.appStore;
        }
    }
    getCorrectedPingData(ping, lifetime) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const store = this.chooseStore(lifetime);
            const data = yield store.get([ping]);
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(data)) {
                return {};
            }
            if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(data)) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_5__.METRICS_DATABASE_LOG_TAG, `Invalid value found in storage for ping "${ping}". Deleting.`, _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Debug);
                yield store.delete([ping]);
                return {};
            }
            const correctedData = {};
            for (const metricType in data) {
                const metrics = data[metricType];
                if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(metrics)) {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_5__.METRICS_DATABASE_LOG_TAG, `Unexpected data found in storage for metrics of type "${metricType}" in ping "${ping}". Deleting.`, _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Debug);
                    yield store.delete([ping, metricType]);
                    continue;
                }
                for (const metricIdentifier in metrics) {
                    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.validateMetricInternalRepresentation)(metricType, metrics[metricIdentifier])) {
                        (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_5__.METRICS_DATABASE_LOG_TAG, `Invalid value "${JSON.stringify(metrics[metricIdentifier])}" found in storage for metric "${metricIdentifier}". Deleting.`, _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Debug);
                        yield store.delete([ping, metricType, metricIdentifier]);
                        continue;
                    }
                    if (!correctedData[metricType]) {
                        correctedData[metricType] = {};
                    }
                    correctedData[metricType][metricIdentifier] = metrics[metricIdentifier];
                }
            }
            return correctedData;
        });
    }
    processLabeledMetric(snapshot, metricType, metricId, metricData) {
        const newType = `labeled_${metricType}`;
        const idLabelSplit = metricId.split("/", 2);
        const newId = idLabelSplit[0];
        const label = idLabelSplit[1];
        if (newType in snapshot && newId in snapshot[newType]) {
            const existingData = snapshot[newType][newId];
            snapshot[newType][newId] = Object.assign(Object.assign({}, existingData), { [label]: metricData });
        }
        else {
            snapshot[newType] = Object.assign(Object.assign({}, snapshot[newType]), { [newId]: {
                    [label]: metricData
                } });
        }
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MetricsDatabase);


/***/ }),

/***/ "./src/core/metrics/database/shared.ts":
/*!*********************************************!*\
  !*** ./src/core/metrics/database/shared.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "METRICS_DATABASE_LOG_TAG": () => (/* binding */ METRICS_DATABASE_LOG_TAG),
/* harmony export */   "RESERVED_METRIC_IDENTIFIER_PREFIX": () => (/* binding */ RESERVED_METRIC_IDENTIFIER_PREFIX),
/* harmony export */   "createMetricsPayload": () => (/* binding */ createMetricsPayload),
/* harmony export */   "generateReservedMetricIdentifiers": () => (/* binding */ generateReservedMetricIdentifiers)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");

const METRICS_DATABASE_LOG_TAG = "core.Metrics.Database";
const RESERVED_METRIC_NAME_PREFIX = "reserved#";
const RESERVED_METRIC_IDENTIFIER_PREFIX = `glean.${RESERVED_METRIC_NAME_PREFIX}`;
function generateReservedMetricIdentifiers(name) {
    return {
        category: "glean",
        name: `${RESERVED_METRIC_NAME_PREFIX}${name}`
    };
}
function createMetricsPayload(v) {
    const result = {};
    for (const metricType in v) {
        const metrics = v[metricType];
        result[metricType] = {};
        for (const metricIdentifier in metrics) {
            const metric = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.createMetric)(metricType, metrics[metricIdentifier]);
            result[metricType][metricIdentifier] = metric.payload();
        }
    }
    return result;
}


/***/ }),

/***/ "./src/core/metrics/distributions.ts":
/*!*******************************************!*\
  !*** ./src/core/metrics/distributions.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "extractAccumulatedValuesFromJsonValue": () => (/* binding */ extractAccumulatedValuesFromJsonValue),
/* harmony export */   "getNumNegativeSamples": () => (/* binding */ getNumNegativeSamples),
/* harmony export */   "getNumTooLongSamples": () => (/* binding */ getNumTooLongSamples),
/* harmony export */   "snapshot": () => (/* binding */ snapshot)
/* harmony export */ });
function snapshot(hist) {
    const snapshotValues = hist.snapshotValues();
    const utilizedValues = {};
    Object.entries(snapshotValues).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (value > 0 && !isNaN(numericKey)) {
            utilizedValues[numericKey] = value;
        }
    });
    return {
        count: hist.count,
        values: utilizedValues,
        sum: hist.sum
    };
}
function extractAccumulatedValuesFromJsonValue(jsonValue) {
    let values;
    if (jsonValue) {
        values = jsonValue;
    }
    else {
        values = [];
    }
    return values;
}
function getNumNegativeSamples(samples) {
    return samples.filter((sample) => sample < 0).length;
}
function getNumTooLongSamples(samples, max) {
    return samples.filter((sample) => sample > max).length;
}


/***/ }),

/***/ "./src/core/metrics/events_database/async.ts":
/*!***************************************************!*\
  !*** ./src/core/metrics/events_database/async.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _recorded_event_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./recorded_event.js */ "./src/core/metrics/events_database/recorded_event.ts");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./shared.js */ "./src/core/metrics/events_database/shared.ts");








function recordGleanRestartedEvent(sendInPings, time = _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.startTime) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
        const metric = (0,_shared_js__WEBPACK_IMPORTED_MODULE_2__.getGleanRestartedEventMetric)(sendInPings);
        yield metric.recordUndispatched({
            [_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_REFERENCE_TIME_EXTRA_KEY]: time.toISOString()
        }, 0);
    });
}
class EventsDatabase {
    constructor() {
        this.initialized = false;
        this.eventsStore = new _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.platform.Storage("events");
    }
    initialize() {
        var _a;
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            if (this.initialized) {
                return;
            }
            const storeNames = yield this.getAvailableStoreNames();
            if (storeNames.includes(_constants_js__WEBPACK_IMPORTED_MODULE_3__.EVENTS_PING_NAME)) {
                const storedEvents = (_a = (yield this.eventsStore.get([_constants_js__WEBPACK_IMPORTED_MODULE_3__.EVENTS_PING_NAME]))) !== null && _a !== void 0 ? _a : [];
                if (storedEvents.length > 0) {
                    yield _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.corePings.events.submitUndispatched("startup");
                }
            }
            yield (0,_shared_js__WEBPACK_IMPORTED_MODULE_2__.getExecutionCounterMetric)(storeNames).addUndispatched(1);
            yield recordGleanRestartedEvent(storeNames);
            this.initialized = true;
        });
    }
    record(metric, value) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            if (metric.disabled) {
                return;
            }
            for (const ping of metric.sendInPings) {
                const executionCounter = (0,_shared_js__WEBPACK_IMPORTED_MODULE_2__.getExecutionCounterMetric)([ping]);
                let currentExecutionCount = yield _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.metricsDatabase.getMetric(ping, executionCounter);
                if (!currentExecutionCount) {
                    yield executionCounter.addUndispatched(1);
                    currentExecutionCount = 1;
                    yield recordGleanRestartedEvent([ping], new Date());
                }
                value.addExtra(_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_EXECUTION_COUNTER_EXTRA_KEY, currentExecutionCount);
                let numEvents = 0;
                const transformFn = (v) => {
                    var _a;
                    const events = (_a = v) !== null && _a !== void 0 ? _a : [];
                    events.push(value.get());
                    numEvents = events.length;
                    return events;
                };
                yield this.eventsStore.update([ping], transformFn);
                if (ping === _constants_js__WEBPACK_IMPORTED_MODULE_3__.EVENTS_PING_NAME && numEvents >= _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.config.maxEvents) {
                    yield _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.corePings.events.submitUndispatched("max_capacity");
                }
            }
        });
    }
    getEvents(ping, metric) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const events = yield this.getAndValidatePingData(ping);
            if (events.length === 0) {
                return;
            }
            return (events
                .filter((e) => e.get().category === metric.category && e.get().name === metric.name)
                .map((e) => e.withoutReservedExtras()));
        });
    }
    getPingEvents(ping, clearPingLifetimeData) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const pingData = yield this.getAndValidatePingData(ping);
            if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
                yield this.eventsStore.delete([ping]);
            }
            if (pingData.length === 0) {
                return;
            }
            const payload = yield this.prepareEventsPayload(ping, pingData);
            if (payload.length > 0) {
                return payload;
            }
        });
    }
    clearAll() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            yield this.eventsStore.delete([]);
        });
    }
    getAvailableStoreNames() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const data = yield this.eventsStore.get([]);
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isUndefined)(data)) {
                return [];
            }
            return Object.keys(data);
        });
    }
    getAndValidatePingData(ping) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const data = yield this.eventsStore.get([ping]);
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isUndefined)(data)) {
                return [];
            }
            if (!Array.isArray(data)) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_2__.EVENT_DATABASE_LOG_TAG, `Unexpected value found for ping ${ping}: ${JSON.stringify(data)}. Clearing.`, _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Error);
                yield this.eventsStore.delete([ping]);
                return [];
            }
            return data.reduce((result, e) => {
                try {
                    const event = new _recorded_event_js__WEBPACK_IMPORTED_MODULE_6__.RecordedEvent(e);
                    return [...result, event];
                }
                catch (_a) {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_2__.EVENT_DATABASE_LOG_TAG, `Unexpected data found in events storage: ${JSON.stringify(e)}. Ignoring.`);
                    return result;
                }
            }, []);
        });
    }
    prepareEventsPayload(pingName, pingData) {
        var _a, _b, _c, _d;
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            let sortedEvents = pingData.sort((a, b) => {
                var _a, _b;
                const executionCounterA = Number((_a = a.get().extra) === null || _a === void 0 ? void 0 : _a[_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
                const executionCounterB = Number((_b = b.get().extra) === null || _b === void 0 ? void 0 : _b[_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
                if (executionCounterA !== executionCounterB) {
                    return executionCounterA - executionCounterB;
                }
                return a.get().timestamp - b.get().timestamp;
            });
            let lastRestartDate;
            try {
                lastRestartDate = (0,_shared_js__WEBPACK_IMPORTED_MODULE_2__.createDateObject)((_a = sortedEvents[0].get().extra) === null || _a === void 0 ? void 0 : _a[_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_REFERENCE_TIME_EXTRA_KEY]);
                sortedEvents.shift();
            }
            catch (_e) {
                lastRestartDate = _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.startTime;
            }
            const firstEventOffset = ((_b = sortedEvents[0]) === null || _b === void 0 ? void 0 : _b.get().timestamp) || 0;
            let restartedOffset = 0;
            for (const [index, event] of sortedEvents.entries()) {
                try {
                    const nextRestartDate = (0,_shared_js__WEBPACK_IMPORTED_MODULE_2__.createDateObject)((_c = event.get().extra) === null || _c === void 0 ? void 0 : _c[_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_REFERENCE_TIME_EXTRA_KEY]);
                    const dateOffset = nextRestartDate.getTime() - lastRestartDate.getTime();
                    lastRestartDate = nextRestartDate;
                    const newRestartedOffset = restartedOffset + dateOffset;
                    const previousEventTimestamp = sortedEvents[index - 1].get().timestamp;
                    if (newRestartedOffset <= previousEventTimestamp) {
                        restartedOffset = previousEventTimestamp + 1;
                        yield _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.errorManager.record((0,_shared_js__WEBPACK_IMPORTED_MODULE_2__.getGleanRestartedEventMetric)([pingName]), _error_error_type_js__WEBPACK_IMPORTED_MODULE_7__.ErrorType.InvalidValue, `Invalid time offset between application sessions found for ping "${pingName}". Ignoring.`);
                    }
                    else {
                        restartedOffset = newRestartedOffset;
                    }
                }
                catch (_f) {
                }
                const executionCount = Number(((_d = event.get().extra) === null || _d === void 0 ? void 0 : _d[_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_EXECUTION_COUNTER_EXTRA_KEY]) || 1);
                let adjustedTimestamp;
                if (executionCount === 1) {
                    adjustedTimestamp = event.get().timestamp - firstEventOffset;
                }
                else {
                    adjustedTimestamp = event.get().timestamp + restartedOffset;
                }
                sortedEvents[index] = new _recorded_event_js__WEBPACK_IMPORTED_MODULE_6__.RecordedEvent({
                    category: event.get().category,
                    name: event.get().name,
                    timestamp: adjustedTimestamp,
                    extra: event.get().extra
                });
            }
            sortedEvents = (0,_shared_js__WEBPACK_IMPORTED_MODULE_2__.removeTrailingRestartedEvents)(sortedEvents);
            return sortedEvents.map((e) => e.payload());
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (EventsDatabase);


/***/ }),

/***/ "./src/core/metrics/events_database/recorded_event.ts":
/*!************************************************************!*\
  !*** ./src/core/metrics/events_database/recorded_event.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "RecordedEvent": () => (/* binding */ RecordedEvent)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");




class RecordedEvent extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    static withTransformedExtras(e, transformFn) {
        const extras = e.extra || {};
        const transformedExtras = transformFn(extras);
        return {
            category: e.category,
            name: e.name,
            timestamp: e.timestamp,
            extra: (transformedExtras && Object.keys(transformedExtras).length > 0)
                ? transformedExtras : undefined
        };
    }
    addExtra(key, value) {
        if (!this.inner.extra) {
            this.inner.extra = {};
        }
        this.inner.extra[key] = value;
    }
    withoutReservedExtras() {
        return RecordedEvent.withTransformedExtras(this.get(), (extras) => {
            return Object.keys(extras)
                .filter(key => !_constants_js__WEBPACK_IMPORTED_MODULE_1__.GLEAN_RESERVED_EXTRA_KEYS.includes(key))
                .reduce((obj, key) => {
                obj[key] = extras[key];
                return obj;
            }, {});
        });
    }
    validate(v) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(v)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected Glean event object, got ${typeof v}`
            };
        }
        const categoryValidation = "category" in v && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isString)(v.category);
        const nameValidation = "name" in v && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isString)(v.name);
        if (!categoryValidation || !nameValidation) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Unexpected value for "category" or "name" in event object: ${JSON.stringify(v)}`
            };
        }
        const timestampValidation = "timestamp" in v && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isInteger)(v.timestamp) && v.timestamp >= 0;
        if (!timestampValidation) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Event timestamp must be a positive integer, got ${JSON.stringify(v)}`
            };
        }
        if (v.extra) {
            if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(v.extra)) {
                return {
                    type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                    errorMessage: `Expected Glean extras object, got ${typeof v}`
                };
            }
            for (const [key, value] of Object.entries(v.extra)) {
                const validation = (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.validateString)(key);
                if (validation.type === _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error) {
                    return validation;
                }
                if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isString)(value) && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(value) && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isBoolean)(value)) {
                    return {
                        type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                        errorMessage: `Unexpected value for extra key ${key}: ${JSON.stringify(value)}`
                    };
                }
            }
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        return RecordedEvent.withTransformedExtras(this.withoutReservedExtras(), (extras) => {
            return Object.keys(extras)
                .reduce((extra, key) => {
                extra[key] = extras[key].toString();
                return extra;
            }, {});
        });
    }
}


/***/ }),

/***/ "./src/core/metrics/events_database/shared.ts":
/*!****************************************************!*\
  !*** ./src/core/metrics/events_database/shared.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EVENT_DATABASE_LOG_TAG": () => (/* binding */ EVENT_DATABASE_LOG_TAG),
/* harmony export */   "createDateObject": () => (/* binding */ createDateObject),
/* harmony export */   "getExecutionCounterMetric": () => (/* binding */ getExecutionCounterMetric),
/* harmony export */   "getGleanRestartedEventMetric": () => (/* binding */ getGleanRestartedEventMetric),
/* harmony export */   "isRestartedEvent": () => (/* binding */ isRestartedEvent),
/* harmony export */   "removeTrailingRestartedEvents": () => (/* binding */ removeTrailingRestartedEvents)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _types_counter_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../types/counter.js */ "./src/core/metrics/types/counter.ts");
/* harmony import */ var _database_shared_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../database/shared.js */ "./src/core/metrics/database/shared.ts");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _types_event_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../types/event.js */ "./src/core/metrics/types/event.ts");





const EVENT_DATABASE_LOG_TAG = "core.Metric.EventsDatabase";
function createDateObject(str) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isString)(str)) {
        str = "";
    }
    const date = new Date(str);
    if (isNaN(date.getTime())) {
        throw new Error(`Error attempting to generate Date object from string: ${str}`);
    }
    return date;
}
function getExecutionCounterMetric(sendInPings) {
    return new _types_counter_js__WEBPACK_IMPORTED_MODULE_1__.InternalCounterMetricType(Object.assign(Object.assign({}, (0,_database_shared_js__WEBPACK_IMPORTED_MODULE_2__.generateReservedMetricIdentifiers)("execution_counter")), { sendInPings: sendInPings.filter((name) => name !== _constants_js__WEBPACK_IMPORTED_MODULE_3__.EVENTS_PING_NAME), lifetime: "ping", disabled: false }));
}
function getGleanRestartedEventMetric(sendInPings) {
    return new _types_event_js__WEBPACK_IMPORTED_MODULE_4__.InternalEventMetricType({
        category: "glean",
        name: "restarted",
        sendInPings: sendInPings.filter((name) => name !== _constants_js__WEBPACK_IMPORTED_MODULE_3__.EVENTS_PING_NAME),
        lifetime: "ping",
        disabled: false
    }, [_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_REFERENCE_TIME_EXTRA_KEY]);
}
function isRestartedEvent(event) {
    var _a, _b;
    return !!((_b = (_a = event === null || event === void 0 ? void 0 : event.get()) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b[_constants_js__WEBPACK_IMPORTED_MODULE_3__.GLEAN_REFERENCE_TIME_EXTRA_KEY]);
}
function removeTrailingRestartedEvents(sortedEvents) {
    while (!!sortedEvents.length && isRestartedEvent(sortedEvents[sortedEvents.length - 1])) {
        sortedEvents.pop();
    }
    return sortedEvents;
}


/***/ }),

/***/ "./src/core/metrics/index.ts":
/*!***********************************!*\
  !*** ./src/core/metrics/index.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MetricType": () => (/* binding */ MetricType)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _types_labeled_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./types/labeled.js */ "./src/core/metrics/types/labeled.ts");




class MetricType {
    constructor(type, meta, metricCtor) {
        if (metricCtor) {
            _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.addSupportedMetric(type, metricCtor);
        }
        this.type = type;
        this.name = meta.name;
        this.category = meta.category;
        this.sendInPings = meta.sendInPings;
        this.lifetime = meta.lifetime;
        this.disabled = meta.disabled;
        this.dynamicLabel = meta.dynamicLabel;
    }
    baseIdentifier() {
        if (this.category.length > 0) {
            return `${this.category}.${this.name}`;
        }
        else {
            return this.name;
        }
    }
    identifier() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const baseIdentifier = this.baseIdentifier();
            if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.dynamicLabel)) {
                return yield (0,_types_labeled_js__WEBPACK_IMPORTED_MODULE_3__.getValidDynamicLabel)(this);
            }
            else {
                return baseIdentifier;
            }
        });
    }
    identifierSync() {
        const baseIdentifier = this.baseIdentifier();
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.dynamicLabel)) {
            return (0,_types_labeled_js__WEBPACK_IMPORTED_MODULE_3__.getValidDynamicLabelSync)(this);
        }
        else {
            return baseIdentifier;
        }
    }
    shouldRecord(uploadEnabled) {
        return uploadEnabled && !this.disabled;
    }
    testGetNumRecordedErrors(errorType, ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.testOnlyCheck)("testGetNumRecordedErrors")) {
                return _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.errorManager.testGetNumRecordedErrors(this, errorType, ping);
            }
            return 0;
        });
    }
}


/***/ }),

/***/ "./src/core/metrics/memory_unit.ts":
/*!*****************************************!*\
  !*** ./src/core/metrics/memory_unit.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MemoryUnit": () => (/* binding */ MemoryUnit),
/* harmony export */   "convertMemoryUnitToBytes": () => (/* binding */ convertMemoryUnitToBytes)
/* harmony export */ });
var MemoryUnit;
(function (MemoryUnit) {
    MemoryUnit["Byte"] = "byte";
    MemoryUnit["Kilobyte"] = "kilobyte";
    MemoryUnit["Megabyte"] = "megabyte";
    MemoryUnit["Gigabyte"] = "gigabyte";
})(MemoryUnit || (MemoryUnit = {}));
function convertMemoryUnitToBytes(value, memoryUnit) {
    switch (memoryUnit) {
        case MemoryUnit.Byte:
            return value;
        case MemoryUnit.Kilobyte:
            return value * (2 ** 10);
        case MemoryUnit.Megabyte:
            return value * (2 ** 20);
        case MemoryUnit.Gigabyte:
            return value * (2 ** 30);
    }
}


/***/ }),

/***/ "./src/core/metrics/metric.ts":
/*!************************************!*\
  !*** ./src/core/metrics/metric.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Metric": () => (/* binding */ Metric),
/* harmony export */   "MetricValidation": () => (/* binding */ MetricValidation),
/* harmony export */   "MetricValidationError": () => (/* binding */ MetricValidationError)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../error/error_type.js */ "./src/core/error/error_type.ts");



var MetricValidation;
(function (MetricValidation) {
    MetricValidation[MetricValidation["Success"] = 0] = "Success";
    MetricValidation[MetricValidation["Error"] = 1] = "Error";
})(MetricValidation || (MetricValidation = {}));
class MetricValidationError extends Error {
    constructor(message, type = _error_error_type_js__WEBPACK_IMPORTED_MODULE_0__.ErrorType.InvalidType) {
        super(message);
        this.type = type;
        try {
            this.name = "MetricValidationError";
        }
        catch (_a) {
        }
    }
    recordError(metric) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(metric, this.type, this.message);
        });
    }
    recordErrorSync(metric) {
        _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(metric, this.type, this.message);
    }
}
class Metric {
    constructor(v) {
        this.inner = this.validateOrThrow(v);
    }
    get() {
        return this.inner;
    }
    set(v) {
        this.inner = v;
    }
    validateOrThrow(v) {
        const validation = this.validate(v);
        if (validation.type === MetricValidation.Error) {
            throw new MetricValidationError(validation.errorMessage, validation.errorType);
        }
        return v;
    }
}


/***/ }),

/***/ "./src/core/metrics/time_unit.ts":
/*!***************************************!*\
  !*** ./src/core/metrics/time_unit.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "convertTimeUnitToNanos": () => (/* binding */ convertTimeUnitToNanos),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var TimeUnit;
(function (TimeUnit) {
    TimeUnit["Nanosecond"] = "nanosecond";
    TimeUnit["Microsecond"] = "microsecond";
    TimeUnit["Millisecond"] = "millisecond";
    TimeUnit["Second"] = "second";
    TimeUnit["Minute"] = "minute";
    TimeUnit["Hour"] = "hour";
    TimeUnit["Day"] = "day";
})(TimeUnit || (TimeUnit = {}));
function convertTimeUnitToNanos(duration, timeUnit) {
    switch (timeUnit) {
        case TimeUnit.Nanosecond:
            return duration;
        case TimeUnit.Microsecond:
            return duration * 10 ** 3;
        case TimeUnit.Millisecond:
            return duration * 10 ** 6;
        case TimeUnit.Second:
            return duration * 10 ** 9;
        case TimeUnit.Minute:
            return duration * 10 ** 9 * 60;
        case TimeUnit.Hour:
            return duration * 10 ** 9 * 60 * 60;
        case TimeUnit.Day:
            return duration * 10 ** 9 * 60 * 60 * 24;
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TimeUnit);


/***/ }),

/***/ "./src/core/metrics/types/boolean.ts":
/*!*******************************************!*\
  !*** ./src/core/metrics/types/boolean.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BooleanMetric": () => (/* binding */ BooleanMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
var _inner;






const LOG_TAG = "core.metrics.BooleanMetricType";
class BooleanMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(v)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected boolean value, got ${JSON.stringify(v)}`
            };
        }
        else {
            return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
        }
    }
    payload() {
        return this.inner;
    }
}
class InternalBooleanMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_2__.MetricType {
    constructor(meta) {
        super("boolean", meta, BooleanMetric);
    }
    set(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    setAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
                return;
            }
            try {
                const metric = new BooleanMetric(value);
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    setSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
            return;
        }
        try {
            const metric = new BooleanMetric(value);
            _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldSet)(this, _inner, new InternalBooleanMetricType(meta), "f");
    }
    set(value) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").set(value);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/counter.ts":
/*!*******************************************!*\
  !*** ./src/core/metrics/types/counter.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CounterMetric": () => (/* binding */ CounterMetric),
/* harmony export */   "InternalCounterMetricType": () => (/* binding */ InternalCounterMetricType),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
var _inner;







const LOG_TAG = "core.metrics.CounterMetricType";
class CounterMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.validatePositiveInteger)(v, false);
    }
    payload() {
        return this.inner;
    }
    saturatingAdd(amount) {
        const correctAmount = this.validateOrThrow(amount);
        this.inner = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.saturatingAdd)(this.inner, correctAmount);
    }
}
class InternalCounterMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_3__.MetricType {
    constructor(meta) {
        super("counter", meta, CounterMetric);
    }
    add(amount) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.isPlatformSync()) {
            this.addSync(amount);
        }
        else {
            this.addAsync(amount);
        }
    }
    transformFn(amount) {
        return (v) => {
            const metric = new CounterMetric(amount);
            if (v) {
                try {
                    metric.saturatingAdd(v);
                }
                catch (_a) {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(LOG_TAG, `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(v)}. Overwriting.`);
                }
            }
            return metric;
        };
    }
    addAsync(amount) {
        _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () { return this.addUndispatched(amount); }));
    }
    addUndispatched(amount) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
                return;
            }
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(amount)) {
                amount = 1;
            }
            try {
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.transform(this, this.transformFn(amount));
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        });
    }
    addSync(amount) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(amount)) {
            amount = 1;
        }
        try {
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.transform(this, this.transformFn(amount));
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldSet)(this, _inner, new InternalCounterMetricType(meta), "f");
    }
    add(amount) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").add(amount);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/custom_distribution.ts":
/*!*******************************************************!*\
  !*** ./src/core/metrics/types/custom_distribution.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CustomDistributionMetric": () => (/* binding */ CustomDistributionMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _histogram_histogram_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../histogram/histogram.js */ "./src/histogram/histogram.ts");
/* harmony import */ var _histogram_exponential_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../../histogram/exponential.js */ "./src/histogram/exponential.ts");
/* harmony import */ var _histogram_linear_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../../histogram/linear.js */ "./src/histogram/linear.ts");
/* harmony import */ var _distributions_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../distributions.js */ "./src/core/metrics/distributions.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
var _inner;










const LOG_TAG = "core.metrics.CustomDistributionMetricType";
class CustomDistributionMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    get customDistribution() {
        return this.inner;
    }
    validate(v) {
        const obj = v;
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isUndefined)(obj)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidType,
                errorMessage: `Expected valid CustomDistribution object, got ${JSON.stringify(obj)}`
            };
        }
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isUndefined)(obj.bucketCount) || obj.bucketCount < 0) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue,
                errorMessage: `Expected bucket count to be greater than 0, got ${obj.bucketCount}`
            };
        }
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isUndefined)(obj.rangeMin) || obj.rangeMin < 0) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue,
                errorMessage: `Expected histogram rangeMin to be greater than 0, got ${obj.rangeMin}`
            };
        }
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isUndefined)(obj.rangeMax) || obj.rangeMax < 0) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue,
                errorMessage: `Expected histogram rangeMax to be greater than 0, got ${obj.rangeMax}`
            };
        }
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isUndefined)(obj.histogramType) || !(obj.histogramType in _histogram_histogram_js__WEBPACK_IMPORTED_MODULE_3__.HistogramType)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue,
                errorMessage: `Expected histogram type to be either Linear or Exponential, got ${obj.histogramType}`
            };
        }
        return {
            type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success
        };
    }
    payload() {
        const { bucketCount, histogramType, rangeMax, rangeMin, values } = this.inner;
        const hist = constructHistogramByType(values, rangeMin, rangeMax, bucketCount, histogramType);
        return {
            sum: hist.sum,
            values: hist.values
        };
    }
}
class InternalCustomDistributionMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_4__.MetricType {
    constructor(meta, rangeMin, rangeMax, bucketCount, histogramType) {
        super("custom_distribution", meta, CustomDistributionMetric);
        this.rangeMin = rangeMin;
        this.rangeMax = rangeMax;
        this.bucketCount = bucketCount;
        this.histogramType = histogramType;
    }
    accumulateSamples(samples) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.setSync(samples);
        }
        else {
            this.setAsync(samples);
        }
    }
    transformFn(samples) {
        return (old) => {
            const values = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.extractAccumulatedValuesFromJsonValue)(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample >= 0) {
                    convertedSamples.push(sample);
                }
            });
            return new CustomDistributionMetric({
                values: [...values, ...convertedSamples],
                rangeMin: this.rangeMin,
                rangeMax: this.rangeMax,
                bucketCount: this.bucketCount,
                histogramType: this.histogramType
            });
        };
    }
    setAsync(samples) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                return;
            }
            try {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.transformFn(samples));
                const numNegativeSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumNegativeSamples)(samples);
                if (numNegativeSamples > 0) {
                    yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
                }
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    setSync(samples) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            return;
        }
        try {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.transformFn(samples));
            const numNegativeSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumNegativeSamples)(samples);
            if (numNegativeSamples > 0) {
                _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
            }
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let value;
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__awaiter)(this, void 0, void 0, function* () {
                    value = yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.getMetric(ping, this);
                }));
                if (value) {
                    const { bucketCount, histogramType, rangeMax, rangeMin, values } = value;
                    return (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.snapshot)(constructHistogramByType(values, rangeMin, rangeMax, bucketCount, histogramType));
                }
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta, rangeMin, rangeMax, bucketCount, histogramType) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__classPrivateFieldSet)(this, _inner, new InternalCustomDistributionMetricType(meta, rangeMin, rangeMax, bucketCount, histogramType), "f");
    }
    accumulateSamples(samples) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__classPrivateFieldGet)(this, _inner, "f").accumulateSamples(samples);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();
function constructHistogramByType(values, rangeMin, rangeMax, bucketCount, histogramType) {
    switch (histogramType) {
        case _histogram_histogram_js__WEBPACK_IMPORTED_MODULE_3__.HistogramType.exponential:
            return (0,_histogram_exponential_js__WEBPACK_IMPORTED_MODULE_8__.constructExponentialHistogramFromValues)(values, rangeMin, rangeMax, bucketCount);
        case _histogram_histogram_js__WEBPACK_IMPORTED_MODULE_3__.HistogramType.linear:
            return (0,_histogram_linear_js__WEBPACK_IMPORTED_MODULE_9__.constructLinearHistogramFromValues)(values, rangeMin, rangeMax, bucketCount);
    }
}


/***/ }),

/***/ "./src/core/metrics/types/datetime.ts":
/*!********************************************!*\
  !*** ./src/core/metrics/types/datetime.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DatetimeMetric": () => (/* binding */ DatetimeMetric),
/* harmony export */   "InternalDatetimeMetricType": () => (/* binding */ InternalDatetimeMetricType),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   "formatTimezoneOffset": () => (/* binding */ formatTimezoneOffset)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../metrics/time_unit.js */ "./src/core/metrics/time_unit.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
var _inner;







const LOG_TAG = "core.metrics.DatetimeMetricType";
function formatTimezoneOffset(timezone) {
    const offset = (timezone / 60) * -1;
    const sign = offset > 0 ? "+" : "-";
    const hours = Math.abs(offset).toString().padStart(2, "0");
    return `${sign}${hours}:00`;
}
class DatetimeMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    static fromDate(v, timeUnit) {
        if (!(v instanceof Date)) {
            throw new _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError(`Expected Date object, got ${JSON.stringify(v)}`);
        }
        return new DatetimeMetric({
            timeUnit,
            timezone: v.getTimezoneOffset(),
            date: v.toISOString()
        });
    }
    static fromRawDatetime(isoString, timezoneOffset, timeUnit) {
        return new DatetimeMetric({
            timeUnit,
            timezone: timezoneOffset,
            date: isoString
        });
    }
    get date() {
        return new Date(this.inner.date);
    }
    get timezone() {
        return this.inner.timezone;
    }
    get timeUnit() {
        return this.inner.timeUnit;
    }
    get dateISOString() {
        return this.inner.date;
    }
    validate(v) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isObject)(v) || Object.keys(v).length !== 3) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected Glean datetime metric object, got ${JSON.stringify(v)}`
            };
        }
        const timeUnitVerification = "timeUnit" in v &&
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isString)(v.timeUnit) &&
            Object.values(_metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"]).includes(v.timeUnit);
        const timezoneVerification = "timezone" in v && (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isNumber)(v.timezone);
        const dateVerification = "date" in v && (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isString)(v.date) && v.date.length === 24 && !isNaN(Date.parse(v.date));
        if (!timeUnitVerification || !timezoneVerification || !dateVerification) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Invalid property on datetime metric, got ${JSON.stringify(v)}`
            };
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        const extractedDateInfo = this.dateISOString.match(/\d+/g);
        if (!extractedDateInfo || extractedDateInfo.length < 0) {
            throw new Error("IMPOSSIBLE: Unable to extract date information from DatetimeMetric.");
        }
        const correctedDate = new Date(parseInt(extractedDateInfo[0]), parseInt(extractedDateInfo[1]) - 1, parseInt(extractedDateInfo[2]), parseInt(extractedDateInfo[3]) - this.timezone / 60, parseInt(extractedDateInfo[4]), parseInt(extractedDateInfo[5]), parseInt(extractedDateInfo[6]));
        const timezone = formatTimezoneOffset(this.timezone);
        const year = correctedDate.getFullYear().toString().padStart(2, "0");
        const month = (correctedDate.getMonth() + 1).toString().padStart(2, "0");
        const day = correctedDate.getDate().toString().padStart(2, "0");
        if (this.timeUnit === _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Day) {
            return `${year}-${month}-${day}${timezone}`;
        }
        const hours = correctedDate.getHours().toString().padStart(2, "0");
        if (this.timeUnit === _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Hour) {
            return `${year}-${month}-${day}T${hours}${timezone}`;
        }
        const minutes = correctedDate.getMinutes().toString().padStart(2, "0");
        if (this.timeUnit === _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Minute) {
            return `${year}-${month}-${day}T${hours}:${minutes}${timezone}`;
        }
        const seconds = correctedDate.getSeconds().toString().padStart(2, "0");
        if (this.timeUnit === _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Second) {
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
        }
        const milliseconds = correctedDate.getMilliseconds().toString().padStart(3, "0");
        if (this.timeUnit === _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Millisecond) {
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezone}`;
        }
        if (this.timeUnit === _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Microsecond) {
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000${timezone}`;
        }
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000000${timezone}`;
    }
}
class InternalDatetimeMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_3__.MetricType {
    constructor(meta, timeUnit) {
        super("datetime", meta, DatetimeMetric);
        this.timeUnit = timeUnit;
    }
    set(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    truncateDate(value) {
        if (!value) {
            value = new Date();
        }
        const truncatedDate = value;
        switch (this.timeUnit) {
            case _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Day:
                truncatedDate.setMilliseconds(0);
                truncatedDate.setSeconds(0);
                truncatedDate.setMinutes(0);
                truncatedDate.setMilliseconds(0);
            case _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Hour:
                truncatedDate.setMilliseconds(0);
                truncatedDate.setSeconds(0);
                truncatedDate.setMinutes(0);
            case _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Minute:
                truncatedDate.setMilliseconds(0);
                truncatedDate.setSeconds(0);
            case _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Second:
                truncatedDate.setMilliseconds(0);
            default:
                break;
        }
        return truncatedDate;
    }
    setAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.launch(() => this.setUndispatched(value));
    }
    setUndispatched(value) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
                return;
            }
            const truncatedDate = this.truncateDate(value);
            try {
                const metric = DatetimeMetric.fromDate(truncatedDate, this.timeUnit);
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        });
    }
    setSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        const truncatedDate = this.truncateDate(value);
        try {
            const metric = DatetimeMetric.fromDate(truncatedDate, this.timeUnit);
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    setSyncRaw(isoString, timezone, timeUnit) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        try {
            const metric = DatetimeMetric.fromRawDatetime(isoString, timezone, timeUnit);
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValueAsDatetimeMetric(ping, fn) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)(fn, LOG_TAG)) {
                let value;
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
                    value = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(ping, this);
                }));
                if (value) {
                    return new DatetimeMetric(value);
                }
            }
        });
    }
    testGetValueAsString(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            const metric = yield this.testGetValueAsDatetimeMetric(ping, "testGetValueAsString");
            return metric ? metric.payload() : undefined;
        });
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            const metric = yield this.testGetValueAsDatetimeMetric(ping, "testGetValue");
            return metric ? metric.date : undefined;
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta, timeUnit) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldSet)(this, _inner, new InternalDatetimeMetricType(meta, timeUnit), "f");
    }
    set(value) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").set(value);
    }
    testGetValueAsString(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").testGetValueAsString(ping);
        });
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/event.ts":
/*!*****************************************!*\
  !*** ./src/core/metrics/types/event.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InternalEventMetricType": () => (/* binding */ InternalEventMetricType),
/* harmony export */   "default": () => (/* binding */ EventMetricType)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _events_database_recorded_event_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../events_database/recorded_event.js */ "./src/core/metrics/events_database/recorded_event.ts");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
var _EventMetricType_inner;







const LOG_TAG = "core.metrics.EventMetricType";
const MAX_LENGTH_EXTRA_KEY_VALUE = 100;
class InternalEventMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_0__.MetricType {
    constructor(meta, allowedExtraKeys) {
        super("event", meta);
        this.allowedExtraKeys = allowedExtraKeys;
    }
    record(extra, timestamp = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.getMonotonicNow)()) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_2__.Context.isPlatformSync()) {
            this.recordSync(timestamp, extra);
        }
        else {
            this.recordAsync(timestamp, extra);
        }
    }
    recordAsync(timestamp, extra) {
        _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            yield this.recordUndispatched(extra, timestamp);
        }));
    }
    recordUndispatched(extra, timestamp = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.getMonotonicNow)()) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_2__.Context.uploadEnabled)) {
                return;
            }
            try {
                const metric = new _events_database_recorded_event_js__WEBPACK_IMPORTED_MODULE_4__.RecordedEvent({
                    category: this.category,
                    name: this.name,
                    timestamp,
                    extra
                });
                let truncatedExtra = undefined;
                if (extra && this.allowedExtraKeys) {
                    truncatedExtra = {};
                    for (const [name, value] of Object.entries(extra)) {
                        if (this.allowedExtraKeys.includes(name)) {
                            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isString)(value)) {
                                truncatedExtra[name] = yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.truncateStringAtBoundaryWithError)(this, value, MAX_LENGTH_EXTRA_KEY_VALUE);
                            }
                            else {
                                truncatedExtra[name] = value;
                            }
                        }
                        else {
                            yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__.ErrorType.InvalidValue, `Invalid key index: ${name}`);
                            continue;
                        }
                    }
                }
                metric.set(Object.assign(Object.assign({}, metric.get()), { extra: truncatedExtra }));
                return _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.eventsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_6__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        });
    }
    recordSync(timestamp, extra) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_2__.Context.uploadEnabled)) {
            return;
        }
        try {
            const metric = new _events_database_recorded_event_js__WEBPACK_IMPORTED_MODULE_4__.RecordedEvent({
                category: this.category,
                name: this.name,
                timestamp,
                extra
            });
            let truncatedExtra = undefined;
            if (extra && this.allowedExtraKeys) {
                truncatedExtra = {};
                for (const [name, value] of Object.entries(extra)) {
                    if (this.allowedExtraKeys.includes(name)) {
                        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isString)(value)) {
                            truncatedExtra[name] = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.truncateStringAtBoundaryWithErrorSync)(this, value, MAX_LENGTH_EXTRA_KEY_VALUE);
                        }
                        else {
                            truncatedExtra[name] = value;
                        }
                    }
                    else {
                        _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__.ErrorType.InvalidValue, `Invalid key index: ${name}`);
                        continue;
                    }
                }
            }
            metric.set(Object.assign(Object.assign({}, metric.get()), { extra: truncatedExtra }));
            _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.eventsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_6__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let events;
                yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
                    events = yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.eventsDatabase.getEvents(ping, this);
                }));
                return events;
            }
        });
    }
}
class EventMetricType {
    constructor(meta, allowedExtraKeys) {
        _EventMetricType_inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldSet)(this, _EventMetricType_inner, new InternalEventMetricType(meta, allowedExtraKeys), "f");
    }
    record(extra) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldGet)(this, _EventMetricType_inner, "f").record(extra);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldGet)(this, _EventMetricType_inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldGet)(this, _EventMetricType_inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldGet)(this, _EventMetricType_inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldGet)(this, _EventMetricType_inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
}
_EventMetricType_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/labeled.ts":
/*!*******************************************!*\
  !*** ./src/core/metrics/types/labeled.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LabeledMetric": () => (/* binding */ LabeledMetric),
/* harmony export */   "OTHER_LABEL": () => (/* binding */ OTHER_LABEL),
/* harmony export */   "combineIdentifierAndLabel": () => (/* binding */ combineIdentifierAndLabel),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   "getValidDynamicLabel": () => (/* binding */ getValidDynamicLabel),
/* harmony export */   "getValidDynamicLabelSync": () => (/* binding */ getValidDynamicLabelSync),
/* harmony export */   "stripLabel": () => (/* binding */ stripLabel)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");




class LabeledMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(_v) {
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        return this.inner;
    }
}
const MAX_LABELS = 16;
const MAX_LABEL_LENGTH = 61;
const OTHER_LABEL = "__other__";
const LABEL_REGEX = /^[a-z_][a-z0-9_-]{0,29}(\.[a-z_][a-z0-9_-]{0,29})*$/;
function combineIdentifierAndLabel(metricName, label) {
    return `${metricName}/${label}`;
}
function stripLabel(identifier) {
    return identifier.split("/")[0];
}
function getValidDynamicLabel(metric) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
        if (metric.dynamicLabel === undefined) {
            throw new Error("This point should never be reached.");
        }
        const key = combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);
        for (const ping of metric.sendInPings) {
            if (yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.metricsDatabase.hasMetric(metric.lifetime, ping, metric.type, key)) {
                return key;
            }
        }
        let numUsedKeys = 0;
        for (const ping of metric.sendInPings) {
            numUsedKeys += yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.metricsDatabase.countByBaseIdentifier(metric.lifetime, ping, metric.type, metric.baseIdentifier());
        }
        let hitError = false;
        if (numUsedKeys >= MAX_LABELS) {
            hitError = true;
        }
        else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
            hitError = true;
            yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(metric, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidLabel, `Label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}.`);
        }
        else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
            hitError = true;
            yield _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(metric, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidLabel, `Label must be snake_case, got '${metric.dynamicLabel}'.`);
        }
        return hitError ? combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL) : key;
    });
}
function getValidDynamicLabelSync(metric) {
    if (metric.dynamicLabel === undefined) {
        throw new Error("This point should never be reached.");
    }
    const key = combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);
    for (const ping of metric.sendInPings) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_2__.Context.metricsDatabase.hasMetric(metric.lifetime, ping, metric.type, key)) {
            return key;
        }
    }
    let numUsedKeys = 0;
    for (const ping of metric.sendInPings) {
        numUsedKeys += _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.metricsDatabase.countByBaseIdentifier(metric.lifetime, ping, metric.type, metric.baseIdentifier());
    }
    let hitError = false;
    if (numUsedKeys >= MAX_LABELS) {
        hitError = true;
    }
    else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
        hitError = true;
        _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(metric, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidLabel, `Label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}.`);
    }
    else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
        hitError = true;
        _context_js__WEBPACK_IMPORTED_MODULE_2__.Context.errorManager.record(metric, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidLabel, `Label must be snake_case, got '${metric.dynamicLabel}'.`);
    }
    return hitError ? combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL) : key;
}
class LabeledMetricType {
    constructor(meta, submetric, labels) {
        return new Proxy(this, {
            get: (_target, label) => {
                if (labels) {
                    return LabeledMetricType.createFromStaticLabel(meta, submetric, labels, label);
                }
                return LabeledMetricType.createFromDynamicLabel(meta, submetric, label);
            }
        });
    }
    static createFromStaticLabel(meta, submetricClass, allowedLabels, label) {
        const adjustedLabel = allowedLabels.includes(label) ? label : OTHER_LABEL;
        const newMeta = Object.assign(Object.assign({}, meta), { name: combineIdentifierAndLabel(meta.name, adjustedLabel) });
        return new submetricClass(newMeta);
    }
    static createFromDynamicLabel(meta, submetricClass, label) {
        const newMeta = Object.assign(Object.assign({}, meta), { dynamicLabel: label });
        return new submetricClass(newMeta);
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (LabeledMetricType);


/***/ }),

/***/ "./src/core/metrics/types/memory_distribution.ts":
/*!*******************************************************!*\
  !*** ./src/core/metrics/types/memory_distribution.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MemoryDistributionMetric": () => (/* binding */ MemoryDistributionMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _histogram_functional_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../histogram/functional.js */ "./src/histogram/functional.ts");
/* harmony import */ var _distributions_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../distributions.js */ "./src/core/metrics/distributions.ts");
/* harmony import */ var _memory_unit_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../memory_unit.js */ "./src/core/metrics/memory_unit.ts");
var _inner;









const LOG_TAG = "core.metrics.MemoryDistributionMetricType";
const LOG_BASE = 2.0;
const BUCKETS_PER_MAGNITUDE = 16.0;
const MAX_BYTES = 2 ** 40;
class MemoryDistributionMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    get memoryDistribution() {
        return this.inner;
    }
    validate(v) {
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isUndefined)(v) || !Array.isArray(v)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidType,
                errorMessage: `Expected valid MemoryDistribution object, got ${JSON.stringify(v)}`
            };
        }
        const negativeSample = v.find((key) => key < 0);
        if (negativeSample) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue,
                errorMessage: `Expected all samples to be greater than 0, got ${negativeSample}`
            };
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        const hist = (0,_histogram_functional_js__WEBPACK_IMPORTED_MODULE_3__.constructFunctionalHistogramFromValues)(this.inner, LOG_BASE, BUCKETS_PER_MAGNITUDE);
        return {
            values: hist.values,
            sum: hist.sum
        };
    }
}
class InternalMemoryDistributionMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_4__.MetricType {
    constructor(meta, memoryUnit) {
        super("memory_distribution", meta, MemoryDistributionMetric);
        this.memoryUnit = memoryUnit;
    }
    accumulate(sample) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.accumulateSync(sample);
        }
        else {
            this.accumulateAsync(sample);
        }
    }
    accumulateTransformFn(sample) {
        return (old) => {
            const values = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.extractAccumulatedValuesFromJsonValue)(old);
            return new MemoryDistributionMetric([...values, sample]);
        };
    }
    accumulateSamples(samples) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.accumulateSamplesSync(samples);
        }
        else {
            this.accumulateSamplesAsync(samples);
        }
    }
    accumulateSamplesTransformFn(samples) {
        return (old) => {
            const values = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.extractAccumulatedValuesFromJsonValue)(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample >= 0) {
                    sample = (0,_memory_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertMemoryUnitToBytes)(sample, this.memoryUnit);
                    if (sample > MAX_BYTES) {
                        sample = MAX_BYTES;
                    }
                    convertedSamples.push(sample);
                }
            });
            return new MemoryDistributionMetric([...values, ...convertedSamples]);
        };
    }
    accumulateAsync(sample) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                return;
            }
            if (sample < 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, "Accumulated a negative sample");
                return;
            }
            let convertedSample = (0,_memory_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertMemoryUnitToBytes)(sample, this.memoryUnit);
            if (sample > MAX_BYTES) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, "Sample is bigger than 1 terabyte.");
                convertedSample = MAX_BYTES;
            }
            try {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.accumulateTransformFn(convertedSample));
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    accumulateSamplesAsync(samples) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                return;
            }
            yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.accumulateSamplesTransformFn(samples));
            const numNegativeSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumNegativeSamples)(samples);
            if (numNegativeSamples > 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
            }
            const numTooLongSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumTooLongSamples)(samples, MAX_BYTES);
            if (numTooLongSamples > 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numTooLongSamples} larger than 1TB`, numTooLongSamples);
            }
        }));
    }
    accumulateSync(sample) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            return;
        }
        if (sample < 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, "Accumulated a negative sample");
            return;
        }
        let convertedSample = (0,_memory_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertMemoryUnitToBytes)(sample, this.memoryUnit);
        if (sample > MAX_BYTES) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, "Sample is bigger than 1 terabyte.");
            convertedSample = MAX_BYTES;
        }
        try {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.accumulateTransformFn(convertedSample));
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    accumulateSamplesSync(samples) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            return;
        }
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.accumulateSamplesTransformFn(samples));
        const numNegativeSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumNegativeSamples)(samples);
        if (numNegativeSamples > 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
        }
        const numTooLongSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumTooLongSamples)(samples, MAX_BYTES);
        if (numTooLongSamples > 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numTooLongSamples} larger than 1TB`, numTooLongSamples);
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let value;
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
                    value = yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.getMetric(ping, this);
                }));
                if (value) {
                    return (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.snapshot)((0,_histogram_functional_js__WEBPACK_IMPORTED_MODULE_3__.constructFunctionalHistogramFromValues)(value, LOG_BASE, BUCKETS_PER_MAGNITUDE));
                }
            }
        });
    }
    testGetNumRecordedErrors(errorType, ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetNumRecordedErrors")) {
                return _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.testGetNumRecordedErrors(this, errorType, ping);
            }
            return 0;
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta, memoryUnit) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldSet)(this, _inner, new InternalMemoryDistributionMetricType(meta, memoryUnit), "f");
    }
    accumulate(sample) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").accumulate(sample);
    }
    accumulateSamples(samples) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").accumulateSamples(samples);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/quantity.ts":
/*!********************************************!*\
  !*** ./src/core/metrics/types/quantity.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "QuantityMetric": () => (/* binding */ QuantityMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
var _inner;







const LOG_TAG = "core.metrics.QuantityMetricType";
class QuantityMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.validatePositiveInteger)(v);
    }
    payload() {
        return this.inner;
    }
}
class InternalQuantityMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_2__.MetricType {
    constructor(meta) {
        super("quantity", meta, QuantityMetric);
    }
    set(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    setAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.launch(() => this.setUndispatched(value));
    }
    setUndispatched(value) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
                return;
            }
            if (value < 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__.ErrorType.InvalidValue, `Set negative value ${value}`);
                return;
            }
            if (value > Number.MAX_SAFE_INTEGER) {
                value = Number.MAX_SAFE_INTEGER;
            }
            try {
                const metric = new QuantityMetric(value);
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        });
    }
    setSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
            return;
        }
        if (value < 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__.ErrorType.InvalidValue, `Set negative value ${value}`);
            return;
        }
        if (value > Number.MAX_SAFE_INTEGER) {
            value = Number.MAX_SAFE_INTEGER;
        }
        try {
            const metric = new QuantityMetric(value);
            _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_6__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldSet)(this, _inner, new InternalQuantityMetricType(meta), "f");
    }
    set(value) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").set(value);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/rate.ts":
/*!****************************************!*\
  !*** ./src/core/metrics/types/rate.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "RateMetric": () => (/* binding */ RateMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
var _inner;







const LOG_TAG = "core.metrics.RateMetricType";
class RateMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    get numerator() {
        return this.inner.numerator;
    }
    get denominator() {
        return this.inner.denominator;
    }
    validate(v) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isObject)(v) || Object.keys(v).length !== 2) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected Glean rate metric object, got ${JSON.stringify(v)}`
            };
        }
        const numeratorVerification = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.validatePositiveInteger)(v.numerator);
        if (numeratorVerification.type === _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error) {
            return numeratorVerification;
        }
        const denominatorVerification = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.validatePositiveInteger)(v.denominator);
        if (denominatorVerification.type === _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error) {
            return denominatorVerification;
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        return this.inner;
    }
}
class InternalRateMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_3__.MetricType {
    constructor(meta) {
        super("rate", meta, RateMetric);
    }
    addToNumerator(amount) {
        this.add({
            denominator: 0,
            numerator: amount
        });
    }
    addToDenominator(amount) {
        this.add({
            numerator: 0,
            denominator: amount
        });
    }
    add(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.isPlatformSync()) {
            this.addSync(value);
        }
        else {
            this.addAsync(value);
        }
    }
    transformFn(value) {
        return (v) => {
            const metric = new RateMetric(value);
            if (v) {
                try {
                    const persistedMetric = new RateMetric(v);
                    metric.set({
                        numerator: (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.saturatingAdd)(metric.numerator, persistedMetric.numerator),
                        denominator: (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.saturatingAdd)(metric.denominator, persistedMetric.denominator)
                    });
                }
                catch (_a) {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(LOG_TAG, `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(v)}. Overwriting.`);
                }
            }
            return metric;
        };
    }
    addAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
                return;
            }
            try {
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.transform(this, this.transformFn(value));
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    addSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        try {
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.transform(this, this.transformFn(value));
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldSet)(this, _inner, new InternalRateMetricType(meta), "f");
    }
    addToNumerator(amount) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").addToNumerator(amount);
    }
    addToDenominator(amount) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").addToDenominator(amount);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/string.ts":
/*!******************************************!*\
  !*** ./src/core/metrics/types/string.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InternalStringMetricType": () => (/* binding */ InternalStringMetricType),
/* harmony export */   "MAX_LENGTH_VALUE": () => (/* binding */ MAX_LENGTH_VALUE),
/* harmony export */   "StringMetric": () => (/* binding */ StringMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
var _inner;






const LOG_TAG = "core.metrics.StringMetricType";
const MAX_LENGTH_VALUE = 100;
class StringMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.validateString)(v);
    }
    payload() {
        return this.inner;
    }
}
class InternalStringMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_2__.MetricType {
    constructor(meta) {
        super("string", meta, StringMetric);
    }
    set(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    setAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.launch(() => this.setUndispatched(value));
    }
    setUndispatched(value) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
                return;
            }
            try {
                const truncatedValue = yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.truncateStringAtBoundaryWithError)(this, value, MAX_LENGTH_VALUE);
                const metric = new StringMetric(truncatedValue);
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        });
    }
    setSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
            return;
        }
        try {
            const truncatedValue = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.truncateStringAtBoundaryWithErrorSync)(this, value, MAX_LENGTH_VALUE);
            const metric = new StringMetric(truncatedValue);
            _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldSet)(this, _inner, new InternalStringMetricType(meta), "f");
    }
    set(value) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").set(value);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/string_list.ts":
/*!***********************************************!*\
  !*** ./src/core/metrics/types/string_list.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MAX_LIST_LENGTH": () => (/* binding */ MAX_LIST_LENGTH),
/* harmony export */   "MAX_STRING_LENGTH": () => (/* binding */ MAX_STRING_LENGTH),
/* harmony export */   "StringListMetric": () => (/* binding */ StringListMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
var _inner;








const LOG_TAG = "core.metrics.StringListMetricType";
const MAX_LIST_LENGTH = 20;
const MAX_STRING_LENGTH = 50;
class StringListMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        if (!Array.isArray(v)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected array, got ${JSON.stringify(v)}`
            };
        }
        for (const s of v) {
            const validation = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.validateString)(s);
            if (validation.type === _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error) {
                return validation;
            }
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    concat(list) {
        const correctedList = this.validateOrThrow(list);
        const result = [...this.inner, ...correctedList];
        if (result.length > MAX_LIST_LENGTH) {
            throw new _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError(`String list length of ${result.length} would exceed maximum of ${MAX_LIST_LENGTH}.`, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue);
        }
        this.inner = result;
    }
    payload() {
        return this.inner;
    }
}
class InternalStringListMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_3__.MetricType {
    constructor(meta) {
        super("string_list", meta, StringListMetric);
    }
    set(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    add(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.isPlatformSync()) {
            this.addSync(value);
        }
        else {
            this.addAsync(value);
        }
    }
    addTransformFn(value) {
        return (v) => {
            const metric = new StringListMetric([value]);
            try {
                v && metric.concat(v);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError && e.type !== _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidType) {
                    throw e;
                }
                else {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(LOG_TAG, `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(v)}. Overwriting.`);
                }
            }
            return metric;
        };
    }
    setAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
                return;
            }
            try {
                if (value.length > MAX_LIST_LENGTH) {
                    yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `String list length of ${value.length} exceeds maximum of ${MAX_LIST_LENGTH}.`);
                }
                const metric = new StringListMetric(value);
                const truncatedList = [];
                for (let i = 0; i < Math.min(value.length, MAX_LIST_LENGTH); ++i) {
                    const truncatedString = yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_7__.truncateStringAtBoundaryWithError)(this, value[i], MAX_STRING_LENGTH);
                    truncatedList.push(truncatedString);
                }
                metric.set(truncatedList);
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    addAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
                return;
            }
            try {
                const truncatedValue = yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_7__.truncateStringAtBoundaryWithError)(this, value, MAX_STRING_LENGTH);
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.transform(this, this.addTransformFn(truncatedValue));
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    setSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        try {
            if (value.length > MAX_LIST_LENGTH) {
                _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `String list length of ${value.length} exceeds maximum of ${MAX_LIST_LENGTH}.`);
            }
            const metric = new StringListMetric(value);
            const truncatedList = [];
            for (let i = 0; i < Math.min(value.length, MAX_LIST_LENGTH); ++i) {
                const truncatedString = (0,_utils_js__WEBPACK_IMPORTED_MODULE_7__.truncateStringAtBoundaryWithErrorSync)(this, value[i], MAX_STRING_LENGTH);
                truncatedList.push(truncatedString);
            }
            metric.set(truncatedList);
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    addSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        try {
            const truncatedValue = (0,_utils_js__WEBPACK_IMPORTED_MODULE_7__.truncateStringAtBoundaryWithErrorSync)(this, value, MAX_STRING_LENGTH);
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.transform(this, this.addTransformFn(truncatedValue));
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_7__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldSet)(this, _inner, new InternalStringListMetricType(meta), "f");
    }
    set(value) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").set(value);
    }
    add(value) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").add(value);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/text.ts":
/*!****************************************!*\
  !*** ./src/core/metrics/types/text.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TEXT_MAX_LENGTH": () => (/* binding */ TEXT_MAX_LENGTH),
/* harmony export */   "TextMetric": () => (/* binding */ TextMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
var _inner;







const LOG_TAG = "core.metrics.TextMetricType";
const TEXT_MAX_LENGTH = 200 * 1024;
class TextMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.validateString)(v);
    }
    payload() {
        return this.inner;
    }
}
class InternalTextMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_2__.MetricType {
    constructor(meta) {
        super("text", meta, TextMetric);
    }
    set(text) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.isPlatformSync()) {
            this.setSync(text);
        }
        else {
            this.setAsync(text);
        }
    }
    setAsync(text) {
        _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
                return;
            }
            try {
                const truncatedValue = yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.truncateStringAtBoundaryWithError)(this, text, TEXT_MAX_LENGTH);
                const metric = new TextMetric(truncatedValue);
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    setSync(text) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.uploadEnabled)) {
            return;
        }
        try {
            const truncatedValue = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.truncateStringAtBoundaryWithErrorSync)(this, text, TEXT_MAX_LENGTH);
            const metric = new TextMetric(truncatedValue);
            _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldSet)(this, _inner, new InternalTextMetricType(meta), "f");
    }
    set(text) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").set(text);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/timespan.ts":
/*!********************************************!*\
  !*** ./src/core/metrics/types/timespan.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InternalTimespanMetricType": () => (/* binding */ InternalTimespanMetricType),
/* harmony export */   "TimespanMetric": () => (/* binding */ TimespanMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _time_unit_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../time_unit.js */ "./src/core/metrics/time_unit.ts");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
var _inner;









const LOG_TAG = "core.metrics.TimespanMetricType";
class TimespanMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    get timespan() {
        switch (this.inner.timeUnit) {
            case _time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"].Nanosecond:
                return this.inner.timespan * 10 ** 6;
            case _time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"].Microsecond:
                return this.inner.timespan * 10 ** 3;
            case _time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"].Millisecond:
                return this.inner.timespan;
            case _time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"].Second:
                return Math.round(this.inner.timespan / 1000);
            case _time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"].Minute:
                return Math.round(this.inner.timespan / 1000 / 60);
            case _time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"].Hour:
                return Math.round(this.inner.timespan / 1000 / 60 / 60);
            case _time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"].Day:
                return Math.round(this.inner.timespan / 1000 / 60 / 60 / 24);
        }
    }
    validateTimespan(v) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isInteger)(v)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected integer value, got ${JSON.stringify(v)}`
            };
        }
        if (v < 0) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected positive value, got ${JSON.stringify(v)}`,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidValue
            };
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    validate(v) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(v) || Object.keys(v).length !== 2 || !("timespan" in v) || !("timeUnit" in v)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected timespan object, got ${JSON.stringify(v)}`
            };
        }
        const timespanVerification = this.validateTimespan(v.timespan);
        if (timespanVerification.type === _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error) {
            return timespanVerification;
        }
        const timeUnitVerification = "timeUnit" in v &&
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isString)(v.timeUnit) &&
            Object.values(_time_unit_js__WEBPACK_IMPORTED_MODULE_1__["default"]).includes(v.timeUnit);
        if (!timeUnitVerification) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `Expected valid timeUnit for timespan, got ${JSON.stringify(v)}`
            };
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        return {
            time_unit: this.inner.timeUnit,
            value: this.timespan
        };
    }
}
class InternalTimespanMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_4__.MetricType {
    constructor(meta, timeUnit) {
        super("timespan", meta, TimespanMetric);
        this.timeUnit = timeUnit;
    }
    start() {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.startSync();
        }
        else {
            this.startAsync();
        }
    }
    stop() {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.stopSync();
        }
        else {
            this.stopAsync();
        }
    }
    cancel() {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.cancelSync();
        }
        else {
            this.cancelAsync();
        }
    }
    setRawNanos(elapsed) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.setRawNanosSync(elapsed);
        }
        else {
            this.setRawNanosAsync(elapsed);
        }
    }
    startAsync() {
        const startTime = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getMonotonicNow)();
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                return;
            }
            if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.startTime)) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan already started");
                return;
            }
            this.startTime = startTime;
            return Promise.resolve();
        }));
    }
    stopAsync() {
        const stopTime = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getMonotonicNow)();
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                this.startTime = undefined;
                return;
            }
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.startTime)) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan not running.");
                return;
            }
            const elapsed = stopTime - this.startTime;
            this.startTime = undefined;
            if (elapsed < 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan was negative.");
                return;
            }
            yield this.setRawUndispatched(elapsed);
        }));
    }
    cancelAsync() {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => {
            this.startTime = undefined;
            return Promise.resolve();
        });
    }
    setRawNanosAsync(elapsed) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            const elapsedMillis = elapsed * 10 ** -6;
            yield this.setRawUndispatched(elapsedMillis);
        }));
    }
    setRawUndispatched(elapsed) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            yield this.setRawAsync(elapsed);
        });
    }
    setRawAsync(elapsed) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                return;
            }
            if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.startTime)) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan already running. Raw value not recorded.");
                return;
            }
            let reportValueExists = false;
            try {
                const transformFn = ((elapsed) => {
                    return (old) => {
                        let metric;
                        try {
                            metric = new TimespanMetric(old);
                            reportValueExists = true;
                        }
                        catch (_a) {
                            metric = new TimespanMetric({
                                timespan: elapsed,
                                timeUnit: this.timeUnit
                            });
                        }
                        return metric;
                    };
                })(elapsed);
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, transformFn);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
            if (reportValueExists) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan value already recorded. New value discarded.");
            }
        });
    }
    startSync() {
        const startTime = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getMonotonicNow)();
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            return;
        }
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.startTime)) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan already started");
            return;
        }
        this.startTime = startTime;
    }
    stopSync() {
        const stopTime = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getMonotonicNow)();
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            this.startTime = undefined;
            return;
        }
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.startTime)) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan not running.");
            return;
        }
        const elapsed = stopTime - this.startTime;
        this.startTime = undefined;
        if (elapsed < 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan was negative.");
            return;
        }
        this.setRawSync(elapsed);
    }
    cancelSync() {
        this.startTime = undefined;
    }
    setRawNanosSync(elapsed) {
        const elapsedMillis = elapsed * 10 ** -6;
        this.setRawSync(elapsedMillis);
    }
    setRawSync(elapsed) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            return;
        }
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isUndefined)(this.startTime)) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan already running. Raw value not recorded.");
            return;
        }
        let reportValueExists = false;
        try {
            const transformFn = ((elapsed) => {
                return (old) => {
                    let metric;
                    try {
                        metric = new TimespanMetric(old);
                        reportValueExists = true;
                    }
                    catch (_a) {
                        metric = new TimespanMetric({
                            timespan: elapsed,
                            timeUnit: this.timeUnit
                        });
                    }
                    return metric;
                };
            })(elapsed);
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, transformFn);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
        if (reportValueExists) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_3__.ErrorType.InvalidState, "Timespan value already recorded. New value discarded.");
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let value;
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
                    value = yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.getMetric(ping, this);
                }));
                if (value) {
                    return new TimespanMetric(value).timespan;
                }
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta, timeUnit) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldSet)(this, _inner, new InternalTimespanMetricType(meta, timeUnit), "f");
    }
    start() {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").start();
    }
    stop() {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").stop();
    }
    cancel() {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").cancel();
    }
    setRawNanos(elapsed) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").setRawNanos(elapsed);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/timing_distribution.ts":
/*!*******************************************************!*\
  !*** ./src/core/metrics/types/timing_distribution.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TimingDistributionMetric": () => (/* binding */ TimingDistributionMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _histogram_functional_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../histogram/functional.js */ "./src/histogram/functional.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _time_unit_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../time_unit.js */ "./src/core/metrics/time_unit.ts");
/* harmony import */ var _distributions_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../distributions.js */ "./src/core/metrics/distributions.ts");
var _inner;










const LOG_TAG = "core.metrics.TimingDistributionMetricType";
const LOG_BASE = 2.0;
const BUCKETS_PER_MAGNITUDE = 8.0;
const MAX_SAMPLE_TIME = 1000 * 1000 * 1000 * 60 * 10;
class TimingDistributionMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    get timingDistribution() {
        return this.inner;
    }
    validate(v) {
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isUndefined)(v) || !Array.isArray(v)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidType,
                errorMessage: `Expected valid TimingDistribution object, got ${JSON.stringify(v)}`
            };
        }
        const negativeDuration = v.find((key) => key < 0);
        if (negativeDuration) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue,
                errorMessage: `Expected all durations to be greater than 0, got ${negativeDuration}`
            };
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        const hist = (0,_histogram_functional_js__WEBPACK_IMPORTED_MODULE_3__.constructFunctionalHistogramFromValues)(this.inner, LOG_BASE, BUCKETS_PER_MAGNITUDE);
        return {
            values: hist.values,
            sum: hist.sum
        };
    }
}
class InternalTimingDistributionMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_4__.MetricType {
    constructor(meta, timeUnit) {
        super("timing_distribution", meta, TimingDistributionMetric);
        this.timeUnit = timeUnit;
        this.startTimes = {};
        this.timerId = 0;
    }
    getNextTimerId() {
        this.timerId++;
        return this.timerId;
    }
    start() {
        const startTime = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.getCurrentTimeInNanoSeconds)();
        const id = this.getNextTimerId();
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.setStartSync(id, startTime);
        }
        else {
            this.setStart(id, startTime);
        }
        return id;
    }
    setStart(id, startTime) {
        this.setStartAsync(id, startTime);
    }
    stopAndAccumulate(id) {
        const stopTime = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.getCurrentTimeInNanoSeconds)();
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.setStopAndAccumulateSync(id, stopTime);
        }
        else {
            this.setStopAndAccumulate(id, stopTime);
        }
    }
    setStopAndAccumulate(id, stopTime) {
        this.setStopAndAccumulateAsync(id, stopTime);
    }
    cancel(id) {
        delete this.startTimes[id];
    }
    accumulateSamples(samples) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.setAccumulateSamplesSync(samples);
        }
        else {
            this.setAccumulateSamples(samples);
        }
    }
    setAccumulateSamples(samples) {
        this.setAccumulateSamplesAsync(samples);
    }
    accumulateRawSamplesNanos(samples) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.isPlatformSync()) {
            this.accumulateRawSamplesNanosSync(samples);
        }
        else {
            this.accumulateRawSamplesNanosAsync(samples);
        }
    }
    setStopAndAccumulateTransformFn(duration) {
        return (old) => {
            const values = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.extractAccumulatedValuesFromJsonValue)(old);
            return new TimingDistributionMetric([...values, duration]);
        };
    }
    setAccumulateSamplesTransformFn(samples, maxSampleTime) {
        return (old) => {
            const values = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.extractAccumulatedValuesFromJsonValue)(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample >= 0) {
                    if (sample === 0) {
                        sample = 1;
                    }
                    else if (sample > maxSampleTime) {
                        sample = maxSampleTime;
                    }
                    sample = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(sample, this.timeUnit);
                    convertedSamples.push(sample);
                }
            });
            return new TimingDistributionMetric([...values, ...convertedSamples]);
        };
    }
    accumulateRawSamplesNanosTransformFn(samples, maxSampleTime) {
        const minSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(1, this.timeUnit);
        return (old) => {
            const values = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.extractAccumulatedValuesFromJsonValue)(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample < minSampleTime) {
                    sample = minSampleTime;
                }
                else if (sample > maxSampleTime) {
                    sample = maxSampleTime;
                }
                convertedSamples.push(sample);
            });
            return new TimingDistributionMetric([...values, ...convertedSamples]);
        };
    }
    setStartAsync(id, startTime) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            this.startTimes[id] = startTime;
            return Promise.resolve();
        }));
    }
    setStopAndAccumulateAsync(id, stopTime) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                delete this.startTimes[id];
                return;
            }
            const startTime = this.startTimes[id];
            if (startTime !== undefined) {
                delete this.startTimes[id];
            }
            else {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidState, "Timing not running");
                return;
            }
            let duration = stopTime - startTime;
            if (duration < 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, "Timer stopped with negative duration");
                return;
            }
            const minSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(1, this.timeUnit);
            const maxSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(MAX_SAMPLE_TIME, this.timeUnit);
            if (duration < minSampleTime) {
                duration = minSampleTime;
            }
            else if (duration > maxSampleTime) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidState, `Sample is longer than the max for a timeUnit of ${this.timeUnit} (${duration} ns)`);
                duration = maxSampleTime;
            }
            try {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.setStopAndAccumulateTransformFn(duration));
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
            return Promise.resolve();
        }));
    }
    setAccumulateSamplesAsync(samples) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                return;
            }
            const maxSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(MAX_SAMPLE_TIME, this.timeUnit);
            yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.setAccumulateSamplesTransformFn(samples, maxSampleTime));
            const numNegativeSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumNegativeSamples)(samples);
            if (numNegativeSamples > 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
            }
            const numTooLongSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumTooLongSamples)(samples, maxSampleTime);
            if (numTooLongSamples > 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
            }
        }));
    }
    accumulateRawSamplesNanosAsync(samples) {
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
                return;
            }
            const maxSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(MAX_SAMPLE_TIME, this.timeUnit);
            yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.accumulateRawSamplesNanosTransformFn(samples, maxSampleTime));
            const numTooLongSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumTooLongSamples)(samples, maxSampleTime);
            if (numTooLongSamples > 0) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
            }
        }));
    }
    setStartSync(id, startTime) {
        this.startTimes[id] = startTime;
    }
    setStopAndAccumulateSync(id, stopTime) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            delete this.startTimes[id];
            return;
        }
        const startTime = this.startTimes[id];
        if (startTime !== undefined) {
            delete this.startTimes[id];
        }
        else {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidState, "Timing not running");
            return;
        }
        let duration = stopTime - startTime;
        if (duration < 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, "Timer stopped with negative duration");
            return;
        }
        const minSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(1, this.timeUnit);
        const maxSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(MAX_SAMPLE_TIME, this.timeUnit);
        if (duration < minSampleTime) {
            duration = minSampleTime;
        }
        else if (duration > maxSampleTime) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidState, `Sample is longer than the max for a timeUnit of ${this.timeUnit} (${duration} ns)`);
            duration = maxSampleTime;
        }
        try {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.setStopAndAccumulateTransformFn(duration));
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    setAccumulateSamplesSync(samples) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            return;
        }
        const maxSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(MAX_SAMPLE_TIME, this.timeUnit);
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.setAccumulateSamplesTransformFn(samples, maxSampleTime));
        const numNegativeSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumNegativeSamples)(samples);
        if (numNegativeSamples > 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
        }
        const numTooLongSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumTooLongSamples)(samples, maxSampleTime);
        if (numTooLongSamples > 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
        }
    }
    accumulateRawSamplesNanosSync(samples) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_5__.Context.uploadEnabled)) {
            return;
        }
        const maxSampleTime = (0,_time_unit_js__WEBPACK_IMPORTED_MODULE_7__.convertTimeUnitToNanos)(MAX_SAMPLE_TIME, this.timeUnit);
        _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.transform(this, this.accumulateRawSamplesNanosTransformFn(samples, maxSampleTime));
        const numTooLongSamples = (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.getNumTooLongSamples)(samples, maxSampleTime);
        if (numTooLongSamples > 0) {
            _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.record(this, _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let value;
                yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
                    value = yield _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.metricsDatabase.getMetric(ping, this);
                }));
                if (value) {
                    return (0,_distributions_js__WEBPACK_IMPORTED_MODULE_6__.snapshot)((0,_histogram_functional_js__WEBPACK_IMPORTED_MODULE_3__.constructFunctionalHistogramFromValues)(value, LOG_BASE, BUCKETS_PER_MAGNITUDE));
                }
            }
        });
    }
    testGetNumRecordedErrors(errorType, ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testOnlyCheck)("testGetNumRecordedErrors")) {
                return _context_js__WEBPACK_IMPORTED_MODULE_5__.Context.errorManager.testGetNumRecordedErrors(this, errorType, ping);
            }
            return 0;
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta, timeUnit) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldSet)(this, _inner, new InternalTimingDistributionMetricType(meta, timeUnit), "f");
    }
    start() {
        const id = (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").start();
        return id;
    }
    setStart(id, startTime) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").setStart(id, startTime);
    }
    stopAndAccumulate(id) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").stopAndAccumulate(id);
    }
    setStopAndAccumulate(id, stopTime) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").setStopAndAccumulate(id, stopTime);
    }
    accumulateRawSamplesNanos(samples) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").accumulateRawSamplesNanos(samples);
    }
    accumulateSamples(samples) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").accumulateSamples(samples);
    }
    setAccumulateSamples(samples) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").setAccumulateSamples(samples);
    }
    cancel(id) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").cancel(id);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_8__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/url.ts":
/*!***************************************!*\
  !*** ./src/core/metrics/types/url.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "UrlMetric": () => (/* binding */ UrlMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
var _inner;







const LOG_TAG = "core.metrics.URLMetricType";
const URL_MAX_LENGTH = 8192;
const URL_VALIDATION_REGEX = /^[a-zA-Z][a-zA-Z0-9-\+\.]*:(.*)$/;
class UrlMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        const validation = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.validateString)(v);
        if (validation.type === _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error) {
            return validation;
        }
        const str = v;
        if (str.startsWith("data:")) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: "URL metric does not support data URLs",
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue
            };
        }
        if (!URL_VALIDATION_REGEX.test(str)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `"${str}" does not start with a valid URL scheme`,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue
            };
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        return this.inner;
    }
}
class InternalUrlMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_3__.MetricType {
    constructor(meta) {
        super("url", meta, UrlMetric);
    }
    setUrl(url) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.isPlatformSync()) {
            this.setSync(url.toString());
        }
        else {
            this.setAsync(url.toString());
        }
    }
    setAsync(url) {
        this.set(url);
    }
    set(url) {
        _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
                return;
            }
            let formattedUrl;
            if (url.length > URL_MAX_LENGTH) {
                formattedUrl = yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_6__.truncateStringAtBoundaryWithError)(this, url, URL_MAX_LENGTH);
            }
            else {
                formattedUrl = url;
            }
            try {
                const metric = new UrlMetric(formattedUrl);
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        }));
    }
    setSync(url) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        let formattedUrl;
        if (url.length > URL_MAX_LENGTH) {
            formattedUrl = (0,_utils_js__WEBPACK_IMPORTED_MODULE_6__.truncateStringAtBoundaryWithErrorSync)(this, url, URL_MAX_LENGTH);
        }
        else {
            formattedUrl = url;
        }
        try {
            const metric = new UrlMetric(formattedUrl);
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_6__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldSet)(this, _inner, new InternalUrlMetricType(meta), "f");
    }
    set(url) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").set(url);
    }
    setUrl(url) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").setUrl(url);
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/types/uuid.ts":
/*!****************************************!*\
  !*** ./src/core/metrics/types/uuid.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InternalUUIDMetricType": () => (/* binding */ InternalUUIDMetricType),
/* harmony export */   "UUIDMetric": () => (/* binding */ UUIDMetric),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../index.js */ "./src/core/metrics/index.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/core/metrics/utils.ts");
var _inner;







const LOG_TAG = "core.metrics.UUIDMetricType";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class UUIDMetric extends _metric_js__WEBPACK_IMPORTED_MODULE_0__.Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        const validation = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.validateString)(v);
        if (validation.type === _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error) {
            return validation;
        }
        const str = v;
        if (!UUID_REGEX.test(str)) {
            return {
                type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Error,
                errorMessage: `"${str}" is not a valid UUID`,
                errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType.InvalidValue
            };
        }
        return { type: _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidation.Success };
    }
    payload() {
        return this.inner;
    }
}
class InternalUUIDMetricType extends _index_js__WEBPACK_IMPORTED_MODULE_3__.MetricType {
    constructor(meta) {
        super("uuid", meta, UUIDMetric);
    }
    set(value) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    generateAndSet() {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        const value = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.generateUUIDv4)();
        this.set(value);
        return value;
    }
    setAsync(value) {
        _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.launch(() => this.setUndispatched(value));
    }
    setUndispatched(value) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
                return;
            }
            if (!value) {
                value = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.generateUUIDv4)();
            }
            let metric;
            try {
                metric = new UUIDMetric(value);
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                    yield e.recordError(this);
                }
            }
        });
    }
    setSync(value) {
        if (!this.shouldRecord(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.uploadEnabled)) {
            return;
        }
        if (!value) {
            value = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.generateUUIDv4)();
        }
        let metric;
        try {
            metric = new UUIDMetric(value);
            _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof _metric_js__WEBPACK_IMPORTED_MODULE_0__.MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    testGetValue(ping = this.sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.testOnlyCheck)("testGetValue", LOG_TAG)) {
                let metric;
                yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.dispatcher.testLaunch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
                    metric = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(ping, this);
                }));
                return metric;
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldSet)(this, _inner, new InternalUUIDMetricType(meta), "f");
    }
    set(value) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").set(value);
    }
    generateAndSet() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").generateAndSet();
    }
    testGetValue(ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetValue(ping);
        });
    }
    testGetNumRecordedErrors(errorType, ping = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").sendInPings[0]) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__classPrivateFieldGet)(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/metrics/utils.ts":
/*!***********************************!*\
  !*** ./src/core/metrics/utils.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createMetric": () => (/* binding */ createMetric),
/* harmony export */   "validateMetricInternalRepresentation": () => (/* binding */ validateMetricInternalRepresentation),
/* harmony export */   "validatePositiveInteger": () => (/* binding */ validatePositiveInteger),
/* harmony export */   "validateString": () => (/* binding */ validateString)
/* harmony export */ });
/* harmony import */ var _metric_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./metric.js */ "./src/core/metrics/metric.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _types_labeled_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./types/labeled.js */ "./src/core/metrics/types/labeled.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../log.js */ "./src/core/log.ts");






const LOG_TAG = "Glean.core.Metrics.utils";
function createMetric(type, v) {
    if (type.startsWith("labeled_")) {
        _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.addSupportedMetric(type, _types_labeled_js__WEBPACK_IMPORTED_MODULE_1__.LabeledMetric);
    }
    const ctor = _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.getSupportedMetric(type);
    if (!ctor) {
        throw new Error(`Unable to create metric of unknown type "${type}".`);
    }
    return new ctor(v);
}
function validateMetricInternalRepresentation(type, v) {
    try {
        createMetric(type, v);
        return true;
    }
    catch (e) {
        (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, e.message, _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Error);
        return false;
    }
}
function validatePositiveInteger(v, zeroIsValid = true) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isInteger)(v)) {
        return {
            type: _metric_js__WEBPACK_IMPORTED_MODULE_4__.MetricValidation.Error,
            errorMessage: `Expected integer value, got ${JSON.stringify(v)}`
        };
    }
    const validation = zeroIsValid ? v < 0 : v <= 0;
    if (validation) {
        return {
            type: _metric_js__WEBPACK_IMPORTED_MODULE_4__.MetricValidation.Error,
            errorMessage: `Expected positive value, got ${JSON.stringify(v)}`,
            errorType: _error_error_type_js__WEBPACK_IMPORTED_MODULE_5__.ErrorType.InvalidValue
        };
    }
    return { type: _metric_js__WEBPACK_IMPORTED_MODULE_4__.MetricValidation.Success };
}
function validateString(v) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isString)(v)) {
        return {
            type: _metric_js__WEBPACK_IMPORTED_MODULE_4__.MetricValidation.Error,
            errorMessage: `Expected string value, got ${JSON.stringify(v)}`
        };
    }
    return { type: _metric_js__WEBPACK_IMPORTED_MODULE_4__.MetricValidation.Success };
}


/***/ }),

/***/ "./src/core/pings/database/async.ts":
/*!******************************************!*\
  !*** ./src/core/pings/database/async.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./shared.js */ "./src/core/pings/database/shared.ts");





class PingsDatabase {
    constructor() {
        this.store = new _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.platform.Storage("pings");
    }
    attachObserver(observer) {
        this.observer = observer;
    }
    recordPing(path, identifier, payload, headers) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const ping = {
                collectionDate: new Date().toISOString(),
                path,
                payload
            };
            if (headers) {
                ping.headers = headers;
            }
            yield this.store.update([identifier], () => ping);
            this.observer && this.observer.update(identifier, ping);
        });
    }
    deletePing(identifier) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            yield this.store.delete([identifier]);
        });
    }
    getAllPings() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const allStoredPings = yield this.store.get();
            const finalPings = {};
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(allStoredPings)) {
                for (const identifier in allStoredPings) {
                    const ping = allStoredPings[identifier];
                    if ((0,_shared_js__WEBPACK_IMPORTED_MODULE_3__.isValidPingInternalRepresentation)(ping)) {
                        finalPings[identifier] = ping;
                    }
                    else {
                        (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_3__.PINGS_DATABASE_LOG_TAG, `Unexpected data found in pings database: ${JSON.stringify(ping, null, 2)}. Deleting.`, _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Warn);
                        yield this.store.delete([identifier]);
                    }
                }
            }
            return (0,_shared_js__WEBPACK_IMPORTED_MODULE_3__.sortPings)(finalPings);
        });
    }
    scanPendingPings() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            if (!this.observer) {
                return;
            }
            const pings = yield this.getAllPingsWithoutSurplus();
            for (const [identifier, ping] of pings) {
                this.observer.update(identifier, ping);
            }
        });
    }
    clearAll() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            yield this.store.delete([]);
        });
    }
    getAllPingsWithoutSurplus(maxCount = 250, maxSize = 10 * 1024 * 1024) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            const allPings = yield this.getAllPings();
            const pings = allPings
                .filter(([_, ping]) => !(0,_shared_js__WEBPACK_IMPORTED_MODULE_3__.isDeletionRequest)(ping))
                .reverse();
            const deletionRequestPings = allPings.filter(([_, ping]) => (0,_shared_js__WEBPACK_IMPORTED_MODULE_3__.isDeletionRequest)(ping));
            const total = pings.length;
            if (total > maxCount) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_3__.PINGS_DATABASE_LOG_TAG, [
                    `More than ${maxCount} pending pings in the pings database,`,
                    `will delete ${total - maxCount} old pings.`
                ], _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Warn);
            }
            let deleting = false;
            let pendingPingsCount = 0;
            let pendingPingsDatabaseSize = 0;
            const remainingPings = [];
            for (const [identifier, ping] of pings) {
                pendingPingsCount++;
                pendingPingsDatabaseSize += (0,_shared_js__WEBPACK_IMPORTED_MODULE_3__.getPingSize)(ping);
                if (!deleting && pendingPingsDatabaseSize > maxSize) {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_4__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_3__.PINGS_DATABASE_LOG_TAG, [
                        `Pending pings database has reached the size quota of ${maxSize} bytes,`,
                        "outstanding pings will be deleted."
                    ], _log_js__WEBPACK_IMPORTED_MODULE_4__.LoggingLevel.Warn);
                    deleting = true;
                }
                if (pendingPingsCount > maxCount) {
                    deleting = true;
                }
                if (deleting) {
                    yield this.deletePing(identifier);
                }
                else {
                    remainingPings.unshift([identifier, ping]);
                }
            }
            return [...deletionRequestPings, ...remainingPings];
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PingsDatabase);


/***/ }),

/***/ "./src/core/pings/database/shared.ts":
/*!*******************************************!*\
  !*** ./src/core/pings/database/shared.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PINGS_DATABASE_LOG_TAG": () => (/* binding */ PINGS_DATABASE_LOG_TAG),
/* harmony export */   "getPingSize": () => (/* binding */ getPingSize),
/* harmony export */   "isDeletionRequest": () => (/* binding */ isDeletionRequest),
/* harmony export */   "isValidPingInternalRepresentation": () => (/* binding */ isValidPingInternalRepresentation),
/* harmony export */   "sortPings": () => (/* binding */ sortPings)
/* harmony export */ });
/* harmony import */ var fflate__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fflate */ "./node_modules/fflate/esm/browser.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils.js */ "./src/core/utils.ts");



const PINGS_DATABASE_LOG_TAG = "core.Pings.Database";
function isDeletionRequest(ping) {
    return ping.path.split("/")[3] === _constants_js__WEBPACK_IMPORTED_MODULE_0__.DELETION_REQUEST_PING_NAME;
}
function getPingSize(ping) {
    return (0,fflate__WEBPACK_IMPORTED_MODULE_1__.strToU8)(JSON.stringify(ping)).length;
}
function isValidPingInternalRepresentation(v) {
    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(v)) {
        const hasValidCollectionDate = "collectionDate" in v &&
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isString)(v.collectionDate) &&
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(new Date(v.collectionDate).getTime());
        const hasValidPath = "path" in v && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isString)(v.path);
        const hasValidPayload = "payload" in v && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isJSONValue)(v.payload) && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(v.payload);
        const hasValidHeaders = !("headers" in v) || ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isJSONValue)(v.headers) && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isObject)(v.headers));
        if (!hasValidCollectionDate || !hasValidPath || !hasValidPayload || !hasValidHeaders) {
            return false;
        }
        return true;
    }
    return false;
}
function sortPings(pings) {
    return Object.entries(pings).sort(([_idA, { collectionDate: dateA }], [_idB, { collectionDate: dateB }]) => {
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        return timeA - timeB;
    });
}


/***/ }),

/***/ "./src/core/pings/maker/async.ts":
/*!***************************************!*\
  !*** ./src/core/pings/maker/async.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "buildClientInfoSection": () => (/* binding */ buildClientInfoSection),
/* harmony export */   "buildPingInfoSection": () => (/* binding */ buildPingInfoSection),
/* harmony export */   "collectAndStorePing": () => (/* binding */ collectAndStorePing),
/* harmony export */   "collectPing": () => (/* binding */ collectPing),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   "getSequenceNumber": () => (/* binding */ getSequenceNumber),
/* harmony export */   "getStartEndTimes": () => (/* binding */ getStartEndTimes)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../metrics/types/counter.js */ "./src/core/metrics/types/counter.ts");
/* harmony import */ var _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../metrics/types/datetime.js */ "./src/core/metrics/types/datetime.ts");
/* harmony import */ var _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../metrics/time_unit.js */ "./src/core/metrics/time_unit.ts");
/* harmony import */ var _events_async_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../events/async.js */ "./src/core/events/async.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./shared.js */ "./src/core/pings/maker/shared.ts");











function getStartTimeMetricAndData(ping) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        const startTimeMetric = new _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__.InternalDatetimeMetricType({
            category: "",
            name: `${ping.name}#start`,
            sendInPings: [_constants_js__WEBPACK_IMPORTED_MODULE_2__.PING_INFO_STORAGE],
            lifetime: "user",
            disabled: false
        }, _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_3__["default"].Minute);
        const startTimeData = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_2__.PING_INFO_STORAGE, startTimeMetric);
        let startTime;
        if (startTimeData) {
            startTime = new _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__.DatetimeMetric(startTimeData);
        }
        else {
            startTime = _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__.DatetimeMetric.fromDate(_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.startTime, _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_3__["default"].Minute);
        }
        return {
            startTimeMetric,
            startTime
        };
    });
}
function getSequenceNumber(ping) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        const seq = new _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_5__.InternalCounterMetricType({
            category: "",
            name: `${ping.name}#sequence`,
            sendInPings: [_constants_js__WEBPACK_IMPORTED_MODULE_2__.PING_INFO_STORAGE],
            lifetime: "user",
            disabled: false
        });
        const currentSeqData = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_2__.PING_INFO_STORAGE, seq);
        yield seq.addUndispatched(1);
        if (currentSeqData) {
            try {
                const metric = new _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_5__.CounterMetric(currentSeqData);
                return metric.payload();
            }
            catch (e) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_6__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_7__.PINGS_MAKER_LOG_TAG, `Unexpected value found for sequence number in ping ${ping.name}. Ignoring.`, _log_js__WEBPACK_IMPORTED_MODULE_6__.LoggingLevel.Warn);
            }
        }
        return 0;
    });
}
function getStartEndTimes(ping) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        const { startTimeMetric, startTime } = yield getStartTimeMetricAndData(ping);
        const endTimeData = new Date();
        yield startTimeMetric.setUndispatched(endTimeData);
        const endTime = _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_1__.DatetimeMetric.fromDate(endTimeData, _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_3__["default"].Minute);
        return {
            startTime: startTime.payload(),
            endTime: endTime.payload()
        };
    });
}
function buildPingInfoSection(ping, reason) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        const seq = yield getSequenceNumber(ping);
        const { startTime, endTime } = yield getStartEndTimes(ping);
        const pingInfo = {
            seq,
            start_time: startTime,
            end_time: endTime
        };
        if (reason) {
            pingInfo.reason = reason;
        }
        return pingInfo;
    });
}
function buildClientInfoSection(ping) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        let clientInfo = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getPingMetrics(_constants_js__WEBPACK_IMPORTED_MODULE_2__.CLIENT_INFO_STORAGE, true);
        if (!clientInfo) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_6__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_7__.PINGS_MAKER_LOG_TAG, "Empty client info data. Will submit anyways.", _log_js__WEBPACK_IMPORTED_MODULE_6__.LoggingLevel.Warn);
            clientInfo = {};
        }
        let finalClientInfo = {
            telemetry_sdk_build: _constants_js__WEBPACK_IMPORTED_MODULE_2__.GLEAN_VERSION
        };
        for (const metricType in clientInfo) {
            finalClientInfo = Object.assign(Object.assign({}, finalClientInfo), clientInfo[metricType]);
        }
        if (!ping.includeClientId) {
            delete finalClientInfo["client_id"];
        }
        return finalClientInfo;
    });
}
function collectPing(ping, reason) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        const eventsData = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.eventsDatabase.getPingEvents(ping.name, true);
        const metricsData = yield _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.metricsDatabase.getPingMetrics(ping.name, true);
        if (!metricsData && !eventsData) {
            if (!ping.sendIfEmpty) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_6__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_7__.PINGS_MAKER_LOG_TAG, `Storage for ${ping.name} empty. Bailing out.`, _log_js__WEBPACK_IMPORTED_MODULE_6__.LoggingLevel.Info);
                return;
            }
            (0,_log_js__WEBPACK_IMPORTED_MODULE_6__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_7__.PINGS_MAKER_LOG_TAG, `Storage for ${ping.name} empty. Ping will still be sent.`, _log_js__WEBPACK_IMPORTED_MODULE_6__.LoggingLevel.Info);
        }
        const metrics = metricsData ? { metrics: metricsData } : {};
        const events = eventsData ? { events: eventsData } : {};
        const pingInfo = yield buildPingInfoSection(ping, reason);
        const clientInfo = yield buildClientInfoSection(ping);
        return Object.assign(Object.assign(Object.assign({}, metrics), events), { ping_info: pingInfo, client_info: clientInfo });
    });
}
function collectAndStorePing(identifier, ping, reason) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        const collectedPayload = yield collectPing(ping, reason);
        if (!collectedPayload) {
            return;
        }
        let modifiedPayload;
        try {
            modifiedPayload = yield _events_async_js__WEBPACK_IMPORTED_MODULE_8__["default"].afterPingCollection.trigger(collectedPayload);
        }
        catch (e) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_6__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_7__.PINGS_MAKER_LOG_TAG, [
                `Error while attempting to modify ping payload for the "${ping.name}" ping using`,
                `the ${JSON.stringify(_events_async_js__WEBPACK_IMPORTED_MODULE_8__["default"].afterPingCollection.registeredPluginIdentifier)} plugin.`,
                "Ping will not be submitted. See more logs below.\n\n",
                e
            ], _log_js__WEBPACK_IMPORTED_MODULE_6__.LoggingLevel.Error);
            return;
        }
        if (_context_js__WEBPACK_IMPORTED_MODULE_4__.Context.config.logPings) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_6__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_7__.PINGS_MAKER_LOG_TAG, JSON.stringify(collectedPayload, null, 2), _log_js__WEBPACK_IMPORTED_MODULE_6__.LoggingLevel.Info);
        }
        const finalPayload = modifiedPayload ? modifiedPayload : collectedPayload;
        const headers = (0,_shared_js__WEBPACK_IMPORTED_MODULE_7__.getPingHeaders)();
        return _context_js__WEBPACK_IMPORTED_MODULE_4__.Context.pingsDatabase.recordPing((0,_shared_js__WEBPACK_IMPORTED_MODULE_7__.makePath)(identifier, ping), identifier, finalPayload, headers);
    });
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (collectAndStorePing);


/***/ }),

/***/ "./src/core/pings/maker/shared.ts":
/*!****************************************!*\
  !*** ./src/core/pings/maker/shared.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PINGS_MAKER_LOG_TAG": () => (/* binding */ PINGS_MAKER_LOG_TAG),
/* harmony export */   "getPingHeaders": () => (/* binding */ getPingHeaders),
/* harmony export */   "makePath": () => (/* binding */ makePath)
/* harmony export */ });
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");


const PINGS_MAKER_LOG_TAG = "core.Pings.Maker";
function makePath(identifier, ping) {
    return `/submit/${_context_js__WEBPACK_IMPORTED_MODULE_0__.Context.applicationId}/${ping.name}/${_constants_js__WEBPACK_IMPORTED_MODULE_1__.GLEAN_SCHEMA_VERSION}/${identifier}`;
}
function getPingHeaders() {
    const headers = {};
    if (_context_js__WEBPACK_IMPORTED_MODULE_0__.Context.config.debugViewTag) {
        headers["X-Debug-ID"] = _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.config.debugViewTag;
    }
    if (_context_js__WEBPACK_IMPORTED_MODULE_0__.Context.config.sourceTags) {
        headers["X-Source-Tags"] = _context_js__WEBPACK_IMPORTED_MODULE_0__.Context.config.sourceTags.toString();
    }
    if (Object.keys(headers).length > 0) {
        return headers;
    }
}


/***/ }),

/***/ "./src/core/pings/maker/sync.ts":
/*!**************************************!*\
  !*** ./src/core/pings/maker/sync.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "buildClientInfoSection": () => (/* binding */ buildClientInfoSection),
/* harmony export */   "buildPingInfoSection": () => (/* binding */ buildPingInfoSection),
/* harmony export */   "collectAndStorePing": () => (/* binding */ collectAndStorePing),
/* harmony export */   "collectPing": () => (/* binding */ collectPing),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   "getSequenceNumber": () => (/* binding */ getSequenceNumber),
/* harmony export */   "getStartEndTimes": () => (/* binding */ getStartEndTimes)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../metrics/types/counter.js */ "./src/core/metrics/types/counter.ts");
/* harmony import */ var _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../metrics/types/datetime.js */ "./src/core/metrics/types/datetime.ts");
/* harmony import */ var _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../metrics/time_unit.js */ "./src/core/metrics/time_unit.ts");
/* harmony import */ var _events_sync_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../events/sync.js */ "./src/core/events/sync.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./shared.js */ "./src/core/pings/maker/shared.ts");










function getStartTimeMetricAndData(ping) {
    const startTimeMetric = new _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_0__.InternalDatetimeMetricType({
        category: "",
        name: `${ping.name}#start`,
        sendInPings: [_constants_js__WEBPACK_IMPORTED_MODULE_1__.PING_INFO_STORAGE],
        lifetime: "user",
        disabled: false
    }, _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Minute);
    const startTimeData = _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_1__.PING_INFO_STORAGE, startTimeMetric);
    let startTime;
    if (startTimeData) {
        startTime = new _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_0__.DatetimeMetric(startTimeData);
    }
    else {
        startTime = _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_0__.DatetimeMetric.fromDate(_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.startTime, _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Minute);
    }
    return {
        startTimeMetric,
        startTime
    };
}
function getSequenceNumber(ping) {
    const seq = new _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_4__.InternalCounterMetricType({
        category: "",
        name: `${ping.name}#sequence`,
        sendInPings: [_constants_js__WEBPACK_IMPORTED_MODULE_1__.PING_INFO_STORAGE],
        lifetime: "user",
        disabled: false
    });
    const currentSeqData = _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getMetric(_constants_js__WEBPACK_IMPORTED_MODULE_1__.PING_INFO_STORAGE, seq);
    seq.add(1);
    if (currentSeqData) {
        try {
            const metric = new _metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_4__.CounterMetric(currentSeqData);
            return metric.payload();
        }
        catch (e) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.PINGS_MAKER_LOG_TAG, `Unexpected value found for sequence number in ping ${ping.name}. Ignoring.`, _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Warn);
        }
    }
    return 0;
}
function getStartEndTimes(ping) {
    const { startTimeMetric, startTime } = getStartTimeMetricAndData(ping);
    const endTimeData = new Date();
    startTimeMetric.set(endTimeData);
    const endTime = _metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_0__.DatetimeMetric.fromDate(endTimeData, _metrics_time_unit_js__WEBPACK_IMPORTED_MODULE_2__["default"].Minute);
    return {
        startTime: startTime.payload(),
        endTime: endTime.payload()
    };
}
function buildPingInfoSection(ping, reason) {
    const seq = getSequenceNumber(ping);
    const { startTime, endTime } = getStartEndTimes(ping);
    const pingInfo = {
        seq,
        start_time: startTime,
        end_time: endTime
    };
    if (reason) {
        pingInfo.reason = reason;
    }
    return pingInfo;
}
function buildClientInfoSection(ping) {
    let clientInfo = _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getPingMetrics(_constants_js__WEBPACK_IMPORTED_MODULE_1__.CLIENT_INFO_STORAGE, true);
    if (!clientInfo) {
        (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.PINGS_MAKER_LOG_TAG, "Empty client info data. Will submit anyways.", _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Warn);
        clientInfo = {};
    }
    let finalClientInfo = {
        telemetry_sdk_build: _constants_js__WEBPACK_IMPORTED_MODULE_1__.GLEAN_VERSION
    };
    for (const metricType in clientInfo) {
        finalClientInfo = Object.assign(Object.assign({}, finalClientInfo), clientInfo[metricType]);
    }
    if (!ping.includeClientId) {
        delete finalClientInfo["client_id"];
    }
    return finalClientInfo;
}
function collectPing(ping, reason) {
    const eventsData = _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.eventsDatabase.getPingEvents(ping.name, true);
    const metricsData = _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.metricsDatabase.getPingMetrics(ping.name, true);
    if (!metricsData && !eventsData) {
        if (!ping.sendIfEmpty) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.PINGS_MAKER_LOG_TAG, `Storage for ${ping.name} empty. Bailing out.`, _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Info);
            return;
        }
        (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.PINGS_MAKER_LOG_TAG, `Storage for ${ping.name} empty. Ping will still be sent.`, _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Info);
    }
    const metrics = metricsData ? { metrics: metricsData } : {};
    const events = eventsData ? { events: eventsData } : {};
    const pingInfo = buildPingInfoSection(ping, reason);
    const clientInfo = buildClientInfoSection(ping);
    return Object.assign(Object.assign(Object.assign({}, metrics), events), { ping_info: pingInfo, client_info: clientInfo });
}
function collectAndStorePing(identifier, ping, reason) {
    const collectedPayload = collectPing(ping, reason);
    if (!collectedPayload) {
        return;
    }
    let modifiedPayload;
    try {
        modifiedPayload = _events_sync_js__WEBPACK_IMPORTED_MODULE_7__["default"].afterPingCollection.trigger(collectedPayload);
    }
    catch (e) {
        (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.PINGS_MAKER_LOG_TAG, [
            `Error while attempting to modify ping payload for the "${ping.name}" ping using`,
            `the ${JSON.stringify(_events_sync_js__WEBPACK_IMPORTED_MODULE_7__["default"].afterPingCollection.registeredPluginIdentifier)} plugin.`,
            "Ping will not be submitted. See more logs below.\n\n",
            e
        ], _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Error);
        return;
    }
    if (_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.config.logPings) {
        (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.PINGS_MAKER_LOG_TAG, JSON.stringify(collectedPayload, null, 2), _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Info);
    }
    const finalPayload = modifiedPayload ? modifiedPayload : collectedPayload;
    const headers = (0,_shared_js__WEBPACK_IMPORTED_MODULE_6__.getPingHeaders)();
    _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.pingsDatabase.recordPing((0,_shared_js__WEBPACK_IMPORTED_MODULE_6__.makePath)(identifier, ping), identifier, finalPayload, headers);
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (collectAndStorePing);


/***/ }),

/***/ "./src/core/pings/ping_type.ts":
/*!*************************************!*\
  !*** ./src/core/pings/ping_type.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "InternalPingType": () => (/* binding */ InternalPingType),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils.js */ "./src/core/utils.ts");
/* harmony import */ var _pings_maker_async_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../pings/maker/async.js */ "./src/core/pings/maker/async.ts");
/* harmony import */ var _pings_maker_sync_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../pings/maker/sync.js */ "./src/core/pings/maker/sync.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../log.js */ "./src/core/log.ts");
var _inner;







const LOG_TAG = "core.Pings.PingType";
function isDeletionRequest(name) {
    return name === _constants_js__WEBPACK_IMPORTED_MODULE_0__.DELETION_REQUEST_PING_NAME;
}
class InternalPingType {
    constructor(meta) {
        var _a;
        this.name = meta.name;
        this.includeClientId = meta.includeClientId;
        this.sendIfEmpty = meta.sendIfEmpty;
        this.reasonCodes = (_a = meta.reasonCodes) !== null && _a !== void 0 ? _a : [];
    }
    submit(reason) {
        if (_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.isPlatformSync()) {
            this.submitSync(reason);
        }
        else {
            this.submitAsync(reason);
        }
    }
    submitAsync(reason) {
        if (this.testCallback) {
            this.testCallback(reason)
                .then(() => {
                this.internalSubmit(reason, this.resolveTestPromiseFunction);
            })
                .catch((e) => {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, [`There was an error validating "${this.name}" (${reason !== null && reason !== void 0 ? reason : "no reason"}):`, e], _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Error);
                this.internalSubmit(reason, this.rejectTestPromiseFunction);
            });
        }
        else {
            this.internalSubmit(reason);
        }
    }
    internalSubmit(reason, testResolver) {
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.launch(() => (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            yield this.submitUndispatched(reason, testResolver);
        }));
    }
    submitUndispatched(reason, testResolver) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, "Glean must be initialized before submitting pings.", _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Info);
                return;
            }
            if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled && !isDeletionRequest(this.name)) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, "Glean disabled: not submitting pings. Glean may still submit the deletion-request ping.", _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Info);
                return;
            }
            let correctedReason = reason;
            if (reason && !this.reasonCodes.includes(reason)) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, `Invalid reason code ${reason} from ${this.name}. Ignoring.`, _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Warn);
                correctedReason = undefined;
            }
            const identifier = (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.generateUUIDv4)();
            yield (0,_pings_maker_async_js__WEBPACK_IMPORTED_MODULE_5__["default"])(identifier, this, correctedReason);
            if (testResolver) {
                testResolver();
                this.resolveTestPromiseFunction = undefined;
                this.rejectTestPromiseFunction = undefined;
                this.testCallback = undefined;
            }
        });
    }
    submitSync(reason) {
        if (this.testCallback) {
            this.testCallback(reason)
                .then(() => {
                this.internalSubmitSync(reason, this.resolveTestPromiseFunction);
            })
                .catch((e) => {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, [`There was an error validating "${this.name}" (${reason !== null && reason !== void 0 ? reason : "no reason"}):`, e], _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Error);
                this.internalSubmitSync(reason, this.rejectTestPromiseFunction);
            });
        }
        else {
            this.internalSubmitSync(reason);
        }
    }
    internalSubmitSync(reason, testResolver) {
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, "Glean must be initialized before submitting pings.", _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Info);
            return;
        }
        if (!_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.uploadEnabled && !isDeletionRequest(this.name)) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, "Glean disabled: not submitting pings. Glean may still submit the deletion-request ping.", _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Info);
            return;
        }
        let correctedReason = reason;
        if (reason && !this.reasonCodes.includes(reason)) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, `Invalid reason code ${reason} from ${this.name}. Ignoring.`, _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Warn);
            correctedReason = undefined;
        }
        const identifier = (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.generateUUIDv4)();
        (0,_pings_maker_sync_js__WEBPACK_IMPORTED_MODULE_6__["default"])(identifier, this, correctedReason);
        if (testResolver) {
            testResolver();
            this.resolveTestPromiseFunction = undefined;
            this.rejectTestPromiseFunction = undefined;
            this.testCallback = undefined;
        }
    }
    testBeforeNextSubmit(callbackFn) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.testOnlyCheck)("testBeforeNextSubmit", LOG_TAG)) {
                if (this.testCallback) {
                    (0,_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, `There is an existing test call for ping "${this.name}". Ignoring.`, _log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Error);
                    return;
                }
                return new Promise((resolve, reject) => {
                    this.resolveTestPromiseFunction = resolve;
                    this.rejectTestPromiseFunction = reject;
                    this.testCallback = callbackFn;
                });
            }
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (class {
    constructor(meta) {
        _inner.set(this, void 0);
        (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldSet)(this, _inner, new InternalPingType(meta), "f");
    }
    submit(reason) {
        (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldGet)(this, _inner, "f").submit(reason);
    }
    testBeforeNextSubmit(callbackFn) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__awaiter)(this, void 0, void 0, function* () {
            return (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__classPrivateFieldGet)(this, _inner, "f").testBeforeNextSubmit(callbackFn);
        });
    }
});
_inner = new WeakMap();


/***/ }),

/***/ "./src/core/storage/utils.ts":
/*!***********************************!*\
  !*** ./src/core/storage/utils.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "deleteKeyFromNestedObject": () => (/* binding */ deleteKeyFromNestedObject),
/* harmony export */   "getValueFromNestedObject": () => (/* binding */ getValueFromNestedObject),
/* harmony export */   "updateNestedObject": () => (/* binding */ updateNestedObject)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/core/utils.ts");

function getValueFromNestedObject(obj, index) {
    if (index.length === 0) {
        throw Error("The index must contain at least one property to get.");
    }
    let target = obj;
    for (const key of index) {
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isObject)(target) && key in target) {
            const temp = target[key];
            if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isJSONValue)(temp)) {
                target = temp;
            }
        }
        else {
            return;
        }
    }
    return target;
}
function updateNestedObject(obj, index, transformFn) {
    if (index.length === 0) {
        throw Error("The index must contain at least one property to update.");
    }
    const returnObject = Object.assign({}, obj);
    let target = returnObject;
    for (const key of index.slice(0, index.length - 1)) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isObject)(target[key])) {
            target[key] = {};
        }
        target = target[key];
    }
    const finalKey = index[index.length - 1];
    const current = target[finalKey];
    const value = transformFn(current);
    target[finalKey] = value;
    return returnObject;
}
function deleteKeyFromNestedObject(obj, index) {
    if (index.length === 0) {
        return {};
    }
    const returnObject = Object.assign({}, obj);
    let target = returnObject;
    for (const key of index.slice(0, index.length - 1)) {
        const value = target[key];
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isObject)(value)) {
            throw Error(`Attempted to delete an entry from an inexistent index: ${JSON.stringify(index)}.`);
        }
        else {
            target = value;
        }
    }
    const finalKey = index[index.length - 1];
    delete target[finalKey];
    return returnObject;
}


/***/ }),

/***/ "./src/core/testing/events.ts":
/*!************************************!*\
  !*** ./src/core/testing/events.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "testRestartGlean": () => (/* binding */ testRestartGlean)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");
/* harmony import */ var _metrics_events_database_async_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../metrics/events_database/async.js */ "./src/core/metrics/events_database/async.ts");



function testRestartGlean(timeOffset = 1000 * 60) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.startTime.setTime(_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.startTime.getTime() + timeOffset);
        const db = new _metrics_events_database_async_js__WEBPACK_IMPORTED_MODULE_2__["default"]();
        yield db.initialize();
        return db;
    });
}


/***/ }),

/***/ "./src/core/testing/index.ts":
/*!***********************************!*\
  !*** ./src/core/testing/index.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "testInitializeGlean": () => (/* reexport safe */ _utils_js__WEBPACK_IMPORTED_MODULE_1__.testInitializeGlean),
/* harmony export */   "testResetGlean": () => (/* binding */ testResetGlean),
/* harmony export */   "testRestartGlean": () => (/* reexport safe */ _events_js__WEBPACK_IMPORTED_MODULE_2__.testRestartGlean),
/* harmony export */   "testUninitializeGlean": () => (/* reexport safe */ _utils_js__WEBPACK_IMPORTED_MODULE_1__.testUninitializeGlean)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/core/testing/utils.ts");
/* harmony import */ var _events_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./events.js */ "./src/core/testing/events.ts");


function testResetGlean(applicationId, uploadEnabled = true, config, clearStores = true) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testUninitializeGlean)(clearStores);
        yield (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.testInitializeGlean)(applicationId, uploadEnabled, config);
    });
}




/***/ }),

/***/ "./src/core/testing/utils.ts":
/*!***********************************!*\
  !*** ./src/core/testing/utils.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "testInitializeGlean": () => (/* binding */ testInitializeGlean),
/* harmony export */   "testUninitializeGlean": () => (/* binding */ testUninitializeGlean)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _platform_test_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../platform/test/index.js */ "./src/platform/test/index.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context.js */ "./src/core/context.ts");
/* harmony import */ var _events_utils_async_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../events/utils/async.js */ "./src/core/events/utils/async.ts");
/* harmony import */ var _glean_async_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../glean/async.js */ "./src/core/glean/async.ts");





function testInitializeGlean(applicationId, uploadEnabled = true, config) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.testing = true;
        _glean_async_js__WEBPACK_IMPORTED_MODULE_2__["default"].setPlatform(_platform_test_index_js__WEBPACK_IMPORTED_MODULE_3__["default"]);
        _glean_async_js__WEBPACK_IMPORTED_MODULE_2__["default"].initialize(applicationId, uploadEnabled, config);
        yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.dispatcher.testBlockOnQueue();
    });
}
function testUninitializeGlean(clearStores = true) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
        if (_context_js__WEBPACK_IMPORTED_MODULE_1__.Context.initialized) {
            yield _glean_async_js__WEBPACK_IMPORTED_MODULE_2__["default"].shutdown();
            if (clearStores) {
                yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.eventsDatabase.clearAll();
                yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.metricsDatabase.clearAll();
                yield _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.pingsDatabase.clearAll();
            }
            _context_js__WEBPACK_IMPORTED_MODULE_1__.Context.testUninitialize();
            (0,_events_utils_async_js__WEBPACK_IMPORTED_MODULE_4__.testResetEvents)();
            _glean_async_js__WEBPACK_IMPORTED_MODULE_2__["default"].preInitLogPings = undefined;
            _glean_async_js__WEBPACK_IMPORTED_MODULE_2__["default"].preInitDebugViewTag = undefined;
            _glean_async_js__WEBPACK_IMPORTED_MODULE_2__["default"].preInitSourceTags = undefined;
        }
    });
}


/***/ }),

/***/ "./src/core/upload/manager/async.ts":
/*!******************************************!*\
  !*** ./src/core/upload/manager/async.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _pings_database_shared_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../pings/database/shared.js */ "./src/core/pings/database/shared.ts");
/* harmony import */ var _rate_limiter_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../rate_limiter.js */ "./src/core/upload/rate_limiter.ts");
/* harmony import */ var _worker_async_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../worker/async.js */ "./src/core/upload/worker/async.ts");
/* harmony import */ var _policy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../policy.js */ "./src/core/upload/policy.ts");
/* harmony import */ var _task_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../task.js */ "./src/core/upload/task.ts");
/* harmony import */ var _shared_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./shared.js */ "./src/core/upload/manager/shared.ts");









class PingUploadManager {
    constructor(config, pingsDatabase, policy = new _policy_js__WEBPACK_IMPORTED_MODULE_0__["default"](), rateLimiter = new _rate_limiter_js__WEBPACK_IMPORTED_MODULE_1__["default"]()) {
        this.pingsDatabase = pingsDatabase;
        this.policy = policy;
        this.rateLimiter = rateLimiter;
        this.recoverableFailureCount = 0;
        this.waitAttemptCount = 0;
        this.queue = [];
        this.processing = new Set();
        this.worker = new _worker_async_js__WEBPACK_IMPORTED_MODULE_2__["default"](config.httpClient ? config.httpClient : _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.platform.uploader, config.serverEndpoint, policy);
        pingsDatabase.attachObserver(this);
    }
    getUploadTask() {
        const nextTask = this.getUploadTaskInternal();
        if (nextTask.type !== "wait" && this.waitAttemptCount > 0) {
            this.waitAttemptCount = 0;
        }
        if (nextTask.type !== "upload" && this.recoverableFailureCount > 0) {
            this.recoverableFailureCount = 0;
        }
        return nextTask;
    }
    processPingUploadResponse(ping, response) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            const { identifier } = ping;
            this.processing.delete(identifier);
            const { status, result } = response;
            if (status && status >= 200 && status < 300) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.UPLOAD_MANAGER_LOG_TAG, `Ping ${identifier} successfully sent ${status}.`, _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Info);
                yield this.pingsDatabase.deletePing(identifier);
                return;
            }
            if (result === 1 ||
                (status && status >= 400 && status < 500)) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.UPLOAD_MANAGER_LOG_TAG, `Unrecoverable upload failure while attempting to send ping ${identifier}. Error was: ${status !== null && status !== void 0 ? status : "no status"}.`, _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Warn);
                yield this.pingsDatabase.deletePing(identifier);
                return;
            }
            (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.UPLOAD_MANAGER_LOG_TAG, [
                `Recoverable upload failure while attempting to send ping ${identifier}, will retry.`,
                `Error was: ${status !== null && status !== void 0 ? status : "no status"}.`
            ], _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Warn);
            this.recoverableFailureCount++;
            this.enqueuePing(ping);
        });
    }
    clearPendingPingsQueue() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            this.queue = this.queue.filter((ping) => (0,_pings_database_shared_js__WEBPACK_IMPORTED_MODULE_7__.isDeletionRequest)(ping));
            yield this.blockOnOngoingUploads();
        });
    }
    blockOnOngoingUploads() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__awaiter)(this, void 0, void 0, function* () {
            return this.worker.blockOnCurrentJob();
        });
    }
    update(identifier, ping) {
        this.enqueuePing(Object.assign({ identifier }, ping));
        this.worker.work(() => this.getUploadTask(), (ping, result) => this.processPingUploadResponse(ping, result));
    }
    enqueuePing(ping) {
        if (this.processing.has(ping.identifier)) {
            return;
        }
        for (const queuedPing of this.queue) {
            if (queuedPing.identifier === ping.identifier) {
                return;
            }
        }
        this.queue.push(ping);
    }
    getUploadTaskInternal() {
        if (this.recoverableFailureCount >= this.policy.maxRecoverableFailures) {
            (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.UPLOAD_MANAGER_LOG_TAG, "Glean has reached maximum recoverable upload failures for the current uploading window.", _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Debug);
            return _task_js__WEBPACK_IMPORTED_MODULE_8__["default"].done();
        }
        if (this.queue.length > 0) {
            const { state, remainingTime } = this.rateLimiter.getState();
            if (state === 1) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(_shared_js__WEBPACK_IMPORTED_MODULE_6__.UPLOAD_MANAGER_LOG_TAG, [
                    "Glean is currently throttled.",
                    `Pending pings may be uploaded in ${(remainingTime || 0) / 1000}s.`
                ], _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Debug);
                this.waitAttemptCount++;
                if (this.waitAttemptCount > this.policy.maxWaitAttempts) {
                    return _task_js__WEBPACK_IMPORTED_MODULE_8__["default"].done();
                }
                return _task_js__WEBPACK_IMPORTED_MODULE_8__["default"].wait(remainingTime || 0);
            }
            const nextPing = this.queue.shift();
            this.processing.add(nextPing.identifier);
            return _task_js__WEBPACK_IMPORTED_MODULE_8__["default"].upload(nextPing);
        }
        return _task_js__WEBPACK_IMPORTED_MODULE_8__["default"].done();
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PingUploadManager);


/***/ }),

/***/ "./src/core/upload/manager/shared.ts":
/*!*******************************************!*\
  !*** ./src/core/upload/manager/shared.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "UPLOAD_MANAGER_LOG_TAG": () => (/* binding */ UPLOAD_MANAGER_LOG_TAG)
/* harmony export */ });
const UPLOAD_MANAGER_LOG_TAG = "core.Upload.PingUploadManager";


/***/ }),

/***/ "./src/core/upload/policy.ts":
/*!***********************************!*\
  !*** ./src/core/upload/policy.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Policy)
/* harmony export */ });
class Policy {
    constructor(maxWaitAttempts = 3, maxRecoverableFailures = 3, maxPingBodySize = 1024 * 1024) {
        this.maxWaitAttempts = maxWaitAttempts;
        this.maxRecoverableFailures = maxRecoverableFailures;
        this.maxPingBodySize = maxPingBodySize;
    }
}


/***/ }),

/***/ "./src/core/upload/rate_limiter.ts":
/*!*****************************************!*\
  !*** ./src/core/upload/rate_limiter.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MAX_PINGS_PER_INTERVAL": () => (/* binding */ MAX_PINGS_PER_INTERVAL),
/* harmony export */   "RATE_LIMITER_INTERVAL_MS": () => (/* binding */ RATE_LIMITER_INTERVAL_MS),
/* harmony export */   "RateLimiterState": () => (/* binding */ RateLimiterState),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/core/utils.ts");

const RATE_LIMITER_INTERVAL_MS = 60 * 1000;
const MAX_PINGS_PER_INTERVAL = 40;
var RateLimiterState;
(function (RateLimiterState) {
    RateLimiterState[RateLimiterState["Incrementing"] = 0] = "Incrementing";
    RateLimiterState[RateLimiterState["Throttled"] = 1] = "Throttled";
})(RateLimiterState || (RateLimiterState = {}));
class RateLimiter {
    constructor(interval = RATE_LIMITER_INTERVAL_MS, maxCount = MAX_PINGS_PER_INTERVAL, count = 0, started) {
        this.interval = interval;
        this.maxCount = maxCount;
        this.count = count;
        this.started = started;
    }
    get elapsed() {
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isUndefined)(this.started)) {
            return NaN;
        }
        const now = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.getMonotonicNow)();
        const result = now - this.started;
        if (result < 0) {
            return NaN;
        }
        return result;
    }
    reset() {
        this.started = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.getMonotonicNow)();
        this.count = 0;
    }
    shouldReset() {
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isUndefined)(this.started)) {
            return true;
        }
        if (isNaN(this.elapsed) || this.elapsed > this.interval) {
            return true;
        }
        return false;
    }
    getState() {
        if (this.shouldReset()) {
            this.reset();
        }
        const remainingTime = this.interval - this.elapsed;
        if (this.count >= this.maxCount) {
            return {
                state: 1,
                remainingTime,
            };
        }
        this.count++;
        return {
            state: 0
        };
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (RateLimiter);


/***/ }),

/***/ "./src/core/upload/task.ts":
/*!*********************************!*\
  !*** ./src/core/upload/task.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "UploadTaskTypes": () => (/* binding */ UploadTaskTypes),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var UploadTaskTypes;
(function (UploadTaskTypes) {
    UploadTaskTypes["Done"] = "done";
    UploadTaskTypes["Wait"] = "wait";
    UploadTaskTypes["Upload"] = "upload";
})(UploadTaskTypes || (UploadTaskTypes = {}));
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
    done: () => ({
        type: "done"
    }),
    wait: (remainingTime) => ({
        type: "wait",
        remainingTime,
    }),
    upload: (ping) => ({
        type: "upload",
        ping,
    }),
});


/***/ }),

/***/ "./src/core/upload/uploader.ts":
/*!*************************************!*\
  !*** ./src/core/upload/uploader.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DEFAULT_UPLOAD_TIMEOUT_MS": () => (/* binding */ DEFAULT_UPLOAD_TIMEOUT_MS),
/* harmony export */   "UploadResult": () => (/* binding */ UploadResult),
/* harmony export */   "UploadResultStatus": () => (/* binding */ UploadResultStatus),
/* harmony export */   "Uploader": () => (/* binding */ Uploader),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const DEFAULT_UPLOAD_TIMEOUT_MS = 10000;
var UploadResultStatus;
(function (UploadResultStatus) {
    UploadResultStatus[UploadResultStatus["RecoverableFailure"] = 0] = "RecoverableFailure";
    UploadResultStatus[UploadResultStatus["UnrecoverableFailure"] = 1] = "UnrecoverableFailure";
    UploadResultStatus[UploadResultStatus["Success"] = 2] = "Success";
})(UploadResultStatus || (UploadResultStatus = {}));
class UploadResult {
    constructor(result, status) {
        this.result = result;
        this.status = status;
    }
}
class Uploader {
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Uploader);


/***/ }),

/***/ "./src/core/upload/worker/async.ts":
/*!*****************************************!*\
  !*** ./src/core/upload/worker/async.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var fflate__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! fflate */ "./node_modules/fflate/esm/browser.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../constants.js */ "./src/core/constants.ts");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../context.js */ "./src/core/context.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../log.js */ "./src/core/log.ts");
/* harmony import */ var _policy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../policy.js */ "./src/core/upload/policy.ts");
/* harmony import */ var _uploader_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../uploader.js */ "./src/core/upload/uploader.ts");







const LOG_TAG = "core.Upload.PingUploadWorker";
class PingBodyOverflowError extends Error {
    constructor(message) {
        super(message);
        this.name = "PingBodyOverflow";
    }
}
class PingUploadWorker {
    constructor(uploader, serverEndpoint, policy = new _policy_js__WEBPACK_IMPORTED_MODULE_0__["default"]()) {
        this.uploader = uploader;
        this.serverEndpoint = serverEndpoint;
        this.policy = policy;
        this.isBlocking = false;
    }
    buildPingRequest(ping) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            let headers = ping.headers || {};
            headers = Object.assign(Object.assign({}, ping.headers), { "Content-Type": "application/json; charset=utf-8", Date: new Date().toISOString(), "X-Telemetry-Agent": `Glean/${_constants_js__WEBPACK_IMPORTED_MODULE_2__.GLEAN_VERSION} (JS on ${yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.platform.info.os()})` });
            const stringifiedBody = JSON.stringify(ping.payload);
            const encodedBody = (0,fflate__WEBPACK_IMPORTED_MODULE_4__.strToU8)(stringifiedBody);
            let finalBody;
            let bodySizeInBytes;
            try {
                finalBody = (0,fflate__WEBPACK_IMPORTED_MODULE_4__.gzipSync)(encodedBody);
                bodySizeInBytes = finalBody.length;
                headers["Content-Encoding"] = "gzip";
            }
            catch (_a) {
                finalBody = stringifiedBody;
                bodySizeInBytes = encodedBody.length;
            }
            if (bodySizeInBytes > this.policy.maxPingBodySize) {
                throw new PingBodyOverflowError(`Body for ping ${ping.identifier} exceeds ${this.policy.maxPingBodySize}bytes. Discarding.`);
            }
            headers["Content-Length"] = bodySizeInBytes.toString();
            return {
                headers,
                payload: finalBody
            };
        });
    }
    attemptPingUpload(ping) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            try {
                const finalPing = yield this.buildPingRequest(ping);
                return yield this.uploader.post(`${this.serverEndpoint}${ping.path}`, finalPing.payload, finalPing.headers);
            }
            catch (e) {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(LOG_TAG, ["Error trying to build or post ping request:", e], _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Warn);
                return new _uploader_js__WEBPACK_IMPORTED_MODULE_6__.UploadResult(1);
            }
        });
    }
    workInternal(getUploadTask, processUploadResponse) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            while (true) {
                const nextTask = getUploadTask();
                switch (nextTask.type) {
                    case "upload":
                        const result = yield this.attemptPingUpload(nextTask.ping);
                        yield processUploadResponse(nextTask.ping, result);
                        continue;
                    case "wait":
                        if (this.isBlocking) {
                            return;
                        }
                        try {
                            const wasAborted = yield new Promise((resolve) => {
                                this.waitPromiseResolver = resolve;
                                this.waitTimeoutId = _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.platform.timer.setTimeout(() => {
                                    this.waitPromiseResolver = undefined;
                                    this.waitTimeoutId = undefined;
                                    resolve(false);
                                }, nextTask.remainingTime);
                            });
                            if (wasAborted) {
                                return;
                            }
                        }
                        catch (_) {
                            this.waitPromiseResolver = undefined;
                            this.waitTimeoutId = undefined;
                            return;
                        }
                        continue;
                    case "done":
                        return;
                }
            }
        });
    }
    work(getUploadTask, processUploadResponse) {
        if (!this.currentJob) {
            this.currentJob = this.workInternal(getUploadTask, processUploadResponse)
                .then(() => {
                this.currentJob = undefined;
            })
                .catch((error) => {
                (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(LOG_TAG, ["IMPOSSIBLE: Something went wrong while processing ping upload tasks.", error], _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Error);
            });
        }
    }
    blockOnCurrentJob() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            if (this.currentJob) {
                if (this.waitTimeoutId && this.waitPromiseResolver) {
                    _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.platform.timer.clearTimeout(this.waitTimeoutId);
                    this.waitPromiseResolver(true);
                    this.waitPromiseResolver = undefined;
                    this.waitTimeoutId = undefined;
                }
                this.isBlocking = true;
                yield this.currentJob;
                this.isBlocking = false;
                return;
            }
            return Promise.resolve();
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PingUploadWorker);


/***/ }),

/***/ "./src/core/utils.ts":
/*!***************************!*\
  !*** ./src/core/utils.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "generateUUIDv4": () => (/* binding */ generateUUIDv4),
/* harmony export */   "getCurrentTimeInNanoSeconds": () => (/* binding */ getCurrentTimeInNanoSeconds),
/* harmony export */   "getMonotonicNow": () => (/* binding */ getMonotonicNow),
/* harmony export */   "isBoolean": () => (/* binding */ isBoolean),
/* harmony export */   "isEmptyObject": () => (/* binding */ isEmptyObject),
/* harmony export */   "isInteger": () => (/* binding */ isInteger),
/* harmony export */   "isJSONValue": () => (/* binding */ isJSONValue),
/* harmony export */   "isNumber": () => (/* binding */ isNumber),
/* harmony export */   "isObject": () => (/* binding */ isObject),
/* harmony export */   "isString": () => (/* binding */ isString),
/* harmony export */   "isUndefined": () => (/* binding */ isUndefined),
/* harmony export */   "isWindowObjectUnavailable": () => (/* binding */ isWindowObjectUnavailable),
/* harmony export */   "sanitizeApplicationId": () => (/* binding */ sanitizeApplicationId),
/* harmony export */   "saturatingAdd": () => (/* binding */ saturatingAdd),
/* harmony export */   "testOnlyCheck": () => (/* binding */ testOnlyCheck),
/* harmony export */   "truncateStringAtBoundaryWithError": () => (/* binding */ truncateStringAtBoundaryWithError),
/* harmony export */   "truncateStringAtBoundaryWithErrorSync": () => (/* binding */ truncateStringAtBoundaryWithErrorSync),
/* harmony export */   "validateHeader": () => (/* binding */ validateHeader),
/* harmony export */   "validateURL": () => (/* binding */ validateURL)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var uuid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/esm-browser/v4.js");
/* harmony import */ var _context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./context.js */ "./src/core/context.ts");
/* harmony import */ var _error_error_type_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _log_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./log.js */ "./src/core/log.ts");
/* harmony import */ var _metrics_metric_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./metrics/metric.js */ "./src/core/metrics/metric.ts");






const LOG_TAG = "core.utils";
function isJSONValue(v) {
    if (isString(v) || isBoolean(v) || isNumber(v)) {
        return true;
    }
    if (isObject(v)) {
        if (Object.keys(v).length === 0) {
            return true;
        }
        for (const key in v) {
            return isJSONValue(v[key]);
        }
    }
    if (Array.isArray(v)) {
        return v.every((e) => isJSONValue(e));
    }
    return false;
}
function isObject(v) {
    return (typeof v === "object" && v !== null && v.constructor === Object);
}
function isEmptyObject(v) {
    return Object.keys(v || {}).length === 0;
}
function isUndefined(v) {
    return typeof v === "undefined";
}
function isString(v) {
    return typeof v === "string";
}
function isBoolean(v) {
    return typeof v === "boolean";
}
function isNumber(v) {
    return typeof v === "number" && !isNaN(v);
}
function isInteger(v) {
    return isNumber(v) && Number.isInteger(v);
}
function sanitizeApplicationId(applicationId) {
    return applicationId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}
function validateURL(v) {
    const urlPattern = /^(http|https):\/\/[a-zA-Z0-9._-]+(:\d+){0,1}(\/{0,1})$/i;
    return urlPattern.test(v);
}
function validateHeader(v) {
    return /^[a-z0-9-]{1,20}$/i.test(v);
}
function generateUUIDv4() {
    if (typeof crypto !== "undefined") {
        return (0,uuid__WEBPACK_IMPORTED_MODULE_0__["default"])();
    }
    else {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
function getMonotonicNow() {
    const now = typeof performance === "undefined"
        ? Date.now()
        : performance.now();
    return Math.round(now);
}
function truncateStringAtBoundaryWithError(metric, value, length) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
        if (!isString(value)) {
            throw new _metrics_metric_js__WEBPACK_IMPORTED_MODULE_2__.MetricValidationError(`Expected string, got ${JSON.stringify(value)}`);
        }
        const truncated = value.substring(0, length);
        if (truncated !== value) {
            yield _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.errorManager.record(metric, _error_error_type_js__WEBPACK_IMPORTED_MODULE_4__.ErrorType.InvalidOverflow, `Value length ${value.length} exceeds maximum of ${length}.`);
        }
        return truncated;
    });
}
function truncateStringAtBoundaryWithErrorSync(metric, value, length) {
    if (!isString(value)) {
        throw new _metrics_metric_js__WEBPACK_IMPORTED_MODULE_2__.MetricValidationError(`Expected string, got ${JSON.stringify(value)}`);
    }
    const truncated = value.substring(0, length);
    if (truncated !== value) {
        _context_js__WEBPACK_IMPORTED_MODULE_3__.Context.errorManager.record(metric, _error_error_type_js__WEBPACK_IMPORTED_MODULE_4__.ErrorType.InvalidOverflow, `Value length ${value.length} exceeds maximum of ${length}.`);
    }
    return truncated;
}
function testOnlyCheck(name, logTag = LOG_TAG) {
    if (!_context_js__WEBPACK_IMPORTED_MODULE_3__.Context.testing) {
        (0,_log_js__WEBPACK_IMPORTED_MODULE_5__["default"])(logTag, [
            `Attempted to access test only method \`${name || "unknown"}\`,`,
            "but Glean is not in testing mode. Ignoring. Make sure to put Glean in testing mode",
            "before accessing such methods, by calling `testResetGlean`."
        ], _log_js__WEBPACK_IMPORTED_MODULE_5__.LoggingLevel.Error);
        return false;
    }
    return true;
}
function saturatingAdd(...args) {
    let result = args.reduce((sum, item) => sum + item, 0);
    if (result > Number.MAX_SAFE_INTEGER) {
        result = Number.MAX_SAFE_INTEGER;
    }
    return result;
}
function getCurrentTimeInNanoSeconds() {
    let now;
    if (typeof process === "undefined") {
        now = getMonotonicNow();
    }
    else {
        const hrTime = process.hrtime();
        now = hrTime[0] * 1000000000 + hrTime[1];
    }
    return now;
}
function isWindowObjectUnavailable() {
    return typeof window === "undefined";
}


/***/ }),

/***/ "./src/entry/base/async.ts":
/*!*********************************!*\
  !*** ./src/entry/base/async.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "baseAsync": () => (/* binding */ baseAsync)
/* harmony export */ });
/* harmony import */ var _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/glean/async.js */ "./src/core/glean/async.ts");

const baseAsync = (platform) => {
    return {
        initialize(applicationId, uploadEnabled, config) {
            _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__["default"].setPlatform(platform);
            _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__["default"].initialize(applicationId, uploadEnabled, config);
        },
        setUploadEnabled(flag) {
            _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__["default"].setUploadEnabled(flag);
        },
        setLogPings(flag) {
            _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__["default"].setLogPings(flag);
        },
        setDebugViewTag(value) {
            _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__["default"].setDebugViewTag(value);
        },
        shutdown() {
            return _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__["default"].shutdown();
        },
        setSourceTags(value) {
            _core_glean_async_js__WEBPACK_IMPORTED_MODULE_0__["default"].setSourceTags(value);
        }
    };
};


/***/ }),

/***/ "./src/histogram/exponential.ts":
/*!**************************************!*\
  !*** ./src/histogram/exponential.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PrecomputedExponential": () => (/* binding */ PrecomputedExponential),
/* harmony export */   "constructExponentialHistogramFromValues": () => (/* binding */ constructExponentialHistogramFromValues),
/* harmony export */   "exponentialRange": () => (/* binding */ exponentialRange)
/* harmony export */ });
/* harmony import */ var _histogram_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./histogram.js */ "./src/histogram/histogram.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/histogram/utils.ts");


function exponentialRange(min, max, bucketCount) {
    const logMax = Math.log(max);
    const ranges = [];
    let current = min;
    if (current === 0) {
        current = 1;
    }
    ranges.push(0);
    ranges.push(current);
    for (let i = 2; i < bucketCount; i++) {
        const logCurrent = Math.log(current);
        const logRatio = (logMax - logCurrent) / (bucketCount - i);
        const logNext = logCurrent + logRatio;
        const nextValue = Math.round(Math.exp(logNext));
        if (nextValue > current) {
            current = nextValue;
        }
        else {
            current += 1;
        }
        ranges.push(current);
    }
    return ranges;
}
class PrecomputedExponential {
    constructor(min, max, bucketCount) {
        this.min = min;
        this.max = max;
        this.bucketCount = bucketCount;
        this.bucketRanges = [];
    }
    sampleToBucketMinimum(sample) {
        const limit = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.binarySearch)(this.ranges(), sample);
        if (limit === -1) {
            throw new Error("Unable to find correct bucket for the sample.");
        }
        return this.ranges()[limit];
    }
    ranges() {
        if (this.bucketRanges.length) {
            return this.bucketRanges;
        }
        this.bucketRanges = exponentialRange(this.min, this.max, this.bucketCount);
        return this.bucketRanges;
    }
}
function constructExponentialHistogramFromValues(values = [], rangeMin, rangeMax, bucketCount) {
    const histogram = new _histogram_js__WEBPACK_IMPORTED_MODULE_1__.Histogram(new PrecomputedExponential(rangeMin, rangeMax, bucketCount));
    values.forEach((val) => {
        histogram.accumulate(val);
    });
    return histogram;
}


/***/ }),

/***/ "./src/histogram/functional.ts":
/*!*************************************!*\
  !*** ./src/histogram/functional.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Functional": () => (/* binding */ Functional),
/* harmony export */   "constructFunctionalHistogramFromValues": () => (/* binding */ constructFunctionalHistogramFromValues)
/* harmony export */ });
/* harmony import */ var _core_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../core/utils.js */ "./src/core/utils.ts");
/* harmony import */ var _histogram_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./histogram.js */ "./src/histogram/histogram.ts");


class Functional {
    constructor(logBase, bucketsPerMagnitude) {
        this.exponent = Math.pow(logBase, 1.0 / bucketsPerMagnitude);
    }
    sampleToBucketMinimum(sample) {
        if (sample === 0) {
            return 0;
        }
        const index = this.sampleToBucketIndex(sample);
        return this.bucketIndexToBucketMinimum(index);
    }
    ranges() {
        throw new Error("Bucket ranges for functional bucketing are not precomputed");
    }
    sampleToBucketIndex(sample) {
        return Math.floor(Math.log((0,_core_utils_js__WEBPACK_IMPORTED_MODULE_0__.saturatingAdd)(sample, 1)) / Math.log(this.exponent));
    }
    bucketIndexToBucketMinimum(index) {
        return Math.floor(Math.pow(this.exponent, index));
    }
    snapshotOverride(values) {
        if (!Object.keys(values).length) {
            return {};
        }
        let minKey = Number.MAX_VALUE;
        let maxKey = Number.MIN_VALUE;
        Object.keys(values).forEach((key) => {
            const numericKey = Number(key);
            if (minKey === null || numericKey < minKey) {
                minKey = numericKey;
            }
            if (maxKey == null || numericKey > maxKey) {
                maxKey = numericKey;
            }
        });
        const minBucket = this.sampleToBucketIndex(minKey);
        const maxBucket = this.sampleToBucketIndex(maxKey);
        for (let i = minBucket; i < maxBucket; i++) {
            const minBucketIndex = this.bucketIndexToBucketMinimum(i);
            if (!values[minBucketIndex]) {
                values[minBucketIndex] = 0;
            }
        }
        return values;
    }
}
function constructFunctionalHistogramFromValues(values = [], logBase, bucketsPerMagnitude) {
    const histogram = new _histogram_js__WEBPACK_IMPORTED_MODULE_1__.Histogram(new Functional(logBase, bucketsPerMagnitude));
    values.forEach((val) => {
        histogram.accumulate(val);
    });
    return histogram;
}


/***/ }),

/***/ "./src/histogram/histogram.ts":
/*!************************************!*\
  !*** ./src/histogram/histogram.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Histogram": () => (/* binding */ Histogram),
/* harmony export */   "HistogramType": () => (/* binding */ HistogramType)
/* harmony export */ });
/* harmony import */ var _core_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../core/utils.js */ "./src/core/utils.ts");

var HistogramType;
(function (HistogramType) {
    HistogramType["linear"] = "linear";
    HistogramType["exponential"] = "exponential";
})(HistogramType || (HistogramType = {}));
class Histogram {
    constructor(bucketing) {
        this.values = {};
        this.count = 0;
        this.sum = 0;
        this.bucketing = bucketing;
    }
    bucketCount() {
        return Object.keys(this.values).length;
    }
    accumulate(sample) {
        const bucketMin = this.bucketing.sampleToBucketMinimum(sample);
        if (!this.values[bucketMin]) {
            this.values[bucketMin] = 0;
        }
        this.values[bucketMin] = this.values[bucketMin] + 1;
        this.sum = (0,_core_utils_js__WEBPACK_IMPORTED_MODULE_0__.saturatingAdd)(this.sum, sample);
        this.count += 1;
    }
    isEmpty() {
        return this.count === 0;
    }
    snapshotValues() {
        if (this.bucketing.snapshotOverride) {
            return this.bucketing.snapshotOverride(this.values);
        }
        else {
            return this.getDefaultSnapshot();
        }
    }
    getDefaultSnapshot() {
        const valuesClone = Object.assign({}, this.values);
        const maxBucket = Object.keys(valuesClone).reduce((prev, curr) => {
            const prevAsNum = Number(prev);
            const currAsNum = Number(curr);
            return currAsNum > prevAsNum ? curr : prev;
        });
        const ranges = this.bucketing.ranges();
        for (const minBucket of ranges) {
            if (!valuesClone[minBucket]) {
                valuesClone[minBucket] = 0;
            }
            if (minBucket > Number(maxBucket)) {
                break;
            }
        }
        return valuesClone;
    }
}


/***/ }),

/***/ "./src/histogram/linear.ts":
/*!*********************************!*\
  !*** ./src/histogram/linear.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PrecomputedLinear": () => (/* binding */ PrecomputedLinear),
/* harmony export */   "constructLinearHistogramFromValues": () => (/* binding */ constructLinearHistogramFromValues),
/* harmony export */   "linearRange": () => (/* binding */ linearRange)
/* harmony export */ });
/* harmony import */ var _histogram_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./histogram.js */ "./src/histogram/histogram.ts");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/histogram/utils.ts");


function linearRange(min, max, count) {
    const ranges = [];
    ranges.push(0);
    const newMin = Math.max(1, min);
    for (let i = 1; i < count; i++) {
        const range = (newMin * (count - 1 - i) + max * (i - 1)) / (count - 2);
        ranges.push(Math.floor(range));
    }
    return ranges;
}
class PrecomputedLinear {
    constructor(min, max, bucketCount) {
        this.min = min;
        this.max = max;
        this.bucketCount = bucketCount;
        this.bucketRanges = [];
    }
    sampleToBucketMinimum(sample) {
        const limit = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.binarySearch)(this.ranges(), sample);
        if (limit === -1) {
            throw new Error("Unable to find correct bucket for the sample.");
        }
        return this.ranges()[limit];
    }
    ranges() {
        if (this.bucketRanges.length) {
            return this.bucketRanges;
        }
        this.bucketRanges = linearRange(this.min, this.max, this.bucketCount);
        return this.bucketRanges;
    }
}
function constructLinearHistogramFromValues(values = [], rangeMin, rangeMax, bucketCount) {
    const histogram = new _histogram_js__WEBPACK_IMPORTED_MODULE_1__.Histogram(new PrecomputedLinear(rangeMin, rangeMax, bucketCount));
    values.forEach((val) => {
        histogram.accumulate(val);
    });
    return histogram;
}


/***/ }),

/***/ "./src/histogram/utils.ts":
/*!********************************!*\
  !*** ./src/histogram/utils.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "binarySearch": () => (/* binding */ binarySearch)
/* harmony export */ });
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    let mid = -1;
    while (left <= right) {
        mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) {
            return mid;
        }
        if (target < arr[mid]) {
            right = mid - 1;
        }
        else {
            left = mid + 1;
        }
    }
    if (mid - left > right - mid) {
        return mid - 1;
    }
    else {
        return mid;
    }
}


/***/ }),

/***/ "./src/platform/qt/index.ts":
/*!**********************************!*\
  !*** ./src/platform/qt/index.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _uploader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./uploader.js */ "./src/platform/qt/uploader.ts");
/* harmony import */ var _platform_info_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./platform_info.js */ "./src/platform/qt/platform_info.ts");
/* harmony import */ var _storage_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./storage.js */ "./src/platform/qt/storage.ts");



const QtPlatform = {
    Storage: _storage_js__WEBPACK_IMPORTED_MODULE_0__["default"],
    uploader: _uploader_js__WEBPACK_IMPORTED_MODULE_1__["default"],
    info: _platform_info_js__WEBPACK_IMPORTED_MODULE_2__["default"],
    timer: {
        setTimeout: () => { throw new Error(); },
        clearTimeout: () => { }
    },
    name: "Qt"
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (QtPlatform);


/***/ }),

/***/ "./src/platform/qt/platform_info.ts":
/*!******************************************!*\
  !*** ./src/platform/qt/platform_info.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");

const QtPlatformInfo = {
    os() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            const osName = Qt.platform.os;
            switch (osName) {
                case "android":
                    return "Android";
                case "ios":
                    return "iOS";
                case "tvos":
                    return "TvOS";
                case "linux":
                    return "Linux";
                case "osx":
                    return "Darwin";
                case "qnx":
                    return "QNX";
                case "windows":
                case "winrt":
                    return "Windows";
                case "wasm":
                    return "Wasm";
                default:
                    return "Unknown";
            }
        });
    },
    osVersion(fallback) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            return Promise.resolve(fallback || "Unknown");
        });
    },
    arch(fallback) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            return Promise.resolve(fallback || "Unknown");
        });
    },
    locale() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__awaiter)(this, void 0, void 0, function* () {
            const locale = Qt.locale();
            return Promise.resolve(locale ? locale.name.replace("_", "-") : "und");
        });
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (QtPlatformInfo);


/***/ }),

/***/ "./src/platform/qt/storage.ts":
/*!************************************!*\
  !*** ./src/platform/qt/storage.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _core_storage_utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../core/storage/utils.js */ "./src/core/storage/utils.ts");
/* harmony import */ var _core_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/utils.js */ "./src/core/utils.ts");
/* harmony import */ var _core_log_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../core/log.js */ "./src/core/log.ts");




const LOG_TAG = "platform.qt.Storage";
const DATABASE_NAME = "Glean";
const ESTIMATED_DATABASE_SIZE = 150 * 2 * 10 ** 3;
const SEPARATOR = "+";
function getKeyValueArrayFromNestedObject(value, index = "", result = []) {
    if ((0,_core_utils_js__WEBPACK_IMPORTED_MODULE_0__.isObject)(value)) {
        const keys = Object.keys(value);
        for (const key of keys) {
            const target = value[key];
            if (!(0,_core_utils_js__WEBPACK_IMPORTED_MODULE_0__.isUndefined)(target)) {
                getKeyValueArrayFromNestedObject(target, `${index}${key}${SEPARATOR}`, result);
            }
        }
    }
    else {
        result.push([index.slice(0, -1), JSON.stringify(value)]);
    }
    return result;
}
function queryResultToJSONObject(queryResult) {
    if (!queryResult || queryResult.rows.length === 0) {
        return;
    }
    const obj = {};
    for (let i = 0; i < queryResult.rows.length; i++) {
        const item = queryResult.rows.item(i);
        const index = item.key.split(SEPARATOR);
        let target = obj;
        for (const key of index.slice(0, -1)) {
            if ((0,_core_utils_js__WEBPACK_IMPORTED_MODULE_0__.isUndefined)(target[key])) {
                target[key] = {};
            }
            target = target[key];
        }
        try {
            target[index[index.length - 1]] = JSON.parse(item.value);
        }
        catch (e) {
            target[index[index.length - 1]] = item.value;
        }
    }
    return obj;
}
class QMLStore {
    constructor(tableName, name = DATABASE_NAME) {
        this.tableName = tableName;
        this.name = name;
        const logTag = `${LOG_TAG}.${tableName}`;
        this.initialized = this.executeQuery(`CREATE TABLE IF NOT EXISTS ${tableName}(key VARCHAR(255), value VARCHAR(255));`, logTag);
        this.logTag = logTag;
    }
    createKeyFromIndex(index) {
        return index.join(SEPARATOR);
    }
    getDbHandle(logTag) {
        try {
            const handle = LocalStorage.LocalStorage.openDatabaseSync(this.name, "1.0", `${this.name} Storage`, ESTIMATED_DATABASE_SIZE);
            this.dbHandle = handle;
        }
        catch (e) {
            (0,_core_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(logTag || this.logTag, ["Error while attempting to access LocalStorage.\n", e], _core_log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Debug);
        }
        finally {
            return this.dbHandle;
        }
    }
    executeQuery(query, logTag) {
        const handle = this.getDbHandle(logTag);
        if (!handle) {
            return Promise.reject();
        }
        return new Promise((resolve, reject) => {
            try {
                handle.transaction((tx) => {
                    const result = tx.executeSql(query);
                    resolve(result);
                });
            }
            catch (e) {
                (0,_core_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(logTag || this.logTag, [`Error executing LocalStorage query: ${query}.\n`, e], _core_log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Debug);
                reject();
            }
        });
    }
    executeOnceInitialized(query) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__awaiter)(this, void 0, void 0, function* () {
            yield this.initialized;
            return this.executeQuery(query);
        });
    }
    getFullResultObject(index) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__awaiter)(this, void 0, void 0, function* () {
            const key = this.createKeyFromIndex(index);
            const result = yield this.executeOnceInitialized(`SELECT * FROM ${this.tableName} WHERE key LIKE "${key}%"`);
            return queryResultToJSONObject(result);
        });
    }
    getWholeStore() {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__awaiter)(this, void 0, void 0, function* () {
            const result = yield this.executeOnceInitialized(`SELECT * FROM ${this.tableName}`);
            return queryResultToJSONObject(result);
        });
    }
    get(index = []) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__awaiter)(this, void 0, void 0, function* () {
            if (index.length === 0) {
                return this.getWholeStore();
            }
            const obj = (yield this.getFullResultObject(index)) || {};
            try {
                return (0,_core_storage_utils_js__WEBPACK_IMPORTED_MODULE_3__.getValueFromNestedObject)(obj, index);
            }
            catch (e) {
                (0,_core_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.logTag, ["Error getting value from database.", e]);
            }
        });
    }
    update(index, transformFn) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__awaiter)(this, void 0, void 0, function* () {
            const result = (yield this.getFullResultObject(index)) || {};
            const transformedResult = (0,_core_storage_utils_js__WEBPACK_IMPORTED_MODULE_3__.updateNestedObject)(result, index, transformFn);
            const updates = getKeyValueArrayFromNestedObject(transformedResult);
            for (const update of updates) {
                const [key, value] = update;
                const escapedValue = value.replace("'", "''");
                const updateResult = yield this.executeOnceInitialized(`UPDATE ${this.tableName} SET value='${escapedValue}' WHERE key='${key}'`);
                if (!(updateResult === null || updateResult === void 0 ? void 0 : updateResult.rows.length)) {
                    yield this.executeOnceInitialized(`INSERT INTO ${this.tableName}(key, value) VALUES('${key}', '${escapedValue}');`);
                }
            }
        });
    }
    delete(index) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__awaiter)(this, void 0, void 0, function* () {
            const key = this.createKeyFromIndex(index);
            yield this.executeOnceInitialized(`DELETE FROM ${this.tableName} WHERE key LIKE "${key}%"`);
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (QMLStore);


/***/ }),

/***/ "./src/platform/qt/uploader.ts":
/*!*************************************!*\
  !*** ./src/platform/qt/uploader.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/tslib/tslib.es6.js");
/* harmony import */ var _core_log_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../core/log.js */ "./src/core/log.ts");
/* harmony import */ var _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/upload/uploader.js */ "./src/core/upload/uploader.ts");
/* harmony import */ var _core_utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../core/utils.js */ "./src/core/utils.ts");





const LOG_TAG = "platform.qt.Uploader";
class QtUploader extends _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
    post(url, body, headers = {}) {
        return (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__awaiter)(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.timeout = _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_UPLOAD_TIMEOUT_MS;
                xhr.open("POST", url);
                for (const header in headers) {
                    xhr.setRequestHeader(header, headers[header]);
                }
                xhr.ontimeout = function (e) {
                    (0,_core_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, ["Timeout while attempting to upload ping.\n", e.type], _core_log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Error);
                    resolve(new _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__.UploadResult(0));
                };
                xhr.onerror = function (e) {
                    (0,_core_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, ["Network error while attempting to upload ping.\n", e.type], _core_log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Error);
                    resolve(new _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__.UploadResult(0));
                };
                xhr.onabort = function (e) {
                    (0,_core_log_js__WEBPACK_IMPORTED_MODULE_2__["default"])(LOG_TAG, ["The attempt to upload ping is aborted.\n", e.type], _core_log_js__WEBPACK_IMPORTED_MODULE_2__.LoggingLevel.Error);
                    resolve(new _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__.UploadResult(0));
                };
                xhr.onload = () => {
                    resolve(new _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__.UploadResult(2, xhr.status));
                };
                if (!(0,_core_utils_js__WEBPACK_IMPORTED_MODULE_3__.isString)(body)) {
                    xhr.send(body.buffer);
                }
                else {
                    xhr.send(body);
                }
            });
        });
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new QtUploader());


/***/ }),

/***/ "./src/platform/test/index.ts":
/*!************************************!*\
  !*** ./src/platform/test/index.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _test_storage_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../test/storage.js */ "./src/platform/test/storage.ts");
/* harmony import */ var _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/upload/uploader.js */ "./src/core/upload/uploader.ts");



class MockUploader extends _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
    post(_url, _body, _headers) {
        const result = new _core_upload_uploader_js__WEBPACK_IMPORTED_MODULE_0__.UploadResult(2, 200);
        return Promise.resolve(result);
    }
}
const MockPlatformInfo = {
    os() {
        return Promise.resolve("Unknown");
    },
    osVersion() {
        return Promise.resolve("Unknown");
    },
    arch() {
        return Promise.resolve("Unknown");
    },
    locale() {
        return Promise.resolve("Unknown");
    },
};
const safeSetTimeout = typeof setTimeout !== "undefined" ? setTimeout : () => { throw new Error(); };
const safeClearTimeout = typeof clearTimeout !== "undefined" ? clearTimeout : () => { };
const TestPlatform = {
    Storage: _test_storage_js__WEBPACK_IMPORTED_MODULE_1__["default"],
    uploader: new MockUploader(),
    info: MockPlatformInfo,
    timer: { setTimeout: safeSetTimeout, clearTimeout: safeClearTimeout },
    name: "test"
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TestPlatform);


/***/ }),

/***/ "./src/platform/test/storage.ts":
/*!**************************************!*\
  !*** ./src/platform/test/storage.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _core_log_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../core/log.js */ "./src/core/log.ts");
/* harmony import */ var _core_storage_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/storage/utils.js */ "./src/core/storage/utils.ts");


const LOG_TAG = "platform.test.Storage";
let globalStore = {};
class MockStore {
    constructor(rootKey) {
        this.rootKey = rootKey;
    }
    get(index = []) {
        try {
            const value = (0,_core_storage_utils_js__WEBPACK_IMPORTED_MODULE_0__.getValueFromNestedObject)(globalStore, [this.rootKey, ...index]);
            return Promise.resolve(value);
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    update(index, transformFn) {
        try {
            globalStore = (0,_core_storage_utils_js__WEBPACK_IMPORTED_MODULE_0__.updateNestedObject)(globalStore, [this.rootKey, ...index], transformFn);
            return Promise.resolve();
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    delete(index) {
        try {
            globalStore = (0,_core_storage_utils_js__WEBPACK_IMPORTED_MODULE_0__.deleteKeyFromNestedObject)(globalStore, [this.rootKey, ...index]);
        }
        catch (e) {
            (0,_core_log_js__WEBPACK_IMPORTED_MODULE_1__["default"])(LOG_TAG, [`Error attempting to delete key ${index.toString()} from storage. Ignoring.`, e], _core_log_js__WEBPACK_IMPORTED_MODULE_1__.LoggingLevel.Warn);
        }
        return Promise.resolve();
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MockStore);


/***/ }),

/***/ "./node_modules/tslib/tslib.es6.js":
/*!*****************************************!*\
  !*** ./node_modules/tslib/tslib.es6.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "__assign": () => (/* binding */ __assign),
/* harmony export */   "__asyncDelegator": () => (/* binding */ __asyncDelegator),
/* harmony export */   "__asyncGenerator": () => (/* binding */ __asyncGenerator),
/* harmony export */   "__asyncValues": () => (/* binding */ __asyncValues),
/* harmony export */   "__await": () => (/* binding */ __await),
/* harmony export */   "__awaiter": () => (/* binding */ __awaiter),
/* harmony export */   "__classPrivateFieldGet": () => (/* binding */ __classPrivateFieldGet),
/* harmony export */   "__classPrivateFieldIn": () => (/* binding */ __classPrivateFieldIn),
/* harmony export */   "__classPrivateFieldSet": () => (/* binding */ __classPrivateFieldSet),
/* harmony export */   "__createBinding": () => (/* binding */ __createBinding),
/* harmony export */   "__decorate": () => (/* binding */ __decorate),
/* harmony export */   "__exportStar": () => (/* binding */ __exportStar),
/* harmony export */   "__extends": () => (/* binding */ __extends),
/* harmony export */   "__generator": () => (/* binding */ __generator),
/* harmony export */   "__importDefault": () => (/* binding */ __importDefault),
/* harmony export */   "__importStar": () => (/* binding */ __importStar),
/* harmony export */   "__makeTemplateObject": () => (/* binding */ __makeTemplateObject),
/* harmony export */   "__metadata": () => (/* binding */ __metadata),
/* harmony export */   "__param": () => (/* binding */ __param),
/* harmony export */   "__read": () => (/* binding */ __read),
/* harmony export */   "__rest": () => (/* binding */ __rest),
/* harmony export */   "__spread": () => (/* binding */ __spread),
/* harmony export */   "__spreadArray": () => (/* binding */ __spreadArray),
/* harmony export */   "__spreadArrays": () => (/* binding */ __spreadArrays),
/* harmony export */   "__values": () => (/* binding */ __values)
/* harmony export */ });
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    }
    return __assign.apply(this, arguments);
}

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
});

function __exportStar(m, o) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

/** @deprecated */
function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/** @deprecated */
function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
};

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __classPrivateFieldIn(state, receiver) {
    if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
    return typeof state === "function" ? receiver === state : state.has(receiver);
}


/***/ }),

/***/ "./node_modules/uuid/dist/esm-browser/native.js":
/*!******************************************************!*\
  !*** ./node_modules/uuid/dist/esm-browser/native.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  randomUUID
});

/***/ }),

/***/ "./node_modules/uuid/dist/esm-browser/regex.js":
/*!*****************************************************!*\
  !*** ./node_modules/uuid/dist/esm-browser/regex.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-browser/rng.js":
/*!***************************************************!*\
  !*** ./node_modules/uuid/dist/esm-browser/rng.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ rng)
/* harmony export */ });
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).
let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  // lazy load so that environments that need to polyfill have a chance to do so
  if (!getRandomValues) {
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);

    if (!getRandomValues) {
      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
    }
  }

  return getRandomValues(rnds8);
}

/***/ }),

/***/ "./node_modules/uuid/dist/esm-browser/stringify.js":
/*!*********************************************************!*\
  !*** ./node_modules/uuid/dist/esm-browser/stringify.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   "unsafeStringify": () => (/* binding */ unsafeStringify)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validate.js */ "./node_modules/uuid/dist/esm-browser/validate.js");

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */

const byteToHex = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}

function unsafeStringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

function stringify(arr, offset = 0) {
  const uuid = unsafeStringify(arr, offset); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (stringify);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-browser/v4.js":
/*!**************************************************!*\
  !*** ./node_modules/uuid/dist/esm-browser/v4.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./native.js */ "./node_modules/uuid/dist/esm-browser/native.js");
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./rng.js */ "./node_modules/uuid/dist/esm-browser/rng.js");
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./stringify.js */ "./node_modules/uuid/dist/esm-browser/stringify.js");




function v4(options, buf, offset) {
  if (_native_js__WEBPACK_IMPORTED_MODULE_0__["default"].randomUUID && !buf && !options) {
    return _native_js__WEBPACK_IMPORTED_MODULE_0__["default"].randomUUID();
  }

  options = options || {};
  const rnds = options.random || (options.rng || _rng_js__WEBPACK_IMPORTED_MODULE_1__["default"])(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return (0,_stringify_js__WEBPACK_IMPORTED_MODULE_2__.unsafeStringify)(rnds);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v4);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-browser/validate.js":
/*!********************************************************!*\
  !*** ./node_modules/uuid/dist/esm-browser/validate.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./regex.js */ "./node_modules/uuid/dist/esm-browser/regex.js");


function validate(uuid) {
  return typeof uuid === 'string' && _regex_js__WEBPACK_IMPORTED_MODULE_0__["default"].test(uuid);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (validate);

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!*************************!*\
  !*** ./src/entry/qt.ts ***!
  \*************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _core_error_error_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/error/error_type.js */ "./src/core/error/error_type.ts");
/* harmony import */ var _core_testing_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../core/testing/index.js */ "./src/core/testing/index.ts");
/* harmony import */ var _platform_qt_index_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../platform/qt/index.js */ "./src/platform/qt/index.ts");
/* harmony import */ var _base_async_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./base/async.js */ "./src/entry/base/async.ts");
/* harmony import */ var _core_pings_ping_type_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/pings/ping_type.js */ "./src/core/pings/ping_type.ts");
/* harmony import */ var _core_metrics_types_boolean_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../core/metrics/types/boolean.js */ "./src/core/metrics/types/boolean.ts");
/* harmony import */ var _core_metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../core/metrics/types/counter.js */ "./src/core/metrics/types/counter.ts");
/* harmony import */ var _core_metrics_types_custom_distribution_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../core/metrics/types/custom_distribution.js */ "./src/core/metrics/types/custom_distribution.ts");
/* harmony import */ var _core_metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../core/metrics/types/datetime.js */ "./src/core/metrics/types/datetime.ts");
/* harmony import */ var _core_metrics_types_event_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../core/metrics/types/event.js */ "./src/core/metrics/types/event.ts");
/* harmony import */ var _core_metrics_types_labeled_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../core/metrics/types/labeled.js */ "./src/core/metrics/types/labeled.ts");
/* harmony import */ var _core_metrics_types_memory_distribution_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../core/metrics/types/memory_distribution.js */ "./src/core/metrics/types/memory_distribution.ts");
/* harmony import */ var _core_metrics_types_quantity_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../core/metrics/types/quantity.js */ "./src/core/metrics/types/quantity.ts");
/* harmony import */ var _core_metrics_types_rate_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../core/metrics/types/rate.js */ "./src/core/metrics/types/rate.ts");
/* harmony import */ var _core_metrics_types_string_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../core/metrics/types/string.js */ "./src/core/metrics/types/string.ts");
/* harmony import */ var _core_metrics_types_string_list_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../core/metrics/types/string_list.js */ "./src/core/metrics/types/string_list.ts");
/* harmony import */ var _core_metrics_types_text_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../core/metrics/types/text.js */ "./src/core/metrics/types/text.ts");
/* harmony import */ var _core_metrics_types_timespan_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../core/metrics/types/timespan.js */ "./src/core/metrics/types/timespan.ts");
/* harmony import */ var _core_metrics_types_timing_distribution_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../core/metrics/types/timing_distribution.js */ "./src/core/metrics/types/timing_distribution.ts");
/* harmony import */ var _core_metrics_types_uuid_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../core/metrics/types/uuid.js */ "./src/core/metrics/types/uuid.ts");
/* harmony import */ var _core_metrics_types_url_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../core/metrics/types/url.js */ "./src/core/metrics/types/url.ts");





















/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Object.assign(Object.assign({}, (0,_base_async_js__WEBPACK_IMPORTED_MODULE_0__.baseAsync)(_platform_qt_index_js__WEBPACK_IMPORTED_MODULE_1__["default"])), { ErrorType: _core_error_error_type_js__WEBPACK_IMPORTED_MODULE_2__.ErrorType,
    testResetGlean: _core_testing_index_js__WEBPACK_IMPORTED_MODULE_3__.testResetGlean, _private: {
        PingType: _core_pings_ping_type_js__WEBPACK_IMPORTED_MODULE_4__["default"],
        BooleanMetricType: _core_metrics_types_boolean_js__WEBPACK_IMPORTED_MODULE_5__["default"],
        CounterMetricType: _core_metrics_types_counter_js__WEBPACK_IMPORTED_MODULE_6__["default"],
        CustomDistributionMetricType: _core_metrics_types_custom_distribution_js__WEBPACK_IMPORTED_MODULE_7__["default"],
        DatetimeMetricType: _core_metrics_types_datetime_js__WEBPACK_IMPORTED_MODULE_8__["default"],
        EventMetricType: _core_metrics_types_event_js__WEBPACK_IMPORTED_MODULE_9__["default"],
        LabeledMetricType: _core_metrics_types_labeled_js__WEBPACK_IMPORTED_MODULE_10__["default"],
        MemoryDistributionMetricType: _core_metrics_types_memory_distribution_js__WEBPACK_IMPORTED_MODULE_11__["default"],
        QuantityMetricType: _core_metrics_types_quantity_js__WEBPACK_IMPORTED_MODULE_12__["default"],
        RateMetricType: _core_metrics_types_rate_js__WEBPACK_IMPORTED_MODULE_13__["default"],
        StringMetricType: _core_metrics_types_string_js__WEBPACK_IMPORTED_MODULE_14__["default"],
        StringListMetricType: _core_metrics_types_string_list_js__WEBPACK_IMPORTED_MODULE_15__["default"],
        TimespanMetricType: _core_metrics_types_timespan_js__WEBPACK_IMPORTED_MODULE_16__["default"],
        TimingDistributionMetricType: _core_metrics_types_timing_distribution_js__WEBPACK_IMPORTED_MODULE_17__["default"],
        TextMetricType: _core_metrics_types_text_js__WEBPACK_IMPORTED_MODULE_18__["default"],
        UUIDMetricType: _core_metrics_types_uuid_js__WEBPACK_IMPORTED_MODULE_19__["default"],
        URLMetricType: _core_metrics_types_url_js__WEBPACK_IMPORTED_MODULE_20__["default"]
    } }));

})();

Glean = __webpack_exports__;
/******/ })()
;