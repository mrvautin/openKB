(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.markdownItClassy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var classy,

  // magic char codes
  CHAR_0 = 0x30,
  CHAR_9 = 0x39,
  CHAR_A_UPPER = 0x41,
  CHAR_Z_UPPER = 0x5A,
  CHAR_A_LOWER = 0x61,
  CHAR_Z_LOWER = 0x7A,
  CHAR_UNDERSCORE = 0x5F,
  CHAR_DASH = 0x2D,
  CHAR_SPACE = 0x20,
  CHAR_OPEN_CURLY = 0x7B,
  CHAR_CLOSE_CURLY = 0x7D,
  CHAR_NEWLINE = 0xA;

function isValidClassChar(code) {
  return (code >= CHAR_0 && code <= CHAR_9) ||
    (code >= CHAR_A_UPPER && code <= CHAR_Z_UPPER) ||
    (code >= CHAR_A_LOWER && code <= CHAR_Z_LOWER) ||
    code === CHAR_UNDERSCORE ||
    code === CHAR_DASH ||
    code === CHAR_SPACE;
}

function parse(state) {
  var pos = state.pos,
    initialPos = pos,
    classString = "",
    i,
    pendingText,
    preferOuter = false,
    token;

  if (state.src.charCodeAt(pos) !== CHAR_OPEN_CURLY) {
    return false;
  }

  // advance to account for opening brace
  pos += 1;

  // grab everything til the closing brace
  while (state.src.charCodeAt(pos) !== CHAR_CLOSE_CURLY) {
    if (!isValidClassChar(state.src.charCodeAt(pos))) {
      return false;
    }

    classString += state.src.charAt(pos);
    pos += 1;
  }

  // advance to account for closing brace
  pos += 1;

  // only count curly brackets as a classy token if
  // - at the end of the element
  // - just before a newline
  if (pos !== state.posMax && state.src.charCodeAt(pos) !== CHAR_NEWLINE) {
    return false;
  }

  // `preferOuter` keeps track of whether, in an ambiguous case
  // (for instance with <ul>s and <li>s)
  // we should prefer to add it on the containing element
  if (state.src.charCodeAt(initialPos - 1) === CHAR_NEWLINE) {
    preferOuter = true;
  }

  state.pos = pos;

  // work back through the tokens, checking if any of them is an open inline tag
  // if it does turn out we're in an inline tag, the class belongs to that
  //
  // NOTE TO SELF refactor this, add handling for <a> tags as well
  for (i = state.tokens.length - 1; i >= 0; i -= 1) {
    if (state.tokens[i].type === "em_close"
        || state.tokens[i].type === "strong_close") {
      break;
    }

    if (state.tokens[i].type === "em_open"
        || state.tokens[i].type === "strong_open") {
      state.tokens[i].attrPush(["class", classString]);

      // there might be a leftover space at the end
      pendingText = state.pending;
      if (pendingText.charCodeAt(pendingText.length - 1) === CHAR_SPACE) {
        state.pending = pendingText.substring(0, pendingText.length - 1);
      }

      return true;
    }
  }

  token = state.push("classy", "classy", 0);
  token.content = classString;
  token.hidden = true;
  token.preferOuter = preferOuter;

  return true;
}

function getClassyFromInlineToken(inlineToken) {
  var classy,
    tokens = inlineToken.children,
    numChildren = tokens.length;

  // the token *at the end* of the inline tag
  // should be classy
  //
  // also, don't do anything if the only token present is a classy token
  if (tokens[numChildren - 1]){
    if (tokens[numChildren - 1].type !== "classy"
        || tokens.length === 1) {
        return null;
    }
  }

  classy = tokens.pop();
  numChildren -= 1;

  // clean up after token was removed
  if (tokens[numChildren - 1]){
    if (tokens[numChildren - 1].type === "softbreak") {
        // we may need to get rid of the newline just before classy statement
        tokens.pop(numChildren - 1);
    } else {
        // or there might be some whitespace
        // we may need to trim on the previous element
        tokens[numChildren - 1].content = tokens[numChildren - 1].content.trim();
    }
  }

  return classy;
}

function getOpeningToken(tokens, preferOuter, currentIndex) {
  var closingTokenIndex = currentIndex + 1,
    openingTokenType,
    i;

  if (tokens[closingTokenIndex].hidden) {
    closingTokenIndex += 1;
  }

  if (preferOuter && tokens[closingTokenIndex + 1]
      && /_close$/.test(tokens[closingTokenIndex + 1].type)) {
    closingTokenIndex += 1;
  }

  openingTokenType = tokens[closingTokenIndex].type.replace("_close", "_open");

  for (i = currentIndex; i >= 0; i -= 1) {
    if (tokens[i].type === openingTokenType
        && tokens[i].level === tokens[closingTokenIndex].level) {
      return tokens[i];
    }
  }
}

function parseBlock(state) {
  var i,
    openingToken,
    classy;

  for (i = 0; i < state.tokens.length; i += 1) {
    if (state.tokens[i].type === "inline") {
      classy = getClassyFromInlineToken(state.tokens[i]);
      while (classy) {
        openingToken = getOpeningToken(state.tokens, classy.preferOuter, i);
        openingToken.attrPush(["class", classy.content]);

        classy = getClassyFromInlineToken(state.tokens[i]);
      }
    }
  }
}

classy = function (md) {
  md.inline.ruler.push("classy", parse);
  md.core.ruler.push("classy", parseBlock);
};

module.exports = classy;

},{}]},{},[1])(1)
});