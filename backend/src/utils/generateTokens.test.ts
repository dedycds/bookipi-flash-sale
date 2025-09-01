import { generateTokens } from './generateTokens';

// Mock constants for test values
const TOKEN_COUNT = 5;
const ZERO_TOKENS = 0;

describe('generateTokens', () => {
    it('should generate the correct number of tokens', () => {
        const tokens = generateTokens(TOKEN_COUNT);

        // Verify output is an array
        expect(Array.isArray(tokens)).toBe(true);

        // Verify length matches requested number
        expect(tokens).toHaveLength(TOKEN_COUNT);
    });

    it('should generate unique tokens', () => {
        const tokens = generateTokens(TOKEN_COUNT);

        // Convert to Set to check for uniqueness
        const uniqueTokens = new Set(tokens);

        // Ensure no duplicates
        expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should return an empty array when number is zero', () => {
        const tokens = generateTokens(ZERO_TOKENS);

        expect(tokens).toEqual([]);
        expect(tokens).toHaveLength(ZERO_TOKENS);
    });
});
