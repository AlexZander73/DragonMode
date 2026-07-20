# Dragon Mode reusable character cutouts

These transparent PNGs are the canonical reusable character assets. They are
intended to overlap full-bleed scene art, sit beside dialogue, or receive subtle
CSS motion without carrying a rectangular background.

## Final assets

- `moss-standing-v1.png` — Moss, alert standing pose
- `moss-sleeping-v1.png` — Moss, curled sleeping pose
- `wish-dragon-v1.png` — Wish Vault dragon
- `tribute-guardian-v1.png` — Tribute Hall guardian
- `hibernation-guardian-v1.png` — Dragon's Rest guardian
- `flight-wizard-v2.png` — Orin, the flight wizard
- `pet-cinder-v1.png` — daily ember sprite
- `pet-quill-v1.png` — weekly owl-gryphon
- `pet-luna-v1.png` — monthly moon fox

The generated flat-colour key plates and the superseded first wizard extraction
are retained in `art-source/characters/`, outside the shipped app bundle.
`flight-wizard-v2.png` is the canonical wizard cutout.

## Generation approach

The built-in image generator was prompted to preserve each reference
character's established design and bright cinematic, painterly mobile-game
style while isolating a complete character on an exact chroma-key field with no
scene, text, border, or cast shadow. The three pets were generated as original,
friendly companions in the same art direction. Flat fields were removed
locally to create RGBA assets with soft edge cleanup.
