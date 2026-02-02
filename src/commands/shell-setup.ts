import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { FileService } from "../services/file.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";

const SHELL_SCRIPT_CONTENT = `# Grove Shell Integration
# This script provides automatic directory changing for grove commands

grove() {
  if [ "$1" = "setup" ] || [ "$1" = "s" ] || [ "$1" = "checkout" ] || [ "$1" = "c" ] || [ "$1" = "delete" ] || [ "$1" = "d" ]; then
    if [ "$1" = "delete" ] || [ "$1" = "d" ]; then
      local force=false
      for arg in "$@"; do
        if [ "$arg" = "-f" ] || [ "$arg" = "--force" ]; then
          force=true
          break
        fi
      done
      if [ "$force" != "true" ]; then
        command grove "$@"
        return $?
      fi
    fi
    local output=$(command grove "$@")
    local exit_code=$?
    if [ $exit_code -eq 0 ] && [ -d "$output" ]; then
      echo "$output"
      cd "$output"
    else
      echo "$output"
      return $exit_code
    fi
  else
    command grove "$@"
  fi
}

# Tab completion for grove commands
if type compdef >/dev/null 2>&1; then
  # zsh completion
  _grove() {
    local -a commands
    commands=(
      'init:Initialize Grove configuration for a git project'
      'i:Alias for init'
      'setup:Create a new worktree for feature development'
      's:Alias for setup'
      'checkout:Switch to a worktree by path or branch name'
      'c:Alias for checkout'
      'list:List all worktrees with information'
      'l:Alias for list'
      'delete:Delete a worktree'
      'd:Alias for delete'
      'prune:Delete merged worktrees and their local branches'
      'p:Alias for prune'
      'shell-setup:Generate shell integration script'
      'ss:Alias for shell-setup'
      'migrate-workmux:Migrate workmux YAML to Grove JSON'
      'mw:Alias for migrate-workmux'
    )

    if (( CURRENT == 2 )); then
      _describe 'commands' commands
      return
    fi

    case $words[2] in
      setup|s)
        local -a branches
        branches=(\${(f)"$(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin 2>/dev/null | sed 's#^origin/##' | sed '/^HEAD$/d' | sort -u)"})
        compadd -- $branches
        return
        ;;
      checkout|c|delete|d)
        local -a targets
        targets=(\${(f)"$(grove list --json 2>/dev/null | sed -n 's/.*\"path\": \"\\(.*\\)\",/\\1/p; s/.*\"branch\": \"\\(.*\\)\",/\\1/p')"})
        compadd -- $targets
        return
        ;;
    esac
  }
  compdef _grove grove
elif type complete >/dev/null 2>&1; then
  # bash completion
  _grove_bash() {
    local cur
    cur="\${COMP_WORDS[COMP_CWORD]}"
    local commands="init i setup s checkout c list l delete d prune p shell-setup ss migrate-workmux mw"

    if [ $COMP_CWORD -eq 1 ]; then
      COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
      return
    fi

    case "\${COMP_WORDS[1]}" in
      setup|s)
        local branches
        branches=$(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin 2>/dev/null | sed 's#^origin/##' | sed '/^HEAD$/d' | sort -u)
        COMPREPLY=( $(compgen -W "$branches" -- "$cur") )
        return
        ;;
      checkout|c|delete|d)
        local targets
        targets=$(grove list --json 2>/dev/null | sed -n 's/.*\"path\": \"\\(.*\\)\",/\\1/p; s/.*\"branch\": \"\\(.*\\)\",/\\1/p')
        COMPREPLY=( $(compgen -W "$targets" -- "$cur") )
        return
        ;;
    esac
  }
  complete -F _grove_bash grove
fi
`;

const SHELL_SOURCE_LINE = '[[ -s "$HOME/.grove/grove.sh" ]] && source "$HOME/.grove/grove.sh"';

export async function shellSetupCommand(options: CommandOptions): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	
	try {
		const groveDir = `${homedir()}/.grove`;
		const scriptPath = `${groveDir}/grove.sh`;
		
		// Detect shell from environment
		const shell = process.env.SHELL || '';
		let shellRcFile: string;
		
		if (shell.includes('zsh')) {
			shellRcFile = '.zshrc';
		} else if (shell.includes('bash')) {
			shellRcFile = '.bashrc';
		} else {
			// Fallback: check which rc file exists
			const zshrcPath = `${homedir()}/.zshrc`;
			const bashrcPath = `${homedir()}/.bashrc`;
			
			if (await FileService.pathExists(zshrcPath)) {
				shellRcFile = '.zshrc';
			} else if (await FileService.pathExists(bashrcPath)) {
				shellRcFile = '.bashrc';
			} else {
				shellRcFile = '.zshrc'; // Default to zsh
			}
		}
		
		const shellRcPath = `${homedir()}/${shellRcFile}`;

		// Ensure ~/.grove directory exists
		await mkdir(groveDir, { recursive: true });

		// Write the shell integration script
		await Bun.write(scriptPath, SHELL_SCRIPT_CONTENT);

		log.verbose(`Created shell integration script at: ${scriptPath}`);
		log.verbose(`Detected shell: ${shell || 'unknown'}, using ${shellRcFile}`);

		// Check if shell rc file exists and add source line if not already present
		if (await FileService.pathExists(shellRcPath)) {
			const shellRcContent = await Bun.file(shellRcPath).text();
			
			if (!shellRcContent.includes('source "$HOME/.grove/grove.sh"')) {
				// Add the source line to shell rc file
				const updatedContent = shellRcContent + '\n\n# Grove shell integration\n' + SHELL_SOURCE_LINE + '\n';
				await Bun.write(shellRcPath, updatedContent);
				
				log.verbose(`Added Grove source line to ${shellRcPath}`);
				log.verbose("Shell integration installed!");
				log.verbose(`Reload your shell or run: source ~/${shellRcFile}`);
			} else {
				log.verbose(`Shell integration already installed in ~/${shellRcFile}`);
			}
		} else {
			log.stdout("Shell integration script created!");
			log.stdout(`\nAdd this line to your ~/${shellRcFile}:`);
			log.stdout(SHELL_SOURCE_LINE);
			log.stdout(`\nThen reload your shell or run: source ~/${shellRcFile}`);
		}
	} catch (error) {
		log.verbose(`Failed to create shell integration: ${error}`);
		throw error;
	}
}
