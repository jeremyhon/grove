import type { CommandOptions } from "../types.js";

export async function listCommand(options: CommandOptions & { json?: boolean }): Promise<void> {
	console.log("List command not implemented yet");
	console.log("Options:", options);
}