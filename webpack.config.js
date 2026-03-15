const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
    popup: './src/ui/popup.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@adapters': path.resolve(__dirname, 'src/adapters'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@storage': path.resolve(__dirname, 'src/storage'),
      '@analysis': path.resolve(__dirname, 'src/analysis'),
      '@generation': path.resolve(__dirname, 'src/generation'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/icons', to: 'icons' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './public/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
  ],
};
