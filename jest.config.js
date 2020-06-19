module.exports = {
    testEnvironment: "node",
    preset: "ts-jest",
    testPathIgnorePatterns: ["dist"] //otherwise it will also include compiled files
 }