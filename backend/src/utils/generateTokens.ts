import { v4 as uuidv4 } from 'uuid';
export function generateTokens(number: number): Array<string> {
    const tokens = [];
    for (let i = 0; i < number; i++) {
        tokens.push(uuidv4());
    }

    return tokens;
}
