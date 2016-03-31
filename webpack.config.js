/* global __dirname */

var path = require('path');

var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var dir_js = path.resolve(__dirname, 'src/js');
var dir_html = path.resolve(__dirname, 'src/html');
var dir_samples = path.resolve(__dirname, 'src/samples');
var dir_build = path.resolve(__dirname, 'build');

module.exports = {
    entry: {
        // TODO: work out how to share the common code between these two(?)
        euclid: path.resolve(dir_js, 'index.js'),

        vendor: ["tone", "nexusui"]
    },
    output: {
        path: dir_build,
        filename: '[name].bundle.js'
    },
    devServer: {
        contentBase: dir_build,
    },
    module: {
        loaders: [
            {
                loader: 'babel-loader',
                test: dir_js,
                query: {
                    presets: ["es2015"]
                }
            }
        ]
    },
    plugins: [
        // Simply copies the files over
        new CopyWebpackPlugin([
            { from: dir_html }, // to: output.path,
            { from: dir_samples, to: "samples" }
        ]),

        // Avoid publishing files when compilation fails
        new webpack.NoErrorsPlugin(),

        // Split out vendor code
        new webpack.optimize.CommonsChunkPlugin({
            name: "vendor",
            minChunks: Infinity
        })
    ],
    // Create Sourcemaps for the bundle
    devtool: 'source-map',
};
