import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));


async function render(
	user: ReqUser,
	id: string
): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});

	await TestBed.compileComponents();

	const fixture = TestBed.createComponent(CrDetailComponent);

	fixture.componentRef.setInput('id', id);
	fixture.detectChanges();

	await flush();
	fixture.detectChanges();

	return fixture;
}


describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	// it('disables Approve for a read-only viewer on a pending CR', async () => {
	// 	const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
	// 	const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
	// 	expect(approveBtn.disabled).toBe(true);
	// });

	it('hides approval actions for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		const actions: HTMLElement | null = fixture.nativeElement.querySelector('.cr-actions');
		expect(actions).toBeNull();
	});

	it('does not reject a change request with an empty reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		component.rejectControl.setValue('');
		await component.reject();

		expect(component.detail?.status).toBe('PENDING_APPROVAL');
		expect(component.rejectControl.invalid).toBe(true);
	});

	it('does not reject a change request with a whitespace-only reason', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		component.rejectControl.setValue('   ');
		await component.reject();

		expect(component.detail?.status).toBe('PENDING_APPROVAL');
		expect(component.rejectControl.invalid).toBe(true);
	});

	it('rejects a change request when a valid reason is provided', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		component.rejectControl.setValue('Incorrect pricing');
		await component.reject();

		expect(component.detail?.status).toBe('REJECTED');
		expect(component.actionError).toBeUndefined();
	});

	it('displays an error when the rejection request fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		const api = TestBed.inject((await import('../../api/cr-api.service')).CrApiService);
		api.failNext = true;

		component.rejectControl.setValue('Incorrect pricing');
		await component.reject();

		expect(component.detail?.status).toBe('PENDING_APPROVAL');
		expect(component.actionError).toBe('Network error');

		const storedDetail = await api.getChangeRequest(
			users.approver,
			'CR-1'
		);

		expect(storedDetail.status).toBe('PENDING_APPROVAL');
	});


	it('approves a change request successfully', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		await component.approve();

		expect(component.detail?.status).toBe('APPROVED');
		expect(component.actionError).toBeUndefined();
	});

	it('displays an error when the approval request fails', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;
		const api = TestBed.inject(
			(await import('../../api/cr-api.service')).CrApiService
		);

		api.failNext = true;

		await component.approve();

		expect(component.detail?.status).toBe('PENDING_APPROVAL');
		expect(component.actionError).toBe('Network error');

		const storedDetail = await api.getChangeRequest(
			users.approver,
			'CR-1'
		);

		expect(storedDetail.status).toBe('PENDING_APPROVAL');
	});

	it('prevents duplicate approval submissions', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;
		const api = TestBed.inject(
			(await import('../../api/cr-api.service')).CrApiService
		);
		const approveSpy = jest.spyOn(api, 'approve');

		const firstRequest = component.approve();
		const secondRequest = component.approve();

		await Promise.all([firstRequest, secondRequest]);

		expect(approveSpy).toHaveBeenCalledTimes(1);
		expect(component.detail?.status).toBe('APPROVED');
	});


	it('displays timeline entries in chronological order', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const component = fixture.componentInstance;

		const detail = component.detail;

		if (!detail) {
			throw new Error('Change request detail was not loaded');
		}

		detail.audit.splice(
			0,
			detail.audit.length,
			{
				action: 'REJECTED',
				byUserId: 'user-2',
				at: '2026-01-02T10:00:00Z',
			},
			{
				action: 'SUBMITTED',
				byUserId: 'user-1',
				at: '2026-01-01T10:00:00Z',
			}
		);

		expect(component.timeline.map((entry) => entry.action)).toEqual([
			'SUBMITTED',
			'REJECTED',
		]);
	});

	it('shows a loading state while the detail is being fetched', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [
				{ provide: SessionService, useValue: { user: users.approver } },
			],
		});

		await TestBed.compileComponents();

		const api = TestBed.inject(
			(await import('../../api/cr-api.service')).CrApiService
		);
		api.latencyMs = 100;

		const fixture = TestBed.createComponent(CrDetailComponent);
		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-detail__loading')
		).not.toBeNull();

		await new Promise((resolve) => setTimeout(resolve, 150));
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-detail__header')
		).not.toBeNull();
	});


	it('shows an error state when loading the detail fails', async () => {
		TestBed.configureTestingModule({
			imports: [CrDetailComponent],
			providers: [
				{ provide: SessionService, useValue: { user: users.approver } },
			],
		});

		await TestBed.compileComponents();

		const fixture = TestBed.createComponent(CrDetailComponent);
		const api = TestBed.inject(
			(await import('../../api/cr-api.service')).CrApiService
		);

		api.failNext = true;

		fixture.componentRef.setInput('id', 'CR-1');
		fixture.detectChanges();

		await flush();
		fixture.detectChanges();

		expect(fixture.componentInstance.state.status).toBe('error');
		expect(
			fixture.nativeElement.querySelector('.cr-detail__error')
		).not.toBeNull();

		expect(
			fixture.nativeElement.querySelector('.cr-detail__error button')
		).not.toBeNull();
	});



	it('loads the selected change request when the ID changes', async () => {
		const fixture = await render(users.approver, 'CR-1');

		expect(fixture.componentInstance.detail?.id).toBe('CR-1');

		fixture.componentRef.setInput('id', 'CR-2');
		fixture.detectChanges();

		await new Promise((resolve) => setTimeout(resolve, 20));
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.id).toBe('CR-2');
		expect(
			fixture.nativeElement.querySelector('.cr-detail__header h2').textContent
		).toContain('Replace SKU-B supplier');
	});


});
