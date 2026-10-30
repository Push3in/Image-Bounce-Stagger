import { animate } from "motion";
import { createDialKit, createDialRoot } from "dialkit/vanilla";
import "dialkit/vanilla/styles.css";

// Card frames from the Figma artboard (Image 1 = centre, top of the stack)
const FRAMES = [
  { x: 595,  y: 129, z: 7 }, // Image 1
  { x: 803,  y: 171, z: 6 }, // Image 2
  { x: 380,  y: 171, z: 5 }, // Image 3
  { x: 966,  y: 223, z: 4 }, // Image 4
  { x: 217,  y: 223, z: 3 }, // Image 5
  { x: 1090, y: 283, z: 2 }, // Image 6
  { x: 85,   y: 283, z: 1 }, // Image 7
];

// Distance from the centre card: 0, then pairs 1, 2, 3
const ring = (i) => Math.ceil(i / 2);

// Photography collection from Atlas, exported to public/images as photo-NN.jpg.
// Each style lists 7 photo numbers hand-matched to it: centre card first, then pairs outward.
const STYLES = {
  "Portrait":      [1, 32, 41, 25, 45, 20, 2],
  "Fashion":       [18, 6, 33, 30, 7, 13, 42],
  "Still Life":    [17, 35, 46, 47, 4, 38, 40],
  "Street":        [13, 34, 14, 23, 43, 9, 20],
  "Editorial":     [8, 24, 45, 33, 13, 6, 30],
  "Documentary":   [31, 14, 20, 34, 48, 21, 28],
  "Fine Art":      [19, 36, 29, 26, 15, 1, 27],
  "Landscape":     [3, 28, 21, 29, 31, 19, 15],
  "Product":       [37, 40, 49, 47, 46, 17, 38],
  "Black & White": [31, 20, 12, 9, 22, 43, 15],
  "Minimal":       [29, 35, 15, 9, 38, 43, 37],
  "Studio":        [5, 42, 18, 9, 32, 40, 33],
  "Architecture":  [48, 38, 8, 28, 3, 34, 21],
  "Macro":         [16, 44, 4, 10, 35, 39, 26],
  "Abstract":      [11, 36, 22, 39, 26, 19, 43],
  "Lifestyle":     [48, 49, 5, 41, 8, 20, 7],
  "Analog":        [25, 23, 2, 43, 24, 3, 31],
  "Night":         [10, 27, 12, 26, 14, 11, 23],
};
const CATEGORIES = Object.keys(STYLES);

const photoSrc = (n) => `/images/photo-${String(n).padStart(2, "0")}.jpg`;

const dial = createDialKit(
  "Image Stack",
  {
    bounce: { type: "spring", visualDuration: 0.5, bounce: 0.45 },
    stagger: [0.05, 0, 0.3, 0.01],
    hopY: [8, 0, 80, 1],
    blur: [8, 0, 30, 1],
    slowMotion: false,
    replay: { type: "action" },
  },
  { onAction: (path) => path === "replay" && select(active, { replay: true }) },
);
createDialRoot();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stage = document.getElementById("stage");
const pillsEl = document.getElementById("pills");

// Hover lift follows the same Hop Y value as the swap animation
dial.subscribe(({ hopY }) => stage.style.setProperty("--hop-y", `${hopY}px`));

const cards = FRAMES.map((f) => {
  const card = document.createElement("div");
  card.className = "card";
  card.style.left = f.x + "px";
  card.style.top = f.y + "px";
  card.style.zIndex = f.z;
  const inner = document.createElement("div");
  inner.className = "card-inner";
  const img = document.createElement("img");
  img.alt = "";
  img.decoding = "sync"; // swap mid-bounce without a blank frame
  const ghost = document.createElement("img");
  ghost.className = "card-ghost";
  ghost.alt = "";
  ghost.decoding = "sync";
  const blurLayer = document.createElement("div");
  blurLayer.className = "card-blur";
  // Bottom to top: current photo, its blur, the incoming photo
  inner.append(img, blurLayer, ghost);
  card.appendChild(inner);
  stage.insertBefore(card, pillsEl);
  return { card, img, blurLayer, ghost };
});

// Slow motion plays everything 10× slower, delays included
const SLOW_FACTOR = 10;
const timeScale = () => (dial.values.slowMotion ? SLOW_FACTOR : 1);

const wait = (s) => new Promise((r) => setTimeout(r, s * timeScale() * 1000));

function play(el, keyframes, options) {
  const controls = animate(el, keyframes, options);
  controls.speed = 1 / timeScale();
  return controls.finished;
}

// Each card hops up, takes its new photo, then springs back down — centre first, rippling outward
async function swapCard({ card, img, blurLayer, ghost }, i, src, token) {
  if (reduceMotion) { img.src = src; return; }
  const { bounce: spring, stagger, hopY, blur } = dial.values;
  await wait(ring(i) * stagger);
  if (token !== run) return;
  // At the same time: the current photo blurs, and the next photo fades in over it
  ghost.src = src;
  await Promise.all([
    play(card, { y: -hopY }, { duration: 0.12, ease: "easeOut" }),
    play(blurLayer, { "--blur": ["0px", `${blur}px`] }, { duration: 0.12, ease: "easeOut" }),
    play(ghost, { opacity: [0, 1] }, { duration: 0.12, ease: "easeOut" }),
  ]);
  if (token !== run) return;
  // The next photo now fully covers the card, so swap it in underneath and drop the overlay —
  // both show the same sharp image, so nothing visibly changes
  img.src = src;
  blurLayer.style.setProperty("--blur", "0px");
  await play(ghost, { opacity: 0 }, { duration: 0 });
  await play(card, { y: 0 }, spring);
}

const photosFor = (index) => STYLES[CATEGORIES[index]];

const preload = (indices) =>
  Promise.all(indices.map((n) => {
    const im = new Image();
    im.src = photoSrc(n);
    return im.decode().catch(() => {});
  }));

let active = -1;
let run = 0;

async function select(index, { replay = false } = {}) {
  if (index === active && !replay) return;
  const token = ++run;
  active = index;
  pillsEl.querySelectorAll(".pill:not(.pill-more)").forEach((p, i) =>
    p.setAttribute("aria-pressed", String(i === index)));

  const next = photosFor(index);
  await preload(next);
  if (token !== run) return; // a newer click took over

  cards.forEach((c, k) => swapCard(c, k, photoSrc(next[k]), token));
}

// Tapering rows; the final slot is a "+N" count of the categories not shown
const ROW_SIZES = [5, 4, 3];
const visibleCount = ROW_SIZES.reduce((a, b) => a + b) - 1;
const hidden = CATEGORIES.slice(visibleCount);

const rows = ROW_SIZES.map(() => {
  const row = document.createElement("div");
  row.className = "pill-row";
  pillsEl.appendChild(row);
  return row;
});
const rowFor = (slot) => {
  let r = 0;
  while (slot >= ROW_SIZES[r]) slot -= ROW_SIZES[r++];
  return rows[r];
};

CATEGORIES.slice(0, visibleCount).forEach((name, i) => {
  const btn = document.createElement("button");
  btn.className = "pill";
  btn.type = "button";
  btn.textContent = name;
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", () => select(i));
  rowFor(i).appendChild(btn);
});

const more = document.createElement("button");
more.className = "pill pill-more";
more.type = "button";
more.textContent = `+${hidden.length}`;
more.title = hidden.join(", ");
more.setAttribute("aria-label", `${hidden.length} more categories: ${hidden.join(", ")}`);
rowFor(visibleCount).appendChild(more);

// Clicking a card cycles to the next category
cards.forEach(({ card }) =>
  card.addEventListener("click", () => select((active + 1) % visibleCount)));

// Button text is 13px on the artboard, but never renders smaller than 13px or larger than 16px on screen
const PILL_FONT = 13;
const PILL_FONT_MIN = 13;
const PILL_FONT_MAX = 16;

// Top of the card stack on the artboard (Image 1)
const CONTENT_TOP = FRAMES[0].y;

function fit() {
  const s = Math.min(window.innerWidth / 1440, window.innerHeight / 1024);
  const onScreen = Math.min(PILL_FONT_MAX, Math.max(PILL_FONT_MIN, PILL_FONT * s));
  // Divide by the scale so the stage transform lands it on the clamped size
  stage.style.setProperty("--pill-font", `${onScreen / s}px`);
  // Buttons grow with their text, so centre cards + buttons in the window rather than the artboard
  const contentBottom = pillsEl.offsetTop + pillsEl.offsetHeight;
  const dy = (1024 / 2 - (CONTENT_TOP + contentBottom) / 2) * s;
  stage.style.transform = `translateY(${dy}px) scale(${s})`;
}
window.addEventListener("resize", fit);
fit();

select(0);
