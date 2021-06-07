export class Token {
    TokenName: string = "";
    TokenValue: string = "";

    constructor(tokenName: string, tokenValue: string) {
        this.TokenName = tokenName;
        this.TokenValue = tokenValue;
    }
}