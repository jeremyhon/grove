import type { CommandOptions } from "../types.js";

export async function deleteCommand(path: string, options: CommandOptions & { force?: boolean }): Promise<void> {
	console.log("Delete command not implemented yet");
	console.log("Path:", path);
	console.log("Options:", options);
}