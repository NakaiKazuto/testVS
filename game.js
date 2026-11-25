"use strict";

const WIDTH = 6;
const HEIGHT = 12;
const COLORS = ["red", "blue", "yellow", "purple"];
const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DROP_INTERVALS = new Map([
  ["easy", 900],
  ["normal", 650],
  ["hard", 400]
]);

function getDropInterval(level) {
  if (!DROP_INTERVALS.has(level)) {
    throw new RangeError(`Unknown game level: ${level}`);
  }
  return DROP_INTERVALS.get(level);
}

function emptyBoard() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
}

function pairCells(pair) {
  const [dx, dy] = DIRECTIONS[pair.rotation];
  return [
    { x: pair.x, y: pair.y, color: pair.colors[0] },
    { x: pair.x + dx, y: pair.y + dy, color: pair.colors[1] }
  ];
}

function canPlace(board, pair) {
  return pairCells(pair).every(({ x, y }) =>
    x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && !board[y][x]
  );
}

function findMatches(board) {
  const seen = new Set();
  const matches = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const key = y * WIDTH + x;
      if (!board[y][x] || seen.has(key)) continue;
      const color = board[y][x];
      const group = [{ x, y }];
      seen.add(key);
      for (let i = 0; i < group.length; i++) {
        for (const [dx, dy] of DIRECTIONS) {
          const nx = group[i].x + dx;
          const ny = group[i].y + dy;
          const neighbor = ny * WIDTH + nx;
          if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT &&
              !seen.has(neighbor) && board[ny][nx] === color) {
            seen.add(neighbor);
            group.push({ x: nx, y: ny });
          }
        }
      }
      if (group.length >= 4) matches.push(...group);
    }
  }
  return matches;
}

function applyGravity(board) {
  for (let x = 0; x < WIDTH; x++) {
    let destination = HEIGHT - 1;
    for (let y = HEIGHT - 1; y >= 0; y--) {
      if (board[y][x]) {
        const color = board[y][x];
        board[y][x] = null;
        board[destination--][x] = color;
      }
    }
  }
}

class Game {
  constructor(random = Math.random) {
    this.random = random;
    this.reset();
  }

  randomPair() {
    return [0, 1].map(() => COLORS[Math.floor(this.random() * COLORS.length)]);
  }

  reset() {
    this.board = emptyBoard();
    this.score = 0;
    this.flowers = 0;
    this.chain = 0;
    this.matches = [];
    this.state = "playing";
    this.next = this.randomPair();
    this.spawn();
  }

  spawn() {
    this.pair = { x: 2, y: 1, rotation: 0, colors: this.next };
    this.next = this.randomPair();
    if (!canPlace(this.board, this.pair)) {
      this.pair = null;
      this.state = "over";
    }
  }

  move(dx, dy) {
    if (this.state !== "playing") return false;
    const candidate = { ...this.pair, x: this.pair.x + dx, y: this.pair.y + dy };
    if (!canPlace(this.board, candidate)) return false;
    this.pair = candidate;
    return true;
  }

  rotate() {
    if (this.state !== "playing") return;
    const rotated = { ...this.pair, rotation: (this.pair.rotation + 1) % 4 };
    for (const dx of [0, -1, 1]) {
      const candidate = { ...rotated, x: rotated.x + dx };
      if (canPlace(this.board, candidate)) {
        this.pair = candidate;
        return;
      }
    }
  }

  step() {
    if (this.state !== "playing" || this.move(0, 1)) return;
    for (const { x, y, color } of pairCells(this.pair)) this.board[y][x] = color;
    this.pair = null;
    applyGravity(this.board);
    this.chain = 0;
    this.resolve();
  }

  resolve() {
    this.matches = findMatches(this.board);
    if (this.matches.length) {
      this.chain++;
      this.state = "clearing";
    } else {
      this.chain = 0;
      this.state = "playing";
      this.spawn();
    }
  }

  finishClear() {
    if (this.state !== "clearing") return;
    this.score += this.matches.length * 10 * this.chain;
    this.flowers += this.matches.length;
    for (const { x, y } of this.matches) this.board[y][x] = null;
    this.matches = [];
    applyGravity(this.board);
    this.resolve();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Game, emptyBoard, canPlace, findMatches, applyGravity, getDropInterval };
}

if (typeof document !== "undefined") {
  const game = new Game();
  const board = document.getElementById("board");
  const cells = Array.from({ length: WIDTH * HEIGHT }, () => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    board.appendChild(cell);
    return cell;
  });
  const score = document.getElementById("score");
  const next = document.getElementById("next");
  const flowers = document.getElementById("flowers");
  const garden = document.getElementById("garden");
  const levelSelect = document.getElementById("level");
  const chain = document.getElementById("chain");
  const message = document.getElementById("message");
  const messageTitle = document.getElementById("message-title");
  const messageDetail = document.getElementById("message-detail");
  const messageAction = document.getElementById("message-action");
  const pauseButton = document.getElementById("pause");
  let paused = false;
  let elapsed = 0;
  let lastTime = 0;
  let displayedFlowers = -1;

  function makeDrop(color, clearing = false) {
    const drop = document.createElement("div");
    drop.className = `drop ${color}${clearing ? " clearing" : ""}`;
    return drop;
  }

  function render() {
    const active = new Map((game.pair ? pairCells(game.pair) : []).map(cell => [cell.y * WIDTH + cell.x, cell.color]));
    const clearing = new Set(game.matches.map(cell => cell.y * WIDTH + cell.x));
    cells.forEach((cell, index) => {
      const color = active.get(index) || game.board[Math.floor(index / WIDTH)][index % WIDTH];
      cell.replaceChildren(...(color ? [makeDrop(color, clearing.has(index))] : []));
    });
    score.textContent = game.score.toLocaleString("ja-JP");
    next.replaceChildren(...game.next.map(color => makeDrop(color)));
    flowers.textContent = game.flowers.toLocaleString("ja-JP");
    if (displayedFlowers !== game.flowers) {
      displayedFlowers = game.flowers;
      garden.replaceChildren();
      const symbols = ["✿", "❀", "✾", "✽"];
      for (let i = 0; i < Math.min(game.flowers, 18); i++) {
        const flower = document.createElement("span");
        flower.className = "flower";
        flower.textContent = symbols[i % symbols.length];
        flower.style.left = `${5 + (i * 37 % 86)}%`;
        flower.style.bottom = `${18 + (i * 19 % 55)}px`;
        flower.style.color = ["#e99e9a", "#e7bb67", "#ae99cc", "#f0b5ac"][i % 4];
        garden.appendChild(flower);
      }
    }
    chain.textContent = game.state === "clearing" && game.chain > 1 ? `${game.chain} れんさ！` : "";
    message.hidden = !paused && game.state !== "over";
    if (!message.hidden) {
      messageTitle.textContent = paused ? "ひとやすみ" : "ゲームオーバー";
      messageDetail.textContent = paused ? "お庭でちょっと休憩。" : `スコア ${game.score.toLocaleString("ja-JP")} 点`;
      messageAction.textContent = paused ? "つづける" : "もういちど";
    }
    pauseButton.textContent = paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", paused ? "再開" : "一時停止");
  }

  function restart() {
    game.reset();
    paused = false;
    elapsed = 0;
    render();
  }

  function togglePause() {
    if (game.state === "over") return;
    paused = !paused;
    elapsed = 0;
    render();
  }

  function act(action) {
    if (paused || game.state !== "playing") return;
    if (action === "left") game.move(-1, 0);
    if (action === "right") game.move(1, 0);
    if (action === "rotate") game.rotate();
    if (action === "down") {
      game.step();
      elapsed = 0;
    }
    render();
  }

  document.addEventListener("keydown", event => {
    const actions = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "rotate", ArrowDown: "down" };
    if (event.key === "Escape") {
      event.preventDefault();
      if (!event.repeat) togglePause();
    } else if (actions[event.key]) {
      event.preventDefault();
      act(actions[event.key]);
    }
  });
  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => act(button.dataset.action));
  });
  pauseButton.addEventListener("click", togglePause);
  levelSelect.addEventListener("change", () => {
    elapsed = 0;
  });
  document.getElementById("restart").addEventListener("click", restart);
  messageAction.addEventListener("click", () => paused ? togglePause() : restart());

  function tick(time) {
    const delta = lastTime ? Math.min(time - lastTime, 100) : 0;
    lastTime = time;
    if (!paused && game.state !== "over") {
      elapsed += delta;
      const interval = game.state === "clearing" ? 350 : getDropInterval(levelSelect.value);
      if (elapsed >= interval) {
        elapsed = 0;
        if (game.state === "clearing") game.finishClear();
        else game.step();
        render();
      }
    }
    requestAnimationFrame(tick);
  }

  render();
  requestAnimationFrame(tick);
}
