const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/Nabla/nabla.js",
  output: {
    path: path.resolve("./"),
    filename: "dist/index.js",
    library: "nabla"
    // // Expose the default export.
    // libraryExport: "default"
  }
};
