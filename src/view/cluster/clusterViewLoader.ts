/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WindowUtil } from '../../util/windowUtils';
import { ExtenisonID } from '../../util/constants';

export default class ClusterViewLoader {

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    static get extensionPath() {
        return vscode.extensions.getExtension(ExtenisonID).extensionPath
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    static async loadView(title: string): Promise<vscode.WebviewPanel> {
        const localResourceRoot = vscode.Uri.file(path.join(ClusterViewLoader.extensionPath, 'out', 'clusterViewer'));

        const panel = vscode.window.createWebviewPanel('clusterView', title, vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [localResourceRoot],
            retainContextWhenHidden: true
        });
        panel.iconPath = vscode.Uri.file(path.join(ClusterViewLoader.extensionPath, "images/context/cluster-node.png"));

        // TODO: When webview is going to be ready?
        panel.webview.html = ClusterViewLoader.getWebviewContent(ClusterViewLoader.extensionPath);
        panel.webview.postMessage({action: 'cluster', data: ''});
        panel.webview.onDidReceiveMessage(event => {
            if (event.action === 'run') {
                const terminal = WindowUtil.createTerminal('CRC');
                terminal.sendText(event.data, true);
                terminal.show();
                return;
            }
        })
        return panel;
    }

    private static getWebviewContent(extensionPath: string): string {
        // Local path to main script run in the webview
        const reactAppRootOnDisk = path.join(extensionPath, 'out', 'clusterViewer');
        const reactAppPathOnDisk = vscode.Uri.file(
            path.join(reactAppRootOnDisk, 'clusterViewer.js'),
        );
        const reactAppUri = reactAppPathOnDisk.with({ scheme: 'vscode-resource' });
        const htmlString:Buffer = fs.readFileSync(path.join(reactAppRootOnDisk, 'index.html'));
        const meta = `<meta http-equiv="Content-Security-Policy"
        content="connect-src *;
            default-src 'none';
            img-src https:;
            script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
            style-src vscode-resource: 'unsafe-inline';">`;
        return `${htmlString}`
            .replace('%COMMAND%', '')
            .replace('clusterViewer.js',`${reactAppUri}`)
            .replace('<!-- meta http-equiv="Content-Security-Policy" -->', meta);
    }
}