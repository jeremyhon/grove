import type { CommandOptions } from "../types.js";

export async function mergeCommand(options: CommandOptions & { hooks?: boolean }): Promise<void> {
	console.log("Merge command not implemented yet");
	console.log("Options:", options);
}