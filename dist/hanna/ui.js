import * as v1 from './ui-v1.js';
import * as v2 from './ui-v2.js';
export { createHannaHub, shuffleHannaChoices } from './ui-v2.js';
export { describeHannaSettings } from './engine.js';
export function createHannaSettings(options = {}) {
  return (Number(options.value?.hannaVersion) === 1 ? v1 : v2).createHannaSettings(options);
}
export function renderHannaResult(h, result = {}, options = {}) {
  return (Number(result.metrics?.schemaVersion) === 1 || Number(result.settings?.hannaVersion) === 1 ? v1 : v2).renderHannaResult(h, result, options);
}
export const hannaGames = Object.freeze({
  'hanna-method': Object.freeze({ mount: ctx => (Number(ctx.settings?.hannaVersion) === 1 ? v1 : v2).hannaGames['hanna-method'].mount(ctx) }),
});
