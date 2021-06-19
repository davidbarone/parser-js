import { LogType } from "./LogType";

export class LogArgs {
    nestingLevel: number = 0;
    message: string = ""
    logType: LogType = LogType.Information;
}