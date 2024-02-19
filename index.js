const webpack = require("webpack");
const getModuleFederationConfigPath = (additionalPaths = []) => {
    const path = require("path");
    const fs = require("fs");
    const appDirectory = fs.realpathSync(process.cwd());
    const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

    const moduleFederationConfigFiles = [...additionalPaths, "modulefederation.config.js"];
    return moduleFederationConfigFiles
        .map(resolveApp)
        .filter(fs.existsSync)
        .shift();
};

module.exports = {
    overrideWebpackConfig: ({webpackConfig, pluginOptions}) => {
        const paths = require("react-scripts/config/paths");

        const moduleFederationConfigPath = getModuleFederationConfigPath(pluginOptions?.additionalPaths || []);

        if (moduleFederationConfigPath) {
            webpackConfig.output.publicPath = "auto";

            if (pluginOptions?.useNamedChunkIds) {
                webpackConfig.optimization.chunkIds = "named";
            }

            const htmlWebpackPlugin = webpackConfig.plugins.find((plugin) => plugin.constructor.name === "HtmlWebpackPlugin");

            const moduleFederationConfig = (typeof pluginOptions?.middleware === 'function' ? pluginOptions.middleware : (config) => config)(require(moduleFederationConfigPath));

            htmlWebpackPlugin.options = {
                ...htmlWebpackPlugin.options,
                publicPath: paths.publicUrlOrPath,
                excludeChunks: [moduleFederationConfig.name],
            };

            webpackConfig.plugins = [...webpackConfig.plugins, new webpack.container.ModuleFederationPlugin(moduleFederationConfig),];

            // webpackConfig.module = {
            //   ...webpackConfig.module,
            //   generator: {
            //     "asset/resource": {
            //       publicPath: paths.publicUrlOrPath,
            //     },
            //   },
            // };
        }
        return webpackConfig;
    }, overrideDevServerConfig: ({devServerConfig}) => {
        devServerConfig.headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        };

        return devServerConfig;
    },
};
