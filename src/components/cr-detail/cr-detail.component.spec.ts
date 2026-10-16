import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
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
});
