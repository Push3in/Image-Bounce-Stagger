# Image Bounce Stagger

A fanned stack of seven photo cards with a row of photography-style buttons. When you pick a style, every card hops up, swaps its photo and springs back down. The centre card goes first and the motion ripples outward in pairs.

Built with plain JavaScript, [Vite](https://vite.dev), [Motion](https://motion.dev) for the spring animation and [DialKit](https://www.npmjs.com/package/dialkit) for live tuning.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## How the swap works

For each card, after its stagger delay:

1. **Hop:** the card lifts by *Hop Y* pixels over 0.12s.
2. **At the same time, the photos cross over:** a backdrop blur layer blurs the current photo, and the next photo fades in sharp on top of it.
3. **Swap:** the next photo now covers the card, so it is swapped into the base image and the overlays are cleared. Nothing visibly changes at this step.
4. **Land:** the card springs back to its resting position, with the bounce and duration set in DialKit.

Photos for the next style are preloaded and decoded before any card moves, so there's no blank frame. If you click again mid-animation, the newer click takes over.

## Controls

Use the DialKit panel in the top-right corner:

| Control | What it does |
| --- | --- |
| Bounce | Spring for the landing (bounce and visual duration) |
| Stagger | Delay between each ring of cards, from the centre outward |
| Hop Y | How far a card lifts during the swap. Hovering lifts it by the same amount |
| Blur | How strongly the current photo blurs as it leaves |
| Slow Motion | Plays everything 10× slower so you can see each step |
| Replay | Runs the current style's animation again |

Clicking a card moves on to the next style. The system's reduced-motion setting is respected: photos swap instantly.

## Layout

- The design is a 1440 × 1024 artboard that scales to fit the window. The cards and buttons are centred together.
- Button text stays between 13px and 16px on screen, whatever the window size. Button height, padding and gaps scale with the text.
- The buttons are laid out in rows of 5, 4 and 3. The last button shows how many styles are hidden ("+7").

## Project structure

```
index.html           Styles and stage markup
src/main.js          Cards, buttons, animation and DialKit setup
public/images/       Photos (photo-01.jpg … photo-49.jpg)
```

To change which photos go with a style, edit the `STYLES` map in `src/main.js`. Each style lists 7 photo numbers: the centre card first, then pairs moving outward.
