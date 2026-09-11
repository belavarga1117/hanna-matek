// Explicit V1 sessions keep their published content, indexing and scoring.
// New sessions use V2; this router never rewrites stored attempt settings.
import * as v1 from './engine-v1.js';
import * as v2 from './engine-v2.js';
const forSettings = settings => Number(settings?.hannaVersion) === 1 ? v1 : v2;
export const normalizeHannaSettings = (settings = {}) => forSettings(settings).normalizeHannaSettings(settings);
export const generateHannaSession = (settings, seed, resources) => forSettings(settings).generateHannaSession(settings, seed, resources);
export const scoreHannaAttempt = (settings, seed, answer, context) => forSettings(settings).scoreHannaAttempt(settings, seed, answer, context);
export const describeHannaSettings = settings => forSettings(settings).describeHannaSettings(settings);
export const allowedHannaContentLevels = (activity, version = 2) => (Number(version) === 1 ? v1 : v2).allowedHannaContentLevels(activity);
export const normalizeHannaResource = (kind, data) => v2.normalizeHannaResource(kind, data);
export const evaluatePalaceReadiness = (resource, answer) => (Number(answer?.version) === 2 ? v2 : v1).evaluatePalaceReadiness(resource, answer);
export const nextHannaReview = options => v2.nextHannaReview(options);
export const createHannaLearnedSnapshot = (...args) => v2.createHannaLearnedSnapshot(...args);
export const buildHannaRandomTrials = (...args) => v2.buildHannaRandomTrials(...args);
export const createPalaceReadinessTrials = (...args) => v2.createPalaceReadinessTrials(...args);
export const hannaTrainingScope = settings => v2.hannaTrainingScope(settings);
export const hannaActivityCapabilities = activity => v2.hannaActivityCapabilities(activity);
export const bindHannaRecallSupport = (plan, encoding) => v2.bindHannaRecallSupport(plan, encoding);
