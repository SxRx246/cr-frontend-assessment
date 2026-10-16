# Implementation Notes

## 1. What I Changed

- **Fixed bugs:** Corrected the line-item comparison to detect changes in descriptions, quantities, and unit prices. Fixed the approval permission checks so unauthorized users cannot approve requests.
- **Change request list:** Added loading, empty, and error states, a retry option, and a status filter.
- **Change request details:** Added line-item comparisons, baseline and proposed totals, total changes, and a timeline sorted from oldest to newest.
- **Approval and rejection:** Added permission-aware action visibility, loading feedback, error messages, and rejection reason validation. The change request list refreshes after a successful approval or rejection.
- **API behavior:** Added checks for organization access, approval permissions, and valid request statuses. Failed operations do not change the stored request data.

## 2. Component and State Model

- **`CrListComponent`:** Loads change requests from the API service and handles loading, success, empty, and error states. It also filters requests by status.
- **`CrDetailComponent`:** Loads request details and manages the comparison, timeline, approval, rejection, form validation, and error messages.
- **Diff utility:** Compares the original and proposed line items and identifies added, removed, changed, and unchanged items.
- **`CrApiService`:** Provides the mock API, checks access and allowed actions, simulates delays and failures, and stores successful changes.

Each component has a clear role, while the API service handles data operations and the diff utility handles line-item comparisons.

## 3. Rules the Application Keeps

| Rule | How it is enforced |
|---|---|
| Users can only access requests from their organization. | API service access checks. |
| Only authorized users can approve or reject requests. | Permission checks and action visibility in the component, plus API validation. |
| Only pending requests can be approved or rejected. | Component checks and API status validation. |
| Rejection reasons cannot be empty or contain only spaces. | Reactive form validation and input trimming. |
| Failed operations must not change stored request data. | The API service updates its data only after success. |
| Repeated approval clicks must not create duplicate submissions. | The component checks whether an action is already in progress. |
| Timeline entries appear in chronological order. | The detail component sorts entries by date and time. |

## 4. Testing Strategy

- Tested added, removed, changed, and unchanged line items.
- Tested list loading, empty, error, and filtering behavior.
- Tested detail loading, error handling, timeline order, and action visibility.
- Tested successful and failed approval and rejection.
- Tested rejection validation and repeated approval submissions.
- Tested API permissions and invalid status changes.

**Results:** All 27 tests passed across four test suites. The production build and lint checks also passed.

I focused on testing the main features, permission rules, and possible failure cases. End-to-end tests and integration with a real backend were outside the scope of this assessment.

## 5. Assumptions

- The provided mock API is used instead of a separate backend.
- Users' organizations and permissions determine which requests and actions they can access.
- A rejection reason must contain at least one non-space character.
- The timeline is shown from oldest to newest.
- If an API operation fails, the request should keep its previous state and display an error message.

## 6. Use of AI

AI tools were used to help clarify requirements, explore possible solutions, and identify cases that needed testing. I reviewed the suggested approaches and checked the implementation through testing and debugging.

## 7. What I Would Improve

- Add end-to-end tests for the complete review process.
- Improve keyboard navigation and screen-reader support.
- Add more tests for simultaneous requests and network delays.
- Improve error handling and API response checks for a real backend.
- Consider adding a confirmation step before rejecting a request.