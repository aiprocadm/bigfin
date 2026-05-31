import { ServiceError } from '@/modules/Items/ServiceError';
import { DeletePlannedOperationService } from './DeletePlannedOperation.service';
import { ERRORS } from '../constants';

describe('DeletePlannedOperationService', () => {
  it('throws when the operation does not exist', async () => {
    const operationModel = () => ({
      query: () => ({
        findById: () => Promise.resolve(undefined),
        deleteById: () => Promise.resolve(0),
      }),
    });
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new DeletePlannedOperationService(
      uow as any,
      operationModel as any,
    );

    await expect(service.delete(123)).rejects.toMatchObject({
      errorType: ERRORS.PLANNED_OPERATION_NOT_FOUND,
    });
  });
});
