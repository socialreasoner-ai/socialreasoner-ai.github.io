Three.js 0.181.2
Source: https://www.npmjs.com/package/three/v/0.181.2
License: MIT (see LICENSE).

Vendored official modules:
  build/three.module.js
  build/three.core.js
  examples/jsm/loaders/GLTFLoader.js
  examples/jsm/utils/SkeletonUtils.js
  examples/jsm/utils/BufferGeometryUtils.js

Addon imports use the local core module. One upstream indentation-only
space-before-tab was normalized for the repository whitespace check.

The globe loads self-contained GLB assets with GLTFLoader, clones independent
skeletons with SkeletonUtils, and plays their animation clips with
AnimationMixer. The authored GLBs use ordinary mesh buffers and PBR vertex
colors; no external texture, Draco decoder, or hosted model service is needed.
