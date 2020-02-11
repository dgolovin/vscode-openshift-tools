/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */

import * as path from 'path';
import { runTests } from 'vscode-test';

async function main(): Promise<void> {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, '../../out/test/unit/');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath, extensionTestsPath
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
