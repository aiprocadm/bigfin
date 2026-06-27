import { ImportFileMapping } from './ImportFileMapping';
import { ServiceError } from '../Items/ServiceError';
import { ERRORS } from './_utils';

/**
 * Covers the two mapping validations that were previously left as TODOs:
 *  - required resource fields (incl. required nested/group fields) must be mapped;
 *  - date-format validation must also reach nested (group) date fields.
 */
describe('ImportFileMapping — required-field & nested-date validation', () => {
  /**
   * Build the service with a stubbed ResourceService whose field metadata is
   * supplied per-test.
   */
  const buildService = (resourceStub: Partial<{
    getResourceFields2: jest.Mock;
    getResourceImportableFields: jest.Mock;
  }>) => {
    const resource = {
      getResourceFields2: jest.fn(),
      getResourceImportableFields: jest.fn(),
      ...resourceStub,
    };
    const importModel = {} as any;
    return new ImportFileMapping(resource as any, importModel);
  };

  describe('validateRequiredFields', () => {
    const importFile = { resource: 'Account' };

    it('throws when a required top-level field is not mapped', () => {
      const service = buildService({
        getResourceFields2: jest.fn().mockReturnValue({
          name: { fieldType: 'text', required: true },
          note: { fieldType: 'text' },
        }),
      });

      expect(() =>
        (service as any).validateRequiredFields(importFile, [
          { from: 'A', to: 'note' },
        ]),
      ).toThrow(ServiceError);
      try {
        (service as any).validateRequiredFields(importFile, [
          { from: 'A', to: 'note' },
        ]);
      } catch (error) {
        expect(error.errorType).toBe(ERRORS.REQUIRED_FIELDS_NOT_MAPPED);
      }
    });

    it('passes when all required top-level fields are mapped', () => {
      const service = buildService({
        getResourceFields2: jest.fn().mockReturnValue({
          name: { fieldType: 'text', required: true },
          note: { fieldType: 'text' },
        }),
      });

      expect(() =>
        (service as any).validateRequiredFields(importFile, [
          { from: 'A', to: 'name' },
        ]),
      ).not.toThrow();
    });

    it('throws when a required nested (group) field is not mapped', () => {
      const service = buildService({
        getResourceFields2: jest.fn().mockReturnValue({
          entries: {
            fields: {
              quantity: { fieldType: 'number', required: true },
            },
          },
        }),
      });

      expect(() =>
        (service as any).validateRequiredFields(importFile, []),
      ).toThrow(ServiceError);
    });

    it('passes when the required nested (group) field is mapped via its group', () => {
      const service = buildService({
        getResourceFields2: jest.fn().mockReturnValue({
          entries: {
            fields: {
              quantity: { fieldType: 'number', required: true },
            },
          },
        }),
      });

      expect(() =>
        (service as any).validateRequiredFields(importFile, [
          { from: 'A', to: 'quantity', group: 'entries' },
        ]),
      ).not.toThrow();
    });
  });

  describe('validateDateFormatMapping', () => {
    it('throws on an invalid date format for a top-level date field', () => {
      const service = buildService({
        getResourceImportableFields: jest
          .fn()
          .mockReturnValue({ issuedAt: { fieldType: 'date' } }),
        getResourceFields2: jest.fn().mockReturnValue({}),
      });

      expect(() =>
        (service as any).validateDateFormatMapping('Account', [
          { from: 'A', to: 'issuedAt', dateFormat: 'NOT-A-FORMAT' },
        ]),
      ).toThrow(ServiceError);
    });

    it('throws on an invalid date format for a nested (group) date field', () => {
      const service = buildService({
        getResourceImportableFields: jest.fn().mockReturnValue({}),
        getResourceFields2: jest.fn().mockReturnValue({
          entries: { fields: { dueAt: { fieldType: 'date' } } },
        }),
      });

      expect(() =>
        (service as any).validateDateFormatMapping('Account', [
          { from: 'A', to: 'dueAt', group: 'entries', dateFormat: 'BAD' },
        ]),
      ).toThrow(ServiceError);
    });

    it('passes for a nested date field with a valid format', () => {
      const service = buildService({
        getResourceImportableFields: jest.fn().mockReturnValue({}),
        getResourceFields2: jest.fn().mockReturnValue({
          entries: { fields: { dueAt: { fieldType: 'date' } } },
        }),
      });

      expect(() =>
        (service as any).validateDateFormatMapping('Account', [
          { from: 'A', to: 'dueAt', group: 'entries', dateFormat: 'yyyy-MM-dd' },
        ]),
      ).not.toThrow();
    });
  });
});
