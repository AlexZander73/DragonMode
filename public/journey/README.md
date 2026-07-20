# Living Atlas art set

All final raster assets in this folder were generated with the built-in Codex
image-generation workflow for Dragon Mode's bright cinematic painterly fantasy
direction.

- `world-map-v1.png`: vertical branchable fantasy atlas with a luminous
  mountain destination, sunny high road, calm lake route, and sheltered valley;
  no baked UI, labels, nodes, or characters.
- `route-rising-v1.png`: wide hopeful sunlit mountain-road environment.
- `route-steady-v1.png`: wide calm twilight lake-and-camp environment.
- `route-sheltered-v1.png`: wide repaired bridge after a storm, with returning
  sunlight and no disaster imagery.
- `avatar-*.png`: six full-body reusable player-character cutouts covering
  varied gender expression, body type, age, fantasy ancestry, and role.

Character sources were generated against flat green or magenta chroma
backgrounds, then converted to transparent PNGs with the imagegen skill's
`remove_chroma_key.py` helper using border-key detection, a soft matte, and
despill. The original keyed sources are retained in `art-source/journey/` for
future rerendering or animation work.

Prompt rules shared by the set: premium mobile-game key art, readable at phone
size, painterly texture, luminous practical light, clear silhouette, no text,
no logos, no UI, no frame, no card, and generous environmental breathing room.
