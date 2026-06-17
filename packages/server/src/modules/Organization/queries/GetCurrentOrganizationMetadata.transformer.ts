import { Transformer } from '@/modules/Transformer/Transformer';

export class GetCurrentOrganizationMetadataTransformer extends Transformer {
  /**
   * Include these attributes in the metadata response.
   * @returns {string[]}
   */
  public includeAttributes = (): string[] => {
    return ['logoUri', 'interfaceMode'];
  };

  /**
   * Logo URI (presigned or public URL) for display.
   * Provided via options from the service after resolving logoKey.
   * @param metadata
   * @returns {string | null}
   */
  public logoUri = (metadata: Record<string, any>): string | null => {
    return this.options?.logoUri ?? null;
  };

  /**
   * Interface mode — normalizes empty/unknown value to 'business'.
   * Only 'accountant' stays accountant.
   * @param metadata
   * @returns {string}
   */
  public interfaceMode = (metadata: Record<string, any>): string => {
    return metadata?.interfaceMode === 'accountant' ? 'accountant' : 'business';
  };
}
