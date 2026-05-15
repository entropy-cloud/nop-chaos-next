export function shouldResetFluxState(currentSchemaPath: string, nextSchemaPath: string) {
  return currentSchemaPath !== nextSchemaPath;
}
