module.exports = {
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/node_modules/'],
    transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)'
    ],
};
