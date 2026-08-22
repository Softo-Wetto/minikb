export const publicRegistrationEnabled = false;

export const userCollectionRules = Object.freeze({
  listRule: '@request.auth.role = "admin"',
  viewRule: '@request.auth.id != ""',
  createRule: '@request.auth.role = "admin"',
  updateRule:
    '(@request.auth.id = id && @request.body.role:changed = false) || @request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
});
