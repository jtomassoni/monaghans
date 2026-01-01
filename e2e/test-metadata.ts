/**
 * Test Metadata Type Definition
 * 
 * Each test spec file should export a metadata object with this structure.
 */

export type FeatureArea = 
  | 'content'
  | 'operations'
  | 'staff'
  | 'analytics'
  | 'administration'
  | 'ui-components'
  | 'auth';

export interface TestMetadata {
  /** The spec file name (without .spec.ts extension) */
  specName: string;
  /** Feature area this test belongs to */
  featureArea: FeatureArea;
  /** Human-readable description of what this test covers */
  description: string;
}

