# Changelog

All notable changes to Snake demo are documented here.

## [Unreleased]

### Added

- Levels: 5 dots clear a level; each level is laid out anew with a random start, the snake unrolling from
  one cell, and one more obstacle; 5 ms less between moves per level, down to 50 ms (#17). Specified in #16.
- A test that a game won because the next level does not fit keeps no queued turns, and clearer test names and
  error message for the start length (#20).

- The game page: canvas, timer, keys, swipes, buttons, score and best
  score, with browser tests (#10).
- Publishing on GitHub Pages at https://sugose.github.io/snake-demo/ on
  every merge to `main` (#11).
- The game rules (#8), input mapping for keys and swipes (#7) and the
  best score kept in the browser (#6).
- The specification and the Phase 1 plan (#4), and the project's purpose
  and goal (#3).

### Changed

- The project signs off to factoincognito's product office and cites its
  Rules; the shipped copy of the Rules and its check are removed (#2).
- Phase 1 progress recorded in the backlog and status (#9), the
  published game and its changelog (#12), and Adam's phone test (#13).
- The specification states the key and swipe details the code follows:
  modifier keys, held keys, keys while a button has the focus, and mouse
  drags (#14).
- The published levels recorded (#18); the specification states the layout shortfalls and the unrolling
  exactly (#19); the special levels idea in the backlog (#21, #22, #24); PBI-2.6 recorded done (#23).

### Removed

- The review-ready workflow, `review.yml` (#5).

## Project created

- Bootstrapped from the Clead + Crog project template
  v2.9.2, built from
  factoincognito/ai-project-template-v2@8d5ee3bd90cc6632a3510c497f175a748bd2790a.
- Language pack: web.
- Licence: polyform-noncommercial-1.0.0.
- Set up by bootstrap-project.sh.
