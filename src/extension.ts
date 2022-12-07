// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TypesInstaller } from './typesInstaller';

// Points of interest
interface PackageJson {
	name: string;
	types?: string;
	dependencies?: { [key: string]: string };
	devDependencies?: { [key: string]: string };
}

async function shouldSquiggle(nodeModulePath: vscode.Uri, mainPackageJson: PackageJson, targetPackage: string) {
	// Check node_modules for installed dependencies
	const files = await vscode.workspace.findFiles(`node_modules/${targetPackage}/**`);
	return !files.length;
}

async function getDiagnostics(doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
	const text = doc.getText();
	const diagnostics = new Array<vscode.Diagnostic>();

	let packageJson: PackageJson;
	try {
		packageJson = JSON.parse(text);
	} catch(e) {
		return diagnostics;
	}

	// Split by lines, find "dependencies"
	const textArr: string[] = text.split(/\r\n|\n/);
	const indexOfFirstDep = textArr.findIndex((value: string) => new RegExp(`\s*"dependencies"`).test(value)) + 1;

	if(indexOfFirstDep !== -1) {
		let i = indexOfFirstDep;
		while (textArr.length > i && !/\s*}/.test(textArr[i])) {
			const arr = /\s*"(.*)"\s*:/.exec(textArr[i]);
			if(!arr) {
				i++;
				continue;
			}
			const key = arr[1];
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
			const nodeModulePath = vscode.Uri.joinPath(workspaceFolder!.uri, 'node_modules', key);

			const typesPackageName = `@types/${key}`;
			if (await shouldSquiggle(nodeModulePath, packageJson, key)) {
				const start = textArr[i].indexOf(key);
				const end = start + key.length;
				diagnostics.push({
					severity: vscode.DiagnosticSeverity.Information,
					message: `No property detected in "node_modules". You should install '${typesPackageName}'!`,
					code: 'no-node-module-detected',
					source: 'Quick types-dependencies installer',
					range: new vscode.Range(i, start, i, end)
				});
			}
			i++;
		}
	}

	return diagnostics;
}

export async function activate(context: vscode.ExtensionContext) {
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('types-installer');
	
	const handler = async (doc: vscode.TextDocument) => {
		// Look only at 'package.json'
		if(!doc.fileName.endsWith('package.json')) {
			return;
		}
	
		const diagnostics = await getDiagnostics(doc);
		diagnosticCollection.set(doc.uri, diagnostics);
	};
	
	const didOpen = vscode.workspace.onDidOpenTextDocument(doc => handler(doc));
	const didChange = vscode.workspace.onDidChangeTextDocument(e => handler(e.document));
	const codeActionProvider = vscode.languages.registerCodeActionsProvider('json', new TypesInstaller(context));
	
	if (vscode.window.activeTextEditor) {
		await handler(vscode.window.activeTextEditor.document);
	}
	
	// Push all to clean after extension is disabled
	context.subscriptions.push(
		diagnosticCollection,
		didOpen,
		didChange,
		codeActionProvider);
}

export function deactivate() {
	console.log("Extension is deactivated");
}
