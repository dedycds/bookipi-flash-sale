import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a set of unique tokens.
 *
 * - Uses UUID v4 to create cryptographically strong random tokens.
 * - Ensures uniqueness by storing tokens in a Set and regenerating if a duplicate occurs.
 *
 * @param number - The number of tokens to generate
 * @returns An Array containing the generated unique tokens
 */
export function generateTokens(number: number): Array<string> {
    const tokens = new Set<string>();

    // Loop until the required number of unique tokens is generated
    for (let i = 0; i < number; i++) {
        let newToken = uuidv4();

        // If token already exists in the set, regenerate until unique
        while (tokens.has(newToken)) {
            newToken = uuidv4();
        }

        // Add unique token to the set
        tokens.add(newToken);
    }

    // Return the set of generated unique tokens
    return Array.from(tokens);
}
