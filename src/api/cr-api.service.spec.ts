import { TestBed } from '@angular/core/testing';
import { CrApiService } from './cr-api.service';
import { users } from './fixtures';

describe('CrApiService', () => {
	let api: CrApiService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		api = TestBed.inject(CrApiService);
	});

	it('rejects approval attempts from a read-only viewer', async () => {
		await expect(api.approve(users.viewer, 'CR-1', new Date().toISOString())).rejects.toThrow('Forbidden');
	});

	it('does not change the status after an unauthorized approval', async () => {
		await expect(api.approve(users.viewer, 'CR-1', new Date().toISOString())).rejects.toThrow('Forbidden');

		const detail = await api.getChangeRequest(users.approver, 'CR-1');

		expect(detail.status).toBe('PENDING_APPROVAL');
	});

	it('prevents approving a change request that is no longer pending', async () => {
		await api.approve(users.approver, 'CR-1', new Date().toISOString());

		await expect(api.reject(users.approver, 'CR-1', new Date().toISOString(), 'Incorrect pricing')).rejects.toThrow(
			'Change request is not pending approval',
		);
	});
});
