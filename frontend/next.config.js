/** @type {import('next').NextConfig} */

const withTM = require("next-transpile-modules")(["@concordium/browser-wallet-api-helpers", "wallet-common-helpers"]); // pass the modules you would like to see transpiled

const nextConfig = {
    reactStrictMode: true,
    compiler: {
        styledComponents: {
            ssr: true,
        },
    },
    module: {
        rules: [
            {
                test: /\.bin$/,
                exclude: /node_modules/,
                use: ["raw-bin-loader"],
            },
            { test: /\.svg$/, exclude: /node_modules/, use: ["@svgr/webpack"] },
        ],
    },
    webpack(config, { isServer }) {
        if (isServer) {
            // Replace browser only dependencies with node correspondants
            config.resolve = config.resolve ?? {};
            config.resolve.alias = config.resolve.alias ?? {};
            config.resolve.alias = { ...config.resolve.alias, "@concordium/web-sdk": "@concordium/node-sdk" };
        }

        return config;
    },
    experimental: {
        outputStandalone: true,
    },
};

module.exports = withTM(nextConfig);
