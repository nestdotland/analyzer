// This is a fork of iroh.js
var iroh = (function () {
  "use strict";

  /**
   * @param {Class} cls
   * @param {Array} prot
   */
  function extend(cls, prot) {
    for (var key in prot) {
      if (prot[key] instanceof Function) {
        if (cls.prototype[key] instanceof Function) {
          console.log(
            ("Warning: Overwriting " + (cls.name) + ".prototype." + key),
          );
        }
        cls.prototype[key] = prot[key];
      }
    }
  }

  var version = "0.3.0";

  // indent factor
  var INDENT_FACTOR = 1;

  // minimal debug commands start with this
  var DEBUG_KEY = "$";

  // temp variable start with this
  var TEMP_VAR_BASE = "Iroh$$x";

  // detect environment
  var IS_NODE = (
    (typeof module !== "undefined" && module.exports) &&
    (typeof require !== "undefined")
  );
  var IS_BROWSER = !IS_NODE;

  var VERSION = version;

  var OP = {};
  var INSTR = {};
  var CATEGORY = {};

  (function () {
    var ii = 0;
    INSTR.PROGRAM = ii++;

    INSTR.FUNCTION_RETURN = ii++;
    INSTR.FUNCTION_CALL = ii++;
    INSTR.FUNCTION_CALL_END = ii++;
    INSTR.FUNCTION_ENTER = ii++;
    INSTR.FUNCTION_LEAVE = ii++;

    INSTR.LOOP_TEST = ii++;
    INSTR.LOOP_ENTER = ii++;
    INSTR.LOOP_LEAVE = ii++;

    INSTR.BREAK = ii++;
    INSTR.CONTINUE = ii++;

    INSTR.SWITCH_TEST = ii++;
    INSTR.SWITCH_ENTER = ii++;
    INSTR.SWITCH_LEAVE = ii++;

    INSTR.CASE_TEST = ii++;
    INSTR.CASE_ENTER = ii++;
    INSTR.CASE_LEAVE = ii++;

    INSTR.IF_TEST = ii++;
    INSTR.IF_ENTER = ii++;
    INSTR.IF_LEAVE = ii++;

    INSTR.ELSE_ENTER = ii++;
    INSTR.ELSE_LEAVE = ii++;

    INSTR.VAR_INIT = ii++;
    INSTR.VAR_DECLARE = ii++;

    INSTR.OP_NEW = ii++;
    INSTR.OP_NEW_END = ii++;

    INSTR.UNARY = ii++;
    INSTR.UPDATE = ii++;

    INSTR.SUPER = ii++;

    INSTR.THIS = ii++;

    INSTR.LITERAL = ii++;
    INSTR.IDENTIFIER = ii++;

    INSTR.BINARY = ii++;
    INSTR.LOGICAL = ii++;
    INSTR.TERNARY = ii++;
    INSTR.ASSIGN = ii++;

    INSTR.METHOD_ENTER = ii++;
    INSTR.METHOD_LEAVE = ii++;

    INSTR.TRY_ENTER = ii++;
    INSTR.TRY_LEAVE = ii++;

    INSTR.CATCH_ENTER = ii++;
    INSTR.CATCH_LEAVE = ii++;

    INSTR.FINAL_ENTER = ii++;
    INSTR.FINAL_LEAVE = ii++;

    INSTR.ALLOC = ii++;

    INSTR.MEMBER_EXPR = ii++;

    INSTR.BLOCK_ENTER = ii++;
    INSTR.BLOCK_LEAVE = ii++;

    INSTR.PROGRAM_FRAME_VALUE = ii++;
    INSTR.PROGRAM_ENTER = ii++;
    INSTR.PROGRAM_LEAVE = ii++;
  })();

  (function () {
    var ii = 0;
    CATEGORY.THIS = ii++;
    CATEGORY.UNARY = ii++;
    CATEGORY.UPDATE = ii++;
    CATEGORY.BINARY = ii++;
    CATEGORY.LOGICAL = ii++;
    CATEGORY.TERNARY = ii++;
    CATEGORY.ASSIGN = ii++;
    CATEGORY.ALLOC = ii++;
    CATEGORY.MEMBER = ii++;
    CATEGORY.LITERAL = ii++;
    CATEGORY.IDENTIFIER = ii++;
    CATEGORY.TRY = ii++;
    CATEGORY.CATCH = ii++;
    CATEGORY.FINALLY = ii++;
    CATEGORY.OP_NEW = ii++;
    CATEGORY.VAR = ii++;
    CATEGORY.IF = ii++;
    CATEGORY.ELSE = ii++;
    CATEGORY.SWITCH = ii++;
    CATEGORY.CASE = ii++;
    CATEGORY.BREAK = ii++;
    CATEGORY.CONTINUE = ii++;
    CATEGORY.LOOP = ii++;
    CATEGORY.CALL = ii++;
    CATEGORY.FUNCTION = ii++;
    CATEGORY.BLOCK = ii++;
    CATEGORY.PROGRAM = ii++;
    CATEGORY.METHOD = ii++;
    CATEGORY.SUPER = ii++;
  })();

  (function () {
    var ii = 0;
    OP["="] = ii++;
    OP["+"] = ii++;
    OP["-"] = ii++;
    OP["*"] = ii++;
    OP["/"] = ii++;
    OP["%"] = ii++;
    OP["**"] = ii++;
    OP["<<"] = ii++;
    OP[">>"] = ii++;
    OP[">>>"] = ii++;
    OP["&"] = ii++;
    OP["^"] = ii++;
    OP["|"] = ii++;
    OP["!"] = ii++;
    OP["~"] = ii++;
    OP["in"] = ii++;
    OP["void"] = ii++;
    OP["typeof"] = ii++;
    OP["delete"] = ii++;
    OP["instanceof"] = ii++;
    OP["&&"] = ii++;
    OP["||"] = ii++;
    OP["=="] = ii++;
    OP["==="] = ii++;
    OP["!="] = ii++;
    OP["!=="] = ii++;
    OP[">"] = ii++;
    OP[">="] = ii++;
    OP["<"] = ii++;
    OP["<="] = ii++;
    OP["++"] = ii++;
    OP["--"] = ii++;
  })();

  // Reserved word lists for various dialects of the language

  var reservedWords = {
    3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
    5: "class enum extends super const export import",
    6: "enum",
    strict:
      "implements interface let package private protected public static yield",
    strictBind: "eval arguments",
  };

  // And the keywords

  var ecma5AndLessKeywords =
    "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

  var keywords = {
    5: ecma5AndLessKeywords,
    "5module": ecma5AndLessKeywords + " export import",
    6: ecma5AndLessKeywords + " const class extends export import super",
  };

  var keywordRelationalOperator = /^in(stanceof)?$/;

  // ## Character categories

  // Big ugly regular expressions that match characters in the
  // whitespace, identifier, and identifier-start categories. These
  // are only applied when a character is found to actually have a
  // code point above 128.
  // Generated by `bin/generate-identifier-regex.js`.
  var nonASCIIidentifierStartChars =
    "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08c7\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d04-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31bf\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9ffc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7ca\ua7f5-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab69\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
  var nonASCIIidentifierChars =
    "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d81-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1abf\u1ac0\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua82c\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

  var nonASCIIidentifierStart = new RegExp(
    "[" + nonASCIIidentifierStartChars + "]",
  );
  var nonASCIIidentifier = new RegExp(
    "[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]",
  );

  nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

  // These are a run-length and offset encoded representation of the
  // >0xffff code points that are a valid part of identifiers. The
  // offset starts at 0x10000, and each pair of numbers represents an
  // offset to the next range, and then a size of the range. They were
  // generated by bin/generate-identifier-regex.js

  // eslint-disable-next-line comma-spacing
  var astralIdentifierStartCodes = [
    0,
    11,
    2,
    25,
    2,
    18,
    2,
    1,
    2,
    14,
    3,
    13,
    35,
    122,
    70,
    52,
    268,
    28,
    4,
    48,
    48,
    31,
    14,
    29,
    6,
    37,
    11,
    29,
    3,
    35,
    5,
    7,
    2,
    4,
    43,
    157,
    19,
    35,
    5,
    35,
    5,
    39,
    9,
    51,
    157,
    310,
    10,
    21,
    11,
    7,
    153,
    5,
    3,
    0,
    2,
    43,
    2,
    1,
    4,
    0,
    3,
    22,
    11,
    22,
    10,
    30,
    66,
    18,
    2,
    1,
    11,
    21,
    11,
    25,
    71,
    55,
    7,
    1,
    65,
    0,
    16,
    3,
    2,
    2,
    2,
    28,
    43,
    28,
    4,
    28,
    36,
    7,
    2,
    27,
    28,
    53,
    11,
    21,
    11,
    18,
    14,
    17,
    111,
    72,
    56,
    50,
    14,
    50,
    14,
    35,
    349,
    41,
    7,
    1,
    79,
    28,
    11,
    0,
    9,
    21,
    107,
    20,
    28,
    22,
    13,
    52,
    76,
    44,
    33,
    24,
    27,
    35,
    30,
    0,
    3,
    0,
    9,
    34,
    4,
    0,
    13,
    47,
    15,
    3,
    22,
    0,
    2,
    0,
    36,
    17,
    2,
    24,
    85,
    6,
    2,
    0,
    2,
    3,
    2,
    14,
    2,
    9,
    8,
    46,
    39,
    7,
    3,
    1,
    3,
    21,
    2,
    6,
    2,
    1,
    2,
    4,
    4,
    0,
    19,
    0,
    13,
    4,
    159,
    52,
    19,
    3,
    21,
    2,
    31,
    47,
    21,
    1,
    2,
    0,
    185,
    46,
    42,
    3,
    37,
    47,
    21,
    0,
    60,
    42,
    14,
    0,
    72,
    26,
    230,
    43,
    117,
    63,
    32,
    7,
    3,
    0,
    3,
    7,
    2,
    1,
    2,
    23,
    16,
    0,
    2,
    0,
    95,
    7,
    3,
    38,
    17,
    0,
    2,
    0,
    29,
    0,
    11,
    39,
    8,
    0,
    22,
    0,
    12,
    45,
    20,
    0,
    35,
    56,
    264,
    8,
    2,
    36,
    18,
    0,
    50,
    29,
    113,
    6,
    2,
    1,
    2,
    37,
    22,
    0,
    26,
    5,
    2,
    1,
    2,
    31,
    15,
    0,
    328,
    18,
    190,
    0,
    80,
    921,
    103,
    110,
    18,
    195,
    2749,
    1070,
    4050,
    582,
    8634,
    568,
    8,
    30,
    114,
    29,
    19,
    47,
    17,
    3,
    32,
    20,
    6,
    18,
    689,
    63,
    129,
    74,
    6,
    0,
    67,
    12,
    65,
    1,
    2,
    0,
    29,
    6135,
    9,
    1237,
    43,
    8,
    8952,
    286,
    50,
    2,
    18,
    3,
    9,
    395,
    2309,
    106,
    6,
    12,
    4,
    8,
    8,
    9,
    5991,
    84,
    2,
    70,
    2,
    1,
    3,
    0,
    3,
    1,
    3,
    3,
    2,
    11,
    2,
    0,
    2,
    6,
    2,
    64,
    2,
    3,
    3,
    7,
    2,
    6,
    2,
    27,
    2,
    3,
    2,
    4,
    2,
    0,
    4,
    6,
    2,
    339,
    3,
    24,
    2,
    24,
    2,
    30,
    2,
    24,
    2,
    30,
    2,
    24,
    2,
    30,
    2,
    24,
    2,
    30,
    2,
    24,
    2,
    7,
    2357,
    44,
    11,
    6,
    17,
    0,
    370,
    43,
    1301,
    196,
    60,
    67,
    8,
    0,
    1205,
    3,
    2,
    26,
    2,
    1,
    2,
    0,
    3,
    0,
    2,
    9,
    2,
    3,
    2,
    0,
    2,
    0,
    7,
    0,
    5,
    0,
    2,
    0,
    2,
    0,
    2,
    2,
    2,
    1,
    2,
    0,
    3,
    0,
    2,
    0,
    2,
    0,
    2,
    0,
    2,
    0,
    2,
    1,
    2,
    0,
    3,
    3,
    2,
    6,
    2,
    3,
    2,
    3,
    2,
    0,
    2,
    9,
    2,
    16,
    6,
    2,
    2,
    4,
    2,
    16,
    4421,
    42717,
    35,
    4148,
    12,
    221,
    3,
    5761,
    15,
    7472,
    3104,
    541,
    1507,
    4938,
  ];

  // eslint-disable-next-line comma-spacing
  var astralIdentifierCodes = [
    509,
    0,
    227,
    0,
    150,
    4,
    294,
    9,
    1368,
    2,
    2,
    1,
    6,
    3,
    41,
    2,
    5,
    0,
    166,
    1,
    574,
    3,
    9,
    9,
    370,
    1,
    154,
    10,
    176,
    2,
    54,
    14,
    32,
    9,
    16,
    3,
    46,
    10,
    54,
    9,
    7,
    2,
    37,
    13,
    2,
    9,
    6,
    1,
    45,
    0,
    13,
    2,
    49,
    13,
    9,
    3,
    2,
    11,
    83,
    11,
    7,
    0,
    161,
    11,
    6,
    9,
    7,
    3,
    56,
    1,
    2,
    6,
    3,
    1,
    3,
    2,
    10,
    0,
    11,
    1,
    3,
    6,
    4,
    4,
    193,
    17,
    10,
    9,
    5,
    0,
    82,
    19,
    13,
    9,
    214,
    6,
    3,
    8,
    28,
    1,
    83,
    16,
    16,
    9,
    82,
    12,
    9,
    9,
    84,
    14,
    5,
    9,
    243,
    14,
    166,
    9,
    71,
    5,
    2,
    1,
    3,
    3,
    2,
    0,
    2,
    1,
    13,
    9,
    120,
    6,
    3,
    6,
    4,
    0,
    29,
    9,
    41,
    6,
    2,
    3,
    9,
    0,
    10,
    10,
    47,
    15,
    406,
    7,
    2,
    7,
    17,
    9,
    57,
    21,
    2,
    13,
    123,
    5,
    4,
    0,
    2,
    1,
    2,
    6,
    2,
    0,
    9,
    9,
    49,
    4,
    2,
    1,
    2,
    4,
    9,
    9,
    330,
    3,
    19306,
    9,
    135,
    4,
    60,
    6,
    26,
    9,
    1014,
    0,
    2,
    54,
    8,
    3,
    82,
    0,
    12,
    1,
    19628,
    1,
    5319,
    4,
    4,
    5,
    9,
    7,
    3,
    6,
    31,
    3,
    149,
    2,
    1418,
    49,
    513,
    54,
    5,
    49,
    9,
    0,
    15,
    0,
    23,
    4,
    2,
    14,
    1361,
    6,
    2,
    16,
    3,
    6,
    2,
    1,
    2,
    4,
    262,
    6,
    10,
    9,
    419,
    13,
    1495,
    6,
    110,
    6,
    6,
    9,
    4759,
    9,
    787719,
    239,
  ];

  // This has a complexity linear to the value of the code. The
  // assumption is that looking up astral identifier characters is
  // rare.
  function isInAstralSet(code, set) {
    var pos = 0x10000;
    for (var i = 0; i < set.length; i += 2) {
      pos += set[i];
      if (pos > code) return false;
      pos += set[i + 1];
      if (pos >= code) return true;
    }
  }

  // Test whether a given character code starts an identifier.

  function isIdentifierStart(code, astral) {
    if (code < 65) return code === 36;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123) return true;
    if (code <= 0xffff) {
      return code >= 0xaa &&
        nonASCIIidentifierStart.test(String.fromCharCode(code));
    }
    if (astral === false) return false;
    return isInAstralSet(code, astralIdentifierStartCodes);
  }

  // Test whether a given character is part of an identifier.

  function isIdentifierChar(code, astral) {
    if (code < 48) return code === 36;
    if (code < 58) return true;
    if (code < 65) return false;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123) return true;
    if (code <= 0xffff) {
      return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
    }
    if (astral === false) return false;
    return isInAstralSet(code, astralIdentifierStartCodes) ||
      isInAstralSet(code, astralIdentifierCodes);
  }

  // ## Token types

  // The assignment of fine-grained, information-carrying type objects
  // allows the tokenizer to store the information it has about a
  // token in a way that is very cheap for the parser to look up.

  // All token type variables start with an underscore, to make them
  // easy to recognize.

  // The `beforeExpr` property is used to disambiguate between regular
  // expressions and divisions. It is set on all token types that can
  // be followed by an expression (thus, a slash after them would be a
  // regular expression).
  //
  // The `startsExpr` property is used to check if the token ends a
  // `yield` expression. It is set on all token types that either can
  // directly start an expression (like a quotation mark) or can
  // continue an expression (like the body of a string).
  //
  // `isLoop` marks a keyword as starting a loop, which is important
  // to know when parsing a label, in order to allow or disallow
  // continue jumps to that label.

  var TokenType = function TokenType(label, conf) {
    if (conf === void 0) conf = {};

    this.label = label;
    this.keyword = conf.keyword;
    this.beforeExpr = !!conf.beforeExpr;
    this.startsExpr = !!conf.startsExpr;
    this.isLoop = !!conf.isLoop;
    this.isAssign = !!conf.isAssign;
    this.prefix = !!conf.prefix;
    this.postfix = !!conf.postfix;
    this.binop = conf.binop || null;
    this.updateContext = null;
  };

  function binop(name, prec) {
    return new TokenType(name, { beforeExpr: true, binop: prec });
  }
  var beforeExpr = { beforeExpr: true }, startsExpr = { startsExpr: true };

  // Map keyword names to token types.

  var keywords$1 = {};

  // Succinct definitions of keyword token types
  function kw(name, options) {
    if (options === void 0) options = {};

    options.keyword = name;
    return keywords$1[name] = new TokenType(name, options);
  }

  var types = {
    num: new TokenType("num", startsExpr),
    regexp: new TokenType("regexp", startsExpr),
    string: new TokenType("string", startsExpr),
    name: new TokenType("name", startsExpr),
    eof: new TokenType("eof"),

    // Punctuation token types.
    bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
    bracketR: new TokenType("]"),
    braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
    braceR: new TokenType("}"),
    parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
    parenR: new TokenType(")"),
    comma: new TokenType(",", beforeExpr),
    semi: new TokenType(";", beforeExpr),
    colon: new TokenType(":", beforeExpr),
    dot: new TokenType("."),
    question: new TokenType("?", beforeExpr),
    questionDot: new TokenType("?."),
    arrow: new TokenType("=>", beforeExpr),
    template: new TokenType("template"),
    invalidTemplate: new TokenType("invalidTemplate"),
    ellipsis: new TokenType("...", beforeExpr),
    backQuote: new TokenType("`", startsExpr),
    dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),

    // Operators. These carry several kinds of properties to help the
    // parser use them properly (the presence of these properties is
    // what categorizes them as operators).
    //
    // `binop`, when present, specifies that this operator is a binary
    // operator, and will refer to its precedence.
    //
    // `prefix` and `postfix` mark the operator as a prefix or postfix
    // unary operator.
    //
    // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
    // binary operators with a very low precedence, that should result
    // in AssignmentExpression nodes.

    eq: new TokenType("=", { beforeExpr: true, isAssign: true }),
    assign: new TokenType("_=", { beforeExpr: true, isAssign: true }),
    incDec: new TokenType(
      "++/--",
      { prefix: true, postfix: true, startsExpr: true },
    ),
    prefix: new TokenType(
      "!/~",
      { beforeExpr: true, prefix: true, startsExpr: true },
    ),
    logicalOR: binop("||", 1),
    logicalAND: binop("&&", 2),
    bitwiseOR: binop("|", 3),
    bitwiseXOR: binop("^", 4),
    bitwiseAND: binop("&", 5),
    equality: binop("==/!=/===/!==", 6),
    relational: binop("</>/<=/>=", 7),
    bitShift: binop("<</>>/>>>", 8),
    plusMin: new TokenType(
      "+/-",
      { beforeExpr: true, binop: 9, prefix: true, startsExpr: true },
    ),
    modulo: binop("%", 10),
    star: binop("*", 10),
    slash: binop("/", 10),
    starstar: new TokenType("**", { beforeExpr: true }),
    coalesce: binop("??", 1),

    // Keyword token types.
    _break: kw("break"),
    _case: kw("case", beforeExpr),
    _catch: kw("catch"),
    _continue: kw("continue"),
    _debugger: kw("debugger"),
    _default: kw("default", beforeExpr),
    _do: kw("do", { isLoop: true, beforeExpr: true }),
    _else: kw("else", beforeExpr),
    _finally: kw("finally"),
    _for: kw("for", { isLoop: true }),
    _function: kw("function", startsExpr),
    _if: kw("if"),
    _return: kw("return", beforeExpr),
    _switch: kw("switch"),
    _throw: kw("throw", beforeExpr),
    _try: kw("try"),
    _var: kw("var"),
    _const: kw("const"),
    _while: kw("while", { isLoop: true }),
    _with: kw("with"),
    _new: kw("new", { beforeExpr: true, startsExpr: true }),
    _this: kw("this", startsExpr),
    _super: kw("super", startsExpr),
    _class: kw("class", startsExpr),
    _extends: kw("extends", beforeExpr),
    _export: kw("export"),
    _import: kw("import", startsExpr),
    _null: kw("null", startsExpr),
    _true: kw("true", startsExpr),
    _false: kw("false", startsExpr),
    _in: kw("in", { beforeExpr: true, binop: 7 }),
    _instanceof: kw("instanceof", { beforeExpr: true, binop: 7 }),
    _typeof: kw("typeof", { beforeExpr: true, prefix: true, startsExpr: true }),
    _void: kw("void", { beforeExpr: true, prefix: true, startsExpr: true }),
    _delete: kw("delete", { beforeExpr: true, prefix: true, startsExpr: true }),
  };

  // Matches a whole line break (where CRLF is considered a single
  // line break). Used to count lines.

  var lineBreak = /\r\n?|\n|\u2028|\u2029/;
  var lineBreakG = new RegExp(lineBreak.source, "g");

  function isNewLine(code, ecma2019String) {
    return code === 10 || code === 13 ||
      (!ecma2019String && (code === 0x2028 || code === 0x2029));
  }

  var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

  var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

  var ref = Object.prototype;
  var hasOwnProperty = ref.hasOwnProperty;
  var toString = ref.toString;

  // Checks if an object has a property.

  function has(obj, propName) {
    return hasOwnProperty.call(obj, propName);
  }

  var isArray = Array.isArray || (function (obj) {
    return (
      toString.call(obj) === "[object Array]"
    );
  });

  function wordsRegexp(words) {
    return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$");
  }

  // These are used when `options.locations` is on, for the
  // `startLoc` and `endLoc` properties.

  var Position = function Position(line, col) {
    this.line = line;
    this.column = col;
  };

  Position.prototype.offset = function offset(n) {
    return new Position(this.line, this.column + n);
  };

  var SourceLocation = function SourceLocation(p, start, end) {
    this.start = start;
    this.end = end;
    if (p.sourceFile !== null) this.source = p.sourceFile;
  };

  // The `getLineInfo` function is mostly useful when the
  // `locations` option is off (for performance reasons) and you
  // want to find the line/column position for a given character
  // offset. `input` should be the code string that the offset refers
  // into.

  function getLineInfo(input, offset) {
    for (var line = 1, cur = 0;;) {
      lineBreakG.lastIndex = cur;
      var match = lineBreakG.exec(input);
      if (match && match.index < offset) {
        ++line;
        cur = match.index + match[0].length;
      } else {
        return new Position(line, offset - cur);
      }
    }
  }

  // A second argument must be given to configure the parser process.
  // These options are recognized (only `ecmaVersion` is required):

  var defaultOptions = {
    // `ecmaVersion` indicates the ECMAScript version to parse. Must be
    // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
    // (2019), 11 (2020), 12 (2021), or `"latest"` (the latest version
    // the library supports). This influences support for strict mode,
    // the set of reserved words, and support for new syntax features.
    ecmaVersion: null,
    // `sourceType` indicates the mode the code should be parsed in.
    // Can be either `"script"` or `"module"`. This influences global
    // strict mode and parsing of `import` and `export` declarations.
    sourceType: "script",
    // `onInsertedSemicolon` can be a callback that will be called
    // when a semicolon is automatically inserted. It will be passed
    // the position of the comma as an offset, and if `locations` is
    // enabled, it is given the location as a `{line, column}` object
    // as second argument.
    onInsertedSemicolon: null,
    // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
    // trailing commas.
    onTrailingComma: null,
    // By default, reserved words are only enforced if ecmaVersion >= 5.
    // Set `allowReserved` to a boolean value to explicitly turn this on
    // an off. When this option has the value "never", reserved words
    // and keywords can also not be used as property names.
    allowReserved: null,
    // When enabled, a return at the top level is not considered an
    // error.
    allowReturnOutsideFunction: false,
    // When enabled, import/export statements are not constrained to
    // appearing at the top of the program.
    allowImportExportEverywhere: false,
    // When enabled, await identifiers are allowed to appear at the top-level scope,
    // but they are still not allowed in non-async functions.
    allowAwaitOutsideFunction: false,
    // When enabled, hashbang directive in the beginning of file
    // is allowed and treated as a line comment.
    allowHashBang: false,
    // When `locations` is on, `loc` properties holding objects with
    // `start` and `end` properties in `{line, column}` form (with
    // line being 1-based and column 0-based) will be attached to the
    // nodes.
    locations: false,
    // A function can be passed as `onToken` option, which will
    // cause Acorn to call that function with object in the same
    // format as tokens returned from `tokenizer().getToken()`. Note
    // that you are not allowed to call the parser from the
    // callback—that will corrupt its internal state.
    onToken: null,
    // A function can be passed as `onComment` option, which will
    // cause Acorn to call that function with `(block, text, start,
    // end)` parameters whenever a comment is skipped. `block` is a
    // boolean indicating whether this is a block (`/* */`) comment,
    // `text` is the content of the comment, and `start` and `end` are
    // character offsets that denote the start and end of the comment.
    // When the `locations` option is on, two more parameters are
    // passed, the full `{line, column}` locations of the start and
    // end of the comments. Note that you are not allowed to call the
    // parser from the callback—that will corrupt its internal state.
    onComment: null,
    // Nodes have their start and end characters offsets recorded in
    // `start` and `end` properties (directly on the node, rather than
    // the `loc` object, which holds line/column data. To also add a
    // [semi-standardized][range] `range` property holding a `[start,
    // end]` array with the same numbers, set the `ranges` option to
    // `true`.
    //
    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
    ranges: false,
    // It is possible to parse multiple files into a single AST by
    // passing the tree produced by parsing the first file as
    // `program` option in subsequent parses. This will add the
    // toplevel forms of the parsed file to the `Program` (top) node
    // of an existing parse tree.
    program: null,
    // When `locations` is on, you can pass this to record the source
    // file in every node's `loc` object.
    sourceFile: null,
    // This value, if given, is stored in every node, whether
    // `locations` is on or off.
    directSourceFile: null,
    // When enabled, parenthesized expressions are represented by
    // (non-standard) ParenthesizedExpression nodes
    preserveParens: false,
  };

  // Interpret and default an options object

  var warnedAboutEcmaVersion = false;

  function getOptions(opts) {
    var options = {};

    for (var opt in defaultOptions) {
      options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt];
    }

    if (options.ecmaVersion === "latest") {
      options.ecmaVersion = 1e8;
    } else if (options.ecmaVersion == null) {
      if (
        !warnedAboutEcmaVersion && typeof console === "object" && console.warn
      ) {
        warnedAboutEcmaVersion = true;
        console.warn(
          "Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future.",
        );
      }
      options.ecmaVersion = 11;
    } else if (options.ecmaVersion >= 2015) {
      options.ecmaVersion -= 2009;
    }

    if (options.allowReserved == null) {
      options.allowReserved = options.ecmaVersion < 5;
    }

    if (isArray(options.onToken)) {
      var tokens = options.onToken;
      options.onToken = function (token) {
        return tokens.push(token);
      };
    }
    if (isArray(options.onComment)) {
      options.onComment = pushComment(options, options.onComment);
    }

    return options;
  }

  function pushComment(options, array) {
    return function (block, text, start, end, startLoc, endLoc) {
      var comment = {
        type: block ? "Block" : "Line",
        value: text,
        start: start,
        end: end,
      };
      if (options.locations) {
        comment.loc = new SourceLocation(this, startLoc, endLoc);
      }
      if (options.ranges) {
        comment.range = [start, end];
      }
      array.push(comment);
    };
  }

  // Each scope gets a bitset that may contain these flags
  var SCOPE_TOP = 1,
    SCOPE_FUNCTION = 2,
    SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION,
    SCOPE_ASYNC = 4,
    SCOPE_GENERATOR = 8,
    SCOPE_ARROW = 16,
    SCOPE_SIMPLE_CATCH = 32,
    SCOPE_SUPER = 64,
    SCOPE_DIRECT_SUPER = 128;

  function functionFlags(async, generator) {
    return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) |
      (generator ? SCOPE_GENERATOR : 0);
  }

  // Used in checkLVal* and declareName to determine the type of a binding
  var BIND_NONE = 0, // Not a binding
    BIND_VAR = 1, // Var-style binding
    BIND_LEXICAL = 2, // Let- or const-style binding
    BIND_FUNCTION = 3, // Function declaration
    BIND_SIMPLE_CATCH = 4, // Simple (identifier pattern) catch binding
    BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

  var Parser = function Parser(options, input, startPos) {
    this.options = options = getOptions(options);
    this.sourceFile = options.sourceFile;
    this.keywords = wordsRegexp(
      keywords[
        options.ecmaVersion >= 6
          ? 6
          : options.sourceType === "module"
          ? "5module"
          : 5
      ],
    );
    var reserved = "";
    if (options.allowReserved !== true) {
      for (var v = options.ecmaVersion;; v--) {
        if (reserved = reservedWords[v]) break;
      }
      if (options.sourceType === "module") reserved += " await";
    }
    this.reservedWords = wordsRegexp(reserved);
    var reservedStrict = (reserved ? reserved + " " : "") +
      reservedWords.strict;
    this.reservedWordsStrict = wordsRegexp(reservedStrict);
    this.reservedWordsStrictBind = wordsRegexp(
      reservedStrict + " " + reservedWords.strictBind,
    );
    this.input = String(input);

    // Used to signal to callers of `readWord1` whether the word
    // contained any escape sequences. This is needed because words with
    // escape sequences must not be interpreted as keywords.
    this.containsEsc = false;

    // Set up token state

    // The current position of the tokenizer in the input.
    if (startPos) {
      this.pos = startPos;
      this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
      this.curLine =
        this.input.slice(0, this.lineStart).split(lineBreak).length;
    } else {
      this.pos = this.lineStart = 0;
      this.curLine = 1;
    }

    // Properties of the current token:
    // Its type
    this.type = types.eof;
    // For tokens that include more information than their type, the value
    this.value = null;
    // Its start and end offset
    this.start = this.end = this.pos;
    // And, if locations are used, the {line, column} object
    // corresponding to those offsets
    this.startLoc = this.endLoc = this.curPosition();

    // Position information for the previous token
    this.lastTokEndLoc = this.lastTokStartLoc = null;
    this.lastTokStart = this.lastTokEnd = this.pos;

    // The context stack is used to superficially track syntactic
    // context to predict whether a regular expression is allowed in a
    // given position.
    this.context = this.initialContext();
    this.exprAllowed = true;

    // Figure out if it's a module code.
    this.inModule = options.sourceType === "module";
    this.strict = this.inModule || this.strictDirective(this.pos);

    // Used to signify the start of a potential arrow function
    this.potentialArrowAt = -1;

    // Positions to delayed-check that yield/await does not exist in default parameters.
    this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
    // Labels in scope.
    this.labels = [];
    // Thus-far undefined exports.
    this.undefinedExports = {};

    // If enabled, skip leading hashbang line.
    if (
      this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!"
    ) {
      this.skipLineComment(2);
    }

    // Scope tracking for duplicate variable names (see scope.js)
    this.scopeStack = [];
    this.enterScope(SCOPE_TOP);

    // For RegExp validation
    this.regexpState = null;
  };

  var prototypeAccessors = {
    inFunction: { configurable: true },
    inGenerator: { configurable: true },
    inAsync: { configurable: true },
    allowSuper: { configurable: true },
    allowDirectSuper: { configurable: true },
    treatFunctionsAsVar: { configurable: true },
    inNonArrowFunction: { configurable: true },
  };

  Parser.prototype.parse = function parse() {
    var node = this.options.program || this.startNode();
    this.nextToken();
    return this.parseTopLevel(node);
  };

  prototypeAccessors.inFunction.get = function () {
    return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0;
  };
  prototypeAccessors.inGenerator.get = function () {
    return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0;
  };
  prototypeAccessors.inAsync.get = function () {
    return (this.currentVarScope().flags & SCOPE_ASYNC) > 0;
  };
  prototypeAccessors.allowSuper.get = function () {
    return (this.currentThisScope().flags & SCOPE_SUPER) > 0;
  };
  prototypeAccessors.allowDirectSuper.get = function () {
    return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0;
  };
  prototypeAccessors.treatFunctionsAsVar.get = function () {
    return this.treatFunctionsAsVarInScope(this.currentScope());
  };
  prototypeAccessors.inNonArrowFunction.get = function () {
    return (this.currentThisScope().flags & SCOPE_FUNCTION) > 0;
  };

  Parser.extend = function extend() {
    var arguments$1 = arguments;

    var plugins = [], len = arguments.length;
    while (len--) plugins[len] = arguments$1[len];

    var cls = this;
    for (var i = 0; i < plugins.length; i++) cls = plugins[i](cls);
    return cls;
  };

  Parser.parse = function parse(input, options) {
    return new this(options, input).parse();
  };

  Parser.parseExpressionAt = function parseExpressionAt(input, pos, options) {
    var parser = new this(options, input, pos);
    parser.nextToken();
    return parser.parseExpression();
  };

  Parser.tokenizer = function tokenizer(input, options) {
    return new this(options, input);
  };

  Object.defineProperties(Parser.prototype, prototypeAccessors);

  var pp = Parser.prototype;

  // ## Parser utilities

  var literal = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)")/;
  pp.strictDirective = function (start) {
    for (;;) {
      // Try to find string literal.
      skipWhiteSpace.lastIndex = start;
      start += skipWhiteSpace.exec(this.input)[0].length;
      var match = literal.exec(this.input.slice(start));
      if (!match) return false;
      if ((match[1] || match[2]) === "use strict") {
        skipWhiteSpace.lastIndex = start + match[0].length;
        var spaceAfter = skipWhiteSpace.exec(this.input),
          end = spaceAfter.index + spaceAfter[0].length;
        var next = this.input.charAt(end);
        return next === ";" || next === "}" ||
          (lineBreak.test(spaceAfter[0]) &&
            !(/[(`.[+\-/*%<>=,?^&]/.test(next) ||
              next === "!" && this.input.charAt(end + 1) === "="));
      }
      start += match[0].length;

      // Skip semicolon, if any.
      skipWhiteSpace.lastIndex = start;
      start += skipWhiteSpace.exec(this.input)[0].length;
      if (this.input[start] === ";") {
        start++;
      }
    }
  };

  // Predicate that tests whether the next token is of the given
  // type, and if yes, consumes it as a side effect.

  pp.eat = function (type) {
    if (this.type === type) {
      this.next();
      return true;
    } else {
      return false;
    }
  };

  // Tests whether parsed token is a contextual keyword.

  pp.isContextual = function (name) {
    return this.type === types.name && this.value === name && !this.containsEsc;
  };

  // Consumes contextual keyword if possible.

  pp.eatContextual = function (name) {
    if (!this.isContextual(name)) return false;
    this.next();
    return true;
  };

  // Asserts that following token is given contextual keyword.

  pp.expectContextual = function (name) {
    if (!this.eatContextual(name)) this.unexpected();
  };

  // Test whether a semicolon can be inserted at the current position.

  pp.canInsertSemicolon = function () {
    return this.type === types.eof ||
      this.type === types.braceR ||
      lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
  };

  pp.insertSemicolon = function () {
    if (this.canInsertSemicolon()) {
      if (this.options.onInsertedSemicolon) {
        this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
      }
      return true;
    }
  };

  // Consume a semicolon, or, failing that, see if we are allowed to
  // pretend that there is a semicolon at this position.

  pp.semicolon = function () {
    if (!this.eat(types.semi) && !this.insertSemicolon()) this.unexpected();
  };

  pp.afterTrailingComma = function (tokType, notNext) {
    if (this.type === tokType) {
      if (this.options.onTrailingComma) {
        this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
      }
      if (!notNext) {
        this.next();
      }
      return true;
    }
  };

  // Expect a token of a given type. If found, consume it, otherwise,
  // raise an unexpected token error.

  pp.expect = function (type) {
    this.eat(type) || this.unexpected();
  };

  // Raise an unexpected token error.

  pp.unexpected = function (pos) {
    this.raise(pos != null ? pos : this.start, "Unexpected token");
  };

  function DestructuringErrors() {
    this.shorthandAssign = this.trailingComma = this.parenthesizedAssign = this
      .parenthesizedBind = this.doubleProto = -1;
  }

  pp.checkPatternErrors = function (refDestructuringErrors, isAssign) {
    if (!refDestructuringErrors) return;
    if (refDestructuringErrors.trailingComma > -1) {
      this.raiseRecoverable(
        refDestructuringErrors.trailingComma,
        "Comma is not permitted after the rest element",
      );
    }
    var parens = isAssign
      ? refDestructuringErrors.parenthesizedAssign
      : refDestructuringErrors.parenthesizedBind;
    if (parens > -1) this.raiseRecoverable(parens, "Parenthesized pattern");
  };

  pp.checkExpressionErrors = function (refDestructuringErrors, andThrow) {
    if (!refDestructuringErrors) return false;
    var shorthandAssign = refDestructuringErrors.shorthandAssign;
    var doubleProto = refDestructuringErrors.doubleProto;
    if (!andThrow) return shorthandAssign >= 0 || doubleProto >= 0;
    if (shorthandAssign >= 0) {
      this.raise(
        shorthandAssign,
        "Shorthand property assignments are valid only in destructuring patterns",
      );
    }
    if (doubleProto >= 0) {
      this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property");
    }
  };

  pp.checkYieldAwaitInDefaultParams = function () {
    if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos)) {
      this.raise(this.yieldPos, "Yield expression cannot be a default value");
    }
    if (this.awaitPos) {
      this.raise(this.awaitPos, "Await expression cannot be a default value");
    }
  };

  pp.isSimpleAssignTarget = function (expr) {
    if (expr.type === "ParenthesizedExpression") {
      return this.isSimpleAssignTarget(expr.expression);
    }
    return expr.type === "Identifier" || expr.type === "MemberExpression";
  };

  var pp$1 = Parser.prototype;

  // ### Statement parsing

  // Parse a program. Initializes the parser, reads any number of
  // statements, and wraps them in a Program node.  Optionally takes a
  // `program` argument.  If present, the statements will be appended
  // to its body instead of creating a new node.

  pp$1.parseTopLevel = function (node) {
    var exports = {};
    if (!node.body) node.body = [];
    while (this.type !== types.eof) {
      var stmt = this.parseStatement(null, true, exports);
      node.body.push(stmt);
    }
    if (this.inModule) {
      for (
        var i = 0, list = Object.keys(this.undefinedExports);
        i < list.length;
        i += 1
      ) {
        var name = list[i];

        this.raiseRecoverable(
          this.undefinedExports[name].start,
          ("Export '" + name + "' is not defined"),
        );
      }
    }
    this.adaptDirectivePrologue(node.body);
    this.next();
    node.sourceType = this.options.sourceType;
    return this.finishNode(node, "Program");
  };

  var loopLabel = { kind: "loop" }, switchLabel = { kind: "switch" };

  pp$1.isLet = function (context) {
    if (this.options.ecmaVersion < 6 || !this.isContextual("let")) return false;
    skipWhiteSpace.lastIndex = this.pos;
    var skip = skipWhiteSpace.exec(this.input);
    var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
    // For ambiguous cases, determine if a LexicalDeclaration (or only a
    // Statement) is allowed here. If context is not empty then only a Statement
    // is allowed. However, `let [` is an explicit negative lookahead for
    // ExpressionStatement, so special-case it first.
    if (nextCh === 91) return true; // '['
    if (context) return false;

    if (nextCh === 123) return true; // '{'
    if (isIdentifierStart(nextCh, true)) {
      var pos = next + 1;
      while (isIdentifierChar(this.input.charCodeAt(pos), true)) ++pos;
      var ident = this.input.slice(next, pos);
      if (!keywordRelationalOperator.test(ident)) return true;
    }
    return false;
  };

  // check 'async [no LineTerminator here] function'
  // - 'async /*foo*/ function' is OK.
  // - 'async /*\n*/ function' is invalid.
  pp$1.isAsyncFunction = function () {
    if (this.options.ecmaVersion < 8 || !this.isContextual("async")) {
      return false;
    }

    skipWhiteSpace.lastIndex = this.pos;
    var skip = skipWhiteSpace.exec(this.input);
    var next = this.pos + skip[0].length;
    return !lineBreak.test(this.input.slice(this.pos, next)) &&
      this.input.slice(next, next + 8) === "function" &&
      (next + 8 === this.input.length ||
        !isIdentifierChar(this.input.charAt(next + 8)));
  };

  // Parse a single statement.
  //
  // If expecting a statement and finding a slash operator, parse a
  // regular expression literal. This is to handle cases like
  // `if (foo) /blah/.exec(foo)`, where looking at the previous token
  // does not help.

  pp$1.parseStatement = function (context, topLevel, exports) {
    var starttype = this.type, node = this.startNode(), kind;

    if (this.isLet(context)) {
      starttype = types._var;
      kind = "let";
    }

    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.

    switch (starttype) {
      case types._break:
      case types._continue:
        return this.parseBreakContinueStatement(node, starttype.keyword);
      case types._debugger:
        return this.parseDebuggerStatement(node);
      case types._do:
        return this.parseDoStatement(node);
      case types._for:
        return this.parseForStatement(node);
      case types._function:
        // Function as sole body of either an if statement or a labeled statement
        // works, but not when it is part of a labeled statement that is the sole
        // body of an if statement.
        if (
          (context &&
            (this.strict || context !== "if" && context !== "label")) &&
          this.options.ecmaVersion >= 6
        ) {
          this.unexpected();
        }
        return this.parseFunctionStatement(node, false, !context);
      case types._class:
        if (context) this.unexpected();
        return this.parseClass(node, true);
      case types._if:
        return this.parseIfStatement(node);
      case types._return:
        return this.parseReturnStatement(node);
      case types._switch:
        return this.parseSwitchStatement(node);
      case types._throw:
        return this.parseThrowStatement(node);
      case types._try:
        return this.parseTryStatement(node);
      case types._const:
      case types._var:
        kind = kind || this.value;
        if (context && kind !== "var") this.unexpected();
        return this.parseVarStatement(node, kind);
      case types._while:
        return this.parseWhileStatement(node);
      case types._with:
        return this.parseWithStatement(node);
      case types.braceL:
        return this.parseBlock(true, node);
      case types.semi:
        return this.parseEmptyStatement(node);
      case types._export:
      case types._import:
        if (this.options.ecmaVersion > 10 && starttype === types._import) {
          skipWhiteSpace.lastIndex = this.pos;
          var skip = skipWhiteSpace.exec(this.input);
          var next = this.pos + skip[0].length,
            nextCh = this.input.charCodeAt(next);
          if (nextCh === 40 || nextCh === 46) { // '(' or '.'
            return this.parseExpressionStatement(node, this.parseExpression());
          }
        }

        if (!this.options.allowImportExportEverywhere) {
          if (!topLevel) {
            this.raise(
              this.start,
              "'import' and 'export' may only appear at the top level",
            );
          }
          if (!this.inModule) {
            this.raise(
              this.start,
              "'import' and 'export' may appear only with 'sourceType: module'",
            );
          }
        }
        return starttype === types._import
          ? this.parseImport(node)
          : this.parseExport(node, exports);

        // If the statement does not start with a statement keyword or a
      // brace, it's an ExpressionStatement or LabeledStatement. We
      // simply start parsing an expression, and afterwards, if the
      // next token is a colon and the expression was a simple
      // Identifier node, we switch to interpreting it as a label.

      default:
        if (this.isAsyncFunction()) {
          if (context) this.unexpected();
          this.next();
          return this.parseFunctionStatement(node, true, !context);
        }

        var maybeName = this.value, expr = this.parseExpression();
        if (
          starttype === types.name && expr.type === "Identifier" &&
          this.eat(types.colon)
        ) {
          return this.parseLabeledStatement(node, maybeName, expr, context);
        } else return this.parseExpressionStatement(node, expr);
    }
  };

  pp$1.parseBreakContinueStatement = function (node, keyword) {
    var isBreak = keyword === "break";
    this.next();
    if (this.eat(types.semi) || this.insertSemicolon()) node.label = null;
    else if (this.type !== types.name) this.unexpected();
    else {
      node.label = this.parseIdent();
      this.semicolon();
    }

    // Verify that there is an actual destination to break or
    // continue to.
    var i = 0;
    for (; i < this.labels.length; ++i) {
      var lab = this.labels[i];
      if (node.label == null || lab.name === node.label.name) {
        if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
        if (node.label && isBreak) break;
      }
    }
    if (i === this.labels.length) {
      this.raise(node.start, "Unsyntactic " + keyword);
    }
    return this.finishNode(
      node,
      isBreak ? "BreakStatement" : "ContinueStatement",
    );
  };

  pp$1.parseDebuggerStatement = function (node) {
    this.next();
    this.semicolon();
    return this.finishNode(node, "DebuggerStatement");
  };

  pp$1.parseDoStatement = function (node) {
    this.next();
    this.labels.push(loopLabel);
    node.body = this.parseStatement("do");
    this.labels.pop();
    this.expect(types._while);
    node.test = this.parseParenExpression();
    if (this.options.ecmaVersion >= 6) {
      this.eat(types.semi);
    } else {
      this.semicolon();
    }
    return this.finishNode(node, "DoWhileStatement");
  };

  // Disambiguating between a `for` and a `for`/`in` or `for`/`of`
  // loop is non-trivial. Basically, we have to parse the init `var`
  // statement or expression, disallowing the `in` operator (see
  // the second parameter to `parseExpression`), and then check
  // whether the next token is `in` or `of`. When there is no init
  // part (semicolon immediately after the opening parenthesis), it
  // is a regular `for` loop.

  pp$1.parseForStatement = function (node) {
    this.next();
    var awaitAt = (this.options.ecmaVersion >= 9 &&
        (this.inAsync ||
          (!this.inFunction && this.options.allowAwaitOutsideFunction)) &&
        this.eatContextual("await"))
      ? this.lastTokStart
      : -1;
    this.labels.push(loopLabel);
    this.enterScope(0);
    this.expect(types.parenL);
    if (this.type === types.semi) {
      if (awaitAt > -1) this.unexpected(awaitAt);
      return this.parseFor(node, null);
    }
    var isLet = this.isLet();
    if (this.type === types._var || this.type === types._const || isLet) {
      var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
      this.next();
      this.parseVar(init$1, true, kind);
      this.finishNode(init$1, "VariableDeclaration");
      if (
        (this.type === types._in ||
          (this.options.ecmaVersion >= 6 && this.isContextual("of"))) &&
        init$1.declarations.length === 1
      ) {
        if (this.options.ecmaVersion >= 9) {
          if (this.type === types._in) {
            if (awaitAt > -1) this.unexpected(awaitAt);
          } else node.await = awaitAt > -1;
        }
        return this.parseForIn(node, init$1);
      }
      if (awaitAt > -1) this.unexpected(awaitAt);
      return this.parseFor(node, init$1);
    }
    var refDestructuringErrors = new DestructuringErrors();
    var init = this.parseExpression(true, refDestructuringErrors);
    if (
      this.type === types._in ||
      (this.options.ecmaVersion >= 6 && this.isContextual("of"))
    ) {
      if (this.options.ecmaVersion >= 9) {
        if (this.type === types._in) {
          if (awaitAt > -1) this.unexpected(awaitAt);
        } else node.await = awaitAt > -1;
      }
      this.toAssignable(init, false, refDestructuringErrors);
      this.checkLValPattern(init);
      return this.parseForIn(node, init);
    } else {
      this.checkExpressionErrors(refDestructuringErrors, true);
    }
    if (awaitAt > -1) this.unexpected(awaitAt);
    return this.parseFor(node, init);
  };

  pp$1.parseFunctionStatement = function (node, isAsync, declarationPosition) {
    this.next();
    return this.parseFunction(
      node,
      FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT),
      false,
      isAsync,
    );
  };

  pp$1.parseIfStatement = function (node) {
    this.next();
    node.test = this.parseParenExpression();
    // allow function declarations in branches, but only in non-strict mode
    node.consequent = this.parseStatement("if");
    node.alternate = this.eat(types._else) ? this.parseStatement("if") : null;
    return this.finishNode(node, "IfStatement");
  };

  pp$1.parseReturnStatement = function (node) {
    if (!this.inFunction && !this.options.allowReturnOutsideFunction) {
      this.raise(this.start, "'return' outside of function");
    }
    this.next();

    // In `return` (and `break`/`continue`), the keywords with
    // optional arguments, we eagerly look for a semicolon or the
    // possibility to insert one.

    if (this.eat(types.semi) || this.insertSemicolon()) node.argument = null;
    else {
      node.argument = this.parseExpression();
      this.semicolon();
    }
    return this.finishNode(node, "ReturnStatement");
  };

  pp$1.parseSwitchStatement = function (node) {
    this.next();
    node.discriminant = this.parseParenExpression();
    node.cases = [];
    this.expect(types.braceL);
    this.labels.push(switchLabel);
    this.enterScope(0);

    // Statements under must be grouped (by label) in SwitchCase
    // nodes. `cur` is used to keep the node that we are currently
    // adding statements to.

    var cur;
    for (var sawDefault = false; this.type !== types.braceR;) {
      if (this.type === types._case || this.type === types._default) {
        var isCase = this.type === types._case;
        if (cur) this.finishNode(cur, "SwitchCase");
        node.cases.push(cur = this.startNode());
        cur.consequent = [];
        this.next();
        if (isCase) {
          cur.test = this.parseExpression();
        } else {
          if (sawDefault) {
            this.raiseRecoverable(
              this.lastTokStart,
              "Multiple default clauses",
            );
          }
          sawDefault = true;
          cur.test = null;
        }
        this.expect(types.colon);
      } else {
        if (!cur) this.unexpected();
        cur.consequent.push(this.parseStatement(null));
      }
    }
    this.exitScope();
    if (cur) this.finishNode(cur, "SwitchCase");
    this.next(); // Closing brace
    this.labels.pop();
    return this.finishNode(node, "SwitchStatement");
  };

  pp$1.parseThrowStatement = function (node) {
    this.next();
    if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) {
      this.raise(this.lastTokEnd, "Illegal newline after throw");
    }
    node.argument = this.parseExpression();
    this.semicolon();
    return this.finishNode(node, "ThrowStatement");
  };

  // Reused empty array added for node fields that are always empty.

  var empty = [];

  pp$1.parseTryStatement = function (node) {
    this.next();
    node.block = this.parseBlock();
    node.handler = null;
    if (this.type === types._catch) {
      var clause = this.startNode();
      this.next();
      if (this.eat(types.parenL)) {
        clause.param = this.parseBindingAtom();
        var simple = clause.param.type === "Identifier";
        this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
        this.checkLValPattern(
          clause.param,
          simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL,
        );
        this.expect(types.parenR);
      } else {
        if (this.options.ecmaVersion < 10) this.unexpected();
        clause.param = null;
        this.enterScope(0);
      }
      clause.body = this.parseBlock(false);
      this.exitScope();
      node.handler = this.finishNode(clause, "CatchClause");
    }
    node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
    if (!node.handler && !node.finalizer) {
      this.raise(node.start, "Missing catch or finally clause");
    }
    return this.finishNode(node, "TryStatement");
  };

  pp$1.parseVarStatement = function (node, kind) {
    this.next();
    this.parseVar(node, false, kind);
    this.semicolon();
    return this.finishNode(node, "VariableDeclaration");
  };

  pp$1.parseWhileStatement = function (node) {
    this.next();
    node.test = this.parseParenExpression();
    this.labels.push(loopLabel);
    node.body = this.parseStatement("while");
    this.labels.pop();
    return this.finishNode(node, "WhileStatement");
  };

  pp$1.parseWithStatement = function (node) {
    if (this.strict) this.raise(this.start, "'with' in strict mode");
    this.next();
    node.object = this.parseParenExpression();
    node.body = this.parseStatement("with");
    return this.finishNode(node, "WithStatement");
  };

  pp$1.parseEmptyStatement = function (node) {
    this.next();
    return this.finishNode(node, "EmptyStatement");
  };

  pp$1.parseLabeledStatement = function (node, maybeName, expr, context) {
    for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1) {
      var label = list[i$1];

      if (label.name === maybeName) {
        this.raise(expr.start, "Label '" + maybeName + "' is already declared");
      }
    }
    var kind = this.type.isLoop
      ? "loop"
      : this.type === types._switch
      ? "switch"
      : null;
    for (var i = this.labels.length - 1; i >= 0; i--) {
      var label$1 = this.labels[i];
      if (label$1.statementStart === node.start) {
        // Update information about previous labels on this node
        label$1.statementStart = this.start;
        label$1.kind = kind;
      } else break;
    }
    this.labels.push(
      { name: maybeName, kind: kind, statementStart: this.start },
    );
    node.body = this.parseStatement(
      context
        ? context.indexOf("label") === -1 ? context + "label" : context
        : "label",
    );
    this.labels.pop();
    node.label = expr;
    return this.finishNode(node, "LabeledStatement");
  };

  pp$1.parseExpressionStatement = function (node, expr) {
    node.expression = expr;
    this.semicolon();
    return this.finishNode(node, "ExpressionStatement");
  };

  // Parse a semicolon-enclosed block of statements, handling `"use
  // strict"` declarations when `allowStrict` is true (used for
  // function bodies).

  pp$1.parseBlock = function (createNewLexicalScope, node, exitStrict) {
    if (createNewLexicalScope === void 0) createNewLexicalScope = true;
    if (node === void 0) node = this.startNode();

    node.body = [];
    this.expect(types.braceL);
    if (createNewLexicalScope) this.enterScope(0);
    while (this.type !== types.braceR) {
      var stmt = this.parseStatement(null);
      node.body.push(stmt);
    }
    if (exitStrict) this.strict = false;
    this.next();
    if (createNewLexicalScope) this.exitScope();
    return this.finishNode(node, "BlockStatement");
  };

  // Parse a regular `for` loop. The disambiguation code in
  // `parseStatement` will already have parsed the init statement or
  // expression.

  pp$1.parseFor = function (node, init) {
    node.init = init;
    this.expect(types.semi);
    node.test = this.type === types.semi ? null : this.parseExpression();
    this.expect(types.semi);
    node.update = this.type === types.parenR ? null : this.parseExpression();
    this.expect(types.parenR);
    node.body = this.parseStatement("for");
    this.exitScope();
    this.labels.pop();
    return this.finishNode(node, "ForStatement");
  };

  // Parse a `for`/`in` and `for`/`of` loop, which are almost
  // same from parser's perspective.

  pp$1.parseForIn = function (node, init) {
    var isForIn = this.type === types._in;
    this.next();

    if (
      init.type === "VariableDeclaration" &&
      init.declarations[0].init != null &&
      (
        !isForIn ||
        this.options.ecmaVersion < 8 ||
        this.strict ||
        init.kind !== "var" ||
        init.declarations[0].id.type !== "Identifier"
      )
    ) {
      this.raise(
        init.start,
        ((isForIn ? "for-in" : "for-of") +
          " loop variable declaration may not have an initializer"),
      );
    }
    node.left = init;
    node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
    this.expect(types.parenR);
    node.body = this.parseStatement("for");
    this.exitScope();
    this.labels.pop();
    return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
  };

  // Parse a list of variable declarations.

  pp$1.parseVar = function (node, isFor, kind) {
    node.declarations = [];
    node.kind = kind;
    for (;;) {
      var decl = this.startNode();
      this.parseVarId(decl, kind);
      if (this.eat(types.eq)) {
        decl.init = this.parseMaybeAssign(isFor);
      } else if (
        kind === "const" &&
        !(this.type === types._in ||
          (this.options.ecmaVersion >= 6 && this.isContextual("of")))
      ) {
        this.unexpected();
      } else if (
        decl.id.type !== "Identifier" &&
        !(isFor && (this.type === types._in || this.isContextual("of")))
      ) {
        this.raise(
          this.lastTokEnd,
          "Complex binding patterns require an initialization value",
        );
      } else {
        decl.init = null;
      }
      node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
      if (!this.eat(types.comma)) break;
    }
    return node;
  };

  pp$1.parseVarId = function (decl, kind) {
    decl.id = this.parseBindingAtom();
    this.checkLValPattern(
      decl.id,
      kind === "var" ? BIND_VAR : BIND_LEXICAL,
      false,
    );
  };

  var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;

  // Parse a function declaration or literal (depending on the
  // `statement & FUNC_STATEMENT`).

  // Remove `allowExpressionBody` for 7.0.0, as it is only called with false
  pp$1.parseFunction = function (
    node,
    statement,
    allowExpressionBody,
    isAsync,
  ) {
    this.initFunction(node);
    if (
      this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync
    ) {
      if (this.type === types.star && (statement & FUNC_HANGING_STATEMENT)) {
        this.unexpected();
      }
      node.generator = this.eat(types.star);
    }
    if (this.options.ecmaVersion >= 8) {
      node.async = !!isAsync;
    }

    if (statement & FUNC_STATEMENT) {
      node.id = (statement & FUNC_NULLABLE_ID) && this.type !== types.name
        ? null
        : this.parseIdent();
      if (node.id && !(statement & FUNC_HANGING_STATEMENT)) { // If it is a regular function declaration in sloppy mode, then it is
        // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
        // mode depends on properties of the current scope (see
        // treatFunctionsAsVar).
        this.checkLValSimple(
          node.id,
          (this.strict || node.generator || node.async)
            ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL
            : BIND_FUNCTION,
        );
      }
    }

    var oldYieldPos = this.yieldPos,
      oldAwaitPos = this.awaitPos,
      oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    this.enterScope(functionFlags(node.async, node.generator));

    if (!(statement & FUNC_STATEMENT)) {
      node.id = this.type === types.name ? this.parseIdent() : null;
    }

    this.parseFunctionParams(node);
    this.parseFunctionBody(node, allowExpressionBody, false);

    this.yieldPos = oldYieldPos;
    this.awaitPos = oldAwaitPos;
    this.awaitIdentPos = oldAwaitIdentPos;
    return this.finishNode(
      node,
      (statement & FUNC_STATEMENT)
        ? "FunctionDeclaration"
        : "FunctionExpression",
    );
  };

  pp$1.parseFunctionParams = function (node) {
    this.expect(types.parenL);
    node.params = this.parseBindingList(
      types.parenR,
      false,
      this.options.ecmaVersion >= 8,
    );
    this.checkYieldAwaitInDefaultParams();
  };

  // Parse a class declaration or literal (depending on the
  // `isStatement` parameter).

  pp$1.parseClass = function (node, isStatement) {
    this.next();

    // ecma-262 14.6 Class Definitions
    // A class definition is always strict mode code.
    var oldStrict = this.strict;
    this.strict = true;

    this.parseClassId(node, isStatement);
    this.parseClassSuper(node);
    var classBody = this.startNode();
    var hadConstructor = false;
    classBody.body = [];
    this.expect(types.braceL);
    while (this.type !== types.braceR) {
      var element = this.parseClassElement(node.superClass !== null);
      if (element) {
        classBody.body.push(element);
        if (
          element.type === "MethodDefinition" && element.kind === "constructor"
        ) {
          if (hadConstructor) {
            this.raise(
              element.start,
              "Duplicate constructor in the same class",
            );
          }
          hadConstructor = true;
        }
      }
    }
    this.strict = oldStrict;
    this.next();
    node.body = this.finishNode(classBody, "ClassBody");
    return this.finishNode(
      node,
      isStatement ? "ClassDeclaration" : "ClassExpression",
    );
  };

  pp$1.parseClassElement = function (constructorAllowsSuper) {
    var this$1 = this;

    if (this.eat(types.semi)) return null;

    var method = this.startNode();
    var tryContextual = function (k, noLineBreak) {
      if (noLineBreak === void 0) noLineBreak = false;

      var start = this$1.start, startLoc = this$1.startLoc;
      if (!this$1.eatContextual(k)) return false;
      if (
        this$1.type !== types.parenL &&
        (!noLineBreak || !this$1.canInsertSemicolon())
      ) {
        return true;
      }
      if (method.key) this$1.unexpected();
      method.computed = false;
      method.key = this$1.startNodeAt(start, startLoc);
      method.key.name = k;
      this$1.finishNode(method.key, "Identifier");
      return false;
    };

    method.kind = "method";
    method.static = tryContextual("static");
    var isGenerator = this.eat(types.star);
    var isAsync = false;
    if (!isGenerator) {
      if (this.options.ecmaVersion >= 8 && tryContextual("async", true)) {
        isAsync = true;
        isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
      } else if (tryContextual("get")) {
        method.kind = "get";
      } else if (tryContextual("set")) {
        method.kind = "set";
      }
    }
    if (!method.key) this.parsePropertyName(method);
    var key = method.key;
    var allowsDirectSuper = false;
    if (
      !method.computed && !method.static &&
      (key.type === "Identifier" && key.name === "constructor" ||
        key.type === "Literal" && key.value === "constructor")
    ) {
      if (method.kind !== "method") {
        this.raise(key.start, "Constructor can't have get/set modifier");
      }
      if (isGenerator) {
        this.raise(key.start, "Constructor can't be a generator");
      }
      if (isAsync) {
        this.raise(key.start, "Constructor can't be an async method");
      }
      method.kind = "constructor";
      allowsDirectSuper = constructorAllowsSuper;
    } else if (
      method.static && key.type === "Identifier" && key.name === "prototype"
    ) {
      this.raise(
        key.start,
        "Classes may not have a static property named prototype",
      );
    }
    this.parseClassMethod(method, isGenerator, isAsync, allowsDirectSuper);
    if (method.kind === "get" && method.value.params.length !== 0) {
      this.raiseRecoverable(method.value.start, "getter should have no params");
    }
    if (method.kind === "set" && method.value.params.length !== 1) {
      this.raiseRecoverable(
        method.value.start,
        "setter should have exactly one param",
      );
    }
    if (
      method.kind === "set" && method.value.params[0].type === "RestElement"
    ) {
      this.raiseRecoverable(
        method.value.params[0].start,
        "Setter cannot use rest params",
      );
    }
    return method;
  };

  pp$1.parseClassMethod = function (
    method,
    isGenerator,
    isAsync,
    allowsDirectSuper,
  ) {
    method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);
    return this.finishNode(method, "MethodDefinition");
  };

  pp$1.parseClassId = function (node, isStatement) {
    if (this.type === types.name) {
      node.id = this.parseIdent();
      if (isStatement) {
        this.checkLValSimple(node.id, BIND_LEXICAL, false);
      }
    } else {
      if (isStatement === true) {
        this.unexpected();
      }
      node.id = null;
    }
  };

  pp$1.parseClassSuper = function (node) {
    node.superClass = this.eat(types._extends)
      ? this.parseExprSubscripts()
      : null;
  };

  // Parses module export declaration.

  pp$1.parseExport = function (node, exports) {
    this.next();
    // export * from '...'
    if (this.eat(types.star)) {
      if (this.options.ecmaVersion >= 11) {
        if (this.eatContextual("as")) {
          node.exported = this.parseIdent(true);
          this.checkExport(exports, node.exported.name, this.lastTokStart);
        } else {
          node.exported = null;
        }
      }
      this.expectContextual("from");
      if (this.type !== types.string) this.unexpected();
      node.source = this.parseExprAtom();
      this.semicolon();
      return this.finishNode(node, "ExportAllDeclaration");
    }
    if (this.eat(types._default)) { // export default ...
      this.checkExport(exports, "default", this.lastTokStart);
      var isAsync;
      if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
        var fNode = this.startNode();
        this.next();
        if (isAsync) this.next();
        node.declaration = this.parseFunction(
          fNode,
          FUNC_STATEMENT | FUNC_NULLABLE_ID,
          false,
          isAsync,
        );
      } else if (this.type === types._class) {
        var cNode = this.startNode();
        node.declaration = this.parseClass(cNode, "nullableID");
      } else {
        node.declaration = this.parseMaybeAssign();
        this.semicolon();
      }
      return this.finishNode(node, "ExportDefaultDeclaration");
    }
    // export var|const|let|function|class ...
    if (this.shouldParseExportStatement()) {
      node.declaration = this.parseStatement(null);
      if (node.declaration.type === "VariableDeclaration") {
        this.checkVariableExport(exports, node.declaration.declarations);
      } else {
        this.checkExport(
          exports,
          node.declaration.id.name,
          node.declaration.id.start,
        );
      }
      node.specifiers = [];
      node.source = null;
    } else { // export { x, y as z } [from '...']
      node.declaration = null;
      node.specifiers = this.parseExportSpecifiers(exports);
      if (this.eatContextual("from")) {
        if (this.type !== types.string) this.unexpected();
        node.source = this.parseExprAtom();
      } else {
        for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
          // check for keywords used as local names
          var spec = list[i];

          this.checkUnreserved(spec.local);
          // check if export is defined
          this.checkLocalExport(spec.local);
        }

        node.source = null;
      }
      this.semicolon();
    }
    return this.finishNode(node, "ExportNamedDeclaration");
  };

  pp$1.checkExport = function (exports, name, pos) {
    if (!exports) return;
    if (has(exports, name)) {
      this.raiseRecoverable(pos, "Duplicate export '" + name + "'");
    }
    exports[name] = true;
  };

  pp$1.checkPatternExport = function (exports, pat) {
    var type = pat.type;
    if (type === "Identifier") {
      this.checkExport(exports, pat.name, pat.start);
    } else if (type === "ObjectPattern") {
      for (var i = 0, list = pat.properties; i < list.length; i += 1) {
        var prop = list[i];

        this.checkPatternExport(exports, prop);
      }
    } else if (type === "ArrayPattern") {
      for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
        var elt = list$1[i$1];

        if (elt) this.checkPatternExport(exports, elt);
      }
    } else if (type === "Property") {
      this.checkPatternExport(exports, pat.value);
    } else if (type === "AssignmentPattern") {
      this.checkPatternExport(exports, pat.left);
    } else if (type === "RestElement") {
      this.checkPatternExport(exports, pat.argument);
    } else if (type === "ParenthesizedExpression") {
      this.checkPatternExport(exports, pat.expression);
    }
  };

  pp$1.checkVariableExport = function (exports, decls) {
    if (!exports) return;
    for (var i = 0, list = decls; i < list.length; i += 1) {
      var decl = list[i];

      this.checkPatternExport(exports, decl.id);
    }
  };

  pp$1.shouldParseExportStatement = function () {
    return this.type.keyword === "var" ||
      this.type.keyword === "const" ||
      this.type.keyword === "class" ||
      this.type.keyword === "function" ||
      this.isLet() ||
      this.isAsyncFunction();
  };

  // Parses a comma-separated list of module exports.

  pp$1.parseExportSpecifiers = function (exports) {
    var nodes = [], first = true;
    // export { x, y as z } [from '...']
    this.expect(types.braceL);
    while (!this.eat(types.braceR)) {
      if (!first) {
        this.expect(types.comma);
        if (this.afterTrailingComma(types.braceR)) break;
      } else first = false;

      var node = this.startNode();
      node.local = this.parseIdent(true);
      node.exported = this.eatContextual("as")
        ? this.parseIdent(true)
        : node.local;
      this.checkExport(exports, node.exported.name, node.exported.start);
      nodes.push(this.finishNode(node, "ExportSpecifier"));
    }
    return nodes;
  };

  // Parses import declaration.

  pp$1.parseImport = function (node) {
    this.next();
    // import '...'
    if (this.type === types.string) {
      node.specifiers = empty;
      node.source = this.parseExprAtom();
    } else {
      node.specifiers = this.parseImportSpecifiers();
      this.expectContextual("from");
      node.source = this.type === types.string
        ? this.parseExprAtom()
        : this.unexpected();
    }
    this.semicolon();
    return this.finishNode(node, "ImportDeclaration");
  };

  // Parses a comma-separated list of module imports.

  pp$1.parseImportSpecifiers = function () {
    var nodes = [], first = true;
    if (this.type === types.name) {
      // import defaultObj, { x, y as z } from '...'
      var node = this.startNode();
      node.local = this.parseIdent();
      this.checkLValSimple(node.local, BIND_LEXICAL);
      nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
      if (!this.eat(types.comma)) return nodes;
    }
    if (this.type === types.star) {
      var node$1 = this.startNode();
      this.next();
      this.expectContextual("as");
      node$1.local = this.parseIdent();
      this.checkLValSimple(node$1.local, BIND_LEXICAL);
      nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
      return nodes;
    }
    this.expect(types.braceL);
    while (!this.eat(types.braceR)) {
      if (!first) {
        this.expect(types.comma);
        if (this.afterTrailingComma(types.braceR)) break;
      } else first = false;

      var node$2 = this.startNode();
      node$2.imported = this.parseIdent(true);
      if (this.eatContextual("as")) {
        node$2.local = this.parseIdent();
      } else {
        this.checkUnreserved(node$2.imported);
        node$2.local = node$2.imported;
      }
      this.checkLValSimple(node$2.local, BIND_LEXICAL);
      nodes.push(this.finishNode(node$2, "ImportSpecifier"));
    }
    return nodes;
  };

  // Set `ExpressionStatement#directive` property for directive prologues.
  pp$1.adaptDirectivePrologue = function (statements) {
    for (
      var i = 0;
      i < statements.length && this.isDirectiveCandidate(statements[i]);
      ++i
    ) {
      statements[i].directive = statements[i].expression.raw.slice(1, -1);
    }
  };
  pp$1.isDirectiveCandidate = function (statement) {
    return (
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "Literal" &&
      typeof statement.expression.value === "string" &&
      // Reject parenthesized strings.
      (this.input[statement.start] === '"' ||
        this.input[statement.start] === "'")
    );
  };

  var pp$2 = Parser.prototype;

  // Convert existing expression atom to assignable pattern
  // if possible.

  pp$2.toAssignable = function (node, isBinding, refDestructuringErrors) {
    if (this.options.ecmaVersion >= 6 && node) {
      switch (node.type) {
        case "Identifier":
          if (this.inAsync && node.name === "await") {
            this.raise(
              node.start,
              "Cannot use 'await' as identifier inside an async function",
            );
          }
          break;

        case "ObjectPattern":
        case "ArrayPattern":
        case "AssignmentPattern":
        case "RestElement":
          break;

        case "ObjectExpression":
          node.type = "ObjectPattern";
          if (refDestructuringErrors) {
            this.checkPatternErrors(refDestructuringErrors, true);
          }
          for (var i = 0, list = node.properties; i < list.length; i += 1) {
            var prop = list[i];

            this.toAssignable(prop, isBinding);
            // Early error:
            //   AssignmentRestProperty[Yield, Await] :
            //     `...` DestructuringAssignmentTarget[Yield, Await]
            //
            //   It is a Syntax Error if |DestructuringAssignmentTarget| is an |ArrayLiteral| or an |ObjectLiteral|.
            if (
              prop.type === "RestElement" &&
              (prop.argument.type === "ArrayPattern" ||
                prop.argument.type === "ObjectPattern")
            ) {
              this.raise(prop.argument.start, "Unexpected token");
            }
          }
          break;

        case "Property":
          // AssignmentProperty has type === "Property"
          if (node.kind !== "init") {
            this.raise(
              node.key.start,
              "Object pattern can't contain getter or setter",
            );
          }
          this.toAssignable(node.value, isBinding);
          break;

        case "ArrayExpression":
          node.type = "ArrayPattern";
          if (refDestructuringErrors) {
            this.checkPatternErrors(refDestructuringErrors, true);
          }
          this.toAssignableList(node.elements, isBinding);
          break;

        case "SpreadElement":
          node.type = "RestElement";
          this.toAssignable(node.argument, isBinding);
          if (node.argument.type === "AssignmentPattern") {
            this.raise(
              node.argument.start,
              "Rest elements cannot have a default value",
            );
          }
          break;

        case "AssignmentExpression":
          if (node.operator !== "=") {
            this.raise(
              node.left.end,
              "Only '=' operator can be used for specifying default value.",
            );
          }
          node.type = "AssignmentPattern";
          delete node.operator;
          this.toAssignable(node.left, isBinding);
          break;

        case "ParenthesizedExpression":
          this.toAssignable(node.expression, isBinding, refDestructuringErrors);
          break;

        case "ChainExpression":
          this.raiseRecoverable(
            node.start,
            "Optional chaining cannot appear in left-hand side",
          );
          break;

        case "MemberExpression":
          if (!isBinding) break;

        default:
          this.raise(node.start, "Assigning to rvalue");
      }
    } else if (refDestructuringErrors) {
      this.checkPatternErrors(refDestructuringErrors, true);
    }
    return node;
  };

  // Convert list of expression atoms to binding list.

  pp$2.toAssignableList = function (exprList, isBinding) {
    var end = exprList.length;
    for (var i = 0; i < end; i++) {
      var elt = exprList[i];
      if (elt) this.toAssignable(elt, isBinding);
    }
    if (end) {
      var last = exprList[end - 1];
      if (
        this.options.ecmaVersion === 6 && isBinding && last &&
        last.type === "RestElement" && last.argument.type !== "Identifier"
      ) {
        this.unexpected(last.argument.start);
      }
    }
    return exprList;
  };

  // Parses spread element.

  pp$2.parseSpread = function (refDestructuringErrors) {
    var node = this.startNode();
    this.next();
    node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    return this.finishNode(node, "SpreadElement");
  };

  pp$2.parseRestBinding = function () {
    var node = this.startNode();
    this.next();

    // RestElement inside of a function parameter must be an identifier
    if (this.options.ecmaVersion === 6 && this.type !== types.name) {
      this.unexpected();
    }

    node.argument = this.parseBindingAtom();

    return this.finishNode(node, "RestElement");
  };

  // Parses lvalue (assignable) atom.

  pp$2.parseBindingAtom = function () {
    if (this.options.ecmaVersion >= 6) {
      switch (this.type) {
        case types.bracketL:
          var node = this.startNode();
          this.next();
          node.elements = this.parseBindingList(types.bracketR, true, true);
          return this.finishNode(node, "ArrayPattern");

        case types.braceL:
          return this.parseObj(true);
      }
    }
    return this.parseIdent();
  };

  pp$2.parseBindingList = function (close, allowEmpty, allowTrailingComma) {
    var elts = [], first = true;
    while (!this.eat(close)) {
      if (first) first = false;
      else this.expect(types.comma);
      if (allowEmpty && this.type === types.comma) {
        elts.push(null);
      } else if (allowTrailingComma && this.afterTrailingComma(close)) {
        break;
      } else if (this.type === types.ellipsis) {
        var rest = this.parseRestBinding();
        this.parseBindingListItem(rest);
        elts.push(rest);
        if (this.type === types.comma) {
          this.raise(
            this.start,
            "Comma is not permitted after the rest element",
          );
        }
        this.expect(close);
        break;
      } else {
        var elem = this.parseMaybeDefault(this.start, this.startLoc);
        this.parseBindingListItem(elem);
        elts.push(elem);
      }
    }
    return elts;
  };

  pp$2.parseBindingListItem = function (param) {
    return param;
  };

  // Parses assignment pattern around given atom if possible.

  pp$2.parseMaybeDefault = function (startPos, startLoc, left) {
    left = left || this.parseBindingAtom();
    if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) return left;
    var node = this.startNodeAt(startPos, startLoc);
    node.left = left;
    node.right = this.parseMaybeAssign();
    return this.finishNode(node, "AssignmentPattern");
  };

  // The following three functions all verify that a node is an lvalue —
  // something that can be bound, or assigned to. In order to do so, they perform
  // a variety of checks:
  //
  // - Check that none of the bound/assigned-to identifiers are reserved words.
  // - Record name declarations for bindings in the appropriate scope.
  // - Check duplicate argument names, if checkClashes is set.
  //
  // If a complex binding pattern is encountered (e.g., object and array
  // destructuring), the entire pattern is recursively checked.
  //
  // There are three versions of checkLVal*() appropriate for different
  // circumstances:
  //
  // - checkLValSimple() shall be used if the syntactic construct supports
  //   nothing other than identifiers and member expressions. Parenthesized
  //   expressions are also correctly handled. This is generally appropriate for
  //   constructs for which the spec says
  //
  //   > It is a Syntax Error if AssignmentTargetType of [the production] is not
  //   > simple.
  //
  //   It is also appropriate for checking if an identifier is valid and not
  //   defined elsewhere, like import declarations or function/class identifiers.
  //
  //   Examples where this is used include:
  //     a += …;
  //     import a from '…';
  //   where a is the node to be checked.
  //
  // - checkLValPattern() shall be used if the syntactic construct supports
  //   anything checkLValSimple() supports, as well as object and array
  //   destructuring patterns. This is generally appropriate for constructs for
  //   which the spec says
  //
  //   > It is a Syntax Error if [the production] is neither an ObjectLiteral nor
  //   > an ArrayLiteral and AssignmentTargetType of [the production] is not
  //   > simple.
  //
  //   Examples where this is used include:
  //     (a = …);
  //     const a = …;
  //     try { … } catch (a) { … }
  //   where a is the node to be checked.
  //
  // - checkLValInnerPattern() shall be used if the syntactic construct supports
  //   anything checkLValPattern() supports, as well as default assignment
  //   patterns, rest elements, and other constructs that may appear within an
  //   object or array destructuring pattern.
  //
  //   As a special case, function parameters also use checkLValInnerPattern(),
  //   as they also support defaults and rest constructs.
  //
  // These functions deliberately support both assignment and binding constructs,
  // as the logic for both is exceedingly similar. If the node is the target of
  // an assignment, then bindingType should be set to BIND_NONE. Otherwise, it
  // should be set to the appropriate BIND_* constant, like BIND_VAR or
  // BIND_LEXICAL.
  //
  // If the function is called with a non-BIND_NONE bindingType, then
  // additionally a checkClashes object may be specified to allow checking for
  // duplicate argument names. checkClashes is ignored if the provided construct
  // is an assignment (i.e., bindingType is BIND_NONE).

  pp$2.checkLValSimple = function (expr, bindingType, checkClashes) {
    if (bindingType === void 0) bindingType = BIND_NONE;

    var isBind = bindingType !== BIND_NONE;

    switch (expr.type) {
      case "Identifier":
        if (this.strict && this.reservedWordsStrictBind.test(expr.name)) {
          this.raiseRecoverable(
            expr.start,
            (isBind ? "Binding " : "Assigning to ") + expr.name +
              " in strict mode",
          );
        }
        if (isBind) {
          if (bindingType === BIND_LEXICAL && expr.name === "let") {
            this.raiseRecoverable(
              expr.start,
              "let is disallowed as a lexically bound name",
            );
          }
          if (checkClashes) {
            if (has(checkClashes, expr.name)) {
              this.raiseRecoverable(expr.start, "Argument name clash");
            }
            checkClashes[expr.name] = true;
          }
          if (bindingType !== BIND_OUTSIDE) {
            this.declareName(expr.name, bindingType, expr.start);
          }
        }
        break;

      case "ChainExpression":
        this.raiseRecoverable(
          expr.start,
          "Optional chaining cannot appear in left-hand side",
        );
        break;

      case "MemberExpression":
        if (isBind) {
          this.raiseRecoverable(expr.start, "Binding member expression");
        }
        break;

      case "ParenthesizedExpression":
        if (isBind) {
          this.raiseRecoverable(expr.start, "Binding parenthesized expression");
        }
        return this.checkLValSimple(expr.expression, bindingType, checkClashes);

      default:
        this.raise(
          expr.start,
          (isBind ? "Binding" : "Assigning to") + " rvalue",
        );
    }
  };

  pp$2.checkLValPattern = function (expr, bindingType, checkClashes) {
    if (bindingType === void 0) bindingType = BIND_NONE;

    switch (expr.type) {
      case "ObjectPattern":
        for (var i = 0, list = expr.properties; i < list.length; i += 1) {
          var prop = list[i];

          this.checkLValInnerPattern(prop, bindingType, checkClashes);
        }
        break;

      case "ArrayPattern":
        for (
          var i$1 = 0, list$1 = expr.elements;
          i$1 < list$1.length;
          i$1 += 1
        ) {
          var elem = list$1[i$1];

          if (elem) this.checkLValInnerPattern(elem, bindingType, checkClashes);
        }
        break;

      default:
        this.checkLValSimple(expr, bindingType, checkClashes);
    }
  };

  pp$2.checkLValInnerPattern = function (expr, bindingType, checkClashes) {
    if (bindingType === void 0) bindingType = BIND_NONE;

    switch (expr.type) {
      case "Property":
        // AssignmentProperty has type === "Property"
        this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
        break;

      case "AssignmentPattern":
        this.checkLValPattern(expr.left, bindingType, checkClashes);
        break;

      case "RestElement":
        this.checkLValPattern(expr.argument, bindingType, checkClashes);
        break;

      default:
        this.checkLValPattern(expr, bindingType, checkClashes);
    }
  };

  // A recursive descent parser operates by defining functions for all

  var pp$3 = Parser.prototype;

  // Check if property name clashes with already added.
  // Object/class getters and setters are not allowed to clash —
  // either with each other or with an init property — and in
  // strict mode, init properties are also not allowed to be repeated.

  pp$3.checkPropClash = function (prop, propHash, refDestructuringErrors) {
    if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement") {
      return;
    }
    if (
      this.options.ecmaVersion >= 6 &&
      (prop.computed || prop.method || prop.shorthand)
    ) {
      return;
    }
    var key = prop.key;
    var name;
    switch (key.type) {
      case "Identifier":
        name = key.name;
        break;
      case "Literal":
        name = String(key.value);
        break;
      default:
        return;
    }
    var kind = prop.kind;
    if (this.options.ecmaVersion >= 6) {
      if (name === "__proto__" && kind === "init") {
        if (propHash.proto) {
          if (refDestructuringErrors) {
            if (refDestructuringErrors.doubleProto < 0) {
              refDestructuringErrors.doubleProto = key.start;
            }
            // Backwards-compat kludge. Can be removed in version 6.0
          } else {
            this.raiseRecoverable(
              key.start,
              "Redefinition of __proto__ property",
            );
          }
        }
        propHash.proto = true;
      }
      return;
    }
    name = "$" + name;
    var other = propHash[name];
    if (other) {
      var redefinition;
      if (kind === "init") {
        redefinition = this.strict && other.init || other.get || other.set;
      } else {
        redefinition = other.init || other[kind];
      }
      if (redefinition) {
        this.raiseRecoverable(key.start, "Redefinition of property");
      }
    } else {
      other = propHash[name] = {
        init: false,
        get: false,
        set: false,
      };
    }
    other[kind] = true;
  };

  // ### Expression parsing

  // These nest, from the most general expression type at the top to
  // 'atomic', nondivisible expression types at the bottom. Most of
  // the functions will simply let the function(s) below them parse,
  // and, *if* the syntactic construct they handle is present, wrap
  // the AST node that the inner parser gave them in another node.

  // Parse a full expression. The optional arguments are used to
  // forbid the `in` operator (in for loops initalization expressions)
  // and provide reference for storing '=' operator inside shorthand
  // property assignment in contexts where both object expression
  // and object pattern might appear (so it's possible to raise
  // delayed syntax error at correct position).

  pp$3.parseExpression = function (noIn, refDestructuringErrors) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
    if (this.type === types.comma) {
      var node = this.startNodeAt(startPos, startLoc);
      node.expressions = [expr];
      while (this.eat(types.comma)) {
        node.expressions.push(
          this.parseMaybeAssign(noIn, refDestructuringErrors),
        );
      }
      return this.finishNode(node, "SequenceExpression");
    }
    return expr;
  };

  // Parse an assignment expression. This includes applications of
  // operators like `+=`.

  pp$3.parseMaybeAssign = function (
    noIn,
    refDestructuringErrors,
    afterLeftParse,
  ) {
    if (this.isContextual("yield")) {
      if (this.inGenerator) return this.parseYield(noIn);
      // The tokenizer will assume an expression is allowed after
      // `yield`, but this isn't that kind of yield
      else this.exprAllowed = false;
    }

    var ownDestructuringErrors = false,
      oldParenAssign = -1,
      oldTrailingComma = -1;
    if (refDestructuringErrors) {
      oldParenAssign = refDestructuringErrors.parenthesizedAssign;
      oldTrailingComma = refDestructuringErrors.trailingComma;
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors
        .trailingComma = -1;
    } else {
      refDestructuringErrors = new DestructuringErrors();
      ownDestructuringErrors = true;
    }

    var startPos = this.start, startLoc = this.startLoc;
    if (this.type === types.parenL || this.type === types.name) {
      this.potentialArrowAt = this.start;
    }
    var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
    if (afterLeftParse) {
      left = afterLeftParse.call(this, left, startPos, startLoc);
    }
    if (this.type.isAssign) {
      var node = this.startNodeAt(startPos, startLoc);
      node.operator = this.value;
      if (this.type === types.eq) {
        left = this.toAssignable(left, false, refDestructuringErrors);
      }
      if (!ownDestructuringErrors) {
        refDestructuringErrors.parenthesizedAssign = refDestructuringErrors
          .trailingComma = refDestructuringErrors.doubleProto = -1;
      }
      if (refDestructuringErrors.shorthandAssign >= left.start) {
        refDestructuringErrors.shorthandAssign = -1;
      } // reset because shorthand default was used correctly
      if (this.type === types.eq) {
        this.checkLValPattern(left);
      } else {
        this.checkLValSimple(left);
      }
      node.left = left;
      this.next();
      node.right = this.parseMaybeAssign(noIn);
      return this.finishNode(node, "AssignmentExpression");
    } else {
      if (ownDestructuringErrors) {
        this.checkExpressionErrors(refDestructuringErrors, true);
      }
    }
    if (oldParenAssign > -1) {
      refDestructuringErrors.parenthesizedAssign = oldParenAssign;
    }
    if (oldTrailingComma > -1) {
      refDestructuringErrors.trailingComma = oldTrailingComma;
    }
    return left;
  };

  // Parse a ternary conditional (`?:`) operator.

  pp$3.parseMaybeConditional = function (noIn, refDestructuringErrors) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseExprOps(noIn, refDestructuringErrors);
    if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
    if (this.eat(types.question)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.test = expr;
      node.consequent = this.parseMaybeAssign();
      this.expect(types.colon);
      node.alternate = this.parseMaybeAssign(noIn);
      return this.finishNode(node, "ConditionalExpression");
    }
    return expr;
  };

  // Start the precedence parser.

  pp$3.parseExprOps = function (noIn, refDestructuringErrors) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseMaybeUnary(refDestructuringErrors, false);
    if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
    return expr.start === startPos && expr.type === "ArrowFunctionExpression"
      ? expr
      : this.parseExprOp(expr, startPos, startLoc, -1, noIn);
  };

  // Parse binary operators with the operator precedence parsing
  // algorithm. `left` is the left-hand side of the operator.
  // `minPrec` provides context that allows the function to stop and
  // defer further parser to one of its callers when it encounters an
  // operator that has a lower precedence than the set it is parsing.

  pp$3.parseExprOp = function (
    left,
    leftStartPos,
    leftStartLoc,
    minPrec,
    noIn,
  ) {
    var prec = this.type.binop;
    if (prec != null && (!noIn || this.type !== types._in)) {
      if (prec > minPrec) {
        var logical = this.type === types.logicalOR ||
          this.type === types.logicalAND;
        var coalesce = this.type === types.coalesce;
        if (coalesce) {
          // Handle the precedence of `tt.coalesce` as equal to the range of logical expressions.
          // In other words, `node.right` shouldn't contain logical expressions in order to check the mixed error.
          prec = types.logicalAND.binop;
        }
        var op = this.value;
        this.next();
        var startPos = this.start, startLoc = this.startLoc;
        var right = this.parseExprOp(
          this.parseMaybeUnary(null, false),
          startPos,
          startLoc,
          prec,
          noIn,
        );
        var node = this.buildBinary(
          leftStartPos,
          leftStartLoc,
          left,
          right,
          op,
          logical || coalesce,
        );
        if (
          (logical && this.type === types.coalesce) ||
          (coalesce &&
            (this.type === types.logicalOR || this.type === types.logicalAND))
        ) {
          this.raiseRecoverable(
            this.start,
            "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses",
          );
        }
        return this.parseExprOp(
          node,
          leftStartPos,
          leftStartLoc,
          minPrec,
          noIn,
        );
      }
    }
    return left;
  };

  pp$3.buildBinary = function (startPos, startLoc, left, right, op, logical) {
    var node = this.startNodeAt(startPos, startLoc);
    node.left = left;
    node.operator = op;
    node.right = right;
    return this.finishNode(
      node,
      logical ? "LogicalExpression" : "BinaryExpression",
    );
  };

  // Parse unary operators, both prefix and postfix.

  pp$3.parseMaybeUnary = function (refDestructuringErrors, sawUnary) {
    var startPos = this.start, startLoc = this.startLoc, expr;
    if (
      this.isContextual("await") &&
      (this.inAsync ||
        (!this.inFunction && this.options.allowAwaitOutsideFunction))
    ) {
      expr = this.parseAwait();
      sawUnary = true;
    } else if (this.type.prefix) {
      var node = this.startNode(), update = this.type === types.incDec;
      node.operator = this.value;
      node.prefix = true;
      this.next();
      node.argument = this.parseMaybeUnary(null, true);
      this.checkExpressionErrors(refDestructuringErrors, true);
      if (update) this.checkLValSimple(node.argument);
      else if (
        this.strict && node.operator === "delete" &&
        node.argument.type === "Identifier"
      ) {
        this.raiseRecoverable(
          node.start,
          "Deleting local variable in strict mode",
        );
      } else sawUnary = true;
      expr = this.finishNode(
        node,
        update ? "UpdateExpression" : "UnaryExpression",
      );
    } else {
      expr = this.parseExprSubscripts(refDestructuringErrors);
      if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
      while (this.type.postfix && !this.canInsertSemicolon()) {
        var node$1 = this.startNodeAt(startPos, startLoc);
        node$1.operator = this.value;
        node$1.prefix = false;
        node$1.argument = expr;
        this.checkLValSimple(expr);
        this.next();
        expr = this.finishNode(node$1, "UpdateExpression");
      }
    }

    if (!sawUnary && this.eat(types.starstar)) {
      return this.buildBinary(
        startPos,
        startLoc,
        expr,
        this.parseMaybeUnary(null, false),
        "**",
        false,
      );
    } else {
      return expr;
    }
  };

  // Parse call, dot, and `[]`-subscript expressions.

  pp$3.parseExprSubscripts = function (refDestructuringErrors) {
    var startPos = this.start, startLoc = this.startLoc;
    var expr = this.parseExprAtom(refDestructuringErrors);
    if (
      expr.type === "ArrowFunctionExpression" &&
      this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")"
    ) {
      return expr;
    }
    var result = this.parseSubscripts(expr, startPos, startLoc);
    if (refDestructuringErrors && result.type === "MemberExpression") {
      if (
        refDestructuringErrors.parenthesizedAssign >= result.start
      ) {
        refDestructuringErrors.parenthesizedAssign = -1;
      }
      if (
        refDestructuringErrors.parenthesizedBind >= result.start
      ) {
        refDestructuringErrors.parenthesizedBind = -1;
      }
    }
    return result;
  };

  pp$3.parseSubscripts = function (base, startPos, startLoc, noCalls) {
    var maybeAsyncArrow = this.options.ecmaVersion >= 8 &&
      base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd === base.end && !this.canInsertSemicolon() &&
      base.end - base.start === 5 &&
      this.potentialArrowAt === base.start;
    var optionalChained = false;

    while (true) {
      var element = this.parseSubscript(
        base,
        startPos,
        startLoc,
        noCalls,
        maybeAsyncArrow,
        optionalChained,
      );

      if (element.optional) optionalChained = true;
      if (element === base || element.type === "ArrowFunctionExpression") {
        if (optionalChained) {
          var chainNode = this.startNodeAt(startPos, startLoc);
          chainNode.expression = element;
          element = this.finishNode(chainNode, "ChainExpression");
        }
        return element;
      }

      base = element;
    }
  };

  pp$3.parseSubscript = function (
    base,
    startPos,
    startLoc,
    noCalls,
    maybeAsyncArrow,
    optionalChained,
  ) {
    var optionalSupported = this.options.ecmaVersion >= 11;
    var optional = optionalSupported && this.eat(types.questionDot);
    if (noCalls && optional) {
      this.raise(
        this.lastTokStart,
        "Optional chaining cannot appear in the callee of new expressions",
      );
    }

    var computed = this.eat(types.bracketL);
    if (
      computed ||
      (optional && this.type !== types.parenL &&
        this.type !== types.backQuote) ||
      this.eat(types.dot)
    ) {
      var node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = computed
        ? this.parseExpression()
        : this.parseIdent(this.options.allowReserved !== "never");
      node.computed = !!computed;
      if (computed) this.expect(types.bracketR);
      if (optionalSupported) {
        node.optional = optional;
      }
      base = this.finishNode(node, "MemberExpression");
    } else if (!noCalls && this.eat(types.parenL)) {
      var refDestructuringErrors = new DestructuringErrors(),
        oldYieldPos = this.yieldPos,
        oldAwaitPos = this.awaitPos,
        oldAwaitIdentPos = this.awaitIdentPos;
      this.yieldPos = 0;
      this.awaitPos = 0;
      this.awaitIdentPos = 0;
      var exprList = this.parseExprList(
        types.parenR,
        this.options.ecmaVersion >= 8,
        false,
        refDestructuringErrors,
      );
      if (
        maybeAsyncArrow && !optional && !this.canInsertSemicolon() &&
        this.eat(types.arrow)
      ) {
        this.checkPatternErrors(refDestructuringErrors, false);
        this.checkYieldAwaitInDefaultParams();
        if (this.awaitIdentPos > 0) {
          this.raise(
            this.awaitIdentPos,
            "Cannot use 'await' as identifier inside an async function",
          );
        }
        this.yieldPos = oldYieldPos;
        this.awaitPos = oldAwaitPos;
        this.awaitIdentPos = oldAwaitIdentPos;
        return this.parseArrowExpression(
          this.startNodeAt(startPos, startLoc),
          exprList,
          true,
        );
      }
      this.checkExpressionErrors(refDestructuringErrors, true);
      this.yieldPos = oldYieldPos || this.yieldPos;
      this.awaitPos = oldAwaitPos || this.awaitPos;
      this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.callee = base;
      node$1.arguments = exprList;
      if (optionalSupported) {
        node$1.optional = optional;
      }
      base = this.finishNode(node$1, "CallExpression");
    } else if (this.type === types.backQuote) {
      if (optional || optionalChained) {
        this.raise(
          this.start,
          "Optional chaining cannot appear in the tag of tagged template expressions",
        );
      }
      var node$2 = this.startNodeAt(startPos, startLoc);
      node$2.tag = base;
      node$2.quasi = this.parseTemplate({ isTagged: true });
      base = this.finishNode(node$2, "TaggedTemplateExpression");
    }
    return base;
  };

  // Parse an atomic expression — either a single token that is an
  // expression, an expression started by a keyword like `function` or
  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
  // or `{}`.

  pp$3.parseExprAtom = function (refDestructuringErrors) {
    // If a division operator appears in an expression position, the
    // tokenizer got confused, and we force it to read a regexp instead.
    if (this.type === types.slash) this.readRegexp();

    var node, canBeArrow = this.potentialArrowAt === this.start;
    switch (this.type) {
      case types._super:
        if (!this.allowSuper) {
          this.raise(this.start, "'super' keyword outside a method");
        }
        node = this.startNode();
        this.next();
        if (this.type === types.parenL && !this.allowDirectSuper) {
          this.raise(
            node.start,
            "super() call outside constructor of a subclass",
          );
        }
        // The `super` keyword can appear at below:
        // SuperProperty:
        //     super [ Expression ]
        //     super . IdentifierName
        // SuperCall:
        //     super ( Arguments )
        if (
          this.type !== types.dot && this.type !== types.bracketL &&
          this.type !== types.parenL
        ) {
          this.unexpected();
        }
        return this.finishNode(node, "Super");

      case types._this:
        node = this.startNode();
        this.next();
        return this.finishNode(node, "ThisExpression");

      case types.name:
        var startPos = this.start,
          startLoc = this.startLoc,
          containsEsc = this.containsEsc;
        var id = this.parseIdent(false);
        if (
          this.options.ecmaVersion >= 8 && !containsEsc &&
          id.name === "async" && !this.canInsertSemicolon() &&
          this.eat(types._function)
        ) {
          return this.parseFunction(
            this.startNodeAt(startPos, startLoc),
            0,
            false,
            true,
          );
        }
        if (canBeArrow && !this.canInsertSemicolon()) {
          if (this.eat(types.arrow)) {
            return this.parseArrowExpression(
              this.startNodeAt(startPos, startLoc),
              [id],
              false,
            );
          }
          if (
            this.options.ecmaVersion >= 8 && id.name === "async" &&
            this.type === types.name && !containsEsc
          ) {
            id = this.parseIdent(false);
            if (this.canInsertSemicolon() || !this.eat(types.arrow)) {
              this.unexpected();
            }
            return this.parseArrowExpression(
              this.startNodeAt(startPos, startLoc),
              [id],
              true,
            );
          }
        }
        return id;

      case types.regexp:
        var value = this.value;
        node = this.parseLiteral(value.value);
        node.regex = { pattern: value.pattern, flags: value.flags };
        return node;

      case types.num:
      case types.string:
        return this.parseLiteral(this.value);

      case types._null:
      case types._true:
      case types._false:
        node = this.startNode();
        node.value = this.type === types._null
          ? null
          : this.type === types._true;
        node.raw = this.type.keyword;
        this.next();
        return this.finishNode(node, "Literal");

      case types.parenL:
        var start = this.start,
          expr = this.parseParenAndDistinguishExpression(canBeArrow);
        if (refDestructuringErrors) {
          if (
            refDestructuringErrors.parenthesizedAssign < 0 &&
            !this.isSimpleAssignTarget(expr)
          ) {
            refDestructuringErrors.parenthesizedAssign = start;
          }
          if (refDestructuringErrors.parenthesizedBind < 0) {
            refDestructuringErrors.parenthesizedBind = start;
          }
        }
        return expr;

      case types.bracketL:
        node = this.startNode();
        this.next();
        node.elements = this.parseExprList(
          types.bracketR,
          true,
          true,
          refDestructuringErrors,
        );
        return this.finishNode(node, "ArrayExpression");

      case types.braceL:
        return this.parseObj(false, refDestructuringErrors);

      case types._function:
        node = this.startNode();
        this.next();
        return this.parseFunction(node, 0);

      case types._class:
        return this.parseClass(this.startNode(), false);

      case types._new:
        return this.parseNew();

      case types.backQuote:
        return this.parseTemplate();

      case types._import:
        if (this.options.ecmaVersion >= 11) {
          return this.parseExprImport();
        } else {
          return this.unexpected();
        }

      default:
        this.unexpected();
    }
  };

  pp$3.parseExprImport = function () {
    var node = this.startNode();

    // Consume `import` as an identifier for `import.meta`.
    // Because `this.parseIdent(true)` doesn't check escape sequences, it needs the check of `this.containsEsc`.
    if (this.containsEsc) {
      this.raiseRecoverable(this.start, "Escape sequence in keyword import");
    }
    var meta = this.parseIdent(true);

    switch (this.type) {
      case types.parenL:
        return this.parseDynamicImport(node);
      case types.dot:
        node.meta = meta;
        return this.parseImportMeta(node);
      default:
        this.unexpected();
    }
  };

  pp$3.parseDynamicImport = function (node) {
    this.next(); // skip `(`

    // Parse node.source.
    node.source = this.parseMaybeAssign();

    // Verify ending.
    if (!this.eat(types.parenR)) {
      var errorPos = this.start;
      if (this.eat(types.comma) && this.eat(types.parenR)) {
        this.raiseRecoverable(
          errorPos,
          "Trailing comma is not allowed in import()",
        );
      } else {
        this.unexpected(errorPos);
      }
    }

    return this.finishNode(node, "ImportExpression");
  };

  pp$3.parseImportMeta = function (node) {
    this.next(); // skip `.`

    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);

    if (node.property.name !== "meta") {
      this.raiseRecoverable(
        node.property.start,
        "The only valid meta property for import is 'import.meta'",
      );
    }
    if (containsEsc) {
      this.raiseRecoverable(
        node.start,
        "'import.meta' must not contain escaped characters",
      );
    }
    if (this.options.sourceType !== "module") {
      this.raiseRecoverable(
        node.start,
        "Cannot use 'import.meta' outside a module",
      );
    }

    return this.finishNode(node, "MetaProperty");
  };

  pp$3.parseLiteral = function (value) {
    var node = this.startNode();
    node.value = value;
    node.raw = this.input.slice(this.start, this.end);
    if (node.raw.charCodeAt(node.raw.length - 1) === 110) {
      node.bigint = node.raw.slice(0, -1).replace(/_/g, "");
    }
    this.next();
    return this.finishNode(node, "Literal");
  };

  pp$3.parseParenExpression = function () {
    this.expect(types.parenL);
    var val = this.parseExpression();
    this.expect(types.parenR);
    return val;
  };

  pp$3.parseParenAndDistinguishExpression = function (canBeArrow) {
    var startPos = this.start,
      startLoc = this.startLoc,
      val,
      allowTrailingComma = this.options.ecmaVersion >= 8;
    if (this.options.ecmaVersion >= 6) {
      this.next();

      var innerStartPos = this.start, innerStartLoc = this.startLoc;
      var exprList = [], first = true, lastIsComma = false;
      var refDestructuringErrors = new DestructuringErrors(),
        oldYieldPos = this.yieldPos,
        oldAwaitPos = this.awaitPos,
        spreadStart;
      this.yieldPos = 0;
      this.awaitPos = 0;
      // Do not save awaitIdentPos to allow checking awaits nested in parameters
      while (this.type !== types.parenR) {
        first ? first = false : this.expect(types.comma);
        if (allowTrailingComma && this.afterTrailingComma(types.parenR, true)) {
          lastIsComma = true;
          break;
        } else if (this.type === types.ellipsis) {
          spreadStart = this.start;
          exprList.push(this.parseParenItem(this.parseRestBinding()));
          if (this.type === types.comma) {
            this.raise(
              this.start,
              "Comma is not permitted after the rest element",
            );
          }
          break;
        } else {
          exprList.push(
            this.parseMaybeAssign(
              false,
              refDestructuringErrors,
              this.parseParenItem,
            ),
          );
        }
      }
      var innerEndPos = this.start, innerEndLoc = this.startLoc;
      this.expect(types.parenR);

      if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
        this.checkPatternErrors(refDestructuringErrors, false);
        this.checkYieldAwaitInDefaultParams();
        this.yieldPos = oldYieldPos;
        this.awaitPos = oldAwaitPos;
        return this.parseParenArrowList(startPos, startLoc, exprList);
      }

      if (!exprList.length || lastIsComma) this.unexpected(this.lastTokStart);
      if (spreadStart) this.unexpected(spreadStart);
      this.checkExpressionErrors(refDestructuringErrors, true);
      this.yieldPos = oldYieldPos || this.yieldPos;
      this.awaitPos = oldAwaitPos || this.awaitPos;

      if (exprList.length > 1) {
        val = this.startNodeAt(innerStartPos, innerStartLoc);
        val.expressions = exprList;
        this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
      } else {
        val = exprList[0];
      }
    } else {
      val = this.parseParenExpression();
    }

    if (this.options.preserveParens) {
      var par = this.startNodeAt(startPos, startLoc);
      par.expression = val;
      return this.finishNode(par, "ParenthesizedExpression");
    } else {
      return val;
    }
  };

  pp$3.parseParenItem = function (item) {
    return item;
  };

  pp$3.parseParenArrowList = function (startPos, startLoc, exprList) {
    return this.parseArrowExpression(
      this.startNodeAt(startPos, startLoc),
      exprList,
    );
  };

  // New's precedence is slightly tricky. It must allow its argument to
  // be a `[]` or dot subscript expression, but not a call — at least,
  // not without wrapping it in parentheses. Thus, it uses the noCalls
  // argument to parseSubscripts to prevent it from consuming the
  // argument list.

  var empty$1 = [];

  pp$3.parseNew = function () {
    if (this.containsEsc) {
      this.raiseRecoverable(this.start, "Escape sequence in keyword new");
    }
    var node = this.startNode();
    var meta = this.parseIdent(true);
    if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
      node.meta = meta;
      var containsEsc = this.containsEsc;
      node.property = this.parseIdent(true);
      if (node.property.name !== "target") {
        this.raiseRecoverable(
          node.property.start,
          "The only valid meta property for new is 'new.target'",
        );
      }
      if (containsEsc) {
        this.raiseRecoverable(
          node.start,
          "'new.target' must not contain escaped characters",
        );
      }
      if (!this.inNonArrowFunction) {
        this.raiseRecoverable(
          node.start,
          "'new.target' can only be used in functions",
        );
      }
      return this.finishNode(node, "MetaProperty");
    }
    var startPos = this.start,
      startLoc = this.startLoc,
      isImport = this.type === types._import;
    node.callee = this.parseSubscripts(
      this.parseExprAtom(),
      startPos,
      startLoc,
      true,
    );
    if (isImport && node.callee.type === "ImportExpression") {
      this.raise(startPos, "Cannot use new with import()");
    }
    if (this.eat(types.parenL)) {
      node.arguments = this.parseExprList(
        types.parenR,
        this.options.ecmaVersion >= 8,
        false,
      );
    } else node.arguments = empty$1;
    return this.finishNode(node, "NewExpression");
  };

  // Parse template expression.

  pp$3.parseTemplateElement = function (ref) {
    var isTagged = ref.isTagged;

    var elem = this.startNode();
    if (this.type === types.invalidTemplate) {
      if (!isTagged) {
        this.raiseRecoverable(
          this.start,
          "Bad escape sequence in untagged template literal",
        );
      }
      elem.value = {
        raw: this.value,
        cooked: null,
      };
    } else {
      elem.value = {
        raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
        cooked: this.value,
      };
    }
    this.next();
    elem.tail = this.type === types.backQuote;
    return this.finishNode(elem, "TemplateElement");
  };

  pp$3.parseTemplate = function (ref) {
    if (ref === void 0) ref = {};
    var isTagged = ref.isTagged;
    if (isTagged === void 0) isTagged = false;

    var node = this.startNode();
    this.next();
    node.expressions = [];
    var curElt = this.parseTemplateElement({ isTagged: isTagged });
    node.quasis = [curElt];
    while (!curElt.tail) {
      if (this.type === types.eof) {
        this.raise(this.pos, "Unterminated template literal");
      }
      this.expect(types.dollarBraceL);
      node.expressions.push(this.parseExpression());
      this.expect(types.braceR);
      node.quasis.push(
        curElt = this.parseTemplateElement({ isTagged: isTagged }),
      );
    }
    this.next();
    return this.finishNode(node, "TemplateLiteral");
  };

  pp$3.isAsyncProp = function (prop) {
    return !prop.computed && prop.key.type === "Identifier" &&
      prop.key.name === "async" &&
      (this.type === types.name || this.type === types.num ||
        this.type === types.string || this.type === types.bracketL ||
        this.type.keyword ||
        (this.options.ecmaVersion >= 9 && this.type === types.star)) &&
      !lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
  };

  // Parse an object literal or binding pattern.

  pp$3.parseObj = function (isPattern, refDestructuringErrors) {
    var node = this.startNode(), first = true, propHash = {};
    node.properties = [];
    this.next();
    while (!this.eat(types.braceR)) {
      if (!first) {
        this.expect(types.comma);
        if (
          this.options.ecmaVersion >= 5 && this.afterTrailingComma(types.braceR)
        ) {
          break;
        }
      } else first = false;

      var prop = this.parseProperty(isPattern, refDestructuringErrors);
      if (!isPattern) {
        this.checkPropClash(prop, propHash, refDestructuringErrors);
      }
      node.properties.push(prop);
    }
    return this.finishNode(
      node,
      isPattern ? "ObjectPattern" : "ObjectExpression",
    );
  };

  pp$3.parseProperty = function (isPattern, refDestructuringErrors) {
    var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
    if (this.options.ecmaVersion >= 9 && this.eat(types.ellipsis)) {
      if (isPattern) {
        prop.argument = this.parseIdent(false);
        if (this.type === types.comma) {
          this.raise(
            this.start,
            "Comma is not permitted after the rest element",
          );
        }
        return this.finishNode(prop, "RestElement");
      }
      // To disallow parenthesized identifier via `this.toAssignable()`.
      if (this.type === types.parenL && refDestructuringErrors) {
        if (refDestructuringErrors.parenthesizedAssign < 0) {
          refDestructuringErrors.parenthesizedAssign = this.start;
        }
        if (refDestructuringErrors.parenthesizedBind < 0) {
          refDestructuringErrors.parenthesizedBind = this.start;
        }
      }
      // Parse argument.
      prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
      // To disallow trailing comma via `this.toAssignable()`.
      if (
        this.type === types.comma && refDestructuringErrors &&
        refDestructuringErrors.trailingComma < 0
      ) {
        refDestructuringErrors.trailingComma = this.start;
      }
      // Finish
      return this.finishNode(prop, "SpreadElement");
    }
    if (this.options.ecmaVersion >= 6) {
      prop.method = false;
      prop.shorthand = false;
      if (isPattern || refDestructuringErrors) {
        startPos = this.start;
        startLoc = this.startLoc;
      }
      if (!isPattern) {
        isGenerator = this.eat(types.star);
      }
    }
    var containsEsc = this.containsEsc;
    this.parsePropertyName(prop);
    if (
      !isPattern && !containsEsc && this.options.ecmaVersion >= 8 &&
      !isGenerator && this.isAsyncProp(prop)
    ) {
      isAsync = true;
      isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
      this.parsePropertyName(prop, refDestructuringErrors);
    } else {
      isAsync = false;
    }
    this.parsePropertyValue(
      prop,
      isPattern,
      isGenerator,
      isAsync,
      startPos,
      startLoc,
      refDestructuringErrors,
      containsEsc,
    );
    return this.finishNode(prop, "Property");
  };

  pp$3.parsePropertyValue = function (
    prop,
    isPattern,
    isGenerator,
    isAsync,
    startPos,
    startLoc,
    refDestructuringErrors,
    containsEsc,
  ) {
    if ((isGenerator || isAsync) && this.type === types.colon) {
      this.unexpected();
    }

    if (this.eat(types.colon)) {
      prop.value = isPattern
        ? this.parseMaybeDefault(this.start, this.startLoc)
        : this.parseMaybeAssign(false, refDestructuringErrors);
      prop.kind = "init";
    } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
      if (isPattern) this.unexpected();
      prop.kind = "init";
      prop.method = true;
      prop.value = this.parseMethod(isGenerator, isAsync);
    } else if (
      !isPattern && !containsEsc &&
      this.options.ecmaVersion >= 5 && !prop.computed &&
      prop.key.type === "Identifier" &&
      (prop.key.name === "get" || prop.key.name === "set") &&
      (this.type !== types.comma && this.type !== types.braceR &&
        this.type !== types.eq)
    ) {
      if (isGenerator || isAsync) this.unexpected();
      prop.kind = prop.key.name;
      this.parsePropertyName(prop);
      prop.value = this.parseMethod(false);
      var paramCount = prop.kind === "get" ? 0 : 1;
      if (prop.value.params.length !== paramCount) {
        var start = prop.value.start;
        if (prop.kind === "get") {
          this.raiseRecoverable(start, "getter should have no params");
        } else {
          this.raiseRecoverable(start, "setter should have exactly one param");
        }
      } else {
        if (
          prop.kind === "set" && prop.value.params[0].type === "RestElement"
        ) {
          this.raiseRecoverable(
            prop.value.params[0].start,
            "Setter cannot use rest params",
          );
        }
      }
    } else if (
      this.options.ecmaVersion >= 6 && !prop.computed &&
      prop.key.type === "Identifier"
    ) {
      if (isGenerator || isAsync) this.unexpected();
      this.checkUnreserved(prop.key);
      if (prop.key.name === "await" && !this.awaitIdentPos) {
        this.awaitIdentPos = startPos;
      }
      prop.kind = "init";
      if (isPattern) {
        prop.value = this.parseMaybeDefault(
          startPos,
          startLoc,
          this.copyNode(prop.key),
        );
      } else if (this.type === types.eq && refDestructuringErrors) {
        if (refDestructuringErrors.shorthandAssign < 0) {
          refDestructuringErrors.shorthandAssign = this.start;
        }
        prop.value = this.parseMaybeDefault(
          startPos,
          startLoc,
          this.copyNode(prop.key),
        );
      } else {
        prop.value = this.copyNode(prop.key);
      }
      prop.shorthand = true;
    } else this.unexpected();
  };

  pp$3.parsePropertyName = function (prop) {
    if (this.options.ecmaVersion >= 6) {
      if (this.eat(types.bracketL)) {
        prop.computed = true;
        prop.key = this.parseMaybeAssign();
        this.expect(types.bracketR);
        return prop.key;
      } else {
        prop.computed = false;
      }
    }
    return prop.key = this.type === types.num || this.type === types.string
      ? this.parseExprAtom()
      : this.parseIdent(this.options.allowReserved !== "never");
  };

  // Initialize empty function node.

  pp$3.initFunction = function (node) {
    node.id = null;
    if (this.options.ecmaVersion >= 6) node.generator = node.expression = false;
    if (this.options.ecmaVersion >= 8) node.async = false;
  };

  // Parse object or class method.

  pp$3.parseMethod = function (isGenerator, isAsync, allowDirectSuper) {
    var node = this.startNode(),
      oldYieldPos = this.yieldPos,
      oldAwaitPos = this.awaitPos,
      oldAwaitIdentPos = this.awaitIdentPos;

    this.initFunction(node);
    if (this.options.ecmaVersion >= 6) {
      node.generator = isGenerator;
    }
    if (this.options.ecmaVersion >= 8) {
      node.async = !!isAsync;
    }

    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    this.enterScope(
      functionFlags(isAsync, node.generator) | SCOPE_SUPER |
        (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0),
    );

    this.expect(types.parenL);
    node.params = this.parseBindingList(
      types.parenR,
      false,
      this.options.ecmaVersion >= 8,
    );
    this.checkYieldAwaitInDefaultParams();
    this.parseFunctionBody(node, false, true);

    this.yieldPos = oldYieldPos;
    this.awaitPos = oldAwaitPos;
    this.awaitIdentPos = oldAwaitIdentPos;
    return this.finishNode(node, "FunctionExpression");
  };

  // Parse arrow function expression with given parameters.

  pp$3.parseArrowExpression = function (node, params, isAsync) {
    var oldYieldPos = this.yieldPos,
      oldAwaitPos = this.awaitPos,
      oldAwaitIdentPos = this.awaitIdentPos;

    this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
    this.initFunction(node);
    if (this.options.ecmaVersion >= 8) node.async = !!isAsync;

    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;

    node.params = this.toAssignableList(params, true);
    this.parseFunctionBody(node, true, false);

    this.yieldPos = oldYieldPos;
    this.awaitPos = oldAwaitPos;
    this.awaitIdentPos = oldAwaitIdentPos;
    return this.finishNode(node, "ArrowFunctionExpression");
  };

  // Parse function body and check parameters.

  pp$3.parseFunctionBody = function (node, isArrowFunction, isMethod) {
    var isExpression = isArrowFunction && this.type !== types.braceL;
    var oldStrict = this.strict, useStrict = false;

    if (isExpression) {
      node.body = this.parseMaybeAssign();
      node.expression = true;
      this.checkParams(node, false);
    } else {
      var nonSimple = this.options.ecmaVersion >= 7 &&
        !this.isSimpleParamList(node.params);
      if (!oldStrict || nonSimple) {
        useStrict = this.strictDirective(this.end);
        // If this is a strict mode function, verify that argument names
        // are not repeated, and it does not try to bind the words `eval`
        // or `arguments`.
        if (useStrict && nonSimple) {
          this.raiseRecoverable(
            node.start,
            "Illegal 'use strict' directive in function with non-simple parameter list",
          );
        }
      }
      // Start a new scope with regard to labels and the `inFunction`
      // flag (restore them to their old value afterwards).
      var oldLabels = this.labels;
      this.labels = [];
      if (useStrict) this.strict = true;

      // Add the params to varDeclaredNames to ensure that an error is thrown
      // if a let/const declaration in the function clashes with one of the params.
      this.checkParams(
        node,
        !oldStrict && !useStrict && !isArrowFunction && !isMethod &&
          this.isSimpleParamList(node.params),
      );
      // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
      if (this.strict && node.id) this.checkLValSimple(node.id, BIND_OUTSIDE);
      node.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
      node.expression = false;
      this.adaptDirectivePrologue(node.body.body);
      this.labels = oldLabels;
    }
    this.exitScope();
  };

  pp$3.isSimpleParamList = function (params) {
    for (var i = 0, list = params; i < list.length; i += 1) {
      var param = list[i];

      if (param.type !== "Identifier") return false;
    }
    return true;
  };

  // Checks function params for various disallowed patterns such as using "eval"
  // or "arguments" and duplicate parameters.

  pp$3.checkParams = function (node, allowDuplicates) {
    var nameHash = {};
    for (var i = 0, list = node.params; i < list.length; i += 1) {
      var param = list[i];

      this.checkLValInnerPattern(
        param,
        BIND_VAR,
        allowDuplicates ? null : nameHash,
      );
    }
  };

  // Parses a comma-separated list of expressions, and returns them as
  // an array. `close` is the token type that ends the list, and
  // `allowEmpty` can be turned on to allow subsequent commas with
  // nothing in between them to be parsed as `null` (which is needed
  // for array literals).

  pp$3.parseExprList = function (
    close,
    allowTrailingComma,
    allowEmpty,
    refDestructuringErrors,
  ) {
    var elts = [], first = true;
    while (!this.eat(close)) {
      if (!first) {
        this.expect(types.comma);
        if (allowTrailingComma && this.afterTrailingComma(close)) break;
      } else first = false;

      var elt = (void 0);
      if (allowEmpty && this.type === types.comma) {
        elt = null;
      } else if (this.type === types.ellipsis) {
        elt = this.parseSpread(refDestructuringErrors);
        if (
          refDestructuringErrors && this.type === types.comma &&
          refDestructuringErrors.trailingComma < 0
        ) {
          refDestructuringErrors.trailingComma = this.start;
        }
      } else {
        elt = this.parseMaybeAssign(false, refDestructuringErrors);
      }
      elts.push(elt);
    }
    return elts;
  };

  pp$3.checkUnreserved = function (ref) {
    var start = ref.start;
    var end = ref.end;
    var name = ref.name;

    if (this.inGenerator && name === "yield") {
      this.raiseRecoverable(
        start,
        "Cannot use 'yield' as identifier inside a generator",
      );
    }
    if (this.inAsync && name === "await") {
      this.raiseRecoverable(
        start,
        "Cannot use 'await' as identifier inside an async function",
      );
    }
    if (this.keywords.test(name)) {
      this.raise(start, ("Unexpected keyword '" + name + "'"));
    }
    if (
      this.options.ecmaVersion < 6 &&
      this.input.slice(start, end).indexOf("\\") !== -1
    ) {
      return;
    }
    var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
    if (re.test(name)) {
      if (!this.inAsync && name === "await") {
        this.raiseRecoverable(
          start,
          "Cannot use keyword 'await' outside an async function",
        );
      }
      this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
    }
  };

  // Parse the next token as an identifier. If `liberal` is true (used
  // when parsing properties), it will also convert keywords into
  // identifiers.

  pp$3.parseIdent = function (liberal, isBinding) {
    var node = this.startNode();
    if (this.type === types.name) {
      node.name = this.value;
    } else if (this.type.keyword) {
      node.name = this.type.keyword;

      // To fix https://github.com/acornjs/acorn/issues/575
      // `class` and `function` keywords push new context into this.context.
      // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
      // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
      if (
        (node.name === "class" || node.name === "function") &&
        (this.lastTokEnd !== this.lastTokStart + 1 ||
          this.input.charCodeAt(this.lastTokStart) !== 46)
      ) {
        this.context.pop();
      }
    } else {
      this.unexpected();
    }
    this.next(!!liberal);
    this.finishNode(node, "Identifier");
    if (!liberal) {
      this.checkUnreserved(node);
      if (node.name === "await" && !this.awaitIdentPos) {
        this.awaitIdentPos = node.start;
      }
    }
    return node;
  };

  // Parses yield expression inside generator.

  pp$3.parseYield = function (noIn) {
    if (!this.yieldPos) this.yieldPos = this.start;

    var node = this.startNode();
    this.next();
    if (
      this.type === types.semi || this.canInsertSemicolon() ||
      (this.type !== types.star && !this.type.startsExpr)
    ) {
      node.delegate = false;
      node.argument = null;
    } else {
      node.delegate = this.eat(types.star);
      node.argument = this.parseMaybeAssign(noIn);
    }
    return this.finishNode(node, "YieldExpression");
  };

  pp$3.parseAwait = function () {
    if (!this.awaitPos) this.awaitPos = this.start;

    var node = this.startNode();
    this.next();
    node.argument = this.parseMaybeUnary(null, false);
    return this.finishNode(node, "AwaitExpression");
  };

  var pp$4 = Parser.prototype;

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.

  pp$4.raise = function (pos, message) {
    var loc = getLineInfo(this.input, pos);
    message += " (" + loc.line + ":" + loc.column + ")";
    var err = new SyntaxError(message);
    err.pos = pos;
    err.loc = loc;
    err.raisedAt = this.pos;
    throw err;
  };

  pp$4.raiseRecoverable = pp$4.raise;

  pp$4.curPosition = function () {
    if (this.options.locations) {
      return new Position(this.curLine, this.pos - this.lineStart);
    }
  };

  var pp$5 = Parser.prototype;

  var Scope = function Scope(flags) {
    this.flags = flags;
    // A list of var-declared names in the current lexical scope
    this.var = [];
    // A list of lexically-declared names in the current lexical scope
    this.lexical = [];
    // A list of lexically-declared FunctionDeclaration names in the current lexical scope
    this.functions = [];
  };

  // The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

  pp$5.enterScope = function (flags) {
    this.scopeStack.push(new Scope(flags));
  };

  pp$5.exitScope = function () {
    this.scopeStack.pop();
  };

  // The spec says:
  // > At the top level of a function, or script, function declarations are
  // > treated like var declarations rather than like lexical declarations.
  pp$5.treatFunctionsAsVarInScope = function (scope) {
    return (scope.flags & SCOPE_FUNCTION) ||
      !this.inModule && (scope.flags & SCOPE_TOP);
  };

  pp$5.declareName = function (name, bindingType, pos) {
    var redeclared = false;
    if (bindingType === BIND_LEXICAL) {
      var scope = this.currentScope();
      redeclared = scope.lexical.indexOf(name) > -1 ||
        scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
      scope.lexical.push(name);
      if (this.inModule && (scope.flags & SCOPE_TOP)) {
        delete this.undefinedExports[name];
      }
    } else if (bindingType === BIND_SIMPLE_CATCH) {
      var scope$1 = this.currentScope();
      scope$1.lexical.push(name);
    } else if (bindingType === BIND_FUNCTION) {
      var scope$2 = this.currentScope();
      if (this.treatFunctionsAsVar) {
        redeclared = scope$2.lexical.indexOf(name) > -1;
      } else {
        redeclared = scope$2.lexical.indexOf(name) > -1 ||
          scope$2.var.indexOf(name) > -1;
      }
      scope$2.functions.push(name);
    } else {
      for (var i = this.scopeStack.length - 1; i >= 0; --i) {
        var scope$3 = this.scopeStack[i];
        if (
          scope$3.lexical.indexOf(name) > -1 &&
            !((scope$3.flags & SCOPE_SIMPLE_CATCH) &&
              scope$3.lexical[0] === name) ||
          !this.treatFunctionsAsVarInScope(scope$3) &&
            scope$3.functions.indexOf(name) > -1
        ) {
          redeclared = true;
          break;
        }
        scope$3.var.push(name);
        if (this.inModule && (scope$3.flags & SCOPE_TOP)) {
          delete this.undefinedExports[name];
        }
        if (scope$3.flags & SCOPE_VAR) break;
      }
    }
    if (redeclared) {
      this.raiseRecoverable(
        pos,
        ("Identifier '" + name + "' has already been declared"),
      );
    }
  };

  pp$5.checkLocalExport = function (id) {
    // scope.functions must be empty as Module code is always strict.
    if (
      this.scopeStack[0].lexical.indexOf(id.name) === -1 &&
      this.scopeStack[0].var.indexOf(id.name) === -1
    ) {
      this.undefinedExports[id.name] = id;
    }
  };

  pp$5.currentScope = function () {
    return this.scopeStack[this.scopeStack.length - 1];
  };

  pp$5.currentVarScope = function () {
    for (var i = this.scopeStack.length - 1;; i--) {
      var scope = this.scopeStack[i];
      if (scope.flags & SCOPE_VAR) return scope;
    }
  };

  // Could be useful for `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
  pp$5.currentThisScope = function () {
    for (var i = this.scopeStack.length - 1;; i--) {
      var scope = this.scopeStack[i];
      if (scope.flags & SCOPE_VAR && !(scope.flags & SCOPE_ARROW)) return scope;
    }
  };

  var Node = function Node(parser, pos, loc) {
    this.type = "";
    this.start = pos;
    this.end = 0;
    if (parser.options.locations) {
      this.loc = new SourceLocation(parser, loc);
    }
    if (parser.options.directSourceFile) {
      this.sourceFile = parser.options.directSourceFile;
    }
    if (parser.options.ranges) {
      this.range = [pos, 0];
    }
  };

  // Start an AST node, attaching a start offset.

  var pp$6 = Parser.prototype;

  pp$6.startNode = function () {
    return new Node(this, this.start, this.startLoc);
  };

  pp$6.startNodeAt = function (pos, loc) {
    return new Node(this, pos, loc);
  };

  // Finish an AST node, adding `type` and `end` properties.

  function finishNodeAt(node, type, pos, loc) {
    node.type = type;
    node.end = pos;
    if (this.options.locations) {
      node.loc.end = loc;
    }
    if (this.options.ranges) {
      node.range[1] = pos;
    }
    return node;
  }

  pp$6.finishNode = function (node, type) {
    return finishNodeAt.call(
      this,
      node,
      type,
      this.lastTokEnd,
      this.lastTokEndLoc,
    );
  };

  // Finish node at given position

  pp$6.finishNodeAt = function (node, type, pos, loc) {
    return finishNodeAt.call(this, node, type, pos, loc);
  };

  pp$6.copyNode = function (node) {
    var newNode = new Node(this, node.start, this.startLoc);
    for (var prop in node) newNode[prop] = node[prop];
    return newNode;
  };

  // The algorithm used to determine whether a regexp can appear at a

  var TokContext = function TokContext(
    token,
    isExpr,
    preserveSpace,
    override,
    generator,
  ) {
    this.token = token;
    this.isExpr = !!isExpr;
    this.preserveSpace = !!preserveSpace;
    this.override = override;
    this.generator = !!generator;
  };

  var types$1 = {
    b_stat: new TokContext("{", false),
    b_expr: new TokContext("{", true),
    b_tmpl: new TokContext("${", false),
    p_stat: new TokContext("(", false),
    p_expr: new TokContext("(", true),
    q_tmpl: new TokContext("`", true, true, function (p) {
      return p.tryReadTemplateToken();
    }),
    f_stat: new TokContext("function", false),
    f_expr: new TokContext("function", true),
    f_expr_gen: new TokContext("function", true, false, null, true),
    f_gen: new TokContext("function", false, false, null, true),
  };

  var pp$7 = Parser.prototype;

  pp$7.initialContext = function () {
    return [types$1.b_stat];
  };

  pp$7.braceIsBlock = function (prevType) {
    var parent = this.curContext();
    if (parent === types$1.f_expr || parent === types$1.f_stat) {
      return true;
    }
    if (
      prevType === types.colon &&
      (parent === types$1.b_stat || parent === types$1.b_expr)
    ) {
      return !parent.isExpr;
    }

    // The check for `tt.name && exprAllowed` detects whether we are
    // after a `yield` or `of` construct. See the `updateContext` for
    // `tt.name`.
    if (
      prevType === types._return || prevType === types.name && this.exprAllowed
    ) {
      return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
    }
    if (
      prevType === types._else || prevType === types.semi ||
      prevType === types.eof || prevType === types.parenR ||
      prevType === types.arrow
    ) {
      return true;
    }
    if (prevType === types.braceL) {
      return parent === types$1.b_stat;
    }
    if (
      prevType === types._var || prevType === types._const ||
      prevType === types.name
    ) {
      return false;
    }
    return !this.exprAllowed;
  };

  pp$7.inGeneratorContext = function () {
    for (var i = this.context.length - 1; i >= 1; i--) {
      var context = this.context[i];
      if (context.token === "function") {
        return context.generator;
      }
    }
    return false;
  };

  pp$7.updateContext = function (prevType) {
    var update, type = this.type;
    if (type.keyword && prevType === types.dot) {
      this.exprAllowed = false;
    } else if (update = type.updateContext) {
      update.call(this, prevType);
    } else {
      this.exprAllowed = type.beforeExpr;
    }
  };

  // Token-specific context update code

  types.parenR.updateContext = types.braceR.updateContext = function () {
    if (this.context.length === 1) {
      this.exprAllowed = true;
      return;
    }
    var out = this.context.pop();
    if (out === types$1.b_stat && this.curContext().token === "function") {
      out = this.context.pop();
    }
    this.exprAllowed = !out.isExpr;
  };

  types.braceL.updateContext = function (prevType) {
    this.context.push(
      this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr,
    );
    this.exprAllowed = true;
  };

  types.dollarBraceL.updateContext = function () {
    this.context.push(types$1.b_tmpl);
    this.exprAllowed = true;
  };

  types.parenL.updateContext = function (prevType) {
    var statementParens = prevType === types._if || prevType === types._for ||
      prevType === types._with || prevType === types._while;
    this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
    this.exprAllowed = true;
  };

  types.incDec.updateContext = function () {
    // tokExprAllowed stays unchanged
  };

  types._function.updateContext = types._class.updateContext = function (
    prevType,
  ) {
    if (
      prevType.beforeExpr && prevType !== types.semi &&
      prevType !== types._else &&
      !(prevType === types._return &&
        lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) &&
      !((prevType === types.colon || prevType === types.braceL) &&
        this.curContext() === types$1.b_stat)
    ) {
      this.context.push(types$1.f_expr);
    } else {
      this.context.push(types$1.f_stat);
    }
    this.exprAllowed = false;
  };

  types.backQuote.updateContext = function () {
    if (this.curContext() === types$1.q_tmpl) {
      this.context.pop();
    } else {
      this.context.push(types$1.q_tmpl);
    }
    this.exprAllowed = false;
  };

  types.star.updateContext = function (prevType) {
    if (prevType === types._function) {
      var index = this.context.length - 1;
      if (this.context[index] === types$1.f_expr) {
        this.context[index] = types$1.f_expr_gen;
      } else {
        this.context[index] = types$1.f_gen;
      }
    }
    this.exprAllowed = true;
  };

  types.name.updateContext = function (prevType) {
    var allowed = false;
    if (this.options.ecmaVersion >= 6 && prevType !== types.dot) {
      if (
        this.value === "of" && !this.exprAllowed ||
        this.value === "yield" && this.inGeneratorContext()
      ) {
        allowed = true;
      }
    }
    this.exprAllowed = allowed;
  };

  // This file contains Unicode properties extracted from the ECMAScript
  // specification. The lists are extracted like so:
  // $$('#table-binary-unicode-properties > figure > table > tbody > tr > td:nth-child(1) code').map(el => el.innerText)

  // #table-binary-unicode-properties
  var ecma9BinaryProperties =
    "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
  var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
  var ecma11BinaryProperties = ecma10BinaryProperties;
  var ecma12BinaryProperties = ecma11BinaryProperties +
    " EBase EComp EMod EPres ExtPict";
  var unicodeBinaryProperties = {
    9: ecma9BinaryProperties,
    10: ecma10BinaryProperties,
    11: ecma11BinaryProperties,
    12: ecma12BinaryProperties,
  };

  // #table-unicode-general-category-values
  var unicodeGeneralCategoryValues =
    "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";

  // #table-unicode-script-values
  var ecma9ScriptValues =
    "Adlam Adlm Ahom Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
  var ecma10ScriptValues = ecma9ScriptValues +
    " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
  var ecma11ScriptValues = ecma10ScriptValues +
    " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
  var ecma12ScriptValues = ecma11ScriptValues +
    " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
  var unicodeScriptValues = {
    9: ecma9ScriptValues,
    10: ecma10ScriptValues,
    11: ecma11ScriptValues,
    12: ecma12ScriptValues,
  };

  var data = {};
  function buildUnicodeData(ecmaVersion) {
    var d = data[ecmaVersion] = {
      binary: wordsRegexp(
        unicodeBinaryProperties[ecmaVersion] + " " +
          unicodeGeneralCategoryValues,
      ),
      nonBinary: {
        General_Category: wordsRegexp(unicodeGeneralCategoryValues),
        Script: wordsRegexp(unicodeScriptValues[ecmaVersion]),
      },
    };
    d.nonBinary.Script_Extensions = d.nonBinary.Script;

    d.nonBinary.gc = d.nonBinary.General_Category;
    d.nonBinary.sc = d.nonBinary.Script;
    d.nonBinary.scx = d.nonBinary.Script_Extensions;
  }
  buildUnicodeData(9);
  buildUnicodeData(10);
  buildUnicodeData(11);
  buildUnicodeData(12);

  var pp$8 = Parser.prototype;

  var RegExpValidationState = function RegExpValidationState(parser) {
    this.parser = parser;
    this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") +
      (parser.options.ecmaVersion >= 9 ? "s" : "");
    this.unicodeProperties =
      data[parser.options.ecmaVersion >= 12 ? 12 : parser.options.ecmaVersion];
    this.source = "";
    this.flags = "";
    this.start = 0;
    this.switchU = false;
    this.switchN = false;
    this.pos = 0;
    this.lastIntValue = 0;
    this.lastStringValue = "";
    this.lastAssertionIsQuantifiable = false;
    this.numCapturingParens = 0;
    this.maxBackReference = 0;
    this.groupNames = [];
    this.backReferenceNames = [];
  };

  RegExpValidationState.prototype.reset = function reset(
    start,
    pattern,
    flags,
  ) {
    var unicode = flags.indexOf("u") !== -1;
    this.start = start | 0;
    this.source = pattern + "";
    this.flags = flags;
    this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
    this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
  };

  RegExpValidationState.prototype.raise = function raise(message) {
    this.parser.raiseRecoverable(
      this.start,
      ("Invalid regular expression: /" + (this.source) + "/: " + message),
    );
  };

  // If u flag is given, this returns the code point at the index (it combines a surrogate pair).
  // Otherwise, this returns the code unit of the index (can be a part of a surrogate pair).
  RegExpValidationState.prototype.at = function at(i, forceU) {
    if (forceU === void 0) forceU = false;

    var s = this.source;
    var l = s.length;
    if (i >= l) {
      return -1;
    }
    var c = s.charCodeAt(i);
    if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l) {
      return c;
    }
    var next = s.charCodeAt(i + 1);
    return next >= 0xDC00 && next <= 0xDFFF ? (c << 10) + next - 0x35FDC00 : c;
  };

  RegExpValidationState.prototype.nextIndex = function nextIndex(i, forceU) {
    if (forceU === void 0) forceU = false;

    var s = this.source;
    var l = s.length;
    if (i >= l) {
      return l;
    }
    var c = s.charCodeAt(i), next;
    if (
      !(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l ||
      (next = s.charCodeAt(i + 1)) < 0xDC00 || next > 0xDFFF
    ) {
      return i + 1;
    }
    return i + 2;
  };

  RegExpValidationState.prototype.current = function current(forceU) {
    if (forceU === void 0) forceU = false;

    return this.at(this.pos, forceU);
  };

  RegExpValidationState.prototype.lookahead = function lookahead(forceU) {
    if (forceU === void 0) forceU = false;

    return this.at(this.nextIndex(this.pos, forceU), forceU);
  };

  RegExpValidationState.prototype.advance = function advance(forceU) {
    if (forceU === void 0) forceU = false;

    this.pos = this.nextIndex(this.pos, forceU);
  };

  RegExpValidationState.prototype.eat = function eat(ch, forceU) {
    if (forceU === void 0) forceU = false;

    if (this.current(forceU) === ch) {
      this.advance(forceU);
      return true;
    }
    return false;
  };

  function codePointToString(ch) {
    if (ch <= 0xFFFF) return String.fromCharCode(ch);
    ch -= 0x10000;
    return String.fromCharCode((ch >> 10) + 0xD800, (ch & 0x03FF) + 0xDC00);
  }

  /**
   * Validate the flags part of a given RegExpLiteral.
   *
   * @param {RegExpValidationState} state The state to validate RegExp.
   * @returns {void}
   */
  pp$8.validateRegExpFlags = function (state) {
    var validFlags = state.validFlags;
    var flags = state.flags;

    for (var i = 0; i < flags.length; i++) {
      var flag = flags.charAt(i);
      if (validFlags.indexOf(flag) === -1) {
        this.raise(state.start, "Invalid regular expression flag");
      }
      if (flags.indexOf(flag, i + 1) > -1) {
        this.raise(state.start, "Duplicate regular expression flag");
      }
    }
  };

  /**
   * Validate the pattern part of a given RegExpLiteral.
   *
   * @param {RegExpValidationState} state The state to validate RegExp.
   * @returns {void}
   */
  pp$8.validateRegExpPattern = function (state) {
    this.regexp_pattern(state);

    // The goal symbol for the parse is |Pattern[~U, ~N]|. If the result of
    // parsing contains a |GroupName|, reparse with the goal symbol
    // |Pattern[~U, +N]| and use this result instead. Throw a *SyntaxError*
    // exception if _P_ did not conform to the grammar, if any elements of _P_
    // were not matched by the parse, or if any Early Error conditions exist.
    if (
      !state.switchN && this.options.ecmaVersion >= 9 &&
      state.groupNames.length > 0
    ) {
      state.switchN = true;
      this.regexp_pattern(state);
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Pattern
  pp$8.regexp_pattern = function (state) {
    state.pos = 0;
    state.lastIntValue = 0;
    state.lastStringValue = "";
    state.lastAssertionIsQuantifiable = false;
    state.numCapturingParens = 0;
    state.maxBackReference = 0;
    state.groupNames.length = 0;
    state.backReferenceNames.length = 0;

    this.regexp_disjunction(state);

    if (state.pos !== state.source.length) {
      // Make the same messages as V8.
      if (state.eat(0x29 /* ) */)) {
        state.raise("Unmatched ')'");
      }
      if (state.eat(0x5D /* ] */) || state.eat(0x7D /* } */)) {
        state.raise("Lone quantifier brackets");
      }
    }
    if (state.maxBackReference > state.numCapturingParens) {
      state.raise("Invalid escape");
    }
    for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
      var name = list[i];

      if (state.groupNames.indexOf(name) === -1) {
        state.raise("Invalid named capture referenced");
      }
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Disjunction
  pp$8.regexp_disjunction = function (state) {
    this.regexp_alternative(state);
    while (state.eat(0x7C /* | */)) {
      this.regexp_alternative(state);
    }

    // Make the same message as V8.
    if (this.regexp_eatQuantifier(state, true)) {
      state.raise("Nothing to repeat");
    }
    if (state.eat(0x7B /* { */)) {
      state.raise("Lone quantifier brackets");
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Alternative
  pp$8.regexp_alternative = function (state) {
    while (state.pos < state.source.length && this.regexp_eatTerm(state)) {
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Term
  pp$8.regexp_eatTerm = function (state) {
    if (this.regexp_eatAssertion(state)) {
      // Handle `QuantifiableAssertion Quantifier` alternative.
      // `state.lastAssertionIsQuantifiable` is true if the last eaten Assertion
      // is a QuantifiableAssertion.
      if (
        state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)
      ) {
        // Make the same message as V8.
        if (state.switchU) {
          state.raise("Invalid quantifier");
        }
      }
      return true;
    }

    if (
      state.switchU
        ? this.regexp_eatAtom(state)
        : this.regexp_eatExtendedAtom(state)
    ) {
      this.regexp_eatQuantifier(state);
      return true;
    }

    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Assertion
  pp$8.regexp_eatAssertion = function (state) {
    var start = state.pos;
    state.lastAssertionIsQuantifiable = false;

    // ^, $
    if (state.eat(0x5E /* ^ */) || state.eat(0x24 /* $ */)) {
      return true;
    }

    // \b \B
    if (state.eat(0x5C /* \ */)) {
      if (state.eat(0x42 /* B */) || state.eat(0x62 /* b */)) {
        return true;
      }
      state.pos = start;
    }

    // Lookahead / Lookbehind
    if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
      var lookbehind = false;
      if (this.options.ecmaVersion >= 9) {
        lookbehind = state.eat(0x3C /* < */);
      }
      if (state.eat(0x3D /* = */) || state.eat(0x21 /* ! */)) {
        this.regexp_disjunction(state);
        if (!state.eat(0x29 /* ) */)) {
          state.raise("Unterminated group");
        }
        state.lastAssertionIsQuantifiable = !lookbehind;
        return true;
      }
    }

    state.pos = start;
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Quantifier
  pp$8.regexp_eatQuantifier = function (state, noError) {
    if (noError === void 0) noError = false;

    if (this.regexp_eatQuantifierPrefix(state, noError)) {
      state.eat(0x3F /* ? */);
      return true;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-QuantifierPrefix
  pp$8.regexp_eatQuantifierPrefix = function (state, noError) {
    return (
      state.eat(0x2A /* * */) ||
      state.eat(0x2B /* + */) ||
      state.eat(0x3F /* ? */) ||
      this.regexp_eatBracedQuantifier(state, noError)
    );
  };
  pp$8.regexp_eatBracedQuantifier = function (state, noError) {
    var start = state.pos;
    if (state.eat(0x7B /* { */)) {
      var min = 0, max = -1;
      if (this.regexp_eatDecimalDigits(state)) {
        min = state.lastIntValue;
        if (state.eat(0x2C /* , */) && this.regexp_eatDecimalDigits(state)) {
          max = state.lastIntValue;
        }
        if (state.eat(0x7D /* } */)) {
          // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
          if (max !== -1 && max < min && !noError) {
            state.raise("numbers out of order in {} quantifier");
          }
          return true;
        }
      }
      if (state.switchU && !noError) {
        state.raise("Incomplete quantifier");
      }
      state.pos = start;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Atom
  pp$8.regexp_eatAtom = function (state) {
    return (
      this.regexp_eatPatternCharacters(state) ||
      state.eat(0x2E /* . */) ||
      this.regexp_eatReverseSolidusAtomEscape(state) ||
      this.regexp_eatCharacterClass(state) ||
      this.regexp_eatUncapturingGroup(state) ||
      this.regexp_eatCapturingGroup(state)
    );
  };
  pp$8.regexp_eatReverseSolidusAtomEscape = function (state) {
    var start = state.pos;
    if (state.eat(0x5C /* \ */)) {
      if (this.regexp_eatAtomEscape(state)) {
        return true;
      }
      state.pos = start;
    }
    return false;
  };
  pp$8.regexp_eatUncapturingGroup = function (state) {
    var start = state.pos;
    if (state.eat(0x28 /* ( */)) {
      if (state.eat(0x3F /* ? */) && state.eat(0x3A /* : */)) {
        this.regexp_disjunction(state);
        if (state.eat(0x29 /* ) */)) {
          return true;
        }
        state.raise("Unterminated group");
      }
      state.pos = start;
    }
    return false;
  };
  pp$8.regexp_eatCapturingGroup = function (state) {
    if (state.eat(0x28 /* ( */)) {
      if (this.options.ecmaVersion >= 9) {
        this.regexp_groupSpecifier(state);
      } else if (state.current() === 0x3F /* ? */) {
        state.raise("Invalid group");
      }
      this.regexp_disjunction(state);
      if (state.eat(0x29 /* ) */)) {
        state.numCapturingParens += 1;
        return true;
      }
      state.raise("Unterminated group");
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedAtom
  pp$8.regexp_eatExtendedAtom = function (state) {
    return (
      state.eat(0x2E /* . */) ||
      this.regexp_eatReverseSolidusAtomEscape(state) ||
      this.regexp_eatCharacterClass(state) ||
      this.regexp_eatUncapturingGroup(state) ||
      this.regexp_eatCapturingGroup(state) ||
      this.regexp_eatInvalidBracedQuantifier(state) ||
      this.regexp_eatExtendedPatternCharacter(state)
    );
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-InvalidBracedQuantifier
  pp$8.regexp_eatInvalidBracedQuantifier = function (state) {
    if (this.regexp_eatBracedQuantifier(state, true)) {
      state.raise("Nothing to repeat");
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-SyntaxCharacter
  pp$8.regexp_eatSyntaxCharacter = function (state) {
    var ch = state.current();
    if (isSyntaxCharacter(ch)) {
      state.lastIntValue = ch;
      state.advance();
      return true;
    }
    return false;
  };
  function isSyntaxCharacter(ch) {
    return (
      ch === 0x24 /* $ */ ||
      ch >= 0x28 /* ( */ && ch <= 0x2B /* + */ ||
      ch === 0x2E /* . */ ||
      ch === 0x3F /* ? */ ||
      ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */ ||
      ch >= 0x7B /* { */ && ch <= 0x7D /* } */
    );
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-PatternCharacter
  // But eat eager.
  pp$8.regexp_eatPatternCharacters = function (state) {
    var start = state.pos;
    var ch = 0;
    while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
      state.advance();
    }
    return state.pos !== start;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedPatternCharacter
  pp$8.regexp_eatExtendedPatternCharacter = function (state) {
    var ch = state.current();
    if (
      ch !== -1 &&
      ch !== 0x24 /* $ */ &&
      !(ch >= 0x28 /* ( */ && ch <= 0x2B /* + */) &&
      ch !== 0x2E /* . */ &&
      ch !== 0x3F /* ? */ &&
      ch !== 0x5B /* [ */ &&
      ch !== 0x5E /* ^ */ &&
      ch !== 0x7C /* | */
    ) {
      state.advance();
      return true;
    }
    return false;
  };

  // GroupSpecifier ::
  //   [empty]
  //   `?` GroupName
  pp$8.regexp_groupSpecifier = function (state) {
    if (state.eat(0x3F /* ? */)) {
      if (this.regexp_eatGroupName(state)) {
        if (state.groupNames.indexOf(state.lastStringValue) !== -1) {
          state.raise("Duplicate capture group name");
        }
        state.groupNames.push(state.lastStringValue);
        return;
      }
      state.raise("Invalid group");
    }
  };

  // GroupName ::
  //   `<` RegExpIdentifierName `>`
  // Note: this updates `state.lastStringValue` property with the eaten name.
  pp$8.regexp_eatGroupName = function (state) {
    state.lastStringValue = "";
    if (state.eat(0x3C /* < */)) {
      if (
        this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3E /* > */)
      ) {
        return true;
      }
      state.raise("Invalid capture group name");
    }
    return false;
  };

  // RegExpIdentifierName ::
  //   RegExpIdentifierStart
  //   RegExpIdentifierName RegExpIdentifierPart
  // Note: this updates `state.lastStringValue` property with the eaten name.
  pp$8.regexp_eatRegExpIdentifierName = function (state) {
    state.lastStringValue = "";
    if (this.regexp_eatRegExpIdentifierStart(state)) {
      state.lastStringValue += codePointToString(state.lastIntValue);
      while (this.regexp_eatRegExpIdentifierPart(state)) {
        state.lastStringValue += codePointToString(state.lastIntValue);
      }
      return true;
    }
    return false;
  };

  // RegExpIdentifierStart ::
  //   UnicodeIDStart
  //   `$`
  //   `_`
  //   `\` RegExpUnicodeEscapeSequence[+U]
  pp$8.regexp_eatRegExpIdentifierStart = function (state) {
    var start = state.pos;
    var forceU = this.options.ecmaVersion >= 11;
    var ch = state.current(forceU);
    state.advance(forceU);

    if (
      ch === 0x5C /* \ */ &&
      this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)
    ) {
      ch = state.lastIntValue;
    }
    if (isRegExpIdentifierStart(ch)) {
      state.lastIntValue = ch;
      return true;
    }

    state.pos = start;
    return false;
  };
  function isRegExpIdentifierStart(ch) {
    return isIdentifierStart(ch, true) || ch === 0x24 /* $ */ ||
      ch === 0x5F; /* _ */
  }

  // RegExpIdentifierPart ::
  //   UnicodeIDContinue
  //   `$`
  //   `_`
  //   `\` RegExpUnicodeEscapeSequence[+U]
  //   <ZWNJ>
  //   <ZWJ>
  pp$8.regexp_eatRegExpIdentifierPart = function (state) {
    var start = state.pos;
    var forceU = this.options.ecmaVersion >= 11;
    var ch = state.current(forceU);
    state.advance(forceU);

    if (
      ch === 0x5C /* \ */ &&
      this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)
    ) {
      ch = state.lastIntValue;
    }
    if (isRegExpIdentifierPart(ch)) {
      state.lastIntValue = ch;
      return true;
    }

    state.pos = start;
    return false;
  };
  function isRegExpIdentifierPart(ch) {
    return isIdentifierChar(ch, true) || ch === 0x24 /* $ */ ||
      ch === 0x5F /* _ */ || ch === 0x200C /* <ZWNJ> */ ||
      ch === 0x200D; /* <ZWJ> */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-AtomEscape
  pp$8.regexp_eatAtomEscape = function (state) {
    if (
      this.regexp_eatBackReference(state) ||
      this.regexp_eatCharacterClassEscape(state) ||
      this.regexp_eatCharacterEscape(state) ||
      (state.switchN && this.regexp_eatKGroupName(state))
    ) {
      return true;
    }
    if (state.switchU) {
      // Make the same message as V8.
      if (state.current() === 0x63 /* c */) {
        state.raise("Invalid unicode escape");
      }
      state.raise("Invalid escape");
    }
    return false;
  };
  pp$8.regexp_eatBackReference = function (state) {
    var start = state.pos;
    if (this.regexp_eatDecimalEscape(state)) {
      var n = state.lastIntValue;
      if (state.switchU) {
        // For SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-atomescape
        if (n > state.maxBackReference) {
          state.maxBackReference = n;
        }
        return true;
      }
      if (n <= state.numCapturingParens) {
        return true;
      }
      state.pos = start;
    }
    return false;
  };
  pp$8.regexp_eatKGroupName = function (state) {
    if (state.eat(0x6B /* k */)) {
      if (this.regexp_eatGroupName(state)) {
        state.backReferenceNames.push(state.lastStringValue);
        return true;
      }
      state.raise("Invalid named reference");
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-CharacterEscape
  pp$8.regexp_eatCharacterEscape = function (state) {
    return (
      this.regexp_eatControlEscape(state) ||
      this.regexp_eatCControlLetter(state) ||
      this.regexp_eatZero(state) ||
      this.regexp_eatHexEscapeSequence(state) ||
      this.regexp_eatRegExpUnicodeEscapeSequence(state, false) ||
      (!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
      this.regexp_eatIdentityEscape(state)
    );
  };
  pp$8.regexp_eatCControlLetter = function (state) {
    var start = state.pos;
    if (state.eat(0x63 /* c */)) {
      if (this.regexp_eatControlLetter(state)) {
        return true;
      }
      state.pos = start;
    }
    return false;
  };
  pp$8.regexp_eatZero = function (state) {
    if (
      state.current() === 0x30 /* 0 */ && !isDecimalDigit(state.lookahead())
    ) {
      state.lastIntValue = 0;
      state.advance();
      return true;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ControlEscape
  pp$8.regexp_eatControlEscape = function (state) {
    var ch = state.current();
    if (ch === 0x74 /* t */) {
      state.lastIntValue = 0x09; /* \t */
      state.advance();
      return true;
    }
    if (ch === 0x6E /* n */) {
      state.lastIntValue = 0x0A; /* \n */
      state.advance();
      return true;
    }
    if (ch === 0x76 /* v */) {
      state.lastIntValue = 0x0B; /* \v */
      state.advance();
      return true;
    }
    if (ch === 0x66 /* f */) {
      state.lastIntValue = 0x0C; /* \f */
      state.advance();
      return true;
    }
    if (ch === 0x72 /* r */) {
      state.lastIntValue = 0x0D; /* \r */
      state.advance();
      return true;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ControlLetter
  pp$8.regexp_eatControlLetter = function (state) {
    var ch = state.current();
    if (isControlLetter(ch)) {
      state.lastIntValue = ch % 0x20;
      state.advance();
      return true;
    }
    return false;
  };
  function isControlLetter(ch) {
    return (
      (ch >= 0x41 /* A */ && ch <= 0x5A /* Z */) ||
      (ch >= 0x61 /* a */ && ch <= 0x7A /* z */)
    );
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-RegExpUnicodeEscapeSequence
  pp$8.regexp_eatRegExpUnicodeEscapeSequence = function (state, forceU) {
    if (forceU === void 0) forceU = false;

    var start = state.pos;
    var switchU = forceU || state.switchU;

    if (state.eat(0x75 /* u */)) {
      if (this.regexp_eatFixedHexDigits(state, 4)) {
        var lead = state.lastIntValue;
        if (switchU && lead >= 0xD800 && lead <= 0xDBFF) {
          var leadSurrogateEnd = state.pos;
          if (
            state.eat(0x5C /* \ */) && state.eat(0x75 /* u */) &&
            this.regexp_eatFixedHexDigits(state, 4)
          ) {
            var trail = state.lastIntValue;
            if (trail >= 0xDC00 && trail <= 0xDFFF) {
              state.lastIntValue = (lead - 0xD800) * 0x400 + (trail - 0xDC00) +
                0x10000;
              return true;
            }
          }
          state.pos = leadSurrogateEnd;
          state.lastIntValue = lead;
        }
        return true;
      }
      if (
        switchU &&
        state.eat(0x7B /* { */) &&
        this.regexp_eatHexDigits(state) &&
        state.eat(0x7D /* } */) &&
        isValidUnicode(state.lastIntValue)
      ) {
        return true;
      }
      if (switchU) {
        state.raise("Invalid unicode escape");
      }
      state.pos = start;
    }

    return false;
  };
  function isValidUnicode(ch) {
    return ch >= 0 && ch <= 0x10FFFF;
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-IdentityEscape
  pp$8.regexp_eatIdentityEscape = function (state) {
    if (state.switchU) {
      if (this.regexp_eatSyntaxCharacter(state)) {
        return true;
      }
      if (state.eat(0x2F /* / */)) {
        state.lastIntValue = 0x2F; /* / */
        return true;
      }
      return false;
    }

    var ch = state.current();
    if (ch !== 0x63 /* c */ && (!state.switchN || ch !== 0x6B /* k */)) {
      state.lastIntValue = ch;
      state.advance();
      return true;
    }

    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalEscape
  pp$8.regexp_eatDecimalEscape = function (state) {
    state.lastIntValue = 0;
    var ch = state.current();
    if (ch >= 0x31 /* 1 */ && ch <= 0x39 /* 9 */) {
      do {
        state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
        state.advance();
      } while ((ch = state.current()) >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */);
      return true;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClassEscape
  pp$8.regexp_eatCharacterClassEscape = function (state) {
    var ch = state.current();

    if (isCharacterClassEscape(ch)) {
      state.lastIntValue = -1;
      state.advance();
      return true;
    }

    if (
      state.switchU &&
      this.options.ecmaVersion >= 9 &&
      (ch === 0x50 /* P */ || ch === 0x70 /* p */)
    ) {
      state.lastIntValue = -1;
      state.advance();
      if (
        state.eat(0x7B /* { */) &&
        this.regexp_eatUnicodePropertyValueExpression(state) &&
        state.eat(0x7D /* } */)
      ) {
        return true;
      }
      state.raise("Invalid property name");
    }

    return false;
  };
  function isCharacterClassEscape(ch) {
    return (
      ch === 0x64 /* d */ ||
      ch === 0x44 /* D */ ||
      ch === 0x73 /* s */ ||
      ch === 0x53 /* S */ ||
      ch === 0x77 /* w */ ||
      ch === 0x57 /* W */
    );
  }

  // UnicodePropertyValueExpression ::
  //   UnicodePropertyName `=` UnicodePropertyValue
  //   LoneUnicodePropertyNameOrValue
  pp$8.regexp_eatUnicodePropertyValueExpression = function (state) {
    var start = state.pos;

    // UnicodePropertyName `=` UnicodePropertyValue
    if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3D /* = */)) {
      var name = state.lastStringValue;
      if (this.regexp_eatUnicodePropertyValue(state)) {
        var value = state.lastStringValue;
        this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
        return true;
      }
    }
    state.pos = start;

    // LoneUnicodePropertyNameOrValue
    if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
      var nameOrValue = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
      return true;
    }
    return false;
  };
  pp$8.regexp_validateUnicodePropertyNameAndValue = function (
    state,
    name,
    value,
  ) {
    if (!has(state.unicodeProperties.nonBinary, name)) {
      state.raise("Invalid property name");
    }
    if (!state.unicodeProperties.nonBinary[name].test(value)) {
      state.raise("Invalid property value");
    }
  };
  pp$8.regexp_validateUnicodePropertyNameOrValue = function (
    state,
    nameOrValue,
  ) {
    if (!state.unicodeProperties.binary.test(nameOrValue)) {
      state.raise("Invalid property name");
    }
  };

  // UnicodePropertyName ::
  //   UnicodePropertyNameCharacters
  pp$8.regexp_eatUnicodePropertyName = function (state) {
    var ch = 0;
    state.lastStringValue = "";
    while (isUnicodePropertyNameCharacter(ch = state.current())) {
      state.lastStringValue += codePointToString(ch);
      state.advance();
    }
    return state.lastStringValue !== "";
  };
  function isUnicodePropertyNameCharacter(ch) {
    return isControlLetter(ch) || ch === 0x5F; /* _ */
  }

  // UnicodePropertyValue ::
  //   UnicodePropertyValueCharacters
  pp$8.regexp_eatUnicodePropertyValue = function (state) {
    var ch = 0;
    state.lastStringValue = "";
    while (isUnicodePropertyValueCharacter(ch = state.current())) {
      state.lastStringValue += codePointToString(ch);
      state.advance();
    }
    return state.lastStringValue !== "";
  };
  function isUnicodePropertyValueCharacter(ch) {
    return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch);
  }

  // LoneUnicodePropertyNameOrValue ::
  //   UnicodePropertyValueCharacters
  pp$8.regexp_eatLoneUnicodePropertyNameOrValue = function (state) {
    return this.regexp_eatUnicodePropertyValue(state);
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClass
  pp$8.regexp_eatCharacterClass = function (state) {
    if (state.eat(0x5B /* [ */)) {
      state.eat(0x5E /* ^ */);
      this.regexp_classRanges(state);
      if (state.eat(0x5D /* ] */)) {
        return true;
      }
      // Unreachable since it threw "unterminated regular expression" error before.
      state.raise("Unterminated character class");
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassRanges
  // https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRanges
  // https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRangesNoDash
  pp$8.regexp_classRanges = function (state) {
    while (this.regexp_eatClassAtom(state)) {
      var left = state.lastIntValue;
      if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
        var right = state.lastIntValue;
        if (state.switchU && (left === -1 || right === -1)) {
          state.raise("Invalid character class");
        }
        if (left !== -1 && right !== -1 && left > right) {
          state.raise("Range out of order in character class");
        }
      }
    }
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtom
  // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtomNoDash
  pp$8.regexp_eatClassAtom = function (state) {
    var start = state.pos;

    if (state.eat(0x5C /* \ */)) {
      if (this.regexp_eatClassEscape(state)) {
        return true;
      }
      if (state.switchU) {
        // Make the same message as V8.
        var ch$1 = state.current();
        if (ch$1 === 0x63 /* c */ || isOctalDigit(ch$1)) {
          state.raise("Invalid class escape");
        }
        state.raise("Invalid escape");
      }
      state.pos = start;
    }

    var ch = state.current();
    if (ch !== 0x5D /* ] */) {
      state.lastIntValue = ch;
      state.advance();
      return true;
    }

    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassEscape
  pp$8.regexp_eatClassEscape = function (state) {
    var start = state.pos;

    if (state.eat(0x62 /* b */)) {
      state.lastIntValue = 0x08; /* <BS> */
      return true;
    }

    if (state.switchU && state.eat(0x2D /* - */)) {
      state.lastIntValue = 0x2D; /* - */
      return true;
    }

    if (!state.switchU && state.eat(0x63 /* c */)) {
      if (this.regexp_eatClassControlLetter(state)) {
        return true;
      }
      state.pos = start;
    }

    return (
      this.regexp_eatCharacterClassEscape(state) ||
      this.regexp_eatCharacterEscape(state)
    );
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassControlLetter
  pp$8.regexp_eatClassControlLetter = function (state) {
    var ch = state.current();
    if (isDecimalDigit(ch) || ch === 0x5F /* _ */) {
      state.lastIntValue = ch % 0x20;
      state.advance();
      return true;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
  pp$8.regexp_eatHexEscapeSequence = function (state) {
    var start = state.pos;
    if (state.eat(0x78 /* x */)) {
      if (this.regexp_eatFixedHexDigits(state, 2)) {
        return true;
      }
      if (state.switchU) {
        state.raise("Invalid escape");
      }
      state.pos = start;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalDigits
  pp$8.regexp_eatDecimalDigits = function (state) {
    var start = state.pos;
    var ch = 0;
    state.lastIntValue = 0;
    while (isDecimalDigit(ch = state.current())) {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
      state.advance();
    }
    return state.pos !== start;
  };
  function isDecimalDigit(ch) {
    return ch >= 0x30 /* 0 */ && ch <= 0x39; /* 9 */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigits
  pp$8.regexp_eatHexDigits = function (state) {
    var start = state.pos;
    var ch = 0;
    state.lastIntValue = 0;
    while (isHexDigit(ch = state.current())) {
      state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
      state.advance();
    }
    return state.pos !== start;
  };
  function isHexDigit(ch) {
    return (
      (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) ||
      (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) ||
      (ch >= 0x61 /* a */ && ch <= 0x66 /* f */)
    );
  }
  function hexToInt(ch) {
    if (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) {
      return 10 + (ch - 0x41 /* A */);
    }
    if (ch >= 0x61 /* a */ && ch <= 0x66 /* f */) {
      return 10 + (ch - 0x61 /* a */);
    }
    return ch - 0x30; /* 0 */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-LegacyOctalEscapeSequence
  // Allows only 0-377(octal) i.e. 0-255(decimal).
  pp$8.regexp_eatLegacyOctalEscapeSequence = function (state) {
    if (this.regexp_eatOctalDigit(state)) {
      var n1 = state.lastIntValue;
      if (this.regexp_eatOctalDigit(state)) {
        var n2 = state.lastIntValue;
        if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
          state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
        } else {
          state.lastIntValue = n1 * 8 + n2;
        }
      } else {
        state.lastIntValue = n1;
      }
      return true;
    }
    return false;
  };

  // https://www.ecma-international.org/ecma-262/8.0/#prod-OctalDigit
  pp$8.regexp_eatOctalDigit = function (state) {
    var ch = state.current();
    if (isOctalDigit(ch)) {
      state.lastIntValue = ch - 0x30; /* 0 */
      state.advance();
      return true;
    }
    state.lastIntValue = 0;
    return false;
  };
  function isOctalDigit(ch) {
    return ch >= 0x30 /* 0 */ && ch <= 0x37; /* 7 */
  }

  // https://www.ecma-international.org/ecma-262/8.0/#prod-Hex4Digits
  // https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigit
  // And HexDigit HexDigit in https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
  pp$8.regexp_eatFixedHexDigits = function (state, length) {
    var start = state.pos;
    state.lastIntValue = 0;
    for (var i = 0; i < length; ++i) {
      var ch = state.current();
      if (!isHexDigit(ch)) {
        state.pos = start;
        return false;
      }
      state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
      state.advance();
    }
    return true;
  };

  // Object type used to represent tokens. Note that normally, tokens
  // simply exist as properties on the parser object. This is only
  // used for the onToken callback and the external tokenizer.

  var Token = function Token(p) {
    this.type = p.type;
    this.value = p.value;
    this.start = p.start;
    this.end = p.end;
    if (p.options.locations) {
      this.loc = new SourceLocation(p, p.startLoc, p.endLoc);
    }
    if (p.options.ranges) {
      this.range = [p.start, p.end];
    }
  };

  // ## Tokenizer

  var pp$9 = Parser.prototype;

  // Move to the next token

  pp$9.next = function (ignoreEscapeSequenceInKeyword) {
    if (
      !ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc
    ) {
      this.raiseRecoverable(
        this.start,
        "Escape sequence in keyword " + this.type.keyword,
      );
    }
    if (this.options.onToken) {
      this.options.onToken(new Token(this));
    }

    this.lastTokEnd = this.end;
    this.lastTokStart = this.start;
    this.lastTokEndLoc = this.endLoc;
    this.lastTokStartLoc = this.startLoc;
    this.nextToken();
  };

  pp$9.getToken = function () {
    this.next();
    return new Token(this);
  };

  // If we're in an ES6 environment, make parsers iterable
  if (typeof Symbol !== "undefined") {
    pp$9[Symbol.iterator] = function () {
      var this$1 = this;

      return {
        next: function () {
          var token = this$1.getToken();
          return {
            done: token.type === types.eof,
            value: token,
          };
        },
      };
    };
  }

  // Toggle strict mode. Re-reads the next number or string to please
  // pedantic tests (`"use strict"; 010;` should fail).

  pp$9.curContext = function () {
    return this.context[this.context.length - 1];
  };

  // Read a single token, updating the parser object's token-related
  // properties.

  pp$9.nextToken = function () {
    var curContext = this.curContext();
    if (!curContext || !curContext.preserveSpace) this.skipSpace();

    this.start = this.pos;
    if (this.options.locations) this.startLoc = this.curPosition();
    if (this.pos >= this.input.length) return this.finishToken(types.eof);

    if (curContext.override) return curContext.override(this);
    else this.readToken(this.fullCharCodeAtPos());
  };

  pp$9.readToken = function (code) {
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (
      isIdentifierStart(code, this.options.ecmaVersion >= 6) ||
      code === 92 /* '\' */
    ) {
      return this.readWord();
    }

    return this.getTokenFromCode(code);
  };

  pp$9.fullCharCodeAtPos = function () {
    var code = this.input.charCodeAt(this.pos);
    if (code <= 0xd7ff || code >= 0xe000) return code;
    var next = this.input.charCodeAt(this.pos + 1);
    return (code << 10) + next - 0x35fdc00;
  };

  pp$9.skipBlockComment = function () {
    var startLoc = this.options.onComment && this.curPosition();
    var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
    if (end === -1) this.raise(this.pos - 2, "Unterminated comment");
    this.pos = end + 2;
    if (this.options.locations) {
      lineBreakG.lastIndex = start;
      var match;
      while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
        ++this.curLine;
        this.lineStart = match.index + match[0].length;
      }
    }
    if (this.options.onComment) {
      this.options.onComment(
        true,
        this.input.slice(start + 2, end),
        start,
        this.pos,
        startLoc,
        this.curPosition(),
      );
    }
  };

  pp$9.skipLineComment = function (startSkip) {
    var start = this.pos;
    var startLoc = this.options.onComment && this.curPosition();
    var ch = this.input.charCodeAt(this.pos += startSkip);
    while (this.pos < this.input.length && !isNewLine(ch)) {
      ch = this.input.charCodeAt(++this.pos);
    }
    if (this.options.onComment) {
      this.options.onComment(
        false,
        this.input.slice(start + startSkip, this.pos),
        start,
        this.pos,
        startLoc,
        this.curPosition(),
      );
    }
  };

  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.

  pp$9.skipSpace = function () {
    loop:
    while (this.pos < this.input.length) {
      var ch = this.input.charCodeAt(this.pos);
      switch (ch) {
        case 32:
        case 160: // ' '
          ++this.pos;
          break;
        case 13:
          if (this.input.charCodeAt(this.pos + 1) === 10) {
            ++this.pos;
          }
        case 10:
        case 8232:
        case 8233:
          ++this.pos;
          if (this.options.locations) {
            ++this.curLine;
            this.lineStart = this.pos;
          }
          break;
        case 47: // '/'
          switch (this.input.charCodeAt(this.pos + 1)) {
            case 42: // '*'
              this.skipBlockComment();
              break;
            case 47:
              this.skipLineComment(2);
              break;
            default:
              break loop;
          }
          break;
        default:
          if (
            ch > 8 && ch < 14 ||
            ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))
          ) {
            ++this.pos;
          } else {
            break loop;
          }
      }
    }
  };

  // Called at the end of every token. Sets `end`, `val`, and
  // maintains `context` and `exprAllowed`, and skips the space after
  // the token, so that the next one's `start` will point at the
  // right position.

  pp$9.finishToken = function (type, val) {
    this.end = this.pos;
    if (this.options.locations) this.endLoc = this.curPosition();
    var prevType = this.type;
    this.type = type;
    this.value = val;

    this.updateContext(prevType);
  };

  // ### Token reading

  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed.
  //
  pp$9.readToken_dot = function () {
    var next = this.input.charCodeAt(this.pos + 1);
    if (next >= 48 && next <= 57) return this.readNumber(true);
    var next2 = this.input.charCodeAt(this.pos + 2);
    if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
      this.pos += 3;
      return this.finishToken(types.ellipsis);
    } else {
      ++this.pos;
      return this.finishToken(types.dot);
    }
  };

  pp$9.readToken_slash = function () { // '/'
    var next = this.input.charCodeAt(this.pos + 1);
    if (this.exprAllowed) {
      ++this.pos;
      return this.readRegexp();
    }
    if (next === 61) return this.finishOp(types.assign, 2);
    return this.finishOp(types.slash, 1);
  };

  pp$9.readToken_mult_modulo_exp = function (code) { // '%*'
    var next = this.input.charCodeAt(this.pos + 1);
    var size = 1;
    var tokentype = code === 42 ? types.star : types.modulo;

    // exponentiation operator ** and **=
    if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
      ++size;
      tokentype = types.starstar;
      next = this.input.charCodeAt(this.pos + 2);
    }

    if (next === 61) return this.finishOp(types.assign, size + 1);
    return this.finishOp(tokentype, size);
  };

  pp$9.readToken_pipe_amp = function (code) { // '|&'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === code) {
      if (this.options.ecmaVersion >= 12) {
        var next2 = this.input.charCodeAt(this.pos + 2);
        if (next2 === 61) return this.finishOp(types.assign, 3);
      }
      return this.finishOp(
        code === 124 ? types.logicalOR : types.logicalAND,
        2,
      );
    }
    if (next === 61) return this.finishOp(types.assign, 2);
    return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1);
  };

  pp$9.readToken_caret = function () { // '^'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 61) return this.finishOp(types.assign, 2);
    return this.finishOp(types.bitwiseXOR, 1);
  };

  pp$9.readToken_plus_min = function (code) { // '+-'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === code) {
      if (
        next === 45 && !this.inModule &&
        this.input.charCodeAt(this.pos + 2) === 62 &&
        (this.lastTokEnd === 0 ||
          lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))
      ) {
        // A `-->` line comment
        this.skipLineComment(3);
        this.skipSpace();
        return this.nextToken();
      }
      return this.finishOp(types.incDec, 2);
    }
    if (next === 61) return this.finishOp(types.assign, 2);
    return this.finishOp(types.plusMin, 1);
  };

  pp$9.readToken_lt_gt = function (code) { // '<>'
    var next = this.input.charCodeAt(this.pos + 1);
    var size = 1;
    if (next === code) {
      size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
      if (this.input.charCodeAt(this.pos + size) === 61) {
        return this.finishOp(types.assign, size + 1);
      }
      return this.finishOp(types.bitShift, size);
    }
    if (
      next === 33 && code === 60 && !this.inModule &&
      this.input.charCodeAt(this.pos + 2) === 45 &&
      this.input.charCodeAt(this.pos + 3) === 45
    ) {
      // `<!--`, an XML-style comment that should be interpreted as a line comment
      this.skipLineComment(4);
      this.skipSpace();
      return this.nextToken();
    }
    if (next === 61) size = 2;
    return this.finishOp(types.relational, size);
  };

  pp$9.readToken_eq_excl = function (code) { // '=!'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 61) {
      return this.finishOp(
        types.equality,
        this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2,
      );
    }
    if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
      this.pos += 2;
      return this.finishToken(types.arrow);
    }
    return this.finishOp(code === 61 ? types.eq : types.prefix, 1);
  };

  pp$9.readToken_question = function () { // '?'
    var ecmaVersion = this.options.ecmaVersion;
    if (ecmaVersion >= 11) {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 46) {
        var next2 = this.input.charCodeAt(this.pos + 2);
        if (next2 < 48 || next2 > 57) {
          return this.finishOp(types.questionDot, 2);
        }
      }
      if (next === 63) {
        if (ecmaVersion >= 12) {
          var next2$1 = this.input.charCodeAt(this.pos + 2);
          if (next2$1 === 61) return this.finishOp(types.assign, 3);
        }
        return this.finishOp(types.coalesce, 2);
      }
    }
    return this.finishOp(types.question, 1);
  };

  pp$9.getTokenFromCode = function (code) {
    switch (code) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit or another two dots.
      case 46: // '.'
        return this.readToken_dot();

      // Punctuation tokens.

      case 40:
        ++this.pos;
        return this.finishToken(types.parenL);
      case 41:
        ++this.pos;
        return this.finishToken(types.parenR);
      case 59:
        ++this.pos;
        return this.finishToken(types.semi);
      case 44:
        ++this.pos;
        return this.finishToken(types.comma);
      case 91:
        ++this.pos;
        return this.finishToken(types.bracketL);
      case 93:
        ++this.pos;
        return this.finishToken(types.bracketR);
      case 123:
        ++this.pos;
        return this.finishToken(types.braceL);
      case 125:
        ++this.pos;
        return this.finishToken(types.braceR);
      case 58:
        ++this.pos;
        return this.finishToken(types.colon);

      case 96: // '`'
        if (this.options.ecmaVersion < 6) break;
        ++this.pos;
        return this.finishToken(types.backQuote);

      case 48: // '0'
        var next = this.input.charCodeAt(this.pos + 1);
        if (next === 120 || next === 88) return this.readRadixNumber(16); // '0x', '0X' - hex number
        if (this.options.ecmaVersion >= 6) {
          if (next === 111 || next === 79) return this.readRadixNumber(8); // '0o', '0O' - octal number
          if (next === 98 || next === 66) return this.readRadixNumber(2); // '0b', '0B' - binary number
        }

      // Anything else beginning with a digit is an integer, octal
      // number, or float.

      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57: // 1-9
        return this.readNumber(false);

      // Quotes produce strings.

      case 34:
      case 39: // '"', "'"
        return this.readString(code);

      // Operators are parsed inline in tiny state machines. '=' (61) is
      // often referred to. `finishOp` simply skips the amount of
      // characters it is given as second argument, and returns a token
      // of the type given by its first argument.

      case 47: // '/'
        return this.readToken_slash();

      case 37:
      case 42: // '%*'
        return this.readToken_mult_modulo_exp(code);

      case 124:
      case 38: // '|&'
        return this.readToken_pipe_amp(code);

      case 94: // '^'
        return this.readToken_caret();

      case 43:
      case 45: // '+-'
        return this.readToken_plus_min(code);

      case 60:
      case 62: // '<>'
        return this.readToken_lt_gt(code);

      case 61:
      case 33: // '=!'
        return this.readToken_eq_excl(code);

      case 63: // '?'
        return this.readToken_question();

      case 126: // '~'
        return this.finishOp(types.prefix, 1);
    }

    this.raise(
      this.pos,
      "Unexpected character '" + codePointToString$1(code) + "'",
    );
  };

  pp$9.finishOp = function (type, size) {
    var str = this.input.slice(this.pos, this.pos + size);
    this.pos += size;
    return this.finishToken(type, str);
  };

  pp$9.readRegexp = function () {
    var escaped, inClass, start = this.pos;
    for (;;) {
      if (this.pos >= this.input.length) {
        this.raise(start, "Unterminated regular expression");
      }
      var ch = this.input.charAt(this.pos);
      if (lineBreak.test(ch)) {
        this.raise(start, "Unterminated regular expression");
      }
      if (!escaped) {
        if (ch === "[") inClass = true;
        else if (ch === "]" && inClass) inClass = false;
        else if (ch === "/" && !inClass) break;
        escaped = ch === "\\";
      } else escaped = false;
      ++this.pos;
    }
    var pattern = this.input.slice(start, this.pos);
    ++this.pos;
    var flagsStart = this.pos;
    var flags = this.readWord1();
    if (this.containsEsc) this.unexpected(flagsStart);

    // Validate pattern
    var state = this.regexpState ||
      (this.regexpState = new RegExpValidationState(this));
    state.reset(start, pattern, flags);
    this.validateRegExpFlags(state);
    this.validateRegExpPattern(state);

    // Create Literal#value property value.
    var value = null;
    try {
      value = new RegExp(pattern, flags);
    } catch (e) {
      // ESTree requires null if it failed to instantiate RegExp object.
      // https://github.com/estree/estree/blob/a27003adf4fd7bfad44de9cef372a2eacd527b1c/es5.md#regexpliteral
    }

    return this.finishToken(
      types.regexp,
      { pattern: pattern, flags: flags, value: value },
    );
  };

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  pp$9.readInt = function (radix, len, maybeLegacyOctalNumericLiteral) {
    // `len` is used for character escape sequences. In that case, disallow separators.
    var allowSeparators = this.options.ecmaVersion >= 12 && len === undefined;

    // `maybeLegacyOctalNumericLiteral` is true if it doesn't have prefix (0x,0o,0b)
    // and isn't fraction part nor exponent part. In that case, if the first digit
    // is zero then disallow separators.
    var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral &&
      this.input.charCodeAt(this.pos) === 48;

    var start = this.pos, total = 0, lastCode = 0;
    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
      var code = this.input.charCodeAt(this.pos), val = (void 0);

      if (allowSeparators && code === 95) {
        if (isLegacyOctalNumericLiteral) {
          this.raiseRecoverable(
            this.pos,
            "Numeric separator is not allowed in legacy octal numeric literals",
          );
        }
        if (lastCode === 95) {
          this.raiseRecoverable(
            this.pos,
            "Numeric separator must be exactly one underscore",
          );
        }
        if (i === 0) {
          this.raiseRecoverable(
            this.pos,
            "Numeric separator is not allowed at the first of digits",
          );
        }
        lastCode = code;
        continue;
      }

      if (code >= 97) val = code - 97 + 10;
      // a
      else if (code >= 65) val = code - 65 + 10;
      // A
      else if (code >= 48 && code <= 57) val = code - 48;
      // 0-9
      else val = Infinity;
      if (val >= radix) break;
      lastCode = code;
      total = total * radix + val;
    }

    if (allowSeparators && lastCode === 95) {
      this.raiseRecoverable(
        this.pos - 1,
        "Numeric separator is not allowed at the last of digits",
      );
    }
    if (
      this.pos === start || len != null && this.pos - start !== len
    ) {
      return null;
    }

    return total;
  };

  function stringToNumber(str, isLegacyOctalNumericLiteral) {
    if (isLegacyOctalNumericLiteral) {
      return parseInt(str, 8);
    }

    // `parseFloat(value)` stops parsing at the first numeric separator then returns a wrong value.
    return parseFloat(str.replace(/_/g, ""));
  }

  function stringToBigInt(str) {
    if (typeof BigInt !== "function") {
      return null;
    }

    // `BigInt(value)` throws syntax error if the string contains numeric separators.
    return BigInt(str.replace(/_/g, ""));
  }

  pp$9.readRadixNumber = function (radix) {
    var start = this.pos;
    this.pos += 2; // 0x
    var val = this.readInt(radix);
    if (val == null) {
      this.raise(this.start + 2, "Expected number in radix " + radix);
    }
    if (
      this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110
    ) {
      val = stringToBigInt(this.input.slice(start, this.pos));
      ++this.pos;
    } else if (isIdentifierStart(this.fullCharCodeAtPos())) {
      this.raise(this.pos, "Identifier directly after number");
    }
    return this.finishToken(types.num, val);
  };

  // Read an integer, octal integer, or floating-point number.

  pp$9.readNumber = function (startsWithDot) {
    var start = this.pos;
    if (!startsWithDot && this.readInt(10, undefined, true) === null) {
      this.raise(start, "Invalid number");
    }
    var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
    if (octal && this.strict) this.raise(start, "Invalid number");
    var next = this.input.charCodeAt(this.pos);
    if (
      !octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110
    ) {
      var val$1 = stringToBigInt(this.input.slice(start, this.pos));
      ++this.pos;
      if (isIdentifierStart(this.fullCharCodeAtPos())) {
        this.raise(this.pos, "Identifier directly after number");
      }
      return this.finishToken(types.num, val$1);
    }
    if (octal && /[89]/.test(this.input.slice(start, this.pos))) octal = false;
    if (next === 46 && !octal) { // '.'
      ++this.pos;
      this.readInt(10);
      next = this.input.charCodeAt(this.pos);
    }
    if ((next === 69 || next === 101) && !octal) { // 'eE'
      next = this.input.charCodeAt(++this.pos);
      if (next === 43 || next === 45) ++this.pos; // '+-'
      if (this.readInt(10) === null) this.raise(start, "Invalid number");
    }
    if (isIdentifierStart(this.fullCharCodeAtPos())) {
      this.raise(this.pos, "Identifier directly after number");
    }

    var val = stringToNumber(this.input.slice(start, this.pos), octal);
    return this.finishToken(types.num, val);
  };

  // Read a string value, interpreting backslash-escapes.

  pp$9.readCodePoint = function () {
    var ch = this.input.charCodeAt(this.pos), code;

    if (ch === 123) { // '{'
      if (this.options.ecmaVersion < 6) this.unexpected();
      var codePos = ++this.pos;
      code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
      ++this.pos;
      if (code > 0x10FFFF) {
        this.invalidStringToken(codePos, "Code point out of bounds");
      }
    } else {
      code = this.readHexChar(4);
    }
    return code;
  };

  function codePointToString$1(code) {
    // UTF-16 Decoding
    if (code <= 0xFFFF) return String.fromCharCode(code);
    code -= 0x10000;
    return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00);
  }

  pp$9.readString = function (quote) {
    var out = "", chunkStart = ++this.pos;
    for (;;) {
      if (this.pos >= this.input.length) {
        this.raise(this.start, "Unterminated string constant");
      }
      var ch = this.input.charCodeAt(this.pos);
      if (ch === quote) break;
      if (ch === 92) { // '\'
        out += this.input.slice(chunkStart, this.pos);
        out += this.readEscapedChar(false);
        chunkStart = this.pos;
      } else {
        if (isNewLine(ch, this.options.ecmaVersion >= 10)) {
          this.raise(this.start, "Unterminated string constant");
        }
        ++this.pos;
      }
    }
    out += this.input.slice(chunkStart, this.pos++);
    return this.finishToken(types.string, out);
  };

  // Reads template string tokens.

  var INVALID_TEMPLATE_ESCAPE_ERROR = {};

  pp$9.tryReadTemplateToken = function () {
    this.inTemplateElement = true;
    try {
      this.readTmplToken();
    } catch (err) {
      if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
        this.readInvalidTemplateToken();
      } else {
        throw err;
      }
    }

    this.inTemplateElement = false;
  };

  pp$9.invalidStringToken = function (position, message) {
    if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
      throw INVALID_TEMPLATE_ESCAPE_ERROR;
    } else {
      this.raise(position, message);
    }
  };

  pp$9.readTmplToken = function () {
    var out = "", chunkStart = this.pos;
    for (;;) {
      if (this.pos >= this.input.length) {
        this.raise(this.start, "Unterminated template");
      }
      var ch = this.input.charCodeAt(this.pos);
      if (
        ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123
      ) { // '`', '${'
        if (
          this.pos === this.start &&
          (this.type === types.template || this.type === types.invalidTemplate)
        ) {
          if (ch === 36) {
            this.pos += 2;
            return this.finishToken(types.dollarBraceL);
          } else {
            ++this.pos;
            return this.finishToken(types.backQuote);
          }
        }
        out += this.input.slice(chunkStart, this.pos);
        return this.finishToken(types.template, out);
      }
      if (ch === 92) { // '\'
        out += this.input.slice(chunkStart, this.pos);
        out += this.readEscapedChar(true);
        chunkStart = this.pos;
      } else if (isNewLine(ch)) {
        out += this.input.slice(chunkStart, this.pos);
        ++this.pos;
        switch (ch) {
          case 13:
            if (this.input.charCodeAt(this.pos) === 10) ++this.pos;
          case 10:
            out += "\n";
            break;
          default:
            out += String.fromCharCode(ch);
            break;
        }
        if (this.options.locations) {
          ++this.curLine;
          this.lineStart = this.pos;
        }
        chunkStart = this.pos;
      } else {
        ++this.pos;
      }
    }
  };

  // Reads a template token to search for the end, without validating any escape sequences
  pp$9.readInvalidTemplateToken = function () {
    for (; this.pos < this.input.length; this.pos++) {
      switch (this.input[this.pos]) {
        case "\\":
          ++this.pos;
          break;

        case "$":
          if (this.input[this.pos + 1] !== "{") {
            break;
          }
        // falls through
        case "`":
          return this.finishToken(
            types.invalidTemplate,
            this.input.slice(this.start, this.pos),
          );

          // no default
      }
    }
    this.raise(this.start, "Unterminated template");
  };

  // Used to read escaped characters

  pp$9.readEscapedChar = function (inTemplate) {
    var ch = this.input.charCodeAt(++this.pos);
    ++this.pos;
    switch (ch) {
      case 110: // 'n' -> '\n'
        return "\n";
      case 114: // 'r' -> '\r'
        return "\r";
      case 120: // 'x'
        return String.fromCharCode(this.readHexChar(2));
      case 117: // 'u'
        return codePointToString$1(this.readCodePoint());
      case 116: // 't' -> '\t'
        return "\t";
      case 98: // 'b' -> '\b'
        return "\b";
      case 118: // 'v' -> '\u000b'
        return "\u000b";
      case 102: // 'f' -> '\f'
        return "\f";
      case 13: // '\r\n'
        if (this.input.charCodeAt(this.pos) === 10) ++this.pos;
      case 10: // ' \n'
        if (this.options.locations) {
          this.lineStart = this.pos;
          ++this.curLine;
        }
        return "";
      case 56:
      case 57:
        if (this.strict) {
          this.invalidStringToken(
            this.pos - 1,
            "Invalid escape sequence",
          );
        }
        if (inTemplate) {
          var codePos = this.pos - 1;

          this.invalidStringToken(
            codePos,
            "Invalid escape sequence in template string",
          );

          return null;
        }
      default:
        if (ch >= 48 && ch <= 55) {
          var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
          var octal = parseInt(octalStr, 8);
          if (octal > 255) {
            octalStr = octalStr.slice(0, -1);
            octal = parseInt(octalStr, 8);
          }
          this.pos += octalStr.length - 1;
          ch = this.input.charCodeAt(this.pos);
          if (
            (octalStr !== "0" || ch === 56 || ch === 57) &&
            (this.strict || inTemplate)
          ) {
            this.invalidStringToken(
              this.pos - 1 - octalStr.length,
              inTemplate
                ? "Octal literal in template string"
                : "Octal literal in strict mode",
            );
          }
          return String.fromCharCode(octal);
        }
        if (isNewLine(ch)) {
          // Unicode new line characters after \ get removed from output in both
          // template literals and strings
          return "";
        }
        return String.fromCharCode(ch);
    }
  };

  // Used to read character escape sequences ('\x', '\u', '\U').

  pp$9.readHexChar = function (len) {
    var codePos = this.pos;
    var n = this.readInt(16, len);
    if (n === null) {
      this.invalidStringToken(codePos, "Bad character escape sequence");
    }
    return n;
  };

  // Read an identifier, and return it as a string. Sets `this.containsEsc`
  // to whether the word contained a '\u' escape.
  //
  // Incrementally adds only escaped chars, adding other chunks as-is
  // as a micro-optimization.

  pp$9.readWord1 = function () {
    this.containsEsc = false;
    var word = "", first = true, chunkStart = this.pos;
    var astral = this.options.ecmaVersion >= 6;
    while (this.pos < this.input.length) {
      var ch = this.fullCharCodeAtPos();
      if (isIdentifierChar(ch, astral)) {
        this.pos += ch <= 0xffff ? 1 : 2;
      } else if (ch === 92) { // "\"
        this.containsEsc = true;
        word += this.input.slice(chunkStart, this.pos);
        var escStart = this.pos;
        if (this.input.charCodeAt(++this.pos) !== 117) { // "u"
          this.invalidStringToken(
            this.pos,
            "Expecting Unicode escape sequence \\uXXXX",
          );
        }
        ++this.pos;
        var esc = this.readCodePoint();
        if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral)) {
          this.invalidStringToken(escStart, "Invalid Unicode escape");
        }
        word += codePointToString$1(esc);
        chunkStart = this.pos;
      } else {
        break;
      }
      first = false;
    }
    return word + this.input.slice(chunkStart, this.pos);
  };

  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.

  pp$9.readWord = function () {
    var word = this.readWord1();
    var type = types.name;
    if (this.keywords.test(word)) {
      type = keywords$1[word];
    }
    return this.finishToken(type, word);
  };

  // Acorn is a tiny, fast JavaScript parser written in JavaScript.

  var version$1 = "8.0.1";

  Parser.acorn = {
    Parser: Parser,
    version: version$1,
    defaultOptions: defaultOptions,
    Position: Position,
    SourceLocation: SourceLocation,
    getLineInfo: getLineInfo,
    Node: Node,
    TokenType: TokenType,
    tokTypes: types,
    keywordTypes: keywords$1,
    TokContext: TokContext,
    tokContexts: types$1,
    isIdentifierChar: isIdentifierChar,
    isIdentifierStart: isIdentifierStart,
    Token: Token,
    isNewLine: isNewLine,
    lineBreak: lineBreak,
    lineBreakG: lineBreakG,
    nonASCIIwhitespace: nonASCIIwhitespace,
  };

  // The main exported interface (under `self.acorn` when in the
  // browser) is a `parse` function that takes a code string and
  // returns an abstract syntax tree as specified by [Mozilla parser
  // API][api].
  //
  // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

  function parse(input, options) {
    return Parser.parse(input, options);
  }

  // Astring is a tiny and fast JavaScript code generator from an ESTree-compliant AST.
  //
  // Astring was written by David Bonnet and released under an MIT license.
  //
  // The Git repository for Astring is available at:
  // https://github.com/davidbonnet/astring.git
  //
  // Please use the GitHub bug tracker to report issues:
  // https://github.com/davidbonnet/astring/issues

  var stringify = JSON.stringify;

  /* istanbul ignore if */
  if (!String.prototype.repeat) {
    /* istanbul ignore next */
    throw new Error(
      "String.prototype.repeat is undefined, see https://github.com/davidbonnet/astring#installation",
    );
  }

  /* istanbul ignore if */
  if (!String.prototype.endsWith) {
    /* istanbul ignore next */
    throw new Error(
      "String.prototype.endsWith is undefined, see https://github.com/davidbonnet/astring#installation",
    );
  }

  var OPERATOR_PRECEDENCE = {
    "||": 3,
    "&&": 4,
    "|": 5,
    "^": 6,
    "&": 7,
    "==": 8,
    "!=": 8,
    "===": 8,
    "!==": 8,
    "<": 9,
    ">": 9,
    "<=": 9,
    ">=": 9,
    in: 9,
    instanceof: 9,
    "<<": 10,
    ">>": 10,
    ">>>": 10,
    "+": 11,
    "-": 11,
    "*": 12,
    "%": 12,
    "/": 12,
    "**": 13,
  };

  // Enables parenthesis regardless of precedence
  var NEEDS_PARENTHESES = 17;

  var EXPRESSIONS_PRECEDENCE = {
    // Definitions
    ArrayExpression: 20,
    TaggedTemplateExpression: 20,
    ThisExpression: 20,
    Identifier: 20,
    Literal: 18,
    TemplateLiteral: 20,
    Super: 20,
    SequenceExpression: 20,
    // Operations
    MemberExpression: 19,
    CallExpression: 19,
    NewExpression: 19,
    // Other definitions
    ArrowFunctionExpression: NEEDS_PARENTHESES,
    ClassExpression: NEEDS_PARENTHESES,
    FunctionExpression: NEEDS_PARENTHESES,
    ObjectExpression: NEEDS_PARENTHESES,
    // Other operations
    UpdateExpression: 16,
    UnaryExpression: 15,
    BinaryExpression: 14,
    LogicalExpression: 13,
    ConditionalExpression: 4,
    AssignmentExpression: 3,
    AwaitExpression: 2,
    YieldExpression: 2,
    RestElement: 1,
  };

  function formatSequence(state, nodes) {
    /*
    Writes into `state` a sequence of `nodes`.
    */
    var generator = state.generator;
    state.write("(");
    if (nodes != null && nodes.length > 0) {
      generator[nodes[0].type](nodes[0], state);
      var length = nodes.length;
      for (var i = 1; i < length; i++) {
        var param = nodes[i];
        state.write(", ");
        generator[param.type](param, state);
      }
    }
    state.write(")");
  }

  function expressionNeedsParenthesis(node, parentNode, isRightHand) {
    var nodePrecedence = EXPRESSIONS_PRECEDENCE[node.type];
    if (nodePrecedence === NEEDS_PARENTHESES) {
      return true;
    }
    var parentNodePrecedence = EXPRESSIONS_PRECEDENCE[parentNode.type];
    if (nodePrecedence !== parentNodePrecedence) {
      // Different node types
      return (
        (!isRightHand &&
          nodePrecedence === 15 &&
          parentNodePrecedence === 14 &&
          parentNode.operator === "**") ||
        nodePrecedence < parentNodePrecedence
      );
    }
    if (nodePrecedence !== 13 && nodePrecedence !== 14) {
      // Not a `LogicalExpression` or `BinaryExpression`
      return false;
    }
    if (node.operator === "**" && parentNode.operator === "**") {
      // Exponentiation operator has right-to-left associativity
      return !isRightHand;
    }
    if (isRightHand) {
      // Parenthesis are used if both operators have the same precedence
      return (
        OPERATOR_PRECEDENCE[node.operator] <=
          OPERATOR_PRECEDENCE[parentNode.operator]
      );
    }
    return (
      OPERATOR_PRECEDENCE[node.operator] <
        OPERATOR_PRECEDENCE[parentNode.operator]
    );
  }

  function formatBinaryExpressionPart(state, node, parentNode, isRightHand) {
    /*
    Writes into `state` a left-hand or right-hand expression `node`
    from a binary expression applying the provided `operator`.
    The `isRightHand` parameter should be `true` if the `node` is a right-hand argument.
    */
    var generator = state.generator;
    if (expressionNeedsParenthesis(node, parentNode, isRightHand)) {
      state.write("(");
      generator[node.type](node, state);
      state.write(")");
    } else {
      generator[node.type](node, state);
    }
  }

  function reindent(state, text, indent, lineEnd) {
    /*
    Writes into `state` the `text` string reindented with the provided `indent`.
    */
    var lines = text.split("\n");
    var end = lines.length - 1;
    state.write(lines[0].trim());
    if (end > 0) {
      state.write(lineEnd);
      for (var i = 1; i < end; i++) {
        state.write(indent + lines[i].trim() + lineEnd);
      }
      state.write(indent + lines[end].trim());
    }
  }

  function formatComments(state, comments, indent, lineEnd) {
    /*
    Writes into `state` the provided list of `comments`, with the given `indent` and `lineEnd` strings.
    Line comments will end with `"\n"` regardless of the value of `lineEnd`.
    Expects to start on a new unindented line.
    */
    var length = comments.length;
    for (var i = 0; i < length; i++) {
      var comment = comments[i];
      state.write(indent);
      if (comment.type[0] === "L") {
        // Line comment
        state.write("// " + comment.value.trim() + "\n");
      } else {
        // Block comment
        state.write("/*");
        reindent(state, comment.value, indent, lineEnd);
        state.write("*/" + lineEnd);
      }
    }
  }

  function hasCallExpression(node) {
    /*
    Returns `true` if the provided `node` contains a call expression and `false` otherwise.
    */
    var currentNode = node;
    while (currentNode != null) {
      var type = currentNode.type;
      if (type[0] === "C" && type[1] === "a") {
        // Is CallExpression
        return true;
      } else if (type[0] === "M" && type[1] === "e" && type[2] === "m") {
        // Is MemberExpression
        currentNode = currentNode.object;
      } else {
        return false;
      }
    }
  }

  function formatVariableDeclaration(state, node) {
    /*
    Writes into `state` a variable declaration.
    */
    var generator = state.generator;
    var declarations = node.declarations;
    state.write(node.kind + " ");
    var length = declarations.length;
    if (length > 0) {
      generator.VariableDeclarator(declarations[0], state);
      for (var i = 1; i < length; i++) {
        state.write(", ");
        generator.VariableDeclarator(declarations[i], state);
      }
    }
  }

  var ForInStatement,
    FunctionDeclaration,
    RestElement,
    BinaryExpression,
    ArrayExpression,
    BlockStatement;

  var baseGenerator = {
    Program: function Program(node, state) {
      var indent = state.indent.repeat(state.indentLevel);
      var lineEnd = state.lineEnd;
      var writeComments = state.writeComments;
      if (writeComments && node.comments != null) {
        formatComments(state, node.comments, indent, lineEnd);
      }
      var statements = node.body;
      var length = statements.length;
      for (var i = 0; i < length; i++) {
        var statement = statements[i];
        if (writeComments && statement.comments != null) {
          formatComments(state, statement.comments, indent, lineEnd);
        }
        state.write(indent);
        this[statement.type](statement, state);
        state.write(lineEnd);
      }
      if (writeComments && node.trailingComments != null) {
        formatComments(state, node.trailingComments, indent, lineEnd);
      }
    },
    BlockStatement: (BlockStatement = function (node, state) {
      var indent = state.indent.repeat(state.indentLevel++);
      var lineEnd = state.lineEnd;
      var writeComments = state.writeComments;
      var statementIndent = indent + state.indent;
      state.write("{");
      var statements = node.body;
      if (statements != null && statements.length > 0) {
        state.write(lineEnd);
        if (writeComments && node.comments != null) {
          formatComments(state, node.comments, statementIndent, lineEnd);
        }
        var length = statements.length;
        for (var i = 0; i < length; i++) {
          var statement = statements[i];
          if (writeComments && statement.comments != null) {
            formatComments(state, statement.comments, statementIndent, lineEnd);
          }
          state.write(statementIndent);
          this[statement.type](statement, state);
          state.write(lineEnd);
        }
        state.write(indent);
      } else {
        if (writeComments && node.comments != null) {
          state.write(lineEnd);
          formatComments(state, node.comments, statementIndent, lineEnd);
          state.write(indent);
        }
      }
      if (writeComments && node.trailingComments != null) {
        formatComments(state, node.trailingComments, statementIndent, lineEnd);
      }
      state.write("}");
      state.indentLevel--;
    }),
    ClassBody: BlockStatement,
    EmptyStatement: function EmptyStatement(node, state) {
      state.write(";");
    },
    ExpressionStatement: function ExpressionStatement(node, state) {
      var precedence = EXPRESSIONS_PRECEDENCE[node.expression.type];
      if (
        precedence === NEEDS_PARENTHESES ||
        (precedence === 3 && node.expression.left.type[0] === "O")
      ) {
        // Should always have parentheses or is an AssignmentExpression to an ObjectPattern
        state.write("(");
        this[node.expression.type](node.expression, state);
        state.write(")");
      } else {
        this[node.expression.type](node.expression, state);
      }
      state.write(";");
    },
    IfStatement: function IfStatement(node, state) {
      state.write("if (");
      this[node.test.type](node.test, state);
      state.write(") ");
      this[node.consequent.type](node.consequent, state);
      if (node.alternate != null) {
        state.write(" else ");
        this[node.alternate.type](node.alternate, state);
      }
    },
    LabeledStatement: function LabeledStatement(node, state) {
      this[node.label.type](node.label, state);
      state.write(": ");
      this[node.body.type](node.body, state);
    },
    BreakStatement: function BreakStatement(node, state) {
      state.write("break");
      if (node.label != null) {
        state.write(" ");
        this[node.label.type](node.label, state);
      }
      state.write(";");
    },
    ContinueStatement: function ContinueStatement(node, state) {
      state.write("continue");
      if (node.label != null) {
        state.write(" ");
        this[node.label.type](node.label, state);
      }
      state.write(";");
    },
    WithStatement: function WithStatement(node, state) {
      state.write("with (");
      this[node.object.type](node.object, state);
      state.write(") ");
      this[node.body.type](node.body, state);
    },
    SwitchStatement: function SwitchStatement(node, state) {
      var indent = state.indent.repeat(state.indentLevel++);
      var lineEnd = state.lineEnd;
      var writeComments = state.writeComments;
      state.indentLevel++;
      var caseIndent = indent + state.indent;
      var statementIndent = caseIndent + state.indent;
      state.write("switch (");
      this[node.discriminant.type](node.discriminant, state);
      state.write(") {" + lineEnd);
      var occurences = node.cases;
      var occurencesCount = occurences.length;
      for (var i = 0; i < occurencesCount; i++) {
        var occurence = occurences[i];
        if (writeComments && occurence.comments != null) {
          formatComments(state, occurence.comments, caseIndent, lineEnd);
        }
        if (occurence.test) {
          state.write(caseIndent + "case ");
          this[occurence.test.type](occurence.test, state);
          state.write(":" + lineEnd);
        } else {
          state.write(caseIndent + "default:" + lineEnd);
        }
        var consequent = occurence.consequent;
        var consequentCount = consequent.length;
        for (var i$1 = 0; i$1 < consequentCount; i$1++) {
          var statement = consequent[i$1];
          if (writeComments && statement.comments != null) {
            formatComments(state, statement.comments, statementIndent, lineEnd);
          }
          state.write(statementIndent);
          this[statement.type](statement, state);
          state.write(lineEnd);
        }
      }
      state.indentLevel -= 2;
      state.write(indent + "}");
    },
    ReturnStatement: function ReturnStatement(node, state) {
      state.write("return");
      if (node.argument) {
        state.write(" ");
        this[node.argument.type](node.argument, state);
      }
      state.write(";");
    },
    ThrowStatement: function ThrowStatement(node, state) {
      state.write("throw ");
      this[node.argument.type](node.argument, state);
      state.write(";");
    },
    TryStatement: function TryStatement(node, state) {
      state.write("try ");
      this[node.block.type](node.block, state);
      if (node.handler) {
        var handler = node.handler;
        if (handler.param == null) {
          state.write(" catch ");
        } else {
          state.write(" catch (");
          this[handler.param.type](handler.param, state);
          state.write(") ");
        }
        this[handler.body.type](handler.body, state);
      }
      if (node.finalizer) {
        state.write(" finally ");
        this[node.finalizer.type](node.finalizer, state);
      }
    },
    WhileStatement: function WhileStatement(node, state) {
      state.write("while (");
      this[node.test.type](node.test, state);
      state.write(") ");
      this[node.body.type](node.body, state);
    },
    DoWhileStatement: function DoWhileStatement(node, state) {
      state.write("do ");
      this[node.body.type](node.body, state);
      state.write(" while (");
      this[node.test.type](node.test, state);
      state.write(");");
    },
    ForStatement: function ForStatement(node, state) {
      state.write("for (");
      if (node.init != null) {
        var init = node.init;
        if (init.type[0] === "V") {
          formatVariableDeclaration(state, init);
        } else {
          this[init.type](init, state);
        }
      }
      state.write("; ");
      if (node.test) {
        this[node.test.type](node.test, state);
      }
      state.write("; ");
      if (node.update) {
        this[node.update.type](node.update, state);
      }
      state.write(") ");
      this[node.body.type](node.body, state);
    },
    ForInStatement: (ForInStatement = function (node, state) {
      state.write(("for " + (node.await ? "await " : "") + "("));
      var left = node.left;
      if (left.type[0] === "V") {
        formatVariableDeclaration(state, left);
      } else {
        this[left.type](left, state);
      }
      // Identifying whether node.type is `ForInStatement` or `ForOfStatement`
      state.write(node.type[3] === "I" ? " in " : " of ");
      this[node.right.type](node.right, state);
      state.write(") ");
      this[node.body.type](node.body, state);
    }),
    ForOfStatement: ForInStatement,
    DebuggerStatement: function DebuggerStatement(node, state) {
      state.write("debugger;" + state.lineEnd);
    },
    FunctionDeclaration: (FunctionDeclaration = function (node, state) {
      state.write(
        (node.async ? "async " : "") +
          (node.generator ? "function* " : "function ") +
          (node.id ? node.id.name : ""),
        node,
      );
      formatSequence(state, node.params);
      state.write(" ");
      this[node.body.type](node.body, state);
    }),
    FunctionExpression: FunctionDeclaration,
    VariableDeclaration: function VariableDeclaration(node, state) {
      formatVariableDeclaration(state, node);
      state.write(";");
    },
    VariableDeclarator: function VariableDeclarator(node, state) {
      this[node.id.type](node.id, state);
      if (node.init != null) {
        state.write(" = ");
        this[node.init.type](node.init, state);
      }
    },
    ClassDeclaration: function ClassDeclaration(node, state) {
      state.write("class " + (node.id ? ((node.id.name) + " ") : ""), node);
      if (node.superClass) {
        state.write("extends ");
        this[node.superClass.type](node.superClass, state);
        state.write(" ");
      }
      this.ClassBody(node.body, state);
    },
    ImportDeclaration: function ImportDeclaration(node, state) {
      state.write("import ");
      var specifiers = node.specifiers;
      var length = specifiers.length;
      // NOTE: Once babili is fixed, put this after condition
      // https://github.com/babel/babili/issues/430
      var i = 0;
      if (length > 0) {
        for (; i < length;) {
          if (i > 0) {
            state.write(", ");
          }
          var specifier = specifiers[i];
          var type = specifier.type[6];
          if (type === "D") {
            // ImportDefaultSpecifier
            state.write(specifier.local.name, specifier);
            i++;
          } else if (type === "N") {
            // ImportNamespaceSpecifier
            state.write("* as " + specifier.local.name, specifier);
            i++;
          } else {
            // ImportSpecifier
            break;
          }
        }
        if (i < length) {
          state.write("{");
          for (;;) {
            var specifier$1 = specifiers[i];
            var ref = specifier$1.imported;
            var name = ref.name;
            state.write(name, specifier$1);
            if (name !== specifier$1.local.name) {
              state.write(" as " + specifier$1.local.name);
            }
            if (++i < length) {
              state.write(", ");
            } else {
              break;
            }
          }
          state.write("}");
        }
        state.write(" from ");
      }
      this.Literal(node.source, state);
      state.write(";");
    },
    ExportDefaultDeclaration: function ExportDefaultDeclaration(node, state) {
      state.write("export default ");
      this[node.declaration.type](node.declaration, state);
      if (
        EXPRESSIONS_PRECEDENCE[node.declaration.type] &&
        node.declaration.type[0] !== "F"
      ) {
        // All expression nodes except `FunctionExpression`
        state.write(";");
      }
    },
    ExportNamedDeclaration: function ExportNamedDeclaration(node, state) {
      state.write("export ");
      if (node.declaration) {
        this[node.declaration.type](node.declaration, state);
      } else {
        state.write("{");
        var specifiers = node.specifiers;
        var length = specifiers.length;
        if (length > 0) {
          for (var i = 0;;) {
            var specifier = specifiers[i];
            var ref = specifier.local;
            var name = ref.name;
            state.write(name, specifier);
            if (name !== specifier.exported.name) {
              state.write(" as " + specifier.exported.name);
            }
            if (++i < length) {
              state.write(", ");
            } else {
              break;
            }
          }
        }
        state.write("}");
        if (node.source) {
          state.write(" from ");
          this.Literal(node.source, state);
        }
        state.write(";");
      }
    },
    ExportAllDeclaration: function ExportAllDeclaration(node, state) {
      state.write("export * from ");
      this.Literal(node.source, state);
      state.write(";");
    },
    MethodDefinition: function MethodDefinition(node, state) {
      if (node.static) {
        state.write("static ");
      }
      var kind = node.kind[0];
      if (kind === "g" || kind === "s") {
        // Getter or setter
        state.write(node.kind + " ");
      }
      if (node.value.async) {
        state.write("async ");
      }
      if (node.value.generator) {
        state.write("*");
      }
      if (node.computed) {
        state.write("[");
        this[node.key.type](node.key, state);
        state.write("]");
      } else {
        this[node.key.type](node.key, state);
      }
      formatSequence(state, node.value.params);
      state.write(" ");
      this[node.value.body.type](node.value.body, state);
    },
    ClassExpression: function ClassExpression(node, state) {
      this.ClassDeclaration(node, state);
    },
    ArrowFunctionExpression: function ArrowFunctionExpression(node, state) {
      state.write(node.async ? "async " : "", node);
      var params = node.params;
      if (params != null) {
        // Omit parenthesis if only one named parameter
        if (params.length === 1 && params[0].type[0] === "I") {
          // If params[0].type[0] starts with 'I', it can't be `ImportDeclaration` nor `IfStatement` and thus is `Identifier`
          state.write(params[0].name, params[0]);
        } else {
          formatSequence(state, node.params);
        }
      }
      state.write(" => ");
      if (node.body.type[0] === "O") {
        // Body is an object expression
        state.write("(");
        this.ObjectExpression(node.body, state);
        state.write(")");
      } else {
        this[node.body.type](node.body, state);
      }
    },
    ThisExpression: function ThisExpression(node, state) {
      state.write("this", node);
    },
    Super: function Super(node, state) {
      state.write("super", node);
    },
    RestElement: (RestElement = function (node, state) {
      state.write("...");
      this[node.argument.type](node.argument, state);
    }),
    SpreadElement: RestElement,
    YieldExpression: function YieldExpression(node, state) {
      state.write(node.delegate ? "yield*" : "yield");
      if (node.argument) {
        state.write(" ");
        this[node.argument.type](node.argument, state);
      }
    },
    AwaitExpression: function AwaitExpression(node, state) {
      state.write("await ");
      if (node.argument) {
        this[node.argument.type](node.argument, state);
      }
    },
    TemplateLiteral: function TemplateLiteral(node, state) {
      var quasis = node.quasis;
      var expressions = node.expressions;
      state.write("`");
      var length = expressions.length;
      for (var i = 0; i < length; i++) {
        var expression = expressions[i];
        this.TemplateElement(quasis[i], state);
        state.write("${");
        this[expression.type](expression, state);
        state.write("}");
      }
      state.write(quasis[quasis.length - 1].value.raw);
      state.write("`");
    },
    TemplateElement: function TemplateElement(node, state) {
      state.write(node.value.raw);
    },
    TaggedTemplateExpression: function TaggedTemplateExpression(node, state) {
      this[node.tag.type](node.tag, state);
      this[node.quasi.type](node.quasi, state);
    },
    ArrayExpression: (ArrayExpression = function (node, state) {
      state.write("[");
      if (node.elements.length > 0) {
        var elements = node.elements;
        var length = elements.length;
        for (var i = 0;;) {
          var element = elements[i];
          if (element != null) {
            this[element.type](element, state);
          }
          if (++i < length) {
            state.write(", ");
          } else {
            if (element == null) {
              state.write(", ");
            }
            break;
          }
        }
      }
      state.write("]");
    }),
    ArrayPattern: ArrayExpression,
    ObjectExpression: function ObjectExpression(node, state) {
      var indent = state.indent.repeat(state.indentLevel++);
      var lineEnd = state.lineEnd;
      var writeComments = state.writeComments;
      var propertyIndent = indent + state.indent;
      state.write("{");
      if (node.properties.length > 0) {
        state.write(lineEnd);
        if (writeComments && node.comments != null) {
          formatComments(state, node.comments, propertyIndent, lineEnd);
        }
        var comma = "," + lineEnd;
        var properties = node.properties;
        var length = properties.length;
        for (var i = 0;;) {
          var property = properties[i];
          if (writeComments && property.comments != null) {
            formatComments(state, property.comments, propertyIndent, lineEnd);
          }
          state.write(propertyIndent);
          this[property.type](property, state);
          if (++i < length) {
            state.write(comma);
          } else {
            break;
          }
        }
        state.write(lineEnd);
        if (writeComments && node.trailingComments != null) {
          formatComments(state, node.trailingComments, propertyIndent, lineEnd);
        }
        state.write(indent + "}");
      } else if (writeComments) {
        if (node.comments != null) {
          state.write(lineEnd);
          formatComments(state, node.comments, propertyIndent, lineEnd);
          if (node.trailingComments != null) {
            formatComments(
              state,
              node.trailingComments,
              propertyIndent,
              lineEnd,
            );
          }
          state.write(indent + "}");
        } else if (node.trailingComments != null) {
          state.write(lineEnd);
          formatComments(state, node.trailingComments, propertyIndent, lineEnd);
          state.write(indent + "}");
        } else {
          state.write("}");
        }
      } else {
        state.write("}");
      }
      state.indentLevel--;
    },
    Property: function Property(node, state) {
      if (node.method || node.kind[0] !== "i") {
        // Either a method or of kind `set` or `get` (not `init`)
        this.MethodDefinition(node, state);
      } else {
        if (!node.shorthand) {
          if (node.computed) {
            state.write("[");
            this[node.key.type](node.key, state);
            state.write("]");
          } else {
            this[node.key.type](node.key, state);
          }
          state.write(": ");
        }
        this[node.value.type](node.value, state);
      }
    },
    ObjectPattern: function ObjectPattern(node, state) {
      state.write("{");
      if (node.properties.length > 0) {
        var properties = node.properties;
        var length = properties.length;
        for (var i = 0;;) {
          this[properties[i].type](properties[i], state);
          if (++i < length) {
            state.write(", ");
          } else {
            break;
          }
        }
      }
      state.write("}");
    },
    SequenceExpression: function SequenceExpression(node, state) {
      formatSequence(state, node.expressions);
    },
    UnaryExpression: function UnaryExpression(node, state) {
      if (node.prefix) {
        state.write(node.operator);
        if (node.operator.length > 1) {
          state.write(" ");
        }
        if (
          EXPRESSIONS_PRECEDENCE[node.argument.type] <
            EXPRESSIONS_PRECEDENCE.UnaryExpression
        ) {
          state.write("(");
          this[node.argument.type](node.argument, state);
          state.write(")");
        } else {
          this[node.argument.type](node.argument, state);
        }
      } else {
        // FIXME: This case never occurs
        this[node.argument.type](node.argument, state);
        state.write(node.operator);
      }
    },
    UpdateExpression: function UpdateExpression(node, state) {
      // Always applied to identifiers or members, no parenthesis check needed
      if (node.prefix) {
        state.write(node.operator);
        this[node.argument.type](node.argument, state);
      } else {
        this[node.argument.type](node.argument, state);
        state.write(node.operator);
      }
    },
    AssignmentExpression: function AssignmentExpression(node, state) {
      this[node.left.type](node.left, state);
      state.write(" " + node.operator + " ");
      this[node.right.type](node.right, state);
    },
    AssignmentPattern: function AssignmentPattern(node, state) {
      this[node.left.type](node.left, state);
      state.write(" = ");
      this[node.right.type](node.right, state);
    },
    BinaryExpression: (BinaryExpression = function (node, state) {
      var isIn = node.operator === "in";
      if (isIn) {
        // Avoids confusion in `for` loops initializers
        state.write("(");
      }
      formatBinaryExpressionPart(state, node.left, node, false);
      state.write(" " + node.operator + " ");
      formatBinaryExpressionPart(state, node.right, node, true);
      if (isIn) {
        state.write(")");
      }
    }),
    LogicalExpression: BinaryExpression,
    ConditionalExpression: function ConditionalExpression(node, state) {
      if (
        EXPRESSIONS_PRECEDENCE[node.test.type] >
          EXPRESSIONS_PRECEDENCE.ConditionalExpression
      ) {
        this[node.test.type](node.test, state);
      } else {
        state.write("(");
        this[node.test.type](node.test, state);
        state.write(")");
      }
      state.write(" ? ");
      this[node.consequent.type](node.consequent, state);
      state.write(" : ");
      this[node.alternate.type](node.alternate, state);
    },
    NewExpression: function NewExpression(node, state) {
      state.write("new ");
      if (
        EXPRESSIONS_PRECEDENCE[node.callee.type] <
          EXPRESSIONS_PRECEDENCE.CallExpression ||
        hasCallExpression(node.callee)
      ) {
        state.write("(");
        this[node.callee.type](node.callee, state);
        state.write(")");
      } else {
        this[node.callee.type](node.callee, state);
      }
      formatSequence(state, node["arguments"]);
    },
    CallExpression: function CallExpression(node, state) {
      if (
        EXPRESSIONS_PRECEDENCE[node.callee.type] <
          EXPRESSIONS_PRECEDENCE.CallExpression
      ) {
        state.write("(");
        this[node.callee.type](node.callee, state);
        state.write(")");
      } else {
        this[node.callee.type](node.callee, state);
      }
      formatSequence(state, node["arguments"]);
    },
    MemberExpression: function MemberExpression(node, state) {
      if (
        EXPRESSIONS_PRECEDENCE[node.object.type] <
          EXPRESSIONS_PRECEDENCE.MemberExpression
      ) {
        state.write("(");
        this[node.object.type](node.object, state);
        state.write(")");
      } else {
        this[node.object.type](node.object, state);
      }
      if (node.computed) {
        state.write("[");
        this[node.property.type](node.property, state);
        state.write("]");
      } else {
        state.write(".");
        this[node.property.type](node.property, state);
      }
    },
    MetaProperty: function MetaProperty(node, state) {
      state.write(node.meta.name + "." + node.property.name, node);
    },
    Identifier: function Identifier(node, state) {
      state.write(node.name, node);
    },
    Literal: function Literal(node, state) {
      if (node.raw != null) {
        state.write(node.raw, node);
      } else if (node.regex != null) {
        this.RegExpLiteral(node, state);
      } else {
        state.write(stringify(node.value), node);
      }
    },
    RegExpLiteral: function RegExpLiteral(node, state) {
      var regex = node.regex;
      state.write(("/" + (regex.pattern) + "/" + (regex.flags)), node);
    },
  };

  var EMPTY_OBJECT = {};

  var State = function State(options) {
    var setup = options == null ? EMPTY_OBJECT : options;
    this.output = "";
    // Functional options
    if (setup.output != null) {
      this.output = setup.output;
      this.write = this.writeToStream;
    } else {
      this.output = "";
    }
    this.generator = setup.generator != null ? setup.generator : baseGenerator;
    // Formating setup
    this.indent = setup.indent != null ? setup.indent : "  ";
    this.lineEnd = setup.lineEnd != null ? setup.lineEnd : "\n";
    this.indentLevel = setup.startingIndentLevel != null
      ? setup.startingIndentLevel
      : 0;
    this.writeComments = setup.comments ? setup.comments : false;
    // Source map
    if (setup.sourceMap != null) {
      this.write = setup.output == null
        ? this.writeAndMap
        : this.writeToStreamAndMap;
      this.sourceMap = setup.sourceMap;
      this.line = 1;
      this.column = 0;
      this.lineEndSize = this.lineEnd.split("\n").length - 1;
      this.mapping = {
        original: null,
        generated: this,
        name: undefined,
        source: setup.sourceMap.file || setup.sourceMap._file,
      };
    }
  };

  State.prototype.write = function write(code) {
    this.output += code;
  };

  State.prototype.writeToStream = function writeToStream(code) {
    this.output.write(code);
  };

  State.prototype.writeAndMap = function writeAndMap(code, node) {
    this.output += code;
    this.map(code, node);
  };

  State.prototype.writeToStreamAndMap = function writeToStreamAndMap(
    code,
    node,
  ) {
    this.output.write(code);
    this.map(code, node);
  };

  State.prototype.map = function map(code, node) {
    if (node != null && node.loc != null) {
      var ref = this;
      var mapping = ref.mapping;
      mapping.original = node.loc.start;
      mapping.name = node.name;
      this.sourceMap.addMapping(mapping);
    }
    if (code.length > 0) {
      if (this.lineEndSize > 0) {
        if (code.endsWith(this.lineEnd)) {
          this.line += this.lineEndSize;
          this.column = 0;
        } else if (code[code.length - 1] === "\n") {
          // Case of inline comment
          this.line++;
          this.column = 0;
        } else {
          this.column += code.length;
        }
      } else {
        if (code[code.length - 1] === "\n") {
          // Case of inline comment
          this.line++;
          this.column = 0;
        } else {
          this.column += code.length;
        }
      }
    }
  };

  State.prototype.toString = function toString() {
    return this.output;
  };

  function generate(node, options) {
    /*
    Returns a string representing the rendered code of the provided AST `node`.
    The `options` are:

    - `indent`: string to use for indentation (defaults to `␣␣`)
    - `lineEnd`: string to use for line endings (defaults to `\n`)
    - `startingIndentLevel`: indent level to start from (defaults to `0`)
    - `comments`: generate comments if `true` (defaults to `false`)
    - `output`: output stream to write the rendered code to (defaults to `null`)
    - `generator`: custom code generator (defaults to `baseGenerator`)
    */
    var state = new State(options);
    // Travel through the AST node and generate the code
    state.generator[node.type](node, state);
    return state.output;
  }

  // unique temporary variable index
  var utvidx = 1;
  function reserveTempVarId() {
    return (
      ("" + TEMP_VAR_BASE + (utvidx++))
    );
  }
  // general unique index
  var uidx = 1;
  function uid() {
    return uidx++;
  }
  // unique branch index
  var ubidx = 1;
  function uBranchHash() {
    return ubidx++;
  }
  function parse$1() {
    return parse.apply(void 0, arguments);
  }
  function generate$1() {
    return generate.apply(null, arguments);
  }

  var _utils = /*#__PURE__*/ Object.freeze({
    __proto__: null,
    reserveTempVarId: reserveTempVarId,
    uid: uid,
    uBranchHash: uBranchHash,
    parse: parse$1,
    generate: generate$1,
  });

  // AST walker module for Mozilla Parser API compatible trees

  // A recursive walk is one where your functions override the default
  // walkers. They can modify and replace the state parameter that's
  // threaded through the walk, and can opt how and whether to walk
  // their child nodes (by calling their third argument on these
  // nodes).
  function recursive(node, state, funcs, baseVisitor, override) {
    var visitor = funcs ? make(funcs, baseVisitor || undefined) : baseVisitor;
    (function c(node, st, override) {
      visitor[override || node.type](node, st, c);
    })(node, state, override);
  }

  // A full walk triggers the callback on each node
  function full(node, callback, baseVisitor, state, override) {
    if (!baseVisitor) baseVisitor = base;
    (function c(node, st, override) {
      var type = override || node.type;
      baseVisitor[type](node, st, c);
      if (!override) callback(node, st, type);
    })(node, state, override);
  }

  // Fallback to an Object.create polyfill for older environments.
  var create = Object.create || function (proto) {
    function Ctor() {}
    Ctor.prototype = proto;
    return new Ctor();
  };

  // Used to create a custom walker. Will fill in all missing node
  // type properties with the defaults.
  function make(funcs, baseVisitor) {
    var visitor = create(baseVisitor || base);
    for (var type in funcs) visitor[type] = funcs[type];
    return visitor;
  }

  function skipThrough(node, st, c) {
    c(node, st);
  }
  function ignore(_node, _st, _c) {}

  // Node walkers.

  var base = {};

  base.Program = base.BlockStatement = function (node, st, c) {
    for (var i = 0, list = node.body; i < list.length; i += 1) {
      var stmt = list[i];

      c(stmt, st, "Statement");
    }
  };
  base.Statement = skipThrough;
  base.EmptyStatement = ignore;
  base.ExpressionStatement = base.ParenthesizedExpression = base
    .ChainExpression = function (node, st, c) {
      return c(node.expression, st, "Expression");
    };
  base.IfStatement = function (node, st, c) {
    c(node.test, st, "Expression");
    c(node.consequent, st, "Statement");
    if (node.alternate) c(node.alternate, st, "Statement");
  };
  base.LabeledStatement = function (node, st, c) {
    return c(node.body, st, "Statement");
  };
  base.BreakStatement = base.ContinueStatement = ignore;
  base.WithStatement = function (node, st, c) {
    c(node.object, st, "Expression");
    c(node.body, st, "Statement");
  };
  base.SwitchStatement = function (node, st, c) {
    c(node.discriminant, st, "Expression");
    for (var i$1 = 0, list$1 = node.cases; i$1 < list$1.length; i$1 += 1) {
      var cs = list$1[i$1];

      if (cs.test) c(cs.test, st, "Expression");
      for (var i = 0, list = cs.consequent; i < list.length; i += 1) {
        var cons = list[i];

        c(cons, st, "Statement");
      }
    }
  };
  base.SwitchCase = function (node, st, c) {
    if (node.test) c(node.test, st, "Expression");
    for (var i = 0, list = node.consequent; i < list.length; i += 1) {
      var cons = list[i];

      c(cons, st, "Statement");
    }
  };
  base.ReturnStatement = base.YieldExpression = base.AwaitExpression =
    function (node, st, c) {
      if (node.argument) c(node.argument, st, "Expression");
    };
  base.ThrowStatement = base.SpreadElement = function (node, st, c) {
    return c(node.argument, st, "Expression");
  };
  base.TryStatement = function (node, st, c) {
    c(node.block, st, "Statement");
    if (node.handler) c(node.handler, st);
    if (node.finalizer) c(node.finalizer, st, "Statement");
  };
  base.CatchClause = function (node, st, c) {
    if (node.param) c(node.param, st, "Pattern");
    c(node.body, st, "Statement");
  };
  base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
    c(node.test, st, "Expression");
    c(node.body, st, "Statement");
  };
  base.ForStatement = function (node, st, c) {
    if (node.init) c(node.init, st, "ForInit");
    if (node.test) c(node.test, st, "Expression");
    if (node.update) c(node.update, st, "Expression");
    c(node.body, st, "Statement");
  };
  base.ForInStatement = base.ForOfStatement = function (node, st, c) {
    c(node.left, st, "ForInit");
    c(node.right, st, "Expression");
    c(node.body, st, "Statement");
  };
  base.ForInit = function (node, st, c) {
    if (node.type === "VariableDeclaration") c(node, st);
    else c(node, st, "Expression");
  };
  base.DebuggerStatement = ignore;

  base.FunctionDeclaration = function (node, st, c) {
    return c(node, st, "Function");
  };
  base.VariableDeclaration = function (node, st, c) {
    for (var i = 0, list = node.declarations; i < list.length; i += 1) {
      var decl = list[i];

      c(decl, st);
    }
  };
  base.VariableDeclarator = function (node, st, c) {
    c(node.id, st, "Pattern");
    if (node.init) c(node.init, st, "Expression");
  };

  base.Function = function (node, st, c) {
    if (node.id) c(node.id, st, "Pattern");
    for (var i = 0, list = node.params; i < list.length; i += 1) {
      var param = list[i];

      c(param, st, "Pattern");
    }
    c(node.body, st, node.expression ? "Expression" : "Statement");
  };

  base.Pattern = function (node, st, c) {
    if (node.type === "Identifier") {
      c(node, st, "VariablePattern");
    } else if (node.type === "MemberExpression") {
      c(node, st, "MemberPattern");
    } else {
      c(node, st);
    }
  };
  base.VariablePattern = ignore;
  base.MemberPattern = skipThrough;
  base.RestElement = function (node, st, c) {
    return c(node.argument, st, "Pattern");
  };
  base.ArrayPattern = function (node, st, c) {
    for (var i = 0, list = node.elements; i < list.length; i += 1) {
      var elt = list[i];

      if (elt) c(elt, st, "Pattern");
    }
  };
  base.ObjectPattern = function (node, st, c) {
    for (var i = 0, list = node.properties; i < list.length; i += 1) {
      var prop = list[i];

      if (prop.type === "Property") {
        if (prop.computed) c(prop.key, st, "Expression");
        c(prop.value, st, "Pattern");
      } else if (prop.type === "RestElement") {
        c(prop.argument, st, "Pattern");
      }
    }
  };

  base.Expression = skipThrough;
  base.ThisExpression = base.Super = base.MetaProperty = ignore;
  base.ArrayExpression = function (node, st, c) {
    for (var i = 0, list = node.elements; i < list.length; i += 1) {
      var elt = list[i];

      if (elt) c(elt, st, "Expression");
    }
  };
  base.ObjectExpression = function (node, st, c) {
    for (var i = 0, list = node.properties; i < list.length; i += 1) {
      var prop = list[i];

      c(prop, st);
    }
  };
  base.FunctionExpression = base.ArrowFunctionExpression =
    base.FunctionDeclaration;
  base.SequenceExpression = function (node, st, c) {
    for (var i = 0, list = node.expressions; i < list.length; i += 1) {
      var expr = list[i];

      c(expr, st, "Expression");
    }
  };
  base.TemplateLiteral = function (node, st, c) {
    for (var i = 0, list = node.quasis; i < list.length; i += 1) {
      var quasi = list[i];

      c(quasi, st);
    }

    for (
      var i$1 = 0, list$1 = node.expressions;
      i$1 < list$1.length;
      i$1 += 1
    ) {
      var expr = list$1[i$1];

      c(expr, st, "Expression");
    }
  };
  base.TemplateElement = ignore;
  base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
    c(node.argument, st, "Expression");
  };
  base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
    c(node.left, st, "Expression");
    c(node.right, st, "Expression");
  };
  base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
    c(node.left, st, "Pattern");
    c(node.right, st, "Expression");
  };
  base.ConditionalExpression = function (node, st, c) {
    c(node.test, st, "Expression");
    c(node.consequent, st, "Expression");
    c(node.alternate, st, "Expression");
  };
  base.NewExpression = base.CallExpression = function (node, st, c) {
    c(node.callee, st, "Expression");
    if (node.arguments) {
      for (var i = 0, list = node.arguments; i < list.length; i += 1) {
        var arg = list[i];

        c(arg, st, "Expression");
      }
    }
  };
  base.MemberExpression = function (node, st, c) {
    c(node.object, st, "Expression");
    if (node.computed) c(node.property, st, "Expression");
  };
  base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (
    node,
    st,
    c,
  ) {
    if (node.declaration) {
      c(
        node.declaration,
        st,
        node.type === "ExportNamedDeclaration" || node.declaration.id
          ? "Statement"
          : "Expression",
      );
    }
    if (node.source) c(node.source, st, "Expression");
  };
  base.ExportAllDeclaration = function (node, st, c) {
    if (node.exported) {
      c(node.exported, st);
    }
    c(node.source, st, "Expression");
  };
  base.ImportDeclaration = function (node, st, c) {
    for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
      var spec = list[i];

      c(spec, st);
    }
    c(node.source, st, "Expression");
  };
  base.ImportExpression = function (node, st, c) {
    c(node.source, st, "Expression");
  };
  base.ImportSpecifier = base.ImportDefaultSpecifier = base
    .ImportNamespaceSpecifier = base.Identifier = base.Literal = ignore;

  base.TaggedTemplateExpression = function (node, st, c) {
    c(node.tag, st, "Expression");
    c(node.quasi, st, "Expression");
  };
  base.ClassDeclaration = base.ClassExpression = function (node, st, c) {
    return c(node, st, "Class");
  };
  base.Class = function (node, st, c) {
    if (node.id) c(node.id, st, "Pattern");
    if (node.superClass) c(node.superClass, st, "Expression");
    c(node.body, st);
  };
  base.ClassBody = function (node, st, c) {
    for (var i = 0, list = node.body; i < list.length; i += 1) {
      var elt = list[i];

      c(elt, st);
    }
  };
  base.MethodDefinition = base.Property = function (node, st, c) {
    if (node.computed) c(node.key, st, "Expression");
    c(node.value, st, "Expression");
  };

  function getInheritanceTree(cls) {
    var base = cls;
    var tree = [cls.name];
    while (true) {
      base = Object.getPrototypeOf(base);
      if (base === Function.prototype) break;
      tree.push(base.name);
    }
    return tree;
  }
  function instructionToString(n) {
    for (var key in INSTR) {
      var value = INSTR[key];
      if (value === n) return key;
    }
    console.warn(("Unexpected instruction value " + n));
    return "";
  }
  function injectPatchIntoNode(node, patch, end) {
    var body = null;
    var type = node.type;
    if (type === "Program") body = node.body;
    else if (type === "BlockStatement") body = node.body;
    else if (type === "ForStatement") body = node.body.body;
    else if (isLoopStatement(type)) body = node.body.body;
    else if (isFunctionNode(type)) {
      body = node.body.body;
    } else console.error(("Invalid patch node type " + type));
    console.assert(body instanceof Array);
    // force patches to be magic
    patch.magic = true;
    if (end) body.push(patch);
    else body.unshift(patch);
  }
  function resolveCallee(node) {
    var type = node.type;
    if (node.type === "MemberExpression") {
      return node.object;
    }
    return node;
  }
  function isFunctionNode(type) {
    return (
      type === "FunctionExpression" ||
      type === "FunctionDeclaration" ||
      type === "ArrowFunctionExpression"
    );
  }
  function isStatement(type) {
    return (
      type === "BlockStatement" ||
      type === "BreakStatement" ||
      type === "ContinueStatement" ||
      type === "DebuggerStatement" ||
      type === "DoWhileStatement" ||
      type === "EmptyStatement" ||
      type === "ExpressionStatement" ||
      type === "ForInStatement" ||
      type === "ForStatement" ||
      type === "IfStatement" ||
      type === "LabeledStatement" ||
      type === "ReturnStatement" ||
      type === "SwitchStatement" ||
      type === "ThrowStatement" ||
      type === "TryStatement" ||
      type === "VariableDeclaration" ||
      type === "WhileStatement" ||
      type === "WithStatement"
    );
  }
  function isLoopStatement(type) {
    return (
      type === "ForStatement" ||
      type === "ForInStatement" ||
      type === "ForOfStatement" ||
      type === "WhileStatement" ||
      type === "DoWhileStatement"
    );
  }
  function isSwitchStatement(type) {
    return (
      type === "SwitchStatement"
    );
  }
  function isTryStatement(type) {
    return (
      type === "TryStatement"
    );
  }
  function isLabeledStatement(type) {
    return (
      type === "LabeledStatement"
    );
  }
  function isLoopFrameType(type) {
    return (
      type === INSTR.LOOP_ENTER
    );
  }
  function isSwitchFrameType(type) {
    return (
      type === INSTR.SWITCH_ENTER
    );
  }
  function isSwitchCaseFrameType(type) {
    return (
      type === INSTR.CASE_ENTER
    );
  }
  function isFunctionFrameType(type) {
    return (
      type === INSTR.FUNCTION_CALL
    );
  }
  function isMethodFrameType(type) {
    return (
      type === INSTR.METHOD_ENTER
    );
  }
  function isReturnableFrameType(type) {
    return (
      isMethodFrameType(type) ||
      isFunctionFrameType(type)
    );
  }
  function isBreakableFrameType(type) {
    return (
      isLoopFrameType(type) ||
      isSwitchFrameType(type)
    );
  }
  function isContinuableFrameType(type) {
    return (
      isLoopFrameType(type)
    );
  }
  function isTryStatementFrameType(type) {
    return (
      type === INSTR.TRY_ENTER
    );
  }
  function isCatchClauseFrameType(type) {
    return (
      type === INSTR.CATCH_ENTER
    );
  }
  function isFinalClauseFrameType(type) {
    return (
      type === INSTR.FINAL_ENTER
    );
  }
  function isInstantiationFrameType(type) {
    return (
      type === INSTR.OP_NEW
    );
  }
  function isValidFrameInstruction(frame) {
    console.assert(typeof frame.cleanType === "string");
    var type = frame.cleanType;
    return (
      INSTR[type] >= 0
    );
  }
  function operatorToString(op) {
    for (var key in OP) {
      if (OP[key] === op) return key;
    }
    return "undefined";
  }
  function processLabels(node) {
    var labels = [];
    // we can have multiple labels in js
    // *universe collapses*
    while (true) {
      if (node.type === "LabeledStatement") {
        labels.push(node.label.name);
      } else if (isStatement(node.type)) {
        node.labels = labels;
        break;
      }
      node = node.body;
    }
    return node;
  }
  function getCallee(callee, call) {
    if (call === null) {
      return callee.name;
    }
    return call;
  }
  function indentString(n) {
    return " ".repeat(n);
  }
  function cloneNode(node) {
    var clone = JSON.parse(JSON.stringify(node));
    return clone;
  }
  function deepMagicPatch(node) {
    // magic patch the whole ast
    full(node, function (child) {
      child.magic = true;
    });
  }
  function parse$2() {
    var i = arguments.length, argsArray = Array(i);
    while (i--) argsArray[i] = arguments[i];

    return parse.apply(
      void 0,
      argsArray.concat(
        [{
          allowAwaitOutsideFunction: true,
          sourceType: "module",
          ecmaVersion: 2020,
        }],
      ),
    );
  }
  function generate$2() {
    return generate.apply(null, arguments);
  }
  function parseExpression(input) {
    var node = parse$2(input);
    var result = node.body[0].expression;
    deepMagicPatch(result);
    return result;
  }
  function parseExpressionStatement(input) {
    var node = parse$2(input);
    var result = node.body[0];
    deepMagicPatch(result);
    return result;
  }
  function getCategoryFromInstruction(type) {
    type = type | 0;
    switch (type) {
      case INSTR.THIS:
        return CATEGORY.THIS | 0;
      case INSTR.UNARY:
        return CATEGORY.UNARY | 0;
      case INSTR.UPDATE:
        return CATEGORY.UPDATE | 0;
      case INSTR.BINARY:
        return CATEGORY.BINARY | 0;
      case INSTR.LOGICAL:
        return CATEGORY.LOGICAL | 0;
      case INSTR.TERNARY:
        return CATEGORY.TERNARY | 0;
      case INSTR.ASSIGN:
        return CATEGORY.ASSIGN | 0;
      case INSTR.ALLOC:
        return CATEGORY.ALLOC | 0;
      case INSTR.MEMBER_EXPR:
        return CATEGORY.MEMBER | 0;
      case INSTR.LITERAL:
        return CATEGORY.LITERAL | 0;
      case INSTR.IDENTIFIER:
        return CATEGORY.IDENTIFIER | 0;
      case INSTR.TRY_ENTER:
      case INSTR.TRY_LEAVE:
        return CATEGORY.TRY | 0;
      case INSTR.CATCH_ENTER:
      case INSTR.CATCH_LEAVE:
        return CATEGORY.CATCH | 0;
      case INSTR.FINAL_ENTER:
      case INSTR.FINAL_LEAVE:
        return CATEGORY.FINALLY | 0;
      case INSTR.OP_NEW:
      case INSTR.OP_NEW_END:
        return CATEGORY.OP_NEW | 0;
      case INSTR.VAR_INIT:
      case INSTR.VAR_DECLARE:
        return CATEGORY.VAR | 0;
      case INSTR.IF_TEST:
      case INSTR.IF_ENTER:
      case INSTR.IF_LEAVE:
        return CATEGORY.IF | 0;
      case INSTR.ELSE_ENTER:
      case INSTR.ELSE_LEAVE:
        return CATEGORY.ELSE | 0;
      case INSTR.SWITCH_TEST:
      case INSTR.SWITCH_ENTER:
      case INSTR.SWITCH_LEAVE:
        return CATEGORY.SWITCH | 0;
      case INSTR.CASE_TEST:
      case INSTR.CASE_ENTER:
      case INSTR.CASE_LEAVE:
        return CATEGORY.CASE | 0;
      case INSTR.BREAK:
        return CATEGORY.BREAK | 0;
      case INSTR.CONTINUE:
        return CATEGORY.CONTINUE | 0;
      case INSTR.LOOP_TEST:
      case INSTR.LOOP_ENTER:
      case INSTR.LOOP_LEAVE:
        return CATEGORY.LOOP | 0;
      case INSTR.FUNCTION_CALL:
      case INSTR.FUNCTION_CALL_END:
        return CATEGORY.CALL | 0;
      case INSTR.FUNCTION_ENTER:
      case INSTR.FUNCTION_LEAVE:
      case INSTR.FUNCTION_RETURN:
        return CATEGORY.FUNCTION | 0;
      case INSTR.BLOCK_ENTER:
      case INSTR.BLOCK_LEAVE:
        return CATEGORY.BLOCK | 0;
      case INSTR.PROGRAM:
      case INSTR.PROGRAM_ENTER:
      case INSTR.PROGRAM_LEAVE:
      case INSTR.PROGRAM_FRAME_VALUE:
        return CATEGORY.PROGRAM | 0;
      case INSTR.METHOD_ENTER:
      case INSTR.METHOD_LEAVE:
        return CATEGORY.METHOD | 0;
      case INSTR.SUPER:
        return CATEGORY.SUPER | 0;
    }
    return -1;
  }
  function forceLoopBodyBlocked(node) {
    if (node.body.type !== "BlockStatement") {
      node.body = {
        magic: true,
        type: "BlockStatement",
        body: [node.body],
      };
    }
  }

  var Frame = function Frame(type, hash) {
    this.uid = uid();
    this.hash = hash;
    this.type = type;
    this.isSloppy = false;
    this.isBreakable = false;
    this.isReturnable = false;
    this.isCatchClause = false;
    this.isFinalClause = false;
    this.isTryStatement = false;
    this.isSwitchDefault = false;
    this.isInstantiation = false;
    this.cleanType = instructionToString(type);
    this.parent = null;
    this.values = [];
    this.children = [];
    // apply frame flow kinds
    this.isBreakable = isBreakableFrameType(type);
    this.isSwitchCase = isSwitchCaseFrameType(type);
    this.isReturnable = isReturnableFrameType(type);
    this.isCatchClause = isCatchClauseFrameType(type);
    this.isFinalClause = isFinalClauseFrameType(type);
    this.isContinuable = isContinuableFrameType(type);
    this.isTryStatement = isTryStatementFrameType(type);
    this.isInstantiation = isInstantiationFrameType(type);
  };
  Frame.prototype.isGlobal = function isGlobal() {
    return (
      this.parent === null &&
      this.type === INSTR.PROGRAM
    );
  };
  Frame.prototype.getGlobal = function getGlobal() {
    var frame = this;
    while (true) {
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    return frame;
  };
  Frame.prototype.getDepth = function getDepth() {
    var depth = 0;
    var frame = this;
    while (true) {
      if (frame.isGlobal()) break;
      frame = frame.parent;
      depth++;
    }
    return depth;
  };
  Frame.prototype.equals = function equals(frame) {
    return (
      this.uid === frame.uid
    );
  };

  var Scope$1 = function Scope(node) {
    this.uid = uid();
    this.isLoop = false;
    this.isReturnable = false;
    if (isFunctionNode(node.type)) {
      this.isReturnable = true;
    } else if (isLoopStatement(node.type)) {
      this.isLoop = true;
    }
    this.node = node;
    this.parent = null;
  };
  Scope$1.prototype.getReturnContext = function getReturnContext() {
    var ctx = this;
    while (true) {
      if (ctx.isReturnable) break;
      ctx = ctx.parent;
    }
    return ctx;
  };
  Scope$1.prototype.getLoopContext = function getLoopContext() {
    var ctx = this;
    while (true) {
      if (ctx.isLoop) break;
      ctx = ctx.parent;
    }
    return ctx;
  };

  var STAGE1 = {};

  STAGE1.Program = function (node, patcher) {
    //if (node.magic) return;
    node.magic = true;
    patcher.pushScope(node);
    patcher.stage.BlockStatement(node, patcher, patcher.stage);
    if (patcher.stage === STAGE1) {
      var hash = uBranchHash();
      // create node link
      patcher.nodes[hash] = {
        hash: hash,
        node: cloneNode(node),
      };
      // program frame value id
      var frameValueId = "$$frameValue";
      // patch program frame value debug
      var last = null;
      for (var ii = 0; ii < node.body.length; ++ii) {
        var child = node.body[ii];
        if (child.type === "ExpressionStatement" && !child.magic) last = child;
      } // only patch the very last expr statement
      if (last !== null) {
        last.expression = {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_PROGRAM_FRAME_VALUE"),
          },
          arguments: [
            {
              magic: true,
              type: "AssignmentExpression",
              operator: "=",
              left: parseExpression(frameValueId),
              right: last.expression,
            },
          ],
        };
      }
      var end = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_PROGRAM_LEAVE"),
        },
        arguments: [
          parseExpression(hash),
        ],
      };
      var start = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_PROGRAM_ENTER"),
        },
        arguments: [
          parseExpression(hash),
        ],
      };
      var frame = parseExpressionStatement(
        ("var " + frameValueId + " = void 0;"),
      );
      end.arguments.push(
        parseExpression(frameValueId),
      );
      node.body.push(end);
      node.body.unshift(start);
      node.body.unshift(frame);
      node.body.unshift(parseExpressionStatement(
        ("const " + (patcher.instance.key) + ' = Iroh.stages["' +
          (patcher.instance.key) + '"];'),
      ));
    }
    patcher.popScope();
  };

  STAGE1.BlockStatement = function (node, patcher) {
    var body = node.body;
    for (var ii = 0; ii < body.length; ++ii) {
      var child = body[ii];
      //if (child.magic) continue;
      patcher.walk(child, patcher, patcher.stage);
    }
  };

  STAGE1.MethodDefinition = function (node, patcher) {
    patcher.pushScope(node);
    patcher.walk(node.key, patcher, patcher.stage);
    patcher.walk(node.value, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.FunctionDeclaration = function (node, patcher) {
    // dont touch
    if (node.magic) {
      patcher.pushScope(node);
      // just walk
      patcher.walk(node.id, patcher, patcher.stage);
      node.params.map(function (param) {
        patcher.walk(param, patcher, patcher.stage);
      });
      patcher.walk(node.body, patcher, patcher.stage);
      patcher.popScope();
      return;
    }
    node.magic = true;
    patcher.pushScope(node);
    var name = node.id.name;
    patcher.symbols[name] = cloneNode(node);
    patcher.walk(node.id, patcher, patcher.stage);
    node.params.map(function (param) {
      patcher.walk(param, patcher, patcher.stage);
    });
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.FunctionExpression = function (node, patcher) {
    // dont touch
    if (node.magic) {
      patcher.pushScope(node);
      // just walk
      if (node.id !== null) patcher.walk(node.id, patcher, patcher.stage);
      node.params.map(function (param) {
        patcher.walk(param, patcher, patcher.stage);
      });
      patcher.walk(node.body, patcher, patcher.stage);
      patcher.popScope();
      return;
    }
    node.magic = true;
    patcher.pushScope(node);
    var name = "$$ANON_" + uid();
    if (node.id === null) {
      node.id = {
        magic: true,
        type: "Identifier",
        name: name,
      };
    }
    name = node.id.name;
    patcher.symbols[name] = cloneNode(node);
    patcher.walk(node.id, patcher, patcher.stage);
    node.params.map(function (param) {
      patcher.walk(param, patcher, patcher.stage);
    });
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.ArrowFunctionExpression = function (node, patcher) {
    // dont touch
    if (node.magic) {
      // just walk
      patcher.pushScope(node);
      node.params.map(function (param) {
        patcher.walk(param, patcher, patcher.stage);
      });
      patcher.walk(node.body, patcher, patcher.stage);
      patcher.popScope();
      return;
    }
    node.magic = true;
    patcher.pushScope(node);
    var name = "$$ANON_ARROW_" + uid();
    patcher.symbols[name] = cloneNode(node);
    node.id = {
      magic: true,
      type: "Identifier",
      name: name,
    };
    // arrow fns auto return, inject return record
    if (node.body.type !== "BlockStatement") {
      var call = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_FUNCTION_RETURN"),
        },
        arguments: [
          parseExpression(('"' + (node.id) + '"')),
          node.body,
        ],
      };
      node.argument = call;
    }
    // give a body
    if (node.body.type !== "BlockStatement") {
      node.expression = false;
      node.body = {
        magic: true,
        type: "BlockStatement",
        body: [node.body],
      };
    }
    node.params.map(function (param) {
      patcher.walk(param, patcher, patcher.stage);
    });
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.CallExpression = function (node, patcher) {
    // patched in node, ignore
    if (node.magic) {
      patcher.walk(node.callee, patcher, patcher.stage);
      node.arguments.map(function (arg) {
        patcher.walk(arg, patcher, patcher.stage);
      });
      return;
    }
    node.magic = true;
    patcher.walk(node.callee, patcher, patcher.stage);
    node.arguments.map(function (arg) {
      patcher.walk(arg, patcher, patcher.stage);
    });
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    var callee = resolveCallee(node.callee);
    var call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_FUNCTION_CALL"),
      },
      arguments: [
        parseExpression(hash),
        parseExpression("this"),
        callee,
        (function () {
          if (node.callee.type === "MemberExpression") {
            var property = node.callee.property;
            // identifier
            if (property.type === "Identifier") {
              if (node.callee.computed) {
                return {
                  magic: true,
                  type: "Identifier",
                  name: property.name,
                };
              }
              return ({
                magic: true,
                type: "Literal",
                value: property.name,
              });
            }
            return property;
          }
          return parseExpression("null");
        })(),
        {
          magic: true,
          type: "ArrayExpression",
          elements: [].concat(node.arguments),
        },
      ],
    };
    for (var key in call) {
      if (!call.hasOwnProperty(key)) continue;
      node[key] = call[key];
    }
  };

  STAGE1.ReturnStatement = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    var arg = cloneNode(node.argument);
    if (arg !== null) patcher.walk(arg, patcher, patcher.stage);
    var scope = patcher.scope.getReturnContext();
    var name = parseExpression(('"' + (scope.node.id.name) + '"'));
    node.argument = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_FUNCTION_RETURN"),
      },
      arguments: [
        parseExpression(hash),
        name,
      ],
    };
    if (arg !== null) {
      node.argument.arguments.push(arg);
    }
  };

  STAGE1.BreakStatement = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    var label = parseExpression(
      node.label ? ('"' + (node.label.name) + '"') : "null",
    );
    var expr = {
      magic: true,
      start: 0,
      end: 0,
      type: "IfStatement",
      test: {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_BREAK"),
        },
        arguments: [
          parseExpression(hash),
          label,
          parseExpression("this"),
        ],
      },
      consequent: {
        magic: true,
        type: "BreakStatement",
        label: node.label,
      },
      alternate: null,
    };
    for (var key in expr) {
      if (!expr.hasOwnProperty(key)) continue;
      node[key] = expr[key];
    }
    node.magic = true;
  };

  STAGE1.ContinueStatement = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    if (node.label) patcher.walk(node.label, patcher, patcher.stage);
    var label = parseExpression(
      node.label ? ('"' + (node.label.name) + '"') : "null",
    );
    var expr = {
      magic: true,
      start: 0,
      end: 0,
      type: "IfStatement",
      test: {
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_CONTINUE"),
        },
        arguments: [
          parseExpression(hash),
          label,
          parseExpression("this"),
        ],
      },
      consequent: {
        magic: true,
        type: "ContinueStatement",
        label: node.label,
      },
      alternate: null,
    };
    for (var key in expr) {
      if (!expr.hasOwnProperty(key)) continue;
      node[key] = expr[key];
    }
    node.magic = true;
  };

  STAGE1.VariableDeclaration = function (node, patcher) {
    if (node.magic) return;
    var ihash = uBranchHash();
    // create node link
    var clone = cloneNode(node);
    patcher.nodes[ihash] = {
      hash: ihash,
      node: clone,
    };
    node.magic = true;
    var decls = node.declarations;
    // walk
    for (var ii = 0; ii < decls.length; ++ii) {
      patcher.walk(decls[ii], patcher, patcher.stage);
    } // patch
    for (var ii$1 = 0; ii$1 < decls.length; ++ii$1) {
      var decl = decls[ii$1];
      var declClone = clone.declarations[ii$1];
      if (decl.magic) continue;
      var init = decl.init;
      decl.magic = true;
      var dhash = uBranchHash();
      // create node link
      patcher.nodes[dhash] = {
        hash: dhash,
        node: declClone,
      };
      decl.init = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_VAR_INIT"),
        },
        arguments: [
          parseExpression(ihash),
          // fire declaration instant by placing a call wrapper around
          // then assign its value afterwards
          {
            magic: true,
            type: "CallExpression",
            callee: {
              magic: true,
              type: "Identifier",
              name: patcher.instance.getLink("DEBUG_VAR_DECLARE"),
            },
            arguments: [
              parseExpression(dhash),
              {
                magic: true,
                type: "Literal",
                value: decl.id.name,
                raw: ('"' + (decl.id.name) + '"'),
              },
            ],
          },
        ],
      };
      if (init !== null) decl.init.arguments.push(init);
    }
  };

  STAGE1.NewExpression = function (node, patcher) {
    if (node.magic) return;
    node.magic = true;
    patcher.walk(node.callee, patcher, patcher.stage);
    node.arguments.map(function (arg) {
      patcher.walk(arg, patcher, patcher.stage);
    });
    var callee = cloneNode(node.callee);
    var args = [
      callee,
      {
        magic: true,
        type: "ArrayExpression",
        elements: [].concat(node.arguments),
      },
    ];
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };

    node.callee = {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_OP_NEW_END"),
    };
    node.arguments = [
      parseExpression(hash),
      parseExpression(patcher.instance.key),
      {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_OP_NEW"),
        },
        arguments: [
          parseExpression(hash),
        ].concat(args),
      },
    ];
  };

  STAGE1.ObjectExpression = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    node.properties.map(function (prop) {
      patcher.walk(prop, patcher, patcher.stage);
    });
    var call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_ALLOC"),
      },
      arguments: [
        parseExpression(hash),
        cloneNode(node),
      ],
    };
    delete node.properties;
    for (var key in call) {
      if (!call.hasOwnProperty(key)) continue;
      node[key] = call[key];
    }
  };

  STAGE1.MemberExpression = function (node, patcher) {
    if (node.magic) {
      patcher.walk(node.object, patcher, patcher.stage);
      patcher.walk(node.property, patcher, patcher.stage);
      return;
    }
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    patcher.walk(node.object, patcher, patcher.stage);
    patcher.walk(node.property, patcher, patcher.stage);
    var property = node.property;
    if (node.property.type === "Identifier") {
      property = {
        magic: true,
        type: "Literal",
        value: property.name,
      };
    }
    var call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_MEMBER_EXPR"),
      },
      arguments: [
        parseExpression(hash),
        node.object,
        property,
      ],
    };
    call = {
      magic: true,
      type: "MemberExpression",
      object: call,
      property: node.property,
    };
    for (var key in call) {
      if (!call.hasOwnProperty(key)) continue;
      node[key] = call[key];
    }
  };

  STAGE1.AssignmentExpression = function (node, patcher) {
    if (node.magic) {
      node.left.magic = true;
      patcher.walk(node.left, patcher, patcher.stage);
      patcher.walk(node.right, patcher, patcher.stage);
      return;
    }
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    node.left.magic = true;
    var left = node.left;
    var right = node.right;
    var operator = node.operator;
    if (operator !== "=") {
      operator = operator.substr(0, operator.length - 1);
    }
    // #object assignment
    var object = null;
    var property = null;
    // skip the last property and manually
    // access it inside the debug function
    if (left.type === "MemberExpression") {
      if (left.property.type === "Identifier") {
        if (left.computed) {
          property = left.property;
        } else {
          property = {
            magic: true,
            type: "Literal",
            value: left.property.name,
          };
        }
      } else {
        property = left.property;
      }
      object = left.object;
    } // identifier based assignment
    // fixed up below by turning into assign expr again
    else if (left.type === "Identifier") {
      object = left;
      property = parseExpression(null);
    }
    var call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_ASSIGN"),
      },
      arguments: [
        parseExpression(hash),
        parseExpression(OP[operator]),
        (
          left.type === "Identifier"
            ? parseExpression(('"' + (left.name) + '"'))
            : object
        ),
        property,
        right,
      ],
    };
    // #identifier assignment
    if (left.type === "Identifier") {
      call = {
        magic: true,
        type: "AssignmentExpression",
        operator: node.operator,
        left: object,
        right: call,
      };
    }
    patcher.walk(node.left, patcher, patcher.stage);
    patcher.walk(node.right, patcher, patcher.stage);
    for (var key in call) {
      if (!call.hasOwnProperty(key)) continue;
      node[key] = call[key];
    }
  };

  STAGE1.UpdateExpression = function (node, patcher) {
    if (node.magic) {
      patcher.walk(node.argument, patcher, patcher.stage);
      return;
    }
    node.magic = true;
    patcher.walk(node.argument, patcher, patcher.stage);
    var hash = uBranchHash();
    // create node link
    var clone = cloneNode(node);
    patcher.nodes[hash] = {
      hash: hash,
      node: clone,
    };
    var arg = node.argument;
    var operator = node.operator;
    // #object assignment
    var object = null;
    var property = null;
    // skip the last property and manually
    // access it inside the debug function
    if (arg.type === "MemberExpression") {
      if (arg.property.type === "Identifier") {
        if (arg.computed) {
          property = arg.property;
        } else {
          property = {
            magic: true,
            type: "Literal",
            value: arg.property.name,
          };
        }
      } else {
        property = arg.property;
      }
      object = arg.object;
    } // identifier based assignment
    // fixed up below by turning into assign expr again
    else if (arg.type === "Identifier") {
      object = arg;
      property = parseExpression(null);
    }
    var call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_UPDATE"),
      },
      arguments: [
        parseExpression(hash),
        parseExpression(OP[operator]),
        clone,
        parseExpression(node.prefix),
      ],
    };
    for (var key in call) {
      if (!call.hasOwnProperty(key)) continue;
      node[key] = call[key];
    }
  };

  STAGE1.ArrayExpression = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    node.elements.map(function (el) {
      if (el !== null) patcher.walk(el, patcher, patcher.stage);
    });
    var call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_ALLOC"),
      },
      arguments: [
        parseExpression(hash),
        cloneNode(node),
      ],
    };
    delete node.elements;
    for (var key in call) {
      if (!call.hasOwnProperty(key)) continue;
      node[key] = call[key];
    }
  };

  STAGE1.Literal = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    var clone = cloneNode(node);
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: clone,
    };
    node.magic = true;
    var call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_LITERAL"),
      },
      arguments: [
        parseExpression(hash),
        clone,
      ],
    };
    for (var key in call) {
      if (!call.hasOwnProperty(key)) continue;
      node[key] = call[key];
    }
  };

  STAGE1.ForStatement = function (node, patcher) {
    if (!node.hasOwnProperty("labels")) node.labels = [];
    patcher.pushScope(node);
    if (node.test) patcher.walk(node.test, patcher, patcher.stage);
    if (node.init) patcher.walk(node.init, patcher, patcher.stage);
    if (node.update) patcher.walk(node.update, patcher, patcher.stage);
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.ForInStatement = function (node, patcher) {
    node.left.magic = true;
    patcher.pushScope(node);
    patcher.walk(node.left, patcher, patcher.stage);
    patcher.walk(node.right, patcher, patcher.stage);
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.ForOfStatement = function (node, patcher) {
    node.left.magic = true;
    patcher.pushScope(node);
    patcher.walk(node.left, patcher, patcher.stage);
    patcher.walk(node.right, patcher, patcher.stage);
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.WhileStatement = function (node, patcher) {
    patcher.pushScope(node);
    if (node.test) patcher.walk(node.test, patcher, patcher.stage);
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE1.DoWhileStatement = function (node, patcher) {
    patcher.pushScope(node);
    if (node.test) patcher.walk(node.test, patcher, patcher.stage);
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  var STAGE2 = {};

  STAGE2.IfStatement = function (node, patcher) {
    if (node.magic) {
      patcher.walk(node.test, patcher, patcher.stage);
      patcher.walk(node.consequent, patcher, patcher.stage);
      if (node.alternate) patcher.walk(node.alternate, patcher, patcher.stage);
      return;
    }
    node.magic = true;

    var test = cloneNode(node.test);
    // branch hash
    var elseHash = uBranchHash();
    var isElse = (
      node.alternate &&
      node.alternate.type !== "IfStatement"
    );
    var isBlockedElse = (
      isElse &&
      node.alternate.body === "BlockStatement"
    );

    if (isElse) {
      // create node link
      var link = {
        hash: elseHash,
        node: null,
      };
      patcher.nodes[elseHash] = link;
      link.node = cloneNode(node.alternate);
      if (!isBlockedElse) {
        // force else to be blocked
        var alternate = node.alternate;
        node.alternate = parseExpressionStatement("{}");
        node.alternate.body.push(alternate);
      }
    }

    // branch hash
    var ifHash = uBranchHash();
    // create node link
    patcher.nodes[ifHash] = {
      hash: ifHash,
      node: cloneNode(node),
    };

    patcher.walk(node.test, patcher, patcher.stage);
    patcher.walk(node.consequent, patcher, patcher.stage);
    if (node.alternate) patcher.walk(node.alternate, patcher, patcher.stage);

    var id = reserveTempVarId();
    var patch = parseExpressionStatement(("var " + id + ";"));
    injectPatchIntoNode(patcher.scope.node, patch);

    // debug if test
    node.test = {
      magic: true,
      type: "AssignmentExpression",
      operator: "=",
      left: parseExpression(id),
      right: {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_IF_TEST"),
        },
        arguments: [
          parseExpression(ifHash),
          node.test,
        ],
      },
    };

    // patch else enter, leave
    if (isElse) {
      var end$1 = parseExpressionStatement(
        patcher.instance.getLinkCall("DEBUG_ELSE_LEAVE"),
      );
      var start$1 = parseExpressionStatement(
        patcher.instance.getLinkCall("DEBUG_ELSE_ENTER"),
      );
      end$1.expression.arguments.push(
        parseExpression(elseHash),
      );
      start$1.expression.arguments.push(
        parseExpression(elseHash),
      );
      node.alternate.body.unshift(start$1);
      node.alternate.body.push(end$1);
    }

    // debug if body enter, leave
    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_IF_LEAVE"),
    );
    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_IF_ENTER"),
    );
    // branch hash
    end.expression.arguments.push(
      parseExpression(ifHash),
    );
    // branch hash
    start.expression.arguments.push(
      parseExpression(ifHash),
    );
    // pass in condition result into if enter
    start.expression.arguments.push(parseExpression(id));
    if (node.consequent.type === "BlockStatement") {
      node.consequent.body.unshift(start);
      node.consequent.body.push(end);
    } else {
      node.consequent = {
        type: "BlockStatement",
        body: [start, node.consequent, end],
      };
    }
  };

  STAGE2.Program = STAGE1.Program;
  STAGE2.BlockStatement = STAGE1.BlockStatement;
  STAGE2.MethodDefinition = STAGE1.MethodDefinition;
  STAGE2.FunctionDeclaration = STAGE1.FunctionDeclaration;
  STAGE2.FunctionExpression = STAGE1.FunctionExpression;
  STAGE2.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

  var STAGE3 = {};

  STAGE3.BlockStatement = function (node, patcher) {
    var body = node.body;
    // transform try, switch and labels here
    for (var ii = 0; ii < body.length; ++ii) {
      var child = body[ii];
      //if (child.magic) continue;
      // labeled statement
      var isLabeledStmt = isLabeledStatement(child.type);
      if (isLabeledStmt) {
        child = processLabels(child);
      }
      var isTryStmt = isTryStatement(child.type);
      var isSwitchStmt = isSwitchStatement(child.type);
      var hash = -1;
      var isHashBranch = (
        isTryStmt ||
        isSwitchStmt
      );
      // only generate hash if necessary
      if (isHashBranch) hash = uBranchHash();
      // #ENTER
      if (isHashBranch) {
        var link = patcher.instance.getLinkCall(
          isTryStmt
            ? "DEBUG_TRY_ENTER"
            : isSwitchStmt
            ? "DEBUG_SWITCH_ENTER"
            : "", // throws error
        );
        var start = parseExpressionStatement(link);
        patcher.nodes[hash] = {
          hash: hash,
          node: cloneNode(child),
        };
        start.expression.arguments.push(
          parseExpression(hash),
        );
        body.splice(ii, 0, start);
        ii++;
      }
      // switch test
      if (isSwitchStmt) {
        var test = {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_SWITCH_TEST"),
          },
          arguments: [
            parseExpression(hash),
            child.discriminant,
          ],
        };
        child.discriminant = test;
      }
      patcher.walk(child, patcher, patcher.stage);
      // #LEAVE
      if (isHashBranch) {
        var link$1 = patcher.instance.getLinkCall(
          isTryStmt
            ? "DEBUG_TRY_LEAVE"
            : isSwitchStmt
            ? "DEBUG_SWITCH_LEAVE"
            : "", // throws error
        );
        var end = parseExpressionStatement(link$1);
        end.expression.arguments.push(
          parseExpression(hash),
        );
        body.splice(ii + 1, 0, end);
        ii++;
        if (isTryStmt) {
          if (child.finalizer) STAGE3.FinalClause(child.finalizer, patcher);
        }
      }
    }
  };

  STAGE3.CatchClause = function (node, patcher) {
    if (node.magic) return;
    patcher.pushScope(node);
    patcher.walk(node.param, patcher, patcher.stage);
    patcher.walk(node.body, patcher, patcher.stage);

    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    var hashExpr = parseExpression(hash);
    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_CATCH_LEAVE"),
    );
    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_CATCH_ENTER"),
    );
    end.expression.arguments.push(hashExpr);
    start.expression.arguments.push(hashExpr);
    node.body.body.unshift(start);
    node.body.body.push(end);

    patcher.popScope();
  };

  STAGE3.FinalClause = function (node, patcher) {
    if (node.magic) return;
    patcher.pushScope(node);
    patcher.walk(node, patcher, patcher.stage);

    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    var hashExpr = parseExpression(hash);
    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FINAL_LEAVE"),
    );
    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FINAL_ENTER"),
    );
    end.expression.arguments.push(hashExpr);
    start.expression.arguments.push(hashExpr);
    node.body.unshift(start);
    node.body.push(end);

    patcher.popScope();
  };

  STAGE3.Program = STAGE1.Program;
  STAGE3.MethodDefinition = STAGE1.MethodDefinition;
  STAGE3.FunctionDeclaration = STAGE1.FunctionDeclaration;
  STAGE3.FunctionExpression = STAGE1.FunctionExpression;
  STAGE3.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

  var STAGE4 = {};

  STAGE4.SwitchStatement = function (node, patcher) {
    if (node.magic) {
      patcher.walk(node.discriminant, patcher, patcher.stage);
      node.cases.map(function (cs) {
        patcher.walk(cs, patcher, patcher.stage);
      });
      return;
    }
    node.magic = true;

    var hash = uBranchHash();
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };

    patcher.walk(node.discriminant, patcher, patcher.stage);
    node.cases.map(function (cs) {
      patcher.walk(cs, patcher, patcher.stage);
    });

    var id = reserveTempVarId();
    var patch = parseExpressionStatement(("var " + id + ";"));
    injectPatchIntoNode(patcher.scope.node, patch);

    // debug if test
    node.discriminant = {
      magic: true,
      type: "AssignmentExpression",
      operator: "=",
      left: parseExpression(id),
      right: node.discriminant,
    };
  };

  STAGE4.SwitchCase = function (node, patcher) {
    if (node.magic) {
      if (node.test) patcher.walk(node.test, patcher, patcher.stage);
      node.consequent.map(function (cons) {
        patcher.walk(cons, patcher, patcher.stage);
      });
      return;
    }
    node.magic = true;

    var hash = uBranchHash();

    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };

    var test = null;
    if (node.test) {
      var id = reserveTempVarId();
      var patch = parseExpressionStatement(("var " + id + ";"));
      injectPatchIntoNode(patcher.scope.node, patch);
      test = parseExpression(id);
      // debug if test
      node.test = {
        magic: true,
        type: "AssignmentExpression",
        operator: "=",
        left: test,
        right: node.test,
      };
      node.test = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_CASE_TEST"),
        },
        arguments: [
          parseExpression(hash),
          node.test,
        ],
      };
    }

    // default or case
    var type = (
      test !== null ? test : parseExpression("null")
    );

    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_CASE_ENTER"),
    );
    // pass case test result
    start.expression.arguments.push(
      parseExpression(hash),
    );
    // pass case value
    start.expression.arguments.push(test || parseExpression(null));
    // trace default case
    start.expression.arguments.push(
      parseExpression(test === null),
    );
    node.consequent.splice(0, 0, start);

    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_CASE_LEAVE"),
    );
    end.expression.arguments.push(
      parseExpression(hash),
    );
    node.consequent.splice(node.consequent.length, 0, end);
  };

  STAGE4.Program = STAGE1.Program;
  STAGE4.BlockStatement = STAGE1.BlockStatement;
  STAGE4.MethodDefinition = STAGE1.MethodDefinition;
  STAGE4.FunctionDeclaration = STAGE1.FunctionDeclaration;
  STAGE4.FunctionExpression = STAGE1.FunctionExpression;
  STAGE4.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

  var STAGE5 = {};

  STAGE5.ClassDeclaration = function (node, patcher) {
    patcher.pushScope(node);
    patcher.walk(node.id, patcher, patcher.stage);
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
  };

  STAGE5.MethodDefinition = function (node, patcher) {
    if (node.magic) {
      patcher.pushScope(node);
      patcher.walk(node.key, patcher, patcher.stage);
      patcher.walk(node.value, patcher, patcher.stage);
      patcher.popScope();
      return;
    }

    var scope = patcher.scope;
    // branch hash
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };

    node.magic = true;
    node.value.superIndex = -1;
    node.value.superNode = null;
    patcher.pushScope(node);
    patcher.walk(node.key, patcher, patcher.stage);
    patcher.walk(node.value, patcher, patcher.stage);

    var isConstructor = node.kind === "constructor";

    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_METHOD_LEAVE"),
    );
    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_METHOD_ENTER"),
    );
    var body = node.value.body.body;

    start.expression.arguments.push(parseExpression("this"));
    start.expression.arguments.push(parseExpression("arguments"));

    // patch constructor
    if (isConstructor) {
      if (node.value.superNode !== null) {
        // only function expressions supported for now
        console.assert(node.value.type === "FunctionExpression");
        // find super class call
        // patch in ctor enter, leave afterwards
        var index = node.value.superIndex;
        body.splice(index + 1, 0, start);
        body.splice(index + body.length, 0, end);
      } else {
        body.splice(0, 0, start);
        body.splice(body.length, 0, end);
      }
    } else {
      body.splice(0, 0, start);
      body.splice(body.length, 0, end);
    }

    // constructor state
    end.expression.arguments.unshift(parseExpression(isConstructor));
    start.expression.arguments.unshift(parseExpression(isConstructor));

    // class name
    end.expression.arguments.unshift(scope.node.id);
    start.expression.arguments.unshift(scope.node.id);

    // hash
    end.expression.arguments.unshift(parseExpression(hash));
    start.expression.arguments.unshift(parseExpression(hash));

    patcher.popScope();
  };

  STAGE5.CallExpression = function (node, patcher) {
    if (node.magic) return;
    // dont patch super class calls
    if (node.callee && node.callee.type === "Super") {
      var scope = patcher.scope.node;
      var index = -1;
      console.assert(scope.type === "FunctionExpression");
      scope.body.body.map(function (child, idx) {
        console.assert(child.type === "ExpressionStatement");
        if (child.expression === node) {
          index = idx;
        }
      });
      console.assert(index !== -1);
      scope.superIndex = index;
      scope.superNode = node;

      // patch debug super
      node.arguments = [
        {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_SUPER"),
          },
          arguments: [
            // class ctor
            patcher.scope.parent.parent.node.id,
            {
              magic: true,
              type: "SpreadElement",
              argument: {
                magic: true,
                type: "ArrayExpression",
                elements: node.arguments,
              },
            },
          ],
        },
      ];
    }
  };

  STAGE5.Program = STAGE1.Program;
  STAGE5.BlockStatement = STAGE1.BlockStatement;
  STAGE5.FunctionDeclaration = STAGE1.FunctionDeclaration;
  STAGE5.FunctionExpression = STAGE1.FunctionExpression;
  STAGE5.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

  var STAGE6 = {};

  STAGE6.FunctionDeclaration = function (node, patcher) {
    patcher.pushScope(node);
    patcher.walk(node.id, patcher, patcher.stage);
    node.params.map(function (param) {
      patcher.walk(param, patcher, patcher.stage);
    });
    patcher.walk(node.body, patcher, patcher.stage);

    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    var hashExpr = parseExpression(hash);
    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FUNCTION_LEAVE"),
    );
    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FUNCTION_ENTER"),
    );
    end.expression.arguments.push(hashExpr);
    end.expression.arguments.push(parseExpression("this"));
    start.expression.arguments.push(hashExpr);
    start.expression.arguments.push(parseExpression("this"));
    start.expression.arguments.push(parseExpression(node.id.name));
    start.expression.arguments.push(parseExpression("arguments"));
    node.body.body.unshift(start);
    node.body.body.push(end);

    patcher.popScope();
  };

  STAGE6.FunctionExpression = function (node, patcher) {
    if (patcher.scope.node.type === "MethodDefinition") return;
    patcher.pushScope(node);
    patcher.walk(node.id, patcher, patcher.stage);
    node.params.map(function (param) {
      patcher.walk(param, patcher, patcher.stage);
    });
    patcher.walk(node.body, patcher, patcher.stage);

    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    var hashExpr = parseExpression(hash);
    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FUNCTION_LEAVE"),
    );
    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FUNCTION_ENTER"),
    );
    end.expression.arguments.push(hashExpr);
    end.expression.arguments.push(parseExpression("this"));
    start.expression.arguments.push(hashExpr);
    start.expression.arguments.push(parseExpression("this"));
    start.expression.arguments.push(parseExpression(node.id.name));
    start.expression.arguments.push(parseExpression("arguments"));
    node.body.body.unshift(start);
    node.body.body.push(end);

    patcher.popScope();
  };

  STAGE6.ArrowFunctionExpression = function (node, patcher) {
    patcher.pushScope(node);
    node.params.map(function (param) {
      patcher.walk(param, patcher, patcher.stage);
    });
    patcher.walk(node.body, patcher, patcher.stage);

    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    var hashExpr = parseExpression(hash);
    var end = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FUNCTION_LEAVE"),
    );
    var start = parseExpressionStatement(
      patcher.instance.getLinkCall("DEBUG_FUNCTION_ENTER"),
    );
    end.expression.arguments.push(hashExpr);
    end.expression.arguments.push(parseExpression("this"));
    start.expression.arguments.push(hashExpr);
    start.expression.arguments.push(parseExpression("this"));
    start.expression.arguments.push(parseExpression(node.id.name));
    var args = {
      magic: true,
      type: "ArrayExpression",
      elements: [],
    };
    node.params.map(function (param) {
      args.elements.push(param);
    });
    start.expression.arguments.push(args);
    node.body.body.unshift(start);
    node.body.body.push(end);

    patcher.popScope();
  };

  STAGE6.Program = STAGE1.Program;
  STAGE6.BlockStatement = STAGE1.BlockStatement;
  STAGE6.MethodDefinition = STAGE1.MethodDefinition;

  var STAGE7 = {};

  STAGE7.BlockStatement = function (node, patcher) {
    var body = node.body;
    for (var ii = 0; ii < body.length; ++ii) {
      var child = body[ii];
      //if (child.magic) continue;
      //child.magic = true;

      // labeled statement
      var isLabeledStmt = isLabeledStatement(child.type);
      if (isLabeledStmt) {
        child = processLabels(child);
      }

      var isLazyBlock = (
        child.type === "BlockStatement"
      );
      var isLoopStmt = isLoopStatement(child.type);
      var isSwitchStmt = isSwitchStatement(child.type);
      var isHashBranch = (
        isLoopStmt ||
        isLazyBlock
      );
      var hash = -1;
      var id = null;
      if (isHashBranch) {
        // generate hash
        hash = uBranchHash();
        id = reserveTempVarId();
        patcher.nodes[hash] = {
          hash: hash,
          node: cloneNode(child),
        };
      }

      if (isLazyBlock) {
        var start = {
          magic: true,
          type: "ExpressionStatement",
          expression: {
            magic: true,
            type: "CallExpression",
            callee: {
              magic: true,
              type: "Identifier",
              name: patcher.instance.getLink("DEBUG_BLOCK_ENTER"),
            },
            arguments: [
              parseExpression(hash),
            ],
          },
        };
        var end = {
          magic: true,
          type: "ExpressionStatement",
          expression: {
            magic: true,
            type: "CallExpression",
            callee: {
              magic: true,
              type: "Identifier",
              name: patcher.instance.getLink("DEBUG_BLOCK_LEAVE"),
            },
            arguments: [parseExpression(hash)],
          },
        };
        child.body.unshift(start);
        child.body.push(end);
        patcher.walk(child, patcher, patcher.stage);
        continue;
      }

      if (isLoopStmt) {
        forceLoopBodyBlocked(child);
        console.assert(child.body.type === "BlockStatement");

        var patch = parseExpressionStatement(("var " + id + " = 0;"));
        body.splice(ii, 0, patch);
        ii++;

        var test = {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_LOOP_TEST"),
          },
          arguments: [
            parseExpression(hash),
            child.test ? child.test : (
              // empty for test means infinite
              child.type === "ForStatement" ? parseExpression(true) : "" // throws error
            ),
            parseExpression(('"' + (child.type) + '"')),
          ],
        };
        child.test = test;

        var start$1 = {
          magic: true,
          type: "IfStatement",
          test: parseExpression((id + " === 0")),
          alternate: null,
          consequent: {
            magic: true,
            type: "ExpressionStatement",
            expression: {
              magic: true,
              type: "CallExpression",
              callee: {
                magic: true,
                type: "Identifier",
                name: patcher.instance.getLink("DEBUG_LOOP_ENTER"),
              },
              arguments: [
                parseExpression(hash),
                // set the loop enter state to fullfilled
                parseExpression((id + " = 1")),
                parseExpression(('"' + (child.type) + '"')),
              ],
            },
          },
        };
        child.body.body.unshift(start$1);
      }
      patcher.walk(child, patcher, patcher.stage);
      if (isLoopStmt) {
        var end$1 = {
          magic: true,
          type: "ExpressionStatement",
          expression: {
            magic: true,
            type: "CallExpression",
            callee: {
              magic: true,
              type: "Identifier",
              name: patcher.instance.getLink("DEBUG_LOOP_LEAVE"),
            },
            arguments: [
              parseExpression(hash),
              parseExpression(id),
              parseExpression(('"' + (child.type) + '"')),
            ],
          },
        };
        body.splice(ii + 1, 0, end$1);
        ii++;
      }
    }
  };

  STAGE7.Program = STAGE1.Program;
  STAGE7.MethodDefinition = STAGE1.MethodDefinition;
  STAGE7.FunctionDeclaration = STAGE1.FunctionDeclaration;
  STAGE7.FunctionExpression = STAGE1.FunctionExpression;
  STAGE7.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

  var STAGE8 = {};

  STAGE8.ThisExpression = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    node.type = "CallExpression";
    node.callee = {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_THIS"),
    };
    node.arguments = [
      parseExpression(hash),
      parseExpression("this"),
    ];
  };

  STAGE8.BinaryExpression = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    patcher.walk(node.left, patcher, patcher.stage);
    patcher.walk(node.right, patcher, patcher.stage);
    node.magic = true;
    node.type = "CallExpression";
    node.callee = {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_BINARY"),
    };
    node.arguments = [
      parseExpression(hash),
      parseExpression(OP[node.operator]),
      node.left,
      node.right,
    ];
  };

  STAGE8.LogicalExpression = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    patcher.walk(node.left, patcher, patcher.stage);
    patcher.walk(node.right, patcher, patcher.stage);
    node.magic = true;
    node.type = "CallExpression";
    node.callee = {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_LOGICAL"),
    };
    var right = parseExpression("(function() { }).bind(this)");
    // enter bind expression to get the binded function
    var fn = right.callee.object;
    fn.body.body.push({
      magic: true,
      type: "ReturnStatement",
      argument: node.right,
    });
    node.arguments = [
      parseExpression(hash),
      parseExpression(OP[node.operator]),
      node.left,
      right,
    ];
  };

  STAGE8.UnaryExpression = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    patcher.walk(node.argument, patcher, patcher.stage);
    node.type = "CallExpression";
    node.callee = {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_UNARY"),
    };
    var argument = node.argument;
    // non-trackable yet FIXME
    if (node.operator === "delete") {
      argument = {
        magic: true,
        type: "UnaryExpression",
        operator: node.operator,
        prefix: true,
        argument: argument,
      };
    }
    node.arguments = [
      parseExpression(hash),
      parseExpression(OP[node.operator]),
      parseExpression("this"),
      parseExpression(false),
      argument,
    ];
    // typeof fixup
    // typeof is a weirdo
    if (node.operator === "typeof" && argument.type === "Identifier") {
      var id = reserveTempVarId();
      var patch = parseExpressionStatement(("var " + id + ";"));
      injectPatchIntoNode(patcher.scope.node, patch);
      var name = argument.name;
      // heute sind wir räudig
      var critical = parseExpression(
        ("(function() { try { " + name + "; } catch(e) { " + id +
          ' = "undefined"; return true; } ' + id + " = " + name +
          "; return false; }).bind(this)()"),
      );
      node.arguments = [
        parseExpression(hash),
        parseExpression(OP[node.operator]),
        parseExpression("this"),
        critical,
        parseExpression(id),
      ];
    }
  };

  STAGE8.ConditionalExpression = function (node, patcher) {
    if (node.magic) return;
    var hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node),
    };
    node.magic = true;
    patcher.walk(node.test, patcher, patcher.stage);
    patcher.walk(node.consequent, patcher, patcher.stage);
    patcher.walk(node.alternate, patcher, patcher.stage);

    var cons = parseExpression("(function() { }).bind(this)");
    cons.callee.object.body.body.push({
      magic: true,
      type: "ReturnStatement",
      argument: node.consequent,
    });
    var alt = parseExpression("(function() { }).bind(this)");
    alt.callee.object.body.body.push({
      magic: true,
      type: "ReturnStatement",
      argument: node.alternate,
    });

    node.type = "CallExpression";
    node.callee = {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_TERNARY"),
    };
    node.arguments = [
      parseExpression(hash),
      node.test,
      cons,
      alt,
    ];
  };

  /*
  STAGE8.Literal = function(node) {
    if (node.magic) return;
    let clone = Iroh.cloneNode(node);
    node.magic = true;
    node.type = "CallExpression";
    node.callee = {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_LITERAL")
    };
    node.arguments = [
      clone
    ];
  };

  STAGE8.Identifier = function(node) {
    if (node.magic) return;
    node.magic = true;
    let clone = Iroh.cloneNode(node);
    node.type = "CallExpression";
    node.callee = {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_IDENTIFIER")
    };
    node.arguments = [
      Iroh.parseExpression(`"${node.name}"`),
      clone
    ];
  };
  */

  STAGE8.Program = STAGE1.Program;
  STAGE8.BlockStatement = STAGE1.BlockStatement;
  STAGE8.MethodDefinition = STAGE1.MethodDefinition;
  STAGE8.FunctionDeclaration = STAGE1.FunctionDeclaration;
  STAGE8.FunctionExpression = STAGE1.FunctionExpression;
  STAGE8.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

  var Patcher = function Patcher(instance) {
    this.uid = uid();
    // patch AST scope
    this.scope = null;
    // patch stage
    this.stage = null;
    // patch state
    this.state = null;
    // node symbols
    this.symbols = {};
    // node clones
    this.nodes = {};
    // stage instance
    this.instance = instance;
  };

  Patcher.prototype.walk = function (ast, state, visitors) {
    return recursive(ast, state, visitors, base);
  };

  Patcher.prototype.pushScope = function (node) {
    var tmp = this.scope;
    this.scope = new Scope$1(node);
    this.scope.parent = tmp;
  };

  Patcher.prototype.popScope = function (node) {
    this.scope = this.scope.parent;
  };

  Patcher.prototype.applyStagePatch = function (ast, stage) {
    this.stage = stage;
    this.walk(ast, this, this.stage);
  };

  Patcher.prototype.applyPatches = function (ast) {
    this.applyStagePatch(ast, STAGE2);
    this.applyStagePatch(ast, STAGE7);
    this.applyStagePatch(ast, STAGE4);
    this.applyStagePatch(ast, STAGE5);
    this.applyStagePatch(ast, STAGE1);
    this.applyStagePatch(ast, STAGE3);
    this.applyStagePatch(ast, STAGE6);
    this.applyStagePatch(ast, STAGE8);
  };

  var RuntimeEvent = function RuntimeEvent(type, instance) {
    this.type = type;
    this.category = getCategoryFromInstruction(type);
    // base properties
    this.hash = -1;
    this.indent = -1;
    this.node = null;
    this.location = null;
    this.instance = instance;
    // TODO
    // turn all events into seperate classes
    // so we can save a lot memory
  };
  RuntimeEvent.prototype.trigger = function trigger(trigger$1) {
    // trigger all attached listeners
    this.instance.triggerListeners(this, trigger$1);
  };
  RuntimeEvent.prototype.getASTNode = function getASTNode() {
    var node = this.instance.nodes[this.hash].node;
    return node;
  };
  RuntimeEvent.prototype.getPosition = function getPosition() {
    var node = this.getASTNode();
    return {
      end: node.end,
      start: node.start,
    };
  };
  RuntimeEvent.prototype.getLocation = function getLocation() {
    var node = this.getASTNode();
    return node.loc;
  };
  RuntimeEvent.prototype.getSource = function getSource() {
    var loc = this.getPosition();
    var input = this.instance.input;
    var output = input.substr(loc.start, loc.end - loc.start);
    return output;
  };

  var RuntimeListenerEvent = function RuntimeListenerEvent(type, callback) {
    this.type = type;
    this.callback = callback;
  };
  var RuntimeListener = function RuntimeListener(category) {
    this.category = category;
    this.triggers = {};
  };
  RuntimeListener.prototype.on = function on(type, callback) {
    var event = new RuntimeListenerEvent(type, callback);
    // not registered yet
    if (this.triggers[type] === void 0) {
      this.triggers[type] = [];
    }
    this.triggers[type].push(event);
    // allow stream calls
    return this;
  };
  RuntimeListener.prototype.trigger = function trigger(event, trigger$1) {
    // any triggers registered?
    if (!this.triggers.hasOwnProperty(trigger$1)) return;
    var triggers = this.triggers[trigger$1];
    for (var ii = 0; ii < triggers.length; ++ii) {
      triggers[ii].callback(event);
    }
  };

  function evalUnaryExpression(op, ctx, a) {
    switch (op) {
      case OP["+"]:
        return +a;
      case OP["-"]:
        return -a;
      case OP["!"]:
        return !a;
      case OP["~"]:
        return ~a;
      case OP["void"]:
        return void a;
      case OP["typeof"]:
        return typeof a;
      // handled outside
      case OP["delete"]:
        return a;
      default:
        throw new Error(("Invalid operator " + op));
    }
  }
  function evalBinaryExpression(op, a, b) {
    switch (op) {
      case OP["+"]:
        return a + b;
      case OP["-"]:
        return a - b;
      case OP["*"]:
        return a * b;
      case OP["/"]:
        return a / b;
      case OP["%"]:
        return a % b;
      case OP["**"]:
        return Math.pow(a, b);
      case OP["<<"]:
        return a << b;
      case OP[">>"]:
        return a >> b;
      case OP[">>>"]:
        return a >>> b;
      case OP["&"]:
        return a & b;
      case OP["^"]:
        return a ^ b;
      case OP["|"]:
        return a | b;
      case OP["in"]:
        return a in b;
      case OP["=="]:
        return a == b;
      case OP["==="]:
        return a === b;
      case OP["!="]:
        return a != b;
      case OP["!=="]:
        return a !== b;
      case OP[">"]:
        return a > b;
      case OP[">="]:
        return a >= b;
      case OP["<"]:
        return a < b;
      case OP["<="]:
        return a <= b;
      case OP["instanceof"]:
        return a instanceof b;
      default:
        throw new Error(("Invalid operator " + op));
    }
  }
  function evalObjectAssignmentExpression(op, obj, prop, value) {
    switch (op) {
      case OP["="]:
        return obj[prop] = value;
      case OP["+"]:
        return obj[prop] += value;
      case OP["-"]:
        return obj[prop] -= value;
      case OP["*"]:
        return obj[prop] *= value;
      case OP["/"]:
        return obj[prop] /= value;
      case OP["%"]:
        return obj[prop] %= value;
      case OP["**"]:
        return obj[prop] = Math.pow(obj[prop], value);
      case OP["<<"]:
        return obj[prop] <<= value;
      case OP[">>"]:
        return obj[prop] >>= value;
      case OP[">>>"]:
        return obj[prop] >>>= value;
      case OP["&"]:
        return obj[prop] &= value;
      case OP["^"]:
        return obj[prop] ^= value;
      case OP["|"]:
        return obj[prop] |= value;
      default:
        throw new Error(("Invalid operator " + op));
    }
  }

  // #IF
  function DEBUG_IF_TEST(hash, value) {
    // API
    var event = this.createEvent(INSTR.IF_TEST);
    event.hash = hash;
    event.value = value;
    event.indent = this.indent;
    event.trigger("test");
    // API END
    return event.value;
  }
  function DEBUG_IF_ENTER(hash, value) {
    //console.log(indentString(this.indent) + "if");
    // FRAME
    var frame = this.pushFrame(INSTR.IF_ENTER, hash);
    frame.values = [hash, value];
    // FRAME END
    // API
    var event = this.createEvent(INSTR.IF_ENTER);
    event.hash = hash;
    event.value = value;
    event.indent = this.indent;
    event.trigger("enter");
    // API END
    this.indent += INDENT_FACTOR;
  }
  function DEBUG_IF_LEAVE(hash) {
    this.indent -= INDENT_FACTOR;
    // API
    var event = this.createEvent(INSTR.IF_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("leave");
    // API END
    //console.log(indentString(this.indent) + "if end");
    // FRAME
    this.popFrame();
    // FRAME END
  }
  // #ELSE
  function DEBUG_ELSE_ENTER(hash) {
    // API
    var event = this.createEvent(INSTR.ELSE_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("enter");
    // API END
    //console.log(indentString(this.indent) + "else");
    // FRAME
    var frame = this.pushFrame(INSTR.ELSE_ENTER, hash);
    frame.values = [hash];
    // FRAME END
    this.indent += INDENT_FACTOR;
  }
  function DEBUG_ELSE_LEAVE(hash) {
    this.indent -= INDENT_FACTOR;
    // API
    var event = this.createEvent(INSTR.ELSE_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("leave");
    // API END
    //console.log(indentString(this.indent) + "else end");
    // FRAME
    this.popFrame();
    // FRAME END
  }
  // #LOOPS
  function DEBUG_LOOP_TEST(hash, value, kind) {
    // API
    var event = this.createEvent(INSTR.LOOP_TEST);
    event.hash = hash;
    event.indent = this.indent;
    event.value = value;
    event.kind = kind;
    event.trigger("test");
    // API END
    return event.value;
  }
  function DEBUG_LOOP_ENTER(hash, id, kind) {
    // API
    var event = this.createEvent(INSTR.LOOP_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.kind = kind;
    event.trigger("enter");
    // API END
    //console.log(indentString(this.indent) + "loop", hash);
    // FRAME
    var frame = this.pushFrame(INSTR.LOOP_ENTER, hash);
    frame.values = [hash, 1];
    // FRAME END
    this.indent += INDENT_FACTOR;
  }
  function DEBUG_LOOP_LEAVE(hash, entered, kind) {
    // loop never entered, so dont leave it
    if (entered === 0) return;
    this.indent -= INDENT_FACTOR;
    // API
    var event = this.createEvent(INSTR.LOOP_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.kind = kind;
    event.trigger("leave");
    // API END
    //console.log(indentString(this.indent) + "loop end", hash);
    // FRAME
    this.popFrame();
    // FRAME END
  }
  // #FLOW
  function DEBUG_BREAK(hash, label, ctx) {
    // API
    var event = this.createEvent(INSTR.BREAK);
    event.hash = hash;
    event.value = true;
    event.label = label;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    //console.log(indentString(this.indent) + "break", label ? label : "");
    // FRAME
    var expect = this.resolveBreakFrame(this.frame, label);
    this.leaveFrameUntil(expect);
    // FRAME END
    return event.value;
  }
  function DEBUG_CONTINUE(hash, label, ctx) {
    // API
    var event = this.createEvent(INSTR.CONTINUE);
    event.hash = hash;
    event.value = true;
    event.label = label;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    //console.log(indentString(this.indent) + "continue", label ? label : "");
    // FRAME
    var expect = this.resolveBreakFrame(this.frame, label);
    this.leaveFrameUntil(expect);
    // FRAME END
    return event.value;
  }
  // # SWITCH
  function DEBUG_SWITCH_TEST(hash, value) {
    // API
    var event = this.createEvent(INSTR.SWITCH_TEST);
    event.hash = hash;
    event.value = value;
    event.indent = this.indent;
    event.trigger("test");
    // API END
    return event.value;
  }
  function DEBUG_SWITCH_ENTER(hash) {
    // API
    var event = this.createEvent(INSTR.SWITCH_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("enter");
    // API END
    //console.log(indentString(this.indent) + "switch");
    // FRAME
    var frame = this.pushFrame(INSTR.SWITCH_ENTER, hash);
    frame.values = [hash];
    // FRAME END
    this.indent += INDENT_FACTOR;
  }
  function DEBUG_SWITCH_LEAVE(hash) {
    this.indent -= INDENT_FACTOR;
    // API
    var event = this.createEvent(INSTR.SWITCH_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("leave");
    // API END
    //console.log(indentString(this.indent) + "switch end");
    // FRAME
    this.popFrame();
    // FRAME END
  }
  // #CASE
  function DEBUG_CASE_TEST(hash, value) {
    // API
    var event = this.createEvent(INSTR.CASE_TEST);
    event.hash = hash;
    event.value = value;
    event.indent = this.indent;
    event.trigger("test");
    // API END
    return event.value;
  }
  function DEBUG_CASE_ENTER(hash, value, isDefault) {
    // API
    var event = this.createEvent(INSTR.CASE_ENTER);
    event.hash = hash;
    event.value = value;
    event.default = isDefault;
    event.indent = this.indent;
    event.trigger("enter");
    // API END
    //console.log(indentString(this.indent) + (isDefault ? "default" : "case"));
    // FRAME
    var frame = this.pushFrame(INSTR.CASE_ENTER, hash);
    frame.values = [hash, value, isDefault];
    this.frame.isSwitchDefault = isDefault;
    // FRAME END
    this.indent += INDENT_FACTOR;
  }
  function DEBUG_CASE_LEAVE(hash) {
    this.indent -= INDENT_FACTOR;
    var isDefault = this.resolveCaseFrame(this.frame).isSwitchDefault;
    // API
    var event = this.createEvent(INSTR.CASE_LEAVE);
    event.hash = hash;
    event.isDefault = isDefault;
    event.indent = this.indent;
    event.trigger("leave");
    // API END
    //console.log(indentString(this.indent) + (isDefault ? "default" : "case") + " end");
    // FRAME
    this.popFrame();
    // FRAME END
  }
  // #CALL
  function DEBUG_FUNCTION_CALL(hash, ctx, object, call, args) {
    var ctor = object.constructor.prototype;
    var callee = getCallee(object, call);
    var previous = this.$$frameHash;
    var value = null;
    var root = null;
    var name = null;
    var proto = null;

    // create function
    if (call !== null) {
      root = object[call];
      proto = object;
    } else {
      root = object;
      proto = null;
    }
    name = root ? root.name : null;

    var node = this.nodes[hash].node;

    // external functions are traced as sloppy
    var isSloppy = this.symbols[name] === void 0;
    node.isSloppy = isSloppy;

    // API
    var before = this.createEvent(INSTR.FUNCTION_CALL);
    before.hash = hash;
    before.context = ctx;
    before.object = proto;
    before.callee = call;
    before.name = callee;
    before.call = root;
    before.arguments = args;
    before.external = isSloppy;
    before.indent = this.indent;
    before.trigger("before");
    // API END

    // FRAME
    var frame = this.pushFrame(INSTR.FUNCTION_CALL, hash);
    frame.values = [hash, ctx, before.object, before.callee, before.arguments];
    this.$$frameHash = Math.abs(hash);
    // FRAME END

    this.indent += INDENT_FACTOR;
    // evaluate function bully protected
    try {
      value = before.call.apply(before.object, before.arguments);
    } catch (e) {
      var tryFrame = this.resolveTryFrame(this.frame, true);
      // error isn't try-catch wrapped
      if (tryFrame === null) {
        this.reset();
        throw e;
        // error is try-catch wrapped
      } else {
        var catchFrame = this.resolveCatchClauseFrame(this.frame, true);
        var finalFrame = this.resolveFinalClauseFrame(this.frame, true);
        // something failed inside the catch frame
        if (catchFrame !== null || finalFrame !== null) {
          this.reset();
          throw e;
        }
      }
    }
    this.indent -= INDENT_FACTOR;

    // API
    var after = this.createEvent(INSTR.FUNCTION_CALL_END);
    after.hash = hash;
    after.context = before.context;
    after.object = before.object;
    after.callee = before.callee;
    after.name = callee;
    after.call = root;
    after.arguments = before.arguments;
    after.return = value;
    after.external = isSloppy;
    after.indent = this.indent;
    after.trigger("after");
    // API END

    // FRAME
    this.popFrame();
    this.$$frameHash = previous;
    // FRAME END

    return after.return;
  }
  // #FUNCTION
  function DEBUG_FUNCTION_ENTER(hash, ctx, scope, args) {
    this.previousScope = this.currentScope;
    this.currentScope = scope;
    // function sloppy since called with invalid call hash
    var isSloppy = (
      (this.$$frameHash <= 0) ||
      this.nodes[this.$$frameHash].node.isSloppy
    );

    // API
    var event = this.createEvent(INSTR.FUNCTION_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.scope = scope;
    event.sloppy = isSloppy;
    event.arguments = args;
    event.name = this.nodes[hash].node.id.name;
    event.trigger("enter");
    // API END

    if (isSloppy) {
      //console.log(indentString(this.indent) + "call", name, "#sloppy", "(", args, ")");
      this.indent += INDENT_FACTOR;
    }
  }
  function DEBUG_FUNCTION_LEAVE(hash, ctx) {
    this.currentScope = this.previousScope;
    var isSloppy = (this.$$frameHash <= 0) ||
      this.nodes[this.$$frameHash].node.isSloppy;

    // API
    var event = this.createEvent(INSTR.FUNCTION_LEAVE);
    event.hash = hash;
    event.indent = this.indent - (isSloppy ? INDENT_FACTOR : 0);
    event.sloppy = isSloppy;
    event.name = this.nodes[hash].node.id.name;
    event.trigger("leave");
    // API END

    if (isSloppy) {
      this.indent -= INDENT_FACTOR;
      //console.log(indentString(this.indent) + "call", name, "end #sloppy", "->", [void 0]);
    }
  }
  function DEBUG_FUNCTION_RETURN(hash, name, value) {
    var isSloppy = (this.$$frameHash <= 0) ||
      this.nodes[this.$$frameHash].node.isSloppy;

    // API
    var event = this.createEvent(INSTR.FUNCTION_RETURN);
    event.hash = hash;
    event.name = name;
    event.return = value;
    event.indent = this.indent - (isSloppy ? INDENT_FACTOR : 0);
    event.sloppy = isSloppy;
    event.trigger("return");
    // API END

    // FRAME
    var expect = this.resolveReturnFrame(this.frame);
    this.leaveFrameUntil(expect);
    // FRAME END
    this.currentScope = this.previousScope;

    if (isSloppy) {
      this.indent -= INDENT_FACTOR;
      //console.log(indentString(this.indent) + "call", name, "end #sloppy", "->", [value]);
    }
    return event.return;
  }
  // # DECLS
  function DEBUG_VAR_DECLARE(hash, name) {
    //console.log(indentString(this.indent) + "▶️ Declare " + name);

    // API
    var event = this.createEvent(INSTR.VAR_DECLARE);
    event.hash = hash;
    event.name = name;
    event.indent = this.indent;
    event.trigger("before");
    // API END

    return name;
  }
  function DEBUG_VAR_INIT(hash, name, value) {
    //console.log(indentString(this.indent) + "⏩ Initialise " + name + "::" + value);

    // API
    var event = this.createEvent(INSTR.VAR_INIT);
    event.hash = hash;
    event.name = name;
    event.value = value;
    event.indent = this.indent;
    event.trigger("after");
    // API END

    return event.value;
  }
  // #NEW
  function DEBUG_OP_NEW(hash, ctor, args) {
    // API
    var event = this.createEvent(INSTR.OP_NEW);
    event.hash = hash;
    event.ctor = ctor;
    event.name = ctor.name || ctor.constructor.name;
    event.arguments = args;
    event.indent = this.indent;
    event.trigger("before");
    // API END

    //console.log(indentString(this.indent) + "new " + ctor.name);

    this.indent += INDENT_FACTOR;

    // FRAME
    var frame = this.pushFrame(INSTR.OP_NEW, hash);
    frame.values = [hash, event.ctor, event.arguments];
    // FRAME END

    return new (Function.prototype.bind.apply(
      event.ctor,
      [null].concat(event.arguments),
    ))();
  }
  function DEBUG_OP_NEW_END(hash, self, ret) {
    self.indent -= INDENT_FACTOR;

    // FRAME
    self.popFrame();
    // FRAME END

    // API
    var event = self.createEvent(INSTR.OP_NEW_END);
    event.hash = hash;
    event.return = ret;
    event.indent = self.indent;
    event.trigger("after");
    // API END

    //console.log(indentString(self.indent) + "new end");

    return event.return;
  }
  // #SUPER
  function DEBUG_SUPER(cls, args) {
    // API TODO
    return args;
  } // method enter not available before super
  // super_fix is injected after super
  function DEBUG_SUPER_FIX(ctx) {
    // API TODO
  }
  // # CLASS METHOD
  function DEBUG_METHOD_ENTER(hash, cls, isConstructor, args) {
    // API TODO
    if (isConstructor) {
      var tree = getInheritanceTree(cls);
      console.log(indentString(this.indent) + "ctor", tree.join("->"));
    } else {
      console.log(indentString(this.indent) + "method");
    }
    this.indent += INDENT_FACTOR;
    var frame = this.pushFrame(INSTR.METHOD_ENTER, hash);
    frame.values = [hash, cls, isConstructor, args];
  }
  function DEBUG_METHOD_LEAVE(hash, cls, isConstructor) {
    // API TODO
    this.indent -= INDENT_FACTOR;
    console.log(
      indentString(this.indent) + (isConstructor ? "ctor" : "method") + " end",
    );
    this.popFrame();
  }
  // #TRY
  function DEBUG_TRY_ENTER(hash) {
    //console.log(indentString(this.indent) + "try");

    // API
    var event = this.createEvent(INSTR.TRY_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("enter");
    // API END

    this.indent += INDENT_FACTOR;
    // FRAME
    var frame = this.pushFrame(INSTR.TRY_ENTER, hash);
    frame.values = [hash];
    // FRAME END
  }
  function DEBUG_TRY_LEAVE(hash) {
    // FRAME
    // fix up missing left frames until try_leave
    // e.g. a call inside try, but never finished because it failed
    if (this.frame.type !== INSTR.TRY_ENTER) {
      var expect = this.resolveTryFrame(this.frame);
      this.leaveFrameUntil(expect);
    }
    this.popFrame();
    // FRAME END

    this.indent -= INDENT_FACTOR;

    // API
    var event = this.createEvent(INSTR.TRY_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("leave");
    // API END

    //console.log(indentString(this.indent) + "try end");
  }
  // #CATCH
  function DEBUG_CATCH_ENTER(hash) {
    // API
    var event = this.createEvent(INSTR.CATCH_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("enter");
    // API END

    this.indent += INDENT_FACTOR;
    // FRAME
    var frame = this.pushFrame(INSTR.CATCH_ENTER, hash);
    frame.values = [hash];
    // FRAME END
  }
  function DEBUG_CATCH_LEAVE(hash) {
    this.indent -= INDENT_FACTOR;

    // API
    var event = this.createEvent(INSTR.CATCH_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("leave");
    // API END

    this.popFrame();
    // FRAME END
  }
  // #FINALLY
  function DEBUG_FINAL_ENTER(hash) {
    // API
    var event = this.createEvent(INSTR.FINAL_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("enter");
    // API END

    this.indent += INDENT_FACTOR;
    // FRAME
    var frame = this.pushFrame(INSTR.FINAL_ENTER, hash);
    frame.values = [hash];
    // FRAME END
  }
  function DEBUG_FINAL_LEAVE(hash) {
    this.indent -= INDENT_FACTOR;

    // API
    var event = this.createEvent(INSTR.FINAL_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("leave");
    // API END

    this.popFrame();
    // FRAME END
  }
  // #ALLOC
  function DEBUG_ALLOC(hash, value) {
    //console.log(indentString(this.indent) + "#Allocated", value);

    // API
    var event = this.createEvent(INSTR.ALLOC);
    event.hash = hash;
    event.value = value;
    event.indent = this.indent;
    event.trigger("fire");
    // API END

    return event.value;
  }
  // #MEMBER
  function DEBUG_MEMBER_EXPR(hash, object, property) {
    //console.log(indentString(this.indent), object, "[" + property + "]");

    // API
    var event = this.createEvent(INSTR.MEMBER_EXPR);
    event.hash = hash;
    event.object = object;
    event.property = property;
    event.indent = this.indent;
    event.trigger("fire");
    // API END

    return event.object;
  }
  // fix for lazy blocks
  function DEBUG_BLOCK_ENTER(hash) {
    var frame = this.pushFrame(INSTR.BLOCK_ENTER, hash);
    frame.values = [hash];
  }
  function DEBUG_BLOCK_LEAVE(hash) {
    this.popFrame();
  }
  // #THIS
  function DEBUG_THIS(hash, ctx) {
    // API
    var event = this.createEvent(INSTR.THIS);
    event.hash = hash;
    event.context = ctx;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    return event.context;
  }
  // #LITERAL
  function DEBUG_LITERAL(hash, value) {
    // API
    var event = this.createEvent(INSTR.LITERAL);
    event.hash = hash;
    event.value = value;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    return event.value;
  }
  // #EXPRESSIONS
  function DEBUG_ASSIGN(hash, op, obj, prop, value) {
    var result = null;
    // API: add before, after
    if (prop === null) {
      if (op === OP["="]) result = value;
      else result = value;
    } else {
      result = evalObjectAssignmentExpression(op, obj, prop, value);
    }
    // API
    var event = this.createEvent(INSTR.ASSIGN);
    event.op = operatorToString(op) + "=";
    event.hash = hash;
    event.object = obj;
    event.property = prop;
    event.value = value;
    event.result = result;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    return event.result;
  }
  function DEBUG_TERNARY(hash, test, truthy, falsy) {
    var result = null;
    // API: add before, after
    if (test) result = truthy();
    else result = falsy();
    // API
    var event = this.createEvent(INSTR.TERNARY);
    event.hash = hash;
    event.test = test;
    event.falsy = falsy;
    event.truthy = truthy;
    event.result = result;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    return event.result;
  }
  function DEBUG_LOGICAL(hash, op, a, b) {
    var result = null;
    // API: add before, after
    switch (op) {
      case OP["&&"]:
        result = a ? b() : a;
        break;
      case OP["||"]:
        result = a ? a : b();
        break;
    } // API
    var event = this.createEvent(INSTR.LOGICAL);
    event.op = operatorToString(op);
    event.hash = hash;
    event.left = a;
    event.right = b;
    event.result = result;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    return event.result;
  }
  function DEBUG_BINARY(hash, op, a, b) {
    var result = evalBinaryExpression(op, a, b);
    // API
    var event = this.createEvent(INSTR.BINARY);
    event.op = operatorToString(op);
    event.hash = hash;
    event.left = a;
    event.right = b;
    event.result = result;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    return event.result;
  }
  function DEBUG_UNARY(hash, op, ctx, critical, value) {
    var result = null;
    // typeof argument is not defined
    if (op === OP["typeof"] && critical) {
      result = value;
    } else {
      result = evalUnaryExpression(op, ctx, value);
    }
    // API
    var event = this.createEvent(INSTR.UNARY);
    event.op = operatorToString(op);
    event.hash = hash;
    event.value = value;
    event.result = result;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    //console.log(indentString(this.indent) + operatorToString(op), value, "->", result, critical);
    return event.result;
  }
  function DEBUG_UPDATE(hash, op, value, prefix) {
    var result = value;
    // API
    var event = this.createEvent(INSTR.UPDATE);
    event.op = operatorToString(op);
    event.result = result;
    event.hash = hash;
    event.prefix = prefix;
    event.indent = this.indent;
    event.trigger("fire");
    // API END
    return event.result;
  }
  // deprecated
  /*
  export function DEBUG_LITERAL = function(value) {
    console.log("Literal:", value);
    return value;
  };
  export function DEBUG_IDENTIFIER = function(id, value) {
    console.log("Identifier:", id, value);
    return value;
  };*/

  function DEBUG_PROGRAM_ENTER(hash) {
    //console.log(indentString(this.indent) + "Program");
    // API
    var event = this.createEvent(INSTR.PROGRAM_ENTER);
    event.hash = hash;
    event.indent = this.indent;
    event.trigger("enter");
    // API END
    this.indent += INDENT_FACTOR;
  }
  function DEBUG_PROGRAM_LEAVE(hash, ret) {
    this.indent -= INDENT_FACTOR;
    //console.log(indentString(this.indent) + "Program end ->", ret);
    // API
    var event = this.createEvent(INSTR.PROGRAM_LEAVE);
    event.hash = hash;
    event.indent = this.indent;
    event.return = ret;
    event.trigger("leave");
    // API END
    return event.return;
  }
  function DEBUG_PROGRAM_FRAME_VALUE(value) {
    //console.log(value);
  }

  var _debug = /*#__PURE__*/ Object.freeze({
    __proto__: null,
    DEBUG_IF_TEST: DEBUG_IF_TEST,
    DEBUG_IF_ENTER: DEBUG_IF_ENTER,
    DEBUG_IF_LEAVE: DEBUG_IF_LEAVE,
    DEBUG_ELSE_ENTER: DEBUG_ELSE_ENTER,
    DEBUG_ELSE_LEAVE: DEBUG_ELSE_LEAVE,
    DEBUG_LOOP_TEST: DEBUG_LOOP_TEST,
    DEBUG_LOOP_ENTER: DEBUG_LOOP_ENTER,
    DEBUG_LOOP_LEAVE: DEBUG_LOOP_LEAVE,
    DEBUG_BREAK: DEBUG_BREAK,
    DEBUG_CONTINUE: DEBUG_CONTINUE,
    DEBUG_SWITCH_TEST: DEBUG_SWITCH_TEST,
    DEBUG_SWITCH_ENTER: DEBUG_SWITCH_ENTER,
    DEBUG_SWITCH_LEAVE: DEBUG_SWITCH_LEAVE,
    DEBUG_CASE_TEST: DEBUG_CASE_TEST,
    DEBUG_CASE_ENTER: DEBUG_CASE_ENTER,
    DEBUG_CASE_LEAVE: DEBUG_CASE_LEAVE,
    DEBUG_FUNCTION_CALL: DEBUG_FUNCTION_CALL,
    DEBUG_FUNCTION_ENTER: DEBUG_FUNCTION_ENTER,
    DEBUG_FUNCTION_LEAVE: DEBUG_FUNCTION_LEAVE,
    DEBUG_FUNCTION_RETURN: DEBUG_FUNCTION_RETURN,
    DEBUG_VAR_DECLARE: DEBUG_VAR_DECLARE,
    DEBUG_VAR_INIT: DEBUG_VAR_INIT,
    DEBUG_OP_NEW: DEBUG_OP_NEW,
    DEBUG_OP_NEW_END: DEBUG_OP_NEW_END,
    DEBUG_SUPER: DEBUG_SUPER,
    DEBUG_SUPER_FIX: DEBUG_SUPER_FIX,
    DEBUG_METHOD_ENTER: DEBUG_METHOD_ENTER,
    DEBUG_METHOD_LEAVE: DEBUG_METHOD_LEAVE,
    DEBUG_TRY_ENTER: DEBUG_TRY_ENTER,
    DEBUG_TRY_LEAVE: DEBUG_TRY_LEAVE,
    DEBUG_CATCH_ENTER: DEBUG_CATCH_ENTER,
    DEBUG_CATCH_LEAVE: DEBUG_CATCH_LEAVE,
    DEBUG_FINAL_ENTER: DEBUG_FINAL_ENTER,
    DEBUG_FINAL_LEAVE: DEBUG_FINAL_LEAVE,
    DEBUG_ALLOC: DEBUG_ALLOC,
    DEBUG_MEMBER_EXPR: DEBUG_MEMBER_EXPR,
    DEBUG_BLOCK_ENTER: DEBUG_BLOCK_ENTER,
    DEBUG_BLOCK_LEAVE: DEBUG_BLOCK_LEAVE,
    DEBUG_THIS: DEBUG_THIS,
    DEBUG_LITERAL: DEBUG_LITERAL,
    DEBUG_ASSIGN: DEBUG_ASSIGN,
    DEBUG_TERNARY: DEBUG_TERNARY,
    DEBUG_LOGICAL: DEBUG_LOGICAL,
    DEBUG_BINARY: DEBUG_BINARY,
    DEBUG_UNARY: DEBUG_UNARY,
    DEBUG_UPDATE: DEBUG_UPDATE,
    DEBUG_PROGRAM_ENTER: DEBUG_PROGRAM_ENTER,
    DEBUG_PROGRAM_LEAVE: DEBUG_PROGRAM_LEAVE,
    DEBUG_PROGRAM_FRAME_VALUE: DEBUG_PROGRAM_FRAME_VALUE,
  });

  var Stage = function Stage(input, opt) {
    // validate
    if (typeof input !== "string") {
      throw new Error(
        ("Expected input type string, but got " + (typeof input)),
      );
    }
    this.input = input;
    // unique session key
    this.key = "$$STx" + (uid());
    this.links = {};
    this.nodes = null;
    this.symbols = null;
    this.options = {};
    this.indent = 0;
    this.frame = null;
    this.$$frameHash = 0;
    this.currentScope = null;
    this.previousScope = null;
    this.listeners = {};
    this.generateLinks();
    this.generateListeners();
    this.script = this.patch(input);
  };

  extend(Stage, _debug);

  Stage.prototype.reset = function () {
    this.indent = 0;
  };

  Stage.prototype.triggerListeners = function (event, trigger) {
    var type = event.type;
    var category = event.category;
    // invalid listener
    if (!this.listeners.hasOwnProperty(category)) {
      console.error(("Unexpected trigger category " + category));
      return;
    }
    var listeners = this.listeners[category];
    // no listeners are attached
    if (listeners.length <= 0) return;
    for (var ii = 0; ii < listeners.length; ++ii) {
      var listener = listeners[ii];
      listener.trigger(event, trigger);
    }
  };

  Stage.prototype.createEvent = function (type) {
    var event = new RuntimeEvent(type, this);
    return event;
  };

  Stage.prototype.addListener = function (category) {
    // validate
    if (!this.listeners.hasOwnProperty(category)) {
      console.error("Unexpected listener category");
      return null;
    }
    var listener = new RuntimeListener(category);
    this.listeners[category].push(listener);
    return listener;
  };

  Stage.prototype.generateListeners = function () {
    for (var key in CATEGORY) {
      var bit = CATEGORY[key];
      this.listeners[bit] = [];
    }
  };

  Stage.prototype.generateLinks = function () {
    var ihdx = 0;
    for (var callee in INSTR) {
      if (!INSTR.hasOwnProperty(callee)) continue;
      var name = "$DEBUG_" + callee;
      var key = DEBUG_KEY + ihdx++;
      this.links[name] = {
        // link function, escape dollar sign
        fn: this[name.substr(1, name.length)],
        key: key,
      };
      {
        this[key] = this.links[name].fn;
      }
    }
  };

  Stage.prototype.getLink = function (name) {
    name = "$" + name;
    var key = this.links[name].key;
    return ((this.key) + "." + key);
  };

  Stage.prototype.getLinkCall = function (name) {
    return this.getLink(name) + "()";
  };

  Stage.prototype.getFunctionNodeByName = function (name) {
    return (
      this.symbols[name] || null
    );
  };

  Stage.prototype.getInverseInstruction = function (frame) {
    var type = frame.type;
    var links = this.links;
    switch (type) {
      case INSTR.FUNCTION_ENTER:
        return links.$DEBUG_FUNCTION_LEAVE.fn;
      case INSTR.IF_ENTER:
        return links.$DEBUG_IF_LEAVE.fn;
      case INSTR.ELSE_ENTER:
        return links.$DEBUG_ELSE_LEAVE.fn;
      case INSTR.LOOP_ENTER:
        return links.$DEBUG_LOOP_LEAVE.fn;
      case INSTR.SWITCH_ENTER:
        return links.$DEBUG_SWITCH_LEAVE.fn;
      case INSTR.CASE_ENTER:
        return links.$DEBUG_CASE_LEAVE.fn;
      case INSTR.METHOD_ENTER:
        return links.$DEBUG_METHOD_LEAVE.fn;
      case INSTR.OP_NEW:
        return links.$DEBUG_OP_NEW_END.fn;
      case INSTR.TRY_ENTER:
        return links.$DEBUG_TRY_LEAVE.fn;
      case INSTR.CATCH_ENTER:
        return links.$DEBUG_CATCH_LEAVE.fn;
      case INSTR.FINAL_ENTER:
        return links.$DEBUG_FINAL_LEAVE.fn;
      case INSTR.BLOCK_ENTER:
        return links.$DEBUG_BLOCK_LEAVE.fn;
      default:
        throw new Error(("Unexpected frame type " + (frame.cleanType)));
    }
  };

  Stage.prototype.manuallyLeaveFrame = function (frame) {
    console.assert(isValidFrameInstruction(frame));
    var args = frame.values;
    //console.log("Manually leaving", frame.cleanType);
    var inverse = this.getInverseInstruction(frame);
    inverse.apply(this, args);
  };

  Stage.prototype.leaveFrameUntil = function (target) {
    while (true) {
      if (this.frame.equals(target)) break;
      this.manuallyLeaveFrame(this.frame);
    }
  };

  Stage.prototype.leaveFrameUntilHash = function (hash) {
    while (true) {
      if (this.frame.hash === hash) break;
      this.manuallyLeaveFrame(this.frame);
    }
  };

  Stage.prototype.pushFrame = function (type, hash) {
    var parent = this.frame;
    var frame = new Frame(type, hash);
    frame.parent = parent;
    frame.node = this.nodes[hash].node;
    frame.location = frame.node.loc;
    this.frame = frame;
    return frame;
  };

  Stage.prototype.popFrame = function () {
    // out of bounds check
    console.assert(this.frame !== null);
    this.frame = this.frame.parent;
  };

  Stage.prototype.resolveBreakFrame = function (frm, label) {
    var frame = frm;
    while (true) {
      // TODO: isContinuable stable?
      if (frame.isBreakable || frame.isContinuable) {
        if (label !== null) {
          var node = this.nodes[frame.hash].node;
          if (
            node.labels !== void 0 &&
            node.labels.indexOf(label) > -1
          ) {
            break;
          }
        } else {
          break;
        }
      } else if (label !== null) {
        var node$1 = this.nodes[frame.hash].node;
        if (
          node$1.labels !== void 0 &&
          node$1.labels.indexOf(label) > -1
        ) {
          break;
        }
      }
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    console.assert(
      isBreakableFrameType(frame.type),
    );
    return frame;
  };

  Stage.prototype.resolveReturnFrame = function (frm) {
    var frame = frm;
    while (true) {
      // break on instantiation calls
      if (frame.isInstantiation) break;
      // break on function call frames
      if (frame.isReturnable) break;
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    if (
      !isReturnableFrameType(frame.type) &&
      !isInstantiationFrameType(frame.type)
    ) {
      // only beef if frame hashes doesn't match
      if (frame.hash !== this.$$frameHash) {
        console.error(frame);
      }
    }
    return frame;
  };

  Stage.prototype.resolveCaseFrame = function (frm) {
    var frame = frm;
    while (true) {
      if (frame.isSwitchCase) break;
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    console.assert(
      frame.type === INSTR.CASE_ENTER,
    );
    return frame;
  };

  Stage.prototype.resolveTryFrame = function (frm, silent) {
    var frame = frm;
    while (true) {
      if (frame.isTryStatement) break;
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    if (silent) return (frame.type === INSTR.TRY_ENTER ? frame : null);
    console.assert(
      frame.type === INSTR.TRY_ENTER,
    );
    return frame;
  };

  Stage.prototype.resolveCatchClauseFrame = function (frm, silent) {
    var frame = frm;
    while (true) {
      if (frame.isCatchClause) break;
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    if (silent) return (frame.type === INSTR.CATCH_ENTER ? frame : null);
    console.assert(
      frame.type === INSTR.CATCH_ENTER,
    );
    return frame;
  };

  Stage.prototype.resolveFinalClauseFrame = function (frm, silent) {
    var frame = frm;
    while (true) {
      if (frame.isFinalClause) break;
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    if (silent) return (frame.type === INSTR.FINAL_ENTER ? frame : null);
    console.assert(
      frame.type === INSTR.FINAL_ENTER,
    );
    return frame;
  };

  Stage.prototype.resolveProgramFrame = function (frm) {
    var frame = frm;
    while (true) {
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    console.assert(
      frame.type === INSTR.PROGRAM,
    );
    return frame;
  };

  Stage.prototype.resolveLeftFrames = function (frm) {
    var frame = frm;
    while (true) {
      // break on instantiation calls
      if (frame.isInstantiation) break;
      // break on function call frames
      if (frame.isReturnable) break;
      // frame is super sloppy (possibly async), break out of everything
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    return frame;
  };

  Stage.prototype.getFrameByHashFrom = function (frm, hash) {
    var frame = frm;
    while (true) {
      if (frame.hash === hash) break;
      if (frame.isGlobal()) return null;
      frame = frame.parent;
    }
    return frame;
  };

  Stage.prototype.patch = function (input) {
    var patcher = new Patcher(this);
    var ast = parse$2(
      input,
      {
        sourceType: "module",
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        ecmaVersion: 2020,
        locations: true,
      },
    );
    this.frame = new Frame(INSTR.PROGRAM, this.$$frameHash);
    patcher.applyPatches(ast);
    // link walk things to stage
    this.nodes = patcher.nodes;
    this.symbols = patcher.symbols;
    return generate$2(ast, {
      format: {
        indent: {
          style: "  ",
        },
      },
    });
  };

  function setup() {
    this.generateCategoryBits();
  }
  function generateCategoryBits() {
    for (var key in CATEGORY) {
      this[key] = CATEGORY[key] | 0;
    }
  }
  function greet() {
    if (
      IS_BROWSER &&
      typeof navigator !== "undefined" &&
      navigator.userAgent.toLowerCase().indexOf("chrome") > -1
    ) {
      console.log(
        ("%c ☕ Iroh.js - " + VERSION + " "),
        "background: #2e0801; color: #fff; padding:1px 0;",
      );
    }
  }

  var _setup = /*#__PURE__*/ Object.freeze({
    __proto__: null,
    setup: setup,
    generateCategoryBits: generateCategoryBits,
    greet: greet,
  });

  var Iroh = function Iroh() {
    // patch AST scope
    this.scope = null;
    // patch stage
    this.stage = null;
    // patch state
    this.state = null;
    // stage instance
    this.instance = null;
    // container for all stages
    this.stages = {};
    // enter setup phase
    this.setup();
    // say hello
    this.greet();
  };
  // link methods to main class
  extend(Iroh, _utils);
  extend(Iroh, _setup);

  var iroh = new Iroh();

  // intercept Stage instantiations
  var _Stage = function () {
    var i = arguments.length, argsArray = Array(i);
    while (i--) argsArray[i] = arguments[i];

    var stage =
      new (Function.prototype.bind.apply(Stage, [null].concat(argsArray)))();
    // register stage to iroh stages
    // so we can keep track of it
    iroh.stages[stage.key] = stage;
    return stage;
  };
  _Stage.prototype = Object.create(Stage.prototype);
  iroh.Stage = _Stage;

  // link to outer space
  if (typeof window !== "undefined") {
    window.Iroh = iroh;
  }

  return iroh;
}());

export default iroh;
