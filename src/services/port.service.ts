import { ConfigService } from "./config.service.js";
import { FileService } from "./file.service.js";
import type { GlobalState } from "../types.js";

export class PortService {
	static async getNextAvailablePort(projectId: string, basePort: number): Promise<number> {
		const state = await ConfigService.readGlobalState();
		const project = state.projects[projectId];
		
		if (!project) {
			return basePort;
		}

		const usedPorts = new Set(Object.values(project.portAssignments));
		let port = basePort;
		
		while (usedPorts.has(port) || await PortService.isPortInUse(port)) {
			port++;
		}

		return port;
	}

	static async assignPort(projectId: string, worktreePath: string, port: number): Promise<void> {
		const state = await ConfigService.readGlobalState();
		
		if (!state.projects[projectId]) {
			throw new Error(`Project ${projectId} not found in global state`);
		}

		state.projects[projectId].portAssignments[worktreePath] = port;
		await ConfigService.writeGlobalState(state);
	}

	static async releasePort(projectId: string, worktreePath: string): Promise<void> {
		const state = await ConfigService.readGlobalState();
		
		if (!state.projects[projectId]) {
			return;
		}

		delete state.projects[projectId].portAssignments[worktreePath];
		await ConfigService.writeGlobalState(state);
	}

	static async getAssignedPort(projectId: string, worktreePath: string): Promise<number | null> {
		const state = await ConfigService.readGlobalState();
		const project = state.projects[projectId];
		
		if (!project) {
			return null;
		}

		return project.portAssignments[worktreePath] || null;
	}

	static async getAllPortAssignments(projectId: string): Promise<Record<string, number>> {
		const state = await ConfigService.readGlobalState();
		const project = state.projects[projectId];
		
		if (!project) {
			return {};
		}

		return project.portAssignments;
	}

	private static async isPortInUse(port: number): Promise<boolean> {
		try {
			// Try to create a server on the port
			using server = Bun.serve({
				port,
				fetch() {
					return new Response("test");
				},
			});
			
			server.stop();
			return false;
		} catch {
			return true;
		}
	}

	static async initializeProjectPorts(projectId: string, basePath: string, basePort: number): Promise<void> {
		const state = await ConfigService.readGlobalState();
		
		if (!state.projects[projectId]) {
			state.projects[projectId] = {
				basePath,
				portAssignments: {},
			};
		}

		// Assign base port to the main worktree
		state.projects[projectId].portAssignments[basePath] = basePort;
		await ConfigService.writeGlobalState(state);
	}

	static async cleanupOrphanedPorts(projectId: string): Promise<void> {
		const state = await ConfigService.readGlobalState();
		const project = state.projects[projectId];
		
		if (!project) {
			return;
		}

		// Check if worktree paths still exist
		const validPaths: Record<string, number> = {};
		
		for (const [path, port] of Object.entries(project.portAssignments)) {
			const exists = await FileService.pathExists(path);
			if (exists) {
				validPaths[path] = port;
			}
		}

		if (state.projects[projectId]) {
			state.projects[projectId].portAssignments = validPaths;
			await ConfigService.writeGlobalState(state);
		}
	}
}