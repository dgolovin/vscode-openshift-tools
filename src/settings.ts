import * as path from 'path';
import { Platform } from './platform';

export const ROOT:string = path.join(Platform.getUserHomePath(), '.vs-openshift');
