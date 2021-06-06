import { LogArgs } from "./LogArgs";

export interface ILoggable {
    LogHandler(sender: any, args: LogArgs): void;
}