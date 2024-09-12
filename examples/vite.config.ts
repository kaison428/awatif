import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 4600,
    open: "section-designer/index.html",
  },
  base: "./", // to resolve assets
  root: "./src",
  build: {
    outDir: "../../website/src/examples",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "3d-structure": "src/3d-structure/index.html",
        "advanced-truss": "src/advanced-truss/index.html",
        bars: "src/bars/index.html",
        beams: "src/beams/index.html",
        building: "src/building/index.html",
        curves: "src/curves/index.html",
        "mesh-refinement": "src/mesh-refinement/index.html",
        "section-designer": "src/section-designer/index.html",
        sphere: "src/sphere/index.html",
        truss: "src/truss/index.html",
        "without-template": "src/without-template/index.html",
      },
    },
  },
});
