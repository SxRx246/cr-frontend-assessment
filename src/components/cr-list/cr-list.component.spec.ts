import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrListComponent } from './cr-list.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser): Promise<ComponentFixture<CrListComponent>> {
	TestBed.configureTestingModule({
		imports: [CrListComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrListComponent);
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded/empty state
	return fixture;
}

describe('CrListComponent', () => {
	it('renders a row per change request in the user org', async () => {
		const fixture = await render(users.approver);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3); // org-alpha: CR-1, CR-2, CR-3
	});

	it('shows the empty state when the org has no change requests', async () => {
		const fixture = await render({ id: 'x', orgCode: 'org-empty', policies: ['cr_r_o'] });
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});
	it('filters change requests by status', async () => {
		const fixture = await render(users.approver);
		const select: HTMLSelectElement = fixture.nativeElement.querySelector('.cr-list__filter');

		select.value = 'PENDING_APPROVAL';
		select.dispatchEvent(new Event('change'));
		fixture.detectChanges();

		const rows = fixture.nativeElement.querySelectorAll('.cr-list__row');

		expect(rows.length).toBe(1);
		expect(rows[0].textContent).toContain('CR-1');
	});


	it('shows a loading state while change requests are being fetched', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [
				{ provide: SessionService, useValue: { user: users.approver } },
			],
		});

		await TestBed.compileComponents();

		const api = TestBed.inject(
			(await import('../../api/cr-api.service')).CrApiService
		);
		api.latencyMs = 100;

		const fixture = TestBed.createComponent(CrListComponent);
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-list__loading')
		).not.toBeNull();

		await new Promise((resolve) => setTimeout(resolve, 150));
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-list__table')
		).not.toBeNull();
	});

	it('shows an error state when loading change requests fails', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [
				{ provide: SessionService, useValue: { user: users.approver } },
			],
		});

		await TestBed.compileComponents();

		const api = TestBed.inject(
			(await import('../../api/cr-api.service')).CrApiService
		);
		api.failNext = true;

		const fixture = TestBed.createComponent(CrListComponent);
		fixture.detectChanges();

		await flush();
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('.cr-list__error')
		).not.toBeNull();

		expect(
			fixture.nativeElement.querySelector('.cr-list__error button')
		).not.toBeNull();
	});

});
