export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\\.js$': '$1.js',
  },
  transform: {},
};
