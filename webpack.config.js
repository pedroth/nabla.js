const path = require("path");

const serverConfig = {
  target: "node",
  mode: "production",
  entry: "./src/Nabla/nabla.js",
  output: {
    path: path.resolve("./"),
    filename: "dist/index.node.js",
    library: "Nabla",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: [
              "@babel/plugin-proposal-class-properties",
              "@babel/plugin-proposal-private-methods"
            ]
          }
        }
      }
    ]
  }
};

const clientConfig = {
  target: "web",
  mode: "production",
  entry: "./src/Nabla/nabla.js",
  output: {
    path: path.resolve("./"),
    filename: "dist/index.js",
    library: "Nabla",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: [
              "@babel/plugin-proposal-class-properties",
              "@babel/plugin-proposal-private-methods"
            ]
          }
        }
      }
    ]
  }
};

module.exports = [serverConfig, clientConfig];
