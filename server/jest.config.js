module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  maxWorkers: 1,
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }]
  }
};
