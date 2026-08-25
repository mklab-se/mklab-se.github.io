# MKLab Quiz, design

Date: 2026-08-25
Status: approved, ready for implementation planning

## What this is

A Jeopardy-style quiz game published at `/talks/quiz/`, sitting in the Tech Talks grid
alongside the decks. It is not a talk. Kristofer runs it live in a room with clients,
from a laptop on a projector, as the host. The audience plays in teams.

It is password protected with the same model as "AI för beslutsfattare": the password is
handed out as part of a real session with MKLab, and the holder keeps access both during
and after that session.

Password: `quiz-2026`
SHA-256: `5e2ca8e69f49da0234ab09adf37875790f48035ae405e1065b7c74e1883f6218`

## Why it is built the way it is

Three constraints drove every structural decision.

**The room is unknown.** A client session might hold sales people, a CTO, or a room of
engineers. So the question bank spans 28 categories from "AI on Film" to "Observability",
and choosing six of them at setup is the mechanism that tunes the game to whoever showed
up. Every category carries an audience tag for that purpose.

**The host is on stage.** Kristofer drives everything by mouse, standing, talking. Nothing
may advance on its own. The countdown clock is pressure for the audience, never a
controller of state: when it hits zero the game does not move. Only a click does.

**The network cannot be trusted.** The game runs in a client's conference room over their
wifi. The entire question bank is inlined in the page, so after the initial load the game
makes no network requests at all.

## The question bank

Already written and validated. `_data/quiz/<id>.yml`, one file per category.

- 28 categories, 25 questions each, 700 questions total
- Every question and answer in both Swedish and English, so 1400 written items
- Exactly 5 questions at each of 100, 200, 300, 400 and 500 per category
- No duplicate questions across categories, no em-dashes anywhere

Schema:

```yaml
id: ai-models
tag: anyone            # anyone | tech | hands-on
name:
  sv: "AI-modeller"
  en: "AI Models"
questions:
  - value: 300
    q:
      sv: "Vad styr inställningen temperature hos en modell?"
      en: "What does a model's temperature setting control?"
    a:
      sv: "Hur slumpmässigt svaret blir"
      en: "How random the output is"
```

Difficulty ladder, applied identically in every category:

| Value | Who can answer it |
|---|---|
| 100 | Anyone in the room |
| 200 | Anyone who works in tech |
| 300 | A practitioner in that area |
| 400 | A specialist |
| 500 | A deep expert, or a fact that surprises even one |

Questions are plain questions with short answers. The real Jeopardy convention of phrasing
the clue as a statement and the response as a question is deliberately not used.

## Files

| File | Status | Role |
|---|---|---|
| `_layouts/game.html` | new | Fork of `talk.html`: same head, tokens, canvas, corner logo, password gate. Loads the game controller instead of `deck.js`. |
| `_pages/talks/quiz.html` | new | Front matter plus the screen scaffolding, with the bank inlined as JSON. |
| `assets/js/quiz-game.js` | new | State machine, scoring, split-flap, persistence, keyboard. |
| `assets/js/talks/quiz.js` | new | Particle scenes, forked from the deck engine, one scene per screen. |
| `assets/css/quiz.css` | new | Board grid, 3D card flip, split-flap digits, podium. |
| `_data/talks.yml` | edit | Registry entry so the card appears in both talks indexes. |
| `_data/quiz/*.yml` | done | The bank. |

Nothing else is touched. `deck.js`, `deck.css`, `canvas.js` and every existing talk stay
exactly as they are.

`_layouts/game.html` loads `deck.css` before `quiz.css`, because the password gate styling
lives in `deck.css` and is reused verbatim.

### Why the bank is inlined

700 questions in two languages is roughly 280 KB of JSON, about 70 KB gzipped. Inlining it
costs a slightly heavier initial page load and buys total independence from the network for
the rest of the session. For a game played in front of a paying client on their own wifi,
that trade is correct. It also means the gate and the data live behind the same veil, such
as it is.

## Screens

The game is a state machine. Each state maps to a `data-scene` value, so the particle
engine morphs between states the way it morphs between slides in the decks.

```
GATE → SETUP → PICK → BOARD ⇄ QUESTION → ANSWER → AWARD → BOARD … → PODIUM
```

### SETUP, scene `setup`

- Language toggle, SV or EN
- Sound toggle
- Team rows: name field and a colour, add and remove, minimum two teams, maximum six
- `Next: pick categories`

Particles gather into one loose cluster per team as the teams are named, each cluster
taking that team's colour. The room watches the teams form.

### PICK, scene `pick`

- All 28 categories as tiles, in random order, renumbered 1 to 28 on every entry
- The number is the dominant element, the name secondary, because the number is what
  someone shouts across a room
- Each tile carries a small audience-tag dot
- Click to select, click again to drop. Selected tiles burn ember and show which of the six
  board columns they will become
- `Back to teams` returns to SETUP with all team state intact
- `Play` enables only at exactly six selected

At `Play`, each chosen category draws one random question per value from its pool of five.
That draw is recorded in saved state, so a resumed game shows the same board rather than
reshuffling underneath the host.

### Editing a game in progress

`Play` is not a one way door. An `Edit game` control on the board returns to SETUP and PICK
with the game intact, so a mistake spotted after the first card does not cost a restart in
front of an audience. The rules that make this safe:

- **Scores are never reset by editing.** Nothing in this flow can wipe the board's points.
- **Renaming a team, or recolouring it,** carries its score along untouched.
- **Adding a team mid-game** joins it on zero, immediately editable like any other score.
- **Removing a team** discards its score and asks for confirmation first, because it is the
  only destructive action in the flow.
- **Keeping a category** preserves its column exactly: same drawn questions, same cards
  already spent.
- **Swapping a category out** resets that column only. The new category draws fresh
  questions and all five of its cards return. Every other column keeps its played state.
- **Cancel** returns to the board with nothing changed.

The rule underneath all of it: editing changes what is still to come, never what already
happened.

### BOARD, scene `board`

- Six category headers across the top
- Thirty cards below, five rows by six columns, each showing only its value
- A played card is removed, not greyed. The slot goes dark and embers drift up through it,
  so the board visibly burns down as the game proceeds
- Split-flap scoreboards along the bottom, always visible
- Controls: edit game, end game, mute, language

### QUESTION, scene `question`

- The clicked card rotates on the Y axis in real 3D and zooms to fill the screen
- Category and value in the corner, the question in large type
- A particle ring drains around the question over ten seconds, ember cooling to dark
- At zero the ring goes still and glows red hot. **The game does not advance.** Only the
  host advances it

### ANSWER, scene `answer`

- The answer resolves out of the particles below the question
- The question stays on screen, so the room sees question and answer together

### AWARD, scene `award`

- Team tiles appear large in their colours, plus a `Nobody` tile
- Clicking a team flings the card's points across as particles into that team's board, and
  the flaps tumble
- Clicking `Nobody` scatters them and they fade
- Returns to BOARD once the flaps settle

### PODIUM, scene `podium`

- Three tiers, winner centre and highest
- Two teams gives two tiers. Four or more puts the top three on the podium and lists the
  rest below. Ties share a step
- The winner's flaps do one final full roll, and particles bloom upward behind them
- `New game` returns to SETUP

Reached either by playing the last card, or by the host ending the game early from BOARD.

## The split-flap scoreboard

Each digit is a flap that splits horizontally and tumbles to the next number, right to
left, the way an airport departure board does. Awarding 300 to a team on 1200 rolls the
units through 0, 1, 2, 3, 4, 5 and carries into the hundreds, so the number visibly counts
rather than fading or snapping. This is the most theatrical moment in the game and it fires
every time points land.

Clicking any team's score, from any screen, turns it into an editable field. Type a number,
press Enter, and the flaps roll to it. Handicaps, bonuses and corrections all use the same
path. This is available at all times, exactly as specified.

## Sound

Synthesised in the browser with the Web Audio API, no audio files.

- Card flip: a short filtered whoosh
- Countdown: a tick per second, tightening over the last three
- Answer reveal: a low resolving sting
- Points awarded: a chime, pitched by the value
- Podium: a short fanfare

A mute toggle is visible at all times, and the sound setting persists with the rest of the
game state. All audio is created after a user gesture, so browser autoplay policy is never
an issue.

## Persistence

Every state change writes the full game to `sessionStorage`: teams, colours, scores, the
six chosen categories, the drawn questions, which cards are spent, language, sound, and the
current screen.

On load, if a game is in progress, the player is offered `Resume` or `Start over`.

The reason is blunt: a live game losing its scores to an accidental refresh in front of a
paying client is this project's worst failure mode, and preventing it is nearly free.

## Controls

Mouse drives everything. Keyboard shortcuts exist alongside it so the host's hands can stay
off the trackpad while talking.

| Key | Action |
|---|---|
| Space | Advance: reveal answer, then go to award |
| 1 to 6 | Award the points to that team |
| 0 | Award to nobody |
| Esc | Back to the board |
| F | Fullscreen |
| E | End the game and show the podium |
| G | Edit the game: teams and categories |

## Registry entry

`_data/talks.yml` gains an entry with slug `quiz` at `/talks/quiz/`. The card must be
honest that this is a game rather than a talk, in both languages, and must not open with
the same words as any existing card.

## Accessibility and scope

The canvas stays `aria-hidden`, as in the decks. This is a presenter tool driven by one
person on a laptop connected to a projector. It is not designed for touch, for phones, or
for unattended play, and it does not need to be.

## Out of scope

- Any server, database or multiplayer over a network
- Audience phones or buzzers
- Player accounts or saved history between sessions
- Deducting points for wrong answers. Awarding to `Nobody` plus manual score editing covers
  every case that would need
