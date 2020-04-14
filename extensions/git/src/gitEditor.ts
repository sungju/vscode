/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import { workspace, window, Uri, Position, Selection } from 'vscode';

import { IIPCHandler, IIPCServer } from './ipc/ipcServer';
import { IDisposable } from './util';

export interface GitEditorEnvironment {
	GIT_EDITOR: string;
	ELECTRON_RUN_AS_NODE?: string;
	VSCODE_GIT_EDITOR_NODE?: string;
	VSCODE_GIT_EDITOR_MAIN?: string;
}

interface GitEditorRequest {
	commitMessagePath?: string;
}

export class GitEditor implements IIPCHandler {
	private disposable: IDisposable;

	static getDisabledEnv(): GitEditorEnvironment {
		const fileType = process.platform === 'win32' ? 'bat' : 'sh';
		const gitEditor = path.join(__dirname, `scripts/git-editor-empty.${fileType}`);

		return {
			GIT_EDITOR: `'${gitEditor}'`,
		};
	}

	constructor(ipc: IIPCServer) {
		this.disposable = ipc.registerHandler('git-editor', this);
	}

	async handle({ commitMessagePath }: GitEditorRequest): Promise<any> {
		if (commitMessagePath) {
			const file = Uri.file(commitMessagePath);
			const doc = await workspace.openTextDocument(file);
			const editor = await window.showTextDocument(doc);

			// We don't want to remember the cursor position.
			// One should be able to start writing the message immediately.
			const position = new Position(0, 0);
			editor.selection = new Selection(position, position);

			return new Promise((c, e) => {
				const onDidChange = window.onDidChangeVisibleTextEditors((editors) => {
					if (editors.indexOf(editor) < 0) {
						onDidChange.dispose();
						return c(true);
					}
				});
			});
		}
	}

	dispose(): void {
		this.disposable.dispose();
	}

	getEnv(): GitEditorEnvironment {
		const fileType = process.platform === 'win32' ? 'bat' : 'sh';
		const gitEditor = path.join(__dirname, `scripts/git-editor.${fileType}`);

		return {
			GIT_EDITOR: `'${gitEditor}'`,
			ELECTRON_RUN_AS_NODE: '1',
			VSCODE_GIT_EDITOR_NODE: process.execPath,
			VSCODE_GIT_EDITOR_MAIN: path.join(__dirname, 'git-editor-main.js')
		};
	}
}
