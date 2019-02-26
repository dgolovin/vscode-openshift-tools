/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { OpenShiftObject } from "../../src/odo";

export class TestItem implements OpenShiftObject {
    constructor(
        private parent: OpenShiftObject,
        private name,
        private children = []) {
    }

    getName(): string {
        return this.name;
    }

    getTreeItem() {
        return null;
    }

    getChildren() {
        return this.children;
    }

    getParent(): OpenShiftObject {
        return this.parent;
    }

    get label(): string {
        return this.name;
    }

    get id(): string {
        return this.name;
    }
}