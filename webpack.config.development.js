const path = require("path");

module.exports = {
  target: "web",
  entry: { main: path.resolve("./src/parser.ts") },
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "parser-js.js",
    library: "@dbarone/parser-js",
    libraryTarget: "umd",
    globalObject: "this",
    umdNamedDefine: true,
  },
};
