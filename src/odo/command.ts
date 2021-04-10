/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { Platform } from '../util/platform';

function verbose(_target: any, key: string, descriptor: any): void {
    let fnKey: string | undefined;
    let fn: Function | undefined;

    if (typeof descriptor.value === 'function') {
        fnKey = 'value';
        fn = descriptor.value;
    } else {
        throw new Error('not supported');
    }

    descriptor[fnKey] = function(...args: any[]): any {
        const v = workspace.getConfiguration('openshiftConnector').get('outputVerbosityLevel');
        const command = fn.apply(this, args);
        return v > 0 ? command.addOption('-v', v): command;
    };
}

const QUOTE = Platform.OS === 'win32' ? '"' : '\'';

export class CommandOption {
    protected privacy = false;
    constructor(public readonly name: string, public readonly value?: string, public readonly redacted = true, public readonly quoted = false) {
    }

    toString(): string {
        if (this.privacy) {
            return this.toPrivateString();
        }
        return `${this.name}${this.value ? ` ${this.quote}${this.value}${this.quote}` : '' }`;
    }

    toPrivateString(): string {
        return `${this.name}${this.value && this.redacted? ' REDACTED' : '' }`
    }

    privacyMode(set: boolean): void {
        this.privacy = set;
    }

    get quote(): string {
        return this.quoted? QUOTE : '';
    }
}

export class CommandText {
    private privacy = false;
    constructor(public readonly command: string, public readonly parameter?: string, public readonly options: CommandOption[] = []) {
    }

    toString(): string {
        return `${this.command}${this.parameter? ` ${this.privacy? 'REDACTED' : this.parameter}`: ''}${this.options? ` ${this.options.join(' ')}`: ''}`;
    }

    privacyMode(set: boolean): CommandText {
        this.privacy = set;
        this.options.forEach(element => element.privacyMode(true));
        return this;
    }

    addOption(option: CommandOption): CommandText {
       this.options.push(option);
       return this;
    }
}

export class Command {

    static viewEnv(): CommandText {
        return new CommandText(
            'odo env view',
            undefined, [
                new CommandOption('-o', 'json', false)
            ]
        );
    }

    static printCatalogComponentImageStreamRefJson(name: string, namespace: string): CommandText {
        return new CommandText(
            'oc get imagestream',
            name, [
                new CommandOption('-n', namespace),
                new CommandOption('-o', 'json', false)
            ]
        );
    }

    static listProjects(): CommandText {
        return new CommandText('odo project list -o json');
    }

    @verbose
    static listApplications(project: string): CommandText {
        return new CommandText(
            'odo application list',
            undefined, [
                new CommandOption('--project', project),
                new CommandOption('-o', 'json')
            ]
        );
    }

    static deleteProject(name: string): CommandText {
        return new CommandText(
            'odo project delete',
            name, [
                new CommandOption('-w'),
                new CommandOption('-o', 'json', false)
            ]
        );
    }

    @verbose
    static createProject(name: string): CommandText {
        return new CommandText('odo project create',
            name, [
                new CommandOption('-w')
            ]
        );
    }

    static listComponents(project: string, app: string): CommandText {
        return new CommandText('odo list',
            undefined, [
                new CommandOption('--app', app),
                new CommandOption('--project', project),
                new CommandOption('-o', 'json', false)
            ]
        );
    }

    static listRegistries(): CommandText {
        return new CommandText('odo registry list -o json');
    }

    static listCatalogComponents(): CommandText {
        return new CommandText('odo catalog list components');
    }

    static listCatalogComponentsJson(): CommandText {
        return new CommandText(`${Command.listCatalogComponents()} -o json`);
    }

    static listCatalogServices(): CommandText {
        return new CommandText('odo catalog list services');
    }

    static listCatalogServicesJson(): CommandText {
        return new CommandText(`${Command.listCatalogServices()} -o json`);
    }

    static listStorageNames(): CommandText {
        return new CommandText('odo storage list -o json');
    }

    static printOcVersion(): CommandText {
        return new CommandText('oc version');
    }

    static listServiceInstances(project: string, app: string): CommandText {
        return new CommandText('odo service list',
            undefined, [
                new CommandOption('-o', 'json', false),
                new CommandOption('--project', project),
                new CommandOption('--app', app)
            ]
        );
    }

    static describeApplication(project: string, app: string): CommandText {
        return new CommandText('odo app describe',
            app, [
                new CommandOption('--project', project)
            ]
        );
    }

    static deleteApplication(project: string, app: string): CommandText {
        return new CommandText ('odo app delete',
            app, [
                new CommandOption('--project', project),
                new CommandOption('-f')
            ]
        );
    }

    static printOdoVersion(): CommandText {
        return new CommandText('odo version');
    }

    static odoLogout(): CommandText {
        return new CommandText('odo logout');
    }

    static setOpenshiftContext(context: string): CommandText {
        return new CommandText('oc config use-context',
            context
        );
    }

    static odoLoginWithUsernamePassword(
        clusterURL: string,
        username: string,
        passwd: string,
    ): CommandText {
        return new CommandText('odo login',
            clusterURL, [
                new CommandOption('-u', username, true, true),
                new CommandOption('-p', passwd, true, true),
                new CommandOption('--insecure-skip-tls-verify')
            ]
        );
    }

    static odoLoginWithToken(clusterURL: string, ocToken: string): CommandText {
        return new CommandText('odo login',
            clusterURL, [
                new CommandOption('--token',ocToken),
                new CommandOption('--insecure-skip-tls-verify')
            ]
        );
    }

    @verbose
    static createStorage(storageName: string, mountPath: string, storageSize: string): CommandText {
        return new CommandText('odo storage create',
            storageName, [
                new CommandOption('--path', mountPath),
                new CommandOption('--size', storageSize)
            ]
        );
    }

    static deleteStorage(storage: string): CommandText {
        return new CommandText('odo storage delete',
            storage, [
                new CommandOption('-f')
            ]
        );
    }

    static describeStorage(storage: string): CommandText {
        return new CommandText('odo storage describe', storage);
    }

    static waitForStorageToBeGone(project: string, app: string, storage: string): CommandText {
        return new CommandText('oc wait',
            `pvc/${storage}-${app}-pvc`, [
                new CommandOption('--for=delete'),
                new CommandOption('--namespace', project)
            ]
        );
    }

    static undeployComponent(project: string, app: string, component: string): CommandText {
        return new CommandText('odo delete',
            component, [
                new CommandOption('-f'),
                new CommandOption('--app', app),
                new CommandOption('--project', project)
            ]
        );
    }

    static deleteComponent(project: string, app: string, component: string, s2i = false): CommandText {
        const ct = new CommandText('odo delete',
            component, [
                new CommandOption('-f'),
                new CommandOption('--app', app),
                new CommandOption('--project',project),
                new CommandOption('--all')
            ]
        );
        if (s2i) {
            ct.addOption(new CommandOption('--s2i'));
        }
        return ct;
    }

    static describeComponentNoContext(project: string, app: string, component: string): CommandText {
        return new CommandText('odo describe',
            component, [
                new CommandOption('--app', app),
                new CommandOption('--project', project)
            ]
        );
    }

    static describeComponentNoContextJson(project: string, app: string, component: string): CommandText {
        return this.describeComponentNoContext(project, app, component)
            .addOption(new CommandOption('-o', 'json'));
    }

    static describeComponent(): CommandText {
        return new CommandText('odo describe');
    }

    static describeComponentJson(): CommandText {
        return Command.describeComponent().addOption(new CommandOption('-o', 'json'));
    }

    static describeService(service: string): CommandText {
        return new CommandText('odo catalog describe service', service);

    }

    static describeCatalogComponent(component: string): CommandText {
        return new CommandText('odo catalog describe component',
            component, [
                new CommandOption('-o', 'json')
            ]
        );
    }

    static describeUrl(url: string): CommandText {
        return new CommandText('odo url describe', url);
    }

    static showLog(): CommandText {
        return new CommandText('odo log');
    }

    static showLogAndFollow(): CommandText {
        return Command.showLog().addOption(new CommandOption('-f'));
    }

    static listComponentPorts(project: string, app: string, component: string): CommandText {
        return new CommandText('oc get service',
            `${component}-${app}`, [
                new CommandOption('--namespace', project),
                new CommandOption('-o', 'jsonpath="{range .spec.ports[*]}{.port}{\',\'}{end}"')
            ]
        );
    }

    static linkComponentTo(
        project: string,
        app: string,
        component: string,
        componentToLink: string,
        port?: string,
    ): CommandText {
        const cTxt = new CommandText('odo link', componentToLink);
        cTxt.addOption(new CommandOption('--project',project))
            .addOption(new CommandOption('--app',app))
            .addOption(new CommandOption('--component', component))
            .addOption(new CommandOption('--wait'));
        if (port) {
            cTxt.addOption(new CommandOption('--port', port));
        }
        return cTxt;
    }

    static linkServiceTo(
        project: string,
        app: string,
        component: string,
        serviceToLink: string,
    ): CommandText {
        return new CommandText('odo link',
            serviceToLink, [
                new CommandOption('--project', project),
                new CommandOption('--app', app),
                new CommandOption('--component', component),
                new CommandOption('--wait'),
                new CommandOption('--wait-for-target')
            ]
        );
    }

    @verbose
    static pushComponent(configOnly = false, debug = false): CommandText {
        const cTxt = new CommandText('odo push');
        if (debug) {
            cTxt.addOption(new CommandOption('--debug'));
        }
        if (configOnly) {
            cTxt.addOption(new CommandOption('--config'));
        }
        return cTxt;
    }

    @verbose
    static watchComponent(): CommandText {
        return new CommandText('odo watch');
    }

    @verbose
    static createLocalComponent(
        project: string,
        app: string,
        type = '', // will use empty string in case of undefined type passed in
        version: string,
        name: string,
        folder: string,
        starter: string = undefined,
        useExistingDevfile = false
    ): CommandText {
        const cTxt = new CommandText('odo create', `${type}${version?':':''}${version?version:''} ${name}`);
        if (version) {
            cTxt.addOption(new CommandOption('--s2i'));
        }
        cTxt.addOption(new CommandOption('--context', folder))
            .addOption(new CommandOption('--app', app))
            .addOption(new CommandOption('--project', project));
        if (starter) {
            cTxt.addOption(new CommandOption('--starter', starter, false));
        }
        if (useExistingDevfile) {
            cTxt.addOption(new CommandOption('--devfile', 'devfile.yaml'));
        }
        return cTxt;
    }

    @verbose
    static createGitComponent(
        project: string,
        app: string,
        type: string,
        version: string,
        name: string,
        git: string,
        ref: string,
    ): CommandText {
        const cTxt = new CommandText('odo create', `${type}${version?':':''}${version?version:''} ${name}`);
        if (version) {
            cTxt.addOption(new CommandOption('--s2i'));
        }
        return cTxt.addOption(new CommandOption('--git', git))
            .addOption(new CommandOption('--ref', ref))
            .addOption(new CommandOption('--app', app))
            .addOption(new CommandOption('--project', project));
    }

    @verbose
    static createBinaryComponent(
        project: string,
        app: string,
        type: string,
        version: string,
        name: string,
        binary: string,
        context: string,
    ): CommandText {
        const cTxt = new CommandText('odo create', `${type}:${version} ${name}`);
        if (version) {
            cTxt.addOption(new CommandOption('--s2i'));
        }
        cTxt.addOption(new CommandOption('--binary', binary))
            .addOption(new CommandOption('--app', app))
            .addOption(new CommandOption('--project', project))
            .addOption(new CommandOption('--context',context));
        return cTxt;
    }

    static testComponent(): CommandText {
        return new CommandText('odo test --show-log');
    };

    @verbose
    static createService(
        project: string,
        app: string,
        template: string,
        plan: string,
        name: string,
    ): CommandText {
        return new CommandText('odo service create',
            `${template} ${name}`, [
                new CommandOption('--plan', plan),
                new CommandOption('--app', app),
                new CommandOption('--project', project),
                new CommandOption('-w')
            ]
        );
    }

    static deleteService(project: string, app: string, name: string): CommandText {
        return new CommandText('odo service delete',
            name, [
                new CommandOption('-f'),
                new CommandOption('--project', project),
                new CommandOption('--app', app)
            ]
        );
    }

    static getServiceTemplate(project: string, service: string): CommandText {
        return new CommandText('oc get ServiceInstance',
            service, [
                new CommandOption('--namespace', project),
                new CommandOption('-o', 'jsonpath="{$.metadata.labels.app\\.kubernetes\\.io/name}"')
            ]
        );
    }

    static waitForServiceToBeGone(project: string, service: string): CommandText {
        return new CommandText('oc wait',
            `ServiceInstance/${service}`, [
                new CommandOption('--for', 'delete'),
                new CommandOption('--namespace', project)
            ]
        );
    }

    @verbose
    static createComponentCustomUrl(name: string, port: string, secure = false): CommandText {
        const cTxt = new CommandText('odo url create',
            name, [
                new CommandOption('--port', port)
            ]
        );
        if (secure) {
            cTxt.addOption(new CommandOption('--secure'));
        }
        return cTxt;
    }

    static getComponentUrl(): CommandText {
        return new CommandText('odo url list -o json');
    }

    static deleteComponentUrl(name: string): CommandText {
        return new CommandText('odo url delete',
            name, [
                new CommandOption('-f'),
                new CommandOption('--now')
            ]
        );
    }

    static getComponentJson(): CommandText {
        return new CommandText('odo describe -o json');
    }

    static unlinkComponents(
        project: string,
        app: string,
        comp1: string,
        comp2: string,
        port: string,
    ): CommandText {
        return new CommandText('odo unlink',
            comp2, [
                new CommandOption('--project', project),
                new CommandOption('--app', app),
                new CommandOption('--port', port),
                new CommandOption('--component', comp1)
            ]
        );
    }

    static unlinkService(project: string, app: string, service: string, comp: string): CommandText {
        return new CommandText('odo unlink',
            service, [
                new CommandOption('--project', project),
                new CommandOption('--app', app),
                new CommandOption('--component', comp)
            ]
        );
    }

    static getclusterVersion(): CommandText {
        return new CommandText('oc get clusterversion -ojson');
    }

    static showServerUrl(): CommandText {
        return new CommandText('oc whoami --show-server');
    }

    static showConsoleUrl(): CommandText {
        return new CommandText('oc get configmaps console-public -n openshift-config-managed -o json');
    }
}
