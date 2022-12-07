import * as vscode from 'vscode';

export class TypesInstaller implements vscode.CodeActionProvider {
    constructor(context: vscode.ExtensionContext) {
        const command = vscode.commands.registerCommand('types-installer.installTypesModule', async (range: vscode.Range) => {
            vscode.window.activeTextEditor?.document.save();
            const text = vscode.window.activeTextEditor?.document.getText(range);
    
            vscode.tasks.executeTask(
                new vscode.Task({ type: 'typesinstaller' },
                    vscode.TaskScope.Workspace,
                    'TypesInstaller',
                    'Types Installer',
                    new vscode.ShellExecution(`npm install --save-dev @types/${text}`),
                    'npm'));
        });
        context.subscriptions.push(command);
    }

    // Runs everytime the doc changes
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        // Create a code action command for each diagnostic without node module
        return context.diagnostics
            .filter(diagnostic => diagnostic.code === 'no-node-module-detected')
            .map(diagnostic => this.createCommandCodeAction(diagnostic));
    }

    private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const text = vscode.window.activeTextEditor?.document.getText(diagnostic.range);
        const action = new vscode.CodeAction(`Install @types/${text} module...`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [ diagnostic ];
        action.isPreferred = true;
        action.command = {
            command: 'types-installer.installTypesModule',
            title: 'Types Installer: Code Action',
            arguments: [ diagnostic.range ] 
        };
        return action;
    }
}
