import { LogArgs } from "./LogArgs";

export interface ILoggable {
    logHandler(sender: any, args: LogArgs): void;
}