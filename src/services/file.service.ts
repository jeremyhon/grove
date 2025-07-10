import { glob } from "glob";
import { join, dirname, basename } from "path";

export class FileService {
	static async copyFiles(patterns: string[], sourcePath: string, targetPath: string): Promise<void> {
		for (const pattern of patterns) {
			try {
				const files = await glob(pattern, { 
					cwd: sourcePath,
					dot: true,
					absolute: false,
				});

				for (const file of files) {
					const sourceFile = join(sourcePath, file);
					const targetFile = join(targetPath, file);
					
					await FileService.copyFile(sourceFile, targetFile);
				}
			} catch (error) {
				throw new Error(`Failed to copy files matching pattern "${pattern}": ${error}`);
			}
		}
	}

	private static async copyFile(source: string, target: string): Promise<void> {
		try {
			const sourceFile = Bun.file(source);
			const exists = await sourceFile.exists();
			
			if (!exists) {
				return;
			}

			// Create target directory if it doesn't exist
			const targetDir = dirname(target);
			await Bun.write(targetDir, "", { createPath: true });

			// Copy the file
			const content = await sourceFile.arrayBuffer();
			await Bun.write(target, content);
		} catch (error) {
			throw new Error(`Failed to copy file from ${source} to ${target}: ${error}`);
		}
	}

	static async copyDirectory(source: string, target: string): Promise<void> {
		try {
			const files = await glob("**/*", { 
				cwd: source,
				dot: true,
				absolute: false,
			});

			for (const file of files) {
				const sourceFile = join(source, file);
				const targetFile = join(target, file);
				
				const stat = await Bun.file(sourceFile).exists();
				if (stat) {
					await FileService.copyFile(sourceFile, targetFile);
				}
			}
		} catch (error) {
			throw new Error(`Failed to copy directory from ${source} to ${target}: ${error}`);
		}
	}

	static async pathExists(path: string): Promise<boolean> {
		try {
			return await Bun.file(path).exists();
		} catch {
			return false;
		}
	}

	static async isDirectory(path: string): Promise<boolean> {
		try {
			const file = Bun.file(path);
			// If it's a directory, reading it as a file should fail
			await file.text();
			return false;
		} catch {
			// If reading as file fails, it might be a directory
			return await FileService.pathExists(path);
		}
	}

	static async createDirectory(path: string): Promise<void> {
		try {
			await Bun.write(path, "", { createPath: true });
		} catch (error) {
			throw new Error(`Failed to create directory ${path}: ${error}`);
		}
	}

	static async deleteDirectory(path: string): Promise<void> {
		try {
			await Bun.$`rm -rf ${path}`.quiet();
		} catch (error) {
			throw new Error(`Failed to delete directory ${path}: ${error}`);
		}
	}

	static async getProjectName(path: string): Promise<string> {
		try {
			const packageJsonPath = join(path, "package.json");
			const packageJson = Bun.file(packageJsonPath);
			const exists = await packageJson.exists();
			
			if (exists) {
				const content = await packageJson.json();
				if (content.name) {
					return content.name;
				}
			}
		} catch {
			// Fall back to directory name
		}

		return basename(path);
	}

	static async findProjectRoot(startPath: string = process.cwd()): Promise<string | null> {
		let currentPath = startPath;
		
		while (currentPath !== "/") {
			const gitPath = join(currentPath, ".git");
			const packageJsonPath = join(currentPath, "package.json");
			
			const gitExists = await FileService.pathExists(gitPath);
			const packageExists = await FileService.pathExists(packageJsonPath);
			
			if (gitExists || packageExists) {
				return currentPath;
			}
			
			currentPath = dirname(currentPath);
		}
		
		return null;
	}
}