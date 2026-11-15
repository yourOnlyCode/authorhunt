import next from "eslint-config-next";

export default [
  ...next,
  { ignores: [".next/**", "node_modules/**", "docs/**", ".data/**"] },
  {
    rules: {
      // Covers and portraits are user uploads at arbitrary sizes, served already resized.
      "@next/next/no-img-element": "off",
    },
  },
];
