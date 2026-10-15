# Player sprite atlas

Generated with the built-in `image_gen.imagegen` tool with `transparent_background: true`. Original saved as `public/art/player.png`; the active chibi atlas is `public/art/player-chibi.png`.

Atlas layout: four columns of animation frames; rows face south, west, east, and north respectively. The generated grid is not perfectly uniform; the renderer uses measured 300 × 300 source rectangles from `lib/player-sprite.ts` to avoid sampling neighboring rows. Column 0 is used as the idle pose. The walking sequence uses columns 1, 0, 3, 2.

Final prompt:

Use case: stylized-concept. Asset type: production 2D RPG player walking sprite atlas. Create a perfectly regular 4 columns by 4 rows sprite sheet on transparent background, square image. Exactly 16 frames of ONE identical original young adult explorer, top-down three-quarter overworld viewpoint, detailed but crisp 32x32-style pixel art, dark outlines, restrained warm palette, rust-orange cap and jacket, cream shirt, dark teal trousers, brown boots, small olive backpack, brown hair. No existing franchise character. Row 1: facing SOUTH toward viewer in every frame. Row 2: facing WEST left profile in every frame. Row 3: facing EAST right profile in every frame. Row 4: facing NORTH away from viewer, backpack visible, NO face, in every frame. In each row, column 1 neutral standing feet together; column 2 left leg forward and right arm forward walking stride; column 3 neutral passing stance; column 4 right leg forward and left arm forward walking stride. Keep head, torso size, cap, outfit, lighting and foot baseline perfectly consistent between frames. Each frame centered in its equal-sized grid cell, character occupies about 65% cell width and 80% cell height, ample transparent margin, no frame overlap, no decorative borders, no labels, no text, no shadows, no ground, no grid lines. Clearly distinct opposite-leg strides, usable seamless walk cycle. Exact same character from all four directions.

## Chibi revision

Generated with the built-in `image_gen.imagegen` tool using the original atlas as an edit target and `transparent_background: true`. The active source rectangles use x origins 20, 326, 632, 938 and y origins 25, 315, 605, 895, each 300 × 300 pixels.

Final prompt:

Use case: style-transfer. Edit target: supplied player sprite atlas. Replace the tall detailed adventurer with a very squat chibi pixel-art overworld trainer in the spirit of first-generation handheld monster RPGs. Keep rust cap and jacket, cream shirt, teal trousers, olive backpack. Huge head about half total height, tiny torso and stubby legs, simple crisp chunky pixel clusters, dark outline, limited color palette, no fine shading. Production sprite sheet: precisely four columns and four rows with equal cells, generous transparent gutters. Row 1 faces south, row 2 west, row 3 east, row 4 north. Each row has idle feet together, left-foot step, idle feet together, right-foot step. All 16 characters same size, centered within cells, same foot baseline per row. True transparent background, no shadow, no ground, no text, no grid lines. Every character entirely contained within its own cell. Original adventurer design, compact nearly square body silhouette.
