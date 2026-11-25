"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Game, emptyBoard, canPlace, findMatches, applyGravity } = require("./game.js");

test("finds all simultaneous groups but not diagonal or smaller groups", () => {
  const board = emptyBoard();
  for (let x = 0; x < 4; x++) board[11][x] = "red";
  for (let y = 7; y < 11; y++) board[y][5] = "blue";
  board[10][0] = "yellow";
  board[9][1] = "yellow";
  assert.equal(findMatches(board).length, 8);
});

test("gravity preserves each column's order", () => {
  const board = emptyBoard();
  board[0][1] = "red";
  board[5][1] = "blue";
  applyGravity(board);
  assert.equal(board[10][1], "red");
  assert.equal(board[11][1], "blue");
  assert.equal(board[0][1], null);
});

test("placement respects walls and occupied cells", () => {
  const board = emptyBoard();
  const pair = { x: 0, y: 1, rotation: 3, colors: ["red", "blue"] };
  assert.equal(canPlace(board, pair), false);
  pair.rotation = 0;
  assert.equal(canPlace(board, pair), true);
  board[0][0] = "red";
  assert.equal(canPlace(board, pair), false);
});

test("clears and scores a two-step chain, then spawns the next pair", () => {
  const game = new Game(() => 0);
  game.board = emptyBoard();
  for (let x = 0; x < 4; x++) game.board[11][x] = "red";
  for (let x = 0; x < 3; x++) game.board[10][x] = "blue";
  game.board[9][3] = "blue";
  game.pair = null;
  game.resolve();
  assert.equal(game.chain, 1);
  game.finishClear();
  assert.equal(game.score, 40);
  assert.equal(game.chain, 2);
  game.finishClear();
  assert.equal(game.score, 120);
  assert.equal(game.flowers, 8);
  assert.equal(game.state, "playing");
  assert.ok(game.pair);
});

test("unsupported half of a locked pair falls independently", () => {
  const game = new Game(() => 0);
  game.board[11][2] = "blue";
  game.pair = { x: 2, y: 10, rotation: 1, colors: ["red", "yellow"] };
  game.step();
  assert.equal(game.board[10][2], "red");
  assert.equal(game.board[11][3], "yellow");
});

test("ends the game when the next pair cannot spawn", () => {
  const game = new Game(() => 0);
  game.board[1][2] = "blue";
  game.spawn();
  assert.equal(game.state, "over");
  assert.equal(game.pair, null);
});
