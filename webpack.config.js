var webpack = require('webpack');
var path = require('path');


const config = {
  entry: {
    tests: 'mocha!./tests',
    vendor: [
      'immutable',
      'chai'
    ]
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      },
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[id].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'dist'
  },
  cache: true,
  debug: true,
  stats: {
    colors: true,
    reasons: true
  },
  devtool: 'source-map',
  plugins: [
    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.bundle.js'),
  ]
};

module.exports = config;
