import * as childProcess from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as download from './download';
import * as fsex from 'fs-extra';
import { which } from 'shelljs';
import * as fs from 'fs';
import { File } from './file';
import * as Settings from './settings';
import * as opn from 'opn';
import hasha = require('hasha');

export interface CliExitData {
    readonly error: Error;
    readonly stdout: string;
    readonly stderr: string;
}

const toolsConfig = {
    odo: {
        description: "OpenShift Do CLI tool",
        vendor: "Red Hat, Inc.",
        name: "odo",
        version: "0.0.12",
        dlFileName: "odo",
        cmdFileName: "odo",
        filePrefix: "",
        platform: {
            win32: {
                url: "https://github.com/redhat-developer/odo/releases/download/v0.0.12/odo-windows-amd64.exe.gz",
                sha256sum: "4f7719ef1f11aac22474d36608996b016305c65afb6e9e3dcd4361c43fb54be1",
                dlFileName: "odo-windows-amd64.exe.gz",
                cmdFileName: "odo.exe"
            },
            darwin: {
                url: "https://github.com/redhat-developer/odo/releases/download/v0.0.12/odo-darwin-amd64.gz",
                sha256sum: "3b77cf5d2a79f7484617715271b9f3c8da4a6e85afdf63f075ad09062f007861",
                dlFileName: "odo-darwin-amd64.gz"
            },
            linux: {
                url: "https://github.com/redhat-developer/odo/releases/download/v0.0.12/odo-linux-amd64.gz",
                sha256sum: "848dae9a3ad109a6dc0f305c890dd1edba1c3b704e8e163285047d93d9f58062",
                dlFileName: "odo-linux-amd64.gz"
            }
        }
    },
    oc: {
        description: "OKD CLI client tool",
        vendor: "Red Hat, Inc.",
        name: "oc",
        cmdFileName: "oc",
        version: "0.0.10",
        filePrefix: "",
        platform: {
            win32: {
                url: "https://github.com/openshift/origin/releases/download/v3.10.0/openshift-origin-client-tools-v3.10.0-dd10d17-windows.zip",
                sha256sum: "",
                dlFileName: "oc.zip",
                cmdFileName: "oc.exe"
            },
            darwin: {
                url: "https://github.com/openshift/origin/releases/download/v3.10.0/openshift-origin-client-tools-v3.10.0-dd10d17-mac.zip",
                sha256sum: "",
                dlFileName: "oc.zip",
            },
            linux: {
                url: "https://github.com/openshift/origin/releases/download/v3.10.0/openshift-origin-client-tools-v3.10.0-dd10d17-linux-64bit.tar.gz",
                sha256sum: "",
                fileName: "oc.tar.gz",
                dlFileName: "oc.tar.gz",
                filePrefix: "openshift-origin-client-tools-v3.10.0-dd10d17-linux-64bit"
            }
        }
    }
};

export const tools = loadMetadata(toolsConfig, process.platform);

export class Cli implements ICli {
    async execute(cmd: string, opts: any = {}): Promise<CliExitData> {
        return new Promise<CliExitData>(async (resolve, reject) => {
            const cmdName = cmd.split(' ')[0];
            const odoLocation = await getToolLocation(cmdName);
            const finalCommand = cmd.replace(cmdName, odoLocation);
            odoChannel.print(finalCommand);
            childProcess.exec(finalCommand, opts, (error: Error, stdout: string, stderr: string) => {
                odoChannel.print(stdout);
                odoChannel.print(stderr);
                resolve({ error, stdout: stdout.replace(/---[\s\S]*---/g, '').trim(), stderr });
            });
        });
    }
}

export interface ICli {
    execute(cmd: string, opts: any): Promise<CliExitData>;
}

export function create() {
    return new Cli();
}

export interface OdoChannel {
    print(text: string);
}

export class OdoChannelImpl implements OdoChannel {
    private readonly channel: vscode.OutputChannel = vscode.window.createOutputChannel("OpenShift Do");
    print(text: string) {
        this.channel.append(text);
        if (text.charAt(text.length - 1) !== '\n') {
            this.channel.append('\n');
        }
        this.channel.show();
    }
}

export async function getToolLocation(cmd): Promise<string> {
    let toolLocation = path.resolve(Settings.ROOT, tools[cmd].cmdFileName);
    const toolDlLocation = path.resolve(Settings.ROOT, tools[cmd].dlFileName);
    const pathTool = which(cmd);
    if (pathTool === null) {
        try {
            fs.accessSync(toolLocation);
        } catch (error) {
            const response = await vscode.window.showInformationMessage(
                `Cannot find ${tools[cmd].description}.`, 'Download and install', 'Help', 'Cancel');
            if (response === 'Download and install') {
                await fsex.ensureDir(path.dirname(toolLocation));
                let action: string = "Continue";
                do {
                    await vscode.window.withProgress({
                        cancellable: true,
                        location: vscode.ProgressLocation.Notification,
                        title: `Downloading ${tools[cmd].description}: `
                    },
                        (progress: vscode.Progress<{ increment: number, message: string }>, token: vscode.CancellationToken) => {
                            return download.downloadFile(
                                tools[cmd].url,
                                toolDlLocation,
                                (dlProgress, increment) => progress.report({ increment, message: `${dlProgress}%` })
                            );
                        });
                    if (tools[cmd].sha256sum && tools[cmd].sha256sum !== "") {
                        const sha256sum: string = await hasha.fromFile(toolDlLocation, { algorithm: 'sha256' });
                        if (sha256sum !== tools[cmd].sha256sum) {
                            fsex.removeSync(toolDlLocation);
                            action = await vscode.window.showInformationMessage(`Checksum for downloaded ${tools[cmd].description} is not correct.`, 'Download again', 'Cancel');
                        }
                    } else {
                        action = 'Continue';
                    }
                } while (action === 'Download again');

                if (action === 'Continue') {
                    let destination: string = toolDlLocation.endsWith('.gz') ? toolLocation : path.resolve(Settings.ROOT);
                    await File.extract(toolDlLocation, destination, tools[cmd].filePrefix);
                    if (process.platform !== 'win32') {
                        fs.chmodSync(toolLocation, 0o765);
                    }
                }
            } else if (response === `Help`) {
                opn('https://github.com/redhat-developer/vscode-openshift-tools#dependencies');
            }
        }
    } else {
        toolLocation = cmd;
    }
    return toolLocation;
}

export function loadMetadata(requirements, platform) {
    const reqs = JSON.parse(JSON.stringify(requirements));
    for (const object in requirements) {
        if (reqs[object].platform) {
            if (reqs[object].platform[platform]) {
                Object.assign(reqs[object], reqs[object].platform[platform]);
                delete reqs[object].platform;
            } else {
                delete reqs[object];
            }
        }
    }
    return reqs;
}

export const odoChannel = new OdoChannelImpl();
