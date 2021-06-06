import { LogType } from "./LogType";

export class LogArgs {
    NestingLevel: number = 0;
    Message: string = ""
    LogType: LogType = LogType.INFORMATION;
}