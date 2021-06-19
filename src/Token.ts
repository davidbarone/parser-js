export class Token {
    tokenName: string = "";
    tokenValue: string = "";

    constructor(tokenName: string, tokenValue: string) {
        this.tokenName = tokenName;
        this.tokenValue = tokenValue;
    }
}