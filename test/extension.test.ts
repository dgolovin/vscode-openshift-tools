/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { Cluster } from '../src/openshift/cluster';
import { Application } from '../src/openshift/application';
import { Catalog } from '../src/openshift/catalog';
import { Component } from '../src/openshift/component';
import { Project } from '../src/openshift/project';
import { Service } from '../src/openshift/service';
import { Storage } from '../src/openshift/storage';
import { Url } from '../src/openshift/url';
import packagejson = require('../package.json');
import path = require('path');
import { OdoImpl, ContextType } from '../src/odo';
import { TestItem } from './openshift/testOSItem';

const expect = chai.expect;
chai.use(sinonChai);

suite('openshift connector Extension', async () => {
    let sandbox: sinon.SinonSandbox;

    const clusterItem = new TestItem(null, 'cluster', ContextType.CLUSTER);
    const projectItem = new TestItem(clusterItem, 'myproject', ContextType.PROJECT);
    const appItem = new TestItem(projectItem, 'app1', ContextType.APPLICATION);

    const fixtureFolder = path.join(__dirname, '..', '..', 'test', 'fixtures').normalize();
    setup(async () => {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file(path.join(fixtureFolder, 'components', 'comp1')), index: 0, name: 'comp1'
        }, {
            uri: vscode.Uri.file(path.join(fixtureFolder, 'components', 'comp2')), index: 1, name: 'comp2'
        }]);
        const stub = sandbox.stub(Cluster, 'about');
        try {
            await vscode.commands.executeCommand('openshift.about');
        } catch (ignore) {
        } finally {
            stub.restore();
        }
        sandbox.stub(OdoImpl.prototype, 'getClusters').resolves([clusterItem]);
        sandbox.stub(OdoImpl.prototype, 'getProjects').resolves([projectItem]);
        sandbox.stub(OdoImpl.prototype, 'getApplications').resolves([appItem]);
        sandbox.stub(OdoImpl.prototype, 'getServices').resolves([]);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('redhat.vscode-openshift-connector'));
	});

    async function getStaticMethodsToStub(osc: string[]): Promise<string[]> {
        const mths: Set<string> = new Set();
        osc.forEach((name) => {
            name.replace('.palette', '');
            const segs: string[] = name.split('.');
            let methName: string = segs[segs.length-1];
            methName = methName === 'delete'? 'del' : methName;
            !mths.has(methName) && mths.add(methName);

        });
        return [...mths];
    }

    test('should activate extension', async () => {
        sandbox.stub(vscode.window, 'showErrorMessage');
        const cmds: string[] = await vscode.commands.getCommands();
        const osc: string[] = cmds.filter((item) => item.startsWith('openshift.'));
        const mths: string[] = await getStaticMethodsToStub(osc);
        (<any>[Application, Catalog, Cluster, Component, Project, Service, Storage, Url]).forEach(async (item) => {
            mths.forEach((name) => {
                if (item[name]) {
                    sandbox.stub(item, name).resolves();
                }
            });
        });
        osc.forEach((item) => vscode.commands.executeCommand(item));
        expect(vscode.window.showErrorMessage).has.not.been.called;
    });

    test('should load components from workspace folders', async () => {
        sandbox.stub(OdoImpl.prototype, 'execute').resolves({error: undefined, stdout: '', stderr: ''});
        const components = await OdoImpl.Instance.getApplicationChildren(appItem);
        expect(components.length).is.equals(2);
    });

    test('should register all extension commands declared commands in package descriptor', async () => {
        return await vscode.commands.getCommands(true).then((commands) => {
            packagejson.contributes.commands.forEach((value)=> {
                expect(commands.indexOf(value.command) > -1, `Command '${value.command}' handler is not registered during activation`).true;
            });
        });
    });

    test('async command wrapper shows message returned from command', async () => {
        sandbox.stub(Cluster, 'login').resolves('message');
        sandbox.stub(vscode.window, 'showErrorMessage');
        const simStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showInformationMessage');
        await vscode.commands.executeCommand('openshift.explorer.login');
        expect(simStub).calledWith('message');
    });

    test('async command wrapper shows error message from rejected command', async () => {
        sandbox.stub(Cluster, 'login').returns(Promise.reject('message'));
        const semStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showErrorMessage');
        sandbox.stub(vscode.window, 'showInformationMessage');
        await vscode.commands.executeCommand('openshift.explorer.login');
        expect(semStub).calledWith('message');
    });

    test('async command wrapper shows error.message from rejected command', async () => {
        sandbox.stub(Cluster, 'login').returns(Promise.reject(new Error('message')));
        const semStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showErrorMessage');
        sandbox.stub(vscode.window, 'showInformationMessage');
        await vscode.commands.executeCommand('openshift.explorer.login');
        expect(semStub).calledWith('message');
    });

    test('sync command wrapper shows message returned from command', async () => {
        sandbox.stub(Cluster, 'about');
        sandbox.stub(vscode.window, 'showErrorMessage');
        const simStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showInformationMessage');
        await vscode.commands.executeCommand('openshift.about');
        expect(simStub).not.called;
    });

    test('sync command wrapper shows message returned from command', async () => {
        const error = new Error('Message');
        sandbox.stub(Cluster, 'refresh').throws(error);
        const semStub: sinon.SinonStub = sandbox.stub(vscode.window, 'showErrorMessage');
        await vscode.commands.executeCommand('openshift.explorer.refresh');
        expect(semStub).calledWith(error);
    });
});
