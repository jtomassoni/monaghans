import { HelpDoc, loadAllHelpDocs, findHelpDocsByFeature } from './help-content-loader';
import { FeatureKey } from './help-keywords';
import { getFeatureRegistry } from './feature-registry';
import { routeToFeatureKey } from './feature-extractor';

/**
 * Validation error types
 */
export enum ValidationErrorType {
  MISSING_DOC = 'missing_doc',
  OUTDATED_DOC = 'outdated_doc',
  BROKEN_REFERENCE = 'broken_reference',
  INVALID_ROUTE = 'invalid_route',
  INVALID_FEATURE = 'invalid_feature',
}

/**
 * Validation error
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  route?: string;
  feature?: FeatureKey;
  doc?: HelpDoc;
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationError[];
  passed: boolean;
  coverage: {
    totalRoutes: number;
    documentedRoutes: number;
    coveragePercent: number;
  };
}

/**
 * Validate help documentation coverage
 */
export function validateCoverage(): ValidationError[] {
  const errors: ValidationError[] = [];
  const registry = getFeatureRegistry();
  const allDocs = loadAllHelpDocs();
  const routesNeedingDocs = registry.getRoutesNeedingDocs();

  // Create a map of documented routes
  const documentedRoutes = new Set<string>();
  for (const doc of allDocs) {
    if (doc.metadata.route) {
      documentedRoutes.add(doc.metadata.route);
    }
  }

  // Check each route that needs documentation
  for (const route of routesNeedingDocs) {
    const featureKey = routeToFeatureKey(route);
    
    // Check if there's a doc for this route or feature
    const hasRouteDoc = documentedRoutes.has(route);
    const hasFeatureDoc = featureKey
      ? findHelpDocsByFeature(featureKey as FeatureKey).length > 0
      : false;

    if (!hasRouteDoc && !hasFeatureDoc) {
      errors.push({
        type: ValidationErrorType.MISSING_DOC,
        message: `Missing help documentation for route: ${route}`,
        route: route,
        feature: (featureKey as FeatureKey) || undefined,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate help documentation accuracy
 */
export function validateAccuracy(): ValidationError[] {
  const errors: ValidationError[] = [];
  const registry = getFeatureRegistry();
  const allDocs = loadAllHelpDocs();

  for (const doc of allDocs) {
    // Check if route exists
    if (doc.metadata.route) {
      if (!registry.routeExists(doc.metadata.route)) {
        errors.push({
          type: ValidationErrorType.INVALID_ROUTE,
          message: `Help doc "${doc.metadata.title}" references non-existent route: ${doc.metadata.route}`,
          route: doc.metadata.route,
          feature: doc.metadata.feature,
          doc: doc,
          severity: 'error',
        });
      }
    }

    // Check if feature key is valid
    const validFeatures: FeatureKey[] = ['events', 'menu', 'specials', 'announcements', 'homepage', 'signage', 'settings'];
    const docFeature = doc.metadata.feature as FeatureKey;
    if (!validFeatures.includes(docFeature)) {
      errors.push({
        type: ValidationErrorType.INVALID_FEATURE,
        message: `Help doc "${doc.metadata.title}" has invalid feature key: ${doc.metadata.feature}`,
        feature: docFeature,
        doc: doc,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate help documentation freshness
 * Checks if docs are updated within a reasonable time of feature changes
 */
export function validateFreshness(maxDaysOld: number = 90): ValidationError[] {
  const warnings: ValidationError[] = [];
  const registry = getFeatureRegistry();
  const allDocs = loadAllHelpDocs();
  const now = new Date();
  const maxAge = maxDaysOld * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  for (const doc of allDocs) {
    if (!doc.metadata.lastUpdated) {
      warnings.push({
        type: ValidationErrorType.OUTDATED_DOC,
        message: `Help doc "${doc.metadata.title}" has no lastUpdated date`,
        feature: doc.metadata.feature,
        doc: doc,
        severity: 'warning',
      });
      continue;
    }

    const lastUpdated = new Date(doc.metadata.lastUpdated);
    const age = now.getTime() - lastUpdated.getTime();

    if (age > maxAge) {
      warnings.push({
        type: ValidationErrorType.OUTDATED_DOC,
        message: `Help doc "${doc.metadata.title}" is older than ${maxDaysOld} days (last updated: ${doc.metadata.lastUpdated})`,
        feature: doc.metadata.feature,
        doc: doc,
        severity: 'warning',
      });
    }

    // Check if feature was modified more recently than doc
    if (doc.metadata.route) {
      const feature = registry.getFeatureByRoute(doc.metadata.route);
      if (feature?.lastModified && feature.lastModified > lastUpdated) {
        warnings.push({
          type: ValidationErrorType.OUTDATED_DOC,
          message: `Help doc "${doc.metadata.title}" may be outdated - feature was modified after doc was last updated`,
          route: doc.metadata.route,
          feature: doc.metadata.feature,
          doc: doc,
          severity: 'warning',
        });
      }
    }
  }

  return warnings;
}

/**
 * Run all validation checks
 */
export function validateHelpDocs(options: {
  checkCoverage?: boolean;
  checkAccuracy?: boolean;
  checkFreshness?: boolean;
  maxDaysOld?: number;
} = {}): ValidationResult {
  const {
    checkCoverage = true,
    checkAccuracy = true,
    checkFreshness = false, // Warnings only, not errors
    maxDaysOld = 90,
  } = options;

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Coverage validation (errors)
  if (checkCoverage) {
    errors.push(...validateCoverage());
  }

  // Accuracy validation (errors)
  if (checkAccuracy) {
    errors.push(...validateAccuracy());
  }

  // Freshness validation (warnings)
  if (checkFreshness) {
    warnings.push(...validateFreshness(maxDaysOld));
  }

  // Calculate coverage
  const registry = getFeatureRegistry();
  const routesNeedingDocs = registry.getRoutesNeedingDocs();
  const allDocs = loadAllHelpDocs();
  const documentedRoutes = new Set<string>();
  for (const doc of allDocs) {
    if (doc.metadata.route) {
      documentedRoutes.add(doc.metadata.route);
    }
  }

    // Count routes with docs (either direct route match or feature match)
    let documentedCount = 0;
    for (const route of routesNeedingDocs) {
      const featureKey = routeToFeatureKey(route);
      const hasRouteDoc = documentedRoutes.has(route);
      const hasFeatureDoc = featureKey ? findHelpDocsByFeature(featureKey as FeatureKey).length > 0 : false;
      if (hasRouteDoc || hasFeatureDoc) {
        documentedCount++;
      }
    }

  const coverage = {
    totalRoutes: routesNeedingDocs.length,
    documentedRoutes: documentedCount,
    coveragePercent: routesNeedingDocs.length > 0
      ? Math.round((documentedCount / routesNeedingDocs.length) * 100)
      : 100,
  };

  return {
    errors,
    warnings,
    passed: errors.length === 0,
    coverage,
  };
}

