const withDocumentDisabled = (callback) => {
    const hasOwnDocument = Object.prototype.hasOwnProperty.call(globalThis, "document");
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

    try {
        Object.defineProperty(globalThis, "document", {
            value: undefined, configurable: true, writable: true,
        });
    } catch (e) {
        try {
            globalThis.document = undefined;
        } catch (error) {
        }
    }

    try {
        return callback();
    } finally {
        if (documentDescriptor) {
            Object.defineProperty(globalThis, "document", documentDescriptor);
        } else if (hasOwnDocument) {
            globalThis.document = undefined;
        } else {
            delete globalThis.document;
        }
    }
};
const getModuleFederationPlugin = () => {
    const EnhancedModuleFederationPlugin = require('@module-federation/enhanced/webpack').ModuleFederationPlugin;

    return class ModuleFederationPlugin extends EnhancedModuleFederationPlugin {
        apply(compiler) {
            return withDocumentDisabled(() => super.apply(compiler));
        }
    };
};
const getModuleFederationConfigPath = (additionalPaths = []) => {
    const path = require("node:path");
    const fs = require("node:fs");
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
        const paths = require("@kne/react-scripts/config/paths");

        const moduleFederationConfigPath = getModuleFederationConfigPath(pluginOptions?.additionalPaths || []);

        if (moduleFederationConfigPath) {
            //webpackConfig.output.publicPath = "auto";

            if (pluginOptions?.useNamedChunkIds) {
                webpackConfig.optimization.chunkIds = "named";
            }

            const htmlWebpackPlugin = webpackConfig.plugins.find((plugin) => plugin.constructor.name === "HtmlWebpackPlugin");

            const moduleFederationConfig = (typeof pluginOptions?.middleware === 'function' ? pluginOptions.middleware : (config) => config)(require(moduleFederationConfigPath));
            const normalizedModuleFederationConfig = {
                ...moduleFederationConfig, dataPrefetch: false,
            };
            const ModuleFederationPlugin = getModuleFederationPlugin();

            htmlWebpackPlugin.options = {
                ...htmlWebpackPlugin.options,
                publicPath: paths.publicUrlOrPath,
                excludeChunks: [normalizedModuleFederationConfig.name],
            };

            webpackConfig.plugins = [...webpackConfig.plugins, new ModuleFederationPlugin(normalizedModuleFederationConfig),];

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
