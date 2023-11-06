const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    GetVideoAnalysis:
      './src/Handlers/GetVideoAnalysis.ts',
    InformHost:
    './src/Handlers/InformHost.ts'
  },
  target: 'node',
  externals: [{ 'aws-sdk': 'commonjs aws-sdk' }],
  resolve: {
    extensions: ['.js', '.ts'],
    symlinks: false,
    cacheWithContext: false
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.build'),
    filename: '[name]/src/[name].js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: [
          [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, '.webpack'),
            path.resolve(__dirname, 'test')
          ]
        ],
        options: {
          transpileOnly: true,
          experimentalWatchApi: true
        }
      }
    ]
  }
};
