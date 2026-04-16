/** Misconfiguration or external integration blocks the action (HTTP 422). */
export class IntegrationConfigError extends Error {
  readonly summary: string;

  constructor(summary: string, detail: string) {
    super(detail);
    this.name = 'IntegrationConfigError';
    this.summary = summary;
  }
}
